import { CodexClient } from "@/ai/client/codex.client";
import { AIService } from "@/ai/services/ai.service";
import { loadConfig } from "@/app/config/bot.config";
import { env } from "@/app/config/env";
import { ChatCommand } from "@/bot/commands/ai/chat.command";
import { PingCommand } from "@/bot/commands/utility/ping.command";
import { InteractionHandler } from "@/bot/handlers/interaction.handler";
import { Router } from "@/bot/router";
import { RedisClient } from "@/infrastructure/redis/redis.client";
import { DiscordGateway } from "@/server/gateway/discord.gateway";
import { createApp } from "@/server/hono";
import { createLogger, getLogger } from "@/shared/utils/logger";

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

  const app = createApp({ interactionHandler });

  let gateway: DiscordGateway | null = null;
  if (env.DISCORD_BOT_TOKEN) {
    gateway = new DiscordGateway();
    const webhookUrl = `http://localhost:${config.server.port}/api/webhooks/discord`;
    gateway.start(webhookUrl).catch((err) => {
      log.error({ err: String(err) }, "Gateway startup failed");
    });
  }

  log.info({ port: config.server.port }, "Bootstrap completed");

  return { app, port: config.server.port, gateway };
}
