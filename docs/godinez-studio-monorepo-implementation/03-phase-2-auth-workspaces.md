# Phase 2: Auth + Workspace Management

**Effort:** 1 day
**Dependencies:** Phase 1
**Deliverable:** Clerk JWT auth on Hono, workspace CRUD working end-to-end, user sync

---

## Tickets

### P2-01: Clerk JWT verification middleware for Hono

Create Hono middleware that verifies Clerk JWTs from the frontend. Unlike Next.js where Clerk middleware handles this automatically, Hono needs explicit JWT verification.

**File:** `apps/api/src/middleware/auth.ts`

```typescript
import { createMiddleware } from 'hono/factory'
import { verifyToken } from '@clerk/backend'

export const requireAuth = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    c.set('clerkUserId', payload.sub)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
})
```

**Context type for typed access:**
```typescript
// apps/api/src/types.ts
export type AuthEnv = {
  Variables: {
    clerkUserId: string
    userId: number  // Postgres user ID, set after DB lookup
  }
}
```

**Acceptance:**
- Protected routes return 401 without valid Bearer token
- `c.get('clerkUserId')` available in downstream handlers
- Invalid/expired tokens rejected

---

### P2-02: User resolution middleware

After Clerk JWT verification, look up the Postgres user by clerkId. If not found, auto-create (lazy sync as backup for webhook).

**File:** `apps/api/src/middleware/resolve-user.ts`

```typescript
export const resolveUser = createMiddleware(async (c, next) => {
  const clerkId = c.get('clerkUserId')
  let user = await getUserByClerkId(clerkId)

  if (!user) {
    // Lazy sync: Clerk webhook may not have fired yet
    // Fetch from Clerk API and insert
    user = await syncUserFromClerk(clerkId)
  }

  if (!user) return c.json({ error: 'User not found' }, 404)

  c.set('userId', user.id)
  await next()
})
```

**Acceptance:**
- Users auto-synced on first API call if webhook hasn't fired
- `c.get('userId')` available as Postgres user ID
- Chain: `requireAuth` → `resolveUser` → handler

---

### P2-03: Clerk webhook endpoint

Webhook handler for user sync events. Same pattern as godinez-ai but using Hono instead of Next.js API route.

**File:** `apps/api/src/routes/webhooks.ts`

**Endpoint:** `POST /webhooks/clerk`

Handles:
- `user.created` → Insert user into Postgres
- `user.updated` → Update user email/name/avatar
- `user.deleted` → Delete or soft-delete user

Uses Svix for webhook signature verification.

**Acceptance:**
- Webhook verifies Svix signature
- User created in Postgres on `user.created` event
- Returns 200 on success, 400 on invalid signature

---

### P2-04: Workspace CRUD routes

Wire workspace management endpoints to DAL.

**File:** `apps/api/src/routes/workspaces.ts`

| Endpoint | Handler |
|----------|---------|
| `POST /api/workspaces` | Create workspace, add creator as owner, generate unique slug |
| `GET /api/workspaces` | List workspaces for authenticated user (via workspace_members) |
| `GET /api/workspaces/:slug` | Get workspace by slug (verify membership) |
| `PUT /api/workspaces/:id` | Update name (regenerates slug), require owner/admin |
| `DELETE /api/workspaces/:id` | Delete workspace + cascade members, require owner |

**Slug generation:** Same `slugify()` + `ensureUniqueSlug()` pattern from godinez-ai.

**Workspace access middleware:**
```typescript
export const requireWorkspaceMember = createMiddleware(async (c, next) => {
  const userId = c.get('userId')
  const workspaceId = parseInt(c.req.param('id') || c.req.param('workspaceId'))
  const role = await getMemberRole(workspaceId, userId)
  if (!role) return c.json({ error: 'Not a workspace member' }, 403)
  c.set('workspaceRole', role)
  await next()
})
```

**Acceptance:**
- Create workspace → appears in list → accessible by slug
- Only members can access workspace
- Only owners can delete
- Slug auto-generated, collision-safe

---

### P2-05: Team management routes

Member invite, role change, remove.

**File:** `apps/api/src/routes/team.ts`

| Endpoint | Handler | Permission |
|----------|---------|-----------|
| `GET /api/workspaces/:id/members` | List members with user info | Any member |
| `POST /api/workspaces/:id/members` | Invite by email | Owner, admin |
| `PUT /api/workspaces/:id/members/:memberId` | Change role | Owner only |
| `DELETE /api/workspaces/:id/members/:memberId` | Remove member | Owner only |

**Validation:**
- Can't remove the workspace owner
- Can't change owner's role
- Invitee must have an existing account (same as godinez-ai)

**Acceptance:**
- Invite member by email → appears in member list
- Change role → reflected immediately
- Remove member → loses access to workspace
- Permission checks enforced

---

### P2-06: Workspace dashboard stats route

Aggregate endpoint for dashboard data.

**Endpoint:** `GET /api/workspaces/:id/dashboard`

Returns:
```typescript
{
  activeProjects: number
  pendingTasks: number
  totalMessages: number
  agent: { name: string, template: string, status: string } | null
  recentActivity: Array<{ type: string, description: string, createdAt: string }>
}
```

**Acceptance:**
- Returns real counts from DB
- Agent info populated if workspace has agentSlot assigned
- Empty workspace returns zeros gracefully
