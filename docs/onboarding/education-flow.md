# GODINEZ AI — Flujo Educativo
## Del Onboarding a la Certificación
### Contexto: Educación → Bootcamp / Curso / Taller — Marzo 2026

---

## 1. Contexto y problema

### 1.1 De dónde viene el usuario

Este flujo corresponde al camino **Educación** dentro del wizard de onboarding de Godinez AI. El usuario ya completó los pasos del wizard (elección de contexto, sub-contexto educativo, perfil mínimo, configuración del agente, y lanzamiento) y ahora aterriza en su primera conversación con el agente.

**Sub-contextos cubiertos por este flujo:**

| Sub-contexto | Descripción | Duración típica | Ejemplo |
|--------------|-------------|-----------------|---------|
| **Bootcamp** | Programa intensivo estructurado con múltiples sesiones y proyecto final | 2-12 semanas | VibeCoding Bootcamp |
| **Curso** | Contenido modular con lecciones secuenciales y evaluaciones | 4-16 semanas | Curso de React en Platzi |
| **Taller** | Sesión enfocada en un tema específico con resultado tangible | 1-3 días | Taller de Web3 básico |

Aunque cada formato tiene particularidades, **las fases del acompañamiento son las mismas**. Lo que cambia es la intensidad y duración de cada fase.

### 1.2 Perfil de usuarios (del VibeCoding Bootcamp research)

El análisis del VibeCoding Bootcamp (79 registrados, 40 activos, 25 finalizaron) reveló que el principal problema es **retención, no atracción**. Los usuarios se paralizan cuando pasan de la teoría a la ejecución.

**Estadísticas de dropout:**
```
Inicio      → Semana 1   → Semana 2   → Final
100%        → 53%        → 40%        → 32%
            (-47%)       (-13%)       (-8%)
```

El mayor dropout ocurre **entre el registro y la primera acción concreta**. Después de la primera victoria, la retención mejora significativamente.

#### Lo que los usuarios NO saben (técnicamente):
- Qué es HTML, deploy, GitHub, un framework, localStorage, una API
- Cómo estructurar su aprendizaje de forma efectiva
- Cuánto tiempo dedicar a cada tema
- Cómo saber si realmente entendieron algo

#### Lo que los usuarios SÍ saben:
- Qué quieren aprender («quiero hacer apps»)
- Usar su celular/computadora básico
- Escribir, leer y seguir instrucciones claras
- Que necesitan ayuda para no abandonar

### Necesidades identificadas:

| Necesidad | Descripción |
|-----------|-------------|
| **Estructura clara** | «¿Qué sigue después de esto?» → Roadmap visible |
| **Guía constante** | «Dime qué hago ahora», no «estudia el módulo 3» |
| **Validación** | «¿Entendí bien?» → «Sí, vas perfecto» |
| **Ver progreso** | Visualizar que están avanzando (barra, %, badges) |
| **Desbloqueo** | «No entiendo» → «Te lo explico de otra forma» |
| **Celebración** | «¡Completaste la lección! Vas al 40%» |
| **Accountability** | Recordatorios gentiles si se ausentan |
| **Aplicación práctica** | Ejercicios que demuestren que aprendieron |

### Traducción de términos (regla de oro):

> **Si el usuario tiene que saber algo técnico → El agente lo hace por él.**

| Lenguaje técnico | Lenguaje amigable |
|------------------|-------------------|
| Completar el módulo | Terminar esta parte |
| Hacer el ejercicio práctico | Poner en práctica lo que aprendiste |
| Entregar el assignment | Enviar tu tarea |
| Ver el video de la lección | Ver la explicación |
| Leer la documentación | Leer el material de apoyo |
| Hacer el quiz | Responder unas preguntas rápidas |
| Obtener la certificación | Recibir tu diploma/constancia |
| Hacer el proyecto final | Crear algo real con lo que aprendiste |

---

## 2. Modo guiado vs. libre

Antes de iniciar las fases de aprendizaje, el agente ofrece al usuario elegir su modo de acompañamiento.

