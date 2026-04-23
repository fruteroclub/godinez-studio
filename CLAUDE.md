# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Godinez Studio — AI workspace SPA for Latin American SMBs. Separate product from the godinez-ai marketing site (Next.js on godinez.ai). Users onboard, configure a personal AI agent (via OpenClaw), and manage projects, tasks, and files through chat.

**Stack:** Turborepo + pnpm monorepo, Hono API (Node.js), Vite + React 19 SPA, Drizzle ORM, PostgreSQL, Clerk auth, Tailwind CSS 4
**Deploy:** Railway (Railpack builder), each app = separate Railway service
**Repo:** fruteroclub/godinez-studio

## Development Commands

```bash
pnpm install                # Install all workspace dependencies
pnpm dev:api                # Hono API on :3001 (bun --hot)
pnpm dev:web                # Vite SPA on :5173
pnpm build                  # Turbo builds all packages
pnpm typecheck              # TypeScript check across all packages
pnpm db:push                # Push Drizzle schema to database
pnpm db:generate            # Generate Drizzle migrations
pnpm db:studio              # Open Drizzle Studio GUI
```

Run `pnpm dev:api` and `pnpm dev:web` in separate terminals for local development. The Vite dev server proxies `/api` requests to `:3001`.

## Architecture

### Monorepo Layout

- `apps/api` (`@godinez/api`) — Hono server on Node.js. Local dev uses `bun --hot`. Routes in `src/routes/`. Port 3001.
- `apps/web` (`@godinez/web`) — Vite + React 19 SPA. Uses `@` path alias for `src/`. React Router, TanStack Query, Clerk React.
- `packages/db` (`@godinez/db`) — Drizzle schema + `createDb()` factory. Schema tables in `src/schema/`. 13 tables.
- `packages/types` (`@godinez/types`) — Domain enums, API contract types, shared content strings.

### Key Patterns

- **pnpm** is the package manager (enforced via `packageManager` field). **Node.js** is the production runtime. **Bun** for local API dev only (`bun --hot`).
- Workspace packages use `workspace:*` protocol for inter-package deps.
- Turbo handles build ordering — `typecheck` depends on `^build` so packages compile first.
- Vite proxies `/api` → `localhost:3001` in dev, so no CORS issues locally.
- All UI content strings live in `packages/types/src/content.ts` (i18n-ready, Spanish).
- API bundled with **tsup** (esbuild) — does NOT type-check. Always run `pnpm typecheck` to catch import errors.
- File storage: Cloudflare R2 in production, local filesystem fallback in dev (controlled by `R2_*` env vars).
- Config constants in `apps/api/src/lib/config.ts`: `AGENT_MAX_SLOTS`, `AGENT_WORKSPACE_BASE`, `SYNC_DEBOUNCE_MS`, `SYNC_MAX_TASKS`, `SYNC_MAX_FILES`.

### Design System

Brand tokens defined in `apps/web/src/index.css` via Tailwind v4 `@theme inline`:

- **magenta** `#E91E8C` (primary), **violet** `#8B5CF6` (secondary), **gold** `#FFB800` (accent)
- **dark** `#0A0A0A` (bg), **charcoal** `#1A1A1A` (cards)
- shadcn/ui CSS variables (HSL) mapped to brand palette in `:root`
- Custom utilities: `.text-gradient-brand`, `.bg-gradient-brand`, `.glow-magenta`, `.border-gradient-brand`
- Fonts: Plus Jakarta Sans (body), Playfair Display (emphasis only)

## Services & Live URLs

| Service | URL |
|---|---|
| Dev API | `https://dev-api.godinez.ai` |
| Dev Web | `https://dev-studio.godinez.ai` |
| File Storage CDN | `https://godinez-studio-files.godinez.ai` (Cloudflare R2) |
| Deploy | Railway — each app is a separate service, Railpack builder |

## Environment Variables

> **Warning:** Railway CLI (`railway variables`) exposes LIVE development credentials. Confirm intent before pulling them for local use. Each dev should use their own Clerk app + local PostgreSQL.

