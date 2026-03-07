# Action Cards — Agent-Driven Resource CRUD

## Overview

AI agents in Godinez Studio can propose creating/updating/deleting database resources (projects, tasks, files) through structured `:::action` blocks embedded in chat messages. These render as interactive "Action Cards" that users can approve and execute with one click.

The agent becomes a proactive collaborator: during conversation it recognizes when the user needs a project, task, or file created and emits a structured proposal inline. The user sees a card with a clear label, reviews the payload, and clicks to execute — no forms, no context switching.

## Architecture

### Action Block Format

Agent messages can contain one or more action blocks using a fenced syntax:

```
:::action
type: create_project
label: Crear proyecto "Mi App"
payload:
  name: Mi App
  description: Aplicacion web para gestion de inventarios
:::
```

Multiple blocks can appear in a single message, interleaved with regular markdown:

```
Perfecto, vamos a organizarlo asi:

:::action
type: create_project
label: Crear proyecto "Inventarios MX"
payload:
  name: Inventarios MX
  description: Sistema de gestion de inventarios para tiendas fisicas
:::

Y las primeras tareas serian:

:::action
type: create_task
label: Crear tarea "Disenar modelo de datos"
payload:
  title: Disenar modelo de datos
  description: Definir tablas de productos, almacenes y movimientos
  priority: high
:::

:::action
type: create_task
label: Crear tarea "Wireframes de dashboard"
payload:
  title: Wireframes de dashboard
  description: Pantalla principal con metricas de inventario
  priority: medium
:::
```

**Supported types (Phase 1):** `create_project`, `create_task`, `create_file`
**Future types:** `update_project`, `update_task`, `delete_task`, `assign_task`

### Pipeline

1. Agent emits message containing `:::action` blocks inline with regular text
2. Server parses blocks in `onFinal` handler, stores parsed actions in `message.metadata.actions[]`
3. SSE `done` event includes the parsed `actions` array (already defined in `ChatDoneEvent`)
4. Client renders `ActionCard` components inline, replacing the raw `:::action` block text
5. User clicks a card -> `POST /api/chat/actions/:messageId/execute`
6. Server dispatches to the appropriate DAL function (e.g., `createProject`), updates action status in message metadata
7. Card transitions from `pending` -> `executing` -> `completed` or `error`

### Action Lifecycle States

| State | Description | Card appearance |
|-------|-------------|-----------------|
| `pending` | Parsed, waiting for user approval | Primary button "Ejecutar", payload preview |
| `executing` | User clicked, API call in flight | Spinner, button disabled |
| `completed` | Resource created successfully | Green checkmark, link to resource |
| `error` | Execution failed | Red indicator, error message, retry button |

## Data Model

Types are already defined in `packages/types/src/index.ts`.

### ActionBlock (parsed from text)

```typescript
interface ActionBlock {
  id: string;             // deterministic hash from type + JSON.stringify(payload)
  type: ActionType;       // "create_project" | "create_task" | "create_file"
  label: string;          // human-readable description (shown as card title)
  payload: Record<string, unknown>;
}
```

### ActionCard (stored in message metadata)

```typescript
interface ActionCard extends ActionBlock {
  status: ActionStatus;   // "pending" | "executing" | "completed" | "error"
  resultId?: number;      // serial ID of the created resource
  error?: string;         // error message if execution failed
  executedAt?: string;    // ISO timestamp of execution
}
```

### Message metadata column

The `messages.metadata` column (text, JSON-encoded) gains an `actions` array:

```json
{
  "stub": true,
  "actions": [
    {
      "id": "a1b2c3",
      "type": "create_project",
      "label": "Crear proyecto \"Mi App\"",
      "payload": { "name": "Mi App", "description": "..." },
      "status": "completed",
      "resultId": 42,
      "executedAt": "2026-02-25T18:30:00.000Z"
    }
  ]
}
```

No schema migration needed — `metadata` is already a free-form JSON text column.

### ID Generation

Action IDs are deterministic: `sha256(type + JSON.stringify(payload)).slice(0, 12)`. This ensures:
- Same proposal always gets the same ID (idempotent)
- No collisions within a single message (payloads differ)
- Client can match cards to actions without server round-trip

## Parsing

### Server Parser (`apps/api/src/lib/action-parser.ts`)

