# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Godinez Studio — AI workspace SPA for Latin American SMBs. Separate product from the godinez-ai marketing site.

**Stack:** Turborepo + pnpm monorepo, Hono API (Node.js), Vite + React SPA, Drizzle ORM, PostgreSQL, Clerk auth, Tailwind CSS 4
**Deploy:** Railway (Railpack builder)
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
- `apps/web` (`@godinez/web`) — Vite + React SPA. Uses `@` path alias for `src/`. React Router, TanStack Query, Clerk React.
- `packages/db` (`@godinez/db`) — Drizzle schema + `createDb()` factory. Schema tables in `src/schema/`.
- `packages/types` (`@godinez/types`) — Domain enums, API contract types, shared content strings.

### Key Patterns

- **pnpm** is the package manager. **Node.js** is the production runtime. **Bun** for local API dev only (`bun --hot`).
- Workspace packages use `workspace:*` protocol for inter-package deps.
- Turbo handles build ordering — `typecheck` depends on `^build` so packages compile first.
- Vite proxies `/api` → `localhost:3001` in dev, so no CORS issues locally.
- All UI content strings live in `packages/types/src/content.ts` (i18n-ready, Spanish).

### Design System

Brand tokens defined in `apps/web/src/index.css` via Tailwind v4 `@theme inline`:

- **magenta** `#E91E8C` (primary), **violet** `#8B5CF6` (secondary), **gold** `#FFB800` (accent)
- **dark** `#0A0A0A` (bg), **charcoal** `#1A1A1A` (cards)
- shadcn/ui CSS variables (HSL) mapped to brand palette in `:root`
- Custom utilities: `.text-gradient-brand`, `.bg-gradient-brand`, `.glow-magenta`, `.border-gradient-brand`
- Fonts: Plus Jakarta Sans (body), Playfair Display (emphasis only)

## Environment Variables

### `apps/api/.env`

- `DATABASE_URL` — PostgreSQL connection string (required)
- `CLERK_SECRET_KEY` — Clerk backend secret
- `CLERK_WEBHOOK_SECRET` — Clerk webhook signing secret
- `PORT` — defaults to 3001
- `CORS_ORIGIN` — comma-separated allowed origins (defaults to `*`)
- `OPENCLAW_GATEWAY_URL` — WebSocket URL for OpenClaw Gateway (optional)
- `OPENCLAW_GATEWAY_TOKEN` — Gateway auth token (optional)

### `apps/web/.env`

- `VITE_API_URL` — API base URL
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk frontend key

## Git Conventions

- Branch from: `dev` (not main)
- Branch naming: `fix/issue-{N}` for bug fixes, `feat/issue-{N}` for features
- One focused commit per issue
- Short (max 50-60 chars), descriptive, concise commit messages
- Lowercase preferred, use uppercase for proper nouns and relevant acronyms
- Conventional prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`
- No co-signatures or attributions
- Never force-push, never commit to `dev` directly

## Key Rules

1. **pnpm only** — enforced via `packageManager` field. Do NOT use npm/yarn/bun for package management.
2. **Tailwind CSS only** — no CSS modules, no styled-components.
3. **Content strings** in `packages/types/src/content.ts` — not hardcoded in components.
4. **TypeScript strict mode** everywhere.
5. **`@godinez/` scope** for all workspace packages.
6. **Hono routes** export a `new Hono()` instance, mounted via `app.route()` in `apps/api/src/index.ts`.

### API Routes

All routes mounted in `apps/api/src/index.ts`:

- `GET /health` — health check
- `POST/GET/PUT/DELETE /api/workspaces` — workspace CRUD
- `POST/GET/DELETE /api/workspaces/:id/members` — team management
- `GET /api/workspaces/:id/dashboard` — aggregated stats
- `GET /api/workspaces/:id/activity` — agent logs
- `POST/GET /api/workspaces/:id/conversations` — conversations
- `POST/GET/PUT/DELETE /api/projects` — projects CRUD
- `POST/GET/PUT /api/tasks` — tasks CRUD with status transitions
- `POST/GET/DELETE /api/files` — file upload/management
- `GET /api/agents` — agent registry (read-only)
- `POST /api/chat/send` — send message, returns `runId`
- `GET /api/chat/stream/:runId` — SSE stream for agent responses
- `POST /webhooks/clerk` — Clerk webhook handler

### Chat Architecture

1. Client sends message via `POST /api/chat/send` → gets `runId`
2. Client opens SSE connection to `GET /api/chat/stream/:runId`
3. API relays to OpenClaw Gateway (WebSocket JSON-RPC 2.0) or falls back to stub agent
4. Events streamed: `delta` (text chunks), `done` (completion), `error`

### Agents

Agents are provisioned from OpenClaw — each user names and configures their own agent. There are no hardcoded seed agents.
