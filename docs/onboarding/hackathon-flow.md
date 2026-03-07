# GODINEZ AI — Flujo de Hackathon
## Del Onboarding al Submit
### Contexto: Personal → Hackathon — Marzo 2026

---

## 1. Contexto y problema

### 1.1 De dónde viene el usuario

Este flujo corresponde al camino **Personal → Hackathon** dentro del wizard de onboarding de Godinez AI. El usuario ya completó los 5 pasos del wizard (elección de contexto, sub-contexto, perfil mínimo con nombre del hackathon y fecha límite, configuración del agente, y lanzamiento) y ahora aterriza en su primera conversación con el agente.

### 1.2 Perfil de usuarios (del VibeCoding Bootcamp research)

El análisis del VibeCoding Bootcamp (79 registrados, 40 activos, 25 finalizaron) reveló que el principal problema es **retención, no atracción**. Los usuarios se paralizan cuando pasan de la teoría a la ejecución. Aunque este research corresponde a un bootcamp específico, los patrones aplican directamente a hackathons: ambos son eventos con fecha límite, entregables concretos y usuarios de niveles mixtos.

#### Lo que los usuarios NO saben (técnicamente):
- Qué es HTML, deploy, GitHub, un framework, localStorage, una API
- Qué es un MVP, cómo se estructura un proyecto de software
- Cómo hacer un video demo o un pitch

#### Lo que los usuarios SÍ saben:
- Qué quieren lograr («quiero una app de mascotas»)
- Usar su celular/computadora básico
- Escribir, leer y seguir instrucciones claras

### Necesidades identificadas:

| Necesidad | Descripción |
|-----------|-------------|
| **Guía constante** | «Dime qué hago ahora», no «haz tu proyecto» |
| **Validación** | «¿Voy bien?» → «Sí, vas bien» |
| **Ver progreso** | Visualizar que están avanzando paso a paso |
| **Desbloqueo** | «No funciona» → «Es porque X, arréglalo así» |
| **Celebración** | «¡Terminaste esta fase! Vas al siguiente paso» |

### Traducción de términos (regla de oro):

> **Si el usuario tiene que saber algo técnico → El agente lo hace por él.**

| Lenguaje técnico | Lenguaje amigable |
|------------------|-------------------|
| Deploy en Vercel | Compartir con el mundo |
| Crear un repositorio en GitHub | Guardar tu proyecto en la nube |
| Hacer el frontend | Crear lo que la gente ve y usa |
| Configurar el backend | Hacer que funcione por dentro |
| Grabar un demo video | Mostrar cómo funciona tu proyecto |
| Hacer el submit en XXXX | Enviar tu proyecto al hackathon |
| Escribir un pitch | Explicar tu idea de forma convincente |

---

## 2. Modo guiado vs. libre

Antes de iniciar las fases de trabajo, el agente ofrece al usuario elegir su modo de acompañamiento. Esta elección se presenta una vez después del lanzamiento, pero puede cambiarse en cualquier momento durante el desarrollo del proyecto.

| Modo | Comportamiento del agente | Para quién es |
|------|---------------------------|---------------|
| **Guiado** | Lleva de la mano paso a paso, con checkpoints, validación y celebración. Muestra progreso visual. Sugiere el siguiente paso siempre. | Principiantes, personas sin experiencia técnica, primera vez en un hackathon |
| **Libre** | Disponible cuando el usuario lo necesite. No interrumpe. Responde preguntas y ayuda bajo demanda. No muestra checkpoints automáticos. | Usuarios experimentados, devs, personas que ya saben cómo trabajar en hackathons |

**Nota UX:** El agente presenta el modo guiado como recomendado para usuarios nuevos. El toggle debe ser accesible desde el dashboard y también activable/desactivable con un comando en el chat como «activar modo guiado» o «desactivar modo guiado».

En modo libre, el usuario puede saltar fases, trabajar en el orden que prefiera, y el agente no bloquea ningún avance. Los checkpoints siguen existiendo como referencia en «Mi Proyecto» pero no generan notificaciones ni interrupciones.

---

## 3. Fases del flujo de hackathon

