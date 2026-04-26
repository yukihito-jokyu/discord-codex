import { Hono } from "hono";

const health = new Hono();

async function checkHealth(): Promise<Record<string, boolean>> {
  return { server: true };
}

health.get("/", async (c) => {
  const services = await checkHealth();
  const allHealthy = Object.values(services).every(Boolean);
  return c.json(
    {
      status: allHealthy ? "ok" : "degraded",
      services,
      timestamp: new Date().toISOString(),
    },
    allHealthy ? 200 : 503,
  );
});

export default health;
