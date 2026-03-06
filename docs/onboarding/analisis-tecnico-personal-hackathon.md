# Análisis Técnico: Personal → Hackathon
## Godinez AI — Flujo Dinámico con NIDI (Guiado/Libre)
### Marzo 2026

---

## 1. Scope del Documento

Este análisis técnico cubre **exclusivamente** el camino:

```
Wizard Onboarding → Personal → Hackathon → [Guiado | Libre]
```

Incluye:
- Arquitectura del flujo dinámico
- Estados y transiciones del usuario
- Diferencias técnicas entre modo Guiado y Libre
- Schema de base de datos
- APIs requeridas
- Lógica del agente por fase
- Métricas y tracking

**NO cubre:** Educación, Profesional, ni otros sub-contextos de Personal.

---

## 2. Arquitectura del Flujo

### 2.1 Diagrama de Estados (State Machine)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           WIZARD ONBOARDING                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PASO 1: Contexto                                                            │
│  [Educación] [Profesional] [Personal*]                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Personal seleccionado
┌─────────────────────────────────────────────────────────────────────────────┐
│  PASO 2: Sub-contexto                                                        │
│  [Hackathon*] [Emprendimiento] [Proyecto Personal]                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Hackathon seleccionado
┌─────────────────────────────────────────────────────────────────────────────┐
│  PASO 3: Perfil Mínimo                                                       │
│  • Nombre del hackathon (string, required)                                   │
│  • Fecha límite (date, required)                                             │
│  • ¿Tienes equipo? (boolean, optional)                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PASO 4: Configuración del Agente                                            │
│  • Nombre del agente (string, default: auto-generated)                       │
│  • Personalidad: [Profesional] [Amigable] [Creativo] [Técnico]               │
│  • Modo NIDI: [Guiado*] [Libre]    ← DECISIÓN CLAVE                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  PASO 5: Lanzar                                                              │
│  [Crear mi agente →]                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PROVISIONING                                          │
│  • Crear workspace                                                           │
│  • Generar SOUL.md con personalidad                                          │
│  • Inyectar contexto hackathon                                               │
│  • Configurar modo NIDI                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CHAT (Fase 0 → Fase 8)                                │
│  Estado: ACTIVE                                                              │
│  Modo: GUIADO | LIBRE                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Estados del Workspace

```typescript
enum WorkspaceStatus {
  WIZARD_INCOMPLETE = 'wizard_incomplete',  // Wizard no terminado
  PROVISIONING = 'provisioning',             // Creando workspace
  PROVISION_FAILED = 'provision_failed',     // Error en creación
  ACTIVE = 'active',                          // Workspace operativo
  PAUSED = 'paused',                          // Usuario pausó el proyecto
  COMPLETED = 'completed',                    // Submit exitoso (Fase 8)
  ABANDONED = 'abandoned'                     // Sin actividad >14 días
}
```

---

## 3. NIDI: Modo Guiado vs Libre

### 3.1 Definición Técnica

**NIDI** = Nivel de Intervención Directa del Agente

| Aspecto | Guiado | Libre |
|---------|--------|-------|
| **Proactividad** | Alta — sugiere siguiente paso | Baja — espera instrucciones |
| **Checkpoints** | Obligatorios, con validación | Opcionales, sin bloqueo |
| **Progreso visual** | Siempre visible, actualizado | Bajo demanda |
| **Notificaciones** | Activas (deadlines, sugerencias) | Mínimas (solo críticas) |
| **Orden de fases** | Secuencial estricto | Libre (puede saltar) |
| **Celebraciones** | En cada checkpoint completado | Solo en milestones mayores |
| **Time-to-next-action** | Inmediato (agente propone) | Variable (usuario inicia) |

### 3.2 Implementación en el Agente

