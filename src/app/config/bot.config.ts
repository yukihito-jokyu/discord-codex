import { readFileSync } from "node:fs";
import YAML from "yaml";

export interface BotConfig {
  bot: {
    defaultModel: string;
    maxTokens: number;
    timeoutMs: number;
  };
  server: {
    port: number;
  };
}

export function loadConfig(path = "src/app/config/config.yaml"): BotConfig {
  const raw = readFileSync(path, "utf-8");
  return YAML.parse(raw) as BotConfig;
}
