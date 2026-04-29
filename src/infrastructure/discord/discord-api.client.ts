import { getLogger } from "@/shared/utils/logger";

export class DiscordApiClient {
  private readonly baseUrl = "https://discord.com/api/v10";

  constructor(private botToken: string) {}

  async sendMessage(channelId: string, content: string): Promise<void> {
    const log = getLogger();
    const url = `${this.baseUrl}/channels/${channelId}/messages`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${this.botToken}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        log.error(
          { status: response.status, channelId },
          "Failed to send Discord message",
        );
      }
    } catch (e) {
      log.error(
        { err: e instanceof Error ? e.message : String(e), channelId },
        "Discord API request failed",
      );
    }
  }
}
