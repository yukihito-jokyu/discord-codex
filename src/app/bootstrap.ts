import { CodexClient } from "@/ai/client/codex.client";
import { AIService } from "@/ai/services/ai.service";
import { loadConfig } from "@/app/config/bot.config";
import { env } from "@/app/config/env";
import { ChatCommand } from "@/bot/commands/ai/chat.command";
import { PingCommand } from "@/bot/commands/utility/ping.command";
import { InteractionHandler } from "@/bot/handlers/interaction.handler";
import { MessageHandler } from "@/bot/handlers/message.handler";
import { Router } from "@/bot/router";
import { DiscordApiClient } from "@/infrastructure/discord/discord-api.client";
import { RedisClient } from "@/infrastructure/redis/redis.client";
import { DiscordGateway } from "@/server/gateway/discord.gateway";
import { createApp } from "@/server/hono";
import { createLogger, getLogger } from "@/shared/utils/logger";

function initDiscord(aiService: AIService) {
  const botToken = env.DISCORD_BOT_TOKEN;
  const applicationId = env.DISCORD_APPLICATION_ID;
  if (!botToken) {
    throw new Error("DISCORD_BOT_TOKEN is required");
  }
  if (!applicationId) {
    throw new Error("DISCORD_APPLICATION_ID is required");
  }
  const discordApiClient = new DiscordApiClient(botToken);
  const messageHandler = new MessageHandler(
    aiService,
    discordApiClient,
    applicationId,
  );
  return { botToken, applicationId, discordApiClient, messageHandler };
}

export function bootstrap() {
  const config = loadConfig();

  createLogger(config.logging);

  const log = getLogger();
  log.debug({ config }, "Config loaded");

  const redis = new RedisClient(config.redis?.url ?? "redis://localhost:6379");
  redis.connect().catch((err) => {
    log.warn({ err: String(err) }, "Redis connection failed");
  });

  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }
  const codex = new CodexClient(apiKey);
  const aiService = new AIService(codex, redis);

  const commands = [new PingCommand(), new ChatCommand(aiService)];
  const router = new Router(commands);
  const interactionHandler = new InteractionHandler(router);

  const { botToken, messageHandler } = initDiscord(aiService);

  const app = createApp({ interactionHandler, messageHandler, botToken });

  const gateway = new DiscordGateway();
  const webhookUrl = `http://localhost:${config.server.port}/api/webhooks/discord`;
  gateway.start(webhookUrl).catch((err) => {
    log.error({ err: String(err) }, "Gateway startup failed");
  });

  log.info({ port: config.server.port }, "Bootstrap completed");

  const shutdown = async () => {
    log.info("Shutting down");
    await redis.disconnect();
    gateway.stop();
  };

  return { app, port: config.server.port, shutdown };
}
