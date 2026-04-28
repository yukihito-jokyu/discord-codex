export type InteractionType = "ping" | "command" | "component" | "modal";

export interface DomainInteraction {
  id: string;
  type: InteractionType;
  channelId: string;
  userId: string;
  commandName?: string;
  options?: Record<string, unknown>;
  customId?: string;
  raw: unknown;
}

export interface DomainResponse {
  type: number;
  data?: Record<string, unknown>;
}
