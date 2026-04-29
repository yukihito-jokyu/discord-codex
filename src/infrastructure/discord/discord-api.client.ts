import type { Command } from "@/bot/commands/command.interface";
import { getLogger } from "@/shared/utils/logger";

export class DiscordApiClient {
  private readonly baseUrl = "https://discord.com/api/v10";

  constructor(private botToken: string) {}

  async registerGuildCommands(
    applicationId: string,
    guildId: string,
    commands: Command[],
  ): Promise<void> {
    const log = getLogger();
    const url = `${this.baseUrl}/applications/${applicationId}/guilds/${guildId}/commands`;
    const body = commands
      .filter((c) => c.definition)
      .map((c) => ({ name: c.name, ...c.definition }));

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${this.botToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        log.error(
          { status: response.status, guildId },
          "Failed to register guild commands",
        );
        return;
      }

      log.info({ guildId, count: body.length }, "Guild commands registered");
    } catch (e) {
      log.error(
        {
          err: e instanceof Error ? e.message : String(e),
          guildId,
        },
        "Guild command registration request failed",
      );
    }
  }

  async sendMessage(channelId: string, content: string): Promise<boolean> {
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
        return false;
      }

      return true;
    } catch (e) {
      log.error(
        { err: e instanceof Error ? e.message : String(e), channelId },
        "Discord API request failed",
      );
      return false;
    }
  }

  async editInteractionResponse(
    applicationId: string,
    interactionToken: string,
    content: string,
  ): Promise<string | null> {
    const log = getLogger();
    const url = `${this.baseUrl}/webhooks/${applicationId}/${interactionToken}/messages/@original`;

    try {
      const response = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const body = await response.text();
        log.error(
          { status: response.status, body },
          "Failed to edit interaction response",
        );
        return null;
      }

      const data = (await response.json()) as { id?: string };
      return data.id ?? null;
    } catch (e) {
      log.error(
        { err: e instanceof Error ? e.message : String(e) },
        "Interaction followup request failed",
      );
      return null;
    }
  }

  async createThreadFromMessage(
    channelId: string,
    messageId: string,
    name: string,
  ): Promise<string | null> {
    const log = getLogger();
    const url = `${this.baseUrl}/channels/${channelId}/messages/${messageId}/threads`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bot ${this.botToken}`,
        },
        body: JSON.stringify({ name, auto_archive_duration: 60 }),
      });

      if (!response.ok) {
        const body = await response.text();
        log.error(
          { status: response.status, body, channelId, messageId },
          "Failed to create thread",
        );
        return null;
      }

      const data = (await response.json()) as { id?: string };
      return data.id ?? null;
    } catch (e) {
      log.error(
        {
          err: e instanceof Error ? e.message : String(e),
          channelId,
          messageId,
        },
        "Thread creation request failed",
      );
      return null;
    }
  }

  async getFirstMessage(channelId: string): Promise<string | null> {
    const log = getLogger();
    const url = `${this.baseUrl}/channels/${channelId}/messages?limit=50`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bot ${this.botToken}` },
      });

      if (!response.ok) {
        log.error(
          { status: response.status, channelId },
          "Failed to fetch messages",
        );
        return null;
      }

      const messages = (await response.json()) as Array<{
        id: string;
        content?: string;
      }>;
      if (messages.length === 0) return null;

      const oldest = messages.reduce((a, b) => (a.id < b.id ? a : b));
      return oldest.content ?? null;
    } catch (e) {
      log.error(
        { err: e instanceof Error ? e.message : String(e), channelId },
        "Message fetch request failed",
      );
      return null;
    }
  }

  async isThreadChannel(channelId: string): Promise<boolean> {
    const log = getLogger();
    const url = `${this.baseUrl}/channels/${channelId}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bot ${this.botToken}` },
      });

      if (!response.ok) {
        log.error(
          { status: response.status, channelId },
          "Failed to fetch channel info",
        );
        return false;
      }

      const data = (await response.json()) as { type?: number };
      // 11=public thread, 12=private thread, 13=announcement thread
      return data.type !== undefined && data.type >= 11 && data.type <= 13;
    } catch (e) {
      log.error(
        { err: e instanceof Error ? e.message : String(e), channelId },
        "Channel fetch request failed",
      );
      return false;
    }
  }
}
