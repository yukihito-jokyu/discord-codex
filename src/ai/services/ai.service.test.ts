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
});

describe("AIService chat error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockChat.mockRejectedValue(new Error("API rate limit"));
  });

  it("returns ExternalServiceError on client failure", async () => {
    const service = await createService();
    const result = await service.chat("channel-3", "Hello");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe("ExternalServiceError");
      expect(result.error.message).toContain("Codex");
      expect(result.error.message).toContain("API rate limit");
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
});
