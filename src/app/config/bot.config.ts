import { readFileSync } from "node:fs";
import YAML from "yaml";
import { z } from "zod";

export const botConfigSchema = z.object({
  bot: z.object({
    defaultModel: z.string(),
    maxTokens: z.number(),
    timeoutMs: z.number(),
  }),
  server: z.object({
    port: z.number(),
  }),
});

export type BotConfig = z.infer<typeof botConfigSchema>;

export function loadConfig(path = "src/app/config/config.yaml"): BotConfig {
  const raw = readFileSync(path, "utf-8");
  const parsed = YAML.parse(raw);
  return botConfigSchema.parse(parsed);
}
