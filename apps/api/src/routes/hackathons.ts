import { Hono } from "hono";
import { rateLimiters } from "../middleware/rate-limit";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { AuthEnv } from "../types";
import { requireAuth } from "../middleware/auth";
import { resolveUser } from "../middleware/resolve-user";
import { errorHandler } from "../middleware/error-handler";
import { Errors } from "../lib/errors";
import {
  getHackathonsByWorkspace,
  getHackathonById,
  createHackathon,
  toggleHackathonActive,
  updateHackathonPhase,
  addHackathonNote,
  deleteHackathon,
} from "../dal/hackathon";

const app = new Hono<AuthEnv>();

// Apply middleware
app.use("*", errorHandler);  // Error handler first
app.use("*", requireAuth);
app.use("*", resolveUser);
app.use("*", rateLimiters.general);  // Rate limit: 100 req/min

// GET /api/hackathons/:workspaceId - List ALL hackathons for workspace
app.get("/list/:workspaceId", async (c) => {
  const workspaceId = parseInt(c.req.param("workspaceId"));
  const hackathons = await getHackathonsByWorkspace(workspaceId);
  return c.json(hackathons);
});

// GET /api/hackathons/:hackathonId - Get single hackathon by ID
app.get("/:hackathonId", async (c) => {
  const hackathonId = parseInt(c.req.param("hackathonId"));
  const hackathon = await getHackathonById(hackathonId);
  if (!hackathon) {
    throw Errors.hackathonNotFound(hackathonId);
  }
  return c.json(hackathon);
});

// POST /api/hackathons - Create new hackathon
app.post(
  "/",
  zValidator(
    "json",
    z.object({
      workspaceId: z.number(),
      name: z.string().min(1),
      deadline: z.string(),
      hackathonUrl: z.string().optional(),
      resourcesUrl: z.string().optional(),
    }),
  ),
  async (c) => {
    const data = c.req.valid("json");
    const hackathon = await createHackathon({
      workspaceId: data.workspaceId,
      name: data.name,
      deadline: new Date(data.deadline),
      hackathonUrl: data.hackathonUrl,
      resourcesUrl: data.resourcesUrl,
    });
    return c.json(hackathon);
  },
);

// POST /api/hackathons/:hackathonId/toggle - Toggle active state
app.post("/:hackathonId/toggle", async (c) => {
  const hackathonId = parseInt(c.req.param("hackathonId"));
  const hackathon = await toggleHackathonActive(hackathonId);
  return c.json(hackathon);
});

// POST /api/hackathons/:hackathonId/phase - Update phase
app.post(
  "/:hackathonId/phase",
  zValidator(
    "json",
    z.object({
      phaseNumber: z.number(),
      status: z.enum(["done", "current", "pending"]),
      notes: z.array(z.string()).optional(),
    }),
  ),
  async (c) => {
    const hackathonId = parseInt(c.req.param("hackathonId"));
    const { phaseNumber, status, notes } = c.req.valid("json");
    const hackathon = await updateHackathonPhase(hackathonId, phaseNumber, status, notes);
    return c.json(hackathon);
  },
);

// POST /api/hackathons/:hackathonId/note - Add note to phase
app.post(
  "/:hackathonId/note",
  zValidator(
    "json",
    z.object({
      phaseNumber: z.number(),
      note: z.string().min(1),
    }),
  ),
  async (c) => {
    const hackathonId = parseInt(c.req.param("hackathonId"));
    const { phaseNumber, note } = c.req.valid("json");
    const hackathon = await addHackathonNote(hackathonId, phaseNumber, note);
    return c.json(hackathon);
  },
);

// DELETE /api/hackathons/:hackathonId - Delete hackathon
app.delete("/:hackathonId", async (c) => {
  const hackathonId = parseInt(c.req.param("hackathonId"));
  const result = await deleteHackathon(hackathonId);
  return c.json(result);
});

export default app;
