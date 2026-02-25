# Phase 6: Integration + Polish

**Effort:** 1 day
**Dependencies:** Phases 3 + 5
**Deliverable:** End-to-end working product, deployment-ready

---

## Tickets

### P6-01: End-to-end integration testing

Manual integration test checklist. Walk through every user flow.

**Auth flow:**
- [ ] Sign up at `/sign-up` → Clerk account created
- [ ] Clerk webhook fires → user synced to Postgres
- [ ] Redirect to `/studio` → workspace selector shown
- [ ] Sign out → redirected to sign-in
- [ ] Sign in → redirected to `/studio`

**Workspace flow:**
- [ ] Create workspace → slug generated → redirected to dashboard
- [ ] Dashboard shows 0 projects, 0 tasks, 0 messages
- [ ] Navigate all sidebar links → each page loads without error

**Chat flow (stub):**
- [ ] Create conversation → appears in conversation list
- [ ] Send message → user message appears immediately (optimistic)
- [ ] Stub agent response appears after 1-2 second delay
- [ ] Message history persists on page refresh
- [ ] Multiple conversations maintain separate histories

**Chat flow (Gateway — if available):**
- [ ] Send message → agent response streams token-by-token
- [ ] Streaming cursor visible during response
- [ ] Response saved to DB on completion
- [ ] Agent response uses workspace-specific context/memory
- [ ] Two workspaces → different agent slots → isolated context

**Projects:**
- [ ] Create project → appears in project list
- [ ] Project detail shows task/file/conversation counts
- [ ] Project-scoped chat, tasks, files work independently

**Tasks:**
- [ ] Create task with priority → appears in Pendiente column
- [ ] Click task → moves to En progreso
- [ ] Click again → moves to Completada
- [ ] Create task under project → shows in project tasks

**Files:**
- [ ] Upload file → appears in file list with name/size/date
- [ ] Click file → opens in new tab
- [ ] Upload under project → shows in project files

**Team:**
- [ ] Invite member by email → member added with selected role
- [ ] Change member role → reflected immediately
- [ ] Remove member → member disappears from list

**Settings:**
- [ ] Rename workspace → slug updates → URL changes
- [ ] Delete workspace (type slug to confirm) → redirected to `/studio`

**Responsive:**
- [ ] Mobile: sidebar hidden, hamburger menu works
- [ ] Tablet: sidebar overlay, closes on nav
- [ ] Desktop: sidebar always visible

---

### P6-02: Error handling + loading states

Ensure all pages handle loading, error, and empty states gracefully.

**Loading states:**
- Skeleton components for each page type (list, kanban, chat, dashboard)
- React Query `isLoading` → show skeleton
- React Query `isError` → show error with retry button

**Error boundaries:**
- Wrap route content in ErrorBoundary component
- Show friendly error message in Spanish
- Retry button resets error state

**Empty states:**
- No projects → "No tienes proyectos aún. Crea uno para empezar."
- No tasks → "No hay tareas pendientes."
- No files → "No hay archivos aún."
- No conversations → "Inicia una conversación con tu agente."
- No agent assigned → "Sin agente asignado. Contacta al equipo Frutero."

**Acceptance:**
- No blank screens during loading
- Errors show message + retry
- Empty states guide user to next action

---

### P6-03: CORS configuration

Configure Hono CORS middleware for the frontend domain.

**Development:** Allow `http://localhost:5173` (Vite dev server)
**Production:** Allow `https://studio.godinez.ai` (or whatever the frontend domain is)

```typescript
app.use('*', cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}))
```

**SSE CORS:** EventSource doesn't send custom headers. The SSE endpoint may need to accept the Clerk token via query parameter instead of Authorization header, or use cookies.

**Acceptance:**
- Frontend can make API calls without CORS errors
- SSE streaming works cross-origin
- Credentials (cookies/auth) pass through

---

### P6-04: Deployment configuration

**API (Railway):**
- Dockerfile or Bun start command: `bun run src/index.ts`
- Environment variables configured in Railway dashboard
- Health check: `GET /health`
- Custom domain: `api.godinez.studio` or `studio-api.godinez.ai`

**Web (Cloudflare Pages or Vercel):**
- Build command: `cd apps/web && bun run build`
- Output directory: `apps/web/dist`
- SPA fallback: all routes → `index.html`
- Custom domain: `studio.godinez.ai`
- Environment variables: `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`

**Database:**
- Use existing Neon instance (from godinez-ai) or create new Railway Postgres
- Run `bun run db:push` to create tables

**Files:**
```
apps/api/
├── Dockerfile           # Optional: for Railway
├── railway.json         # Railway config
└── .env.example

apps/web/
├── _redirects           # Cloudflare Pages SPA redirect
└── .env.example
```

**`railway.json`:**
```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "startCommand": "bun run start",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**Acceptance:**
- API deploys to Railway and responds on custom domain
- Web deploys to CDN and serves SPA
- DB tables created on push
- All env vars set in production

---

### P6-05: Seed data + admin tooling

Create seed script for initial agent data and development testing.

**File:** `apps/api/scripts/seed.ts`

Seeds:
- 3 Godínez agents: Lupita (PMO), Toño (CTO), Marisol (Influencer)
- Uses upsert on slug to be idempotent

```bash
bun run apps/api/scripts/seed.ts
```

**Admin considerations:**
- Agent creation/assignment is Frutero-admin only
- For MVP, assign agentSlot to workspace manually via Drizzle Studio or seed script
- Future: admin panel for agent management

**Acceptance:**
- Seed script creates 3 agents
- Running twice doesn't duplicate data
- Agents visible via `GET /api/agents`

---

### P6-06: README + developer onboarding

Create root README with:
- Project overview
- Prerequisites (Bun, pnpm, Postgres)
- Quick start (clone, install, env vars, db:push, dev)
- Monorepo structure explanation
- Available scripts
- Deployment guide
- Architecture diagram

**Acceptance:**
- New developer can get running in <10 minutes
- All env vars documented
- Common issues addressed

---

## Post-MVP Roadmap (not in scope)

These are noted for awareness but NOT part of this implementation:

1. **Agent provisioning UI** — Admin panel to create agents, assign to workspaces
2. **File attachments in chat** — Send images/docs in conversation
3. **Cmd+K search** — Global search across projects, tasks, conversations
4. **Notifications** — In-app notifications for task updates, agent responses
5. **Workspace billing** — Stripe integration for tier upgrades
6. **Mobile app** — React Native or PWA
7. **Multi-agent per workspace** — Currently 1:1, expand to N agents per workspace
8. **WhatsApp/Telegram channels** — Agent responds on messaging platforms
