# 🎓 BOOTCAMP FLOW — Fases Detalladas para Mentores

> **Propósito:** Guía definitiva para mentores de bootcamp. Cada fase tiene checkpoints claros para identificar quién avanza, quién está atorado, y exactamente qué hacer.

---

## 📊 Resumen de Fases

| Fase | Nombre | Duración | Checkpoint Principal |
|------|--------|----------|---------------------|
| 0 | Pre-Bootcamp | Antes de iniciar | Ambiente listo, puede ejecutar "Hola Mundo" |
| 1 | Primera Victoria | Sesión 1 | Algo visible funcionando en pantalla |
| 2 | Fundamentos | Sesiones 1-2 | Entiende el loop básico de desarrollo |
| 3 | Práctica Guiada | Sesiones 2-3 | Completa ejercicios con andamiaje |
| 4 | Práctica Semi-Independiente | Sesiones 3-4 | Resuelve variaciones sin copiar |
| 5 | Planificación de Proyecto | Sesión 4 | Tiene plan escrito de qué va a construir |
| 6 | Desarrollo de Proyecto | Sesiones 4-5 | Avanza en su proyecto con ayuda |
| 7 | Completación | Sesión 5 | Proyecto funcional y deployado |
| 8 | Cierre y Siguiente Paso | Post-sesión 5 | Sabe qué hacer después del bootcamp |

---

## 🔴 FASE 0: Pre-Bootcamp (Setup)

### Objetivo
El estudiante tiene todo instalado y configurado ANTES de la primera sesión.

### Por qué es crítica
> El 40% del dropout ocurre porque la gente llega a la primera sesión y no puede ni empezar. Se frustran y no regresan.

### Checklist del Estudiante
- [ ] Cuenta creada en la plataforma
- [ ] Herramientas instaladas (VS Code, Node, etc.)
- [ ] Puede abrir terminal/consola
- [ ] Ejecutó el comando de prueba exitosamente
- [ ] Sabe dónde preguntar si algo falla

### Entregable Verificable
```
Screenshot de: "Hola Mundo" corriendo en su máquina
```

### 🚨 Señales de Atorado
| Señal | Qué significa | Urgencia |
|-------|---------------|----------|
| No completó checklist 24h antes | Probablemente no va a llegar listo | 🔴 ALTA |
| "No me deja instalar X" | Problema de permisos/sistema | 🔴 ALTA |
| No responde a recordatorios | Puede que ya se haya dado de baja mentalmente | 🟡 MEDIA |
| "Lo hago luego" | Subestima el tiempo requerido | 🟡 MEDIA |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| No completa 48h antes | Mensaje directo preguntando si necesita ayuda |
| Error de instalación | Sesión 1:1 de 15 min o video de troubleshooting |
| No responde | Un recordatorio más, luego marcarlo como "en riesgo" |
| Todo bien | Mensaje de confirmación: "¡Listo! Te veo el [fecha]" |

### ✅ Checkpoint de Completación
**El estudiante puede responder SÍ a:**
1. ¿Puedes abrir tu editor de código?
2. ¿Puedes abrir una terminal?
3. ¿Pudiste ver "Hola Mundo" en tu navegador/terminal?

---

## 🟡 FASE 1: Primera Victoria

### Objetivo
El estudiante experimenta el "¡Wow, yo hice eso!" en los primeros 30 minutos.

### Por qué es crítica
> La primera victoria determina si el estudiante cree que puede lograrlo. Sin ese momento, el resto del bootcamp es cuesta arriba.

### Características de una Buena Primera Victoria
- Sucede en < 30 minutos
- Es VISUAL (algo en pantalla)
- El estudiante hizo algo (no solo vio)
- Es impresionante para su nivel ("¿Yo hice eso?")

### Ejemplos por Tipo de Bootcamp
| Tipo | Primera Victoria |
|------|------------------|
| Web Development | Su nombre aparece grande en una página web |
| AI/Chatbots | El bot responde a su primer mensaje |
| Mobile | App dice "Hola [su nombre]" en su teléfono |
| Data | Gráfica de sus propios datos |
| Blockchain | Su wallet tiene un NFT de prueba |

### Entregable Verificable
```
Screenshot o link de: algo funcionando que el estudiante modificó
```

