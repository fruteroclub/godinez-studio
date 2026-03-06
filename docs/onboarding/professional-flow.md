# Godinez AI — Flujo Profesional
## Del Onboarding a la Entrega
### Contexto: Profesional → Trabajo / Clientes / Empresa — Marzo 2026

---

## 1. Contexto y problema

### 1.1 De dónde viene el usuario

Este flujo corresponde al camino **Profesional** dentro del wizard de onboarding de Godinez AI. El usuario ya completó los pasos del wizard (elección de contexto profesional, tipo de proyecto, perfil mínimo, configuración del agente, y lanzamiento) y ahora aterriza en su primera conversación con el agente.

**Sub-contextos cubiertos:**

| Sub-contexto | Descripción | Ejemplo |
|--------------|-------------|---------|
| Crear contenido | Posts, copy, textos, artículos | Blog post, caption de IG |
| Automatizar | Procesos repetitivos, flujos | Reportes semanales |
| Construir | App, sitio web, landing | Landing de producto |
| Investigar | Datos, mercado, competencia | Análisis de competencia |
| Vender | Estrategia comercial, propuestas | Deck de ventas |
| Organizar | Reportes, gestión, coordinación | Dashboard de proyecto |

### 1.2 Perfil de usuarios

Profesionales que necesitan entregar resultados de calidad en tiempo limitado. Pueden ser:
- Freelancers trabajando para clientes
- Empleados con proyectos internos
- Emprendedores con su propio negocio
- Marketers creando contenido

**Lo que valoran:**
- Rapidez (tienen deadlines)
- Calidad profesional
- Iteración rápida
- Entregables concretos

---

## 2. Modo guiado vs. libre

| Modo | Comportamiento del agente | Para quién es |
|------|---------------------------|---------------|
| **Guiado** | Sigue el flujo de fases, pide validación en cada paso, sugiere mejoras | Primeros proyectos, usuarios que quieren estructura |
| **Libre** | Ejecuta directamente, menos validaciones, más velocidad | Usuarios experimentados, proyectos urgentes |

---

## 3. Fases del flujo profesional

El flujo se organiza en **6 fases** (0-5).

---

### Fase 0 — Brief del proyecto

**Objetivo:** Que el agente entienda exactamente qué necesita entregar el usuario.

**El agente pregunta:**
> «Cuéntame sobre tu proyecto. ¿Qué necesitas entregar y para cuándo?»

**Información a recolectar:**

| Dato | Ejemplo |
|------|---------|
| Tipo de entregable | Landing page |
| Para quién es | Cliente X, mi empresa |
| Deadline | Viernes 15 |
| Contexto adicional | Es para lanzamiento de producto |
| Referencias | "Algo como esta página..." |

**Checkpoint Fase 0:**

| Criterio | Validación |
|----------|------------|
| Entregable claro | Se puede describir en una oración |
| Deadline definido | Fecha específica o rango |
| Contexto suficiente | El agente puede empezar a trabajar |

---

### Fase 1 — Alcance y entregables

**Objetivo:** Definir exactamente qué se va a entregar y qué NO.

**El agente propone:**
> «Basado en lo que me contaste, esto es lo que voy a crear: [lista]. ¿Falta algo? ¿Sobra algo?»

**Elementos del alcance:**
- Lista de entregables concretos
- Qué está incluido
- Qué NO está incluido
- Orden de prioridad

**Checkpoint Fase 1:**

| Criterio | Validación |
|----------|------------|
| Lista aprobada | Usuario confirmó los entregables |
| Prioridades claras | Se sabe qué es más importante |
| Scope cerrado | No hay ambigüedad |

---

### Fase 2 — Primer borrador

**Objetivo:** Generar algo tangible rápidamente para validar dirección.

**El agente dice:**
> «Voy a crear un primer borrador para que lo revises. No es la versión final, es para asegurar que vamos bien.»

**Características del borrador:**
- Rápido (no perfecto)
- Cubre lo esencial
- Fácil de revisar
- Base para iterar

**Checkpoint Fase 2:**

| Criterio | Validación |
|----------|------------|
| Borrador existe | Hay algo tangible para revisar |
| Dirección correcta | Usuario dice "sí, por ahí va" |

---

### Fase 3 — Iteración y feedback

**Objetivo:** Incorporar los cambios que pide el usuario.

**El agente pregunta:**
> «¿Qué te gustaría cambiar? ¿Qué está bien y qué necesita ajustes?»

**Proceso:**
1. Usuario da feedback
2. Agente implementa cambios
3. Presenta nueva versión
4. Repite hasta aprobación

**Checkpoint Fase 3:**

| Criterio | Validación |
|----------|------------|
| Feedback incorporado | Cambios solicitados están hechos |
| Usuario satisfecho | "Sí, así está bien" |

---

### Fase 4 — Versión final

**Objetivo:** Pulir y preparar para entrega.

**El agente dice:**
> «Esta es la versión final. Revisé ortografía, formato y detalles. ¿Aprobado para entregar?»

**Checklist de calidad:**
- Sin errores ortográficos
- Formato correcto
- Todos los elementos incluidos
- Listo para el destinatario

**Checkpoint Fase 4:**

| Criterio | Validación |
|----------|------------|
| Calidad profesional | Puede enviarse a cliente/jefe |
| Aprobación explícita | Usuario dice "aprobado" |

---

### Fase 5 — Entrega y cierre

**Objetivo:** Entregar y documentar para futuros proyectos.

**El agente ayuda con:**
- Formato final (PDF, link, archivo)
- Mensaje de entrega si aplica
- Resumen del proyecto para referencia

**El agente cierra:**
> «¡Proyecto entregado! Si necesitas algo similar en el futuro, ya tengo el contexto. ¿Hay algo más en lo que pueda ayudarte?»

**Checkpoint Fase 5:**

| Criterio | Validación |
|----------|------------|
| Entrega completada | Cliente/jefe recibió el entregable |
| Proyecto cerrado | No hay pendientes |

---

## 4. Resumen visual de fases

| # | Fase | Objetivo | Checkpoint |
|---|------|----------|------------|
| 0 | Brief | Entender qué se necesita | Entregable + deadline claros |
| 1 | Alcance | Definir qué sí y qué no | Lista aprobada |
| 2 | Borrador | Primer entregable rápido | Dirección validada |
| 3 | Iteración | Incorporar feedback | Usuario satisfecho |
| 4 | Final | Pulir para entrega | Aprobación explícita |
| 5 | Entrega | Cerrar proyecto | Entregado exitosamente |

---

## 5. Señales de atorado

| Fase | Señal | Qué hacer |
|------|-------|-----------|
| 0 | "No sé cómo explicarlo" | Hacer preguntas específicas |
| 1 | Scope creep ("también necesito...") | Priorizar y separar fases |
| 2 | Perfeccionismo ("no está listo") | "Es borrador, solo valida dirección" |
| 3 | Cliente no responde | Seguimiento + deadline |
| 4 | Cambios infinitos | "¿Esto es crítico o nice-to-have?" |
| 5 | No sabe cómo entregar | Dar formato y mensaje sugerido |

---

*Documento creado: 2026-03-05*
