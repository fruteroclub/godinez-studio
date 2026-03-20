# Guía de Migraciones — Godinez Studio

## Contexto

Godinez Studio usa **Drizzle ORM** + **drizzle-kit** para manejar el schema de PostgreSQL. El schema se define en TypeScript en `packages/db/src/schema/` y drizzle-kit genera archivos SQL de migración en `apps/api/drizzle/`.

## Conceptos clave

### ¿Qué es una migración?

Un archivo SQL versionado que describe un cambio incremental a la estructura de la base de datos — crear tablas, agregar columnas, modificar tipos, crear índices, etc. Cada migración es un paso que se aplica en orden secuencial.

### ¿Por qué no editar la DB directo?

- No queda registro de qué cambió ni cuándo
- No se puede replicar el cambio en otros entornos (dev, staging, prod)
- No se puede revertir de forma controlada
- El equipo no puede revisar el cambio antes de aplicarlo

## Arquitectura de la base de datos

```
packages/db/src/schema/     ← Schema en TypeScript (source of truth)
apps/api/drizzle/           ← Archivos SQL generados por drizzle-kit
apps/api/drizzle.config.ts  ← Configuración de drizzle-kit
```

### Tablas actuales (13)

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios sincronizados desde Clerk |
| `workspaces` | Espacios de trabajo (1 por usuario en beta) |
| `workspace_members` | Membresías usuario-workspace con roles |
| `agents` | Agentes de IA provisionados desde OpenClaw |
| `agent_logs` | Logs de actividad de agentes |
| `projects` | Proyectos dentro de un workspace |
| `tasks` | Tareas asignadas a agentes |
| `conversations` | Conversaciones de chat con agentes |
| `messages` | Mensajes individuales en conversaciones |
| `files` | Archivos subidos (R2 o local) |
| `gateway_instances` | Instancias de OpenClaw Gateway |
| `referral_codes` | Códigos de invitación para beta |

## Comandos

Todos se corren desde `apps/api/`:

| Comando | Qué hace | Cuándo usarlo |
|---------|----------|---------------|
| `pnpm db:generate` | Compara schema TS vs último snapshot → genera archivo `.sql` | Después de modificar cualquier archivo en `packages/db/src/schema/` |
| `pnpm db:push` | Aplica el schema directo a la DB (sin archivo de migración) | **Solo en desarrollo local** — nunca en producción |
| `pnpm db:studio` | Abre GUI web para explorar la DB | Para inspeccionar datos en desarrollo |

> **Nota:** Los comandos leen `DATABASE_URL` desde `apps/api/.env.local`. Si no tienes ese archivo configurado, los comandos van a fallar.

## Flujo para PRs que incluyen cambios de schema

### Paso 1 — Modifica el schema en TypeScript

Edita los archivos en `packages/db/src/schema/`. Ejemplo: agregar una columna.

```typescript
// packages/db/src/schema/users.ts
export const users = pgTable("users", {
  // ... columnas existentes
  phone: varchar("phone", { length: 20 }), // ← nueva columna
});
```

### Paso 2 — Genera la migración SQL

```bash
cd apps/api
pnpm db:generate
```

Esto crea un archivo nuevo en `apps/api/drizzle/`, por ejemplo `0001_add_user_phone.sql`:

```sql
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);
```

### Paso 3 — Revisa el SQL generado

Abre el archivo y verifica que:
- Solo hace lo que esperas (no dropea tablas/columnas por accidente)
- Los tipos de dato son correctos
- Los constraints y foreign keys están bien

### Paso 4 — Incluye ambos cambios en tu PR

Tu PR debe incluir:
- Los cambios al schema TypeScript (`packages/db/src/schema/`)
- El archivo SQL generado (`apps/api/drizzle/`)

**Si tu PR cambia el schema pero no trae el archivo SQL → no se aprueba.**

### Paso 5 — Aplicar la migración en la DB de desarrollo

> **Contactar a Mel para obtener la `DATABASE_URL` de desarrollo.**
>
> Mel administra las credenciales de la base de datos en Railway. Antes de aplicar cualquier migración necesitas:
>
> 1. Pedirle a **Mel (@melAO)** la URL de conexión de la DB del entorno donde vas a aplicar
> 2. Mel te la comparte por canal seguro (DM, no en canales públicos)
> 3. Configuras tu `apps/api/.env.local` con esa URL
> 4. Aplicas con `pnpm db:push` (por ahora, hasta tener `db:migrate`)

```bash
# En apps/api/.env.local
DATABASE_URL=postgresql://user:password@host:port/dbname
```

```bash
cd apps/api
pnpm db:push
```

### Paso 6 — Verificar

Abre Drizzle Studio para confirmar que los cambios se aplicaron:

```bash
cd apps/api
pnpm db:studio
```

## Reglas

1. **Nunca correr `db:push` en producción** — es destructivo, puede borrar datos
2. **Nunca compartir `DATABASE_URL` en canales públicos** — siempre por DM
3. **Nunca commitear archivos `.env`** — están en `.gitignore`
4. **Siempre revisar el SQL generado** antes de incluirlo en el PR
5. **Un PR = un cambio de schema** — no mezclar migraciones de features distintas
6. **Si el SQL generado dropea algo inesperado** — revisa tu schema, probablemente borraste algo sin querer

## Checklist para code review de migraciones

- [ ] ¿El archivo SQL solo hace lo que describe el PR?
- [ ] ¿No hay `DROP TABLE` o `DROP COLUMN` inesperados?
- [ ] ¿Los nuevos campos tienen defaults razonables?
- [ ] ¿Los foreign keys tienen `ON DELETE` correcto? (cascade vs set null)
- [ ] ¿Se agregaron índices para columnas que se van a filtrar/buscar frecuentemente?
- [ ] ¿El schema TypeScript matchea el SQL generado?

## Roles y responsabilidades

| Rol | Responsabilidad en migraciones |
|-----|-------------------------------|
| **Tech Lead (Scarf)** | Revisa y aprueba el SQL de migraciones en PRs. Define estándares. |
| **Product Lead (Bryan)** | Valida que features que requieren cambios de DB incluyan migración en el PR. |
| **Mel** | Administra credenciales de DB (Railway). Provee `DATABASE_URL` cuando se necesita. |
| **Agentes (OpenClaw)** | Generan migraciones con `db:generate`. Nunca corren `db:push` sin aprobación. |

## Entornos

| Entorno | Base de datos | Quién aplica migraciones |
|---------|--------------|------------------------|
| **Local** | PostgreSQL local o Docker | Cada desarrollador |
| **Dev** | Railway PostgreSQL (dev) | Tech Lead o CI (futuro) |
| **Producción** | Railway PostgreSQL (prod) | Solo Tech Lead, con backup previo |

## Pendientes (roadmap)

- [ ] Agregar script `db:migrate` (usa archivos SQL en orden, trackea en tabla `__drizzle_migrations`)
- [ ] `docker-compose.yml` con PostgreSQL para desarrollo local
- [ ] Script de rollback (Drizzle no tiene rollback nativo — requiere scripts `down` manuales)
- [ ] CI que aplique migraciones automáticamente al mergear a dev
- [ ] Backup automático pre-migración en producción
