import type {
  DomainInteraction,
  DomainResponse,
} from "@/sdk/discord/types/domain";

export interface Command {
  readonly name: string;
  execute(interaction: DomainInteraction): Promise<DomainResponse>;
}
