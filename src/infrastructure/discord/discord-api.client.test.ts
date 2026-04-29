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

describe("DiscordApiClient editInteractionResponse success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns message ID on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "msg-789" }),
    });
    const client = new DiscordApiClient("test-token");

    const result = await client.editInteractionResponse(
      "app-123",
      "token-abc",
      "response content",
    );

    expect(result).toBe("msg-789");
  });

  it("returns null when response has no id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const client = new DiscordApiClient("test-token");

    const result = await client.editInteractionResponse(
      "app-123",
      "token-abc",
      "content",
    );

    expect(result).toBeNull();
  });
});

describe("DiscordApiClient editInteractionResponse error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null on API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve("Not found"),
    });
    const client = new DiscordApiClient("test-token");

    const result = await client.editInteractionResponse(
      "app-123",
      "token-abc",
      "content",
    );

    expect(result).toBeNull();
    expect(mockLogError).toHaveBeenCalledWith(
      { status: 404, body: "Not found" },
      "Failed to edit interaction response",
    );
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new DiscordApiClient("test-token");

    const result = await client.editInteractionResponse(
      "app-123",
      "token-abc",
      "content",
    );

    expect(result).toBeNull();
    expect(mockLogError).toHaveBeenCalledWith(
      { err: "ECONNREFUSED" },
      "Interaction followup request failed",
    );
  });
});

describe("DiscordApiClient createThreadFromMessage success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns thread channel ID on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "thread-999" }),
    });
    const client = new DiscordApiClient("test-token");

    const result = await client.createThreadFromMessage(
      "ch-123",
      "msg-456",
      "AI Chat",
    );

    expect(result).toBe("thread-999");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://discord.com/api/v10/channels/ch-123/messages/msg-456/threads",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bot test-token",
        },
        body: JSON.stringify({
          name: "AI Chat",
          auto_archive_duration: 60,
        }),
      },
    );
  });

  it("returns null when response has no id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });
    const client = new DiscordApiClient("test-token");

    const result = await client.createThreadFromMessage(
      "ch-123",
      "msg-456",
      "AI Chat",
    );

    expect(result).toBeNull();
  });
});

describe("DiscordApiClient createThreadFromMessage error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null on API error", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });
    const client = new DiscordApiClient("test-token");

    const result = await client.createThreadFromMessage(
      "ch-123",
      "msg-456",
      "AI Chat",
    );

    expect(result).toBeNull();
    expect(mockLogError).toHaveBeenCalledWith(
      {
        status: 403,
        body: "Forbidden",
        channelId: "ch-123",
        messageId: "msg-456",
      },
      "Failed to create thread",
    );
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new DiscordApiClient("test-token");

    const result = await client.createThreadFromMessage(
      "ch-123",
      "msg-456",
      "AI Chat",
    );

    expect(result).toBeNull();
    expect(mockLogError).toHaveBeenCalledWith(
      { err: "ECONNREFUSED", channelId: "ch-123", messageId: "msg-456" },
      "Thread creation request failed",
    );
  });
});

const testCommands = [
  {
    name: "ping",
    definition: { description: "Ping-Pong" },
    execute: vi.fn(),
  },
  {
    name: "chat",
    definition: {
      description: "Chat",
      options: [{ name: "msg", description: "msg", type: 3 }],
    },
    execute: vi.fn(),
  },
];

describe("DiscordApiClient registerGuildCommands success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers commands via PUT request", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const client = new DiscordApiClient("test-token");

    await client.registerGuildCommands("app-123", "guild-456", testCommands);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://discord.com/api/v10/applications/app-123/guilds/guild-456/commands",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bot test-token",
        },
        body: JSON.stringify([
          { name: "ping", description: "Ping-Pong" },
          {
            name: "chat",
            description: "Chat",
            options: [{ name: "msg", description: "msg", type: 3 }],
          },
        ]),
      },
    );
  });

  it("filters out commands without definition", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const client = new DiscordApiClient("test-token");
    const commandsWithUndefined = [
      ...testCommands,
      { name: "no-def", execute: vi.fn() },
    ];

    await client.registerGuildCommands(
      "app-123",
      "guild-456",
      commandsWithUndefined as typeof testCommands,
    );

    const callArgs = mockFetch.mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body).toHaveLength(2);
  });

  it("logs info on success", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const client = new DiscordApiClient("test-token");

    await client.registerGuildCommands("app-123", "guild-456", testCommands);

    expect(mockLogInfo).toHaveBeenCalledWith(
      { guildId: "guild-456", count: 2 },
      "Guild commands registered",
    );
  });
});

describe("DiscordApiClient registerGuildCommands error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs error on API failure", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 });
    const client = new DiscordApiClient("test-token");

    await client.registerGuildCommands("app-123", "guild-456", testCommands);

    expect(mockLogError).toHaveBeenCalledWith(
      { status: 401, guildId: "guild-456" },
      "Failed to register guild commands",
    );
  });

  it("logs error on network failure", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));
    const client = new DiscordApiClient("test-token");

    await client.registerGuildCommands("app-123", "guild-456", testCommands);

    expect(mockLogError).toHaveBeenCalledWith(
      { err: "ECONNREFUSED", guildId: "guild-456" },
      "Guild command registration request failed",
    );
  });
});
