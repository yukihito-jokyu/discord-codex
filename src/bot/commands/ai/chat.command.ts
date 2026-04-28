import type { AIService } from "@/ai/services/ai.service";
import { message } from "@/sdk/discord/adapter/response.adapter";
import type {
  DomainInteraction,
  DomainResponse,
} from "@/sdk/discord/types/domain";
import type { Command } from "../command.interface";

export class ChatCommand implements Command {
  readonly name = "chat";

  constructor(private aiService: AIService) {}

  async execute(interaction: DomainInteraction): Promise<DomainResponse> {
    const userMessage = (interaction.options?.message as string) ?? "";
    const result = await this.aiService.chat(
      interaction.channelId,
      userMessage,
    );

    if (!result.ok) {
      return message(
        // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
        "エラーが発生しました。しばらくしてからお試しください。",
        true,
      );
    }

    return message(result.value);
  }
}
