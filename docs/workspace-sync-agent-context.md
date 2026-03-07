# Workspace Sync — Agent Context Management

## Problem

The OpenClaw agent operates inside its workspace directory (`~/.openclaw/workspaces/agent-N/`) and builds its understanding from `.md` files loaded at conversation boot. Currently the agent has **no visibility** into the Studio's live state — it doesn't know what projects exist, what tasks are pending, or which project a conversation belongs to.

The agent can *create* resources via `:::action` blocks, but it can't reference what already exists. This makes it useless for follow-up questions like "how's the campaign going?" or "what tasks are left?"

## Solution

Two complementary mechanisms using existing OpenClaw plumbing (no protocol changes):

### 1. WORKSPACE.md — Ambient Awareness

A markdown file synced from the Studio database to the agent's workspace via `gateway.agentsFilesSet()`. Contains a compact snapshot of workspace state: projects, tasks, files.

OpenClaw's bootstrap pipeline already reads all `.md` files in the workspace directory and includes them in the system prompt. Adding a file = adding context. Removing the file = full revert.

### 2. Message Context Header — Conversational Focus

Before sending a message to the gateway, the `chat.ts` handler prepends a context block to the message string. This tells the agent what the user is currently working on.

- **Project-linked conversations** (`conversation.projectId` is set): include project name, task summary, recent files
- **General chat**: include a one-line workspace summary

## Architecture

### WORKSPACE.md Sync Flow

```
Mutation (UI or action block)
  → API route handler
    → DB write (already happens)
    → syncWorkspaceFile(workspaceId)  ← new step
      → query projects, tasks, files from DB
      → render compact markdown
      → gateway.agentsFilesSet(agentId, "WORKSPACE.md", content)
        → OpenClaw writes to disk
          → next conversation boot picks it up
```

### Message Context Flow

```
User sends message
  → POST /api/chat/send
    → look up conversation.projectId
    → if project-linked: build project context header
    → if general: build workspace summary header
    → prepend to content string
    → gateway.chatSend(sessionKey, enrichedContent)
```

## Module Design

### Standalone service: `apps/api/src/services/workspace-sync.ts`

Single entry point:

```typescript
export async function syncWorkspaceFile(workspaceId: number): Promise<void>
```

Guarded by feature flag:

```
WORKSPACE_SYNC_ENABLED=true   # env var, off by default
```

When disabled, the function is a no-op. When enabled, it:

1. Resolves the workspace's `agentSlot` (OpenClaw agent ID)
2. Queries DB for active projects, pending/in-progress tasks, recent files
3. Renders a markdown string (target: under 2KB)
4. Calls `gateway.agentsFilesSet(agentId, "WORKSPACE.md", content)`

### Context header builder: `apps/api/src/services/message-context.ts`

```typescript
export async function buildMessageContext(
  conversationId: number,
  workspaceId: number,
): Promise<string>
```

Returns a string to prepend to the user's message. Example outputs:

**Project-linked conversation:**
```
[Proyecto: Campana Instagram (P-12) | 3 tareas pendientes, 2 archivos]
```

**General chat:**
```
[Workspace: Mi Negocio | 2 proyectos activos, 5 tareas pendientes]
```

### SOUL.md extension

Add a new section to `buildSoulMd()` in `agent-soul-template.ts` explaining:

- WORKSPACE.md exists and contains live workspace state
- How to reference projects/tasks by their IDs
- Message context headers indicate what the user is focused on
- When context is ambiguous, ask the user which project they mean

## WORKSPACE.md Format

```markdown
# Workspace: Mi Negocio
Actualizado: 2026-02-26T14:30:00Z

## Proyectos activos
- [P-12] Campana Instagram — 3 pendientes, 1 en progreso
- [P-15] Rediseno web — 5 pendientes, 2 en progreso

## Tareas recientes
| ID | Titulo | Estado | Prioridad | Proyecto |
|----|--------|--------|-----------|----------|
| T-45 | Disenar stories | pending | high | P-12 |
| T-44 | Revisar copy landing | in_progress | medium | P-15 |
| T-43 | Subir fotos producto | pending | low | P-12 |

## Archivos recientes
| Archivo | Proyecto | Fecha |
|---------|----------|-------|
| brief-campana.pdf | P-12 | 25 feb |
| wireframe-v2.fig | P-15 | 24 feb |
```

### Size constraints

- Active projects only (skip completed/archived)
- Tasks: pending + in_progress only, max 30 entries
- Files: max 10 most recent
- No descriptions — titles, statuses, priorities only
- Target: under 2KB (~500 tokens per message)

