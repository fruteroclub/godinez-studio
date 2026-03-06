# GODINEZ AI — Onboarding Flow Integrado
## Del Email a la Primera Victoria
### Flujo Dinámico por Contexto — Marzo 2026

---

## 1. Resumen ejecutivo

Este documento presenta el flujo completo de onboarding de Godinez AI, desde que el usuario recibe el email de invitación hasta que logra su primera victoria con el agente.

### 1.1 Problema identificado

El flujo anterior del wizard presentaba las siguientes fricciones:
- **Orden incorrecto de preguntas:** Se pedía nombre del workspace y datos de perfil antes de entender qué quiere hacer el usuario.
- **Falta de segmentación por contexto:** No distinguía entre usuarios de educación, profesionales o personales.
- **Opciones de necesidades confusas:** 8 opciones que mezclaban acciones con áreas.
- **Campos innecesarios al inicio:** Se pedía información que no es crítica para el primer uso.

### 1.2 Solución propuesta

Un flujo de **5 pasos** basado en el principio de **intención primero**:
1. Entender qué quiere hacer el usuario (mediante selección de cards)
2. Pedir solo los datos mínimos necesarios
3. Configurar el agente con la personalidad adecuada
4. Elegir el modo de acompañamiento (guiado/libre)
5. Completar el perfil de forma conversacional después del lanzamiento

---

## 2. Flujo Pre-Wizard

```mermaid
flowchart TD
    subgraph ACQUISITION["🎯 ACQUISITION"]
        A1["Admin clicks Invitar en waitlist"]
        A2["API genera código BETA-XXXXXX"]
        A3["Resend envía email branded"]
        A4["Waitlist marcado como invited"]
        A1 --> A2 --> A3 --> A4
    end

    subgraph SIGNUP["🔐 SIGNUP"]
        S1["Usuario click Crear mi cuenta"]
        S2{"/sign-up?code=BETA-XXXXXX"}
        S3["Código válido → Formulario Clerk"]
        S4["Código inválido → Campo manual"]
        S5["Crear cuenta"]
        S6["Auto-redeem código"]
        S7["Redirect → /studio"]
        
        S1 --> S2
        S2 -->|válido| S3 --> S5
        S2 -->|inválido| S4 -->|retry| S2
        S5 --> S6 --> S7
    end

    subgraph WORKSPACE["📂 WORKSPACE SELECTOR"]
        W1{"¿Tiene workspaces?"}
        W2["Empty state: Crea tu primer workspace"]
        W3["Lista de workspaces"]
        W4["Click Crear Workspace"]
        
        W1 -->|no| W2 --> W4
        W1 -->|sí| W3
        W3 -->|crear nuevo| W4
    end

    A4 -.->|"email recibido"| S1
    S7 --> WORKSPACE
    W4 --> WIZARD_START

    WIZARD_START(("Iniciar Wizard"))
```

---

## 3. Wizard Paso 1: Contexto de Trabajo

```mermaid
flowchart TD
    subgraph PASO1["PASO 1: Contexto de trabajo"]
        P1["«Elige qué tipo de proyecto vas a iniciar»"]
        
        P1 --> EDU["📚 Educación<br/>Bootcamp, curso, taller"]
        P1 --> PRO["💼 Profesional<br/>Trabajo, clientes, empresa"]
        P1 --> PER["🚀 Personal<br/>Emprendimiento, mi idea, hackathon"]
    end

    EDU --> PASO2_EDU
    PRO --> PASO2_PRO
    PER --> PASO2_PER

    PASO2_EDU(("Paso 2: Educación"))
    PASO2_PRO(("Paso 2: Profesional"))
    PASO2_PER(("Paso 2: Personal"))
```

---

## 4. Wizard Paso 2: Sub-contexto (3 caminos separados)

### Camino A: Si eligió Educación

