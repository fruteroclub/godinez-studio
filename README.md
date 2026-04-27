# Godinez Studio

AI workspace SPA for Latin American SMBs. Manage projects, tasks, files, and chat with AI agents — all in Spanish.

**Stack:** Turborepo + pnpm, Hono API (Node.js), Vite + React 19, Drizzle ORM, PostgreSQL, Clerk auth, Tailwind CSS 4

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       godinez-studio                        │
│                     (Turborepo + pnpm)                      │
├──────────────────────────┬──────────────────────────────────┤
│                          │                                  │
│  apps/api                │  apps/web                        │
│  Hono + Node.js (:3001)  │  Vite + React 19 SPA (:5173)    │
│  Railway (Railpack)      │  Railway (static)                │
│                          │                                  │
│  ┌───────────┐           │  ┌──────────────┐                │
│  │ Routes    │           │  │ React Router │                │
│  │ DAL       │           │  │ TanStack Q.  │                │
│  │ Services  │           │  │ Clerk React  │                │
│  │ Middleware│           │  │ shadcn/ui    │                │
│  └─────┬─────┘           │  └──────┬───────┘                │
│        │                 │         │                        │
├────────┼─────────────────┼─────────┼────────────────────────┤
│        │     packages/db │         │  packages/types        │
│        │   Drizzle ORM   │         │  Enums, contracts,     │
│        │   13 tables     │         │  content strings       │
│        │                 │         │                        │
└────────┼─────────────────┴─────────┼────────────────────────┘
         │                           │
    ┌────▼────┐  ┌──────────┐  ┌────▼────┐  ┌───────────┐
    │ Postgres│  │ Clerk    │  │ OpenClaw│  │ Cloudflare│
    │ (DB)    │  │ (Auth)   │  │ Gateway │  │ R2 (Files)│
    └─────────┘  └──────────┘  └─────────┘  └───────────┘
```

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit both .env files with your credentials (see Environment Variables below)

# 3. Push database schema
pnpm db:push

# 4. Start development servers (separate terminals)
pnpm dev:api    # API on http://localhost:3001
pnpm dev:web    # SPA on http://localhost:5173
```

## Project Structure

```
godinez-studio/
├── apps/
│   ├── api/                   @godinez/api — Hono server (Node.js)
│   │   ├── src/
│   │   │   ├── index.ts       Main entry, route mounting
│   │   │   ├── routes/        Hono routers (workspaces, projects, tasks, files, agents, chat, etc.)
│   │   │   ├── dal/           Data access layer (Drizzle queries)
│   │   │   ├── services/      Business logic (gateway relay, storage, workspace sync, agent mapping)
│   │   │   ├── middleware/    Auth, workspace scoping, user resolution
│   │   │   ├── validators/   Zod schemas for request validation
│   │   │   └── lib/          Config, helpers
│   │   ├── drizzle.config.ts
│   │   └── railway.toml       Railway build watch patterns
│   └── web/                   @godinez/web — Vite + React SPA
│       ├── src/
│       │   ├── pages/         Route pages (Dashboard, Chat, Projects, Tasks, Files, Agents, Settings)
│       │   ├── components/    UI components (shadcn/ui + custom)
│       │   ├── hooks/         React Query hooks (use-workspaces, use-projects, use-chat, etc.)
│       │   ├── providers/     Context providers (Workspace, Auth)
│       │   ├── lib/           Utils, API client, content strings
│       │   └── index.css      Tailwind v4 theme + brand tokens
│       ├── public/            Static assets
│       └── railway.toml       Railway build watch patterns
├── packages/
│   ├── db/                    @godinez/db — Drizzle schema + createDb() factory
│   │   └── src/schema/        13 table definitions + relations
│   └── types/                 @godinez/types — Domain enums, API contracts, content strings
├── CLAUDE.md                  Agent/developer technical reference
├── turbo.json                 Turborepo pipeline config
├── pnpm-workspace.yaml        Workspace definition
└── package.json               Root scripts + packageManager enforcement
```

## Commands

| Command | Description |
|---|---|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev:api` | Start API dev server (bun --hot, :3001) |
| `pnpm dev:web` | Start Vite dev server (:5173) |
| `pnpm build` | Build all packages (Turbo) |
| `pnpm typecheck` | TypeScript check across all packages |
| `pnpm db:push` | Push Drizzle schema to database |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:studio` | Open Drizzle Studio GUI |

## Environment Variables

> **Warning:** Never use production/live credentials for local development. Each developer must create their own Clerk application and local PostgreSQL database.

