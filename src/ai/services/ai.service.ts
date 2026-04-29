import type { RedisClient } from "@/infrastructure/redis/redis.client";
import { ExternalServiceError } from "@/shared/types/errors";
import { err, ok, type Result } from "@/shared/types/result";
import { DEFAULT_TTL_MS } from "@/shared/utils/constants";
import { formatForDiscord } from "@/shared/utils/format";
import type { ChatResult, CodexClient } from "../client/codex.client";
import { buildSystemPrompt } from "../prompts/system";

export class AIService {
  constructor(
    private client: CodexClient,
    private redis: RedisClient,
  ) {}

  async chat(channelId: string, userMessage: string): Promise<Result<string>> {
    let threadId: string | null;
    try {
      threadId = await this.redis.get(`thread:${channelId}`);
    } catch (e) {
      return err(
        new ExternalServiceError(
          "Redis",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }

    let result: ChatResult;
    try {
      const input = threadId
        ? userMessage
        : `${buildSystemPrompt()}\n\n---\n\n${userMessage}`;
      result = await this.client.chat(threadId, input);
    } catch (e) {
      return err(
        new ExternalServiceError(
          "Codex",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }

    try {
      await this.redis.set(`thread:${channelId}`, result.threadId, {
        ttlMs: DEFAULT_TTL_MS,
      });
    } catch (e) {
      return err(
        new ExternalServiceError(
          "Redis",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }

    return ok(formatForDiscord(result.response));
  }

  async resetConversation(channelId: string): Promise<void> {
    await this.redis.delete(`thread:${channelId}`);
  }

  async linkThreadChannel(
    originalChannelId: string,
    threadChannelId: string,
  ): Promise<void> {
    const threadId = await this.redis.get(`thread:${originalChannelId}`);
    if (threadId) {
      await this.redis.set(`thread:${threadChannelId}`, threadId, {
        ttlMs: DEFAULT_TTL_MS,
      });
    }
  }
}
