# Plan de Implementación: Onboarding Flow v2
## Godinez Studio — Actualizado con Arquitectura Existente
### Marzo 2026

---

## 📊 Análisis: Lo que YA EXISTE vs Lo que FALTA

### ✅ Ya Existe (NO tocar)

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| **Schema: workspaces** | `packages/db/src/schema/workspaces.ts` | name, slug, ownerId, agentId, status, agentSlot, instanceId |
| **Schema: agents** | `packages/db/src/schema/agents.ts` | name, template, config (personality, needs, userName), openclawId |
| **Schema: conversations** | `packages/db/src/schema/conversations.ts` | workspaceId, agentId, title, channel |
| **Schema: users** | `packages/db/src/schema/users.ts` | clerkId, email, name, role, jobRole, businessDescription |
| **API: provision** | `apps/api/src/routes/provision.ts` | Crea agente en OpenClaw, inyecta SOUL.md, crea conversation |
| **API: workspaces** | `apps/api/src/routes/workspaces.ts` | CRUD de workspaces |
| **API: chat** | `apps/api/src/routes/chat.ts` | SSE streaming, mensajes |
| **Service: gateway-pool** | `apps/api/src/services/gateway-pool.ts` | Manejo de instancias OpenClaw |
| **Service: agent-soul-template** | `apps/api/src/services/agent-soul-template.ts` | Genera SOUL.md con personalidad |
| **Hook: useProvision** | `apps/web/src/hooks/use-provision.ts` | Mutation para provisioning |
| **Page: OnboardingWizard** | `apps/web/src/pages/OnboardingWizard.tsx` | Wizard actual de 4 pasos |
| **Page: WorkspaceSelector** | `apps/web/src/pages/WorkspaceSelector.tsx` | Lista workspaces |
| **Types** | `packages/types/src/index.ts` | AgentConfig, Workspace, etc. |

### ❌ Falta (CREAR o MODIFICAR)

| Componente | Acción | Descripción |
|------------|--------|-------------|
| **workspaces.context** | AGREGAR columna | 'educacion' \| 'profesional' \| 'personal' |
| **workspaces.subContext** | AGREGAR columna | 'hackathon' \| 'bootcamp' \| etc. |
| **workspaces.nidiMode** | AGREGAR columna | 'guiado' \| 'libre' |
| **workspaces.currentPhase** | AGREGAR columna | 0-8 (tracking de progreso) |
| **Schema: wizard_data** | CREAR tabla | Datos específicos por contexto |
| **API: wizard routes** | CREAR | Endpoints para pasos del wizard |
| **agent-soul-template.ts** | MODIFICAR | Agregar secciones por contexto |
| **OnboardingWizard.tsx** | MODIFICAR | Agregar paso de contexto + NIDI |
| **Types** | MODIFICAR | Agregar nuevos tipos |

---

## 🔄 Cambios Requeridos

### 1. Migración de Base de Datos

**Archivo a crear:** `apps/api/drizzle/0001_add_onboarding_fields.sql`

```sql
-- Agregar campos de onboarding dinámico a workspaces
ALTER TABLE workspaces ADD COLUMN context VARCHAR(20);
ALTER TABLE workspaces ADD COLUMN sub_context VARCHAR(30);
ALTER TABLE workspaces ADD COLUMN nidi_mode VARCHAR(10) DEFAULT 'guiado';
ALTER TABLE workspaces ADD COLUMN current_phase INTEGER DEFAULT 0;

-- Crear tabla wizard_data para datos específicos por contexto
CREATE TABLE wizard_data (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Educación
  program_link TEXT,
  program_type VARCHAR(20),
  program_name VARCHAR(200),
  
  -- Profesional
  project_type VARCHAR(30),
  for_whom VARCHAR(20),
  deadline DATE,
  
  -- Personal
  personal_type VARCHAR(20),
  hackathon_link TEXT,
  hackathon_name VARCHAR(200),
  hackathon_deadline DATE,
  time_available VARCHAR(20),
  idea_description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_wizard_data_workspace ON wizard_data(workspace_id);
```

### 2. Modificar Schema (Drizzle)

**Archivo:** `packages/db/src/schema/workspaces.ts`

