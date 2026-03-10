# [GS-20] Hackathon Dashboard con Fases

**Story Points:** 5
**Prioridad:** P0 (bloquea demo)
**Labels:** feat, agent-ok

---

## Descripción

Agregar sección "Hackathon" al sidebar del dashboard que muestre las 9 fases del flujo de hackathon. Implementación rápida reutilizando infraestructura existente.

---

## Análisis de Infraestructura Existente

### ✅ Ya existe (REUTILIZAR)

| Componente | Ubicación | Cómo usarlo |
|------------|-----------|-------------|
| Sidebar navigation | `Sidebar.tsx` → `getNavItems()` | Agregar item a la función |
| Router | `App.tsx` → `createBrowserRouter` | Agregar ruta en children de `/studio/:slug` |
| Workspace context | `WorkspaceProvider.tsx` | Usar `useWorkspace()` para obtener datos |
| Strings centralizados | `content.ts` | Agregar sección `hackathon` |
| Hooks pattern | `use-workspace.ts`, `use-projects.ts` | Seguir patrón para `use-hackathon.ts` |
| Card UI pattern | `Tasks.tsx` → `TaskCard` | Seguir patrón para `PhaseCard` |
| Empty state | `EmptyState.tsx` | Reutilizar componente |
| Skeleton loading | `Skeleton.tsx` | Reutilizar `PageSkeleton` |
| API pattern | `routes/workspaces.ts` | Agregar endpoint GET/PUT settings |
| DB field | `workspaces.settings` (TEXT/JSON) | Ya existe, solo parsear |

### ❌ No existe (CREAR)

| Componente | Descripción |
|------------|-------------|
| `Hackathon.tsx` | Página principal |
| `PhaseCard.tsx` | Componente de tarjeta de fase |
| `use-hackathon.ts` | Hook para leer/escribir hackathon settings |
| API endpoint | `GET/PUT /workspaces/:id/hackathon` |
| Types | `HackathonSettings`, `HackathonPhase` |

---

## Acceptance Criteria

- [ ] Item "🚀 Hackathon" visible en sidebar (después de Actividad)
- [ ] Ruta `/studio/:slug/hackathon` funcional
- [ ] Grid de 9 fases con estados visuales (⬜ pending / 🔄 current / ✅ completed)
- [ ] Header con nombre del hackathon y días restantes
- [ ] Click en fase → navega a chat con mensaje de contexto
- [ ] Estado persiste en `workspace.settings.hackathon`

---

## Implementación Detallada

### 1. Types (packages/types/src/index.ts)

```typescript
// Agregar al final del archivo:

export interface HackathonPhase {
  id: number;           // 0-8
  status: 'pending' | 'current' | 'completed';
  completedAt?: string;
}

export interface HackathonSettings {
  name: string;
  deadline: string;      // ISO date
  link?: string;
  currentPhase: number;  // 0-8
  phases: HackathonPhase[];
}

// Modificar Workspace interface:
export interface Workspace {
  // ... campos existentes ...
  settings?: string;     // JSON string, parsear como WorkspaceSettings
}

export interface WorkspaceSettings {
  hackathon?: HackathonSettings;
}
```

### 2. Content strings (apps/web/src/lib/content.ts)

```typescript
// Agregar dentro de content.studio:
hackathon: {
  title: "Hackathon",
  sidebar: "Hackathon",
  noHackathon: "No hay hackathon configurado.",
  setupCta: "Configurar hackathon",
  daysLeft: "días restantes",
  continuePhase: "Continuar",
  phases: {
    0: { name: "Info del hackathon", checkpoint: "Info confirmada" },
    1: { name: "Ideación", checkpoint: "Idea en 1 oración" },
    2: { name: "Plan MVP", checkpoint: "Backlog creado" },
    3: { name: "Frontend", checkpoint: "Algo visible" },
    4: { name: "Backend", checkpoint: "Core funciona" },
    5: { name: "Deploy", checkpoint: "Link público" },
    6: { name: "Pitch", checkpoint: "Materiales listos" },
    7: { name: "Video", checkpoint: "Video publicado" },
    8: { name: "Submit", checkpoint: "⭐ Enviado" },
  } as Record<number, { name: string; checkpoint: string }>,
},
```

### 3. Sidebar (apps/web/src/components/layout/Sidebar.tsx)

