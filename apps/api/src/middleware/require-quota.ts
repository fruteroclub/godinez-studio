import { createMiddleware } from "hono/factory";
import { getTierLimits } from "@godinez/types";
import type { AuthEnv } from "../types";
import { getWorkspaceById } from "../dal/workspaces";
import { getWorkspaceUsage } from "../dal/quotas";

type QuotaResource = "tokens" | "storage" | "members";

export function requireQuota(resource: QuotaResource) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    let workspaceId = parseInt(
      c.req.param("id") || c.req.param("workspaceId") || "0",
    );

    // For routes like POST /api/chat/send where workspaceId is in the body
    if (!workspaceId) {
      try {
        const body = await c.req.raw.clone().json();
        if (body?.workspaceId) workspaceId = body.workspaceId;
      } catch {
        // Not JSON body — skip quota check
      }
    }

    if (!workspaceId) {
      await next();
      return;
    }

    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      await next();
      return;
    }

    const limits = getTierLimits(workspace.tier);
    const usage = await getWorkspaceUsage(workspaceId);

    let exceeded = false;
    let limit = 0;
    let current = 0;

    switch (resource) {
      case "tokens":
        limit = limits.monthlyTokens;
        current = usage.tokensUsedThisMonth;
        exceeded = current >= limit;
        break;
      case "storage":
        limit = limits.storageBytes;
        current = usage.storageBytesUsed;
        exceeded = current >= limit;
        break;
      case "members":
        limit = limits.maxMembers;
        current = usage.memberCount;
        exceeded = current >= limit;
        break;
    }

    if (exceeded) {
      return c.json(
        { error: "quota_exceeded", resource, limit, current },
        429,
      );
    }

    await next();
  });
}