```typescript
// AGREGAR estas columnas al schema existente:
context: text("context"),           // 'educacion' | 'profesional' | 'personal'
subContext: text("sub_context"),    // 'hackathon' | 'bootcamp' | etc.
nidiMode: text("nidi_mode").default("guiado"), // 'guiado' | 'libre'
currentPhase: integer("current_phase").default(0),
```

**Archivo a crear:** `packages/db/src/schema/wizard-data.ts`

```typescript
import { pgTable, serial, integer, text, date, timestamp } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const wizardData = pgTable("wizard_data", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  
  // Educación
  programLink: text("program_link"),
  programType: text("program_type"),
  programName: text("program_name"),
  
  // Profesional
  projectType: text("project_type"),
  forWhom: text("for_whom"),
  deadline: date("deadline"),
  
  // Personal
  personalType: text("personal_type"),
  hackathonLink: text("hackathon_link"),
  hackathonName: text("hackathon_name"),
  hackathonDeadline: date("hackathon_deadline"),
  timeAvailable: text("time_available"),
  ideaDescription: text("idea_description"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

**Actualizar:** `packages/db/src/schema/index.ts`

```typescript
// Agregar:
export { wizardData } from "./wizard-data";
```

### 3. Modificar Types

**Archivo:** `packages/types/src/index.ts`

```typescript
// AGREGAR estos tipos:

export type OnboardingContext = "educacion" | "profesional" | "personal";

export type EducationSubContext = "bootcamp" | "curso" | "taller" | "libre";
export type ProfessionalSubContext = "contenido" | "visual" | "desarrollo" | "analisis" | "ventas";
export type PersonalSubContext = "hackathon" | "idea" | "wip" | "explorar";

export type NidiMode = "guiado" | "libre";

export interface WizardData {
  // Educación
  programLink?: string;
  programType?: EducationSubContext;
  programName?: string;
  
  // Profesional
  projectType?: ProfessionalSubContext;
  forWhom?: "mi_empresa" | "cliente" | "personal";
  deadline?: string;
  
  // Personal
  personalType?: PersonalSubContext;
  hackathonLink?: string;
  hackathonName?: string;
  hackathonDeadline?: string;
  timeAvailable?: "<24h" | "2-3dias" | "1semana+";
  ideaDescription?: string;
}

// MODIFICAR WorkspaceStatus:
export type WorkspaceStatus = "active" | "suspended" | "provisioning" | "wizard_incomplete";

// MODIFICAR Workspace interface:
export interface Workspace {
  // ... campos existentes ...
  context?: OnboardingContext;
  subContext?: string;
  nidiMode?: NidiMode;
  currentPhase?: number;
}
```

### 4. Modificar DAL

**Archivo:** `apps/api/src/dal/workspaces.ts`

```typescript
// AGREGAR función:
export async function updateWorkspaceOnboarding(
  id: number,
  data: {
    context?: string;
    subContext?: string;
    nidiMode?: string;
    currentPhase?: number;
  },
) {
  const [workspace] = await db
    .update(workspaces)
    .set(data)
    .where(eq(workspaces.id, id))
    .returning();
  return workspace;
}
```

**Archivo a crear:** `apps/api/src/dal/wizard-data.ts`

```typescript
import { eq } from "drizzle-orm";
import { wizardData } from "@godinez/db";
import { db } from "../db";

export async function getWizardData(workspaceId: number) {
  return db.query.wizardData.findFirst({
    where: eq(wizardData.workspaceId, workspaceId),
  });
}

export async function createWizardData(data: { workspaceId: number }) {
  const [record] = await db.insert(wizardData).values(data).returning();
  return record;
}