### `apps/api/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret |
| `CLERK_WEBHOOK_SECRET` | No | Clerk webhook signing secret |
| `PORT` | No | API port (default: 3001) |
| `CORS_ORIGIN` | Yes | Allowed origins, comma-separated (fail-closed if unset) |
| `OPENCLAW_GATEWAY_URL` | No | OpenClaw Gateway WebSocket URL |
| `OPENCLAW_GATEWAY_TOKEN` | No | Gateway auth token |
| `AGENT_MAX_SLOTS` | No | Max agent slots per instance (default: 15, soft limit) |
| `AGENT_WORKSPACE_BASE` | No | OpenClaw workspace base path on host |
| `SYNC_DEBOUNCE_MS` | No | Delay before workspace sync (default: 5000) |
| `API_BASE_URL` | No | Public API URL (for file URLs in responses) |
| `R2_BUCKET_NAME` | No | Cloudflare R2 bucket name |
| `R2_ACCOUNT_ID` | No | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | No | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret key |
| `R2_PUBLIC_URL` | No | R2 public CDN URL |
| `UPLOADS_DIR` | No | Local upload dir fallback (default: `./uploads`) |
| `RESEND_API_KEY` | No | Resend API key for admin email sending (`/api/admin/email/send`) |
| `RESEND_FROM_EMAIL` | No | Default from address (e.g. `Godínez.AI <invitaciones@godinez.ai>`) |
| `STUDIO_SERVICE_KEY` | No | Shared secret for `X-Service-Key` header on service-to-service endpoints (also used by admin email) |

### `apps/web/.env`

| Variable | Required | Description |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend publishable key |
| `VITE_API_URL` | No | API base URL (Vite proxies `/api` in dev) |

## Backlog

