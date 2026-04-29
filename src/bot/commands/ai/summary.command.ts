import type { SummaryService } from "@/ai/services/summary.service";
import type { DiscordApiClient } from "@/infrastructure/discord/discord-api.client";
import { deferred, message } from "@/sdk/discord/adapter/response.adapter";
import type {
  DomainInteraction,
  DomainResponse,
} from "@/sdk/discord/types/domain";
import { getLogger } from "@/shared/utils/logger";
import type { Command } from "../command.interface";

const URL_PATTERN = /https?:\/\/[^\s<>"|]+/g;

export class SummaryCommand implements Command {
  readonly name = "summary";
  readonly definition = {
    // biome-ignore lint/security/noSecrets: static Japanese UI text, not a secret
    description: "フォーラム投稿のリンクを要約",
  };

  constructor(
    private summaryService: SummaryService,
    private discordApiClient: DiscordApiClient,
    private applicationId: string,
  ) {}

  execute(interaction: DomainInteraction): Promise<DomainResponse> {
    const log = getLogger();

    log.debug({ channelId: interaction.channelId }, "SummaryCommand executing");

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

    this.processInBackground(interaction.channelId, token).catch((err) => {
      log.error({ err: String(err) }, "Summary background processing error");
    });

    return Promise.resolve(deferred());
  }

  private async processInBackground(
    channelId: string,
    interactionToken: string,
  ): Promise<void> {
    const log = getLogger();

    const content = await this.discordApiClient.getFirstMessage(channelId);
    if (!content) {
      log.warn({ channelId }, "No message found in channel");
      await this.discordApiClient.editInteractionResponse(
        this.applicationId,
        interactionToken,
        // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
        "メッセージの取得に失敗しました。",
      );
      return;
    }

    const urls = content.match(URL_PATTERN);
    if (!urls || urls.length === 0) {
      log.info({ channelId }, "No URLs found in message");
      await this.discordApiClient.editInteractionResponse(
        this.applicationId,
        interactionToken,
        // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
        "リンクが見つかりませんでした。",
      );
      return;
    }

    const result = await this.summaryService.summarize(urls);
    if (!result.ok) {
      log.error(
        { error: result.error.message, channelId },
        "Summary service returned error",
      );
      await this.discordApiClient.editInteractionResponse(
        this.applicationId,
        interactionToken,
        // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
        "要約の生成に失敗しました。しばらくしてからお試しください。",
      );
      return;
    }

    await this.discordApiClient.editInteractionResponse(
      this.applicationId,
      interactionToken,
      result.value,
    );
    log.info({ channelId, urlCount: urls.length }, "Summary completed");
  }
}