export async function updateWizardData(
  workspaceId: number,
  data: Partial<typeof wizardData.$inferInsert>,
) {
  const [record] = await db
    .update(wizardData)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(wizardData.workspaceId, workspaceId))
    .returning();
  return record;
}
```

### 5. Crear Route: Wizard

**Archivo a crear:** `apps/api/src/routes/wizard.ts`

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { getWorkspaceById, updateWorkspaceOnboarding, getMemberRole } from "../dal/workspaces";
import { getWizardData, createWizardData, updateWizardData } from "../dal/wizard-data";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// GET /api/wizard/:workspaceId — Obtener estado del wizard
app.get("/:workspaceId", async (c) => {
  const workspaceId = parseInt(c.req.param("workspaceId"));
  const userId = c.get("userId");
  
  const role = await getMemberRole(workspaceId, userId);
  if (!role) return c.json({ error: "Forbidden" }, 403);
  
  const workspace = await getWorkspaceById(workspaceId);
  const wizardData = await getWizardData(workspaceId);
  
  return c.json({ workspace, wizardData });
});

// PUT /api/wizard/:workspaceId/context — Guardar contexto (paso 1)
app.put(
  "/:workspaceId/context",
  zValidator("json", z.object({
    context: z.enum(["educacion", "profesional", "personal"]),
  })),
  async (c) => {
    const workspaceId = parseInt(c.req.param("workspaceId"));
    const { context } = c.req.valid("json");
    
    await updateWorkspaceOnboarding(workspaceId, { context });
    
    // Crear wizard_data si no existe
    const existing = await getWizardData(workspaceId);
    if (!existing) {
      await createWizardData({ workspaceId });
    }
    
    return c.json({ success: true });
  }
);

// PUT /api/wizard/:workspaceId/sub-context — Guardar sub-contexto (paso 2)
app.put(
  "/:workspaceId/sub-context",
  zValidator("json", z.object({
    subContext: z.string(),
    // Campos específicos por sub-contexto
    programType: z.string().optional(),
    projectType: z.string().optional(),
    personalType: z.string().optional(),
  })),
  async (c) => {
    const workspaceId = parseInt(c.req.param("workspaceId"));
    const data = c.req.valid("json");
    
    await updateWorkspaceOnboarding(workspaceId, { subContext: data.subContext });
    await updateWizardData(workspaceId, {
      programType: data.programType,
      projectType: data.projectType,
      personalType: data.personalType,
    });
    
    return c.json({ success: true });
  }
);

// PUT /api/wizard/:workspaceId/details — Guardar detalles específicos (paso 3)
app.put(
  "/:workspaceId/details",
  zValidator("json", z.object({
    // Educación
    programLink: z.string().optional(),
    programName: z.string().optional(),
    // Profesional
    forWhom: z.string().optional(),
    deadline: z.string().optional(),
    // Personal/Hackathon
    hackathonLink: z.string().optional(),
    hackathonName: z.string().optional(),
    hackathonDeadline: z.string().optional(),
    timeAvailable: z.string().optional(),
    ideaDescription: z.string().optional(),
  })),
  async (c) => {
    const workspaceId = parseInt(c.req.param("workspaceId"));
    const data = c.req.valid("json");
    
    await updateWizardData(workspaceId, data);
    
    return c.json({ success: true });
  }
);

// PUT /api/wizard/:workspaceId/nidi — Guardar modo NIDI (paso 5)
app.put(
  "/:workspaceId/nidi",
  zValidator("json", z.object({
    nidiMode: z.enum(["guiado", "libre"]),
  })),
  async (c) => {
    const workspaceId = parseInt(c.req.param("workspaceId"));
    const { nidiMode } = c.req.valid("json");
    
    await updateWorkspaceOnboarding(workspaceId, { nidiMode });
    
    return c.json({ success: true });
  }
);

export default app;
```

**Actualizar:** `apps/api/src/index.ts`

```typescript
// Agregar import:
import wizard from "./routes/wizard";

// Agregar route:
app.route("/api/wizard", wizard);
```

### 6. Modificar agent-soul-template.ts

**Archivo:** `apps/api/src/services/agent-soul-template.ts`

```typescript
// AGREGAR al interface de buildSoulMd:
interface BuildSoulMdContext {
  // ... campos existentes ...
  
  // Nuevos campos de contexto
  context?: string;        // educacion | profesional | personal
  subContext?: string;     // hackathon | bootcamp | etc.
  nidiMode?: string;       // guiado | libre
  
  // Datos específicos (de wizard_data)
  programName?: string;
  hackathonName?: string;
  hackathonDeadline?: string;
  timeAvailable?: string;
  ideaDescription?: string;
  forWhom?: string;
  deadline?: string;
}

// AGREGAR función para generar sección por contexto:
function buildContextSection(ctx: BuildSoulMdContext): string {
  if (!ctx.context) return "";
  
  switch (ctx.context) {
    case "educacion":
      return `
