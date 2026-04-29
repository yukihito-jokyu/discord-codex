import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLog = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

vi.mock("@/shared/utils/logger", () => ({ getLogger: () => mockLog }));

const mockEnv: Record<string, string | undefined> = {
  DISCORD_BOT_TOKEN: "test-token",
  DISCORD_PUBLIC_KEY: "test-key",
  DISCORD_APPLICATION_ID: "test-app-id",
};

vi.mock("@/app/config/env", () => ({
  get env() {
    return mockEnv;
  },
}));

const mockStartGatewayListener = vi.fn().mockResolvedValue(new Response());
const mockCreateDiscordAdapter = vi.fn().mockReturnValue({
  initialize: vi.fn().mockResolvedValue(undefined),
  startGatewayListener: mockStartGatewayListener,
});

vi.mock("@chat-adapter/discord", () => ({
  createDiscordAdapter: (...args: unknown[]) =>
    mockCreateDiscordAdapter(...args),
}));

const { DiscordGateway } = await import("@/server/gateway/discord.gateway");

function resetMocks() {
  vi.restoreAllMocks();
  mockLog.info.mockReset();
  mockLog.error.mockReset();
  mockCreateDiscordAdapter.mockClear();
  mockStartGatewayListener.mockClear();
  mockStartGatewayListener.mockResolvedValue(new Response());
  mockEnv.DISCORD_BOT_TOKEN = "test-token";
  mockEnv.DISCORD_PUBLIC_KEY = "test-key";
  mockEnv.DISCORD_APPLICATION_ID = "test-app-id";
}

describe("DiscordGateway - start validation", () => {
  beforeEach(resetMocks);

  it("throws when DISCORD_BOT_TOKEN is not configured", async () => {
    mockEnv.DISCORD_BOT_TOKEN = undefined;
    const gw = new DiscordGateway();

    await expect(gw.start()).rejects.toThrow(
      "Gateway requires DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, and DISCORD_APPLICATION_ID",
    );
  });

  it("throws when DISCORD_PUBLIC_KEY is not configured", async () => {
    mockEnv.DISCORD_PUBLIC_KEY = undefined;
    const gw = new DiscordGateway();

    await expect(gw.start()).rejects.toThrow(
      "Gateway requires DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, and DISCORD_APPLICATION_ID",
    );
  });

  it("throws when DISCORD_APPLICATION_ID is not configured", async () => {
    mockEnv.DISCORD_APPLICATION_ID = undefined;
    const gw = new DiscordGateway();

    await expect(gw.start()).rejects.toThrow(
      "Gateway requires DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, and DISCORD_APPLICATION_ID",
    );
  });

  it("throws when DISCORD_BOT_TOKEN is empty string", async () => {
    mockEnv.DISCORD_BOT_TOKEN = "";
    const gw = new DiscordGateway();

    await expect(gw.start()).rejects.toThrow(
      "Gateway requires DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, and DISCORD_APPLICATION_ID",
    );
  });

  it("throws when DISCORD_PUBLIC_KEY is empty string", async () => {
    mockEnv.DISCORD_PUBLIC_KEY = "";
    const gw = new DiscordGateway();

    await expect(gw.start()).rejects.toThrow(
      "Gateway requires DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, and DISCORD_APPLICATION_ID",
    );
  });

  it("throws when DISCORD_APPLICATION_ID is empty string", async () => {
    mockEnv.DISCORD_APPLICATION_ID = "";
    const gw = new DiscordGateway();

    await expect(gw.start()).rejects.toThrow(
      "Gateway requires DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, and DISCORD_APPLICATION_ID",
    );
  });
});

describe("DiscordGateway - start success", () => {
  beforeEach(resetMocks);

  it("creates adapter and calls startGatewayListener", async () => {
    const gw = new DiscordGateway();
    await gw.start("http://localhost:3000/api/webhooks/discord");

    expect(mockCreateDiscordAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        botToken: "test-token",
        publicKey: "test-key",
        applicationId: "test-app-id",
      }),
    );

    const [options, durationMs, signal, url] =
      mockStartGatewayListener.mock.calls[0];
    expect(typeof options.waitUntil).toBe("function");
    expect(durationMs).toBe(86_400_000);
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(url).toBe("http://localhost:3000/api/webhooks/discord");
  });

  it("passes undefined webhookUrl when not provided", async () => {
    const gw = new DiscordGateway();
    await gw.start();

    expect(mockStartGatewayListener.mock.calls[0][3]).toBeUndefined();
  });
});

describe("DiscordGateway - stop and errors", () => {
  beforeEach(resetMocks);

  it("stops gateway and logs message", async () => {
    const gw = new DiscordGateway();
    await gw.start();
    gw.stop();

    expect(mockLog.info).toHaveBeenCalledWith("Gateway listener stopped");
  });

  it("does nothing when not started", () => {
    new DiscordGateway().stop();
    expect(mockLog.info).not.toHaveBeenCalledWith("Gateway listener stopped");
  });

  it("logs error when waitUntil task fails", async () => {
    const gw = new DiscordGateway();
    await gw.start();

    const { waitUntil } = mockStartGatewayListener.mock.calls[0][0];
    waitUntil(Promise.reject(new Error("bg fail")));

    await new Promise((r) => setTimeout(r, 10));

    expect(mockLog.error).toHaveBeenCalledWith(
      { err: "Error: bg fail" },
      "Gateway background task error",
    );
  });
});
