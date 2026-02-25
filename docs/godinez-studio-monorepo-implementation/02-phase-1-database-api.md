# Phase 1: Database Schema + API Foundation

**Effort:** 1.5 days
**Dependencies:** Phase 0
**Deliverable:** Full Drizzle schema, DB connection, CRUD API routes for all domain entities

---

## Tickets

### P1-01: Write Drizzle schema in `packages/db`

Adapt the godinez-ai schema (11 tables) to follow regen-garden conventions:
- `serial` PKs (not UUIDs) for internal tables
- `text` for enums stored as strings (simpler migrations)
- `timestamp` with `defaultNow()`
- Indexes where needed
- Drizzle `relations()` for query builder

**Tables:**

| Table | From godinez-ai | Changes |
|-------|----------------|---------|
| `users` | users.ts | serial PK, add `clerkId`, drop UUID |
| `workspaces` | workspaces.ts | serial PK, add `agentSlot` (OpenClaw mapping), keep tier/status |
| `workspace_members` | workspace-members.ts | serial PK, unique(workspaceId, userId) |
| `agents` | agents.ts | serial PK, keep config jsonb, add burritoId → openclawId |
| `projects` | projects.ts | serial PK |
| `conversations` | conversations.ts | serial PK, keep channel field |
| `messages` | messages.ts | serial PK, `metadata` as text (JSON string), index (conversationId, createdAt) |
| `tasks` | tasks.ts | serial PK |
| `files` | files.ts | serial PK |
| `agent_logs` | agent-logs.ts | serial PK |

**New fields:**
- `workspaces.agentSlot` — maps to OpenClaw agent ID (e.g. `godinez-001`)
- `workspaces.settings` — JSON string for workspace-level config
- `agents.openclawId` — replaces `burritoId`, references OpenClaw agent config

**Files to create:**
```
packages/db/src/schema/
├── users.ts
├── workspaces.ts
├── workspace-members.ts
├── agents.ts
├── projects.ts
├── conversations.ts
├── messages.ts
├── tasks.ts
├── files.ts
├── agent-logs.ts
├── relations.ts           # All Drizzle relations in one file
└── index.ts               # Barrel export
```

**Acceptance:**
- `bun run typecheck` passes in `@godinez/db`
- Schema covers all domain entities
- Relations defined for query builder

---

### P1-02: Configure Drizzle + Postgres connection

Set up the database client in `packages/db` and wire `drizzle.config.ts` in `apps/api`.

**`packages/db/src/index.ts`:**
```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export function createDb(connectionString: string) {
  const client = postgres(connectionString)
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof createDb>
export * from './schema'
```

**`apps/api/src/db.ts`:**
```typescript
import { createDb } from '@godinez/db'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is required')

export const db = createDb(DATABASE_URL)
```

**`apps/api/drizzle.config.ts`:**
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: '../../packages/db/src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

**Acceptance:**
- `bun run db:push` creates all tables in Postgres
- `bun run db:studio` opens Drizzle Studio with all tables visible
- API starts without DB connection errors

---

### P1-03: Create DAL (Data Access Layer) in API

Query functions for each domain entity. These are thin wrappers around Drizzle queries, similar to `godinez-ai/src/lib/db/queries/`.

**Files:**
```
apps/api/src/dal/
├── users.ts               # getUserByClerkId, getUserById
├── workspaces.ts          # getWorkspacesByUserId, getWorkspaceBySlug, getMembers, getMemberRole
├── agents.ts              # getAgentById, getAgentBySlug, getAllAgents
├── projects.ts            # getProjectsByWorkspaceId, getProjectById
├── conversations.ts       # getConversationsByWorkspaceId, getConversationById, getMessages
├── tasks.ts               # getTasksByWorkspaceId, getTasksByProjectId, getTaskById
├── files.ts               # getFilesByWorkspaceId, getFilesByProjectId
├── agent-logs.ts          # getLogsByWorkspaceId
└── index.ts               # Barrel export
```

Each DAL file exports typed async functions that return Drizzle query results.

