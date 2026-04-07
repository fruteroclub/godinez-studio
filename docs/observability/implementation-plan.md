# Observability Implementation Plan

> Status: PLANNED
> Created: 2026-03-11
> Priority: P0 (blocks effective debugging of beta issues)

## Problem

- Chat route (`/api/chat/send`, `/api/chat/stream/:runId`) has **zero logging** — 200+ lines of critical path with silent `catch {}` blocks
- Errors have no user/workspace context — can't correlate failures to users
- Sentry only captures top-level `onError` with zero context (no user, no workspace, no request ID)
- `error-handler.ts` middleware exists but is **not wired into the app**
- Quota/rate-limit violations are silent — no audit trail
- Gateway relay async errors never reach Sentry
- Alerts stored in-memory only — lost on restart
- Admin dashboard has no error visibility tab

## Architecture

```
Layer 1: Context-Rich Logging (do first)
  1.1 enrich-logger middleware ──────────┐
  1.3 quota/rate-limit logging ──────────┤ (quota depends on 1.1)
  1.4 gateway-relay logging tweaks ──────┤
                                         │
  1.2 chat route logging ────────────────┘ (depends on 1.1)

Layer 2: Sentry Improvements (after Layer 1)
  2.5 sentry config ────────────────────┐ (independent)
  2.1 sentry user context in onError ───┤
  2.2 consolidate error-handler ────────┤ (with 2.1)
  2.3 gateway/sync sentry capture ──────┤
  2.4 sentry breadcrumbs ──────────────-┘ (after 1.2)

Layer 3: Admin Visibility (after Layers 1+2)
  3.1 agent-logs DAL extension ─────┐
  3.3 types ────────────────────────┤ (parallel)
  3.2 admin errors endpoint ────────┤ (depends on 3.1)
  3.4 useAdminErrors hook ──────────┤ (depends on 3.2, 3.3)
  3.5 Admin "Errores" tab ─────────-┘ (depends on 3.4)
```

---

## Layer 1: Context-Rich Logging

### 1.1 — Enrich request logger with auth context [S]

**New file:** `apps/api/src/middleware/enrich-logger.ts`

Post-auth middleware that runs after `requireAuth` + `resolveUser`:
- Read `c.get("userId")`, `c.get("requestId")`
- Create new child logger: `logger.child({ requestId, userId })`
- Overwrite `c.set("log", enrichedLog)`

**Modify:** `apps/api/src/middleware/request-logger.ts`
- In post-`next()` response log, read `c.get("userId")` and include in structured fields

Pino child loggers snapshot bindings at creation time, so we need the separate `enrich-logger` middleware to recreate the child with user context.

### 1.2 — Add logging to chat route [L]

**File:** `apps/api/src/routes/chat.ts`

This is the single highest-value change. 7+ silent `catch {}` blocks to fix.

**POST /send:**
- Entry: `log.info({ conversationId, workspaceId }, "chat.send")`
- Relay error (currently silent return): `log.error({ workspaceId, err }, "chat.send: gateway error")`
- Stub fallback: `log.info({ workspaceId, runId }, "chat.send: stub mode")`
- Success: `log.info({ runId }, "chat.send: dispatched")`

**GET /stream/:runId:**
- Open: `log.info({ runId }, "chat.stream: opened")`
- Agent offline: `log.warn({ runId }, "chat.stream: agent offline")`
- Client disconnect during delta: `log.warn({ runId }, "chat.stream: client disconnected")`
- Agent response saved: `log.info({ runId, messageId }, "chat.stream: saved")`
- **CRITICAL:** `catch {}` on DB save (currently swallows errors): `log.error({ runId, err }, "chat.stream: save failed")`
- Gateway error: `log.error({ runId, error }, "chat.stream: gateway error")`
- Timeout: `log.warn({ runId }, "chat.stream: timeout")`
- Close: `log.info({ runId }, "chat.stream: closed")`

**POST /actions/:messageId/execute:**
- Success: `log.info({ messageId, actionId, type }, "chat.action: executed")`
- Failure: `log.error({ messageId, actionId, err }, "chat.action: failed")`

### 1.3 — Log quota and rate-limit violations [S]

**File:** `apps/api/src/middleware/require-quota.ts`
- Before returning 429: `log.warn({ userId, workspaceId, resource, limit, current }, "quota exceeded")`

**File:** `apps/api/src/middleware/rate-limit.ts`
- Add `userId` (when available) to the existing warn log

### 1.4 — Gateway relay/pool logging tweaks [S]

**File:** `apps/api/src/services/gateway-relay.ts`
- `handleFrame` validation failure: include `runId` in log for tracing

**File:** `apps/api/src/services/gateway-pool.ts`
- `probeOffline` catch: add `log.debug` for still-offline instances

---

## Layer 2: Sentry Improvements

### 2.1 — Sentry user context in onError [S]

**File:** `apps/api/src/index.ts` (onError handler, lines 78-97)

```typescript
app.onError((err, c) => {
  Sentry.withScope((scope) => {
    const userId = c.get("userId");
    const requestId = c.get("requestId");
    if (userId) scope.setUser({ id: String(userId) });
    if (requestId) scope.setTag("requestId", requestId);
    scope.setTag("path", c.req.path);
    scope.setTag("method", c.req.method);
    Sentry.captureException(err);
  });
  // ... rest of error handling
});
```

