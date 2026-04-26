import { createApp } from "../server/hono.js";
import { loadConfig } from "./config/bot.config.js";

export async function bootstrap() {
  const config = loadConfig();

  const app = createApp();

  return {
    app,
    port: config.server.port,
  };
}
