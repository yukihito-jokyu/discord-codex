import { loadConfig } from "@/app/config/bot.config";
import { createApp } from "@/server/hono";
import { createLogger, getLogger } from "@/shared/utils/logger";

export function bootstrap() {
  const config = loadConfig();

  createLogger(config.logging);

  const log = getLogger();
  log.debug({ config }, "Config loaded");
  log.info({ port: config.server.port }, "Bootstrap completed");

  const app = createApp();

  return {
    app,
    port: config.server.port,
  };
}
