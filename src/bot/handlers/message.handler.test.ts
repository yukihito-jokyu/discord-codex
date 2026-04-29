import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIService } from "@/ai/services/ai.service";
import type { DiscordApiClient } from "@/infrastructure/discord/discord-api.client";
import type { GatewayEvent } from "@/sdk/discord/types/gateway";

const mockLogInfo = vi.fn();
const mockLogError = vi.fn();
const mockLogWarn = vi.fn();
const mockLogDebug = vi.fn();

vi.mock("@/shared/utils/logger", () => ({
  getLogger: vi.fn().mockReturnValue({
    info: mockLogInfo,
    error: mockLogError,
    warn: mockLogWarn,
    debug: mockLogDebug,
  }),
}));

const mockChat = vi.fn();
const mockSendMessage = vi.fn();

vi.mock("@/ai/services/ai.service", () => ({
  AIService: vi.fn().mockImplementation(() => ({ chat: mockChat })),
}));

vi.mock("@/infrastructure/discord/discord-api.client", () => ({
  DiscordApiClient: vi.fn().mockImplementation(() => ({
    sendMessage: mockSendMessage,
  })),
}));

const { MessageHandler } = await import("./message.handler");

function makeMentionEvent(
  overrides: Record<string, unknown> = {},
): GatewayEvent {
  return {
    type: "GATEWAY_MESSAGE_CREATE",
    timestamp: Date.now(),
    data: {
      id: "msg-1",
      channel_id: "ch-1",
      content: "<@app-id> hello",
      author: { id: "user-1", username: "testuser" },
      mentions: [{ id: "app-id", username: "testbot" }],
      ...overrides,
    },
  };
}

describe("MessageHandler handleGatewayEvent - success", () => {
  let handler: InstanceType<typeof MessageHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    const aiService = { chat: mockChat } as unknown as AIService;
    const discordApiClient = {
      sendMessage: mockSendMessage,
    } as unknown as DiscordApiClient;
    handler = new MessageHandler(aiService, discordApiClient, "app-id");
  });

  it("processes @mention message and sends AI response", async () => {
    mockChat.mockResolvedValue({ ok: true, value: "AI response here" });

    await handler.handleGatewayEvent(makeMentionEvent());

    expect(mockChat).toHaveBeenCalledWith("ch-1", "hello");
    expect(mockSendMessage).toHaveBeenCalledWith("ch-1", "AI response here");
  });

  it("strips nickname format mention from content", async () => {
    mockChat.mockResolvedValue({ ok: true, value: "response" });

    const event = makeMentionEvent({
      content: "<@!app-id> how are you?",
    });

    await handler.handleGatewayEvent(event);

    expect(mockChat).toHaveBeenCalledWith("ch-1", "how are you?");
  });
});

describe("MessageHandler handleGatewayEvent - filtering", () => {
  let handler: InstanceType<typeof MessageHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    const aiService = { chat: mockChat } as unknown as AIService;
    const discordApiClient = {
      sendMessage: mockSendMessage,
    } as unknown as DiscordApiClient;
    handler = new MessageHandler(aiService, discordApiClient, "app-id");
  });

  it("ignores non-mention events", async () => {
    const event = makeMentionEvent();
    (event.data as Record<string, unknown>).mentions = [];

    await handler.handleGatewayEvent(event);

    expect(mockChat).not.toHaveBeenCalled();
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("ignores bot messages", async () => {
    const event = makeMentionEvent();
    (event.data as Record<string, unknown>).author = {
      id: "bot-1",
      username: "testbot",
      bot: true,
    };

    await handler.handleGatewayEvent(event);

    expect(mockChat).not.toHaveBeenCalled();
  });

  it("ignores non-MESSAGE_CREATE events", async () => {
    const event: GatewayEvent = {
      type: "GATEWAY_MESSAGE_REACTION_ADD",
      timestamp: Date.now(),
      data: {},
    };

    await handler.handleGatewayEvent(event);

    expect(mockChat).not.toHaveBeenCalled();
  });

  it("ignores empty message after stripping mention", async () => {
    const event = makeMentionEvent({
      content: "<@app-id>",
    });

    await handler.handleGatewayEvent(event);

    expect(mockChat).not.toHaveBeenCalled();
    expect(mockLogDebug).toHaveBeenCalledWith(
      { channelId: "ch-1" },
      "Empty message after stripping mention",
    );
  });
});

describe("MessageHandler handleGatewayEvent - errors", () => {
  let handler: InstanceType<typeof MessageHandler>;

  beforeEach(() => {
    vi.clearAllMocks();
    const aiService = { chat: mockChat } as unknown as AIService;
    const discordApiClient = {
      sendMessage: mockSendMessage,
    } as unknown as DiscordApiClient;
    handler = new MessageHandler(aiService, discordApiClient, "app-id");
  });

  it("logs error when AIService fails", async () => {
    mockChat.mockResolvedValue({
      ok: false,
      error: { message: "Codex error" },
    });

    await handler.handleGatewayEvent(makeMentionEvent());

    expect(mockLogError).toHaveBeenCalledWith(
      { error: "Codex error", channelId: "ch-1" },
      "AI service error in mention handler",
    );
    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("logs error when sendMessage returns false", async () => {
    mockChat.mockResolvedValue({ ok: true, value: "AI response" });
    mockSendMessage.mockResolvedValue(false);

    await handler.handleGatewayEvent(makeMentionEvent());

    expect(mockSendMessage).toHaveBeenCalledWith("ch-1", "AI response");
    expect(mockLogError).toHaveBeenCalledWith(
      { channelId: "ch-1" },
      "Failed to send AI response to Discord",
    );
  });

  it("logs warning when message data extraction fails", async () => {
    const event: GatewayEvent = {
      type: "GATEWAY_MESSAGE_CREATE",
      timestamp: Date.now(),
      data: {
        mentions: [{ id: "app-id", username: "testbot" }],
        // missing required fields
      },
    };

    await handler.handleGatewayEvent(event);

    expect(mockLogWarn).toHaveBeenCalledWith(
      { error: expect.any(String) },
      "Failed to extract message data from gateway event",
    );
    expect(mockChat).not.toHaveBeenCalled();
  });
});
