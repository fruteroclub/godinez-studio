# Godínez Studio — Monorepo Implementation Plan

## Context

Godínez.AI currently has:
- **godinez-ai** (Next.js): Marketing site + waitlist (Convex) + Studio prototype (Clerk + Neon Postgres + Drizzle)
- **OpenClaw agents**: Managed by Frutero, running on EC2 via OpenClaw Gateway

The Studio prototype in godinez-ai proved the domain model but hit architectural limits:
- Server Actions don't support streaming agent responses
- React Query 1s polling is a workaround for real-time
- Next.js serverless functions have cold starts and timeouts (bad for long agent conversations)
- No WebSocket/SSE support for agent integration

**Decision:** Split Studio into a separate monorepo (`godinez-studio`) with:
- **Vite + React SPA** (frontend) — lightweight, no SSR overhead
- **Hono + Drizzle + PostgreSQL** (backend) — persistent server, native WS/SSE
- **OpenClaw Gateway Relay** — WebSocket to agent, SSE to frontend

**godinez-ai stays** as the marketing site with Convex waitlist. Studio lives at a separate domain/subdomain.

## Reference Implementation

Architecture and patterns adapted from **regen-garden** (`/Users/mel/code/regen/regen-garden`, dev branch):
- Turborepo + pnpm monorepo
- Hono backend on Railway with Drizzle + PostgreSQL
- OpenClaw Gateway Relay (WS) → SSE streaming to frontend
- Multi-agent slot mapping per workspace
- Documented in `regen-garden/docs/user-workspaces/`

## What Carries Over from godinez-ai

| Asset | Status | Notes |
|-------|--------|-------|
| Drizzle schema (11 tables) | Adapt | UUIDs → serial IDs, add agentSlot, adjust for Hono patterns |
| Domain model | Keep | Workspaces, projects, tasks, files, conversations, messages |
| Content strings | Keep | `content.ts` with all Spanish UI text |
| Brand/design system | Keep | Magenta/violet/gold palette, Plus Jakarta Sans, dark theme |
| Component patterns | Rewrite | Same UX, new React SPA components (no Server Components) |
| Auth | Replace | Clerk → Clerk (but via JWT middleware on Hono, not Next.js middleware) |
| File storage | Keep | Vercel Blob or migrate to S3/R2 |
| DAL queries | Adapt | Same query patterns, new Drizzle instance |

## What's New

| Feature | Description |
|---------|-------------|
| **OpenClaw Gateway Relay** | WebSocket client managing agent connections, session keys, streaming |
| **SSE chat streaming** | Real-time token-by-token agent responses to frontend |
| **Agent slot mapping** | `workspaceId → agentSlot → sessionKey` routing |
| **Workspace isolation** | Each workspace maps to an isolated OpenClaw agent directory |
| **React SPA routing** | react-router-dom instead of Next.js App Router |
| **Hono middleware auth** | JWT verification middleware instead of Clerk Next.js middleware |

## Monorepo Structure

```
godinez-studio/
├── apps/
│   ├── web/                  @godinez/web (Vite + React SPA)
│   └── api/                  @godinez/api (Hono REST + WS/SSE)
├── packages/
│   ├── db/                   @godinez/db (shared Drizzle schema)
│   ├── types/                @godinez/types (shared TypeScript types)
│   └── config/               @godinez/config (shared constants, content strings)
├── docs/
│   └── godinez-studio-monorepo-implementation/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── .gitignore
└── README.md
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Monorepo** | Turborepo + pnpm | Proven pattern from regen-garden |
| **Runtime** | Bun | Fast, used across Frutero projects |
| **Frontend** | Vite + React + TypeScript | SPA, no SSR complexity, fast HMR |
| **Styling** | Tailwind CSS 4 | Consistent with godinez-ai |
| **Routing** | react-router-dom | Client-side SPA routing |
| **State** | TanStack React Query | Caching, polling, mutations |
| **Backend** | Hono | Lightweight, WS/SSE native, runs on Bun |
| **ORM** | Drizzle | Type-safe, shared schema package |
| **Database** | PostgreSQL (Neon or Railway) | Existing Neon instance or new Railway |
| **Auth** | Clerk | Existing accounts, JWT verification on Hono |
| **Real-time** | WebSocket (Gateway) + SSE (frontend) | Agent streaming |
| **Files** | Vercel Blob or Cloudflare R2 | CDN file storage |
| **Deploy (API)** | Railway | Persistent server for WS connections |
| **Deploy (Web)** | Cloudflare Pages or Vercel | Static SPA hosting |

## Implementation Phases

| Phase | What | Estimated Effort | Dependencies |
|-------|------|-----------------|--------------|
| **0** | Monorepo scaffold + shared packages | 0.5 days | None |
| **1** | Database schema + API foundation | 1.5 days | Phase 0 |
| **2** | Auth + workspace management | 1 day | Phase 1 |
| **3** | Chat + OpenClaw Gateway Relay + SSE | 2 days | Phase 2 |
| **4** | Projects, tasks, files | 1.5 days | Phase 2 |
| **5** | Frontend SPA | 2 days | Phase 1 (API contract) |
| **6** | Integration + polish | 1 day | Phase 3 + 5 |

Phases 3-4 (backend) and Phase 5 (frontend) can run **in parallel** once the API contract is defined in Phase 1.

**Total: ~9.5 days** (sequential) or **~7 days** (parallel backend + frontend)

## Detailed Phase Docs

- [Phase 0: Monorepo Scaffold](./01-phase-0-scaffold.md)
- [Phase 1: Database + API Foundation](./02-phase-1-database-api.md)
- [Phase 2: Auth + Workspaces](./03-phase-2-auth-workspaces.md)
- [Phase 3: Chat + Gateway Relay + SSE](./04-phase-3-chat-gateway.md)
- [Phase 4: Projects, Tasks, Files](./05-phase-4-projects-tasks-files.md)
- [Phase 5: Frontend SPA](./06-phase-5-frontend.md)
- [Phase 6: Integration + Polish](./07-phase-6-integration.md)

## Environment Variables

### API (`apps/api/.env`)
```env
# Database
DATABASE_URL=postgresql://...

# Auth (Clerk)
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# OpenClaw Gateway
OPENCLAW_GATEWAY_URL=ws://100.x.x.x:18789
OPENCLAW_GATEWAY_TOKEN=...

# File Storage
BLOB_READ_WRITE_TOKEN=...

# Server
PORT=3001
```

### Web (`apps/web/.env`)
```env
VITE_API_URL=http://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
```

## Key Decisions

1. **Clerk over Dynamic Labs**: godinez-ai already has Clerk accounts and webhook infrastructure. Reuse rather than migrate.
2. **Serial IDs**: Follow regen-garden convention (simpler, better for Postgres). UUIDs only where needed externally.
3. **Shared `@godinez/db` package**: Schema lives in one place, imported by API. Frontend never touches DB directly.
4. **SSE not WebSocket to frontend**: Simpler client implementation (EventSource), firewall-friendly, sufficient for chat streaming. WebSocket only between API and OpenClaw Gateway.
5. **Railway for API**: Persistent process needed for WebSocket connection to Gateway. Serverless won't work.
6. **Separate repo from godinez-ai**: Clean separation. Marketing site stays on Vercel with Convex. Studio is a different product with different deployment needs.