### 🚨 Señales de Atorado
| Señal | Qué significa | Urgencia |
|-------|---------------|----------|
| "No me corre nada" | Problema de setup que no se resolvió en Fase 0 | 🔴 ALTA |
| Silencio total en los primeros 20 min | Probablemente atorado pero no pregunta | 🔴 ALTA |
| "No entiendo qué tengo que hacer" | Instrucciones no claras o estudiante perdido | 🟡 MEDIA |
| Hace preguntas pero no avanza | Puede estar overthinking | 🟡 MEDIA |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| No corre | Prioridad #1: resolver en vivo, aunque tome tiempo |
| Silencio | Preguntar directamente: "¿Ya viste algo en tu pantalla?" |
| No entiende | Simplificar: "Solo haz ESTO, ignora todo lo demás" |
| Overthinking | "No necesitas entender todo ahorita. Solo hazlo." |

### ✅ Checkpoint de Completación
**El estudiante:**
1. Tiene algo visible corriendo
2. Cambió al menos UNA cosa y vio el cambio
3. Expresó algo positivo ("¡Funciona!", "¡Cool!", emoji de celebración)

---

## 🟢 FASE 2: Fundamentos

### Objetivo
El estudiante entiende el LOOP básico de desarrollo: cambiar → guardar → ver resultado.

### Por qué es crítica
> Si no internaliza el loop, cada ejercicio se siente como empezar de cero. El loop es el músculo que se entrena.

### Conceptos que Debe Entender (sin memorizar)
1. **Dónde está el código** — Qué archivo modificar
2. **Cómo ver cambios** — Refresh, hot reload, o re-run
3. **Qué hacer si algo falla** — A quién preguntar, dónde buscar

### Lo que NO necesita entender todavía
- Cómo funciona por dentro
- Mejores prácticas
- Arquitectura
- "La forma correcta"

### Entregable Verificable
```
El estudiante hizo 3+ cambios por su cuenta y vio los resultados
```

### 🚨 Señales de Atorado
| Señal | Qué significa | Urgencia |
|-------|---------------|----------|
| "Cambié algo y no pasó nada" | No está guardando o no está refrescando | 🟡 MEDIA |
| "¿Qué archivo abro?" | Perdido en la estructura | 🟡 MEDIA |
| "Se rompió todo" | Hizo un cambio que causó error | 🟡 MEDIA |
| "Esto es muy difícil" | Frustración acumulada | 🔴 ALTA |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| No ve cambios | Verificar: ¿Guardaste? ¿Refrescaste? (90% de las veces es eso) |
| Perdido en archivos | "Solo enfócate en ESTE archivo, ignora los demás" |
| Rompió algo | Ctrl+Z o restaurar. "Normal, a todos nos pasa." |
| Frustración | Pausa, validar: "Es normal. ¿Qué parte te confunde más?" |

### ✅ Checkpoint de Completación
**El estudiante puede:**
1. Hacer un cambio solo (sin que le digan qué teclear)
2. Ver el resultado de su cambio
3. Arreglar un error simple (typo, paréntesis faltante)

---

## 🔵 FASE 3: Práctica Guiada

### Objetivo
El estudiante completa ejercicios estructurados con instrucciones paso a paso.

### Por qué es crítica
> Aquí se construye confianza. Cada ejercicio completado = "Sí puedo."

### Características de Buenos Ejercicios Guiados
- Instrucciones numeradas (Paso 1, Paso 2...)
- Resultado esperado claro
- Puntos de verificación ("Si ves X, vas bien")
- Escape hatch ("Si no funciona, haz esto")

### Nivel de Andamiaje
```
ALTO ANDAMIAJE (Fase 3)
├── Paso 1: Abre el archivo X
├── Paso 2: Busca la línea que dice Y
├── Paso 3: Cambia Z por W
├── Paso 4: Guarda y refresca
└── Deberías ver: [screenshot]
```

### Entregable Verificable
```
Capturas de pantalla de 3+ ejercicios completados
```

### 🚨 Señales de Atorado
| Señal | Qué significa | Urgencia |
|-------|---------------|----------|
| "Hice todo pero no se ve igual" | Algún paso falló silenciosamente | 🟡 MEDIA |
| "Me salté al paso 5" | Quiere ir más rápido, puede perderse | 🟡 MEDIA |
| "No encuentro la línea X" | El código base cambió o está en otro lugar | 🔴 ALTA |
| No entrega ejercicios | Puede estar atorado sin decirlo | 🔴 ALTA |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| Resultado diferente | Revisar paso por paso: "Muéstrame tu pantalla" |
| Se saltó pasos | "Vuelve al paso X, los necesitas todos" |
| Código diferente | Darle el código actualizado o ajustar instrucciones |
| No entrega | Check-in directo: "¿Cómo vas con el ejercicio?" |

