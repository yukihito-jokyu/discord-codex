import { serve } from "@hono/node-server";
import { bootstrap } from "@/app/bootstrap";
import { getLogger } from "@/shared/utils/logger";

const { app, port } = bootstrap();

serve({ fetch: app.fetch, port }, (info) => {
  getLogger().info({ port: info.port }, "Server running");
});
