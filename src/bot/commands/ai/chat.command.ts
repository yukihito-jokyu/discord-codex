import type { AIService } from "@/ai/services/ai.service";
import { deferred, message } from "@/sdk/discord/adapter/response.adapter";
import type { DiscordClient } from "@/sdk/discord/discord.client";
import type {
  DomainInteraction,
  DomainResponse,
} from "@/sdk/discord/types/domain";
import { getLogger } from "@/shared/utils/logger";
import type { Command } from "../command.interface";

export class ChatCommand implements Command {
  readonly name = "chat";
  readonly definition = {
    description: "AIとチャット",
    options: [
      {
        name: "message",
        // biome-ignore lint/security/noSecrets: static Japanese UI text, not a secret
        description: "AIに送信するメッセージ",
        type: 3 as const,
        required: true,
      },
    ],
  };

  constructor(
    private aiService: AIService,
    private discordClient: DiscordClient,
  ) {}

  execute(interaction: DomainInteraction): Promise<DomainResponse> {
    const log = getLogger();
    const userMessage = (interaction.options?.message as string) ?? "";

    log.debug(
      { channelId: interaction.channelId, userMessage },
      "ChatCommand executing",
    );

    const token = (interaction.raw as { token?: string })?.token;
    if (!token) {
      log.error("Interaction has no token, cannot defer response");
      return Promise.resolve(
        message(
          // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
          "エラーが発生しました。しばらくしてからお試しください。",
          true,
        ),
      );
    }

    this.processInBackground(interaction.channelId, userMessage, token).catch(
      (err) => {
        log.error({ err: String(err) }, "Background processing error");
      },
    );

    return Promise.resolve(deferred());
  }

  private async processInBackground(
    channelId: string,
    userMessage: string,
    interactionToken: string,
  ): Promise<void> {
    const log = getLogger();

    const inThread = await this.isThreadChannel(channelId);
    const responseContent = inThread ? userMessage : `> ${userMessage}`;
    const messageId = await this.discordClient.editInteractionResponse(
      interactionToken,
      responseContent,
    );
    if (!messageId) return;

    let targetChannelId = channelId;
    if (!inThread && messageId) {
      const threadId = await this.discordClient.createThreadFromMessage(
        channelId,
        messageId,
        userMessage.slice(0, 100),
      );
      if (threadId) targetChannelId = threadId;
    }

    const result = await this.aiService.chat(channelId, userMessage);

    if (targetChannelId !== channelId) {
      await this.aiService.linkThreadChannel(channelId, targetChannelId);
    }

    if (!result.ok) {
      log.error(
        { error: result.error.message, channelId },
        "AI service returned error",
      );
      await this.discordClient.sendMessage(
        targetChannelId,
        // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
        "エラーが発生しました。しばらくしてからお試しください。",
      );
      return;
    }

    await this.discordClient.sendMessage(targetChannelId, result.value);
  }

  private async isThreadChannel(channelId: string): Promise<boolean> {
    const result = await this.discordClient.isThreadChannel(channelId);
    return result;
  }
}
