import pino from "pino";
import { env } from "@/app/config/env";

export const logger = pino({
  transport:
    env.NODE_ENV === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true } },
});
