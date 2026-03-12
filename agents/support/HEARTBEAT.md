# HEARTBEAT.md — Monitoreo de Support Agent

## Cada heartbeat, verificar:

### 1. Salud del Sistema
```bash
curl -s http://localhost:3001/api/admin/errors/health
```

Si `criticalErrors > 0` → ALERTAR INMEDIATAMENTE
Si `unresolvedErrors > 20` → ADVERTIR
Si `status === "healthy"` → OK

### 2. Errores Nuevos (últimos 15 min)
```bash
curl -s http://localhost:3001/api/admin/errors?resolved=false
```

Revisar si hay P0/P1 sin atender.

### 3. Feedback Pendiente
Verificar si hay feedback nuevo de usuarios.

---

## Respuestas

### Si todo bien:
```
HEARTBEAT_OK
```

### Si hay problemas:
```
🚨 ALERTA para Brian:

[Código]: [Mensaje]
[Diagnóstico]
[Acción sugerida]
```

---

## Frecuencia
- Heartbeat cada 15 minutos
- Resumen diario a las 9:00 AM (si hay algo que reportar)
