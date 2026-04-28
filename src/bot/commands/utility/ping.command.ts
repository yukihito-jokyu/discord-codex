import { message } from "@/sdk/discord/adapter/response.adapter";
import type {
  DomainInteraction,
  DomainResponse,
} from "@/sdk/discord/types/domain";
import type { Command } from "../command.interface";

export class PingCommand implements Command {
  readonly name = "ping";

  execute(_interaction: DomainInteraction): Promise<DomainResponse> {
    return Promise.resolve(message("Pong!"));
  }
}
