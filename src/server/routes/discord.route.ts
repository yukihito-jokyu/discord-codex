import { Hono } from "hono";
import type { InteractionHandler } from "@/bot/handlers/interaction.handler";
import { toDomain } from "@/sdk/discord/adapter/interaction.adapter";
import { toDiscord } from "@/sdk/discord/adapter/response.adapter";
import { verifyDiscord } from "@/server/middleware/verify-discord";
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_OK,
} from "@/shared/utils/http-status";
import { getLogger } from "@/shared/utils/logger";

export function createDiscordRoute(deps: {
  interactionHandler: InteractionHandler;
}): Hono {
  const discord = new Hono();
  const log = getLogger();

  discord.use("*", verifyDiscord);

  discord.post("/", async (c) => {
    const raw = await c.req.json();
    const result = toDomain(raw);

    if (!result.ok) {
      log.warn({ error: result.error.message }, "Invalid interaction payload");
      return c.json({ error: result.error.message }, HTTP_BAD_REQUEST);
    }

    try {
      const response = await deps.interactionHandler.handle(result.value);
      return c.json(toDiscord(response), HTTP_OK);
    } catch {
      log.error("Interaction handler error");
      return c.json({ error: "Internal error" }, HTTP_INTERNAL_SERVER_ERROR);
    }
  });

  return discord;
}