```typescript
interface NIDIConfig {
  mode: 'guiado' | 'libre';
  
  // Comportamientos derivados del modo
  proactiveNextStep: boolean;      // Guiado: true, Libre: false
  blockUntilCheckpoint: boolean;   // Guiado: true, Libre: false
  showProgressBar: boolean;        // Guiado: always, Libre: on-demand
  sendDeadlineReminders: boolean;  // Guiado: true, Libre: false
  celebrateCheckpoints: boolean;   // Guiado: true, Libre: milestone-only
  allowPhaseSkip: boolean;         // Guiado: false, Libre: true
}

// Defaults por modo
const NIDI_GUIADO: NIDIConfig = {
  mode: 'guiado',
  proactiveNextStep: true,
  blockUntilCheckpoint: true,
  showProgressBar: true,
  sendDeadlineReminders: true,
  celebrateCheckpoints: true,
  allowPhaseSkip: false
};

const NIDI_LIBRE: NIDIConfig = {
  mode: 'libre',
  proactiveNextStep: false,
  blockUntilCheckpoint: false,
  showProgressBar: false, // Disponible pero no default
  sendDeadlineReminders: true, // Solo deadlines críticos
  celebrateCheckpoints: false,
  allowPhaseSkip: true
};
```

### 3.3 Cambio de Modo en Runtime

El usuario puede cambiar de modo en cualquier momento:

**Vía chat:**
```
Usuario: "activar modo guiado"
Agente: "Modo guiado activado. Te guiaré paso a paso. 
        Actualmente estás en Fase 3 (Diseño). ¿Continuamos?"

Usuario: "desactivar modo guiado" / "modo libre"
Agente: "Modo libre activado. Estoy aquí cuando me necesites.
        Tu progreso sigue visible en 'Mi Proyecto'."
```

**Vía dashboard:**
- Toggle en la sección "Mi Proyecto" → Configuración
- Cambio inmediato, sin confirmación

**Persistencia:**
```sql
UPDATE workspaces 
SET nidi_mode = 'libre', nidi_changed_at = NOW()
WHERE id = :workspace_id;

-- Log del cambio para analytics
INSERT INTO nidi_mode_changes (workspace_id, from_mode, to_mode, changed_at)
VALUES (:workspace_id, 'guiado', 'libre', NOW());
```

---

## 4. Fases del Hackathon: Detalle Técnico

### 4.1 Resumen de Fases

| Fase | Nombre | Entradas | Salidas | Checkpoint |
|------|--------|----------|---------|------------|
| 0 | Carga de info | Link/PDF/descripción | `hackathon_info` object | Info confirmada |
| 1 | Ideación | Idea o preferencias | `project_idea` + `track` | Explicable en 1 oración |
| 2 | Planificación | Idea validada | `backlog[]` + `timeline` | Plan creado |
| 3 | Frontend | Backlog tickets | UI visible | Hay algo que ver |
| 4 | Backend | Backlog tickets | Funcionalidad core | Core funciona |
| 5 | Pulido | MVP completo | MVP publicado | Link público |
| 6 | Presentación | MVP publicado | Pitch + descripción + guion | Materiales listos |
| 7 | Video | Guion | Video publicado | Video en YouTube |
| 8 | Submit | Todo listo | Formulario enviado | ⭐️ COMPLETADO |

### 4.2 Schema de Base de Datos

