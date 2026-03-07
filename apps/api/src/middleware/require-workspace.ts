import { createMiddleware } from "hono/factory";
import { getMemberRole } from "../dal/workspaces";
import type { AuthEnv } from "../types";

export const requireWorkspaceMember = createMiddleware<AuthEnv>(
  async (c, next) => {
    const userId = c.get("userId");
    const workspaceId = parseInt(
      c.req.param("id") || c.req.param("workspaceId") || "0",
    );
    if (!workspaceId) return c.json({ error: "Workspace ID required" }, 400);

    const role = await getMemberRole(workspaceId, userId);
    if (!role) return c.json({ error: "Not a workspace member" }, 403);

    c.set("workspaceRole", role);
    await next();
  },
);

export function requireRole(...roles: string[]) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    const role = c.get("workspaceRole");
    if (!roles.includes(role)) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }
    await next();
  });
}
