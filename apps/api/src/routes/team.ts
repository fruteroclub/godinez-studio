import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { workspaceMembers, users } from "@godinez/db";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import {
  requireWorkspaceMember,
  requireRole,
} from "../middleware/require-workspace";
import { getMembers } from "../dal/workspaces";
import { requireQuota } from "../middleware/require-quota";
import { db } from "../db";

const app = new Hono<AuthEnv>();

app.use("*", requireAuth, resolveUser);

// GET /workspaces/:id/members — List members
app.get("/:id/members", requireWorkspaceMember, async (c) => {
  const workspaceId = parseInt(c.req.param("id"));
  const members = await getMembers(workspaceId);
  return c.json(members);
});

// POST /workspaces/:id/members — Invite member by email
app.post(
  "/:id/members",
  requireWorkspaceMember,
  requireRole("owner", "admin"),
  requireQuota("members"),
  zValidator(
    "json",
    z.object({
      email: z.string().email(),
      role: z.enum(["admin", "member", "viewer"]).default("member"),
    }),
  ),
  async (c) => {
    const workspaceId = parseInt(c.req.param("id"));
    const { email, role } = c.req.valid("json");

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!user) return c.json({ error: "User not found" }, 404);

    const existing = await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id),
      ),
    });
    if (existing) return c.json({ error: "Already a member" }, 409);

    const [member] = await db
      .insert(workspaceMembers)
      .values({ workspaceId, userId: user.id, role })
      .returning();
    return c.json(member, 201);
  },
);

// PUT /workspaces/:id/members/:memberId — Update role
app.put(
  "/:id/members/:memberId",
  requireWorkspaceMember,
  requireRole("owner"),
  zValidator("json", z.object({ role: z.enum(["admin", "member", "viewer"]) })),
  async (c) => {
    const memberId = parseInt(c.req.param("memberId"));
    const { role } = c.req.valid("json");

    const member = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.id, memberId),
    });
    if (!member) return c.json({ error: "Member not found" }, 404);
    if (member.role === "owner")
      return c.json({ error: "Cannot change owner role" }, 403);

    const [updated] = await db
      .update(workspaceMembers)
      .set({ role })
      .where(eq(workspaceMembers.id, memberId))
      .returning();
    return c.json(updated);
  },
);

// DELETE /workspaces/:id/members/:memberId — Remove member
app.delete(
  "/:id/members/:memberId",
  requireWorkspaceMember,
  requireRole("owner"),
  async (c) => {
    const memberId = parseInt(c.req.param("memberId"));

    const member = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.id, memberId),
    });
    if (!member) return c.json({ error: "Member not found" }, 404);
    if (member.role === "owner")
      return c.json({ error: "Cannot remove workspace owner" }, 403);

    await db
      .delete(workspaceMembers)
      .where(eq(workspaceMembers.id, memberId));
    return c.json({ deleted: true });
  },
);

export default app;