| Modo | Comportamiento del agente | Para quién es |
|------|---------------------------|---------------|
| **Guiado** | Lleva de la mano lección por lección. Sugiere cuándo estudiar. Envía recordatorios. Celebra cada avance. No permite saltar contenido sin completar prerequisitos. | Principiantes, personas que necesitan estructura, quienes han abandonado cursos antes |
| **Libre** | Disponible cuando el usuario lo necesite. El usuario elige qué estudiar y cuándo. Sin recordatorios automáticos. Puede saltar lecciones. | Autodidactas, personas con experiencia previa, quienes prefieren ir a su ritmo |

**Nota UX:** El agente presenta el modo guiado como recomendado para usuarios nuevos. El toggle debe ser accesible desde el dashboard y también activable/desactivable con un comando en el chat como «activar modo guiado» o «desactivar modo guiado».

**Diferencia clave vs. Hackathon:** En educación, el modo guiado también incluye **recordatorios de estudio** y **seguimiento de hábitos**, ya que no hay un deadline externo que presione.

---

## 3. Fases del flujo educativo

El flujo se organiza en **8 fases** (0-7). Cada fase tiene un objetivo claro, un checkpoint de validación, y entregables concretos. En modo guiado, el agente lleva al usuario fase por fase. En modo libre, sirven como mapa de referencia.

---

### FASE 0 — Carga de información del programa

**Objetivo:** Que el agente entienda el bootcamp/curso/taller al que el usuario está inscrito.

**Trigger:** Primera interacción después del lanzamiento del workspace.

**Cómo funciona:** El agente abre con un mensaje de bienvenida y pide al usuario que comparta la información del programa educativo. La forma preferida es un link o documento con el temario.

**Ejemplo del agente:**
> «¡Hola Ana! Vamos a preparar todo para tu aprendizaje. Para entender bien el programa y ayudarte mejor, ¿me puedes compartir el link del curso o subirme el temario?»

**Opciones de carga (botones en el chat):**
- **Tengo un link** → el usuario pega la URL y el agente extrae la información
- **Tengo un documento** → el usuario sube un PDF/doc con el temario
- **No tengo nada, te lo explico** → el agente hace preguntas una por una
- **Es un curso conocido** → el agente busca en su base de datos (Platzi, Coursera, etc.)

**Información que el agente extrae/recolecta:**

| Dato | Ejemplo (VibeCoding) | Campo en BD |
|------|---------------------|-------------|
| Nombre del programa | VibeCoding Bootcamp | edu.nombre |
| Tipo | Bootcamp / Curso / Taller | edu.tipo |
| Organizador/Instructor | Frutero Club | edu.organizador |
| Descripción general | Aprende a crear apps con IA | edu.descripcion |
| Duración total | 2 semanas (5 sesiones) | edu.duracion |
| Fecha de inicio | 1 de marzo 2026 | edu.fecha_inicio |
| Fecha de fin | 15 de marzo 2026 | edu.fecha_fin |
| Formato | En vivo + asíncrono / Solo asíncrono | edu.formato |
| Temario/Módulos | Sesión 1, 2, 3, 4, 5 | edu.modulos[] |
| Entregables/Ejercicios | Proyecto final, ejercicios por sesión | edu.entregables |
| Prerequisitos | Ninguno / Conocimientos básicos de X | edu.prerequisitos |
| Certificación | Sí / No | edu.certificacion |
| Comunidad | Discord, Slack, Telegram | edu.comunidad |

**Checkpoint Fase 0:**
El agente presenta un resumen de la información extraída y pide confirmación:
> «Esto es lo que entendí de tu curso: [resumen]. ¿Está correcto? ¿Hay algo que corregir?»

Una vez confirmado, la información se guarda en «Mi Programa» del dashboard.

---

### FASE 1 — Diagnóstico y personalización

**Objetivo:** Entender el nivel actual del usuario, sus metas, y crear un plan de estudio personalizado.

**El agente pregunta:**
> «Antes de empezar, quiero conocerte un poco. Esto me ayuda a adaptar las explicaciones a tu nivel.»

**Diagnóstico (preguntas adaptativas):**

