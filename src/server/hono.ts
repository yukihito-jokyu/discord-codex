import { Hono } from "hono";
import { logger } from "./middleware/logger.js";
import health from "./routes/health.route.js";

export function createApp() {
  const app = new Hono();

  app.use("*", logger);

  app.route("/health", health);

  return app;
}
