# Rollback Playbook — Godinez Studio

## Why do we need rollbacks?

A migration can fail or cause problems: a field that breaks the app, an index that slows down queries, a table that shouldn't exist. A rollback is the process of **reverting those changes** to return to a stable state.

**Drizzle has no native rollback.** It doesn't generate `down` files. This means rollbacks are manual — that's why it's critical to have clear procedures.

## Severity levels

| Level | Situation | Time to act | Who acts |
|-------|-----------|-------------|----------|
| 🟢 **Low** | Migration added something unnecessary (column, table) — app works fine | Hours/days | Any dev |
| 🟡 **Medium** | Migration broke a feature — app works partially | Minutes | Tech Lead (Scarf) |
| 🔴 **Critical** | Migration took down the app or corrupted data | Immediate | Tech Lead + Mel |

## General rollback procedure

### Before doing anything

```
1. DON'T panic
2. Identify which migration caused the problem
3. Review the SQL file for that migration in apps/api/drizzle/
4. Determine the severity level
5. Choose the appropriate rollback strategy
```

## Rollback strategies

### Strategy 1 — Revert SQL manually (most common)

For when the migration made structural changes (ALTER, CREATE, DROP) and you need to undo them.

**Step 1:** Identify what the migration did. Open the corresponding SQL file.

**Step 2:** Write the inverse SQL. The logic is simple:

| The migration did... | The rollback does... |
|----------------------|---------------------|
| `CREATE TABLE x` | `DROP TABLE x` |
| `ALTER TABLE x ADD COLUMN y` | `ALTER TABLE x DROP COLUMN y` |
| `CREATE INDEX idx` | `DROP INDEX idx` |
| `ALTER TABLE x ALTER COLUMN y SET DEFAULT z` | `ALTER TABLE x ALTER COLUMN y SET DEFAULT <previous_value>` |
| `ALTER TABLE x ADD CONSTRAINT fk` | `ALTER TABLE x DROP CONSTRAINT fk` |

**Step 3:** Ask Mel for the `DATABASE_URL` of the affected environment (dev or prod).

**Step 4:** Execute the rollback SQL. You can use Drizzle Studio or connect directly:

```bash
# Option A: Drizzle Studio (visual, safer for verification)
cd apps/api
pnpm db:studio
# → Open the UI → use the SQL console to execute the rollback

# Option B: psql directly (faster)
psql "postgresql://user:pass@host:port/dbname" -c "YOUR ROLLBACK SQL HERE"
```

**Step 5:** Verify that the rollback was applied correctly in Drizzle Studio.

**Step 6:** Revert the TypeScript schema commit in the PR (or create a new PR with the revert).

### Strategy 2 — Restore DB backup (emergencies)

For when the migration corrupted data or is too complex to revert manually.

> **Only Mel can execute this** — requires Railway access.

```
1. Mel accesses Railway → PostgreSQL service → Backups
2. Identifies the most recent backup BEFORE the migration
3. Restores that backup
4. Verifies the app works
5. Communicates to the team that data was lost from the backup until now
```

**Risk:** ALL data inserted after the backup is lost. Use only as a last resort.

### Strategy 3 — Compensatory migration (preferred for production)

Instead of reverting, you create a **new migration** that fixes the problem. This is the safest option because:
- No data loss
- It's recorded in the migration history
- It can be reviewed in a PR like any other change

```bash
# 1. Fix the TypeScript schema
# 2. Generate new migration
cd apps/api
pnpm db:generate

# 3. Review the generated SQL — it should be the "inverse" of the problem
# 4. Apply
pnpm db:push

# 5. Include in a hotfix PR
```

## Real examples with our migrations

Based on the migrations we have in `apps/api/drizzle/`:

### Example: Rollback of `0004_mute_la_nuit.sql`

This migration added `conversation_id` to `files` with FK and index.

```sql
-- Original migration (0004):
-- ALTER TABLE "files" ADD COLUMN "conversation_id" integer;
-- ALTER TABLE "files" ADD CONSTRAINT "files_conversation_id_conversations_id_fk" ...
-- CREATE INDEX "files_conversation_id_idx" ...

-- Rollback SQL:
DROP INDEX IF EXISTS "files_conversation_id_idx";
ALTER TABLE "files" DROP CONSTRAINT IF EXISTS "files_conversation_id_conversations_id_fk";
ALTER TABLE "files" DROP COLUMN IF EXISTS "conversation_id";
```

### Example: Rollback of `0003_ordinary_maria_hill.sql`

This migration created `errors` and `feedback` tables, and changed a default.

```sql
-- Rollback SQL:
DROP TABLE IF EXISTS "feedback";
DROP TABLE IF EXISTS "errors";
ALTER TABLE "gateway_instances" ALTER COLUMN "max_slots" SET DEFAULT 15;
```

### Example: Rollback of `0001_premium_dark_phoenix.sql`

This migration added columns to existing tables.

```sql
-- Rollback SQL:
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "is_hackathon";
ALTER TABLE "gateway_instances" DROP COLUMN IF EXISTS "workspace_base";
```

### Example: Rollback of `0002_sharp_blue_blade.sql` (complex)

This migration created the `hackathon_progress` table, added columns, FKs, and many indexes. The rollback is lengthy:

```sql
-- Rollback SQL (in reverse order):
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

> **Note:** Order matters — first drop what depends on other things (indexes, FKs) and then the columns/tables.

## Pre-migration checklist (prevention)

Before applying any migration in dev or prod:

- [ ] Did you review the complete migration SQL?
- [ ] Do you have the rollback SQL written and ready? (save it somewhere before applying)
- [ ] Did you confirm with Mel that there's a recent DB backup?
- [ ] Was the migration tested locally first?
- [ ] Was the PR approved by the Tech Lead?

## Post-migration checklist

After applying:

- [ ] Does the app start without errors?
- [ ] Do the main features work? (login, chat, create project)
- [ ] Does Drizzle Studio show the expected structure?
- [ ] Are there any new errors in the logs?

## Communication during a rollback

### Channel: Discord #godinez-studio or DM depending on severity

**Reporting template:**

```
🚨 ROLLBACK IN PROGRESS
Environment: [dev/prod]
Migration: [SQL file name]
Problem: [what broke]
Strategy: [manual/backup/compensatory]
Status: [in progress/completed/blocked]
```

**Who to notify:**

| Severity | Notify |
|----------|--------|
| 🟢 Low | Team channel |
| 🟡 Medium | Scarf + Mel via DM |
| 🔴 Critical | Scarf + Mel + Bryan via DM immediately |

## Key contacts

| Person | Role | When to contact |
|--------|------|----------------|
| **Mel (@melAO)** | Railway access + DB credentials | You need `DATABASE_URL`, backups, or production access |
| **Scarf** | Tech Lead — migration approval | SQL review, rollback strategy decisions |
| **Bryan** | Product Lead | User impact, external communication |