1. **Experiencia previa:**
   - «¿Has programado antes?» → Sí/No/Un poco
   - Si sí: «¿Qué lenguajes o herramientas conoces?»
   - Si no: «¡Perfecto, empezamos desde cero!»

2. **Meta específica:**
   - «¿Qué quieres lograr con este curso?»
   - Opciones: Conseguir trabajo / Proyecto personal / Curiosidad / Subirme el sueldo

3. **Disponibilidad:**
   - «¿Cuántas horas a la semana puedes dedicarle?»
   - Opciones: 2-5h / 5-10h / 10-20h / Más de 20h

4. **Estilo de aprendizaje:**
   - «¿Cómo prefieres aprender?»
   - Opciones: Viendo videos / Leyendo / Haciendo ejercicios / Mezclando todo

5. **Historial de abandono (opcional, con tacto):**
   - «¿Has empezado cursos similares antes?»
   - Si sí: «¿Qué hizo que los dejaras?» → Respuesta libre
   - Esta info ayuda a prevenir los mismos problemas

**Resultado del diagnóstico:**
El agente genera un **perfil de aprendizaje** que se guarda y usa para personalizar:
- Nivel de detalle en explicaciones
- Frecuencia de recordatorios
- Tipo de ejercicios sugeridos
- Tono de comunicación

**Checkpoint Fase 1:**

| Criterio | Validación |
|----------|------------|
| Nivel identificado | Principiante / Intermedio / Avanzado |
| Meta clara | El usuario sabe qué quiere lograr |
| Horario definido | Días y horas tentativas de estudio |
| Plan creado | Roadmap personalizado generado |

**Ejemplo del agente al finalizar:**
> «¡Listo! Basado en lo que me contaste, así vamos a trabajar: [resumen del plan]. Estudiarás [X] horas por semana, y si mantienes ese ritmo, terminarás el [fecha]. ¿Empezamos con la primera lección?»

---

### FASE 2 — Quick Win (Primera victoria)

**Objetivo:** Que el usuario complete algo concreto en los primeros 15-30 minutos. Esto es CRÍTICO para la retención.

**Por qué es importante:**
> Según el research de VibeCoding, el mayor dropout ocurre antes de la primera acción concreta. Un quick win reduce la ansiedad y crea momentum.

**Qué es un Quick Win por tipo de programa:**

| Tipo | Quick Win típico | Tiempo |
|------|-----------------|--------|
| **Bootcamp de código** | "Hola Mundo" funcionando | 15 min |
| **Curso de diseño** | Primer diseño simple exportado | 20 min |
| **Taller de Web3** | Wallet creada y conectada | 10 min |
| **Curso de marketing** | Primera campaña borrador | 25 min |

**Lo que hace el agente:**
1. Identifica el quick win más apropiado del temario
2. Guía paso a paso con instrucciones ULTRA simples
3. Celebra efusivamente al completar
4. Muestra el progreso: «¡Ya completaste el 5%!»

**Ejemplo del agente:**
> «Vamos a hacer tu primer logro AHORA. En los próximos 15 minutos vas a [descripción simple del quick win]. ¿Listo? Empecemos.»

**Durante el Quick Win:**
- Instrucciones de máximo 2 oraciones a la vez
- Confirmación después de cada paso: «¿Funcionó?»
- Si hay error: resolución inmediata sin frustración
- Screenshots o GIFs de referencia cuando ayude

**Checkpoint Fase 2:**

| Criterio | Validación |
|----------|------------|
| Quick win completado | El usuario logró el primer resultado tangible |
| Sin bloqueos | No se quedó atorado más de 5 min en ningún paso |
| Celebración | El usuario recibió reconocimiento del logro |

**El agente celebra:**
> «🎉 ¡LO LOGRASTE! Ya tienes tu primer [resultado]. Esto que acabas de hacer es la base de todo lo demás. ¿Cómo se siente?»

---

### FASE 3 — Progresión estructurada

**Objetivo:** Avanzar por el contenido del programa de forma sistemática, lección por lección.

**Cómo funciona:**

