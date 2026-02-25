# Phase 4: Projects, Tasks, Files

**Effort:** 1.5 days
**Dependencies:** Phase 2 (auth + workspaces)
**Deliverable:** Full CRUD for projects, tasks, and file uploads

---

## Tickets

### P4-01: Project CRUD routes

**File:** `apps/api/src/routes/projects.ts`

| Endpoint | Method | Description | Permission |
|----------|--------|------------|-----------|
| `POST /api/projects` | POST | Create project | Any member |
| `GET /api/workspaces/:id/projects` | GET | List workspace projects | Any member |
| `GET /api/projects/:id` | GET | Project detail + stats | Any member |
| `PUT /api/projects/:id` | PUT | Update name/description/status | Any member |
| `DELETE /api/projects/:id` | DELETE | Delete project | Owner, admin |

**Create request:**
```typescript
{ workspaceId: number, name: string, description?: string }
```

**Detail response includes:**
- Project info (name, description, status, dates)
- Counts: conversations, tasks (by status), files
- Latest activity

**Validation:**
- Name required, min 2 chars
- workspaceId must match authenticated user's membership
- Status transitions: active → completed → archived (no reverse)

**Acceptance:**
- Create → list → detail → update → delete flow works
- Stats counts are accurate
- Permission checks enforced

---

### P4-02: Task CRUD routes

**File:** `apps/api/src/routes/tasks.ts`

| Endpoint | Method | Description | Permission |
|----------|--------|------------|-----------|
| `POST /api/tasks` | POST | Create task | Any member |
| `GET /api/workspaces/:id/tasks` | GET | List workspace tasks | Any member |
| `GET /api/projects/:id/tasks` | GET | List project tasks | Any member |
| `PUT /api/tasks/:id` | PUT | Update task | Any member |
| `PUT /api/tasks/:id/status` | PUT | Update status only | Any member |
| `DELETE /api/tasks/:id` | DELETE | Delete task | Owner, admin |

**Create request:**
```typescript
{
  workspaceId: number
  projectId?: number    // null = workspace-level task
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'  // default: medium
}
```

**Status update request:**
```typescript
{ status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' }
```

**Business logic:**
- Setting status to `completed` auto-sets `completedAt` timestamp
- Setting status back from `completed` clears `completedAt`
- Tasks can be assigned to agents (`assignedAgentId`)

**Query filters:**
- `GET /api/workspaces/:id/tasks?status=pending&priority=high` — filter support
- `GET /api/projects/:id/tasks` — scoped to project

**Acceptance:**
- Create task with priority → shows in kanban columns
- Status transitions update timestamps
- Workspace-level and project-level tasks work independently

---

### P4-03: File upload and management routes

**File:** `apps/api/src/routes/files.ts`

| Endpoint | Method | Description | Permission |
|----------|--------|------------|-----------|
| `POST /api/files/upload` | POST | Upload file (multipart) | Any member |
| `GET /api/workspaces/:id/files` | GET | List workspace files | Any member |
| `GET /api/projects/:id/files` | GET | List project files | Any member |
| `DELETE /api/files/:id` | DELETE | Delete file | Owner, admin |

**Upload flow:**
1. Parse multipart form data (Hono built-in)
2. Validate file size (max 10MB for MVP)
3. Upload to storage (Vercel Blob or Cloudflare R2)
4. Insert file record in Postgres with storage key, URL, metadata
5. Return file record

**Storage abstraction:**
```typescript
// apps/api/src/services/storage.ts
export interface StorageService {
  upload(file: File, path: string): Promise<{ url: string, key: string }>
  delete(key: string): Promise<void>
}

// Implementation: Vercel Blob or Cloudflare R2
```

**File record response:**
```typescript
{
  id: number
  filename: string
  mimeType: string | null
  sizeBytes: number
  url: string
  createdAt: string
  uploadedBy: { id: number, name: string }
}
```

**Acceptance:**
- Upload file → record in DB → accessible via URL
- List files by workspace or project
- Delete removes from storage + DB
- File size validation enforced

---

### P4-04: Agent management routes (read-only)

**File:** `apps/api/src/routes/agents.ts`

| Endpoint | Method | Description |
|----------|--------|------------|
| `GET /api/agents` | GET | List all available agents |
| `GET /api/agents/:id` | GET | Get agent detail + config |

Agents are platform-level resources managed by Frutero. Users can view their assigned agent's info but can't create or modify agents.

**Response:**
```typescript
{
  id: number
  name: string
  slug: string
  template: string        // pmo, cto, influencer, etc.
  status: string
  config: {
    personality?: string
    skills?: string[]
    channels?: string[]
    model?: string
  }
}
```

**Acceptance:**
- Seed agents (Lupita, Toño, Marisol) queryable
- Agent detail includes parsed config
- No write operations exposed to users

---

### P4-05: Activity log routes

**File:** `apps/api/src/routes/activity.ts`

| Endpoint | Method | Description |
|----------|--------|------------|
| `GET /api/workspaces/:id/activity` | GET | Recent agent activity |

Returns agent_logs entries for the workspace, most recent first.

**Query params:**
- `limit` (default: 50, max: 200)
- `level` — filter by log level (debug, info, warn, error)

**Response:**
```typescript
{
  logs: Array<{
    id: number
    level: string
    event: string
    message: string
    metadata?: Record<string, unknown>
    tokensUsed?: number
    durationMs?: number
    createdAt: string
  }>
}
```

**Acceptance:**
- Returns logs ordered by createdAt desc
- Filtering by level works
- Empty workspace returns empty array gracefully

---

### P4-06: Zod validation schemas

Create shared validation schemas for all request bodies using Zod. Used in route handlers for input validation.

**File:** `apps/api/src/validators/index.ts`

```typescript
import { z } from 'zod'

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
})

export const createProjectSchema = z.object({
  workspaceId: z.number().int().positive(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
})

export const createTaskSchema = z.object({
  workspaceId: z.number().int().positive(),
  projectId: z.number().int().positive().optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
})

export const sendMessageSchema = z.object({
  conversationId: z.number().int().positive(),
  workspaceId: z.number().int().positive(),
  content: z.string().min(1).max(10000),
})

// ... etc
```

**Usage in routes:**
```typescript
chat.post('/send', async (c) => {
  const body = sendMessageSchema.parse(await c.req.json())
  // ...
})
```

**Acceptance:**
- All POST/PUT endpoints validate input with Zod
- Invalid requests return 400 with field-level errors
- Max lengths prevent abuse