```typescript
const ACTION_BLOCK_RE = /:::action\n([\s\S]*?):::/g;

export function parseActionBlocks(text: string): ActionBlock[] { ... }
export function stripActionBlocks(text: string): string { ... }
```

Parses the YAML-like body (type, label, payload with indented key-values). Returns an array of `ActionBlock` objects. Malformed blocks are silently skipped.

`stripActionBlocks` removes the raw `:::action...:::` text, leaving only the surrounding markdown for display.

### Client Parser (`apps/web/src/lib/action-parser.ts`)

Mirrors the server parser exactly. Used during streaming (before the `done` event arrives with pre-parsed actions) so the client can render cards progressively as the agent types.

### Integration with `onFinal`

In `apps/api/src/routes/chat.ts`, the `onFinal` handler:

1. Calls `parseActionBlocks(text)` to extract blocks
2. Maps each `ActionBlock` to an `ActionCard` with `status: "pending"`
3. Stores the stripped text as `content` and the actions array in `metadata.actions`
4. Includes `actions` in the SSE `done` event payload (already supported by `ChatDoneEvent`)

## API Endpoints

### POST /api/chat/actions/:messageId/execute

Executes a single action from a message's action cards.

**Request:**
```json
{ "actionId": "a1b2c3" }
```

**Response (success):**
```json
{
  "action": {
    "id": "a1b2c3",
    "type": "create_project",
    "label": "Crear proyecto \"Mi App\"",
    "payload": { "name": "Mi App", "description": "..." },
    "status": "completed",
    "resultId": 42,
    "executedAt": "2026-02-25T18:30:00.000Z"
  }
}
```

**Response (error):**
```json
{
  "action": {
    "id": "a1b2c3",
    "type": "create_project",
    "status": "error",
    "error": "Project name already exists"
  }
}
```

**Behavior:**

1. Load message by ID, verify it belongs to the user's workspace
2. Parse `metadata.actions`, find action by `actionId`
3. Verify status is `pending` (reject if already `completed` or `executing`)
4. Dispatch to DAL based on `type`:
   - `create_project` -> `createProject({ workspaceId, ...payload })`
   - `create_task` -> `createTask({ workspaceId, ...payload })`
   - `create_file` -> `createFile({ workspaceId, ...payload })`
5. For `create_project`: also update `conversations.projectId` to link the conversation to the new project
6. Update action in `metadata.actions` with `status`, `resultId`, `executedAt`
7. Save updated metadata to `messages.metadata`
8. Return updated `ActionCard`

**Payload validation per type:**

| Type | Required fields | Optional fields |
|------|----------------|-----------------|
| `create_project` | `name` | `description` |
| `create_task` | `title` | `description`, `priority`, `projectId` |
| `create_file` | `filename`, `content` | `projectId`, `mimeType` |

### Manual "+" Menu

Agent messages show a "+" button (visible on hover or always in mobile) that opens a dropdown with manual action options:

- Crear proyecto
- Crear tarea
- Crear archivo

Selecting an option opens a minimal inline form pre-filled with context from the conversation. On submit, it creates a synthetic `ActionCard` appended to the message's metadata and calls the same execute endpoint. This gives users the ability to create resources even when the agent did not explicitly propose one.

## Frontend Components

### ActionCard (`apps/web/src/components/chat/ActionCard.tsx`)

Renders a single action card inline within a chat message bubble.

**States:**
- **pending**: Card with payload summary, gold "Ejecutar" button
- **executing**: Same card, button replaced with spinner, muted colors
- **completed**: Green left border, checkmark icon, "Ver proyecto/tarea" link using `resultId`
- **error**: Red left border, error message, "Reintentar" button

**Styling:** Uses brand palette — `charcoal` background, `gold` accent for pending CTA, `magenta` for links to created resources.

### ManualActionMenu (`apps/web/src/components/chat/ManualActionMenu.tsx`)

Dropdown triggered by a "+" icon button on agent message bubbles. Shows available action types as menu items. On select, expands an inline form below the message.

### Integration in ChatConversation

The `ChatConversation` page (or message list component) replaces `:::action...:::` blocks in rendered message content with `<ActionCard>` components, passing the corresponding `ActionCard` data from `message.metadata.actions`.

During streaming (before `done`), the client parser runs on the accumulated text to detect action blocks and render cards progressively.

## Hooks