El agente presenta el contenido en **bloques manejables**:
- Cada lección tiene: Explicación → Ejemplo → Práctica → Validación
- No avanza hasta que el usuario confirma que entendió
- Ofrece explicaciones alternativas si algo no queda claro

**Estructura de cada lección:**

```
1. CONTEXTO (30 seg)
   "Hoy vamos a aprender [tema]. Esto te sirve para [aplicación práctica]."

2. EXPLICACIÓN (5-15 min)
   Contenido adaptado al nivel del usuario.
   Usa analogías simples para conceptos complejos.

3. EJEMPLO (2-5 min)
   "Mira cómo se ve esto en la práctica: [ejemplo]"

4. PRÁCTICA (10-30 min)
   "Ahora hazlo tú. [instrucciones del ejercicio]"

5. VALIDACIÓN (2 min)
   "¿Funcionó? ¿Hay algo que no quedó claro?"

6. CIERRE (1 min)
   "¡Excelente! Completaste [lección]. Siguiente: [preview]"
```

**Manejo de bloqueos:**

Si el usuario dice "no entiendo" o "no funciona":

1. **Reformular:** Explicar de otra manera
2. **Descomponer:** Dividir en pasos más pequeños
3. **Ejemplo extra:** Mostrar otro caso similar
4. **Analogía:** Conectar con algo que ya conocen
5. **Pausa:** "¿Quieres tomar un break y volver después?"

**Recordatorios (solo en modo guiado):**

| Situación | Acción del agente |
|-----------|-------------------|
| No entra en 2 días | Mensaje gentil: "¡Hola! ¿Todo bien? Te esperamos para continuar" |
| No entra en 5 días | Mensaje de preocupación: "¿Necesitas ayuda con algo?" |
| No entra en 10 días | Mensaje de reenganche: "Entiendo que la vida pasa. ¿Quieres retomar desde donde quedaste?" |

**Checkpoint Fase 3:**

| Criterio | Validación |
|----------|------------|
| Lecciones completadas | X de Y lecciones del módulo |
| Ejercicios entregados | Práctica de cada lección realizada |
| Sin lagunas | Usuario confirma que entiende cada tema |

---

### FASE 4 — Práctica y aplicación

**Objetivo:** Consolidar el aprendizaje a través de ejercicios más complejos que integren múltiples conceptos.

**Diferencia con Fase 3:**
- Fase 3: Práctica aislada por tema
- Fase 4: Práctica integradora que combina temas

**Tipos de ejercicios integradores:**

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Mini-proyecto** | Aplicación pequeña que usa 2-3 conceptos | "Crea una calculadora de propinas" |
| **Reto** | Problema con múltiples soluciones | "Mejora este código para que sea más eficiente" |
| **Caso de estudio** | Analizar cómo otros resolvieron algo | "¿Por qué Instagram hizo X?" |
| **Debugging** | Encontrar y arreglar errores | "Este código tiene 3 bugs. Encuéntralos." |

**Lo que hace el agente:**
1. Presenta el ejercicio con contexto claro
2. Da tiempo para intentar solo
3. Ofrece hints si el usuario se atora (no la solución directa)
4. Revisa el resultado y da feedback constructivo
5. Explica la solución óptima después de entregar

**Feedback constructivo:**
> «Tu solución funciona, ¡bien! Hay una forma de hacerlo con menos código. ¿Quieres ver cómo?»

**Checkpoint Fase 4:**

| Criterio | Validación |
|----------|------------|
| Ejercicios integradores | X de Y ejercicios completados |
| Independencia | Usuario resolvió al menos 1 sin ayuda |
| Comprensión profunda | Puede explicar POR QUÉ funciona, no solo QUÉ hace |

---

### FASE 5 — Proyecto final / Proyecto integrador

**Objetivo:** Crear algo real que demuestre dominio de las habilidades aprendidas.

**Nota:** No todos los programas tienen proyecto final. Si no aplica, esta fase se salta.

**Cómo funciona:**

**Paso 1: Definir el proyecto**

