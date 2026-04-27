import { serve } from "@hono/node-server";
import { bootstrap } from "@/app/bootstrap";
import { logger } from "@/shared/utils/logger";

const { app, port } = bootstrap();

serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`Server running on http://localhost:${info.port}`);
});
