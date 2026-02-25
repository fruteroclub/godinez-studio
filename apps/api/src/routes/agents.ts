import { Hono } from "hono";

const agents = new Hono();

// GET /agents — List available agents
agents.get("/", (c) => c.json({ error: "Not implemented" }, 501));

// GET /agents/:id — Get agent detail
agents.get("/:id", (c) => c.json({ error: "Not implemented" }, 501));

export default agents;
