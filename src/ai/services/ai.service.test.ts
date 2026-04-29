import { beforeEach, describe, expect, it, vi } from "vitest";

const mockChat = vi.fn();
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisDelete = vi.fn();

vi.mock("../client/codex.client", () => ({
  // biome-ignore lint/complexity/useArrowFunction: constructor mock requires function expression
  CodexClient: vi.fn().mockImplementation(function () {
    return { chat: mockChat };
  }),
}));

vi.mock("@/infrastructure/redis/redis.client", () => ({
  // biome-ignore lint/complexity/useArrowFunction: constructor mock requires function expression
  RedisClient: vi.fn().mockImplementation(function () {
    return {
      get: mockRedisGet,
      set: mockRedisSet,
      delete: mockRedisDelete,
    };
  }),
}));

vi.mock("@/shared/utils/logger", () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

async function createService() {
  const { AIService } = await import("./ai.service");
  const { CodexClient } = await import("../client/codex.client");
  const { RedisClient } = await import("@/infrastructure/redis/redis.client");
  return new AIService(
    new (CodexClient as ReturnType<typeof vi.fn>)(),
    new (RedisClient as ReturnType<typeof vi.fn>)(),
  );
}

describe("AIService chat new conversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockChat.mockResolvedValue({
      response: "AI response",
      threadId: "thread-abc",
      usage: null,
    });
    mockRedisSet.mockResolvedValue(undefined);
  });

  it("creates new thread when no mapping exists", async () => {
    const service = await createService();
    const result = await service.chat("channel-1", "Hello");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("AI response");
    }
  });

  it("saves thread mapping with TTL", async () => {
    const service = await createService();
    await service.chat("channel-1", "Hello");
    expect(mockRedisSet).toHaveBeenCalledWith(
      "thread:channel-1",
      "thread-abc",
      { ttlMs: 86400000 },
    );
  });

  it("passes null threadId to client when no mapping", async () => {
    const service = await createService();
    await service.chat("channel-1", "Hello");
    expect(mockChat).toHaveBeenCalledWith(null, expect.any(String));
  });
});

describe("AIService chat existing conversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue("thread-existing");
    mockChat.mockResolvedValue({
      response: "Continued response",
      threadId: "thread-existing",
      usage: null,
    });
    mockRedisSet.mockResolvedValue(undefined);
  });

  it("resumes existing thread from Redis mapping", async () => {
    const service = await createService();
    const result = await service.chat("channel-2", "Continue");
    expect(mockChat).toHaveBeenCalledWith(
      "thread-existing",
      expect.any(String),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("Continued response");
    }
  });

  it("sends only user message without system prompt on resume", async () => {
    const service = await createService();
    await service.chat("channel-2", "Continue");
    expect(mockChat).toHaveBeenCalledWith("thread-existing", "Continue");
  });
});

describe("AIService chat error handling Redis get", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ExternalServiceError for Redis on redis.get failure", async () => {
    mockRedisGet.mockRejectedValue(new Error("connection refused"));
    const service = await createService();
    const result = await service.chat("channel-3", "Hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe("ExternalServiceError");
      expect(result.error.message).toContain("Redis");
      expect(result.error.message).toContain("connection refused");
    }
  });

  it("handles non-Error thrown value from Redis on redis.get", async () => {
    mockRedisGet.mockRejectedValue(42);
    const service = await createService();
    const result = await service.chat("channel-3", "Hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("42");
    }
  });
});

describe("AIService chat error handling Codex", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ExternalServiceError for Codex on client failure", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockChat.mockRejectedValue(new Error("API rate limit"));
    const service = await createService();
    const result = await service.chat("channel-3", "Hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe("ExternalServiceError");
      expect(result.error.message).toContain("Codex");
      expect(result.error.message).toContain("API rate limit");
    }
  });

  it("handles non-Error thrown value from Codex", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockChat.mockRejectedValue("string error");
    const service = await createService();
    const result = await service.chat("channel-3", "Hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("string error");
    }
  });
});

describe("AIService chat error handling Redis set", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ExternalServiceError for Redis on redis.set failure", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockChat.mockResolvedValue({
      response: "AI response",
      threadId: "thread-abc",
      usage: null,
    });
    mockRedisSet.mockRejectedValue(new Error("write failed"));
    const service = await createService();
    const result = await service.chat("channel-3", "Hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe("ExternalServiceError");
      expect(result.error.message).toContain("Redis");
      expect(result.error.message).toContain("write failed");
    }
  });

  it("handles non-Error thrown value from Redis on redis.set", async () => {
    mockRedisGet.mockResolvedValue(null);
    mockChat.mockResolvedValue({
      response: "AI response",
      threadId: "thread-abc",
      usage: null,
    });
    mockRedisSet.mockRejectedValue(99);
    const service = await createService();
    const result = await service.chat("channel-3", "Hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("99");
    }
  });
});

