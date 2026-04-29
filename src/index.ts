import { serve } from "@hono/node-server";
import { bootstrap } from "@/app/bootstrap";
import { getLogger } from "@/shared/utils/logger";

const { app, port, shutdown } = bootstrap();

const server = serve({ fetch: app.fetch, port }, (info) => {
  getLogger().info({ port: info.port }, "Server running");
});

async function handleShutdown() {
  await shutdown();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", handleShutdown);
process.on("SIGINT", handleShutdown);