Tracked on [GitHub Project #5](https://github.com/orgs/fruteroclub/projects/5). Six epics:

| Epic | Issues | Scope |
|---|---|---|
| **Beta Readiness** | GS-01 – GS-17 | Auth middleware, DB indexes, secrets rotation, CORS, pagination, N+1 queries, agent.config types, error toasts, SSE reconnect, Sentry, PostHog, Vitest, structured logging, chat virtualization, health check, manual action stub, code-splitting |
| **Admin Dashboard** | OPS-01 – OPS-04 | Admin role middleware, cross-workspace analytics API, instance health endpoint, admin web page |
| **CI/CD & Automation** | OPS-05 – OPS-08 | Token/storage tracking, GitHub Actions CI, CLAUDE.md conventions |
| **Project Board Ops** | OPS-09 – OPS-12 | Issue/PR templates, project board custom fields + views, ticket migration |
| **Agent Workflow** | OPS-13 – OPS-16 | Auto-add PRs/issues to board, label-based agent workflow, activity dashboard integration |
| **Growth & Quotas** | OPS-17 – OPS-20 | Quota enforcement, alerting thresholds, waitlist-to-onboarding pipeline, capacity planning |

### Scrum Methodology

- **Priority:** P0 = blocks beta launch, P1 = beta quality bar, P2 = stretch goal
- **Points:** Fibonacci-lite — 1 (trivial), 2 (small), 3 (medium), 5 (large), 8 (epic-level)
- **Agent labels:** `agent-ok` (safe for sub-agents), `agent-claimed` (agent working), `agent-done` (awaiting review)
- **Board:** GitHub Project #5, grouped by Epic column, sorted by priority

## Git Conventions

- **Branch from `dev`** (not main)
- **Naming:** `fix/issue-{N}` for bug fixes, `feat/issue-{N}` for features
- **Commits:** conventional prefixes (`feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`), lowercase, max 60 chars
- **No co-signatures or attributions**
- **One focused commit per issue**
- **Never force-push**, never commit to `dev` directly (except docs-only changes)
- **PR target:** always `dev`

## Key Rules

1. **pnpm only** — enforced via `packageManager` field. Do NOT use npm/yarn/bun for package management.
2. **Tailwind CSS only** — no CSS modules, no styled-components.
3. **Content strings** in `packages/types/src/content.ts` — not hardcoded in components.
4. **TypeScript strict mode** everywhere.
5. **`@godinez/` scope** for all workspace packages.
6. **Hono routes** export a `new Hono()` instance, mounted via `app.route()` in `apps/api/src/index.ts`.
7. **Types from `@godinez/types`** — never duplicate domain types in hooks or components. Import from the shared package.
8. **Spanish UI** — all user-facing text in Spanish. English only for code, logs, and developer-facing content.
9. **Zod validation** on all user input and external data (API payloads, parsed JSON, webhook bodies).
10. **Drizzle parameterized queries** — never interpolate user input into SQL.

## Security

- Never commit secrets or `.env` files. All sensitive config via environment variables.
- Validate all user input at API boundaries with Zod.
- All resource access must be workspace-scoped — check membership before returning data.
- `CORS_ORIGIN` must be explicitly set (no wildcard fallback). Fail-closed if unset.
- Clerk handles authentication; workspace membership handles authorization.
- Middleware stack: `requireAuth` → `resolveUser` → `requireWorkspaceMember` → `requireRole` (owner|admin|member|viewer).

## API Routes

All routes mounted in `apps/api/src/index.ts`:

### Health
- `GET /health` — health check
- `GET /` — API status JSON

### Workspaces
- `POST /api/workspaces` — create workspace
- `GET /api/workspaces` — list user's workspaces
- `GET /api/workspaces/:slug` — get by slug
- `PUT /api/workspaces/:slug` — update
- `DELETE /api/workspaces/:slug` — delete

### Team
- `POST /api/workspaces/:id/members` — add member
- `GET /api/workspaces/:id/members` — list members
- `DELETE /api/workspaces/:id/members/:userId` — remove member

### Dashboard & Activity
- `GET /api/workspaces/:id/dashboard` — aggregated stats
- `GET /api/workspaces/:id/activity` — agent activity logs

### Projects
- `POST /api/projects` — create
- `GET /api/projects` — list (user-scoped)
- `GET /api/projects/:id` — detail
- `PUT /api/projects/:id` — update
- `GET /api/workspaces/:id/projects` — list by workspace

### Tasks
- `POST /api/tasks` — create
- `GET /api/tasks` — list (user-scoped)
- `PUT /api/tasks/:id` — update (status transitions)
- `GET /api/workspaces/:id/tasks` — list by workspace
- `GET /api/projects/:id/tasks` — list by project

### Files
- `POST /api/files` — upload (multipart, R2 or local)
- `GET /api/files` — list (user-scoped)
- `DELETE /api/files/:id` — delete
- `GET /api/workspaces/:id/files` — list by workspace
- `GET /api/projects/:id/files` — list by project

### Agents
- `GET /api/agents` — list all agents
- `GET /api/agents/:id` — detail + config
- `PUT /api/agents/:id` — update agent config
- `GET /api/agents/:id/files` — list agent workspace files (OpenClaw)
- `POST /api/agents/provision` — provision new agent
- `DELETE /api/agents/:id` — delete agent

### Conversations
- `POST /api/conversations` — create
- `GET /api/conversations` — list (user-scoped)
- `GET /api/conversations/:id` — detail + messages
- `GET /api/workspaces/:id/conversations` — list by workspace
- `GET /api/projects/:id/conversations` — list by project

### Chat
- `POST /api/chat/send` — send message, returns `runId`
- `GET /api/chat/stream/:runId` — SSE stream for agent responses

### Referral Codes
- `POST /api/referral-codes` — create code
- `GET /api/referral-codes` — list (admin)
- `POST /api/referral-codes/:code/redeem` — redeem

### Admin Email (operational)
- `POST /api/admin/email/send` — send custom email via Resend (auth: `X-Service-Key` header, same secret used by godinez-ai → Studio service-to-service calls)

```bash
curl -X POST https://dev-api.godinez.ai/api/admin/email/send \
  -H "Content-Type: application/json" \
  -H "X-Service-Key: $STUDIO_SERVICE_KEY" \
  -d '{
    "to": "user@example.com",
    "subject": "Asunto custom",
    "html": "<p>Hola...</p>",
    "text": "Hola...",
    "from": "Godínez.AI <invitaciones@godinez.ai>"
  }'
# → { "success": true, "id": "..." }
```

### Webhooks
- `POST /webhooks/clerk` — Clerk webhook handler (user.created, user.updated)

## Chat Architecture

1. Client sends message via `POST /api/chat/send` → gets `{ runId, conversationId }`
2. Client opens SSE connection to `GET /api/chat/stream/:runId`
3. API relays to OpenClaw Gateway (WebSocket JSON-RPC 2.0, Ed25519 challenge-response auth) or falls back to stub agent
4. Events streamed: `delta` (text chunks), `final` (complete response), `error`
5. Per-conversation OpenClaw sessions (`agent:X:conv-{conversationId}`) — each conversation triggers boot-md to re-read workspace files
6. Config changes require "Reiniciar sesion" (creates new conversation) to take effect

### Agents

Agents are provisioned from OpenClaw — each user names and configures their own agent during onboarding. No hardcoded seed agents. Agent config (personality, needs, custom instructions) stored in `agents.config` JSONB column and synced to SOUL.md on the OpenClaw workspace.