### ✅ Checkpoint de Completación
**El estudiante:**
1. Completó todos los ejercicios asignados
2. Sus resultados se ven como los esperados
3. Puede explicar (en sus palabras) qué hizo cada ejercicio

---

## 🟣 FASE 4: Práctica Semi-Independiente

### Objetivo
El estudiante aplica lo aprendido a VARIACIONES sin copiar exactamente.

### Por qué es crítica
> La diferencia entre "seguir instrucciones" y "saber hacer". Esta fase revela quién realmente entendió.

### Características de Buenos Ejercicios de Variación
- Mismo concepto, diferente contexto
- "Ahora haz lo mismo pero con X"
- Menos pasos explícitos
- Más decisiones del estudiante

### Nivel de Andamiaje (reducido)
```
MEDIO ANDAMIAJE (Fase 4)
├── Objetivo: Crear un botón que haga Y
├── Pista: Usa lo que aprendiste en el ejercicio anterior
├── Si te atoras: [link a documentación o ejemplo]
└── Entrega: Screenshot funcionando
```

### Entregable Verificable
```
Ejercicio de variación completado SIN copiar código exacto
```

### 🚨 Señales de Atorado
| Señal | Qué significa | Urgencia |
|-------|---------------|----------|
| "¿Cómo empiezo?" | No sabe transferir conocimiento | 🟡 MEDIA |
| Código idéntico al ejemplo | Copió en lugar de adaptar | 🟡 MEDIA |
| "Es que en el otro era diferente" | No ve el patrón común | 🟡 MEDIA |
| Mucho tiempo sin entregar | Probablemente atorado | 🔴 ALTA |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| No sabe empezar | "¿Qué parte del ejercicio anterior se parece a esto?" |
| Copió exacto | "Funciona, pero ¿puedes hacerlo con [variación]?" |
| No ve el patrón | Explicar el concepto abstracto, no solo el código |
| Atorado mucho tiempo | Mini-sesión de pair programming |

### ✅ Checkpoint de Completación
**El estudiante:**
1. Resolvió la variación sin copiar línea por línea
2. Puede explicar POR QUÉ funciona (aunque sea simplificado)
3. Intentó cosas por su cuenta antes de pedir ayuda

---

## 🟤 FASE 5: Planificación de Proyecto

### Objetivo
El estudiante define QUÉ va a construir para su proyecto final.

### Por qué es crítica
> Sin un plan claro, el proyecto se vuelve una fuente de ansiedad en lugar de emoción. "No sé qué hacer" paraliza.

### Componentes del Plan
1. **Idea en una oración** — "Quiero hacer X que hace Y"
2. **Lista de features** — Máximo 3-5 features core
3. **Priorización** — ¿Cuál es el MVP mínimo?
4. **Lo que NO va a tener** — Igual de importante

### Template de Plan de Proyecto
```markdown
# Mi Proyecto: [Nombre]

## ¿Qué es?
[Una oración describiendo tu proyecto]

## Features Principales (máximo 5)
1. [ ] Feature más importante
2. [ ] Segundo más importante
3. [ ] ...

## MVP Mínimo (lo que TIENE que funcionar)
- [ ] ...
- [ ] ...

## Nice-to-have (si sobra tiempo)
- ...

## Lo que NO voy a hacer (por ahora)
- ...
```

### Entregable Verificable
```
Documento con plan de proyecto completado
```

### 🚨 Señales de Atorado
| Señal | Qué significa | Urgencia |
|-------|---------------|----------|
| "No se me ocurre nada" | Parálisis por opciones infinitas | 🔴 ALTA |
| Proyecto demasiado ambicioso | No entiende el scope realista | 🟡 MEDIA |
| Proyecto demasiado simple | Miedo a fallar, juega seguro | 🟡 MEDIA |
| "Quiero hacer todo" | No sabe priorizar | 🟡 MEDIA |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| Sin ideas | Dar 3 opciones concretas basadas en sus intereses |
| Muy ambicioso | "¿Cuál es lo MÁS importante? Empecemos por ahí." |
| Muy simple | "¿Qué feature extra te emociona? Agrégale eso." |
| Quiere todo | "Si solo pudieras hacer UNA cosa, ¿cuál sería?" |

### ✅ Checkpoint de Completación
**El estudiante:**
1. Tiene un plan escrito (no solo en la cabeza)
2. El MVP tiene máximo 3 features core
3. El mentor aprobó el scope como realista