## Sync Strategy

**Full rebuild** — every sync replaces the entire file. `agentsFilesSet` is a full overwrite, not an append. This is intentional:

- Idempotent — calling twice produces the same result
- No drift — file always matches DB
- No merge logic needed
- Simple to debug — read file, it's the full truth

**Debounced** — mutations set a dirty flag per workspace. A timer fires 5 seconds after the last mutation and triggers the sync. Rapid operations (creating 5 tasks) batch into a single sync call.

## Performance Impact

| Dimension | Impact | Mitigation |
|-----------|--------|------------|
| DB queries per sync | 3 indexed queries (projects, tasks, files) | Milliseconds, negligible |
| Data transfer | 2-5KB WebSocket frame | Single message, negligible |
| Sync frequency | Debounced to 5s | At most 1 sync per 5s per workspace |
| Model tokens | ~500 tokens/message added to system prompt | Keep file under 2KB, only active items |
| Bootstrap | File read on every conversation boot | Already happens for SOUL.md, IDENTITY.md |

The main ongoing cost is **model tokens**: ~500 extra input tokens per message, per conversation. For a workspace sending 100 messages/day, that's ~50K extra tokens/day. Acceptable for the context quality gained.

## Trigger Points

Routes that should call `syncWorkspaceFile()` after successful DB writes:

| Route | Mutation |
|-------|----------|
| `POST /api/projects` | Project created |
| `PUT /api/projects/:id` | Project updated |
| `DELETE /api/projects/:id` | Project deleted |
| `POST /api/tasks` | Task created |
| `PUT /api/tasks/:id/status` | Task status changed |
| `DELETE /api/tasks/:id` | Task deleted |
| `POST /api/files/upload` | File uploaded |
| `DELETE /api/files/:id` | File deleted |
| `POST /api/chat/actions/:messageId/execute` | Action card executed (creates project/task/file) |

## Feature Flag Behavior

| `WORKSPACE_SYNC_ENABLED` | Behavior |
|--------------------------|----------|
| `false` / unset (default) | `syncWorkspaceFile()` is a no-op. No WORKSPACE.md created. Agent works exactly as today. |
| `true` | Full sync active. WORKSPACE.md maintained. Message context headers prepended. |

To revert: set flag to `false` and optionally delete WORKSPACE.md via `gateway.agentsFilesSet(agentId, "WORKSPACE.md", "")`.

## SOUL.md Additions

New section added to `buildSoulMd()`:

```markdown
## Contexto del espacio de trabajo

Tu directorio de trabajo contiene un archivo **WORKSPACE.md** que se actualiza
automaticamente con el estado actual del espacio de trabajo: proyectos activos,
tareas pendientes y archivos recientes.

Consulta WORKSPACE.md cuando el usuario pregunte por el estado de sus proyectos,
tareas pendientes o archivos. Referencia proyectos por su ID (ej: P-12) y tareas
por su ID (ej: T-45) para ser preciso.

Cada mensaje del usuario puede incluir una linea de contexto entre corchetes al
inicio, por ejemplo:

  [Proyecto: Campana Instagram (P-12) | 3 tareas pendientes]

Esto indica desde donde esta hablando el usuario. Usa esa informacion para
enfocar tu respuesta en ese proyecto sin preguntar cual.

Si no hay linea de contexto y la pregunta es ambigua (podria referirse a
multiples proyectos), pregunta al usuario a cual se refiere.
```

## File Map

| File | Purpose |
|------|---------|
| `apps/api/src/services/workspace-sync.ts` | New: sync module (query DB, render md, push to agent) |
| `apps/api/src/services/message-context.ts` | New: build context header for messages |
| `apps/api/src/services/agent-soul-template.ts` | Extend: add WORKSPACE.md awareness section |
| `apps/api/src/routes/chat.ts` | Modify: prepend context header before gateway.chatSend() |
| `apps/api/src/routes/projects.ts` | Modify: call syncWorkspaceFile() after mutations |
| `apps/api/src/routes/tasks.ts` | Modify: call syncWorkspaceFile() after mutations |
| `apps/api/src/routes/files.ts` | Modify: call syncWorkspaceFile() after mutations |

## Rollback Plan

1. Set `WORKSPACE_SYNC_ENABLED=false`
2. Optionally delete WORKSPACE.md from agent workspaces
3. Remove context header prepending from chat.ts
4. Agent reverts to pre-sync behavior with zero side effects