```mermaid
flowchart TD
    subgraph PASO2_EDU["PASO 2: Sub-contexto Educación"]
        E_Q["¿Qué tipo de programa?"]
        
        E_Q --> E1["🎯 Estoy en un bootcamp o curso<br/>Tiene estructura y fecha límite"]
        E_Q --> E2["🧭 Quiero aprender algo por mi cuenta<br/>Aprendizaje autodirigido"]
    end

    E1 --> PASO3_EDU_BOOT
    E2 --> PASO3_EDU_LIBRE

    PASO3_EDU_BOOT(("Paso 3: Bootcamp/Curso"))
    PASO3_EDU_LIBRE(("Paso 3: Aprender solo"))
```

### Camino B: Si eligió Profesional

```mermaid
flowchart TD
    subgraph PASO2_PRO["PASO 2: Sub-contexto Profesional (multi-select, max 2)"]
        P_Q["¿Qué tipo de proyecto?"]
        
        P_Q --> P1["📝 Crear contenido<br/>Posts, copy, textos"]
        P_Q --> P2["⚙️ Automatizar tareas<br/>Procesos repetitivos, flujos"]
        P_Q --> P3["💻 Construir<br/>App, sitio web, landing"]
        P_Q --> P4["📊 Investigar y analizar<br/>Datos, mercado, competencia"]
        P_Q --> P5["💰 Vender y atender<br/>Estrategia comercial, soporte"]
        P_Q --> P6["📋 Organizar y planear<br/>Reportes, gestión, coordinación"]
    end

    P1 --> PASO3_PRO
    P2 --> PASO3_PRO
    P3 --> PASO3_PRO
    P4 --> PASO3_PRO
    P5 --> PASO3_PRO
    P6 --> PASO3_PRO

    PASO3_PRO(("Paso 3: Profesional"))
```

### Camino C: Si eligió Personal

```mermaid
flowchart TD
    subgraph PASO2_PER["PASO 2: Sub-contexto Personal"]
        R_Q["¿Cuál es tu situación?"]
        
        R_Q --> R1["💡 Emprendimiento / negocio<br/>Tengo una idea que quiero desarrollar"]
        R_Q --> R2["⚡ Hackathon<br/>Evento con fecha límite"]
        R_Q --> R3["🛠️ Proyecto en marcha<br/>Ya tengo algo y quiero avanzar"]
    end

    R1 --> PASO3_PER_EMP
    R2 --> PASO3_PER_HACK
    R3 --> PASO3_PER_PROJ

    PASO3_PER_EMP(("Paso 3: Emprendimiento"))
    PASO3_PER_HACK(("Paso 3: Hackathon"))
    PASO3_PER_PROJ(("Paso 3: Proyecto"))
```

---

## 5. Wizard Paso 3: Perfil Mínimo (6 formularios diferentes)

```mermaid
flowchart TD
    subgraph PASO3["PASO 3: Perfil Mínimo (dinámico)"]
        F1["Educación → Bootcamp/Curso:<br/>• Tu nombre<br/>• Nombre del curso<br/>• Fecha límite"]
        F2["Educación → Aprender solo:<br/>• Tu nombre<br/>• Tema que quieres aprender"]
        F3["Profesional:<br/>• Tu nombre<br/>• Tu rol (6 opciones)"]
        F4["Personal → Emprendimiento:<br/>• Tu nombre<br/>• Describe tu idea en 1 oración"]
        F5["Personal → Hackathon:<br/>• Tu nombre<br/>• Nombre del hackathon<br/>• Fecha límite"]
        F6["Personal → Proyecto:<br/>• Tu nombre<br/>• Nombre del proyecto"]
    end

    F1 --> PASO4
    F2 --> PASO4
    F3 --> PASO4
    F4 --> PASO4
    F5 --> PASO4
    F6 --> PASO4

    PASO4(("Paso 4: Tu Agente"))
```

---

## 6. Wizard Paso 4: Tu Agente

