import { Hono } from "hono";

const team = new Hono();

// GET /workspaces/:id/members — List members
team.get("/:id/members", (c) => c.json({ error: "Not implemented" }, 501));

// POST /workspaces/:id/members — Invite member
team.post("/:id/members", (c) => c.json({ error: "Not implemented" }, 501));

// PUT /workspaces/:id/members/:memberId — Update role
team.put("/:id/members/:memberId", (c) =>
  c.json({ error: "Not implemented" }, 501),
);

// DELETE /workspaces/:id/members/:memberId — Remove member
team.delete("/:id/members/:memberId", (c) =>
  c.json({ error: "Not implemented" }, 501),
);

export default team;
