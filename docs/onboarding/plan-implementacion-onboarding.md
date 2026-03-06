# Plan de Implementación: Onboarding Flow
## Godinez Studio — Paso a Paso
### Marzo 2026

---

## 🎯 Objetivo

Implementar el flujo completo de `onboarding-flow-integrado.md`:
- Wizard de 5 pasos
- Provisioning de agentes via OpenClaw
- Chat con contexto dinámico
- Dashboard "Mi Proyecto"

---

## Fase 0: Prerrequisitos (Ya tienes)

```
✅ godinez-ai (Landing + Waitlist) — Convex
✅ godinez-studio (Workspace SPA) — Hono + Vite + Drizzle
✅ Clerk Auth configurado
✅ OpenClaw Gateway (AWS) para sub-agentes
```

---

## Fase 1: Base de Datos (Drizzle)

### Archivos a crear/modificar

```
godinez-studio/
├── src/db/
│   └── schema/
│       ├── users.ts         # Ya existe (Clerk sync)
│       ├── workspaces.ts    # CREAR
│       ├── wizard-data.ts   # CREAR (respuestas del wizard)
│       ├── agents.ts        # CREAR (relación con OpenClaw)
│       └── conversations.ts # CREAR
```

### Schema: workspaces.ts

```typescript
import { pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').references(() => users.id).notNull(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  
  // Wizard responses
  context: text('context'),        // 'educacion' | 'profesional' | 'personal'
  subContext: text('sub_context'), // 'hackathon' | 'bootcamp' | etc.
  
  // Agent config
  agentName: text('agent_name'),
  agentPersonality: text('agent_personality'), // 'profesional' | 'amigable' | 'creativo' | 'tecnico'
  nidiMode: text('nidi_mode').default('guiado'), // 'guiado' | 'libre'
  
  // Status
  status: text('status').default('wizard_incomplete'),
  // wizard_incomplete | provisioning | active | paused | completed | abandoned
  currentPhase: integer('current_phase').default(0),
  
  // OpenClaw integration
  openclawAgentId: text('openclaw_agent_id'),
  openclawLabel: text('openclaw_label'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  completedAt: timestamp('completed_at'),
  lastActivityAt: timestamp('last_activity_at').defaultNow(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
```

### Schema: wizard-data.ts

```typescript
import { pgTable, uuid, text, date, timestamp } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const wizardData = pgTable('wizard_data', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  // === EDUCACIÓN ===
  programLink: text('program_link'),
  programType: text('program_type'), // 'bootcamp' | 'curso' | 'taller' | 'libre'
  programName: text('program_name'),
  
  // === PROFESIONAL ===
  projectType: text('project_type'), // 'contenido' | 'visual' | 'desarrollo' | 'analisis' | 'ventas'
  forWhom: text('for_whom'), // 'mi_empresa' | 'cliente' | 'personal'
  deadline: date('deadline'),
  
  // === PERSONAL ===
  personalType: text('personal_type'), // 'hackathon' | 'idea' | 'wip' | 'explorar'
  
  // === HACKATHON específico ===
  hackathonLink: text('hackathon_link'),
  hackathonName: text('hackathon_name'),
  hackathonDeadline: date('hackathon_deadline'),
  timeAvailable: text('time_available'), // '<24h' | '2-3dias' | '1semana+'
  
  // === IDEA específico ===
  ideaDescription: text('idea_description'),
  
  // === Metadata ===
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type WizardData = typeof wizardData.$inferSelect;
export type NewWizardData = typeof wizardData.$inferInsert;
```

### Schema: conversations.ts

```typescript
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  title: text('title').default('Nueva conversación'),
  isOnboarding: boolean('is_onboarding').default(false), // Primera conversación
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export type Conversation = typeof conversations.$inferSelect;
```

### Migración

```bash
cd godinez-studio
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

---

## Fase 2: APIs (Hono Routes)

### Estructura de archivos

```
godinez-studio/
├── src/server/
│   └── routes/
│       ├── index.ts         # Router principal
│       ├── workspaces.ts    # CRUD workspaces
│       ├── wizard.ts        # Wizard steps
│       ├── agents.ts        # Provisioning
│       └── chat.ts          # Mensajes
```

### API: workspaces.ts

```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { workspaces, wizardData } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const app = new Hono();