```sql
-- Tabla principal del workspace
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  agent_id UUID REFERENCES agents(id),
  
  -- Contexto del wizard
  context VARCHAR(20) NOT NULL,           -- 'personal'
  sub_context VARCHAR(30) NOT NULL,        -- 'hackathon'
  
  -- Configuración NIDI
  nidi_mode VARCHAR(10) DEFAULT 'guiado', -- 'guiado' | 'libre'
  nidi_changed_at TIMESTAMP,
  
  -- Estado del workspace
  status VARCHAR(20) DEFAULT 'active',
  current_phase INTEGER DEFAULT 0,         -- 0-8
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,                  -- Cuando llega a Fase 8
  last_activity_at TIMESTAMP DEFAULT NOW()
);

-- Información del hackathon (Fase 0)
CREATE TABLE hackathon_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Datos extraídos
  nombre VARCHAR(200) NOT NULL,
  organizadores TEXT,
  descripcion TEXT,
  tracks JSONB,                            -- [{name, description, prizes}]
  premios TEXT,
  fecha_inicio DATE,
  deadline DATE NOT NULL,
  plataforma VARCHAR(100),                 -- 'devpost', 'dorahacks', etc.
  entregables JSONB,                       -- [{tipo, descripcion, required}]
  criterios JSONB,                         -- [{criterio, peso}]
  reglas TEXT,
  
  -- Metadata de extracción
  source_type VARCHAR(20),                 -- 'url', 'pdf', 'manual'
  source_url TEXT,
  extracted_at TIMESTAMP DEFAULT NOW(),
  confirmed_by_user BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Idea del proyecto (Fase 1)
CREATE TABLE project_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  idea_text TEXT NOT NULL,                 -- Descripción libre
  one_liner VARCHAR(280),                  -- Pitch de 1 oración
  track_id VARCHAR(100),                   -- Track seleccionado
  
  -- Validación del agente
  is_viable BOOLEAN,
  viability_notes TEXT,
  suggested_adjustments TEXT,
  
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Backlog de tickets (Fase 2)
CREATE TABLE backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(20),                        -- 'core', 'secondary', 'nice-to-have'
  phase INTEGER,                           -- En qué fase se trabaja (3-5)
  priority INTEGER,                        -- 1 = más importante
  estimated_hours DECIMAL(4,1),
  
  status VARCHAR(20) DEFAULT 'pending',    -- pending, in_progress, done, skipped
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Checkpoints completados
CREATE TABLE phase_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  phase INTEGER NOT NULL,                  -- 0-8
  checkpoint_key VARCHAR(50) NOT NULL,     -- 'info_confirmed', 'idea_clear', etc.
  
  passed BOOLEAN DEFAULT FALSE,
  passed_at TIMESTAMP,
  notes TEXT,                              -- Feedback del agente
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(workspace_id, phase, checkpoint_key)
);

-- Entregables del proyecto
CREATE TABLE project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  type VARCHAR(30) NOT NULL,               -- 'mvp_url', 'repo_url', 'video_url', etc.
  url TEXT,
  file_path TEXT,
  content TEXT,                            -- Para descripciones, pitch text
  
  status VARCHAR(20) DEFAULT 'pending',    -- pending, draft, ready, submitted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para queries frecuentes
CREATE INDEX idx_workspaces_user ON workspaces(user_id);
CREATE INDEX idx_workspaces_status ON workspaces(status);
CREATE INDEX idx_hackathon_deadline ON hackathon_info(deadline);
CREATE INDEX idx_backlog_workspace_status ON backlog_items(workspace_id, status);
```

### 4.3 Diferencias por Modo en Cada Fase

#### Fase 0: Carga de Info

| Aspecto | Guiado | Libre |
|---------|--------|-------|
| Mensaje inicial | Bienvenida + solicita info del hackathon | Bienvenida simple, espera instrucción |
| Opciones | Botones: [Link] [PDF] [Te explico] | Texto libre |
| Validación | Muestra resumen, pide confirmación | Procesa y continúa |
| Si falta info | Pregunta campo por campo | Pregunta una vez |
| Post-confirmación | "¡Perfecto! Pasemos a definir tu idea →" | "Info guardada. ¿Qué sigue?" |

**Prompt del agente (Guiado):**
```
Eres un mentor de hackathon experto. El usuario acaba de activar su 
workspace para el hackathon. Tu primera tarea es recolectar toda la 
información del hackathon para poder guiarlo efectivamente.

COMPORTAMIENTO:
- Saluda con entusiasmo pero sin exagerar
- Pide la información del hackathon (link preferido, PDF aceptable)
- Si te dan un link, extrae TODA la información relevante
- Presenta un resumen y pide confirmación
- Si algo no está claro, pregunta específicamente

LENGUAJE:
- Usa términos simples, nada técnico
- Traduce jerga de hackathon a lenguaje cotidiano
- Celebra pequeños avances

SIGUIENTE PASO:
- Una vez confirmada la info, sugiere pasar a Fase 1 (Ideación)
```

**Prompt del agente (Libre):**
```
Eres un asistente de hackathon disponible cuando el usuario te necesite.
El usuario eligió modo libre — respeta su autonomía.

COMPORTAMIENTO:
- Responde preguntas, no inicies conversaciones
- Si piden info del hackathon, procésala eficientemente
- No fuerces confirmaciones innecesarias
- Ofrece ayuda sin ser intrusivo

LENGUAJE:
- Directo y conciso
- Técnico si el usuario lo usa, simple si no
```

