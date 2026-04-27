import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreateLogger = vi.fn();
const mockInfo = vi.fn();
const mockDebug = vi.fn();

vi.mock("@/shared/utils/logger", () => ({
  createLogger: (...args: unknown[]) => mockCreateLogger(...args),
  getLogger: vi.fn().mockReturnValue({
    info: (...args: unknown[]) => mockInfo(...args),
    debug: (...args: unknown[]) => mockDebug(...args),
  }),
}));

function setupMocks(config: Record<string, unknown>) {
  vi.doMock("@/app/config/bot.config", () => ({
    loadConfig: vi.fn().mockReturnValue(config),
  }));
  vi.doMock("@/server/hono", () => ({
    createApp: vi.fn().mockReturnValue({ fetch: vi.fn() }),
  }));
}

describe("bootstrap result", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
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
