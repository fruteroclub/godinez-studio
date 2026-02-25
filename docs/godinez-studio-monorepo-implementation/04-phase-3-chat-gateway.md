# Phase 3: Chat + OpenClaw Gateway Relay + SSE

**Effort:** 2 days
**Dependencies:** Phase 2
**Deliverable:** Real-time agent chat with streaming responses

This is the core differentiator — the reason for migrating off Next.js.

---

## Architecture

```
Browser (EventSource)
  │
  │ POST /api/chat/send     → saves user message, sends to Gateway, returns runId
  │ GET  /api/chat/stream/:runId  → SSE stream of agent response (delta/done/error)
  │
  ▼
Hono API (Railway)
  │
  │ WebSocket (persistent)
  │
  ▼
OpenClaw Gateway (EC2 via Tailscale)
  │
  │ Manages agent sessions
  │
  ▼
Claude (Anthropic API)
```

**Key pattern from regen-garden:**
- Backend maintains ONE persistent WebSocket to the Gateway
- Each user message → Gateway via WS → agent processes → deltas broadcast back via WS
- Backend relays deltas to the specific client via SSE
- Frontend uses native `EventSource` API (no WS library needed)

---

## Tickets

### P3-01: Implement Gateway Relay service

WebSocket client that maintains a persistent connection to the OpenClaw Gateway. Adapted from `regen-garden/docs/user-workspaces/01-openclaw-gateway-protocol.md`.

**File:** `apps/api/src/services/gateway-relay.ts`

**Class: `GatewayRelay`**

```typescript
class GatewayRelay {
  // Connection
  connect(url: string, token: string): Promise<void>
  disconnect(): void
  get isConnected(): boolean

  // Chat operations
  chatSend(sessionKey: string, message: string): Promise<string>  // returns runId
  chatAbort(sessionKey: string): Promise<void>
  chatHistory(sessionKey: string, limit?: number): Promise<unknown>

  // Event handlers
  onRun(runId: string, handlers: RunHandler): void
  offRun(runId: string): void
}
```

**Requirements:**
- JSON-RPC 2.0 protocol over WebSocket
- Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s)
- `pendingRuns` Map for routing broadcast events to correct handlers
- Authentication on connect via `connect` RPC method
- Subscribe to `['chat', 'agent']` channels
- Handle delta (cumulative text), final, and error events
- Cleanup handlers on final/error

**Event routing:**
```
Gateway broadcast → parse runId → lookup handler in pendingRuns → call onDelta/onFinal/onError
```

**Initialize on server start:**
```typescript
// apps/api/src/index.ts
import { gateway } from './services/gateway-relay'

if (process.env.OPENCLAW_GATEWAY_URL) {
  gateway.connect(
    process.env.OPENCLAW_GATEWAY_URL,
    process.env.OPENCLAW_GATEWAY_TOKEN!
  ).then(() => console.log('[Gateway] Connected'))
   .catch((err) => console.error('[Gateway] Connection failed:', err))
}
```

**Acceptance:**
- Connects to Gateway on server start
- Reconnects automatically on disconnect
- `chatSend` returns runId
- Events routed to correct handlers
- Works without Gateway (graceful fallback if not configured)

---

### P3-02: Agent slot mapping service

Maps workspaces to OpenClaw agent slots. Each workspace gets a dedicated agent with its own memory/context.

**File:** `apps/api/src/services/agent-mapping.ts`

**Approach:**
- Read `workspace.agentSlot` from DB (set during workspace provisioning or admin assignment)
- Session key format: `agent:{agentSlot}:main`
- If no agentSlot assigned, return error (agent not provisioned)

```typescript
export function getSessionKey(agentSlot: string, session = 'main'): string {
  return `agent:${agentSlot}:${session}`
}

export async function resolveAgentSession(workspaceId: number): Promise<string> {
  const workspace = await getWorkspaceById(workspaceId)
  if (!workspace?.agentSlot) {
    throw new Error('No agent assigned to this workspace')
  }
  return getSessionKey(workspace.agentSlot)
}
```

