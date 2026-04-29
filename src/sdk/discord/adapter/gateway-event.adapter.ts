import type {
  GatewayEvent,
  GatewayMessageData,
} from "@/sdk/discord/types/gateway";
import { ValidationError } from "@/shared/types/errors";
import { err, ok, type Result } from "@/shared/types/result";

export function parseGatewayEvent(raw: unknown): Result<GatewayEvent> {
  if (typeof raw !== "object" || raw === null) {
    return err(new ValidationError("Gateway event must be an object"));
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.type !== "string") {
    return err(new ValidationError("Gateway event must have a type string"));
  }

  if (typeof obj.timestamp !== "number") {
    return err(
      new ValidationError("Gateway event must have a timestamp number"),
    );
  }

  if (obj.data === undefined || obj.data === null) {
    return err(new ValidationError("Gateway event must have data"));
  }

  return ok({
    type: obj.type,
    timestamp: obj.timestamp,
    data: obj.data,
  });
}

export function isMentionEvent(
  event: GatewayEvent,
  botApplicationId: string,
): boolean {
  if (event.type !== "GATEWAY_MESSAGE_CREATE") return false;

  const data = event.data as Record<string, unknown>;
  if (!(data && Array.isArray(data.mentions))) return false;

  return data.mentions.some(
    (m: Record<string, unknown>) => m.id === botApplicationId,
  );
}

export function extractMessageData(
  event: GatewayEvent,
): Result<GatewayMessageData> {
  const data = event.data as Record<string, unknown>;

  if (typeof data !== "object" || data === null) {
    return err(new ValidationError("Event data must be an object"));
  }

  if (typeof data.id !== "string") {
    return err(new ValidationError("Message data must have id string"));
  }

  if (typeof data.channel_id !== "string") {
    return err(new ValidationError("Message data must have channel_id string"));
  }

  if (typeof data.content !== "string") {
    return err(new ValidationError("Message data must have content string"));
  }

  if (!data.author || typeof data.author !== "object") {
    return err(new ValidationError("Message data must have author object"));
  }

  const author = data.author as Record<string, unknown>;
  if (typeof author.id !== "string" || typeof author.username !== "string") {
    return err(new ValidationError("Author must have id and username strings"));
  }

  if (!Array.isArray(data.mentions)) {
    return err(new ValidationError("Message data must have mentions array"));
  }

  return ok({
    id: data.id,
    channel_id: data.channel_id,
    content: data.content,
    author: {
      id: author.id,
      username: author.username,
      bot: typeof author.bot === "boolean" ? author.bot : undefined,
    },
    mentions: data.mentions as Array<{ id: string; username: string }>,
    guild_id: typeof data.guild_id === "string" ? data.guild_id : undefined,
  });
}

export function stripMentionFromContent(
  content: string,
  applicationId: string,
): string {
  return content.replace(new RegExp(`<@!?${applicationId}>`, "g"), "").trim();
}
