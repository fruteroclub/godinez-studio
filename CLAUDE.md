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

- `DATABASE_URL` — PostgreSQL connection string
- `CLERK_SECRET_KEY` — Clerk backend secret
- `PORT` — defaults to 3001

### `apps/web/.env`

- `VITE_API_URL` — API base URL
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk frontend key

## Git Commit Messages Rules

- Short (max 50-60 chars), descriptive, concise
- Lowercase preferred
- Conventional prefixes: `feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`
- No co-signatures or attributions
- Lowercase preferred, use uppercase for proper nouns and relevant acronyms

## Key Rules

1. **pnpm only** — enforced via `packageManager` field. Do NOT use npm/yarn/bun for package management.
2. **Tailwind CSS only** — no CSS modules, no styled-components.
3. **Content strings** in `packages/types/src/content.ts` — not hardcoded in components.
4. **TypeScript strict mode** everywhere.
5. **`@godinez/` scope** for all workspace packages.
6. **Hono routes** export a `new Hono()` instance, mounted via `app.route()` in `apps/api/src/index.ts`.

## Implementation Roadmap

Detailed phase specs in `docs/godinez-studio-monorepo-implementation/`:

- Phase 0: Monorepo scaffold (complete)
- Phase 1: Database schema (10 tables) + API foundation
- Phase 2: Clerk auth + workspace management
- Phase 3: Chat + OpenClaw Gateway Relay + SSE streaming
- Phase 4: Projects, tasks, files CRUD
- Phase 5: Frontend SPA pages
- Phase 6: Integration + deployment
