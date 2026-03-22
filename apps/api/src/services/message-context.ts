/**
 * Message Context — builds a context header to prepend to user messages
 * before sending to the OpenClaw gateway.
 *
 * Standalone module. Feature-flagged via WORKSPACE_SYNC_ENABLED env var.
 * When disabled, returns empty string (message passes through unchanged).
 */

import { eq, and, inArray, count } from "drizzle-orm";
import {
  projects as projectsTable,
  tasks as tasksTable,
  files as filesTable,
  conversations as conversationsTable,
} from "@godinez/db";
import { db } from "../db";
import { getWorkspaceById } from "../dal/workspaces";
import { getProjectById } from "../dal/projects";
import { getConversationById } from "../dal/conversations";

function isEnabled(): boolean {
  return process.env.WORKSPACE_SYNC_ENABLED === "true";
}

/**
 * Build a context header for a message. Returns a string to prepend,
 * or empty string if disabled / no context available.
 */
export async function buildMessageContext(
  conversationId: number,
  workspaceId: number,
): Promise<string> {
  if (!isEnabled()) return "";

  try {
    const conversation = await getConversationById(conversationId);

    // Hackathon conversations get their own context via buildHackathonContext — skip workspace context
    if (conversation?.isHackathon) return "";

    if (conversation?.projectId) {
      return buildProjectContext(conversation.projectId);
    }

    return buildWorkspaceContext(workspaceId);
  } catch {
    return "";
  }
}

/**
 * Prepend context header to message content.
 * If header is empty, returns content unchanged.
 */
export function prependContext(header: string, content: string): string {
  if (!header) return content;
  return `${header}\n\n${content}`;
}

// ─── Builders ────────────────────────────────────────────────────────

async function buildProjectContext(projectId: number): Promise<string> {
  const project = await getProjectById(projectId);
  if (!project) return "";

  const [taskCount] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.projectId, projectId),
        inArray(tasksTable.status, ["pending", "in_progress"]),
      ),
    );

  const [fileCount] = await db
    .select({ count: count() })
    .from(filesTable)
    .where(eq(filesTable.projectId, projectId));

  const parts: string[] = [];
  if (taskCount.count > 0) parts.push(`${taskCount.count} tareas activas`);
  if (fileCount.count > 0) parts.push(`${fileCount.count} archivos`);
  const suffix = parts.length > 0 ? ` | ${parts.join(", ")}` : "";

  return `[Proyecto: ${project.name} (P-${project.id})${suffix}]`;
}

async function buildWorkspaceContext(workspaceId: number): Promise<string> {
  const workspace = await getWorkspaceById(workspaceId);
  if (!workspace) return "";

  const [projectCount] = await db
    .select({ count: count() })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.workspaceId, workspaceId),
        eq(projectsTable.status, "active"),
      ),
    );

  const [taskCount] = await db
    .select({ count: count() })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.workspaceId, workspaceId),
        inArray(tasksTable.status, ["pending", "in_progress"]),
      ),
    );

  return `[Workspace: ${workspace.name} | ${projectCount.count} proyectos activos, ${taskCount.count} tareas pendientes]`;
}