```typescript
// Modificar getNavItems():
function getNavItems(slug: string): NavItem[] {
  return [
    { label: sidebar.dashboard, href: `/studio/${slug}`, icon: "◻" },
    { label: sidebar.chat, href: `/studio/${slug}/chat`, icon: "💬" },
    { label: sidebar.projects, href: `/studio/${slug}/projects`, icon: "📁" },
    { label: sidebar.agent, href: `/studio/${slug}/agents`, icon: "🤖" },
    { label: sidebar.tasks, href: `/studio/${slug}/tasks`, icon: "✓" },
    { label: sidebar.files, href: `/studio/${slug}/files`, icon: "📄" },
    { label: sidebar.activity, href: `/studio/${slug}/activity`, icon: "📊" },
    // AGREGAR:
    { label: sidebar.hackathon ?? "Hackathon", href: `/studio/${slug}/hackathon`, icon: "🚀" },
  ];
}
```

### 4. Router (apps/web/src/App.tsx)

```typescript
// Agregar import:
import Hackathon from "./pages/Hackathon";

// Agregar en children de /studio/:slug:
{ path: "hackathon", element: <Hackathon /> },
```

### 5. Hook (apps/web/src/hooks/use-hackathon.ts) — CREAR

```typescript
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HackathonSettings } from "@godinez/types";
import { apiFetch } from "@/lib/api";

export function useHackathon(workspaceId: number | undefined) {
  const { getToken } = useAuth();
  
  return useQuery({
    queryKey: ["hackathon", workspaceId],
    queryFn: async () => {
      const token = await getToken();
      return apiFetch<HackathonSettings | null>(
        `/api/workspaces/${workspaceId}/hackathon`,
        { token }
      );
    },
    enabled: !!workspaceId,
  });
}

export function useUpdateHackathon(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<HackathonSettings>) => {
      const token = await getToken();
      return apiFetch<HackathonSettings>(
        `/api/workspaces/${workspaceId}/hackathon`,
        { method: "PUT", body: JSON.stringify(data), token }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hackathon", workspaceId] });
    },
  });
}

export function useAdvancePhase(workspaceId: number) {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: async (phaseId: number) => {
      const token = await getToken();
      return apiFetch(
        `/api/workspaces/${workspaceId}/hackathon/phase/${phaseId}/complete`,
        { method: "POST", token }
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hackathon", workspaceId] });
    },
  });
}
```

### 6. API endpoints (apps/api/src/routes/hackathon.ts) — CREAR

```typescript
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { requireWorkspaceMember } from "../middleware/require-workspace";
import { getWorkspaceById, updateWorkspaceSettings } from "../dal/workspaces";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// GET /workspaces/:id/hackathon
app.get("/:id/hackathon", requireWorkspaceMember, async (c) => {
  const id = parseInt(c.req.param("id"));
  const workspace = await getWorkspaceById(id);
  
  if (!workspace?.settings) return c.json(null);
  
  try {
    const settings = JSON.parse(workspace.settings);
    return c.json(settings.hackathon ?? null);
  } catch {
    return c.json(null);
  }
});

// PUT /workspaces/:id/hackathon
app.put(
  "/:id/hackathon",
  requireWorkspaceMember,
  zValidator("json", z.object({
    name: z.string().optional(),
    deadline: z.string().optional(),
    link: z.string().optional(),
    currentPhase: z.number().optional(),
    phases: z.array(z.object({
      id: z.number(),
      status: z.enum(["pending", "current", "completed"]),
      completedAt: z.string().optional(),
    })).optional(),
  })),
  async (c) => {
    const id = parseInt(c.req.param("id"));
    const data = c.req.valid("json");
    
    const workspace = await getWorkspaceById(id);
    const currentSettings = workspace?.settings 
      ? JSON.parse(workspace.settings) 
      : {};
    
    const newSettings = {
      ...currentSettings,
      hackathon: { ...currentSettings.hackathon, ...data },
    };
    
    await updateWorkspaceSettings(id, JSON.stringify(newSettings));
    return c.json(newSettings.hackathon);
  }
);

// POST /workspaces/:id/hackathon/phase/:phaseId/complete
app.post("/:id/hackathon/phase/:phaseId/complete", requireWorkspaceMember, async (c) => {
  const id = parseInt(c.req.param("id"));
  const phaseId = parseInt(c.req.param("phaseId"));
  
  const workspace = await getWorkspaceById(id);
  const settings = workspace?.settings ? JSON.parse(workspace.settings) : {};
  const hackathon = settings.hackathon;
  
  if (!hackathon) return c.json({ error: "No hackathon configured" }, 400);
  
  // Mark phase as completed, advance to next
  hackathon.phases = hackathon.phases.map((p: any) => {
    if (p.id === phaseId) return { ...p, status: "completed", completedAt: new Date().toISOString() };
    if (p.id === phaseId + 1) return { ...p, status: "current" };
    return p;
  });
  hackathon.currentPhase = Math.min(phaseId + 1, 8);
  
  settings.hackathon = hackathon;
  await updateWorkspaceSettings(id, JSON.stringify(settings));
  
  return c.json(hackathon);
});

export default app;
```

