# Playbook de Rollback — Godinez Studio

## ¿Por qué necesitamos rollbacks?

Una migración puede fallar o causar problemas: un campo que rompe la app, un índice que frena queries, una tabla que no debía existir. El rollback es el proceso de **revertir esos cambios** para volver a un estado estable.

**Drizzle no tiene rollback nativo.** No genera archivos `down`. Esto significa que los rollbacks son manuales — por eso es crítico tener procedimientos claros.

## Niveles de severidad

| Nivel | Situación | Tiempo para actuar | Quién actúa |
|-------|-----------|-------------------|-------------|
| 🟢 **Bajo** | Migración agregó algo innecesario (columna, tabla) — la app funciona | Horas/días | Cualquier dev |
| 🟡 **Medio** | Migración rompió una feature — la app funciona parcialmente | Minutos | Tech Lead (Scarf) |
| 🔴 **Crítico** | Migración tiró la app o corrompió datos | Inmediato | Tech Lead + Mel |

## Procedimiento general de rollback

### Antes de hacer cualquier cosa

```
1. NO entrar en pánico
2. Verificar qué migración causó el problema
3. Revisar el archivo SQL de esa migración en apps/api/drizzle/
4. Determinar el nivel de severidad
5. Elegir la estrategia de rollback apropiada
```

## Estrategias de rollback

### Estrategia 1 — Revertir SQL manualmente (más común)

Para cuando la migración hizo cambios estructurales (ALTER, CREATE, DROP) y necesitas deshacerlos.

**Paso 1:** Identifica qué hizo la migración. Abre el archivo SQL correspondiente.

**Paso 2:** Escribe el SQL inverso. La lógica es simple:

| La migración hizo... | El rollback hace... |
|----------------------|---------------------|
| `CREATE TABLE x` | `DROP TABLE x` |
| `ALTER TABLE x ADD COLUMN y` | `ALTER TABLE x DROP COLUMN y` |
| `CREATE INDEX idx` | `DROP INDEX idx` |
| `ALTER TABLE x ALTER COLUMN y SET DEFAULT z` | `ALTER TABLE x ALTER COLUMN y SET DEFAULT <valor_anterior>` |
| `ALTER TABLE x ADD CONSTRAINT fk` | `ALTER TABLE x DROP CONSTRAINT fk` |

**Paso 3:** Pide a Mel la `DATABASE_URL` del entorno afectado (dev o prod).

**Paso 4:** Ejecuta el SQL de rollback. Puedes usar Drizzle Studio o conectarte directo:

```bash
# Opción A: Drizzle Studio (visual, más seguro para verificar)
cd apps/api
pnpm db:studio
# → Abre la UI → usa la consola SQL para ejecutar el rollback

# Opción B: psql directo (más rápido)
psql "postgresql://user:pass@host:port/dbname" -c "TU SQL DE ROLLBACK AQUÍ"
```

**Paso 5:** Verifica que el rollback se aplicó correctamente en Drizzle Studio.

**Paso 6:** Revierte el commit del schema TypeScript en el PR (o crea un PR nuevo con el revert).

### Estrategia 2 — Restaurar backup de la DB (emergencias)

Para cuando la migración corrompió datos o es demasiado compleja para revertir manualmente.

> **Solo Mel puede ejecutar esto** — requiere acceso a Railway.

```
1. Mel accede a Railway → PostgreSQL service → Backups
2. Identifica el backup más reciente ANTES de la migración
3. Restaura ese backup
4. Verifica que la app funciona
5. Comunica al equipo que se perdieron datos desde el backup hasta ahora
```

**Riesgo:** Se pierden TODOS los datos insertados después del backup. Usar solo como último recurso.

### Estrategia 3 — Migración compensatoria (preferida para producción)

En lugar de revertir, creas una **nueva migración** que corrige el problema. Es la opción más segura porque:
- No pierdes datos
- Queda registro en el historial de migraciones
- Se puede revisar en PR como cualquier otro cambio

```bash
# 1. Corrige el schema TypeScript
# 2. Genera nueva migración
cd apps/api
pnpm db:generate

# 3. Revisa el SQL generado — debe ser el "inverso" del problema
# 4. Aplica
pnpm db:push

# 5. Incluye en un PR de hotfix
```

## Ejemplos reales con nuestras migraciones

Basados en las migraciones que tenemos en `apps/api/drizzle/`:

### Ejemplo: Rollback de `0004_mute_la_nuit.sql`

Esta migración agregó `conversation_id` a `files` con FK e índice.