El agente pregunta:
> «Es hora de tu proyecto final. Tienes dos opciones: seguir el proyecto sugerido del curso, o crear algo propio. ¿Qué prefieres?»

- **Opción A - Proyecto del curso:** El agente guía paso a paso según las instrucciones oficiales
- **Opción B - Proyecto propio:** El agente ayuda a definir alcance viable

**Paso 2: Planificación**

Similar a Fase 2 del Hackathon Flow:
- Definir MVP del proyecto
- Crear lista de tareas
- Estimar tiempo necesario
- Establecer fecha de entrega

**Paso 3: Desarrollo guiado**

El agente acompaña la construcción:
- Check-ins diarios o por sesión
- Resolución de bloqueos
- Validación de avances parciales

**Paso 4: Revisión y mejora**

Antes de entregar:
- Revisión técnica (¿funciona?)
- Revisión de requisitos (¿cumple con lo pedido?)
- Sugerencias de mejora (nice-to-have)

**Checkpoint Fase 5:**

| Criterio | Validación |
|----------|------------|
| Proyecto funcional | El proyecto hace lo que promete |
| Requisitos cumplidos | Cumple con los criterios del curso |
| Entregado | Subido/compartido según instrucciones |

---

### FASE 6 — Evaluación y certificación

**Objetivo:** Validar el aprendizaje y obtener la certificación (si aplica).

**Tipos de evaluación según programa:**

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| **Quiz automático** | Preguntas de opción múltiple | Quiz de 20 preguntas |
| **Evaluación de proyecto** | Revisión del proyecto final | Rúbrica de calificación |
| **Peer review** | Otros estudiantes evalúan | Intercambio de feedback |
| **Evaluación del instructor** | Revisión humana | Feedback personalizado |
| **Auto-evaluación** | El usuario se evalúa | Checklist de competencias |

**Lo que hace el agente:**

1. **Prepara para la evaluación:**
   > «Antes del examen final, ¿quieres repasar algún tema? Puedo hacerte preguntas de práctica.»

2. **Durante la evaluación (si es quiz):**
   - Presenta preguntas una por una
   - No da respuestas hasta terminar
   - Muestra tiempo restante si aplica

3. **Después de la evaluación:**
   - Muestra resultados
   - Explica respuestas incorrectas
   - Ofrece oportunidad de retake si es posible

**Certificación:**

Si el programa otorga certificación y el usuario aprobó:

> «🎓 ¡FELICIDADES! Completaste [nombre del programa] con una calificación de [X]. Tu certificado está listo. ¿Quieres que te ayude a compartirlo en LinkedIn?»

**Checkpoint Fase 6:**

| Criterio | Validación |
|----------|------------|
| Evaluación completada | Quiz/proyecto evaluado |
| Aprobado | Cumple con el mínimo requerido |
| Certificado emitido | Disponible para descargar/compartir |

---

### FASE 7 — Siguiente paso y cierre

**Objetivo:** Cerrar el ciclo de aprendizaje y proyectar al usuario hacia el siguiente paso.

**Por qué es importante:**
El momento de completar un curso es cuando el usuario está más motivado. Es el mejor momento para:
- Consolidar lo aprendido
- Sugerir siguiente nivel
- Conectar con oportunidades

**Lo que hace el agente:**

**1. Celebración y resumen:**
> «¡Lo lograste! En estas [X semanas] aprendiste [resumen de habilidades]. Empezaste sin saber [A] y ahora puedes hacer [B]. Eso es increíble.»

**2. Reflexión:**
> «¿Qué fue lo que más te gustó? ¿Qué fue lo más difícil? ¿Qué harías diferente?»

**3. Portfolio/Evidencia:**
> «Tienes [X proyectos/ejercicios] que demuestran lo que sabes. ¿Quieres que te ayude a organizarlos en un portfolio?»

**4. Siguiente paso:**

| Situación del usuario | Sugerencia del agente |
|----------------------|----------------------|
| Quiere profundizar | "Hay un curso avanzado de [tema]. ¿Te interesa?" |
| Quiere aplicar | "¿Tienes algún proyecto en mente? Puedo ayudarte a empezar" |
| Busca trabajo | "Puedo ayudarte a preparar tu CV y practicar entrevistas" |
| No sabe qué sigue | "Basado en lo que aprendiste, estas son 3 opciones..." |