// Crear workspace (inicio del wizard)
app.post('/', async (c) => {
  const { userId, name } = await c.req.json();
  
  const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${nanoid(6)}`;
  
  const [workspace] = await db.insert(workspaces).values({
    userId,
    name,
    slug,
    status: 'wizard_incomplete',
  }).returning();
  
  // Crear registro vacío de wizard_data
  await db.insert(wizardData).values({
    workspaceId: workspace.id,
  });
  
  return c.json({ workspace });
});

// Obtener workspace por slug
app.get('/:slug', async (c) => {
  const { slug } = c.req.param();
  
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.slug, slug));
  
  if (!workspace) {
    return c.json({ error: 'Workspace not found' }, 404);
  }
  
  return c.json({ workspace });
});

// Listar workspaces del usuario
app.get('/user/:userId', async (c) => {
  const { userId } = c.req.param();
  
  const userWorkspaces = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .orderBy(workspaces.createdAt);
  
  return c.json({ workspaces: userWorkspaces });
});

export default app;
```

### API: wizard.ts

```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { workspaces, wizardData } from '../db/schema';
import { eq } from 'drizzle-orm';

const app = new Hono();

// Guardar paso del wizard
app.put('/:workspaceId/step/:step', async (c) => {
  const { workspaceId, step } = c.req.param();
  const data = await c.req.json();
  const stepNum = parseInt(step);
  
  switch (stepNum) {
    case 1:
      // Contexto principal
      await db.update(workspaces)
        .set({ context: data.context, updatedAt: new Date() })
        .where(eq(workspaces.id, workspaceId));
      break;
      
    case 2:
      // Sub-contexto
      await db.update(workspaces)
        .set({ subContext: data.subContext, updatedAt: new Date() })
        .where(eq(workspaces.id, workspaceId));
      
      // Guardar tipo específico en wizard_data
      await db.update(wizardData)
        .set({
          programType: data.programType,
          projectType: data.projectType,
          personalType: data.personalType,
          updatedAt: new Date(),
        })
        .where(eq(wizardData.workspaceId, workspaceId));
      break;
      
    case 3:
      // Preguntas específicas por contexto
      await db.update(wizardData)
        .set({
          // Educación
          programLink: data.programLink,
          programName: data.programName,
          // Profesional
          forWhom: data.forWhom,
          deadline: data.deadline,
          // Personal/Hackathon
          hackathonLink: data.hackathonLink,
          hackathonName: data.hackathonName,
          hackathonDeadline: data.hackathonDeadline,
          timeAvailable: data.timeAvailable,
          // Idea
          ideaDescription: data.ideaDescription,
          updatedAt: new Date(),
        })
        .where(eq(wizardData.workspaceId, workspaceId));
      break;
      
    case 4:
      // Perfil y agente
      await db.update(workspaces)
        .set({
          agentName: data.agentName,
          agentPersonality: data.agentPersonality,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId));
      break;
      
    case 5:
      // Modo NIDI
      await db.update(workspaces)
        .set({
          nidiMode: data.nidiMode,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId));
      break;
  }
  
  return c.json({ success: true, step: stepNum });
});

// Obtener estado del wizard
app.get('/:workspaceId', async (c) => {
  const { workspaceId } = c.req.param();
  
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  
  const [data] = await db
    .select()
    .from(wizardData)
    .where(eq(wizardData.workspaceId, workspaceId));
  
  // Calcular paso actual
  let currentStep = 1;
  if (workspace.context) currentStep = 2;
  if (workspace.subContext) currentStep = 3;
  if (data?.programLink || data?.forWhom || data?.hackathonLink || data?.ideaDescription) currentStep = 4;
  if (workspace.agentName) currentStep = 5;
  
  return c.json({
    workspace,
    wizardData: data,
    currentStep,
    isComplete: workspace.status !== 'wizard_incomplete',
  });
});

export default app;
```

### API: agents.ts (Provisioning)

```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { workspaces, wizardData, conversations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { createOpenClawAgent, generateSoulMd } from '../services/openclaw';

const app = new Hono();

// Lanzar workspace (provisioning)
app.post('/:workspaceId/launch', async (c) => {
  const { workspaceId } = c.req.param();
  
  // 1. Obtener datos completos
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  
  const [data] = await db
    .select()
    .from(wizardData)
    .where(eq(wizardData.workspaceId, workspaceId));
  
  if (!workspace) {
    return c.json({ error: 'Workspace not found' }, 404);
  }
  
  // 2. Marcar como provisioning
  await db.update(workspaces)
    .set({ status: 'provisioning' })
    .where(eq(workspaces.id, workspaceId));
  
  try {
    // 3. Crear agente en OpenClaw
    const { agentId, label } = await createOpenClawAgent({
      workspace,
      wizardData: data,
    });
    
    // 4. Actualizar workspace con agentId
    await db.update(workspaces)
      .set({
        openclawAgentId: agentId,
        openclawLabel: label,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId));
    
    // 5. Crear conversación de onboarding
    const [conversation] = await db.insert(conversations).values({
      workspaceId,
      title: 'Onboarding',
      isOnboarding: true,
    }).returning();
    
    return c.json({
      success: true,
      agentId,
      conversationId: conversation.id,
      redirectTo: `/studio/${workspace.slug}/chat`,
    });
    
  } catch (error) {
    // Rollback status
    await db.update(workspaces)
      .set({ status: 'wizard_incomplete' })
      .where(eq(workspaces.id, workspaceId));
    
    return c.json({
      error: 'Failed to create agent',
      details: error.message,
    }, 500);
  }
});

export default app;
```

---

## Fase 3: Servicio OpenClaw

### Archivo: src/server/services/openclaw.ts

```typescript
const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://100.94.17.14:18789';
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

interface CreateAgentParams {
  workspace: Workspace;
  wizardData: WizardData;
}

export async function createOpenClawAgent({ workspace, wizardData }: CreateAgentParams) {
  const label = `godinez-${workspace.slug}`;
  
  // 1. Crear agente via Gateway API
  const response = await fetch(`${GATEWAY_URL}/api/agents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      label,
      config: {
        // Config mínima del agente
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Gateway error: ${response.status}`);
  }
  
  const { agentId } = await response.json();
  
  // 2. Generar y escribir SOUL.md
  const soulContent = generateSoulMd(workspace, wizardData);
  
  await fetch(`${GATEWAY_URL}/api/agents/${agentId}/files/SOUL.md`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'text/plain',
    },
    body: soulContent,
  });
  
  return { agentId, label };
}

export function generateSoulMd(workspace: Workspace, wizardData: WizardData): string {
  const base = `# SOUL.md — ${workspace.agentName}

## Identidad
- **Nombre:** ${workspace.agentName}
- **Personalidad:** ${workspace.agentPersonality}
- **Modo:** ${workspace.nidiMode}

## Mi Usuario
- **Contexto:** ${workspace.context}
- **Sub-contexto:** ${workspace.subContext}

## Comportamiento
${workspace.nidiMode === 'guiado' ? `
### Modo Guiado (Activo)
- Siempre sugiero el siguiente paso
- Celebro cada checkpoint completado
- Muestro progreso visual
- No permito saltar fases sin completar checkpoints
` : `
### Modo Libre (Activo)
- Respondo cuando me preguntan
- No interrumpo innecesariamente
- Permito saltar fases
- Solo alerto en deadlines críticos
`}
`;

  // Agregar sección específica por contexto
  let contextSection = '';
  
  switch (workspace.context) {
    case 'educacion':
      contextSection = `
## Programa Educativo
- **Tipo:** ${wizardData.programType}
- **Nombre:** ${wizardData.programName || 'Por definir'}
- **Link:** ${wizardData.programLink || 'No proporcionado'}

## Mi Rol
Soy tu mentor. Te guío paso a paso, celebro avances, te desbloqueo.
Uso lenguaje simple, nunca jerga técnica sin explicar.
`;
      break;
      
    case 'profesional':
      contextSection = `
## Proyecto
- **Tipo:** ${wizardData.projectType}
- **Para:** ${wizardData.forWhom}
- **Deadline:** ${wizardData.deadline || 'Sin fecha fija'}

## Mi Rol
Soy tu partner de ejecución. Priorizo velocidad con calidad.
Genero borradores rápidos para iterar. Respeto el deadline.
`;
      break;
      
    case 'personal':
      if (wizardData.personalType === 'hackathon') {
        contextSection = `
## Hackathon
- **Nombre:** ${wizardData.hackathonName || 'Por definir'}
- **Deadline:** ${wizardData.hackathonDeadline || 'Por definir'}
- **Tiempo disponible:** ${wizardData.timeAvailable}
- **Link:** ${wizardData.hackathonLink || 'No proporcionado'}

## Mi Rol
Soy tu co-founder temporal. MVP > perfección.
Siempre pienso en el submit final.
`;
      } else {
        contextSection = `
## Proyecto Personal
- **Tipo:** ${wizardData.personalType}
- **Idea:** ${wizardData.ideaDescription || 'Por explorar'}

## Mi Rol
Te ayudo a convertir tu idea en realidad.
Vamos paso a paso, sin prisa pero sin pausa.
`;
      }
      break;
  }
  
  return base + contextSection;
}
```

---

## Fase 4: Frontend (React)

### Estructura de componentes

```
godinez-studio/
├── src/
│   ├── pages/
│   │   ├── studio/
│   │   │   ├── index.tsx              # Workspace selector
│   │   │   └── [slug]/
│   │   │       ├── index.tsx          # Dashboard
│   │   │       └── chat.tsx           # Chat view
│   │   └── wizard/
│   │       └── [workspaceId].tsx      # Wizard multi-step
│   │
│   └── components/
│       └── wizard/
│           ├── WizardContainer.tsx    # Estado + navegación
│           ├── WizardProgress.tsx     # Barra de progreso
│           ├── Step1Context.tsx       # Edu/Pro/Personal
│           ├── Step2SubContext.tsx    # Dinámico
│           ├── Step3Questions.tsx     # Inputs específicos
│           ├── Step4Profile.tsx       # Nombres + personalidad
│           └── Step5Launch.tsx        # NIDI + resumen
```

### WizardContainer.tsx (ejemplo)

```tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import WizardProgress from './WizardProgress';
import Step1Context from './Step1Context';
import Step2SubContext from './Step2SubContext';
import Step3Questions from './Step3Questions';
import Step4Profile from './Step4Profile';
import Step5Launch from './Step5Launch';

export default function WizardContainer() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardState, setWizardState] = useState({
    context: null,
    subContext: null,
    // ... otros campos
  });
  
  const handleNext = async (stepData: any) => {
    // Guardar en backend
    await fetch(`/api/wizard/${workspaceId}/step/${currentStep}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stepData),
    });
    
    // Actualizar estado local
    setWizardState(prev => ({ ...prev, ...stepData }));
    
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleLaunch = async () => {
    const response = await fetch(`/api/agents/${workspaceId}/launch`, {
      method: 'POST',
    });
    const { redirectTo } = await response.json();
    navigate(redirectTo);
  };
  
  return (
    <div className="wizard-container">
      <WizardProgress currentStep={currentStep} totalSteps={5} />
      
      {currentStep === 1 && (
        <Step1Context onNext={handleNext} />
      )}
      {currentStep === 2 && (
        <Step2SubContext 
          context={wizardState.context} 
          onNext={handleNext} 
        />
      )}
      {currentStep === 3 && (
        <Step3Questions 
          context={wizardState.context}
          subContext={wizardState.subContext}
          onNext={handleNext} 
        />
      )}
      {currentStep === 4 && (
        <Step4Profile onNext={handleNext} />
      )}
      {currentStep === 5 && (
        <Step5Launch 
          wizardState={wizardState}
          onLaunch={handleLaunch} 
        />
      )}
    </div>
  );
}
```

---

## Fase 5: Chat Integration

### API: chat.ts

```typescript
import { Hono } from 'hono';
import { db } from '../db';
import { workspaces } from '../db/schema';
import { eq } from 'drizzle-orm';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL;
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN;

