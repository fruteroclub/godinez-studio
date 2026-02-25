import { Hono } from "hono";

const tasks = new Hono();

// POST /tasks — Create task
tasks.post("/", (c) => c.json({ error: "Not implemented" }, 501));

// PUT /tasks/:id — Update task
tasks.put("/:id", (c) => c.json({ error: "Not implemented" }, 501));

// DELETE /tasks/:id — Delete task
tasks.delete("/:id", (c) => c.json({ error: "Not implemented" }, 501));

export default tasks;