#### Fase 1: Ideación

| Aspecto | Guiado | Libre |
|---------|--------|-------|
| Inicio | "¿Ya tienes idea o exploramos juntos?" | Espera que el usuario mencione su idea |
| Sin idea | Presenta tracks con lenguaje simple, propone 2-3 opciones | Si preguntan, da opciones |
| Validación | Evalúa viabilidad, sugiere ajustes, confirma track | Acepta la idea, sigue adelante |
| Checkpoint | "Tu idea es: [X]. Track: [Y]. ¿Correcto?" | No hay checkpoint explícito |
| Siguiente | "¡Excelente! Vamos a planificar tu MVP →" | Disponible para siguiente paso |

#### Fases 2-5: Desarrollo

| Aspecto | Guiado | Libre |
|---------|--------|-------|
| Visibilidad de backlog | Siempre visible con % completado | Bajo demanda |
| Sugerencia de ticket | "El siguiente ticket es: [X]" | Usuario elige qué hacer |
| Al completar ticket | Celebración + siguiente sugerido | "Listo. ¿Algo más?" |
| Deadlines | Recordatorios proactivos | Solo si quedan <48h |
| Bloqueos | "Veo que llevas 2h en este ticket. ¿Necesitas ayuda?" | No interviene |

#### Fases 6-8: Entrega

| Aspecto | Guiado | Libre |
|---------|--------|-------|
| Materiales | Genera automáticamente y presenta | Genera bajo demanda |
| Video | Guía paso a paso con timestamps | Da el guion, usuario ejecuta |
| Pre-submit | Checklist completo con validación | Lista simple |
| Submit | Guía campo por campo | Usuario hace solo |
| Celebración | Gran celebración final 🎉🎊 | "Listo. Bien hecho." |

---

## 5. APIs Requeridas

### 5.1 Endpoints del Wizard

```typescript
// Crear workspace desde wizard
POST /api/workspaces
Body: {
  context: 'personal',
  subContext: 'hackathon',
  profile: {
    hackathonName: string,
    deadline: string (ISO date),
    hasTeam?: boolean
  },
  agent: {
    name?: string,
    personality: 'profesional' | 'amigable' | 'creativo' | 'tecnico',
    nidiMode: 'guiado' | 'libre'
  }
}
Response: {
  workspaceId: string,
  agentId: string,
  chatUrl: string,
  status: 'provisioning' | 'active'
}

// Polling de estado de provisioning
GET /api/workspaces/:id/status
Response: {
  status: 'provisioning' | 'active' | 'failed',
  progress?: number,  // 0-100
  error?: string
}
```

### 5.2 Endpoints de Fase

```typescript
// Obtener estado actual del proyecto
GET /api/workspaces/:id/progress
Response: {
  currentPhase: number,
  phases: [{
    phase: number,
    name: string,
    status: 'locked' | 'current' | 'completed',
    checkpoints: [{
      key: string,
      passed: boolean,
      passedAt?: string
    }]
  }],
  nidiMode: 'guiado' | 'libre',
  hackathon: {
    nombre: string,
    deadline: string,
    daysRemaining: number
  },
  backlog: {
    total: number,
    completed: number,
    inProgress: number
  }
}

// Avanzar fase (solo en modo guiado con checkpoints pasados)
POST /api/workspaces/:id/advance-phase
Body: {
  fromPhase: number,
  toPhase: number
}
Response: {
  success: boolean,
  newPhase: number,
  unlockedFeatures?: string[]
}

// Cambiar modo NIDI
PUT /api/workspaces/:id/nidi-mode
Body: {
  mode: 'guiado' | 'libre'
}
Response: {
  success: boolean,
  previousMode: string,
  newMode: string
}
```

### 5.3 Endpoints de Hackathon Info (Fase 0)