const app = new Hono();

// Enviar mensaje al agente
app.post('/:workspaceId/message', async (c) => {
  const { workspaceId } = c.req.param();
  const { message } = await c.req.json();
  
  // Obtener agentId del workspace
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId));
  
  if (!workspace?.openclawLabel) {
    return c.json({ error: 'Agent not found' }, 404);
  }
  
  // Enviar mensaje via Gateway
  const response = await fetch(`${GATEWAY_URL}/api/sessions/send`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      label: workspace.openclawLabel,
      message,
      timeoutSeconds: 120,
    }),
  });
  
  const result = await response.json();
  
  return c.json({
    response: result.response,
    // ... otros campos
  });
});

export default app;
```

---

## 📋 Checklist de Implementación

### Semana 1: Foundation
- [ ] Schema BD: workspaces.ts
- [ ] Schema BD: wizard-data.ts
- [ ] Schema BD: conversations.ts
- [ ] Migración Drizzle
- [ ] API: POST /api/workspaces
- [ ] API: GET /api/workspaces/:slug
- [ ] API: GET /api/workspaces/user/:userId

### Semana 2: Wizard Backend
- [ ] API: PUT /api/wizard/:id/step/1
- [ ] API: PUT /api/wizard/:id/step/2
- [ ] API: PUT /api/wizard/:id/step/3
- [ ] API: PUT /api/wizard/:id/step/4
- [ ] API: PUT /api/wizard/:id/step/5
- [ ] API: GET /api/wizard/:id (estado)

### Semana 3: Wizard Frontend
- [ ] WizardContainer.tsx
- [ ] WizardProgress.tsx
- [ ] Step1Context.tsx
- [ ] Step2SubContext.tsx
- [ ] Step3Questions.tsx
- [ ] Step4Profile.tsx
- [ ] Step5Launch.tsx

### Semana 4: Provisioning
- [ ] Service: openclaw.ts
- [ ] Función: createOpenClawAgent()
- [ ] Función: generateSoulMd()
- [ ] API: POST /api/agents/:id/launch
- [ ] UI: Loading state
- [ ] UI: Error handling

### Semana 5: Chat + Dashboard
- [ ] API: POST /api/chat/:id/message
- [ ] UI: ChatView.tsx
- [ ] UI: Dashboard base
- [ ] UI: Barra de progreso por fases
- [ ] UI: Tarjeta "Mi Proyecto"

---

## 🔄 Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (React + Vite)                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Wizard    │───▶│   Studio    │───▶│    Chat     │     │
│  │  (5 pasos)  │    │ (dashboard) │    │  (agente)   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
└─────────│──────────────────│──────────────────│─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (Hono)                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ /api/wizard │    │/api/worksp. │    │  /api/chat  │     │
│  │ /api/agents │    │             │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                  │             │
└─────────│──────────────────│──────────────────│─────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│  DATABASE (PostgreSQL + Drizzle)                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │ wizard_data │    │ workspaces  │    │conversations│     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
└─────────────────────────────────────────────────────────────┘
                             │
                             │ provisioning
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  OPENCLAW GATEWAY (AWS - 100.94.17.14:18789)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Agents (godin-slot-1 ... godin-slot-15)            │   │
│  │  - SOUL.md (contexto + personalidad)                │   │
│  │  - Chat sessions                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Variables de Entorno

```bash
# .env
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_...

# OpenClaw Gateway
OPENCLAW_GATEWAY_URL=http://100.94.17.14:18789
OPENCLAW_GATEWAY_TOKEN=1c6803964540196b81235a9dc14d50a384a4ab2b970e9348
```

---

## Próximos Pasos Recomendados

1. **Opción A:** Empezar por BD + APIs (backend first)
2. **Opción B:** Empezar por Wizard UI (frontend first, mock data)
3. **Opción C:** Empezar por provisioning OpenClaw (integration first)

---

*Documento: 2026-03-06*
*Basado en: onboarding-flow-integrado.md*