describe("AIService chat includes system prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockChat.mockResolvedValue({
      response: "AI response",
      threadId: "thread-sys",
      usage: null,
    });
    mockRedisSet.mockResolvedValue(undefined);
  });

  it("includes system prompt in client input", async () => {
    const service = await createService();
    await service.chat("channel-sys", "Hello");
    expect(mockChat).toHaveBeenCalledWith(
      null,
      expect.stringContaining("AIアシスタント"),
    );
  });
});

describe("AIService chat boundary 2000 chars", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
  });

  it("does not truncate response of exactly 2000 characters", async () => {
    const exactResponse = "a".repeat(2000);
    mockChat.mockResolvedValue({
      response: exactResponse,
      threadId: "thread-2000",
      usage: null,
    });
    const service = await createService();
    const result = await service.chat("channel-2000", "Hello");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(2000);
      expect(result.value).not.toContain("省略");
    }
  });

  it("truncates response of 2001 characters", async () => {
    const overResponse = "a".repeat(2001);
    mockChat.mockResolvedValue({
      response: overResponse,
      threadId: "thread-2001",
      usage: null,
    });
    const service = await createService();
    const result = await service.chat("channel-2001", "Hello");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeLessThanOrEqual(2000);
      expect(result.value).toContain("省略");
    }
  });
});

describe("AIService chat long response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    const longResponse = "a".repeat(3000);
    mockChat.mockResolvedValue({
      response: longResponse,
      threadId: "thread-long",
      usage: null,
    });
    mockRedisSet.mockResolvedValue(undefined);
  });

  it("truncates response over 2000 characters", async () => {
    const service = await createService();
    const result = await service.chat("channel-4", "Long response");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeLessThanOrEqual(2000);
      expect(result.value).toContain("省略");
    }
  });
});

describe("AIService resetConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisDelete.mockResolvedValue(undefined);
  });

  it("deletes thread mapping from Redis", async () => {
    const service = await createService();
    await service.resetConversation("channel-5");
    expect(mockRedisDelete).toHaveBeenCalledWith("thread:channel-5");
  });

  it("propagates error when redis.delete fails", async () => {
    mockRedisDelete.mockRejectedValue(new Error("redis down"));
    const service = await createService();
    await expect(service.resetConversation("channel-5")).rejects.toThrow(
      "redis down",
    );
  });
});

describe("AIService chat empty thread ID from Redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue("");
    mockChat.mockResolvedValue({
      response: "New thread response",
      threadId: "thread-new",
      usage: null,
    });
    mockRedisSet.mockResolvedValue(undefined);
  });

  it("starts new thread when Redis returns empty string", async () => {
    const service = await createService();
    await service.chat("channel-empty", "Hello");
    expect(mockChat).toHaveBeenCalledWith(
      "",
      expect.stringContaining("AIアシスタント"),
    );
  });
});

describe("AIService linkThreadChannel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies thread mapping to thread channel with TTL", async () => {
    mockRedisGet.mockResolvedValue("thread-abc");
    mockRedisSet.mockResolvedValue(undefined);
    const service = await createService();

    await service.linkThreadChannel("channel-orig", "thread-ch");

    expect(mockRedisGet).toHaveBeenCalledWith("thread:channel-orig");
    expect(mockRedisSet).toHaveBeenCalledWith(
      "thread:thread-ch",
      "thread-abc",
      {
        ttlMs: 86400000,
      },
    );
  });

  it("does not call redis.set when original channel has no thread mapping", async () => {
    mockRedisGet.mockResolvedValue(null);
    const service = await createService();

    await service.linkThreadChannel("channel-orig", "thread-ch");

    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("does not call redis.set when thread ID is empty string", async () => {
    mockRedisGet.mockResolvedValue("");
    const service = await createService();

    await service.linkThreadChannel("channel-orig", "thread-ch");

    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it("propagates error when redis.get fails", async () => {
    mockRedisGet.mockRejectedValue(new Error("connection lost"));
    const service = await createService();

    await expect(
      service.linkThreadChannel("channel-orig", "thread-ch"),
    ).rejects.toThrow("connection lost");
  });

  it("propagates error when redis.set fails", async () => {
    mockRedisGet.mockResolvedValue("thread-abc");
    mockRedisSet.mockRejectedValue(new Error("write error"));
    const service = await createService();

    await expect(
      service.linkThreadChannel("channel-orig", "thread-ch"),
    ).rejects.toThrow("write error");
  });
});
