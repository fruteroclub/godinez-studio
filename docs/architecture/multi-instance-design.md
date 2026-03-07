# Multi-Instance Gateway Architecture (Layer 2)

Design document for routing Godinez Studio workspaces across multiple OpenClaw EC2 instances.

## Status

**Proposal** — not yet implemented. Depends on Layer 1 runbook (`openclaw-instance-runbook.md`) for individual instance provisioning.

## Context

Today the API connects to a single OpenClaw gateway via one `OPENCLAW_GATEWAY_URL` env var. `gateway-relay.ts` is a singleton WebSocket. All workspaces share one EC2 instance with 15 agent slots and 4 concurrent request capacity.

This works for early beta but doesn't scale. We need to:

- Add shared instances as user count grows
- Offer dedicated instances for paying teams
- Handle instance failures without losing workspace access

## Decisions

| Question | Decision |
|----------|----------|
| API topology | One API service, pool of gateway connections |
| Routing (shared tier) | Fill-then-spill — fill instance A, then B |
| Dedicated tier | 1:1 instance per customer, admin-provisioned |
| Dedicated agent model | Deferred — for now, same slot-per-member model as shared |
| Instance registry | PostgreSQL table (`gateway_instances`) |
| Connection pool | Lazy — connect on first request to an instance |
| Auto-scaling | No — admin pre-provisions instances via runbook |
| Failure handling | Degrade gracefully — "agent offline", workspace CRUD still works |

## Architecture

### Current (single instance)

```
Railway API ──ws──► godin-002 (15 slots)
```

### Target (multi-instance)

```
                         ┌──► godin-002  (shared, 15 slots)
Railway API ─── pool ────┼──► godin-003  (shared, 15 slots)
                         ├──► godin-010  (dedicated, customer X)
                         └──► godin-011  (dedicated, customer Y)
```

### Data flow

```
                    ┌─────────────────────────┐
                    │     gateway_instances    │
                    │  id, url, token, tier,   │
                    │  capacity, status        │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   ┌────▼─────┐            ┌────▼─────┐            ┌────▼─────┐
   │ instance │            │ instance │            │ instance │
   │ shared   │            │ shared   │            │ dedicated│
   │ 15 slots │            │ 15 slots │            │ 15 slots │
   └────▲─────┘            └────▲─────┘            └────▲─────┘
        │                       │                       │
        │              ┌───────────────┐                │
        └──────────────┤ GatewayPool   ├────────────────┘
                       │ (lazy conns)  │
                       └───────┬───────┘
                               │
                       ┌───────▼───────┐
                       │   Hono API    │
                       │  (Railway)    │
                       └───────────────┘
```

## Schema Changes

### New table: `gateway_instances`

```sql
CREATE TABLE gateway_instances (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,       -- "godin-002", "godin-003"
  url         TEXT NOT NULL,                      -- "wss://godin-002-openclaw-gateway.godinez.ai"
  token       TEXT NOT NULL,                      -- gateway auth token (encrypted at rest)
  tier        VARCHAR(20) NOT NULL DEFAULT 'shared',  -- "shared" | "dedicated"
  status      VARCHAR(20) NOT NULL DEFAULT 'active',  -- "active" | "offline" | "draining" | "decommissioned"
  max_slots   INTEGER NOT NULL DEFAULT 15,
  used_slots  INTEGER NOT NULL DEFAULT 0,        -- denormalized count, kept in sync
  region      VARCHAR(20) DEFAULT 'us-east-1',
  customer_id INTEGER REFERENCES workspaces(id), -- NULL for shared, workspace ID for dedicated
  metadata    JSONB,                              -- openclaw version, instance type, notes
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gateway_instances_tier_status ON gateway_instances(tier, status);
```

**Status lifecycle:**

```
active ──► draining ──► decommissioned
  │
  └──► offline (detected by health check or manual)
  │
  └──► active (recovery)
```

- `active` — accepting new workspaces (shared) or serving its customer (dedicated)
- `draining` — no new assignments, existing workspaces still served. Used before decommission.
- `offline` — unreachable. Triggers graceful degradation for its workspaces.
- `decommissioned` — permanently removed. All workspaces must have been migrated or deleted.

### Modified table: `workspaces`

Add column:

```sql
ALTER TABLE workspaces
  ADD COLUMN instance_id INTEGER REFERENCES gateway_instances(id);
```

Existing workspaces (godin-002) get backfilled with the instance ID for godin-002.

## Gateway Pool