---

## ⚫ FASE 6: Desarrollo de Proyecto

### Objetivo
El estudiante construye su proyecto con soporte del mentor.

### Por qué es crítica
> Aquí se aplica TODO lo aprendido. Es donde el "entender" se convierte en "saber hacer".

### Estructura de Soporte Recomendada
- **Check-ins diarios** — "¿Qué hiciste ayer? ¿Qué vas a hacer hoy? ¿Bloqueado en algo?"
- **Office hours** — Horarios fijos para preguntas
- **Canal de ayuda** — Donde pueden pedir ayuda asíncrona

### Niveles de Ayuda (escalamiento)
```
Nivel 1: Documentación/recursos
Nivel 2: Pista/dirección
Nivel 3: Ejemplo de código similar
Nivel 4: Pair programming
Nivel 5: Mentor resuelve el bloqueo específico
```

### Entregable Verificable
```
Avance visible diario (commit, screenshot, demo)
```

### 🚨 Señales de Atorado
| Señal | Qué significa | Urgencia |
|-------|---------------|----------|
| Sin commits en 24h+ | Probablemente bloqueado | 🔴 ALTA |
| "Sigo en lo mismo" | Atorado en un problema específico | 🔴 ALTA |
| "Ya casi" (por días) | Scope creep o perfeccionismo | 🟡 MEDIA |
| Muchas preguntas básicas | Fundamentos no quedaron claros | 🟡 MEDIA |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| Sin avance | Check-in inmediato: "¿Qué te está deteniendo?" |
| Atorado en problema | Subir nivel de ayuda (ver escalamiento) |
| "Ya casi" infinito | "Muéstrame lo que tienes. ¿Qué falta EXACTAMENTE?" |
| Preguntas básicas | "Vamos a repasar X juntos, creo que te ayuda" |

### Seguimiento Recomendado (para mentores)
```markdown
| Estudiante | Día 1 | Día 2 | Día 3 | Status |
|------------|-------|-------|-------|--------|
| María      | ✅ MVP base | ✅ Feature 1 | 🔄 Feature 2 | 🟢 On track |
| Juan       | ✅ MVP base | ❌ Sin avance | ❌ Sin avance | 🔴 Bloqueado |
| Ana        | ✅ MVP base | ✅ Feature 1 | ✅ Feature 2 | 🟢 Adelantada |
```

### ✅ Checkpoint de Completación
**El estudiante:**
1. Tiene MVP funcionando (features core)
2. Hizo commits regulares
3. Puede hacer una demo básica de su proyecto

---

## ⚪ FASE 7: Completación

### Objetivo
El proyecto está TERMINADO y DEPLOYADO (publicado).

### Por qué es crítica
> Un proyecto terminado vale 10x más que uno "casi listo". El deployment es la graduación real.

### Definición de "Terminado"
1. **Funciona** — Las features core hacen lo que deben
2. **Es accesible** — Alguien más puede verlo (link público)
3. **Está documentado** — README mínimo: qué es, cómo usarlo
4. **El estudiante puede explicarlo** — Sabe qué hizo y por qué

### Checklist de Completación
- [ ] Proyecto corre sin errores críticos
- [ ] Deployado en alguna plataforma (Vercel, Netlify, etc.)
- [ ] Link público funciona
- [ ] README con descripción básica
- [ ] El estudiante puede hacer una demo de 2 minutos

### Entregable Verificable
```
Link público al proyecto funcionando
```

### 🚨 Señales de Atorado
| Señal | Qué significa | Urgencia |
|-------|---------------|----------|
| "No sé cómo deployar" | Nunca deployó antes, necesita guía | 🔴 ALTA |
| "Tiene un bug que no puedo arreglar" | Bloqueado en algo técnico | 🔴 ALTA |
| "No está perfecto todavía" | Perfeccionismo, no va a terminar nunca | 🟡 MEDIA |
| "Se me acabó el tiempo" | Mala planificación o scope muy grande | 🔴 ALTA |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| No sabe deployar | Sesión guiada paso a paso, es prioridad |
| Bug bloqueante | Pair programming para resolverlo |
| Perfeccionismo | "Deployamos esto AHORA. Mejoras después." |
| Sin tiempo | "¿Qué podemos QUITAR para que funcione?" |

### ✅ Checkpoint de Completación
**El estudiante:**
1. Tiene un link público que funciona
2. Puede mostrar su proyecto en < 2 minutos
3. Siente orgullo de lo que hizo (validación emocional)