### 2.2 — Consolidate error-handler.ts with onError [S]

**File:** `apps/api/src/index.ts`

The existing `error-handler.ts` middleware is unused. Don't wire it in — instead, merge its good ideas into `onError`:
- Add stack trace to error log: `stack: err.stack`
- Add path and method to log context
- Delete or annotate `error-handler.ts` as superseded

### 2.3 — Capture gateway/sync errors in Sentry [M]

**File:** `apps/api/src/services/gateway-relay.ts`
- `scheduleReconnect` catch: `Sentry.captureException(err, { tags: { service: "gateway-relay", instanceId } })`
- `connect` ws error (post-handshake): `Sentry.captureException(err, { tags: { service: "gateway-relay" } })`
- `handleFrame` validation failure: `Sentry.captureMessage("chat event validation failed", { level: "warning" })`

**File:** `apps/api/src/services/gateway-pool.ts`
- `recordFailure` marking offline: `Sentry.captureMessage("instance marked offline", { level: "error", tags: { instanceId } })`

**File:** `apps/api/src/services/workspace-sync.ts`
- `executeSyncSafe` catch: `Sentry.captureException(err, { tags: { service: "workspace-sync", workspaceId } })`

### 2.4 — Sentry breadcrumbs [S]

**File:** `apps/api/src/middleware/request-logger.ts`
- Before `await next()`: `Sentry.addBreadcrumb({ category: "http", message: \`${method} ${path}\`, data: { requestId } })`

**File:** `apps/api/src/routes/chat.ts` (alongside 1.2)
- At send dispatch: `Sentry.addBreadcrumb({ category: "chat", message: "dispatched", data: { runId, workspaceId } })`
- At stream open: `Sentry.addBreadcrumb({ category: "chat", message: "stream opened", data: { runId } })`

### 2.5 — Sentry config improvements [S]

**File:** `apps/api/src/lib/sentry.ts`

- Bump `tracesSampleRate` from `0.1` to `1.0` (low traffic beta phase)
- Add `release` from `process.env.RAILWAY_GIT_COMMIT_SHA`
- Add `serverName` from `process.env.RAILWAY_SERVICE_NAME`
- Add `beforeSend` to scrub auth tokens from breadcrumbs

---

## Layer 3: Admin Visibility

### 3.1 — Extend agent-logs DAL [S]

**File:** `apps/api/src/dal/agent-logs.ts`

New functions:
- `getRecentErrors({ limit, cursor, since })` — cross-workspace error log query, joins workspaces + agents for names, `ORDER BY created_at DESC`
- `getErrorCountsByDay(days)` — daily error counts for mini-chart

**File:** `packages/db/src/schema/agent-logs.ts`
- Add index: `agent_logs_level_created_idx` on `(level, created_at)` for efficient error queries

### 3.2 — Admin errors endpoint [S]

**File:** `apps/api/src/routes/admin.ts`

```
GET /api/admin/errors?limit=50&cursor=123&since=2026-03-01
```
Returns `{ data: AdminErrorLogRow[], nextCursor, dailyCounts }`

### 3.3 — Types [S]

**File:** `packages/types/src/index.ts`

```typescript
export interface AdminErrorLogRow {
  id: number; level: string; event: string; message: string | null;
  metadata: unknown; workspaceId: number; workspaceName: string;
  agentId: number; agentName: string; createdAt: string;
}
```

### 3.4 — useAdminErrors hook [S]

**File:** `apps/web/src/hooks/use-admin.ts`

Standard query hook with `refetchInterval: 30_000` for live error monitoring.

### 3.5 — Admin "Errores" tab [M]

**File:** `apps/web/src/pages/Admin.tsx`

- Daily error count mini-chart (7 days, recharts)
- Scrollable table: timestamp, level (color-coded), event, message (truncated), workspace, agent
- Click to expand and show full metadata JSON
- Pagination with "Cargar más"

**File:** `apps/web/src/lib/content.ts`
- Add: `errors`, `errorLevel`, `errorEvent`, `errorMessage`, `errorTimestamp` to admin content strings

---

## Effort Summary

| Task | Size | Files |
|------|------|-------|
| 1.1 enrich-logger middleware | S | 1 new + 1 modify |
| 1.2 chat route logging | L | 1 modify |
| 1.3 quota + rate-limit logging | S | 2 modify |
| 1.4 gateway logging tweaks | S | 2 modify |
| 2.1 sentry user context | S | 1 modify |
| 2.2 consolidate error-handler | S | 1 modify + 1 delete |
| 2.3 gateway/sync sentry | M | 3 modify |
| 2.4 sentry breadcrumbs | S | 2 modify |
| 2.5 sentry config | S | 1 modify |
| 3.1 agent-logs DAL | S | 2 modify |
| 3.2 admin errors endpoint | S | 1 modify |
| 3.3 types | S | 1 modify |
| 3.4 useAdminErrors hook | S | 1 modify |
| 3.5 admin errors tab | M | 2 modify |

## New Files

- `apps/api/src/middleware/enrich-logger.ts`

## Files to Delete

- `apps/api/src/middleware/error-handler.ts` (superseded by consolidated `onError`)

## Key Risk

The silent `catch {}` blocks in `chat.ts` are the #1 blind spot. Even without the full observability stack, replacing these with `catch (err) { log.error(...) }` immediately improves debuggability.