Replaces the singleton `gateway` export in `gateway-relay.ts`.

### Interface

```typescript
// services/gateway-pool.ts

class GatewayPool {
  // Get or create a connection to the instance that owns this workspace
  async getRelay(instanceId: number): Promise<GatewayRelay>

  // Find the best instance for a new workspace
  async pickInstance(tier: "shared" | "dedicated", customerId?: number): Promise<GatewayInstance>

  // Disconnect an idle instance
  async releaseRelay(instanceId: number): void

  // Check health of all connected instances
  async healthCheck(): Promise<Map<number, boolean>>
}

export const pool = new GatewayPool();
```

### Lazy connection

```
Request comes in for workspace W
  → look up W.instance_id
  → pool.getRelay(instance_id)
    → if connected: return existing relay
    → if not: load instance record from DB, connect WebSocket, cache relay
  → use relay for gateway RPC (chat.send, agents.*, etc.)
```

Idle connections are closed after a configurable timeout (e.g. 10 minutes with no RPC calls). Dedicated instances with active users will stay connected; shared instances with no recent activity get reaped.

### GatewayRelay refactor

The existing `GatewayRelay` class (`gateway-relay.ts`) stays mostly intact — it already handles connection, auth, reconnection, and RPC. Changes:

1. Remove the module-level singleton (`export const gateway = new GatewayRelay()`)
2. Remove the `connect()` call from `index.ts` startup
3. Make `connect(url, token)` callable per-instance
4. Add `instanceId` property for pool tracking
5. Add `lastActivityAt` timestamp for idle reaping

The pool manages multiple `GatewayRelay` instances keyed by `gateway_instances.id`.

## Routing Logic

### Provisioning (new workspace)

```
POST /api/agents/provision
  1. Determine tier:
     - If workspace.tier == "dedicated" → tier = "dedicated"
     - Else → tier = "shared"
  2. pool.pickInstance(tier, customerId?)
     - shared: SELECT * FROM gateway_instances
               WHERE tier = 'shared' AND status = 'active'
               AND used_slots < max_slots
               ORDER BY used_slots DESC  -- fill-then-spill: fullest first
               LIMIT 1
     - dedicated: SELECT * FROM gateway_instances
                  WHERE tier = 'dedicated' AND customer_id = ? AND status = 'active'
                  LIMIT 1
  3. If no instance found → return CAPACITY_FULL (admin must add instance)
  4. Get relay: pool.getRelay(instance.id)
  5. Create agent on that gateway: relay.agentsCreate(...)
  6. Save workspace with instance_id: UPDATE workspaces SET instance_id = ?
  7. Increment used_slots: UPDATE gateway_instances SET used_slots = used_slots + 1
```

### Chat and agent operations (existing workspace)

```
POST /api/chat/send (or any agent RPC)
  1. Load workspace → get instance_id
  2. If instance_id is NULL → legacy workspace, use fallback instance (godin-002)
  3. pool.getRelay(instance_id)
     - If instance status == "offline" → return 503 "Agent offline"
  4. Proceed with existing chat flow
```

### Workspace deletion

```
DELETE /api/workspaces/:slug
  1. relay.agentsDelete(agentSlot)
  2. Decrement used_slots: UPDATE gateway_instances SET used_slots = used_slots - 1
  3. Delete workspace record
```

## Graceful Degradation

When an instance is offline:

1. **Chat:** Returns 503 with `{ error: "AGENT_OFFLINE", message: "Tu agente no está disponible en este momento." }`
2. **Agent config:** Returns cached config from DB (read-only, edits queued or rejected)
3. **Workspace CRUD:** Fully functional — projects, tasks, files are in PostgreSQL, not on the instance
4. **UI:** Chat page shows a banner: "Tu agente está desconectado. Puedes seguir gestionando tus proyectos y tareas."

### Detection

Two mechanisms:

1. **Passive** — WebSocket `close`/`error` events on the relay. Pool marks instance as `offline` after 3 failed reconnection attempts.
2. **Active** — Periodic health check (every 60s) pings connected instances. If a connected relay fails health check, mark `offline`.

No active polling of disconnected instances. Admin manually sets status back to `active` after fixing the EC2 (or the relay reconnects successfully and auto-recovers).

## Admin API

New internal routes (behind `requireRole("admin")`):

```
GET    /api/admin/instances              — list all instances + status + slot counts
POST   /api/admin/instances              — register new instance (after runbook provisioning)
PUT    /api/admin/instances/:id          — update status (drain, decommission), edit metadata
DELETE /api/admin/instances/:id          — remove (only if decommissioned + 0 workspaces)
GET    /api/admin/instances/:id/health   — live health check against gateway
```

