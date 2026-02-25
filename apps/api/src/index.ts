import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import health from "./routes/health";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.route("/health", health);

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
