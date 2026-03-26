# Guía: Prueba de Carga — 5 Usuarios Reales
## Godínez Studio · Pre-launch Test

---

## Objetivo

Medir latencia end-to-end con 5 usuarios enviando mensajes simultáneos al agente, y generar un reporte de comportamiento de la plataforma bajo carga real.

**Duración estimada:** 30-45 minutos  
**Participantes:** 5 usuarios + 3 roles de monitoreo

### Roles el día de la prueba

| Rol | Persona | Herramientas |
|-----|---------|-------------|
| **Coordinador + Monitor UX** | Scarf | Clarity, PostHog, señales de inicio/fin |
| **Monitor Infra** | Mel | Railway Dashboard (Metrics tab), Railway logs |
| **Monitor Logs/DB** | Kukulcán | `railway logs --tail` en tiempo real, psql DB connections, reporte final |
| **Usuarios de prueba** | 5 personas | dev-studio.godinez.ai — solo enviar mensajes |

> Kukulcán monitorea desde aquí durante la sesión. Avisar en este canal cuando empiece y él reporta lo que ve en logs en tiempo real.

---

## Preparación (30 min antes)

### Scarf — Coordinador + Monitor UX

**Tab 1 — PostHog:**
- Abrir https://us.posthog.com → proyecto Godínez Studio
- Ir a **Live Events** (tiempo real)
- Filtrar por evento: `chat_message_sent`

**Tab 2 — Clarity:**
- Abrir https://clarity.microsoft.com → proyecto Godínez Studio
- Ir a **Dashboard** — sesiones activas en tiempo real

**Responsabilidad:** dar las señales "¡YA!" y "¡SEGUNDA!" al canal. Anotar tiempos de respuesta que reportan los usuarios.

---

### Mel — Monitor Infra (Railway)

**Tab 1 — Railway Dashboard:**
- Abrir https://railway.app → godinez → api → tab **Metrics**
- Mantener visible durante toda la sesión
- Capturar screenshot de Metrics al final de cada ronda

**Tab 2 — Railway Logs (web):**
- Misma pantalla de Railway → tab **Logs**
- Buscar: `CAPACITY_FULL`, `gateway connection failed`, `agents.create failed`

**Responsabilidad:** reportar en el canal si CPU > 80% o errores en logs.

---

### Kukulcán — Monitor Logs/DB + Reporte Final

Monitorea desde el servidor. Avisar en **#scarf-kukulcan-cto** al inicio de la prueba para activar monitoreo en tiempo real.