```mermaid
flowchart TD
    subgraph PASO4["PASO 4: Tu Agente"]
        INFO["Tu información:<br/>• Tu nombre<br/>• Nombre del workspace"]
        
        AGENT["Configura tu agente:<br/>• Nombre del agente<br/>• Personalidad"]
        
        subgraph PERSONALIDAD["Personalidad"]
            PROF["Profesional<br/>Directo, formal"]
            AMIG["Amigable ⭐<br/>Cálido, paciente<br/>(recomendado)"]
            CREA["Creativo<br/>Imaginativo"]
            TECH["Técnico<br/>Preciso, detallado"]
        end
        
        subgraph MODO["Modo de acompañamiento"]
            GUIADO["🎯 Guiado<br/>(recomendado)"]
            LIBRE["🔓 Libre"]
        end
        
        INFO --> AGENT
        AGENT --> PERSONALIDAD
        PROF --> MODO
        AMIG --> MODO
        CREA --> MODO
        TECH --> MODO
        GUIADO --> PASO5
        LIBRE --> PASO5
    end

    PASO5(("Paso 5: Revisar"))
```

---

## 7. Wizard Paso 5: Revisar y Lanzar

```mermaid
flowchart TD
    subgraph PASO5["PASO 5: Revisar y Lanzar"]
        REVIEW["Resumen de todo:<br/>• Contexto: [X]<br/>• Sub-contexto: [Y]<br/>• Programa/Proyecto: [Z]<br/>• Agente: [Nombre]<br/>• Personalidad: [X]<br/>• Modo: [Guiado/Libre]"]
        
        WS_NAME["Nombre del workspace<br/>(auto-generado, editable)"]
        
        LAUNCH["🚀 LANZAR"]
        
        REVIEW --> WS_NAME --> LAUNCH
    end

    LAUNCH --> PROVISION
    PROVISION(("Provisioning"))
```

---

## 8. Provisioning y Router

```mermaid
flowchart TD
    subgraph PROVISION["⚙️ PROVISIONING (backend)"]
        PR1["Crear workspace en DB"]
        PR2{"¿Gateway online?"}
        PR3{"¿Slot disponible? (1-15)"}
        PR4["Crear agente en OpenClaw"]
        PR5["Inyectar SOUL.md"]
        PR6["Crear registros en DB"]
        PR7["Crear conversación Onboarding"]
        
        ERR1["⚠️ Servicio no disponible"]
        ERR2["⚠️ Slots ocupados"]
        
        PR1 --> PR2
        PR2 -->|no| ERR1
        PR2 -->|sí| PR3
        PR3 -->|no| ERR2
        PR3 -->|sí| PR4 --> PR5 --> PR6 --> PR7
    end

    PR7 --> ROUTER

    subgraph ROUTER["🔀 ROUTER DE CONTEXTO"]
        R{"¿Qué contexto eligió?"}
        R -->|Educación| EDU_FLOW["📚 EDUCATION FLOW<br/>8 fases (0-7)"]
        R -->|Profesional| PRO_FLOW["💼 PROFESSIONAL FLOW<br/>6 fases (0-5)"]
        R -->|Personal| PER_FLOW["🚀 PERSONAL FLOW<br/>9 fases (0-8)"]
    end

    EDU_FLOW --> CHAT
    PRO_FLOW --> CHAT
    PER_FLOW --> CHAT

    subgraph CHAT["💬 FIRST CHAT"]
        C1["Aterriza en conversación Onboarding"]
        C2["Agente envía welcome contextualizado"]
        C3["Usuario responde o click en acción"]
        C4["Agente guía a FASE 0 del flujo"]
        C5["⭐ TIME TO SMILE ⭐"]
        
        C1 --> C2 --> C3 --> C4 --> C5
    end
```

---

## 9. Flujo Completo Unificado