**Acceptance:**
- All DAL functions type-check
- Queries return properly typed results
- No raw SQL — all through Drizzle query builder

---

### P1-04: Create core CRUD API routes

REST endpoints for workspace management, projects, tasks, files. Following Hono route patterns from regen-garden.

**Route files:**
```
apps/api/src/routes/
├── health.ts              # GET /health (exists from Phase 0)
├── workspaces.ts          # CRUD /api/workspaces
├── projects.ts            # CRUD /api/projects
├── tasks.ts               # CRUD /api/tasks
├── files.ts               # CRUD /api/files
├── agents.ts              # GET /api/agents (read-only for users)
├── team.ts                # /api/workspaces/:id/members
└── index.ts               # Register all routes on Hono app
```

**API Contract (define here, implement in Phase 2+):**

```
# Workspaces
POST   /api/workspaces                 # Create workspace
GET    /api/workspaces                 # List user's workspaces
GET    /api/workspaces/:slug           # Get workspace by slug
PUT    /api/workspaces/:id             # Update workspace
DELETE /api/workspaces/:id             # Delete workspace

# Workspace Members
GET    /api/workspaces/:id/members     # List members
POST   /api/workspaces/:id/members     # Invite member
PUT    /api/workspaces/:id/members/:memberId  # Update role
DELETE /api/workspaces/:id/members/:memberId  # Remove member

# Projects
POST   /api/projects                   # Create project
GET    /api/workspaces/:id/projects    # List workspace projects
GET    /api/projects/:id               # Get project detail
PUT    /api/projects/:id               # Update project
DELETE /api/projects/:id               # Delete project

# Tasks
POST   /api/tasks                      # Create task
GET    /api/workspaces/:id/tasks       # List workspace tasks
GET    /api/projects/:id/tasks         # List project tasks
PUT    /api/tasks/:id                  # Update task (status, details)
DELETE /api/tasks/:id                  # Delete task

# Files
POST   /api/files/upload               # Upload file (multipart)
GET    /api/workspaces/:id/files       # List workspace files
GET    /api/projects/:id/files         # List project files
DELETE /api/files/:id                  # Delete file

# Agents
GET    /api/agents                     # List available agents
GET    /api/agents/:id                 # Get agent detail

# Chat (defined in Phase 3)
POST   /api/chat/send                  # Send message
GET    /api/chat/stream/:runId         # SSE stream
GET    /api/chat/history/:conversationId
POST   /api/conversations              # Create conversation
GET    /api/workspaces/:id/conversations
```

**Acceptance:**
- All route files created with Hono route instances
- Routes registered on main app in `src/index.ts`
- Stubs return 501 until wired in Phase 2+
- API contract documented and stable

---

### P1-05: Define shared types in `packages/types`

API request/response types, domain enums, shared between `@godinez/web` and `@godinez/api`.

**`packages/types/src/index.ts`:**
```typescript
// Domain enums
export type WorkspaceTier = 'becario' | 'asistente' | 'agente'
export type WorkspaceStatus = 'active' | 'suspended' | 'provisioning'
export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'
export type ProjectStatus = 'active' | 'completed' | 'archived'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type MessageRole = 'user' | 'agent' | 'system'

// API response types
export interface Workspace { ... }
export interface Project { ... }
export interface Task { ... }
export interface FileRecord { ... }
export interface Conversation { ... }
export interface Message { ... }

// Chat streaming events
export interface ChatDeltaEvent { type: 'delta'; text: string }
export interface ChatDoneEvent { type: 'done'; text: string; messageId: number }
export interface ChatErrorEvent { type: 'error'; error: string }
export type ChatStreamEvent = ChatDeltaEvent | ChatDoneEvent | ChatErrorEvent

// API request types
export interface CreateWorkspaceRequest { name: string }
export interface SendMessageRequest { conversationId: number; workspaceId: number; content: string }
// ... etc
```

**Acceptance:**
- Both `@godinez/api` and `@godinez/web` can import from `@godinez/types`
- Types match the API contract from P1-04
