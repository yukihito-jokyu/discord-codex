import { Hono } from "hono";
import type { InteractionHandler } from "@/bot/handlers/interaction.handler";
import type { MessageHandler } from "@/bot/handlers/message.handler";
import { parseGatewayEvent } from "@/sdk/discord/adapter/gateway-event.adapter";
import { toDomain } from "@/sdk/discord/adapter/interaction.adapter";
import { toDiscord } from "@/sdk/discord/adapter/response.adapter";
import { verifyDiscordSignature } from "@/server/middleware/verify-discord";
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
} from "@/shared/utils/http-status";
import { getLogger } from "@/shared/utils/logger";

export function createDiscordRoute(deps: {
  interactionHandler: InteractionHandler;
  messageHandler: MessageHandler;
  botToken: string;
}): Hono {
  const discord = new Hono();
  const log = getLogger();

  discord.post("/", async (c) => {
    const gatewayToken = c.req.header("x-discord-gateway-token");

    if (gatewayToken) {
      if (gatewayToken !== deps.botToken) {
        return c.json({ error: "Invalid gateway token" }, HTTP_UNAUTHORIZED);
      }

      const raw = await c.req.json();
      const eventResult = parseGatewayEvent(raw);

      if (!eventResult.ok) {
        log.warn(
          { error: eventResult.error.message },
          "Invalid gateway event payload",
        );
        return c.json({ ok: true }, HTTP_OK);
      }

      await deps.messageHandler.handleGatewayEvent(eventResult.value);
      return c.json({ ok: true }, HTTP_OK);
    }

    const verifyResult = await verifyDiscordSignature(c);
    if (verifyResult) return verifyResult;

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