```mermaid
flowchart TB
    %% ═══════════════════════════════════════════════════
    %% PRE-WIZARD
    %% ═══════════════════════════════════════════════════
    EMAIL["📧 Usuario recibe email"] --> SIGNUP["🔐 Signup con Clerk"]
    SIGNUP --> STUDIO["📂 /studio"]
    STUDIO --> CREATE["Click Crear Workspace"]
    
    %% ═══════════════════════════════════════════════════
    %% PASO 1: CONTEXTO
    %% ═══════════════════════════════════════════════════
    CREATE --> P1{"PASO 1:<br/>¿Qué tipo de proyecto?"}
    
    P1 -->|"📚"| EDU["Educación"]
    P1 -->|"💼"| PRO["Profesional"]
    P1 -->|"🚀"| PER["Personal"]
    
    %% ═══════════════════════════════════════════════════
    %% PASO 2: SUB-CONTEXTO (SEPARADOS)
    %% ═══════════════════════════════════════════════════
    
    %% Camino Educación
    EDU --> P2_EDU{"PASO 2:<br/>¿Qué tipo de programa?"}
    P2_EDU --> EDU_BOOT["Bootcamp o curso"]
    P2_EDU --> EDU_LIBRE["Aprender por mi cuenta"]
    
    %% Camino Profesional
    PRO --> P2_PRO{"PASO 2:<br/>¿Qué tipo de proyecto?"}
    P2_PRO --> PRO_CONTENT["Crear contenido"]
    P2_PRO --> PRO_AUTO["Automatizar"]
    P2_PRO --> PRO_BUILD["Construir"]
    P2_PRO --> PRO_RESEARCH["Investigar"]
    P2_PRO --> PRO_SELL["Vender"]
    P2_PRO --> PRO_ORG["Organizar"]
    
    %% Camino Personal
    PER --> P2_PER{"PASO 2:<br/>¿Cuál es tu situación?"}
    P2_PER --> PER_EMP["Emprendimiento"]
    P2_PER --> PER_HACK["Hackathon"]
    P2_PER --> PER_PROJ["Proyecto en marcha"]
    
    %% ═══════════════════════════════════════════════════
    %% PASO 3: PERFIL MÍNIMO (6 FORMULARIOS)
    %% ═══════════════════════════════════════════════════
    EDU_BOOT --> F1["Form: nombre, curso, fecha"]
    EDU_LIBRE --> F2["Form: nombre, tema"]
    
    PRO_CONTENT --> F3["Form: nombre, rol"]
    PRO_AUTO --> F3
    PRO_BUILD --> F3
    PRO_RESEARCH --> F3
    PRO_SELL --> F3
    PRO_ORG --> F3
    
    PER_EMP --> F4["Form: nombre, idea"]
    PER_HACK --> F5["Form: nombre, hackathon, fecha"]
    PER_PROJ --> F6["Form: nombre, proyecto"]
    
    %% ═══════════════════════════════════════════════════
    %% PASO 4: AGENTE
    %% ═══════════════════════════════════════════════════
    F1 --> P4["PASO 4:<br/>Configura tu agente"]
    F2 --> P4
    F3 --> P4
    F4 --> P4
    F5 --> P4
    F6 --> P4
    
    P4 --> PERS{"Personalidad"}
    PERS --> AMIG["Amigable ⭐"]
    PERS --> PROF_P["Profesional"]
    PERS --> CREA["Creativo"]
    PERS --> TECH["Técnico"]
    
    AMIG --> MODE{"Modo"}
    PROF_P --> MODE
    CREA --> MODE
    TECH --> MODE
    
    MODE --> GUIADO["🎯 Guiado"]
    MODE --> LIBRE["🔓 Libre"]
    
    %% ═══════════════════════════════════════════════════
    %% PASO 5: REVISAR Y LANZAR
    %% ═══════════════════════════════════════════════════
    GUIADO --> P5["PASO 5:<br/>Resumen + Workspace name"]
    LIBRE --> P5
    
    P5 --> LAUNCH["🚀 LANZAR"]
    
    %% ═══════════════════════════════════════════════════
    %% POST-WIZARD
    %% ═══════════════════════════════════════════════════
    LAUNCH --> PROV["⚙️ Provisioning"]
    PROV --> ROUTE{"Router"}
    
    ROUTE -->|"Educación"| FLOW_EDU["📚 Education Flow"]
    ROUTE -->|"Profesional"| FLOW_PRO["💼 Professional Flow"]
    ROUTE -->|"Personal"| FLOW_PER["🚀 Personal Flow"]
    
    FLOW_EDU --> SMILE["⭐ TIME TO SMILE"]
    FLOW_PRO --> SMILE
    FLOW_PER --> SMILE
```

---

## 10. Detalle de cada Paso

### PASO 1 — Contexto de trabajo

**Pregunta:** «Elige qué tipo de proyecto vas a iniciar»

