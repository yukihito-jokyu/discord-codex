import { serve } from "@hono/node-server";
import { bootstrap } from "./app/bootstrap.js";

const { app, port } = await bootstrap();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server running on http://localhost:${info.port}`);
});
