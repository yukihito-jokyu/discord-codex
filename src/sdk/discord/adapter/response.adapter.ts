import { InteractionResponseType, MessageFlags } from "../types";
import type { DomainResponse } from "../types/domain";

export function toDiscord(response: DomainResponse): {
  type: InteractionResponseType;
  data?: Record<string, unknown>;
} {
  return {
    type: response.type as InteractionResponseType,
    data: response.data,
  };
}

export function pong(): { type: InteractionResponseType.Pong } {
  return { type: InteractionResponseType.Pong };
}

export function message(content: string, ephemeral = false): DomainResponse {
  const data: Record<string, unknown> = { content };
  if (ephemeral) {
    data.flags = MessageFlags.Ephemeral;
  }
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data,
  };
}

export function deferred(ephemeral = false): DomainResponse {
  if (!ephemeral) {
    return {
      type: InteractionResponseType.DeferredChannelMessageWithSource,
    };
  }
  return {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: { flags: MessageFlags.Ephemeral },
  };
}
