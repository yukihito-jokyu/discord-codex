import { Hono } from "hono";
import type { InteractionHandler } from "@/bot/handlers/interaction.handler";
import { logger } from "@/server/middleware/logger";
import { createDiscordRoute } from "@/server/routes/discord.route";
import { health } from "@/server/routes/health.route";

export function createApp(deps?: { interactionHandler: InteractionHandler }) {
  const app = new Hono();

  app.use("*", logger);

  app.route("/health", health);

  if (deps) {
    const discord = createDiscordRoute(deps);
    app.route("/api/webhooks/discord", discord);
  }

  return app;
}