**Acceptance:**
- Workspace with agentSlot → valid session key
- Workspace without agentSlot → clear error
- Session keys follow OpenClaw convention

---

### P3-03: Chat send endpoint

**Endpoint:** `POST /api/chat/send`

**Flow:**
1. Validate request (conversationId, workspaceId, content)
2. Verify user is workspace member
3. Save user message to `messages` table
4. Resolve agent session key from workspace
5. Send to Gateway via `gateway.chatSend()`
6. Return `{ runId, messageId }` to client

**Request:**
```typescript
{
  conversationId: number
  workspaceId: number
  content: string
}
```

**Response:**
```typescript
{
  runId: string
  messageId: number
}
```

**Fallback (no Gateway):** If Gateway is not connected, return a stub response immediately (same pattern as current godinez-ai, for development/testing without OpenClaw).

**Acceptance:**
- User message saved to DB
- Message sent to Gateway
- runId returned for SSE streaming
- Works with stub fallback when Gateway offline

---

### P3-04: SSE streaming endpoint

**Endpoint:** `GET /api/chat/stream/:runId`

Uses Hono's `streamSSE` helper to relay Gateway events to the frontend.

**SSE Events:**
```
event: delta
data: { "type": "delta", "text": "partial response accumulating..." }

event: done
data: { "type": "done", "text": "complete final response", "messageId": 42 }

event: error
data: { "type": "error", "error": "error message" }
```

**Flow:**
1. Client opens EventSource to `/api/chat/stream/:runId`
2. Register handlers on `gateway.onRun(runId, { onDelta, onFinal, onError })`
3. On delta → write SSE event with cumulative text
4. On final → save agent message to DB → write SSE done event with messageId → close stream
5. On error → write SSE error event → close stream

**Important:** The `done` event includes `messageId` so the frontend can replace the optimistic message with the real DB record.

**Timeout:** If no events received within 60 seconds, send a keepalive comment (`: keepalive\n\n`) to prevent connection drop.

**Acceptance:**
- Client receives streaming deltas as agent types
- Final message saved to DB with correct conversationId and workspaceId
- Stream closes cleanly on done/error
- Keepalive prevents premature disconnect

---

### P3-05: Conversation management routes

**Endpoints:**

| Endpoint | Method | Description |
|----------|--------|------------|
| `POST /api/conversations` | POST | Create new conversation |
| `GET /api/workspaces/:id/conversations` | GET | List workspace conversations |
| `GET /api/conversations/:id` | GET | Get conversation detail |
| `GET /api/chat/history/:conversationId` | GET | Get messages ordered by createdAt |

**Create conversation:**
```typescript
{
  workspaceId: number
  title?: string        // auto-generated if not provided
  projectId?: number    // null = workspace-level chat
}
```

**History response:**
```typescript
{
  messages: Array<{
    id: number
    role: 'user' | 'agent' | 'system'
    content: string
    createdAt: string
    metadata?: { model?: string, tokensIn?: number, tokensOut?: number }
  }>
}
```

**Acceptance:**
- Create conversation → appears in workspace list
- History returns messages in chronological order
- Project-scoped conversations filtered correctly

---

### P3-06: Stub agent responder (development fallback)

When `OPENCLAW_GATEWAY_URL` is not set, the chat send endpoint should still work with generated stub responses. This allows frontend development without a live Gateway.

**File:** `apps/api/src/services/stub-agent.ts`

```typescript
export function createStubResponse(userMessage: string): {
  runId: string
  getResponse: () => Promise<string>
} {
  const runId = crypto.randomUUID()
  return {
    runId,
    getResponse: async () => {
      // Simulate 1-2 second delay
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000))
      return getStubReply(userMessage)
    }
  }
}
```

The SSE endpoint streams the stub response as a single `done` event (no deltas) after the delay.

**Acceptance:**
- Chat works end-to-end without Gateway
- Stub replies saved to DB as agent messages
- Frontend SSE handler works with both stub and real responses
