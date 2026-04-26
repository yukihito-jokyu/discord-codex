import type { MiddlewareHandler } from "hono";
import { randomUUID } from "crypto";

export const logger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  const requestId = randomUUID();
  c.set('requestId', requestId);
  const { method } = c.req;
  const path = c.req.path;

  console.log(`[START] id=${requestId} ${method} ${path} → ${c.res.status} `);

  await next();

  const duration = Date.now() - start;
  console.log(`[END] id=${requestId} ${method} ${path} → ${c.res.status} (${duration}ms)`);
};
