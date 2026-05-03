import type { RedisClient } from "@/infrastructure/redis/redis.client";
import { ExternalServiceError } from "@/shared/types/errors";
import { err, ok, type Result } from "@/shared/types/result";
import { DEFAULT_TTL_MS } from "@/shared/utils/constants";
import { formatForDiscord } from "@/shared/utils/format";
import type { ChatMessage, OpenAIClient } from "../client/openai.client";
import { buildSystemPrompt } from "../prompts/system";

const MESSAGES_KEY_PREFIX = "messages:";

export class AIService {
  constructor(
    private client: OpenAIClient,
    private redis: RedisClient,
  ) {}

  async chat(channelId: string, userMessage: string): Promise<Result<string>> {
    let messages: ChatMessage[];
    let stored: string | null;
    try {
      stored = await this.redis.get(`${MESSAGES_KEY_PREFIX}${channelId}`);
    } catch (e) {
      return err(
        new ExternalServiceError(
          "Redis",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }

    try {
      if (stored) {
        messages = JSON.parse(stored) as ChatMessage[];
      } else {
        messages = [{ role: "system", content: buildSystemPrompt() }];
      }
    } catch {
      messages = [{ role: "system", content: buildSystemPrompt() }];
    }

    messages.push({ role: "user", content: userMessage });

    const MAX_MESSAGES = 50;
    if (messages.length > MAX_MESSAGES) {
      messages = [messages[0], ...messages.slice(-(MAX_MESSAGES - 1))];
    }

    let responseContent: string;
    try {
      const result = await this.client.chat(messages);
      responseContent = result.response;
    } catch (e) {
      return err(
        new ExternalServiceError(
          "OpenAI",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }

    messages.push({ role: "assistant", content: responseContent });

    try {
      await this.redis.set(
        `${MESSAGES_KEY_PREFIX}${channelId}`,
        JSON.stringify(messages),
        { ttlMs: DEFAULT_TTL_MS },
      );
    } catch (e) {
      return err(
        new ExternalServiceError(
          "Redis",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }

    return ok(formatForDiscord(responseContent));
  }

  async resetConversation(channelId: string): Promise<void> {
    await this.redis.delete(`${MESSAGES_KEY_PREFIX}${channelId}`);
  }

  async linkThreadChannel(
    originalChannelId: string,
    threadChannelId: string,
  ): Promise<void> {
    const stored = await this.redis.get(
      `${MESSAGES_KEY_PREFIX}${originalChannelId}`,
    );
    if (stored) {
      await this.redis.set(`${MESSAGES_KEY_PREFIX}${threadChannelId}`, stored, {
        ttlMs: DEFAULT_TTL_MS,
      });
    }
  }
}