## Programa Educativo
- **Tipo:** ${ctx.subContext || "Por definir"}
- **Nombre:** ${ctx.programName || "Por definir"}

## Mi Rol como Mentor
Soy tu mentor. Te guío paso a paso, celebro avances, te desbloqueo.
No te dejo abandonar. Uso lenguaje simple, nunca jerga técnica.
Sigo el flujo de 8 fases de educación.
`;

    case "profesional":
      return `
## Proyecto
- **Tipo:** ${ctx.subContext || "Por definir"}
- **Para:** ${ctx.forWhom || "Por definir"}
- **Deadline:** ${ctx.deadline || "Sin fecha fija"}

## Mi Rol como Partner
Soy tu partner de ejecución. Priorizo velocidad con calidad.
Genero borradores rápidos para iterar. Respeto el deadline.
Sigo el flujo de 6 fases profesional.
`;

    case "personal":
      if (ctx.subContext === "hackathon") {
        return `
## Hackathon
- **Nombre:** ${ctx.hackathonName || "Por definir"}
- **Deadline:** ${ctx.hackathonDeadline || "Por definir"}
- **Tiempo disponible:** ${ctx.timeAvailable || "Por definir"}

## Mi Rol como Co-Founder
Soy tu co-founder temporal. MVP > perfección.
Track > generalidad. Siempre pienso en el submit final.
Sigo el flujo de 9 fases de hackathon.
`;
      }
      return `
## Proyecto Personal
- **Tipo:** ${ctx.subContext || "Por definir"}
- **Idea:** ${ctx.ideaDescription || "Por explorar"}

## Mi Rol
Te ayudo a convertir tu idea en realidad.
Vamos paso a paso, sin prisa pero sin pausa.
`;

    default:
      return "";
  }
}

// AGREGAR sección de modo NIDI:
function buildNidiSection(nidiMode?: string): string {
  if (nidiMode === "libre") {
    return `
## Modo Libre (Activo)
- Respondo cuando me preguntan, no interrumpo
- El usuario puede saltar fases
- Solo alerto en deadlines críticos (<48h)
- Muestro progreso bajo demanda
`;
  }
  
  return `
## Modo Guiado (Activo)
- Siempre sugiero el siguiente paso
- Celebro cada checkpoint completado
- Muestro progreso visual
- No permito saltar fases sin completar checkpoints
- Envío recordatorios de deadline proactivamente
`;
}

// MODIFICAR buildSoulMd para incluir nuevas secciones:
export function buildSoulMd(ctx: BuildSoulMdContext): string {
  // ... código existente ...
  
  const contextSection = buildContextSection(ctx);
  const nidiSection = buildNidiSection(ctx.nidiMode);
  
  // Insertar las nuevas secciones en el template
  return `# SOUL.md — ${ctx.agentName}
${/* ... resto del template existente ... */}
${contextSection}
${nidiSection}
${/* ... resto del template ... */}`;
}
```

### 7. Modificar provision.ts

**Archivo:** `apps/api/src/routes/provision.ts`

```typescript
// AGREGAR al schema de validación:
const provisionSchema = z.object({
  workspaceId: z.number(),
  userName: z.string().optional(),
  agentName: z.string().min(1).max(50).optional(),
  personality: z.enum(["professional", "friendly", "creative", "technical"]).optional(),
  needs: z.array(z.string()).optional(),
  userRole: z.string().max(50).optional(),
  businessDescription: z.string().max(255).optional(),
  // NUEVOS campos:
  context: z.string().optional(),
  subContext: z.string().optional(),
  nidiMode: z.enum(["guiado", "libre"]).optional(),
});

// MODIFICAR la llamada a buildSoulMd:
const soulMd = buildSoulMd({
  workspaceName: workspace.name,
  agentName: resolvedAgentName,
  agentSlot: slotName,
  userName,
  userRole,
  businessDescription,
  personality,
  needs,
  // NUEVOS campos:
  context: workspace.context,
  subContext: workspace.subContext,
  nidiMode: workspace.nidiMode,
  // Datos de wizard_data (obtener previamente)
  programName: wizardData?.programName,
  hackathonName: wizardData?.hackathonName,
  hackathonDeadline: wizardData?.hackathonDeadline,
  timeAvailable: wizardData?.timeAvailable,
  ideaDescription: wizardData?.ideaDescription,
  forWhom: wizardData?.forWhom,
  deadline: wizardData?.deadline,
});
```

