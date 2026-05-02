import type { Context } from "hono";
import { Hono } from "hono";
import type { InteractionHandler } from "@/bot/handlers/interaction.handler";
import type { MessageHandler } from "@/bot/handlers/message.handler";
import {
  isMentionEvent,
  parseGatewayEvent,
} from "@/sdk/discord/adapter/gateway-event.adapter";
import { toDomain } from "@/sdk/discord/adapter/interaction.adapter";
import { toDiscord } from "@/sdk/discord/adapter/response.adapter";
import {
  ACCESS_DENIED_MESSAGE,
  checkAccessControl,
  isUserAllowed,
} from "@/server/middleware/access-control";
import { verifyDiscordSignature } from "@/server/middleware/verify-discord";
import {
  HTTP_BAD_REQUEST,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_OK,
  HTTP_UNAUTHORIZED,
} from "@/shared/utils/http-status";
import { getLogger } from "@/shared/utils/logger";

type RouteDeps = {
  interactionHandler: InteractionHandler;
  messageHandler: MessageHandler;
  discordApiClient: {
    sendMessage: (channelId: string, content: string) => Promise<boolean>;
  };
  botToken: string;
  applicationId: string;
  allowedUsers?: string[];
};

async function handleGatewayEvent(
  c: Context,
  raw: unknown,
  deps: RouteDeps,
  log: ReturnType<typeof getLogger>,
): Promise<Response> {
  const gatewayToken = c.req.header("x-discord-gateway-token");
  if (gatewayToken !== deps.botToken) {
    return c.json({ error: "Invalid gateway token" }, HTTP_UNAUTHORIZED);
  }

  log.debug(
    { eventType: (raw as Record<string, unknown>)?.type },
    "Gateway event received",
  );
  const eventResult = parseGatewayEvent(raw);

  if (!eventResult.ok) {
    log.warn(
      { error: eventResult.error.message },
      "Invalid gateway event payload",
    );
    return c.json(
      { ok: false, error: eventResult.error.message },
      HTTP_BAD_REQUEST,
    );
  }

  const eventData = eventResult.value.data as Record<string, unknown>;
  if (isMentionEvent(eventResult.value, deps.applicationId)) {
    const author = eventData?.author as Record<string, unknown> | undefined;
    const authorId = author?.id as string | undefined;
    if (!isUserAllowed(authorId, deps.allowedUsers)) {
      log.warn({ authorId }, "Gateway event denied: user not in allowed list");
      const channelId = eventData.channel_id as string | undefined;
      if (channelId) {
        await deps.discordApiClient.sendMessage(
          channelId,
          ACCESS_DENIED_MESSAGE,
        );
      }
      return c.json({ ok: true }, HTTP_OK);
    }
  }

  await deps.messageHandler.handleGatewayEvent(eventResult.value);
  return c.json({ ok: true }, HTTP_OK);
}

async function handleInteraction(
  c: Context,
  deps: RouteDeps,
  log: ReturnType<typeof getLogger>,
): Promise<Response> {
  const verifyResult = await verifyDiscordSignature(c);
  if (verifyResult) return verifyResult;

  const accessResult = await checkAccessControl(c, deps.allowedUsers);
  if (accessResult) return accessResult;

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
}

export function createDiscordRoute(deps: RouteDeps): Hono {
  const discord = new Hono();
  const log = getLogger();

  discord.post("/", async (c) => {
    const gatewayToken = c.req.header("x-discord-gateway-token");
    if (gatewayToken) {
      const raw = await c.req.json();
      return handleGatewayEvent(c, raw, deps, log);
    }
    return handleInteraction(c, deps, log);
  });

  return discord;
}