```typescript
// Extraer info de URL
POST /api/hackathon-info/extract-url
Body: {
  workspaceId: string,
  url: string
}
Response: {
  extracted: HackathonInfo,
  confidence: number,  // 0-1
  missingFields: string[]
}

// Extraer info de PDF/documento
POST /api/hackathon-info/extract-document
Body: FormData {
  workspaceId: string,
  file: File
}
Response: {
  extracted: HackathonInfo,
  confidence: number,
  missingFields: string[]
}

// Confirmar info del hackathon
PUT /api/hackathon-info/:workspaceId/confirm
Body: {
  corrections?: Partial<HackathonInfo>
}
Response: {
  confirmed: true,
  hackathonInfo: HackathonInfo
}
```

### 5.4 Endpoints de Backlog

```typescript
// Obtener backlog del proyecto
GET /api/workspaces/:id/backlog
Query: { status?: string, phase?: number }
Response: {
  items: BacklogItem[],
  stats: {
    total: number,
    byStatus: { pending: n, in_progress: n, done: n },
    byPhase: { 3: n, 4: n, 5: n }
  }
}

// Actualizar estado de ticket
PUT /api/backlog/:itemId/status
Body: {
  status: 'pending' | 'in_progress' | 'done' | 'skipped'
}
Response: {
  item: BacklogItem,
  phaseProgress: {
    phase: number,
    completed: number,
    total: number
  }
}
```

---

## 6. Lógica del Agente: SOUL.md Templates

### 6.1 Base Template para Personal → Hackathon

```markdown
# SOUL.md — Agente de Hackathon

## Identidad
- **Nombre:** {{agent_name}}
- **Rol:** Mentor de hackathon
- **Personalidad:** {{personality}}
- **Modo:** {{nidi_mode}}

## Contexto del Proyecto
- **Hackathon:** {{hackathon_name}}
- **Deadline:** {{deadline}}
- **Días restantes:** {{days_remaining}}

## Comportamiento Core

### Si modo = guiado:
1. Siempre sugiere el siguiente paso
2. Celebra cada checkpoint completado
3. Muestra progreso visual cuando relevante
4. Envía recordatorios de deadline
5. No permite saltar fases sin completar checkpoints

### Si modo = libre:
1. Responde cuando te pregunten
2. No interrumpas innecesariamente
3. Ofrece ayuda sin forzar
4. Permite saltar fases
5. Solo alerta en deadlines críticos (<48h)

## Fases Actuales
- **Fase actual:** {{current_phase}}
- **Siguiente checkpoint:** {{next_checkpoint}}

## Reglas de Lenguaje
- NUNCA uses jerga técnica sin traducir
- Si algo es técnico, hazlo tú o explica en simple
- Celebra victorias pequeñas
- Sé directo pero empático

## Traducciones Obligatorias
| Técnico | Usar esto |
|---------|-----------|
| Deploy | "Publicar" / "Compartir con el mundo" |
| Repository | "Donde se guarda tu código" |
| Frontend | "Lo que la gente ve" |
| Backend | "Lo que hace que funcione" |
| API | (no mencionar, solo hacer) |
| Build | "Preparar para publicar" |
```

### 6.2 Variaciones por Personalidad

**Profesional:**
```markdown
## Tono
- Directo y eficiente
- Enfocado en resultados
- Mínimo "filler" conversacional
- Respuestas estructuradas
```

**Amigable:**
```markdown
## Tono
- Cálido y cercano
- Usa emojis moderadamente (2-3 por mensaje)
- Celebra logros con entusiasmo
- Hace el proceso divertido
```

**Creativo:**
```markdown
## Tono
- Inspirador y energético
- Propone ideas fuera de lo común
- Usa metáforas y analogías
- Enfocado en la visión, no solo la ejecución
```

**Técnico:**
```markdown
## Tono
- Preciso y detallado
- Explica el "por qué" técnico cuando es útil
- Asume más conocimiento base
- Ofrece opciones avanzadas
```

---

## 7. Métricas y Analytics

### 7.1 Eventos a Trackear

```typescript
// Eventos de wizard
track('wizard_started', { context: 'personal', subContext: 'hackathon' });
track('wizard_completed', { workspaceId, timeToComplete: ms, nidiMode });

// Eventos de NIDI
track('nidi_mode_changed', { workspaceId, from: 'guiado', to: 'libre' });

// Eventos de fase
track('phase_started', { workspaceId, phase: number });
track('phase_completed', { workspaceId, phase: number, duration: ms });
track('checkpoint_passed', { workspaceId, phase, checkpoint });

// Eventos de engagement
track('user_stuck', { workspaceId, phase, timeInPhase: ms });
track('help_requested', { workspaceId, phase, topic });
track('deadline_reminder_sent', { workspaceId, daysRemaining });

// Eventos de outcome
track('project_submitted', { workspaceId, hackathonName, totalDuration: ms });
track('project_abandoned', { workspaceId, lastPhase, daysSinceActivity });
```