### 7. DAL update (apps/api/src/dal/workspaces.ts)

```typescript
// Agregar función:
export async function updateWorkspaceSettings(id: number, settings: string) {
  const [workspace] = await db
    .update(workspaces)
    .set({ settings })
    .where(eq(workspaces.id, id))
    .returning();
  return workspace;
}
```

### 8. Page (apps/web/src/pages/Hackathon.tsx) — CREAR

```typescript
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { useHackathon } from "@/hooks/use-hackathon";
import { content } from "@/lib/content";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import PhaseCard from "@/components/hackathon/PhaseCard";

const { hackathon: hc } = content.studio;

export default function Hackathon() {
  const { workspace } = useWorkspace();
  const { data: hackathon, isLoading } = useHackathon(workspace?.id);

  if (isLoading) return <PageSkeleton />;
  
  if (!hackathon) {
    return <EmptyState message={hc.noHackathon} />;
  }

  const daysLeft = Math.ceil(
    (new Date(hackathon.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          {hackathon.name}
        </h1>
        <p className="text-[hsl(var(--muted-foreground))]">
          {daysLeft > 0 ? `${daysLeft} ${hc.daysLeft}` : "Deadline pasado"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {hackathon.phases.map((phase) => (
          <PhaseCard 
            key={phase.id} 
            phase={phase} 
            isCurrent={phase.id === hackathon.currentPhase}
          />
        ))}
      </div>
    </div>
  );
}
```

### 9. PhaseCard (apps/web/src/components/hackathon/PhaseCard.tsx) — CREAR

```typescript
import { Link } from "react-router-dom";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { content } from "@/lib/content";
import type { HackathonPhase } from "@godinez/types";

const { hackathon: hc } = content.studio;

const statusIcons = {
  pending: "⬜",
  current: "🔄",
  completed: "✅",
};

const statusColors = {
  pending: "border-[hsl(var(--border))]",
  current: "border-magenta bg-magenta/5",
  completed: "border-green-500/30 bg-green-500/5",
};

export default function PhaseCard({ 
  phase, 
  isCurrent 
}: { 
  phase: HackathonPhase; 
  isCurrent: boolean;
}) {
  const { slug } = useWorkspace();
  const phaseInfo = hc.phases[phase.id];

  return (
    <div className={`rounded-lg border p-4 ${statusColors[phase.status]}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{statusIcons[phase.status]}</span>
        <span className="text-sm font-medium text-[hsl(var(--foreground))]">
          Fase {phase.id}
        </span>
      </div>
      
      <h3 className="mt-2 font-semibold text-[hsl(var(--foreground))]">
        {phaseInfo?.name}
      </h3>
      
      <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
        {phaseInfo?.checkpoint}
      </p>

      {isCurrent && (
        <Link
          to={`/studio/${slug}/chat`}
          className="mt-3 inline-block rounded-md bg-magenta px-3 py-1.5 text-sm font-medium text-white hover:bg-magenta/90"
        >
          {hc.continuePhase}
        </Link>
      )}
    </div>
  );
}
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `packages/types/src/index.ts` | +HackathonSettings, +HackathonPhase |
| `apps/web/src/lib/content.ts` | +hackathon strings |
| `apps/web/src/components/layout/Sidebar.tsx` | +item en getNavItems() |
| `apps/web/src/App.tsx` | +import +ruta hackathon |
| `apps/api/src/index.ts` | +import +route hackathon |
| `apps/api/src/dal/workspaces.ts` | +updateWorkspaceSettings() |

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `apps/web/src/pages/Hackathon.tsx` | Página principal |
| `apps/web/src/components/hackathon/PhaseCard.tsx` | Componente tarjeta |
| `apps/web/src/hooks/use-hackathon.ts` | Hook de datos |
| `apps/api/src/routes/hackathon.ts` | API endpoints |

---

## Notas

- **NO requiere migraciones** — usa `workspace.settings` existente
- **Sigue patrones existentes** — hooks, content, routing
- **Tiempo estimado:** 4-6 horas

---

*Creado: 2026-03-06*
*Basado en: hackathon-flow.md + análisis de arquitectura dev*
