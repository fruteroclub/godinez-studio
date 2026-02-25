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
import webhooks from "./routes/webhooks";
import dashboard from "./routes/dashboard";
import chat from "./routes/chat";
import conversations, {
  workspaceConversations,
} from "./routes/conversations";
import { gateway } from "./services/gateway-relay";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.route("/health", health);
app.route("/api/workspaces", workspaces);
app.route("/api/workspaces", team);
app.route("/api/workspaces", dashboard);
app.route("/api/workspaces", workspaceConversations);
app.route("/api/projects", projects);
app.route("/api/tasks", tasks);
app.route("/api/files", files);
app.route("/api/agents", agents);
app.route("/api/chat", chat);
app.route("/api/conversations", conversations);
app.route("/webhooks", webhooks);

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

// Connect to OpenClaw Gateway if configured
if (process.env.OPENCLAW_GATEWAY_URL) {
  gateway
    .connect(
      process.env.OPENCLAW_GATEWAY_URL,
      process.env.OPENCLAW_GATEWAY_TOKEN!,
    )
    .then(() => console.log("[Gateway] Connected"))
    .catch((err) => console.error("[Gateway] Connection failed:", err));
}