### API (`apps/api/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk backend secret |
| `CLERK_WEBHOOK_SECRET` | No | Clerk webhook signing secret |
| `PORT` | No | API port (default: 3001) |
| `CORS_ORIGIN` | Yes | Allowed origins, comma-separated (fail-closed if unset) |
| `STRIPE_SECRET_KEY` | No | Stripe secret key for billing and AgentCamp checkout |
| `STRIPE_BILLING_WEBHOOK_SECRET` | No | Signing secret for `/api/billing/webhook` |
| `STRIPE_AGENTCAMP_WEBHOOK_SECRET` | No | Signing secret for `/api/agentcamp/stripe/webhook` |
| `STRIPE_WEBHOOK_SECRET` | No | Legacy fallback used only if the route-specific Stripe webhook secret is unset |
| `AGENTCAMP_COHORT` | No | AgentCamp cohort slug (default: `agentcamp_2026_q2`) |
| `AGENTCAMP_EARLY_BIRD_PRICE_ID` | No | Stripe price ID for early bird checkout |
| `AGENTCAMP_REGULAR_PRICE_ID` | No | Stripe price ID for regular checkout |
| `AGENTCAMP_EARLY_BIRD_CUTOFF_ISO` | No | ISO timestamp when pricing switches from early bird to regular |
| `AGENTCAMP_MAX_CAPACITY` | No | Max paid registrations before checkout returns `sold_out` |
| `AGENTCAMP_SALES_ENABLED` | No | Enables public AgentCamp checkout when set to `true` |
| `OPENCLAW_GATEWAY_URL` | No | OpenClaw Gateway WebSocket URL |
| `OPENCLAW_GATEWAY_TOKEN` | No | Gateway auth token |
| `AGENT_MAX_SLOTS` | No | Max agent slots per instance (default: 15) |
| `AGENT_WORKSPACE_BASE` | No | OpenClaw workspace base path |
| `API_BASE_URL` | No | Public API URL (for file URLs in responses) |
| `R2_BUCKET_NAME` | No | Cloudflare R2 bucket name |
| `R2_ACCOUNT_ID` | No | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | No | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret key |
| `R2_PUBLIC_URL` | No | R2 public CDN URL |
| `UPLOADS_DIR` | No | Local upload dir fallback (default: `./uploads`) |

### Web (`apps/web/.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk frontend publishable key |
| `VITE_API_URL` | No | API base URL (default: proxied via Vite in dev) |

### Local AgentCamp Checkout

To test the AgentCamp landing against a local API:

- set `CORS_ORIGIN=http://localhost:8080`
- add the `AGENTCAMP_*` env vars above in `apps/api/.env.local`
- point the landing app at `http://localhost:3001/api/agentcamp/checkout`

## Services & Live URLs

| Service | URL | Notes |
|---|---|---|
| Dev API | `https://dev-api.godinez.ai` | Railway (Railpack) |
| Dev Web | `https://dev-studio.godinez.ai` | Railway (static SPA) |
| File Storage CDN | `https://godinez-studio-files.godinez.ai` | Cloudflare R2 |
| Deploy Platform | [Railway](https://railway.com) | Each app = separate Railway service |

## Backlog & Project Board

Tracked on [GitHub Project #5 — Godinez Studio](https://github.com/orgs/fruteroclub/projects/5). Issues are grouped by **Epic**, prioritized with labels, and sized with story points.

### Epics

| Epic | Issues | Scope |
|---|---|---|
| **Beta Readiness** | GS-01 – GS-17 | Security, performance, UX, observability — everything needed for first beta users |
| **Admin Dashboard** | OPS-01 – OPS-04 | Admin role enforcement, analytics API, health endpoint, admin web page |
| **CI/CD & Automation** | OPS-05 – OPS-08 | Usage tracking, GitHub Actions CI, CLAUDE.md conventions |
| **Project Board Ops** | OPS-09 – OPS-12 | Issue/PR templates, project board custom fields, ticket migration |
| **Agent Workflow** | OPS-13 – OPS-16 | Auto-add to board, label-based agent workflow, activity dashboard integration |
| **Growth & Quotas** | OPS-17 – OPS-20 | Quota enforcement, alerting thresholds, waitlist pipeline, capacity planning |

### Priority Labels

| Label | Meaning |
|---|---|
| `P0` | Blocks beta launch |
| `P1` | Beta quality bar |
| `P2` | Stretch goal |

### Story Points

Fibonacci-lite scale: **1** (trivial) · **2** (small) · **3** (medium) · **5** (large) · **8** (epic-level)

### Agent Labels

| Label | Meaning |
|---|---|
| `agent-ok` | Safe for github-worker sub-agents to pick up |
| `agent-claimed` | Agent is working on this issue |
| `agent-done` | Agent completed, awaiting human review |

## Git Workflow

1. **Branch from `dev`** (never from `main`)
2. **Branch naming:** `fix/issue-{N}` for bug fixes, `feat/issue-{N}` for features
3. **Commits:** conventional prefixes (`feat`, `fix`, `chore`, `docs`, `refactor`, `style`, `test`), lowercase, max 60 chars, no co-signatures
4. **One focused commit per issue**
5. **Open PR against `dev`**, describe what changed and why
6. **Never force-push**, never commit directly to `dev` (except docs-only changes)

```bash
# Example workflow
git checkout dev && git pull
git checkout -b feat/issue-42
# ... make changes ...
pnpm build && pnpm typecheck
git add -A && git commit -m "feat: add widget to dashboard"
git push -u origin feat/issue-42
gh pr create --base dev
```
