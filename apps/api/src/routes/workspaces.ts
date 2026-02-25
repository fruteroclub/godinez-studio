import { Hono } from "hono";

const workspaces = new Hono();

// POST /workspaces — Create workspace
workspaces.post("/", (c) => c.json({ error: "Not implemented" }, 501));

// GET /workspaces — List user's workspaces
workspaces.get("/", (c) => c.json({ error: "Not implemented" }, 501));

// GET /workspaces/:slug — Get workspace by slug
workspaces.get("/:slug", (c) => c.json({ error: "Not implemented" }, 501));

// PUT /workspaces/:id — Update workspace
workspaces.put("/:id", (c) => c.json({ error: "Not implemented" }, 501));

// DELETE /workspaces/:id — Delete workspace
workspaces.delete("/:id", (c) => c.json({ error: "Not implemented" }, 501));

export default workspaces;
