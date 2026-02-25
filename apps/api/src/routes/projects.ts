import { Hono } from "hono";

const projects = new Hono();

// POST /projects — Create project
projects.post("/", (c) => c.json({ error: "Not implemented" }, 501));

// GET /projects/:id — Get project detail
projects.get("/:id", (c) => c.json({ error: "Not implemented" }, 501));

// PUT /projects/:id — Update project
projects.put("/:id", (c) => c.json({ error: "Not implemented" }, 501));

// DELETE /projects/:id — Delete project
projects.delete("/:id", (c) => c.json({ error: "Not implemented" }, 501));

export default projects;
