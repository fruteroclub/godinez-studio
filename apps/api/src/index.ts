import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { requestLogger } from "./middleware/request-logger";
import { logger } from "./lib/logger";
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
import hackathons from "./routes/hackathons";
import errors from "./routes/errors";
import watchdog from "./routes/watchdog";
import { logError } from "./dal/errors";
import "./services/gateway-pool"; // initialize pool (lazy connections)
import { initSentry, Sentry } from "./lib/sentry";
import context from "./routes/context";
import { isAppError, formatErrorResponse } from "./lib/errors";
import { rateLimits } from "./middleware/rate-limit";
import { deployRateLimit } from "./middleware/deploy-rate-limit";

initSentry();

const app = new Hono();

app.use("*", requestLogger);
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? [],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
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
// Rate-limited routes
app.use("/api/chat/*", rateLimits.chat);
app.use("/api/hackathons/*", rateLimits.hackathon);
app.use("/api/deploy/*", deployRateLimit());

app.route("/api/chat", chat);
app.route("/api/conversations", conversations);
app.route("/api/referral-codes", referralCodes);
app.route("/api/admin/errors", errors); // before /api/admin to avoid admin middleware catch-all
app.route("/api/admin", admin);
app.route("/api/users", users);
app.route("/api/hackathons", hackathons);
app.route("/webhooks", webhooks);
app.route("/api/watchdog", watchdog);
app.route("/api/context", context);

app.onError((err, c) => {
  Sentry.captureException(err);
  
  // Log to Error Observatory
  logError({
    code: isAppError(err) ? err.code : "INTERNAL_ERROR",
    message: err.message,
    userMessage: "Algo salió mal.",
    priority: "P2",
    path: c.req.path,
  }).catch(() => {});
  
  if (isAppError(err)) {
    if (err.statusCode >= 500) {
      logger.error({ err: err.message, code: err.code }, "server error");
    } else {
      logger.warn({ code: err.code, details: err.details }, err.message);
    }
    const response = formatErrorResponse(err);
    return c.json(response, err.statusCode as 400 | 401 | 403 | 404 | 429 | 500);
  }
  
  logger.error({ err: err.message, path: c.req.path }, "unhandled error");
  return c.json({
    error: "Algo salió mal. Por favor, intenta de nuevo.",
    code: "INTERNAL_ERROR",
  }, 500);
});

// Serve uploaded files in development (in production, R2 serves files directly)
app.use("/uploads/*", serveStatic({ root: "./" }));

// 404 handler for undefined routes
app.notFound((c) => {
  return c.json({
    error: "La página que buscas no existe",
    code: "NOT_FOUND",
    message: `Route ${c.req.path} not found`,
  }, 404);
});

app.get("/", (c) => {
  return c.json({
    name: "godinez-studio",
    status: "running",
  });
});

const port = Number(process.env.PORT || 3001);

serve({ fetch: app.fetch, port }, () => {
  logger.info({ port }, "Godinez Studio API running");
});

// Gateway connections are now lazy via GatewayPool — no startup connection needed.
// Instances are registered in the gateway_instances table and connected on first use.
