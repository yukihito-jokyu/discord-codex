import type { AIService } from "@/ai/services/ai.service";
import type { DiscordApiClient } from "@/infrastructure/discord/discord-api.client";
import {
  extractMessageData,
  isMentionEvent,
  stripMentionFromContent,
} from "@/sdk/discord/adapter/gateway-event.adapter";
import type {
  GatewayEvent,
  GatewayMessageData,
} from "@/sdk/discord/types/gateway";
import { getLogger } from "@/shared/utils/logger";

export class MessageHandler {
  constructor(
    private aiService: AIService,
    private discordApiClient: DiscordApiClient,
    private applicationId: string,
  ) {}

  async handleGatewayEvent(event: GatewayEvent): Promise<void> {
    const log = getLogger();

    log.debug(
      {
        eventType: event.type,
        hasMentions: Array.isArray(
          (event.data as Record<string, unknown>)?.mentions,
        ),
      },
      "MessageHandler received gateway event",
    );

    if (!isMentionEvent(event, this.applicationId)) {
      log.debug({ eventType: event.type }, "Not a mention event, skipping");
      return;
    }

    const messageResult = extractMessageData(event);
    if (!messageResult.ok) {
      log.warn(
        { error: messageResult.error.message },
        "Failed to extract message data",
      );
      return;
    }

    await this.processMessage(messageResult.value);
  }

  private async processMessage(message: GatewayMessageData): Promise<void> {
    const log = getLogger();

    if (message.author.bot) {
      log.debug({ authorId: message.author.id }, "Author is a bot, skipping");
      return;
    }

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

    log.info(
      {
        channelId: message.channel_id,
        userId: message.author.id,
        userMessage,
      },
      "Received mention message",
    );

    const targetChannelId = await this.resolveTargetChannel(
      message,
      userMessage,
    );
    const result = await this.aiService.chat(message.channel_id, userMessage);

    if (targetChannelId !== message.channel_id) {
      await this.aiService.linkThreadChannel(
        message.channel_id,
        targetChannelId,
      );
    }

    await this.sendResult(result, targetChannelId, message.channel_id);
  }

  private async resolveTargetChannel(
    message: GatewayMessageData,
    threadName: string,
  ): Promise<string> {
    const inThread = await this.discordApiClient.isThreadChannel(
      message.channel_id,
    );
    if (inThread) return message.channel_id;

    const threadId = await this.discordApiClient.createThreadFromMessage(
      message.channel_id,
      message.id,
      threadName.slice(0, 100),
    );
    return threadId ?? message.channel_id;
  }

  private async sendResult(
    result:
      | { ok: true; value: string }
      | { ok: false; error: { message: string } },
    targetChannelId: string,
    originalChannelId: string,
  ): Promise<void> {
    const log = getLogger();

    if (!result.ok) {
      log.error(
        { error: result.error.message, channelId: originalChannelId },
        "AI service error",
      );
      await this.discordApiClient.sendMessage(
        targetChannelId,
        // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
        "エラーが発生しました。しばらくしてからお試しください。",
      );
      return;
    }

    log.info(
      {
        channelId: targetChannelId,
        responseLength: result.value.length,
        responsePreview: result.value.slice(0, 100),
      },
      "Sending AI response",
    );

    const sent = await this.discordApiClient.sendMessage(
      targetChannelId,
      result.value,
    );
    if (!sent) {
      log.error({ channelId: targetChannelId }, "Failed to send AI response");
    }
  }
}
