import { Hono } from "hono";
import type { InteractionHandler } from "@/bot/handlers/interaction.handler";
import type { MessageHandler } from "@/bot/handlers/message.handler";
import { logger } from "@/server/middleware/logger";
import { createDiscordRoute } from "@/server/routes/discord.route";
import { health } from "@/server/routes/health.route";
import { getLogger } from "@/shared/utils/logger";

export function createApp(deps?: {
  interactionHandler: InteractionHandler;
  messageHandler: MessageHandler;
  discordApiClient: {
    sendMessage: (channelId: string, content: string) => Promise<boolean>;
  };
  botToken: string;
  applicationId: string;
  allowedUsers?: string[];
}) {
  const app = new Hono();

  app.use("*", logger);

  app.route("/health", health);

  if (deps) {
    const discord = createDiscordRoute(deps);
    app.route("/api/webhooks/discord", discord);
  } else {
    getLogger().warn(
      "createApp called without deps — Discord webhook route not mounted",
    );
  }

  return app;
}
