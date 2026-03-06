import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import health from "./routes/health";
import workspaces from "./routes/workspaces";
import team from "./routes/team";
import projects, { workspaceProjects } from "./routes/projects";
import tasks, { workspaceTasks, projectTasks } from "./routes/tasks";
import files, { workspaceFiles, projectFiles } from "./routes/files";
import agents from "./routes/agents";
import provision from "./routes/provision";
import webhooks from "./routes/webhooks";
import dashboard from "./routes/dashboard";
import activity from "./routes/activity";
import chat from "./routes/chat";
import conversations, {
  workspaceConversations,
  projectConversations,
} from "./routes/conversations";
import referralCodes from "./routes/referral-codes";
import admin from "./routes/admin";
import users from "./routes/users";
import "./services/gateway-pool"; // initialize pool (lazy connections)
import { initSentry, Sentry } from "./lib/sentry";

initSentry();

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? [],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Service-Key"],
    exposeHeaders: ["Content-Type"],
    credentials: true,
    maxAge: 3600,
  }),
);

app.route("/health", health);
app.route("/api/workspaces", workspaces);
app.route("/api/workspaces", team);
app.route("/api/workspaces", dashboard);
app.route("/api/workspaces", activity);
app.route("/api/workspaces", workspaceConversations);
app.route("/api/workspaces", workspaceProjects);
app.route("/api/workspaces", workspaceTasks);
app.route("/api/workspaces", workspaceFiles);
app.route("/api/projects", projects);
app.route("/api/projects", projectTasks);
app.route("/api/projects", projectFiles);
app.route("/api/projects", projectConversations);
app.route("/api/tasks", tasks);
app.route("/api/files", files);
app.route("/api/agents", agents);
app.route("/api/agents", provision);
app.route("/api/chat", chat);
app.route("/api/conversations", conversations);
app.route("/api/referral-codes", referralCodes);
app.route("/api/admin", admin);
app.route("/api/users", users);
app.route("/webhooks", webhooks);

app.onError((err, c) => {
  Sentry.captureException(err);
  console.error("[API] Unhandled error:", err.message);
  return c.json({ error: "Internal server error" }, 500);
});

// Serve uploaded files in development (in production, R2 serves files directly)
app.use("/uploads/*", serveStatic({ root: "./" }));

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

// Gateway connections are now lazy via GatewayPool — no startup connection needed.
// Instances are registered in the gateway_instances table and connected on first use.