**5. Comunidad:**
> «No te vayas sin conectar con la comunidad. En [Discord/Slack] hay otros estudiantes y mentores que pueden ayudarte.»

**Checkpoint Fase 7 (FINAL):**

| Criterio | Validación |
|----------|------------|
| Curso completado | 100% del contenido consumido |
| Reflexión hecha | Usuario compartió feedback |
| Siguiente paso definido | Sabe qué hacer después |
| Conexión mantenida | Se unió a comunidad o tiene forma de contacto |

**El agente se despide:**
> «Fue un gusto acompañarte en este viaje, [nombre]. Recuerda que siempre puedes volver si necesitas repasar algo o si tienes un nuevo proyecto. ¡Éxito en todo! 🚀»

---

## 4. Resumen visual de fases

| # | Fase | Objetivo | Checkpoint clave |
|---|------|----------|------------------|
| 0 | Carga de info del programa | El agente entiende el curso | Info confirmada |
| 1 | Diagnóstico y personalización | Nivel + meta + plan | Plan de estudio creado |
| 2 | Quick Win | Primera victoria tangible | Primer logro completado |
| 3 | Progresión estructurada | Avanzar lección por lección | Lecciones completadas |
| 4 | Práctica y aplicación | Ejercicios integradores | Práctica independiente |
| 5 | Proyecto final | Crear algo real | Proyecto entregado |
| 6 | Evaluación y certificación | Validar aprendizaje | Certificado obtenido |
| 7 | Siguiente paso | Cerrar y proyectar | Camino definido |

---

## 5. Diferencias clave vs. Hackathon Flow

| Aspecto | Hackathon | Educación |
|---------|-----------|-----------|
| **Presión** | Deadline externo fijo | Auto-impuesto, flexible |
| **Entregable** | Un proyecto para submit | Múltiples ejercicios + proyecto |
| **Evaluación** | Jueces externos | Quizzes, auto-eval, instructor |
| **Motivación** | Premios, competencia | Aprendizaje, certificación, carrera |
| **Duración** | 1-4 semanas intensas | Semanas a meses, ritmo variable |
| **Recordatorios** | Menos necesarios (deadline) | Críticos para retención |
| **Quick Win** | Después de ideación | ANTES de todo (Fase 2) |
| **Comunidad** | Opcional | Muy importante para retención |

---

## 6. Adaptaciones por tipo de programa

### Bootcamp (intensivo)
- Recordatorios más frecuentes
- Check-ins diarios
- Énfasis en no quedarse atrás
- Comunidad muy activa

### Curso (ritmo propio)
- Recordatorios semanales
- Flexibilidad para pausar
- Contenido siempre disponible
- Menos presión social

### Taller (corto)
- Sin recordatorios (muy corto)
- Todo en 1-3 sesiones
- Quick win es casi todo el taller
- Proyecto = resultado del taller

---

## 7. Datos que el agente necesita guardar

### Por Programa (edu.*)
```
edu.nombre, edu.tipo, edu.organizador
edu.descripcion, edu.duracion
edu.fecha_inicio, edu.fecha_fin
edu.formato, edu.modulos[]
edu.entregables, edu.prerequisitos
edu.certificacion, edu.comunidad
```

### Por Usuario (usuario.*)
```
usuario.nivel (principiante/intermedio/avanzado)
usuario.meta, usuario.horas_semana
usuario.estilo_aprendizaje
usuario.historial_abandono
usuario.modo (guiado/libre)
```

### Por Progreso (progreso.*)
```
progreso.fase_actual
progreso.lecciones_completadas[]
progreso.ejercicios_completados[]
progreso.tiempo_total_estudio
progreso.racha_dias
progreso.ultimo_acceso
progreso.bloqueos[] (para análisis)
```

---

*Documento creado: 2026-03-05*
*Contexto: Educación → Bootcamp / Curso / Taller*
