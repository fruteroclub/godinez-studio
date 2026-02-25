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

const port = process.env.PORT || 3001;
console.log(`Godinez Studio API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