```bash
# Terminal 1 — logs en tiempo real
railway logs --service api --tail

# Terminal 2 — DB connections (cada 2 min)
railway connect postgres
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

**Responsabilidad:** reportar hallazgos en el canal durante la sesión. Compilar reporte final.

---

## Protocolo para los 5 usuarios

### Setup previo (cada usuario):

1. Iniciar sesión en https://dev-studio.godinez.ai
2. Verificar que su agente esté provisionado y funcional
3. Abrir la conversación con el agente
4. **NO enviar nada hasta la señal**

### Mensaje de coordinación (enviar por Discord/WhatsApp a los 5):

> **🚦 PRUEBA DE CARGA — instrucciones:**
> 
> 1. Entra a studio.godinez.ai y abre tu agente
> 2. Copia este mensaje en el chat (no lo mandes aún):
>    *"Hola, necesito ayuda para organizar mi semana. Tengo 3 proyectos activos y no sé por dónde empezar. ¿Me ayudas a priorizar?"*
> 3. Cuando yo diga **"¡YA!"** en este chat → todos mandan el mensaje al mismo tiempo
> 4. Después de recibir respuesta, mandan un segundo mensaje:
>    *"Perfecto. ¿Puedes crear una tarea para el proyecto más importante?"*
> 5. Reportan aquí: ✅ funcionó / ❌ error + qué vieron

---

## Ejecución de la prueba

### Ronda 1 — Mensajes simultáneos (T+0)

**Señal:** Di "¡YA!" en el canal de coordinación

- Los 5 usuarios envían el mensaje al mismo tiempo
- Monitor: observar Railway logs durante 60-90 segundos
- Anotar en el template de reporte (abajo): tiempo hasta primera respuesta

**Qué buscar en logs:**
```
✅ "chat event received" × 5    → todos llegaron
✅ "connected to OpenClaw"       → gateways activos
❌ "gateway connection failed"   → instancia caída
❌ "CAPACITY_FULL"              → sin slots
❌ "Rate limit exceeded"        → throttling activado
```

### Ronda 2 — Segunda ola (T+3 min)

Después de que todos reciban la respuesta del agente:

**Señal:** Di "¡SEGUNDA!" en el canal

- Los 5 usuarios envían el segundo mensaje al mismo tiempo
- Medir si la latencia es similar o mayor (sistema más caliente)

### Ronda 3 — Stress test (T+8 min)

Solo si ronda 1 y 2 fueron exitosas:

- Pedir a los 5 usuarios que envíen **3 mensajes seguidos** rápido (sin esperar respuesta)
- Observar si el rate limiter (30 req/min chat) se activa
- Verificar que los mensajes se procesen en orden

---

### Ronda 4 — GitHub + Vercel deploy simultáneo (T+15 min)

> ⚠️ Esta es la ronda más exigente. Solo ejecutar si rondas 1-3 pasaron sin errores.

**Objetivo:** 5 usuarios crean un proyecto web con el agente, lo suben a GitHub y despliegan a Vercel al mismo tiempo.

#### Setup previo (cada usuario antes de la señal):

Cada usuario debe tener listo:
- Cuenta de GitHub conectada al agente
- Cuenta de Vercel (puede ser la misma que GitHub OAuth)
- Workspace provisionado y agente activo

#### Mensaje para los 5 usuarios:

> **Ronda 4 — Deploy simultáneo:**
>
> Cuando diga "¡DEPLOY!" todos mandan este mensaje a su agente:
>
> *"Crea un proyecto web simple — una landing page con mi nombre y una descripción de lo que hago. Súbelo a GitHub y despliégalo en Vercel."*
>
> Después solo sigan las instrucciones del agente. Reportan cuando tengan la URL de Vercel o si ven algún error.

#### Qué monitorea cada rol:

**Scarf:**
- PostHog: buscar eventos de `create_project`, `chat_message_sent` con payload de deploy
- Clarity: ver si algún usuario se queda atascado esperando

**Mel:**
- Railway Metrics: CPU y Memory — esta ronda genera más carga (agente ejecuta comandos)
- Logs: buscar `cloudflared`, `git push`, errores de Vercel CLI

**Kukulcán:**
```bash
# Logs clave para esta ronda:
# ✅ tunnel URL generada     → cloudflared funcionando
# ✅ git push exitoso        → repo en GitHub
# ✅ vercel deploy           → deploy completado
# ❌ "spawn ENOENT"          → CLI no encontrada en el agente
# ❌ "vercel: command not found" → Vercel CLI no instalada en el slot
# ❌ "authentication required"   → token de Vercel no configurado
```

#### Métricas de esta ronda:

```
RONDA 4:
  Hora inicio: ___:___
  Usuarios que recibieron URL de Vercel: ___ / 5
  Tiempo hasta primer deploy exitoso: ___ minutos
  Tiempo hasta último deploy: ___ minutos
  Repos creados en GitHub: ___ / 5
  Errores de deploy: [ ] Ninguno [ ] Vercel auth [ ] GitHub push [ ] CLI [ ] otro: ___
  CPU pico durante deploys: ___%
  Memory pico: ___ MB
```

#### Criterio de éxito:

- ≥ 4/5 usuarios tienen URL de Vercel funcionando
- Ningún agente se cuelga sin responder > 3 minutos
- No hay `CAPACITY_FULL` ni pérdida de sesión SSE

---

## Métricas a capturar (llenar durante la prueba)

### Formulario del monitor

```
RONDA 1:
  Hora inicio: ___:___
  Usuarios que enviaron: ___ / 5
  Tiempo hasta primer "chat event received": ___ segundos
  Tiempo hasta última respuesta recibida: ___ segundos
  Errores en logs: [ ] Ninguno [ ] gateway fail [ ] rate limit [ ] otro: ___
  DB connections pico: ___ / 20

