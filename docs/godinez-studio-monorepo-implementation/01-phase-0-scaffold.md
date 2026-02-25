# Phase 0: Monorepo Scaffold

**Effort:** 0.5 days
**Dependencies:** None
**Deliverable:** Empty monorepo with build/dev tooling working

---

## Tickets

### P0-01: Initialize monorepo root

Create root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`.

**Files to create:**

```
godinez-studio/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
└── README.md
```

**`pnpm-workspace.yaml`:**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**`turbo.json`:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "db:push": {
      "cache": false
    },
    "db:studio": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Root `package.json`:**
```json
{
  "name": "godinez-studio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "dev:api": "pnpm --filter @godinez/api dev",
    "dev:web": "pnpm --filter @godinez/web dev",
    "build": "turbo run build",
    "typecheck": "turbo run typecheck",
    "db:push": "pnpm --filter @godinez/api db:push",
    "db:studio": "pnpm --filter @godinez/api db:studio",
    "db:generate": "pnpm --filter @godinez/api db:generate"
  },
  "packageManager": "pnpm@9.15.0",
  "devDependencies": {
    "turbo": "^2.4.0"
  }
}
```

**Acceptance:**
- `pnpm install` succeeds
- `turbo run build` succeeds (no apps yet, no-op)

---

### P0-02: Scaffold `apps/api` (Hono backend)

Create the Hono API server skeleton following regen-garden patterns.

**Files:**
```
apps/api/
├── src/
│   ├── index.ts              # Hono app entry + route registration
│   ├── routes/
│   │   └── health.ts         # GET /health
│   └── lib/
│       └── env.ts            # Typed env helper
├── package.json
├── tsconfig.json
└── .env.example
```

**`apps/api/package.json`:**
```json
{
  "name": "@godinez/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "bun run --hot src/index.ts",
    "start": "bun run src/index.ts",
    "build": "bun build src/index.ts --outdir dist --target bun",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.0",
    "@clerk/backend": "^1.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.7.0",
    "bun-types": "latest"
  }
}
```

**`src/index.ts`:**
```typescript
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import health from './routes/health'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())

app.route('/health', health)

app.get('/', (c) => c.json({
  name: 'godinez-studio',
  status: 'running',
  version: '0.1.0'
}))

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch
}
```

**Acceptance:**
- `bun run dev` starts server on :3001
- `curl localhost:3001/health` returns `{ "status": "ok" }`
- `bun run typecheck` passes

---

### P0-03: Scaffold `apps/web` (Vite + React)

Create the frontend SPA skeleton.

```bash
cd apps/
bun create vite web --template react-ts
cd web
bun add react-router-dom @tanstack/react-query @clerk/clerk-react
bun add -d tailwindcss @tailwindcss/vite
```

**Files:**
```
apps/web/
├── src/
│   ├── main.tsx              # React root + providers
│   ├── App.tsx               # Router setup
│   ├── index.css             # Tailwind + brand tokens
│   ├── lib/
│   │   └── api.ts            # HTTP client (fetch wrapper)
│   └── pages/
│       └── Landing.tsx       # Placeholder page
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json
└── package.json
```

**`vite.config.ts`:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': '/src' }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

**Acceptance:**
- `bun run dev` starts Vite on :5173
- Landing page renders
- Tailwind classes apply
- `bun run build` produces dist/

---

### P0-04: Create `packages/db` (shared schema)

Shared Drizzle schema package, imported by `@godinez/api`.

**Files:**
```
packages/db/
├── src/
│   ├── index.ts              # DB client + export schema
│   └── schema/
│       └── index.ts          # Barrel export (empty for now)
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

**`packages/db/package.json`:**
```json
{
  "name": "@godinez/db",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.38.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.7.0"
  }
}
```

**Acceptance:**
- `pnpm --filter @godinez/db typecheck` passes
- `@godinez/api` can `import * as schema from '@godinez/db'`

---

### P0-05: Create `packages/types` (shared types)

Shared TypeScript types used by both web and api.

**Files:**
```
packages/types/
├── src/
│   └── index.ts              # API contract types
├── package.json
└── tsconfig.json
```

Contains API request/response types, domain enums, content string types. Both `@godinez/api` and `@godinez/web` import from here.

**Acceptance:**
- Both apps can import types from `@godinez/types`

---

### P0-06: Verify full monorepo build

Run full pipeline to confirm everything wires together.

```bash
pnpm install
turbo run build
turbo run typecheck
```

**Acceptance:**
- All packages resolve
- Build produces `dist/` in both apps
- TypeScript compiles without errors
- Root `pnpm dev` starts both apps concurrently
