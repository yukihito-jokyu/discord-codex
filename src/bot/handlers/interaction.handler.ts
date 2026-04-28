import { message, pong } from "@/sdk/discord/adapter/response.adapter";
import type {
  DomainInteraction,
  DomainResponse,
} from "@/sdk/discord/types/domain";
import type { Router } from "../router";

export class InteractionHandler {
  constructor(private router: Router) {}

  async handle(interaction: DomainInteraction): Promise<DomainResponse> {
    if (interaction.type === "ping") {
      return pong();
    }

    const command = this.router.resolve(interaction);
    if (!command) {
      // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
      return message("不明なコマンドです", true);
    }

    try {
      return await command.execute(interaction);
    } catch {
      // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
      return message(
        "エラーが発生しました。しばらくしてからお試しください。",
        true,
      );
    }
  }
}
