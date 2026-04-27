import { loadConfig } from "@/app/config/bot.config";
import { createApp } from "@/server/hono";

export function bootstrap() {
  const config = loadConfig();

  const app = createApp();

  return {
    app,
    port: config.server.port,
  };
}
