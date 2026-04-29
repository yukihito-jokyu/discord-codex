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

function createAIService(): { aiService: AIService; redis: RedisClient } {
  const codexApiKey = env.CODEX_API_KEY ?? env.OPENAI_API_KEY;
  if (!codexApiKey) {
    throw new Error("CODEX_API_KEY or OPENAI_API_KEY is required");
  }
  const codex = new CodexClient(codexApiKey, {
    baseUrl: env.CODEX_BASE_URL,
    model: env.CODEX_MODEL,
  });
  const redisUrl = env.REDIS_URL ?? "redis://localhost:6379";
  const redis = new RedisClient(redisUrl);
  redis.connect().catch((err) => {
    getLogger().warn({ err: String(err) }, "Redis connection failed");
  });
  return { aiService: new AIService(codex, redis), redis };
}

function createDiscordDeps(aiService: AIService) {
  const botToken = env.DISCORD_BOT_TOKEN;
  const applicationId = env.DISCORD_APPLICATION_ID;
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN is required");
  if (!applicationId) throw new Error("DISCORD_APPLICATION_ID is required");

  const discordApiClient = new DiscordApiClient(botToken);
  const chatCommand = new ChatCommand(
    aiService,
    discordApiClient,
    applicationId,
  );
  const commands = [new PingCommand(), chatCommand];
  const messageHandler = new MessageHandler(
    aiService,
    discordApiClient,
    applicationId,
  );
  const router = new Router(commands);
  const interactionHandler = new InteractionHandler(router);

  const guildId = env.DISCORD_GUILD_ID;
  if (guildId) {
    discordApiClient
      .registerGuildCommands(applicationId, guildId, commands)
      .catch((err) => {
        getLogger().error(
          { err: String(err) },
          "Guild command registration failed",
        );
      });
  }

  return { botToken, interactionHandler, messageHandler };
}

export function bootstrap() {
  const config = loadConfig();
  createLogger(config.logging);
  const log = getLogger();
  log.debug({ config }, "Config loaded");

  const { aiService, redis } = createAIService();
  const { botToken, interactionHandler, messageHandler } =
    createDiscordDeps(aiService);

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
