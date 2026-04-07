# Godínez — Component Handoff Map

> **Objetivo:** Delegar ownership de cada componente a Brian (Product Lead) y Scarf (Tech Lead).
> Cada componente se explica en una sesión de 15 min (10 contenido + 5 Q&A).

---

## 🏗️ GODÍNEZ.AI (Landing Page)

Repo: [`fruteroclub/godinez-ai`](https://github.com/fruteroclub/godinez-ai)
Stack: Next.js, Convex (waitlist), Vercel

| # | Componente | Owner | tl;dr |
|---|-----------|-------|-------|
| 1 | **Landing & SEO** | Brian | Next.js landing, copy i18n (ES/EN), pricing, CTA → waitlist. Vercel deploy. |
| 2 | **Waitlist + Admin** | Brian | Formulario waitlist, API `/api/waitlist`, dashboard admin (`/admin`), invites con Resend emails. |
| 3 | **Legal Pages** | Brian | Términos y privacidad (ES/EN). Cumplimiento básico. |
| 4 | **Hosting & CI** | Scarf | Vercel org `fruteroclub`, env vars, dominio `godinez.ai`, deploy pipeline. |

---

## 🚀 GODÍNEZ STUDIO (SaaS)

Repo: [`fruteroclub/godinez-studio`](https://github.com/fruteroclub/godinez-studio)
Stack: Vite + React (web), Hono (api), Drizzle + Postgres, Railway

### Frontend (`apps/web`)

| # | Componente | Owner | tl;dr |
|---|-----------|-------|-------|
| 5 | **Auth & Onboarding** | Brian | Clerk sign-in/up, `OnboardingWizard` (8 outcomes), workspace selector. Primer smile del usuario. |
| 6 | **Dashboard & Activity** | Brian | Vista principal post-login, métricas de uso, feed de actividad. |
| 7 | **Chat & Conversaciones** | Brian | Interfaz conversacional, SSE streaming, action cards, conversation history. |
| 8 | **Agentes & Lab** | Brian | CRUD de agentes, configuración de soul templates, Lab preview. |
| 9 | **Proyectos, Tareas & Files** | Brian | Gestión de proyectos, kanban de tareas, file upload/CDN (R2). |
| 10 | **Team & Settings** | Brian | Invitar miembros, roles, configuración de workspace. |
| 11 | **Hackathon Mode** | Brian | Flujo guiado 9 fases, banners, progress tracking. |
| 12 | **Analytics (PostHog + Clarity)** | Scarf | Inicialización, eventos clave, heatmaps, session recordings. |

### Backend (`apps/api`)

| # | Componente | Owner | tl;dr |
|---|-----------|-------|-------|
| 13 | **API Core & Middleware** | Scarf | Hono server, auth middleware, rate limiting, error handler, request logger. |
| 14 | **Gateway Relay** | Scarf | WebSocket → OpenClaw Gateway, pool de conexiones, SSE al frontend. |
| 15 | **Agent Provisioning** | Scarf | `provision.ts` + `workspace-sync.ts` + `agent-mapping.ts`. Cómo se crea y conecta un agente. |
| 16 | **Storage (R2)** | Scarf | Cloudflare R2 para archivos, `r2-storage.ts`, CDN `godinez-studio-files.godinez.ai`. |
| 17 | **Alertas & Watchdog** | Scarf | `alerts.ts` + `watchdog.ts`. Monitoreo de salud, errores, quotas. |
| 18 | **Admin & Referral Codes** | Scarf | Rutas admin, gestión de referral codes, dashboard ops. |

### Infra & Shared

| # | Componente | Owner | tl;dr |
|---|-----------|-------|-------|
| 19 | **Database (Drizzle + Postgres)** | Scarf | 13 tablas, migrations, relaciones. Railway Postgres. |
| 20 | **Railway Deploy Pipeline** | Scarf | 2 servicios (api + web), `railway.toml`, auto-deploy desde `dev`, dominios custom. |
| 21 | **Monorepo & DX** | Scarf | Turborepo, pnpm workspaces, packages compartidos (`@godinez/db`, `@godinez/types`). |
| 22 | **Sentry / Error Monitoring** | Scarf | Integración en `sentry.ts`, configuración, alertas. |

---

## 📋 Plan de Arranque

### Semana 1 — Sesiones de contexto (4 días, ~3 sesiones/día)

| Día | Sesiones (15 min c/u) |
|-----|----------------------|
| Lun | #1 Landing, #2 Waitlist, #4 Hosting/CI |
| Mar | #5 Auth/Onboarding, #6 Dashboard, #7 Chat |
| Mié | #13 API Core, #14 Gateway Relay, #19 DB |
| Jue | #15 Provisioning, #20 Railway, #12 Analytics |

Resto de componentes (#3, #8, #9, #10, #11, #18, #21) en semana 2 o docs async.

### Semana 2 — Ownership activo

- Brian y Scarf toman decisiones en sus componentes
- K7 queda como escalation y review

### Entregable por sesión

Cada sesión produce un doc de 1 página con:
- Arquitectura del componente (diagrama simple)
- Env vars necesarias
- Comandos clave (dev, build, deploy)
- "Qué puede salir mal" (failure modes conocidos)

---

## Resumen de Ownership

| Área | Brian (Product) | Scarf (Tech) |
|------|----------------|--------------|
| **Landing** | Copy, UX, waitlist, legal | Hosting, CI, dominio |
| **Studio Frontend** | Todas las páginas y flujos UX | Analytics integration |
| **Studio Backend** | — | API, Gateway, provisioning, storage |
| **Infra** | — | DB, Railway, monorepo, monitoring |
| **Escalation** | K7 (producto) | K7 (arquitectura) |

---

*el viento no carga todo — reparte las semillas donde cada una crece mejor.*
