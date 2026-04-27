import type { LevelWithSilent } from "pino";
import pino from "pino";
import { env } from "@/app/config/env";

function getDefaultLevel(): LevelWithSilent {
  switch (env.NODE_ENV) {
    case "production":
      return "info";
    case "development":
      return "debug";
    case "test":
      return "silent";
  }
}

function getTransportConfig() {
  if (env.NODE_ENV === "production") {
    return;
  }
  return { target: "pino-pretty", options: { colorize: true } };
}

export type LoggerConfig = {
  level?: string;
};

let loggerInstance: pino.Logger | null = null;

export function createLogger(config?: LoggerConfig): pino.Logger {
  const level = config?.level ?? getDefaultLevel();
  loggerInstance = pino({
    level,
    transport: getTransportConfig(),
  });
  return loggerInstance;
}

export function getLogger(): pino.Logger {
  if (!loggerInstance) {
    return createLogger();
  }
  return loggerInstance;
}

export function resetLogger(): void {
  loggerInstance = null;
}
