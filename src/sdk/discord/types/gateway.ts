export interface GatewayEvent {
  type: string;
  timestamp: number;
  data: unknown;
}

export interface GatewayMessageAuthor {
  id: string;
  username: string;
  bot?: boolean;
}

export interface GatewayMessageMention {
  id: string;
  username: string;
}

export interface GatewayMessageData {
  id: string;
  channel_id: string;
  content: string;
  author: GatewayMessageAuthor;
  mentions: GatewayMessageMention[];
  guild_id?: string;
}
