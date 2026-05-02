import { createDiscordAdapter } from "@chat-adapter/discord";
import { CodexClient } from "@/ai/client/codex.client";
import { AIService } from "@/ai/services/ai.service";
import { SummaryService } from "@/ai/services/summary.service";
import { loadConfig } from "@/app/config/bot.config";
import { env } from "@/app/config/env";
import { ChatCommand } from "@/bot/commands/ai/chat.command";
import { SummaryCommand } from "@/bot/commands/ai/summary.command";
import { PingCommand } from "@/bot/commands/utility/ping.command";
import { InteractionHandler } from "@/bot/handlers/interaction.handler";
import { MessageHandler } from "@/bot/handlers/message.handler";
import { Router } from "@/bot/router";
import { RedisClient } from "@/infrastructure/redis/redis.client";
import { WebFetcherClient } from "@/infrastructure/web/web-fetcher.client";
import { DiscordClient } from "@/sdk/discord/discord.client";
import { DiscordGateway } from "@/server/gateway/discord.gateway";
import { createApp } from "@/server/hono";
import { createLogger, getLogger } from "@/shared/utils/logger";

function createAIService(): {
  aiService: AIService;
  redis: RedisClient;
  codex: CodexClient;
} {
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
  return { aiService: new AIService(codex, redis), redis, codex };
}

function createDiscordDeps(aiService: AIService, codex: CodexClient) {
  const botToken = env.DISCORD_BOT_TOKEN;
  const applicationId = env.DISCORD_APPLICATION_ID;
  if (!botToken) throw new Error("DISCORD_BOT_TOKEN is required");
  if (!applicationId) throw new Error("DISCORD_APPLICATION_ID is required");

  const adapter = createDiscordAdapter({
    botToken,
    applicationId,
  });
  const discordClient = new DiscordClient(adapter, botToken, applicationId);
  const chatCommand = new ChatCommand(aiService, discordClient);
  const summaryService = new SummaryService(codex, new WebFetcherClient());
  const summaryCommand = new SummaryCommand(summaryService, discordClient);
  const commands = [new PingCommand(), chatCommand, summaryCommand];
  const messageHandler = new MessageHandler(
    aiService,
    discordClient,
    applicationId,
  );
  const router = new Router(commands);
  const interactionHandler = new InteractionHandler(router);

  const guildId = env.DISCORD_GUILD_ID;
  if (guildId) {
    discordClient
      .registerGuildCommands(guildId, commands)
      .catch((err: unknown) => {
        getLogger().error(
          { err: String(err) },
          "Guild command registration failed",
        );
      });
  }

  return {
    botToken,
    applicationId,
    interactionHandler,
    messageHandler,
    discordClient,
  };
}

export function bootstrap() {
  const config = loadConfig();
  createLogger(config.logging);
  const log = getLogger();
  log.debug({ config }, "Config loaded");

  const { aiService, redis, codex } = createAIService();
  const {
    botToken,
    applicationId,
    interactionHandler,
    messageHandler,
    discordClient,
  } = createDiscordDeps(aiService, codex);

  const app = createApp({
    interactionHandler,
    messageHandler,
    discordClient,
    botToken,
    applicationId,
    allowedUsers: config.bot.allowedUsers,
  });

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
