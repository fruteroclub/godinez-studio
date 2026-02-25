import { Hono } from "hono";

const files = new Hono();

// POST /files/upload — Upload file
files.post("/upload", (c) => c.json({ error: "Not implemented" }, 501));

// DELETE /files/:id — Delete file
files.delete("/:id", (c) => c.json({ error: "Not implemented" }, 501));

export default files;