### 8. Modificar OnboardingWizard.tsx

**El wizard actual tiene 4 pasos. Necesitamos expandirlo a 6:**

| Paso | Actual | Nuevo |
|------|--------|-------|
| 1 | Workspace + User + Role + Business | **Contexto** (Edu/Pro/Personal) |
| 2 | Needs | **Sub-contexto** (dinámico) |
| 3 | Agent name + Personality | **Preguntas específicas** (dinámico) |
| 4 | Review + Launch | Workspace + User + Role + Business (moved) |
| - | - | Agent name + Personality + **NIDI** |
| - | - | Review + Launch |

**Modificaciones principales:**

```tsx
// Nuevos estados:
const [context, setContext] = useState<string>("");
const [subContext, setSubContext] = useState<string>("");
const [nidiMode, setNidiMode] = useState<string>("guiado");

// Nuevo componente StepContext (paso 1):
function StepContext({ context, setContext }) {
  const options = [
    { id: "educacion", emoji: "📚", label: "Educación", desc: "Bootcamp, curso, taller" },
    { id: "profesional", emoji: "💼", label: "Profesional", desc: "Proyecto de trabajo" },
    { id: "personal", emoji: "🚀", label: "Personal", desc: "Hackathon, emprendimiento" },
  ];
  // ... render cards
}

// Nuevo componente StepSubContext (paso 2, dinámico):
function StepSubContext({ context, subContext, setSubContext }) {
  const options = {
    educacion: [
      { id: "bootcamp", label: "Bootcamp" },
      { id: "curso", label: "Curso" },
      { id: "taller", label: "Taller" },
      { id: "libre", label: "Aprendizaje libre" },
    ],
    profesional: [
      { id: "contenido", label: "Contenido" },
      { id: "visual", label: "Visual/Diseño" },
      { id: "desarrollo", label: "Desarrollo" },
      { id: "analisis", label: "Análisis" },
      { id: "ventas", label: "Ventas" },
    ],
    personal: [
      { id: "hackathon", label: "Hackathon" },
      { id: "idea", label: "Tengo una idea" },
      { id: "wip", label: "Ya empecé algo" },
      { id: "explorar", label: "Quiero explorar" },
    ],
  };
  // ... render options[context]
}

// Agregar NIDI al paso del agente:
function StepAgent({ ..., nidiMode, setNidiMode }) {
  // ... código existente de agentName y personality ...
  
  // Agregar selector de modo:
  <div>
    <label>Modo de acompañamiento</label>
    <div className="grid grid-cols-2 gap-2">
      <button onClick={() => setNidiMode("guiado")} className={...}>
        🎯 Guiado
        <span>Te llevo paso a paso</span>
      </button>
      <button onClick={() => setNidiMode("libre")} className={...}>
        🔓 Libre
        <span>Tú llevas el ritmo</span>
      </button>
    </div>
  </div>
}
```

---

## 📋 Checklist de Implementación

### Semana 1: Base de Datos + Types

- [ ] Crear migración SQL `0001_add_onboarding_fields.sql`
- [ ] Modificar `packages/db/src/schema/workspaces.ts` (4 columnas)
- [ ] Crear `packages/db/src/schema/wizard-data.ts`
- [ ] Actualizar `packages/db/src/schema/index.ts`
- [ ] Actualizar `packages/db/src/schema/relations.ts`
- [ ] Modificar `packages/types/src/index.ts` (nuevos tipos)
- [ ] Ejecutar `pnpm drizzle-kit generate && pnpm drizzle-kit push`

### Semana 2: Backend APIs

- [ ] Crear `apps/api/src/dal/wizard-data.ts`
- [ ] Modificar `apps/api/src/dal/workspaces.ts` (función updateWorkspaceOnboarding)
- [ ] Crear `apps/api/src/routes/wizard.ts`
- [ ] Actualizar `apps/api/src/index.ts` (agregar route)
- [ ] Modificar `apps/api/src/services/agent-soul-template.ts`
- [ ] Modificar `apps/api/src/routes/provision.ts`