| Icono | Opción | Subtexto |
|-------|--------|----------|
| 📚 | **Educación** | Bootcamp, curso, taller |
| 💼 | **Profesional** | Trabajo, clientes, empresa |
| 🚀 | **Personal** | Emprendimiento, mi idea, hackathon |

---

### PASO 2 — Sub-contexto (dinámico)

#### Si eligió 📚 Educación:

| Opción | Descripción |
|--------|-------------|
| 🎯 Estoy en un bootcamp o curso | Tiene estructura y fecha límite |
| 🧭 Quiero aprender algo por mi cuenta | Aprendizaje autodirigido |

#### Si eligió 💼 Profesional (multi-select, max 2):

| Opción | Ejemplo |
|--------|---------|
| 📝 Crear contenido | Posts, copy, textos |
| ⚙️ Automatizar tareas | Procesos repetitivos |
| 💻 Construir | App, sitio web, landing |
| 📊 Investigar y analizar | Datos, mercado |
| 💰 Vender y atender | Estrategia comercial |
| 📋 Organizar y planear | Reportes, gestión |

#### Si eligió 🚀 Personal:

| Opción | Descripción |
|--------|-------------|
| 💡 Emprendimiento / negocio | Tengo una idea que quiero desarrollar |
| ⚡ Hackathon | Evento con fecha límite |
| 🛠️ Proyecto en marcha | Ya tengo algo y quiero avanzar |

---

### PASO 3 — Perfil mínimo (6 formularios)

| Contexto | Campos |
|----------|--------|
| Educación → Bootcamp/curso | Tu nombre, Nombre del curso, Fecha límite |
| Educación → Aprender solo | Tu nombre, Tema que quieres aprender |
| Profesional | Tu nombre, Tu rol (6 opciones) |
| Personal → Emprendimiento | Tu nombre, Describe tu idea |
| Personal → Hackathon | Tu nombre, Nombre del hackathon, Fecha límite |
| Personal → Proyecto | Tu nombre, Nombre del proyecto |

---

### PASO 4 — Tu agente

**Sección 1: Tu información**
- Tu nombre
- Nombre del workspace (sugerido)

**Sección 2: Configura tu agente**
- Nombre del agente (pre-llenado)
- Personalidad (4 opciones)

| Personalidad | Comportamiento |
|--------------|----------------|
| Profesional | Directo, formal |
| **Amigable ⭐** | Cálido, paciente (recomendado) |
| Creativo | Imaginativo |
| Técnico | Preciso, detallado |

**Sección 3: Modo de acompañamiento**

| Modo | Comportamiento |
|------|----------------|
| 🎯 **Guiado** (recomendado) | Paso a paso, checkpoints, celebración |
| 🔓 Libre | Bajo demanda, sin interrupciones |

---

### PASO 5 — Revisar y lanzar

- Resumen visual de elecciones
- Nombre del workspace (editable)
- Botón «🚀 Lanzar»

---

## 11. Flujos de Acompañamiento

| Contexto | Flow | Fases | Archivo |
|----------|------|-------|---------|
| Educación | Education Flow | 8 (0-7) | education-flow.md |
| Profesional | Professional Flow | 6 (0-5) | professional-flow.md |
| Personal | Personal Flow | 9 (0-8) | hackathon-flow.md |

---

## 12. Time-to-Smile estimado

| Acción | Tiempo | Acumulado |
|--------|--------|-----------|
| Clic en email | 0:05 | 0:05 |
| Código se auto-valida | 0:02 | 0:07 |
| Signup con Clerk | 0:50 | 0:57 |
| Paso 1: Elegir contexto (1 clic) | 0:05 | 1:02 |
| Paso 2: Elegir sub-contexto (1 clic) | 0:05 | 1:07 |
| Paso 3: Nombre + datos mínimos | 0:30 | 1:37 |
| Paso 4: Nombre del agente + personalidad | 0:15 | 1:52 |
| Paso 5: Revisar + Lanzar | 0:10 | 2:02 |
| Provisionamiento del agente | 0:10 | 2:12 |
| Escribir primer mensaje | 0:15 | 2:27 |
| **Agente responde ⭐** | 0:10 | **~2:37** |

---

*Documento: 2026-03-06*
*Basado en: Propuesta de Onboarding Flow v2.0*
