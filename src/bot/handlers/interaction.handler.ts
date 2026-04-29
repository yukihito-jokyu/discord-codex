import { message, pong } from "@/sdk/discord/adapter/response.adapter";
import type {
  DomainInteraction,
  DomainResponse,
} from "@/sdk/discord/types/domain";
import { getLogger } from "@/shared/utils/logger";
import type { Router } from "../router";

export class InteractionHandler {
  constructor(private router: Router) {}

  async handle(interaction: DomainInteraction): Promise<DomainResponse> {
    const log = getLogger();

    if (interaction.type === "ping") {
      return pong();
    }

    log.debug(
      { type: interaction.type, commandName: interaction.commandName },
      "Handling interaction",
    );

    const command = this.router.resolve(interaction);
    if (!command) {
      log.warn({ commandName: interaction.commandName }, "Unknown command");
      // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
      return message("不明なコマンドです", true);
    }

    try {
      const result = await command.execute(interaction);
      log.debug({ commandName: command.name }, "Command executed successfully");
      return result;
    } catch (err) {
      log.error(
        { err: String(err), commandName: command.name },
        "Command execution error",
      );
      return message(
        // biome-ignore lint/security/noSecrets: static Japanese error message, not a secret
        "エラーが発生しました。しばらくしてからお試しください。",
        true,
      );
    }
  }
}
