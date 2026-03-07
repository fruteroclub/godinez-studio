/**
 * Workspace Sync — pushes a WORKSPACE.md snapshot to the agent's filesystem.
 *
 * Standalone module. Feature-flagged via WORKSPACE_SYNC_ENABLED env var.
 * When disabled, all exports are no-ops.
 *
 * Call `syncWorkspaceFile(workspaceId)` after any DB mutation that changes
 * projects, tasks, or files. Calls are debounced per workspace (5s).
 */

import { eq, and, inArray, desc } from "drizzle-orm";
import {
  projects as projectsTable,
  tasks as tasksTable,
  files as filesTable,
} from "@godinez/db";
import { db } from "../db";
import { getWorkspaceById } from "../dal/workspaces";
import { getAgentById } from "../dal/agents";
import { pool } from "./gateway-pool";
import { buildSoulMd } from "./agent-soul-template";
import { SYNC_DEBOUNCE_MS, SYNC_MAX_TASKS, SYNC_MAX_FILES } from "../lib/config";
import { logger } from "../lib/logger";

const log = logger.child({ service: "workspace-sync" });

// ─── Feature flag ────────────────────────────────────────────────────

function isEnabled(): boolean {
  return process.env.WORKSPACE_SYNC_ENABLED === "true";
}

// ─── Debounce state ──────────────────────────────────────────────────

const pendingTimers = new Map<number, ReturnType<typeof setTimeout>>();

/**
 * Public entry point. Call after any mutation that changes workspace state.
 * Debounces multiple rapid calls into a single sync per workspace.
 */
export function syncWorkspaceFile(workspaceId: number): void {
  if (!isEnabled()) return;

  // Clear existing timer for this workspace
  const existing = pendingTimers.get(workspaceId);
  if (existing) clearTimeout(existing);

  // Schedule sync
  const timer = setTimeout(() => {
    pendingTimers.delete(workspaceId);
    executeSyncSafe(workspaceId);
  }, SYNC_DEBOUNCE_MS);

  pendingTimers.set(workspaceId, timer);
}

// ─── First-sync tracking ─────────────────────────────────────────────

// Tracks which workspaces have already had their SOUL.md re-injected this
// process lifetime. On restart, all workspaces are treated as "first sync"
// again — that's fine, it just means one extra idempotent SOUL.md push.
const soulInjected = new Set<number>();

// ─── Internal sync execution ─────────────────────────────────────────

async function executeSyncSafe(workspaceId: number): Promise<void> {
  try {
    await executeSync(workspaceId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn({ workspaceId, err: msg }, "sync failed");
  }
}

async function executeSync(workspaceId: number): Promise<void> {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace?.agentSlot) return;

  let relay;
  try {
    relay = await pool.getRelayForWorkspace(workspace.instanceId);
  } catch {
    log.warn({ workspaceId }, "gateway offline, skipping sync");
    return;
  }

  // First sync for this workspace: also re-inject SOUL.md so existing
  // agents get the workspace-awareness instructions.
  if (!soulInjected.has(workspaceId) && workspace.agentId) {
    soulInjected.add(workspaceId);
    try {
      const agent = await getAgentById(workspace.agentId);
      if (agent) {
        const soulMd = buildSoulMd({
          workspaceName: workspace.name,
          agentName: agent.name,
          agentSlot: workspace.agentSlot,
        });
        await relay.agentsFilesSet(workspace.agentSlot, "SOUL.md", soulMd);
        log.info({ workspaceId }, "re-injected SOUL.md");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ workspaceId, err: msg }, "SOUL.md reinject failed (non-fatal)");
    }
  }

  const content = await buildWorkspaceMd(workspaceId, workspace.name);

  await relay.agentsFilesSet(workspace.agentSlot, "WORKSPACE.md", content);
  log.info({ workspaceId }, "updated WORKSPACE.md");
}

// ─── Markdown builder ────────────────────────────────────────────────


async function buildWorkspaceMd(
  workspaceId: number,
  workspaceName: string,
): Promise<string> {
  // Query active projects
  const projects = await db.query.projects.findMany({
    where: and(
      eq(projectsTable.workspaceId, workspaceId),
      inArray(projectsTable.status, ["active"]),
    ),
  });

  // Query pending + in_progress tasks (most recent first, capped)
  const tasks = await db.query.tasks.findMany({
    where: and(
      eq(tasksTable.workspaceId, workspaceId),
      inArray(tasksTable.status, ["pending", "in_progress"]),
    ),
    orderBy: desc(tasksTable.createdAt),
    limit: SYNC_MAX_TASKS,
  });

  // Query recent files (capped)
  const files = await db.query.files.findMany({
    where: eq(filesTable.workspaceId, workspaceId),
    orderBy: desc(filesTable.createdAt),
    limit: SYNC_MAX_FILES,
  });

  // Build task counts per project
  const taskCounts = new Map<number, { pending: number; inProgress: number }>();
  for (const t of tasks) {
    if (!t.projectId) continue;
    const entry = taskCounts.get(t.projectId) ?? { pending: 0, inProgress: 0 };
    if (t.status === "pending") entry.pending++;
    if (t.status === "in_progress") entry.inProgress++;
    taskCounts.set(t.projectId, entry);
  }

  const now = new Date().toISOString().slice(0, 16) + "Z";
  const lines: string[] = [];

  lines.push(`# Workspace: ${workspaceName}`);
  lines.push(`Actualizado: ${now}`);
  lines.push("");

  // Projects section
  if (projects.length > 0) {
    lines.push("## Proyectos activos");
    for (const p of projects) {
      const counts = taskCounts.get(p.id);
      const parts: string[] = [];
      if (counts?.pending) parts.push(`${counts.pending} pendientes`);
      if (counts?.inProgress) parts.push(`${counts.inProgress} en progreso`);
      const suffix = parts.length > 0 ? ` — ${parts.join(", ")}` : "";
      lines.push(`- [P-${p.id}] ${p.name}${suffix}`);
    }
    lines.push("");
  }

  // Tasks section
  if (tasks.length > 0) {
    lines.push("## Tareas recientes");
    lines.push("| ID | Titulo | Estado | Prioridad | Proyecto |");
    lines.push("|----|--------|--------|-----------|----------|");
    for (const t of tasks) {
      const proj = t.projectId
        ? projects.find((p) => p.id === t.projectId)
        : null;
      const projLabel = proj ? `P-${proj.id}` : "-";
      lines.push(
        `| T-${t.id} | ${t.title} | ${t.status} | ${t.priority} | ${projLabel} |`,
      );
    }
    lines.push("");
  }

  // Files section
  if (files.length > 0) {
    lines.push("## Archivos recientes");
    lines.push("| Archivo | Proyecto | Fecha |");
    lines.push("|---------|----------|-------|");
    for (const f of files) {
      const proj = f.projectId
        ? projects.find((p) => p.id === f.projectId)
        : null;
      const projLabel = proj ? `P-${proj.id}` : "-";
      const date = f.createdAt
        ? new Date(f.createdAt).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "short",
          })
        : "-";
      lines.push(`| ${f.filename} | ${projLabel} | ${date} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
