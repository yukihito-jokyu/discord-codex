import { serve } from "@hono/node-server";
import { bootstrap } from "@/app/bootstrap";
import { getLogger } from "@/shared/utils/logger";

const { app, port, gateway } = bootstrap();

const server = serve({ fetch: app.fetch, port }, (info) => {
  getLogger().info({ port: info.port }, "Server running");
});

function shutdown() {
  getLogger().info("Shutting down");
  gateway?.stop();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