RONDA 2:
  Hora inicio: ___:___
  Latencia vs ronda 1: [ ] Igual [ ] Mayor (+___ seg) [ ] Menor
  Errores: ___

RONDA 3:
  Rate limiter activado: [ ] Sí [ ] No
  Mensajes procesados en orden: [ ] Sí [ ] No

RONDA 4 — GitHub + Vercel deploy:
  Hora inicio: ___:___
  URLs de Vercel recibidas: ___ / 5
  Tiempo primer deploy: ___ min
  Tiempo último deploy: ___ min
  Repos en GitHub: ___ / 5
  Errores: [ ] Ninguno [ ] Vercel auth [ ] GitHub push [ ] CLI missing [ ] otro: ___
  CPU pico: ___%
  Memory pico: ___ MB

RAILWAY METRICS (capturar al final):
  CPU pico: ___%
  CPU promedio: ___%
  Memory inicio: ___ MB
  Memory final: ___ MB
  Delta memory (leak?): ___ MB
```

### Feedback de cada usuario

Pedir que respondan en Discord después de cada ronda:

```
Usuario [nombre]:
  Ronda 1: ✅/❌ | Tiempo respuesta: ~___ segundos
  Ronda 2: ✅/❌ | Tiempo respuesta: ~___ segundos
  Ronda 3: ✅/❌ | Mensajes en orden: Sí/No
```

---

## Reporte Final (template)

### Reporte de Prueba: 5 Usuarios Simultáneos
**Fecha:** ____________  
**Hora:** ____________  
**Ambiente:** dev-studio.godinez.ai

---

#### Resumen ejecutivo

| Métrica | Valor | Estado |
|---------|-------|--------|
| Usuarios completaron ronda 1 | __ / 5 | ✅/⚠️/❌ |
| Usuarios completaron ronda 2 | __ / 5 | ✅/⚠️/❌ |
| Latencia P50 (mediana) | __ seg | ✅/⚠️/❌ |
| Latencia P95 (peor caso) | __ seg | ✅/⚠️/❌ |
| Errores totales | __ | ✅/⚠️/❌ |

---

#### Railway Metrics

| Métrica | Baseline | Pico | Final |
|---------|----------|------|-------|
| CPU | __% | __% | __% |
| Memory | __ MB | __ MB | __ MB |
| HTTP req/sec | __ | __ | __ |
| Response time P95 | __ ms | __ ms | __ ms |

---

#### PostHog — Eventos capturados

Ir a PostHog → Insights → filtrar `chat_message_sent` en el rango de tiempo de la prueba:

| Métrica | Valor |
|---------|-------|
| Total `chat_message_sent` | __ |
| Usuarios únicos activos | __ |
| Sesiones con error | __ |

---

#### Clarity — Hallazgos de UX

Ir a Clarity → Recordings → filtrar por rango de tiempo de la prueba:

- ¿Hubo rage clicks (frustración)? ___
- ¿Algún usuario se quedó en pantalla de loading? ___
- ¿Reconexión SSE visible? (banner amarillo) ___

---

#### DB — Comportamiento del pool

| Momento | Connections activas | Estado |
|---------|--------------------| -------|
| Antes de prueba | __ / 20 | ✅ |
| Pico ronda 1 | __ / 20 | ✅/⚠️ |
| Pico ronda 3 | __ / 20 | ✅/⚠️ |
| Al finalizar | __ / 20 | ✅ |

---

#### Conclusiones

**¿La plataforma aguanta 30 usuarios el viernes?**
- [ ] ✅ Sí — sin cambios necesarios
- [ ] ⚠️ Sí con ajustes: _______________
- [ ] ❌ No — blocker: _______________

**Riesgos identificados:**
1. ___
2. ___

**Acciones antes del viernes:**
- [ ] ___
- [ ] ___

---

*Reporte generado post-sesión. Combina Railway Metrics + PostHog eventos + Clarity recordings + feedback directo de usuarios.*