### use-action-executor (`apps/web/src/hooks/use-action-executor.ts`)

```typescript
function useActionExecutor(messageId: number) {
  return {
    execute: (actionId: string) => Promise<ActionCard>,
    executing: Set<string>,  // action IDs currently in flight
  };
}
```

Handles:
- Optimistic status update (`pending` -> `executing`)
- API call to execute endpoint
- Success: update local message state with `completed` + `resultId`
- Error: revert to `pending` with `error` field, show toast
- Invalidates relevant query caches (projects list, tasks list) on success

### use-chat updates (`apps/web/src/hooks/use-chat.ts`)

The existing `Message` interface gains an optional `actions` field:

```typescript
interface Message {
  id: number | string;
  role: "user" | "agent" | "system";
  content: string;
  streaming?: boolean;
  actions?: ActionCard[];
  createdAt?: string;
}
```

The `onDone` handler in `connectSSE` now also passes actions from the `done` event into message state.

## DAL Additions

### conversations.ts

New functions needed:

```typescript
// Get a single message by ID
export async function getMessageById(id: number): Promise<Message | undefined>

// Update the metadata JSON column of a message
export async function updateMessageMetadata(id: number, metadata: Record<string, unknown>): Promise<void>

// Link a conversation to a project
export async function linkConversationToProject(conversationId: number, projectId: number): Promise<void>
```

### Existing DAL functions used by execute

- `createProject` from `apps/api/src/dal/projects.ts` — already exists
- `createTask` from `apps/api/src/dal/tasks.ts` — already exists
- File creation will use the existing storage service + `files` DAL

## Phases

### Phase 1 (current scope)

- [ ] Server parser: `parseActionBlocks()` + `stripActionBlocks()` in `apps/api/src/lib/action-parser.ts`
- [ ] Client parser: mirror in `apps/web/src/lib/action-parser.ts`
- [ ] DAL: `getMessageById`, `updateMessageMetadata`, `linkConversationToProject`
- [ ] Execute endpoint: `POST /api/chat/actions/:messageId/execute` in `apps/api/src/routes/chat.ts`
- [ ] `onFinal` integration: parse action blocks, store in metadata, include in SSE `done` event
- [ ] `ActionCard` component with 4 lifecycle states
- [ ] `ManualActionMenu` component with dropdown + inline forms
- [ ] `use-action-executor` hook with optimistic updates
- [ ] `use-chat` updates to carry `actions` in message state
- [ ] `ChatConversation` integration: replace raw blocks with card components
- [ ] Stub agent test: hardcode an `:::action` block in stub responses for development testing

### Phase 2 (future)

- Task dependencies via `blockedBy` field
- SOUL.md prompt injection (teach agents when/how to emit action blocks)
- Project-scoped conversation views (filter conversations by `projectId`)
- Auto-execute for low-risk actions (e.g., creating a task in an existing project)
- Update/delete action types (`update_project`, `update_task`, `delete_task`, `assign_task`)
- Batch execution (execute all pending actions in a message with one click)
- Undo support (soft-delete created resources within a time window)

## File Map

| File | Purpose |
|------|---------|
| `packages/types/src/index.ts` | `ActionType`, `ActionStatus`, `ActionBlock`, `ActionCard` (already defined) |
| `apps/api/src/lib/action-parser.ts` | Server-side parser: `parseActionBlocks`, `stripActionBlocks` |
| `apps/api/src/dal/conversations.ts` | New: `getMessageById`, `updateMessageMetadata`, `linkConversationToProject` |
| `apps/api/src/routes/chat.ts` | `onFinal` parsing + `POST /api/chat/actions/:messageId/execute` |
| `apps/web/src/lib/action-parser.ts` | Client-side parser (mirrors server) |
| `apps/web/src/lib/sse.ts` | Update `done` handler to pass `actions` |
| `apps/web/src/hooks/use-chat.ts` | Add `actions` to `Message`, wire into `onDone` |
| `apps/web/src/hooks/use-action-executor.ts` | Execute hook with optimistic updates |
| `apps/web/src/components/chat/ActionCard.tsx` | Card UI component (4 states) |
| `apps/web/src/components/chat/ManualActionMenu.tsx` | "+" dropdown menu |
| `apps/web/src/pages/ChatConversation.tsx` | Integration: render cards inline in messages |