### Register instance (after running Layer 1 runbook)

```
POST /api/admin/instances
{
  "name": "godin-003",
  "url": "wss://godin-003-openclaw-gateway.godinez.ai",
  "token": "abc123...",
  "tier": "shared",
  "maxSlots": 15,
  "region": "us-east-1"
}
```

### Drain instance (before maintenance or decommission)

```
PUT /api/admin/instances/3
{ "status": "draining" }
```

Draining instances are excluded from `pickInstance()` but continue serving existing workspaces. Once all workspaces are migrated or deleted, admin sets `decommissioned`.

## Migration Path

### Phase 1: Schema + registry (no behavior change)

1. Add `gateway_instances` table
2. Add `workspaces.instance_id` column (nullable)
3. Insert godin-002 as the first instance record
4. Backfill all existing workspaces with godin-002's instance ID
5. Add admin CRUD routes for instances
6. **No changes to gateway-relay.ts yet** — still singleton, still reads env vars

This phase is safe to deploy incrementally. Everything works as before.

### Phase 2: Gateway pool

1. Refactor `GatewayRelay` — remove singleton, add `instanceId` + `lastActivityAt`
2. Implement `GatewayPool` class with lazy connections
3. Update `provision.ts` — use `pool.pickInstance()` + `pool.getRelay()`
4. Update `chat.ts` — resolve `instance_id` from workspace, use `pool.getRelay()`
5. Update all agent routes — same pattern
6. Remove `OPENCLAW_GATEWAY_URL` / `OPENCLAW_GATEWAY_TOKEN` env vars (credentials now in DB)
7. Add graceful degradation (503 on offline instance)
8. Fallback: workspaces with `instance_id = NULL` use godin-002 (backward compat during rollout)

### Phase 3: Dedicated tier support

1. Add `customer_id` to `gateway_instances` for dedicated instances
2. Update `pickInstance()` to handle dedicated routing
3. Admin registers dedicated instance after running runbook, links to customer workspace
4. **Hybrid agent model (team + personal) deferred** — dedicated instances use same slot-per-member model initially

## Files Changed

| File | Change |
|------|--------|
| `packages/db/src/schema/gateway-instances.ts` | New table + relations |
| `packages/db/src/schema/workspaces.ts` | Add `instanceId` column |
| `apps/api/src/services/gateway-pool.ts` | New — connection pool |
| `apps/api/src/services/gateway-relay.ts` | Refactor — remove singleton, add instance tracking |
| `apps/api/src/routes/provision.ts` | Use pool for instance selection + relay |
| `apps/api/src/routes/chat.ts` | Resolve instance from workspace, use pool |
| `apps/api/src/routes/agents.ts` | Same pattern — resolve instance, use pool |
| `apps/api/src/routes/workspaces.ts` | Decrement `used_slots` on workspace delete |
| `apps/api/src/routes/admin/instances.ts` | New — admin CRUD |
| `apps/api/src/dal/instances.ts` | New — instance queries |
| `apps/api/src/index.ts` | Remove singleton gateway connect, init pool |
| `apps/api/src/lib/config.ts` | Remove `OPENCLAW_GATEWAY_URL` references |
| `apps/web/src/pages/Chat.tsx` | Handle `AGENT_OFFLINE` error, show banner |

## Deferred (Not in Scope)

- **Hybrid agent model** for dedicated tier (team agent + personal agents)
- **Auto-provisioning** EC2 instances (Terraform/Pulumi/AWS SDK)
- **Auto-migration** of workspaces between instances
- **Cross-instance agent communication**
- **Per-instance model configuration** (all instances use same Claude model for now)
- **Geographic routing** (all instances in us-east-1 for now)

## Open Questions

1. **Token storage** — `gateway_instances.token` contains sensitive credentials. Encrypt at rest? Separate secrets manager? For now, plaintext in DB (same as current env var approach) with admin-only access.
2. **Slot count consistency** — `used_slots` is denormalized. Should we count from `workspaces` table on read instead? Denormalized is faster but can drift. Periodic reconciliation job?
3. **Connection limit** — How many simultaneous WebSocket connections can one API service maintain? Likely not a concern until 50+ instances, but worth monitoring.
4. **Dedicated instance billing** — How does the customer pay for their EC2? Out of scope for this doc but affects product decisions.
