import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  DISCORD_PUBLIC_KEY: z.string().optional(),
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_APPLICATION_ID: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  CODEX_BASE_URL: z.string().optional(),
  CODEX_API_KEY: z.string().optional(),
  CODEX_MODEL: z.string().optional(),
});

export const env = envSchema.parse(process.env);