```sql
-- Migración original (0004):
-- ALTER TABLE "files" ADD COLUMN "conversation_id" integer;
-- ALTER TABLE "files" ADD CONSTRAINT "files_conversation_id_conversations_id_fk" ...
-- CREATE INDEX "files_conversation_id_idx" ...

-- SQL de rollback:
DROP INDEX IF EXISTS "files_conversation_id_idx";
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_conversation_id_conversations_id_fk";
ALTER TABLE "files" DROP COLUMN IF EXISTS "conversation_id";
```

### Ejemplo: Rollback de `0003_ordinary_maria_hill.sql`

Esta migración creó tablas `errors` y `feedback`, y cambió un default.

```sql
-- SQL de rollback:
DROP TABLE IF EXISTS "feedback";
DROP TABLE IF EXISTS "errors";
ALTER TABLE "gateway_instances" ALTER COLUMN "max_slots" SET DEFAULT 15;
```

### Ejemplo: Rollback de `0001_premium_dark_phoenix.sql`

Esta migración agregó columnas a tablas existentes.

```sql
-- SQL de rollback:
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "is_hackathon";
ALTER TABLE "gateway_instances" DROP COLUMN IF EXISTS "workspace_base";
```

### Ejemplo: Rollback de `0002_sharp_blue_blade.sql` (compleja)

Esta migración creó tabla `hackathon_progress`, agregó columnas, FKs, y muchos índices. El rollback es largo:

```sql
-- SQL de rollback (en orden inverso):
DROP INDEX IF EXISTS "workspace_members_user_id_idx";
DROP INDEX IF EXISTS "tasks_project_id_idx";
DROP INDEX IF EXISTS "tasks_workspace_status_idx";
DROP INDEX IF EXISTS "projects_workspace_id_idx";
DROP INDEX IF EXISTS "files_workspace_id_idx";
DROP INDEX IF EXISTS "conversations_hackathon_id_idx";
DROP INDEX IF EXISTS "conversations_agent_id_idx";
DROP INDEX IF EXISTS "conversations_workspace_id_idx";
DROP INDEX IF EXISTS "agent_logs_workspace_created_idx";
DROP INDEX IF EXISTS "hackathon_progress_workspace_id_idx";
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_hackathon_id_hackathon_progress_id_fk";
ALTER TABLE "hackathon_progress" DROP CONSTRAINT IF EXISTS "hackathon_progress_workspace_id_workspaces_id_fk";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "preview_url";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "hackathon_id";
DROP TABLE IF EXISTS "hackathon_progress";
```

> **Nota:** El orden importa — primero dropeas lo que depende (índices, FKs) y después las columnas/tablas.

## Checklist pre-migración (prevención)

Antes de aplicar cualquier migración en dev o prod:

- [ ] ¿Revisaste el SQL completo de la migración?
- [ ] ¿Tienes el SQL de rollback escrito y listo? (guárdalo en algún lado antes de aplicar)
- [ ] ¿Confirmaste con Mel que hay un backup reciente de la DB?
- [ ] ¿La migración fue probada en local primero?
- [ ] ¿El PR fue aprobado por el Tech Lead?

## Checklist post-migración

Después de aplicar:

- [ ] ¿La app levanta sin errores?
- [ ] ¿Las features principales funcionan? (login, chat, crear proyecto)
- [ ] ¿Drizzle Studio muestra la estructura esperada?
- [ ] ¿No hay errores nuevos en los logs?

## Comunicación durante un rollback

### Canal: Discord #godinez-studio o DM según severidad

**Template para reportar:**

```
🚨 ROLLBACK EN PROGRESO
Entorno: [dev/prod]
Migración: [nombre del archivo SQL]
Problema: [qué se rompió]
Estrategia: [manual/backup/compensatoria]
Estado: [en progreso/completado/bloqueado]
```

**Quién notificar:**

| Severidad | Notificar a |
|-----------|-------------|
| 🟢 Bajo | Canal del equipo |
| 🟡 Medio | Scarf + Mel por DM |
| 🔴 Crítico | Scarf + Mel + Bryan por DM inmediato |

## Contactos clave

| Persona | Rol | Cuándo contactar |
|---------|-----|-----------------|
| **Mel (@melAO)** | Acceso a Railway + DB credentials | Necesitas `DATABASE_URL`, backups, o acceso a producción |
| **Scarf** | Tech Lead — aprobación de migraciones | Review de SQL, decisión de estrategia de rollback |
| **Bryan** | Product Lead | Impacto a usuarios, comunicación externa |
