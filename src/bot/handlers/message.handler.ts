import type { AIService } from "@/ai/services/ai.service";
import type { DiscordApiClient } from "@/infrastructure/discord/discord-api.client";
import {
  extractMessageData,
  isMentionEvent,
  stripMentionFromContent,
} from "@/sdk/discord/adapter/gateway-event.adapter";
import type { GatewayEvent } from "@/sdk/discord/types/gateway";
import { getLogger } from "@/shared/utils/logger";

export class MessageHandler {
  constructor(
    private aiService: AIService,
    private discordApiClient: DiscordApiClient,
    private applicationId: string,
  ) {}

  async handleGatewayEvent(event: GatewayEvent): Promise<void> {
    const log = getLogger();

    if (!isMentionEvent(event, this.applicationId)) return;

    const messageResult = extractMessageData(event);
    if (!messageResult.ok) {
      log.warn(
        { error: messageResult.error.message },
        "Failed to extract message data from gateway event",
      );
      return;
    }

    const message = messageResult.value;

    if (message.author.bot) return;

    const userMessage = stripMentionFromContent(
      message.content,
      this.applicationId,
    );

    if (!userMessage) {
      log.debug(
        { channelId: message.channel_id },
        "Empty message after stripping mention",
      );
      return;
    }

    const result = await this.aiService.chat(message.channel_id, userMessage);

    if (!result.ok) {
      log.error(
        { error: result.error.message, channelId: message.channel_id },
        "AI service error in mention handler",
      );
      return;
    }

    await this.discordApiClient.sendMessage(message.channel_id, result.value);
  }
}
