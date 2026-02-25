import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import health from "./routes/health";
import workspaces from "./routes/workspaces";
import team from "./routes/team";
import projects from "./routes/projects";
import tasks from "./routes/tasks";
import files from "./routes/files";
import agents from "./routes/agents";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.route("/health", health);
app.route("/api/workspaces", workspaces);
app.route("/api/workspaces", team);
app.route("/api/projects", projects);
app.route("/api/tasks", tasks);
app.route("/api/files", files);
app.route("/api/agents", agents);

app.get("/", (c) => {
  return c.json({
    name: "godinez-studio",
    status: "running",
  });
});

const port = Number(process.env.PORT || 3001);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Godinez Studio API running on port ${port}`);
});