### Semana 3: Frontend Wizard

- [ ] Crear hook `apps/web/src/hooks/use-wizard.ts`
- [ ] Modificar `apps/web/src/pages/OnboardingWizard.tsx`:
  - [ ] Agregar StepContext
  - [ ] Agregar StepSubContext
  - [ ] Agregar StepDetails (dinámico por contexto)
  - [ ] Modificar StepAgent (agregar NIDI)
  - [ ] Actualizar flujo de pasos
- [ ] Agregar strings a `apps/web/src/lib/content.ts`

### Semana 4: Testing + Polish

- [ ] Test E2E: Flujo educación → bootcamp
- [ ] Test E2E: Flujo personal → hackathon
- [ ] Test E2E: Flujo profesional → desarrollo
- [ ] Verificar SOUL.md generado incluye contexto
- [ ] Verificar modo guiado vs libre funciona

---

## 🔀 Diagrama de Flujo de Datos

```
Usuario llega a /studio/new
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  OnboardingWizard.tsx (6 pasos)                             │
│                                                              │
│  Paso 1: Contexto ──────► PUT /api/wizard/:id/context       │
│  Paso 2: Sub-contexto ──► PUT /api/wizard/:id/sub-context   │
│  Paso 3: Detalles ──────► PUT /api/wizard/:id/details       │
│  Paso 4: User + Business (ya existente)                     │
│  Paso 5: Agent + NIDI ──► PUT /api/wizard/:id/nidi          │
│  Paso 6: Review + Launch                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼ handleLaunch()
┌─────────────────────────────────────────────────────────────┐
│  1. createWorkspace() ─► POST /api/workspaces               │
│  2. provision() ───────► POST /api/agents/provision         │
│     │                                                        │
│     ├─► gateway-pool.ts → Selecciona instancia              │
│     ├─► agents.create en OpenClaw                           │
│     ├─► buildSoulMd() ← Incluye context, nidi, wizard_data  │
│     └─► agents.files.set SOUL.md                            │
│                                                              │
│  3. createConversation() ─► Onboarding conversation         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
   /studio/:slug/chat/:conversationId
         │
         ▼
   Agente con SOUL.md personalizado por contexto
```

---

## 📁 Archivos a Modificar/Crear (Resumen)

### CREAR (5 archivos)

| Archivo | Descripción |
|---------|-------------|
| `apps/api/drizzle/0001_add_onboarding_fields.sql` | Migración BD |
| `packages/db/src/schema/wizard-data.ts` | Schema wizard_data |
| `apps/api/src/dal/wizard-data.ts` | DAL para wizard_data |
| `apps/api/src/routes/wizard.ts` | API endpoints wizard |
| `apps/web/src/hooks/use-wizard.ts` | Hook para wizard API |

### MODIFICAR (8 archivos)

| Archivo | Cambio |
|---------|--------|
| `packages/db/src/schema/workspaces.ts` | +4 columnas |
| `packages/db/src/schema/index.ts` | +export wizardData |
| `packages/db/src/schema/relations.ts` | +relación workspace→wizardData |
| `packages/types/src/index.ts` | +tipos de onboarding |
| `apps/api/src/dal/workspaces.ts` | +función updateWorkspaceOnboarding |
| `apps/api/src/index.ts` | +route wizard |
| `apps/api/src/services/agent-soul-template.ts` | +secciones contexto/nidi |
| `apps/api/src/routes/provision.ts` | +campos en buildSoulMd |
| `apps/web/src/pages/OnboardingWizard.tsx` | +pasos contexto/nidi |
| `apps/web/src/lib/content.ts` | +strings nuevos pasos |

---

## ⚠️ Notas Importantes

1. **NO tocar** gateway-pool.ts, gateway-relay.ts — funcionan perfecto
2. **NO tocar** chat.ts — ya maneja SSE correctamente
3. **NO crear** nuevas tablas para conversations/messages — ya existen
4. **REUSAR** el hook useProvision existente
5. **REUSAR** el sistema de slots (godin-slot-1 a 15)

---

*Documento actualizado: 2026-03-06*
*Basado en análisis de godinez-studio rama dev (commit f84e7ec)*