---

## 🔘 FASE 8: Cierre y Siguiente Paso

### Objetivo
El estudiante sabe QUÉ HACER DESPUÉS del bootcamp.

### Por qué es crítica
> El mayor dropout post-bootcamp es "¿Y ahora qué?". Sin dirección, el momentum muere.

### Componentes del Cierre
1. **Reflexión** — ¿Qué aprendiste? ¿Qué fue difícil?
2. **Celebración** — Reconocimiento del logro
3. **Siguiente paso concreto** — UNA cosa específica a hacer después
4. **Recursos para continuar** — A dónde ir para seguir aprendiendo

### Template de Cierre
```markdown
# Mi Cierre de Bootcamp

## Lo que logré
- [Proyecto completado]
- [Skills nuevas]

## Lo más difícil
- [Qué fue un reto]

## Mi siguiente paso (UNO solo)
- [ ] [Acción específica con fecha]

## Recursos para seguir
- [Link 1]
- [Link 2]
```

### Entregable Verificable
```
Documento de cierre completado + compromiso de siguiente paso
```

### 🚨 Señales de Riesgo Post-Bootcamp
| Señal | Qué significa | Acción |
|-------|---------------|--------|
| "No sé qué hacer ahora" | Falta dirección | Dar 2-3 opciones concretas |
| "Fue muy difícil, no creo poder seguir" | Síndrome del impostor | Validar logro, normalizar dificultad |
| Sin compromiso de siguiente paso | Va a perder momentum | Presionar suavemente por UNA acción |

### 👨‍🏫 Acciones del Mentor
| Situación | Qué hacer |
|-----------|-----------|
| Sin dirección | "Basado en lo que te gustó, te recomiendo X" |
| Síndrome impostor | "Mira lo que lograste. Hace [X semanas] no podías hacer nada de esto." |
| Sin compromiso | "¿Qué vas a hacer esta semana? Solo una cosa." |

### ✅ Checkpoint de Completación
**El estudiante:**
1. Completó reflexión de cierre
2. Tiene UN siguiente paso definido con fecha
3. Sabe dónde encontrar ayuda si la necesita

---

## 📋 RESUMEN PARA MENTORES

### Dashboard de Tracking Sugerido

```
| Estudiante | F0 | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | Status |
|------------|----|----|----|----|----|----|----|----|----| -------|
| María      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔄 | ⬜ | ⬜ | 🟢 |
| Juan       | ✅ | ✅ | ✅ | 🔄 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🟡 |
| Ana        | ✅ | ✅ | ❌ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔴 |

✅ = Completado | 🔄 = En progreso | ❌ = Atorado | ⬜ = No iniciado
🟢 = On track | 🟡 = Atrasado pero activo | 🔴 = Necesita intervención
```

### Reglas de Intervención

| Status | Tiempo sin avance | Acción |
|--------|-------------------|--------|
| 🟢 | N/A | Monitorear normal |
| 🟡 | 1-2 días | Check-in: "¿Todo bien? ¿Necesitas algo?" |
| 🔴 | 2+ días | Intervención directa: llamada/sesión 1:1 |

### Frases Útiles para Mentores

**Cuando está atorado:**
- "Muéstrame tu pantalla, vamos a verlo juntos"
- "¿Qué fue lo último que SÍ funcionó?"
- "Vamos paso a paso, ignora todo lo demás"

**Cuando tiene miedo:**
- "Es normal que se sienta difícil"
- "Todos los que saben hacer esto empezaron igual que tú"
- "No tienes que entender todo, solo lo suficiente para avanzar"

**Cuando quiere rendirse:**
- "Ya llegaste hasta aquí. ¿Qué te falta para terminar?"
- "Vamos a hacer UNA cosa más antes de decidir"
- "Mira lo que lograste desde [inicio]. Eso no es poco."

---

## 🎯 MÉTRICAS DE ÉXITO DEL BOOTCAMP

| Métrica | Target Mínimo | Target Ideal |
|---------|---------------|--------------|
| Completion Rate (F7) | 40% | 60%+ |
| Deployment Rate (F7) | 80% de los que llegan | 95% |
| NPS Post-bootcamp | 30+ | 50+ |
| "Sabe qué hacer después" (F8) | 70% | 90% |

---

*Documento creado para mentores de Godinez.ai*
*Basado en datos de VibeCoding Bootcamp (28% completion) y mejores prácticas de educación online*
