import type {
  DomainInteraction,
  DomainResponse,
} from "@/sdk/discord/types/domain";

export interface CommandOption {
  name: string;
  description: string;
  type: number;
  required?: boolean;
}

export interface CommandDefinition {
  description: string;
  options?: CommandOption[];
}

export interface Command {
  readonly name: string;
  readonly definition?: CommandDefinition;
  execute(interaction: DomainInteraction): Promise<DomainResponse>;
}
