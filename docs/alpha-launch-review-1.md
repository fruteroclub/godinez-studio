# Alpha Launch Review #1

**Date:** 2026-02-26
**Branch:** `feat/workspace-sync` (→ `dev`)
**Reviewers:** mel + claude

---

## Current state

The core product loop works: auth → workspace creation → agent provisioning → chat with streaming → action cards (create project/task). All CRUD pages are functional with loading states. R2 file storage + 500MB quota just added. OpenClaw Gateway integration is live and tested locally.

### What's solid

- **Auth & workspace isolation** — Clerk integration, membership middleware, role-based access
- **Chat** — SSE streaming, context enrichment (projects/tasks prepended), action card parsing + execution
- **Conversation titles** — Heuristic from first message + agent `:::title` block override
- **All CRUD pages** — Dashboard, Projects, Tasks (kanban + dnd), Files, Team, Settings
- **Agent config** — SOUL.md / IDENTITY.md / TOOLS.md editable through gateway
- **Storage** — Local/R2 toggle via env var, 500MB workspace quota, quota bar UI
- **Deployment** — Railway dev environment auto-deploys from `dev` branch. Production will deploy from `main`

---

## Checklist — blockers for alpha

### P0 — must fix

- [ ] **Install sonner for toast notifications** — Replace ad-hoc `useState` error handling across all pages with a global toast system. Use sonner (shadcn/ui compatible). Pages that need it: Chat, Files (upload errors, quota exceeded), Tasks, Projects, Team
- [ ] **Wire up Activity page** — Currently shows empty because nothing writes to `agent_logs` table. The DAL only has a read function. The chat flow (`chat.ts`) needs to insert a log entry on each agent completion (event, tokens, duration, level). This is the only data source for Activity
- [ ] **Add pagination to Activity** — Once logs are populated, the route loads everything at once. Add cursor-based pagination (the table has `created_at` for ordering)
- [ ] **Env var validation at API startup** — Fail fast if critical vars missing (`DATABASE_URL`, `CLERK_SECRET_KEY`). Simple check in `index.ts` before `serve()`

### P1 — should fix before inviting users

- [ ] **Rate limiting** — Add basic rate limiting on API (e.g. hono-rate-limiter). Without it, a user refreshing rapidly or a misbehaving client can overload the API. Even alpha users with devtools open can accidentally send dozens of requests. Start simple: 100 req/min per IP
- [ ] **DB migration flow** — Currently push-only (`pnpm db:push`). Need to switch to `pnpm db:generate` + `pnpm db:migrate` for production safety. Schema changes should produce migration files that are version-controlled
- [ ] **Analytics (PostHog)** — Track key events for product decisions. See analytics section below

### P2 — nice to have for alpha

- [ ] **Agent personality/system prompt UI** — Currently only raw file editing. Low priority since SOUL.md covers this
- [ ] **Conversation search/filter** — Not critical for alpha volume
- [ ] **Task due date picker** — DB column exists, no UI
- [ ] **Team email invites** — Currently manual. Can use Resend or SendGrid later

---

## Activity page diagnosis

**Problem:** Page always shows "No hay actividad reciente" despite active usage (3 chats, 2 projects, tasks).

**Root cause:** The `agent_logs` table is never written to. The DAL (`dal/agent-logs.ts`) only has `getLogsByWorkspaceId()` — a read function. The chat flow in `routes/chat.ts` completes agent responses but doesn't insert log entries.

**Fix:** After agent response completes (in the SSE stream handler), insert a log entry:
```ts
await db.insert(agentLogs).values({
  workspaceId,
  agentId,
  level: "info",
  event: "chat_completion",
  message: `Response to: "${title}"`,
  tokensUsed: metadata.tokens ?? null,
  durationMs: metadata.latencyMs ?? null,
});
```

This should also log errors (level: "error") when gateway/stub fails.

---

## Analytics plan

**Tool:** PostHog (self-serve, generous free tier, event + session replay)

**Key events to track:**

| Event | Properties | Why |
|-------|-----------|-----|
| `workspace_created` | tier, has_agent | Activation funnel |
| `conversation_started` | workspace_id, has_project | Core engagement |
| `message_sent` | workspace_id, message_length | Usage volume |
| `action_executed` | action_type (create_project/task), success | Feature adoption |
| `action_failed` | action_type, error | Quality signal |
| `file_uploaded` | mime_type, size_bytes | Storage patterns |
| `agent_provisioned` | agent_template | Onboarding completion |
| `page_viewed` | page_name | Navigation patterns |
| `quota_warning` | used_percent | Capacity planning |

**Session replay:** Enable for first 100 sessions to watch real user flows and find UX friction.

**Implementation:** Add PostHog JS SDK to `apps/web`, initialize in `main.tsx`, use `posthog.capture()` in hooks/pages. Server-side events via PostHog Node SDK in API for backend actions.

---

## Observations

- **File creation action stub** — The `create_file` case in chat action execution is a no-op. This is fine — file creation is for agent workspace (code gen → GitHub), not user-facing files. Artifacts-style generation (markdown, PDFs, images) is out of scope for alpha
- **Conversation title fallback** — The heuristic title generator (`conversation-title.ts`) uses "New conversation" as English fallback on line 47. Should be "Nueva conversación" for consistency, though it should rarely trigger since any non-empty message generates a proper title
- **Branch topology** — `feat/workspace-sync` and `feat/action-cards` point at the same commit. All work is on `feat/workspace-sync`. PR target is `dev`
- **Stub agent** — Only activates when OpenClaw Gateway is not configured. Since gateway is live and env vars are set, this won't appear for alpha users. The `[Stub response]` disclaimer only shows in local dev without gateway

---

## Session changes (this PR)

Changes made in this session, on top of the existing `feat/workspace-sync` work:

1. **R2 file storage** — New `R2Storage` class, storage factory (R2 vs Local via env), quota DAL, 500MB workspace quota with 413 rejection, `GET /api/workspaces/:id/storage` endpoint
2. **Quota UI** — `useStorageQuota` hook, progress bar in Files page (magenta, red at 90%+), "X MB de 500 MB" display
3. **Dev file serving** — `serveStatic` for `/uploads/*` in API, Vite proxy for `/uploads`
4. **Logo + favicon** — Robot mascot SVG in Navbar + Sidebar, proper favicon set (ico, png 16/32, apple-touch-icon)
5. **Conversation creation fix** — API now resolves `agentId` from workspace default when not provided. Frontend has error handling with visible error banner
6. **Upload invalidates quota** — `useUploadFile` onSuccess also invalidates `storage-quota` query
