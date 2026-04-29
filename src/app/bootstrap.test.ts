import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateLogger = vi.fn();
const mockInfo = vi.fn();
const mockDebug = vi.fn();
const mockWarn = vi.fn();

vi.mock("@/shared/utils/logger", () => ({
  createLogger: (...args: unknown[]) => mockCreateLogger(...args),
  getLogger: vi.fn().mockReturnValue({
    info: (...args: unknown[]) => mockInfo(...args),
    debug: (...args: unknown[]) => mockDebug(...args),
    warn: (...args: unknown[]) => mockWarn(...args),
  }),
}));

const mockCreateApp = vi.fn().mockReturnValue({ fetch: vi.fn() });
const mockStart = vi.fn().mockResolvedValue(undefined);

function setupMocks(
  config: Record<string, unknown>,
  envOverrides?: Record<string, unknown>,
) {
  vi.doMock("@/app/config/bot.config", () => ({
    loadConfig: vi.fn().mockReturnValue(config),
  }));
  vi.doMock("@/app/config/env", () => ({
    env: {
      NODE_ENV: "test",
      OPENAI_API_KEY: "test-key",
      DISCORD_PUBLIC_KEY: "test-pk",
      DISCORD_BOT_TOKEN: undefined,
      DISCORD_APPLICATION_ID: undefined,
      ...envOverrides,
    },
  }));
  vi.doMock("@/server/hono", () => ({
    createApp: mockCreateApp,
  }));
  vi.doMock("@/server/gateway/discord.gateway", () => ({
    // biome-ignore lint/complexity/useArrowFunction: constructor mock requires function
    DiscordGateway: vi.fn().mockImplementation(function () {
      return { start: mockStart, stop: vi.fn() };
    }),
  }));
  vi.doMock("@/infrastructure/redis/redis.client", () => ({
    // biome-ignore lint/complexity/useArrowFunction: constructor mock requires function
    RedisClient: vi.fn().mockImplementation(function () {
      return { connect: vi.fn().mockResolvedValue(undefined) };
    }),
  }));
  vi.doMock("@/ai/client/codex.client", () => ({
    // biome-ignore lint/complexity/useArrowFunction: constructor mock requires function
    CodexClient: vi.fn().mockImplementation(function () {
      return {};
    }),
  }));
}

describe("bootstrap result", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockCreateApp.mockClear();
    mockCreateApp.mockReturnValue({ fetch: vi.fn() });
  });

  it("returns app with fetch method and port from config", async () => {
    setupMocks({
      bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
      server: { port: 3000 },
      logging: { level: "info" },
    });

    const { bootstrap } = await import("@/app/bootstrap");

    const result = bootstrap();

    expect(typeof result.app.fetch).toBe("function");
    expect(result.port).toBe(3000);
  });

  it("passes interactionHandler to createApp", async () => {
    setupMocks({
      bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
      server: { port: 3000 },
      logging: { level: "info" },
    });

    const { bootstrap } = await import("@/app/bootstrap");

    bootstrap();

    expect(mockCreateApp).toHaveBeenCalledWith(
      expect.objectContaining({ interactionHandler: expect.any(Object) }),
    );
  });
});

describe("bootstrap gateway", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockCreateApp.mockClear();
    mockCreateApp.mockReturnValue({ fetch: vi.fn() });
  });

  it("returns null gateway when DISCORD_BOT_TOKEN is not set", async () => {
    setupMocks({
      bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
      server: { port: 3000 },
      logging: { level: "info" },
    });

    const { bootstrap } = await import("@/app/bootstrap");

    const result = bootstrap();

    expect(result.gateway).toBeNull();
  });

  it("returns gateway when DISCORD_BOT_TOKEN is set", async () => {
    setupMocks(
      {
        bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
        server: { port: 3000 },
        logging: { level: "info" },
      },
      { DISCORD_BOT_TOKEN: "test-bot-token" },
    );

    const { bootstrap } = await import("@/app/bootstrap");

    const result = bootstrap();

    expect(result.gateway).not.toBeNull();
    expect(result.gateway).toHaveProperty("start");
    expect(result.gateway).toHaveProperty("stop");
  });
});

describe("bootstrap logging", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockCreateLogger.mockReset();
    mockInfo.mockReset();
    mockDebug.mockReset();
  });

  it("calls createLogger with logging config", async () => {
    const loggingConfig = { level: "debug" };
    setupMocks({
      bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
      server: { port: 3000 },
      logging: loggingConfig,
    });

    const { bootstrap } = await import("@/app/bootstrap");

    bootstrap();

    expect(mockCreateLogger).toHaveBeenCalledWith(loggingConfig);
  });

  it("logs config and bootstrap completion", async () => {
    const config = {
      bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
      server: { port: 3000 },
      logging: { level: "info" },
    };
    setupMocks(config);

    const { bootstrap } = await import("@/app/bootstrap");

    bootstrap();

    expect(mockDebug).toHaveBeenCalledWith({ config }, "Config loaded");
    expect(mockInfo).toHaveBeenCalledWith(
      { port: config.server.port },
      "Bootstrap completed",
    );
  });
});

describe("bootstrap error", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("propagates loadConfig error", async () => {
    vi.doMock("@/app/config/bot.config", () => ({
      loadConfig: vi.fn().mockImplementation(() => {
        throw new Error("config error");
      }),
    }));

    const { bootstrap } = await import("@/app/bootstrap");

    expect(() => bootstrap()).toThrow("config error");
  });
});
