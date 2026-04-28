import type { RedisClient } from "@/infrastructure/redis/redis.client";
import { ExternalServiceError } from "@/shared/types/errors";
import { err, ok, type Result } from "@/shared/types/result";
import { DEFAULT_TTL_MS } from "@/shared/utils/constants";
import { formatForDiscord } from "@/shared/utils/format";
import type { CodexClient } from "../client/codex.client";
import { buildSystemPrompt } from "../prompts/system";

export class AIService {
  constructor(
    private client: CodexClient,
    private redis: RedisClient,
  ) {}

  async chat(channelId: string, userMessage: string): Promise<Result<string>> {
    const threadId = await this.redis.get(`thread:${channelId}`);

    try {
      const input = `${buildSystemPrompt()}\n\n---\n\n${userMessage}`;
      const result = await this.client.chat(threadId, input);
      await this.redis.set(`thread:${channelId}`, result.threadId, {
        ttlMs: DEFAULT_TTL_MS,
      });
      return ok(formatForDiscord(result.response));
    } catch (e) {
      return err(new ExternalServiceError("Codex", (e as Error).message));
    }
  }

  async resetConversation(channelId: string): Promise<void> {
    await this.redis.delete(`thread:${channelId}`);
  }
}
