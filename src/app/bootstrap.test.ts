import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

describe("bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns app with fetch method and port from config", async () => {
    vi.doMock("@/app/config/bot.config", () => ({
      loadConfig: vi.fn().mockReturnValue({
        bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
        server: { port: 3000 },
      }),
    }));
    vi.doMock("@/server/hono", () => ({
      createApp: vi.fn().mockReturnValue({ fetch: vi.fn() }),
    }));

    const { bootstrap } = await import("@/app/bootstrap");

    const result = bootstrap();

    expect(typeof result.app.fetch).toBe("function");
    expect(result.port).toBe(3000);
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