El flujo se organiza en **8 fases secuenciales** (0-8). Cada fase tiene un objetivo claro, un checkpoint de validación, y entregables concretos. En modo guiado, el agente lleva al usuario fase por fase. En modo libre, sirven como mapa de referencia.

---

### FASE 0 — Carga de información del hackathon

**Objetivo:** Que el agente entienda el hackathon al que el usuario va a participar.

**Trigger:** Primera interacción después del lanzamiento del workspace.

**Cómo funciona:** El agente abre con un mensaje de bienvenida y pide al usuario que comparta la información del hackathon. La forma preferida es un link o documento, ya que la mayoría de hackathons tienen su página en Notion, Devpost, o un PDF con toda la info.

**Ejemplo del agente:**
> «¡Hola Jazz! Vamos a preparar todo para tu hackathon. Para entender bien las reglas, tracks y entregables, ¿me puedes compartir el link de la página del hackathon o subirme un documento con la info?»

**Opciones de carga (botones en el chat):**
- **Tengo un link** → el usuario pega la URL y el agente extrae la información
- **Tengo un documento** → el usuario sube un PDF/doc y el agente lo procesa
- **No tengo nada, te lo explico** → el agente hace preguntas una por una

**Información que el agente extrae/recolecta:**

| Dato | Ejemplo (Bitcoin Hackathon) | Campo en BD |
|------|----------------------------|-------------|
| Nombre del hackathon | Bitcoin 2026 Hackathon | hack.nombre |
| Organizador(es) | BTC, Bitcoin | hack.organizadores |
| Descripción general | Competencia global de innovación en Bitcoin | hack.descripcion |
| Tracks/categorías | exSat, Stacks sBTC, Rebar Data, LayerTwo Labs... | hack.tracks |
| Premios | $30,000+ en total | hack.premios |
| Fecha de inicio | 7 de abril 2025 | hack.fecha_inicio |
| Fecha límite de submit | 20 de mayo 2025 | hack.deadline |
| Plataforma de submit | Devpost | hack.plataforma |
| Entregables requeridos | Prototipo funcional, video demo, repositorio, descripción | hack.entregables |
| Criterios de evaluación | Innovación, usabilidad, ejecución técnica | hack.criterios |
| Reglas clave | Open source, proyectos nuevos, equipos o individual | hack.reglas |

**Checkpoint Fase 0:**
El agente presenta un resumen de la información extraída y pide confirmación:
> «Esto es lo que entendí de tu hackathon: [resumen]. ¿Está correcto? ¿Hay algo que corregir?»

Una vez confirmado, la información se guarda en la sección «Mi Proyecto» del dashboard y el agente puede referenciarla en cualquier fase posterior.

---

### FASE 1 — Ideación y definición del proyecto

**Objetivo:** Que el usuario tenga una idea clara, alineada con un track del hackathon, que pueda explicar en una oración.

**El agente pregunta:**
> «¿Ya tienes una idea de lo que quieres construir, o quieres que exploremos opciones juntos?»

**Camino A — Ya tiene idea:**
- El usuario describe su idea
- El agente la evalúa contra los tracks y criterios del hackathon
- Valida si es viable como MVP en el tiempo disponible
- Sugiere ajustes si es necesario
- Confirma el track al que aplicará

**Camino B — No tiene idea:**
- El agente presenta los tracks disponibles con lenguaje simple
- Pregunta intereses y habilidades del usuario
- Propone 2-3 ideas concretas alineadas a tracks
- El usuario elige una y la refinan juntos

**Checkpoint Fase 1:**

| Criterio | Validación |
|----------|------------|
| Idea clara | El usuario puede explicar su proyecto en 1 oración |
| Track definido | Se identificó a qué track/categoría aplica |
| Viabilidad | Es construible como MVP en el tiempo disponible |

---

### FASE 2 — Planificación y alcance del MVP

**Objetivo:** Definir qué se va a construir, qué NO se va a construir, y dividir el trabajo en tickets/tareas pequeñas.

