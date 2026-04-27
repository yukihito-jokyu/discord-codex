import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { HTTP_OK, HTTP_SERVICE_UNAVAILABLE } from "@/shared/utils/http-status";

const health = new Hono();

export function checkHealth(): Record<string, boolean> {
  return { server: true };
}

health.get("/", (c) => {
  const { body, status } = buildHealthResponse(checkHealth());
  return c.json(body, status);
});

export function buildHealthResponse(services: Record<string, boolean>) {
  const allHealthy = Object.values(services).every(Boolean);
  return {
    body: {
      status: allHealthy ? "ok" : ("degraded" as const),
      services,
      timestamp: new Date().toISOString(),
    },
    status: (allHealthy
      ? HTTP_OK
      : HTTP_SERVICE_UNAVAILABLE) as ContentfulStatusCode,
  };
}

export { health };
