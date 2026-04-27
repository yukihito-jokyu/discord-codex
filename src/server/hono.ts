import { Hono } from "hono";
import { logger } from "@/server/middleware/logger";
import { health } from "@/server/routes/health.route";

export function createApp() {
  const app = new Hono();

  app.use("*", logger);

  app.route("/health", health);

  return app;
}