**Lo que hace el agente:**
- Descompone la idea en funcionalidades core (lo mínimo para que funcione)
- Identifica funcionalidades secundarias (nice-to-have, sólo si hay tiempo)
- Genera un backlog de tickets/tareas priorizadas
- Estima tiempos basados en la fecha límite
- Presenta un plan visual tipo: «Tienes X días. Si haces 1 tarea cada 2 días, llegas bien»

**Ejemplo del agente:**
> «Tu MVP necesita 3 cosas: una pantalla principal, que el usuario pueda interactuar con ella, y que se conecte con [tecnología del track]. Todo lo demás es extra. Voy a crear tus tareas.»

**Checkpoint Fase 2:**

| Criterio | Validación |
|----------|------------|
| Alcance definido | Lista clara de qué incluye el MVP y qué no |
| Backlog creado | Tickets/tareas priorizadas con estimación de tiempo |
| Plan de trabajo | Calendario simple con hitos y fecha límite |

---

### FASE 3 — Diseño y estructura (Frontend)

**Objetivo:** Crear lo que el usuario ve: pantallas, navegación, apariencia visual.

**Lo que hace el agente:**
- Propone la estructura de pantallas basada en el MVP definido
- Genera el diseño visual (wireframe o prototipo funcional)
- Aplica estilos, colores y branding básico
- El usuario valida con clics: «Así me gusta» / «Cambia esto»

**Lenguaje del agente:**
> «Voy a crear las pantallas de tu proyecto. Sólo necesito que me digas: ¿qué colores usar? ¿Diseño moderno o algo más clásico?» (con opciones clickeables)

Si el usuario es diseñador sabrá responder, pero si no tiene experiencia, el agente deberá guiar al usuario.

**Checkpoint Fase 3:**

| Criterio | Validación |
|----------|------------|
| Hay algo visible | El usuario puede ver pantallas/diseño de su proyecto |
| Navegación funciona | Se puede ir de una pantalla a otra |

---

### FASE 4 — Funcionalidad core (Backend + lógica)

**Objetivo:** Hacer que el proyecto funcione: que haga lo que promete.

**Lo que hace el agente:**
- Implementa la lógica principal del MVP ticket por ticket
- Integra la tecnología requerida por el track del hackathon
- Conecta frontend con backend
- Prueba cada funcionalidad y valida con el usuario

**Lenguaje del agente:**
> «Voy a hacer que tu app [haga la función principal]. Cuando termine, te muestro cómo funciona para que la pruebes.»

**Checkpoint Fase 4:**

| Criterio | Validación |
|----------|------------|
| Core funciona | La función principal del proyecto está operativa |
| Tech del track | Se integró la tecnología/API requerida por el hackathon |

---

### FASE 5 — Pulido y testing

**Objetivo:** Que el proyecto funcione sin errores, se vea profesional y alguien más pueda usarlo sin ayuda.

**Lo que hace el agente:**
- Revisa errores y los corrige
- Mejora la apariencia visual si es necesario
- Prueba el flujo completo como si fuera un usuario nuevo
- Sugiere mejoras de UX basadas en los criterios de evaluación del hackathon
- Prepara el deploy/publicación del proyecto

**Checkpoint Fase 5:**

| Criterio | Validación |
|----------|------------|
| Funciona completo | Alguien más puede usarlo sin ayuda |
| Accesible | Tiene un link público para compartir |
| Sin errores críticos | No se rompe durante el uso normal |

---

### FASE 6 — Presentación y pitch

**Objetivo:** Crear los materiales de presentación: pitch deck, texto descriptivo del proyecto, y el guion para el video demo.

**Lo que hace el agente:**
- Genera un pitch deck (presentación) basado en: problema, solución, cómo funciona, tecnología usada, equipo
- Escribe la descripción del proyecto para la plataforma de submit
- Crea el guión del video demo (estructura: elevator pitch → demo del producto → cierre)
- Sugiere la duración óptima según las reglas del hackathon (usualmente 2-3 minutos)

**Lenguaje del agente:**
> «Vamos a preparar tu presentación. Primero necesito que me cuentes con tus palabras: ¿qué hace tu proyecto y por qué es útil? Yo me encargo de convertirlo en un pitch profesional.»

