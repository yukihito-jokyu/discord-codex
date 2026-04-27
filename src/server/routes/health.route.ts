import { Hono } from "hono";
import { HTTP_OK, HTTP_SERVICE_UNAVAILABLE } from "@/shared/utils/http-status";

const health = new Hono();

function checkHealth(): Record<string, boolean> {
  return { server: true };
}

health.get("/", (c) => {
  const services = checkHealth();
  const allHealthy = Object.values(services).every(Boolean);
  return c.json(
    {
      status: allHealthy ? "ok" : "degraded",
      services,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE,
  );
});

export { health };
