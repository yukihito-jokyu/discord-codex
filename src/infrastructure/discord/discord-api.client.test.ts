import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLogInfo = vi.fn();
const mockLogError = vi.fn();

vi.mock("@/shared/utils/logger", () => ({
  getLogger: vi.fn().mockReturnValue({
    info: mockLogInfo,
    error: mockLogError,
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { DiscordApiClient } = await import("./discord-api.client");

describe("DiscordApiClient sendMessage success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on success", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const client = new DiscordApiClient("test-token");

    const result = await client.sendMessage("ch-123", "Hello!");

    expect(result).toBe(true);
  });

  it("sends message with correct URL and headers", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const client = new DiscordApiClient("test-token");

    await client.sendMessage("ch-123", "Hello!");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://discord.com/api/v10/channels/ch-123/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bot test-token",
        },
        body: JSON.stringify({ content: "Hello!" }),
      },
    );
  });
});

describe("DiscordApiClient sendMessage error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false on API error response", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403 });
    const client = new DiscordApiClient("test-token");

    await expect(client.sendMessage("ch-123", "Hello!")).resolves.toBe(false);
    expect(mockLogError).toHaveBeenCalledWith(
      { status: 403, channelId: "ch-123" },
      "Failed to send Discord message",
    );
  });

  it("returns false on network error", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new DiscordApiClient("test-token");

    await expect(client.sendMessage("ch-123", "Hello!")).resolves.toBe(false);
    expect(mockLogError).toHaveBeenCalledWith(
      { err: "ECONNREFUSED", channelId: "ch-123" },
      "Discord API request failed",
    );
  });

  it("logs error with status 429 for rate limiting", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 429 });
    const client = new DiscordApiClient("test-token");

    await client.sendMessage("ch-123", "Hello!");

    expect(mockLogError).toHaveBeenCalledWith(
      { status: 429, channelId: "ch-123" },
      "Failed to send Discord message",
    );
  });
});