### 7.2 Dashboards de Métricas

**Funnel de Conversión:**
```
Wizard iniciado
    → Wizard completado (% conversion)
        → Fase 0 completada (% de activos)
            → Fase 4 completada (% que llegan a MVP)
                → Fase 8 completada (% que hacen submit)
```

**Métricas de NIDI:**
- % que eligen Guiado vs Libre inicialmente
- % que cambian de modo (y en qué dirección)
- Completion rate por modo
- Time-to-submit por modo

**Métricas de Retención:**
- Usuarios activos por día
- Días promedio entre primera y última actividad
- Tasa de abandono por fase
- Puntos de fricción (fases con mayor dropout)

---

## 8. Casos de Error y Recovery

### 8.1 Errores de Provisioning

```typescript
// Si falla la creación del workspace
if (provisioningStatus === 'failed') {
  // Mostrar mensaje amigable
  "Tuvimos un problema creando tu espacio de trabajo.
   ¿Quieres intentar de nuevo?"
  
  // Botones: [Reintentar] [Contactar soporte]
  
  // Log para debugging
  logError('provision_failed', { workspaceId, error, retryCount });
}
```

### 8.2 Deadline Pasado

```typescript
// Si el deadline ya pasó
if (hackathonInfo.deadline < today) {
  // Modo guiado: Mensaje empático
  "El deadline de {{hackathon}} ya pasó. 
   ¿Quieres continuar el proyecto de todas formas,
   o prefieres archivarlo?"
  
  // Opciones: [Continuar] [Archivar] [Buscar otro hackathon]
}
```

### 8.3 Usuario Inactivo

```typescript
// Después de 3 días sin actividad (modo guiado)
if (daysSinceActivity >= 3 && nidiMode === 'guiado') {
  sendNotification({
    type: 'gentle_nudge',
    message: "¡Hey! Vi que no has avanzado en tu proyecto.
              ¿Todo bien? Estoy aquí para ayudarte si estás atorado."
  });
}

// Después de 14 días sin actividad (cualquier modo)
if (daysSinceActivity >= 14) {
  workspace.status = 'abandoned';
  sendNotification({
    type: 'project_paused',
    message: "Tu proyecto ha sido pausado por inactividad.
              Puedes reactivarlo cuando quieras desde tu dashboard."
  });
}
```

---

## 9. Checklist de Implementación

### 9.1 Prioridad Alta (P0)

- [ ] Schema de BD: `workspaces`, `hackathon_info`, `phase_checkpoints`
- [ ] API: `POST /workspaces` con provisioning
- [ ] NIDI toggle en chat (`activar/desactivar modo guiado`)
- [ ] Prompts del agente para Fase 0 y Fase 1
- [ ] Extracción de info de hackathon (URL básico)

### 9.2 Prioridad Media (P1)

- [ ] Dashboard "Mi Proyecto" con progreso visual
- [ ] API: `GET /workspaces/:id/progress`
- [ ] Prompts del agente para Fases 2-5
- [ ] Sistema de backlog/tickets
- [ ] Recordatorios de deadline

### 9.3 Prioridad Baja (P2)

- [ ] Extracción de PDF avanzada
- [ ] Analytics dashboard para métricas
- [ ] Prompts del agente para Fases 6-8
- [ ] Notificaciones push/email
- [ ] Celebraciones animadas

---

## 10. Referencias

- `flows/hackathon-flow.md` — Documento de fases detalladas
- `onboarding-flow-integrado.md` — Wizard completo
- `research/vibecoding-user-research.md` — Insights de usuarios
- `architecture/provisioning-flow.md` — Sistema de provisioning

---

*Documento creado: 2026-03-06*
*Autor: Fruterito*
*Versión: 1.0*
