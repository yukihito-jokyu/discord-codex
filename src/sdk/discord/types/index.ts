// biome-ignore lint/performance/noBarrelFile: internal SDK re-exports
export {
  type APIInteraction,
  InteractionResponseType,
  InteractionType as DiscordInteractionType,
  MessageFlags,
} from "discord-api-types/v10";

export type {
  DomainInteraction,
  DomainResponse,
  InteractionType,
} from "./domain";
