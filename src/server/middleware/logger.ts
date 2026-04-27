import { randomUUID } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { logger as log } from "@/shared/utils/logger";

export const logger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = randomUUID();
  c.set("requestId", requestId);
  const { method } = c.req;
  const path = c.req.path;

  log.info({ requestId, method, path }, "request start");

  await next();

  const duration = Date.now() - start;
  log.info(
    { requestId, method, path, status: c.res.status, duration },
    "request end",
  );
};
