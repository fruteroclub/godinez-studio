# Godinez Studio

AI workspace for Latin American SMBs. Manage projects, tasks, files, and chat with AI agents.

## Stack

- **Monorepo:** Turborepo + pnpm
- **API:** Hono + Node.js (port 3001)
- **Web:** Vite + React 19 SPA
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Clerk
- **Styling:** Tailwind CSS 4

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit both .env files with your credentials

# 3. Push database schema
pnpm db:push

# 4. Seed agents
pnpm db:seed

# 5. Start development servers (separate terminals)
pnpm dev:api    # API on http://localhost:3001
pnpm dev:web    # SPA on http://localhost:5173
```

## Project Structure

```
apps/
  api/          Hono API server (@godinez/api)
  web/          Vite + React SPA (@godinez/web)
packages/
  db/           Drizzle schema + DB factory (@godinez/db)
  types/        Shared types + content strings (@godinez/types)
```

## Commands

| Command | Description |
|---|---|
| `pnpm dev:api` | Start API dev server (bun --hot) |
| `pnpm dev:web` | Start Vite dev server |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | TypeScript check all packages |
| `pnpm db:push` | Push schema to database |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed core agents |

## Environment Variables

### API (`apps/api/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret |
| `CLERK_WEBHOOK_SECRET` | No | Clerk webhook signing secret |
| `PORT` | No | API port (default: 3001) |
| `CORS_ORIGIN` | No | Allowed origins, comma-separated |
| `OPENCLAW_GATEWAY_URL` | No | OpenClaw Gateway WebSocket URL |
| `OPENCLAW_GATEWAY_TOKEN` | No | Gateway auth token |

### Web (`apps/web/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend key |
| `VITE_API_URL` | No | API base URL |

## Deployment

API deploys to Railway with Railpack builder. Configuration in `railway.json`.

Web builds as a static SPA (`apps/web/dist/`) deployable to any static host (Vercel, Cloudflare Pages, etc.). SPA routing handled via `_redirects`.