**Checkpoint Fase 6:**

| Criterio | Validación |
|----------|------------|
| Pitch deck listo | Presentación completa con problema, solución, demo, tech |
| Descripción escrita | Texto del proyecto listo para copiar a la plataforma |
| Guion de video | Script del demo video con tiempos y estructura |

---

### FASE 7 — Video demo

**Objetivo:** Grabar y editar el video demo del proyecto.

**Lo que hace el agente:**
- Proporciona el guion creado en la Fase 6 con marcas de tiempo
- Sugiere herramientas de grabación accesibles (Loom, OBS, grabación de pantalla nativa)
- Guía al usuario en la grabación: qué mostrar primero, cuánto tiempo dedicar a cada parte
- Recuerda los requisitos del hackathon (duración máxima, plataforma de upload, formato)
- Ayuda a revisar el video antes de publicarlo

> Según Devpost, los mejores demo videos empiezan con el elevator pitch en los primeros segundos, luego muestran el producto en uso de forma visual e interactiva, y cierran con un resumen del impacto. La mayoría de hackathons piden videos de menos de 3 minutos.

**Checkpoint Fase 7:**

| Criterio | Validación |
|----------|------------|
| Video grabado | Video demo completo dentro del límite de tiempo |
| Video publicado | Subido a YouTube/Vimeo en modo público |

---

### FASE 8 — Submit

**Objetivo:** Completar el formulario de entrega en la plataforma del hackathon y enviar el proyecto exitosamente.

**Lo que hace el agente:**
- Presenta un checklist pre-submit con todos los entregables requeridos por el hackathon
- Verifica que cada entregable esté listo (link del proyecto, repositorio, video, descripción, etc.)
- Proporciona el link al formulario de submit del hackathon
- Guía al usuario campo por campo en el llenado del formulario
- Confirma que el submit se completó exitosamente

**Checklist pre-submit típico:**

| Entregable | Formato | Estado |
|------------|---------|--------|
| Prototipo/MVP funcional | URL pública accesible | ⬜️ Pendiente |
| Repositorio de código | GitHub (público o privado) | ⬜️ Pendiente |
| Video demo | YouTube/Vimeo (público) | ⬜️ Pendiente |
| Descripción del proyecto | Texto (en plataforma de submit) | ⬜️ Pendiente |
| Tags de tecnologías usadas | Lista en plataforma | ⬜️ Pendiente |
| Imagen del proyecto (thumbnail) | JPG/PNG (ratio 3:2) | ⬜️ Pendiente |
| Pitch deck (si aplica) | PDF o link | ⬜️ Pendiente |

**Checkpoint Fase 8 (FINAL):**

| Criterio | Validación |
|----------|------------|
| ⭐️ Submit completo | Formulario enviado exitosamente en la plataforma del hackathon |
| Confirmación | El usuario recibió confirmación de que su proyecto fue recibido |

**El agente celebra:**
> «¡Felicidades Jazz! Tu proyecto ya fue enviado al hackathon. Ahora solo queda esperar los resultados. ¡Lo lograste! 🎉»

---

## 4. Resumen visual de fases

| # | Fase | Objetivo | Checkpoint clave |
|---|------|----------|------------------|
| 0 | Carga de info del hackathon | El agente entiende el hackathon | Info confirmada |
| 1 | Ideación | Idea clara + track definido | Explicable en 1 oración |
| 2 | Planificación del MVP | Alcance + backlog de tickets | Plan de trabajo creado |
| 3 | Frontend / Diseño | Pantallas y navegación | Hay algo visible |
| 4 | Backend / Lógica | Funcionalidad core operativa | Core funciona |
| 5 | Pulido y testing | Sin errores, usable, publicado | Link público accesible |
| 6 | Presentación y pitch | Deck + descripción + guion video | Materiales listos |
| 7 | Video demo | Video grabado y publicado | Video en YouTube/Vimeo |
| 8 | Submit | Formulario enviado | ⭐️ Submit exitoso |

---

*Documento creado: 2026-03-05*
*Fuente: PDF Godinez AI Flujo de Hackathon*
