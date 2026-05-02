import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InteractionHandler } from "@/bot/handlers/interaction.handler";
import type { MessageHandler } from "@/bot/handlers/message.handler";
import type { DomainInteraction } from "@/sdk/discord/types/domain";

const mockLog = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock("@/shared/utils/logger", () => ({ getLogger: () => mockLog }));

vi.mock("@/server/middleware/verify-discord", () => ({
  verifyDiscordSignature: async () => null,
}));

const mockToDomain = vi.fn();
vi.mock("@/sdk/discord/adapter/interaction.adapter", () => ({
  toDomain: (...args: unknown[]) => mockToDomain(...args),
}));

const mockToDiscord = vi.fn();
vi.mock("@/sdk/discord/adapter/response.adapter", () => ({
  toDiscord: (...args: unknown[]) => mockToDiscord(...args),
}));

const mockParseGatewayEvent = vi.fn();
const mockIsMentionEvent = vi.fn().mockReturnValue(false);

vi.mock("@/sdk/discord/adapter/gateway-event.adapter", () => ({
  parseGatewayEvent: (...args: unknown[]) => mockParseGatewayEvent(...args),
  isMentionEvent: (...args: unknown[]) => mockIsMentionEvent(...args),
}));

const mockHandleGatewayEvent = vi.fn();
const mockSendMessage = vi.fn().mockResolvedValue(true);

const mockCheckAccessControl = vi.fn().mockResolvedValue(null);
const mockIsUserAllowed = vi.fn().mockReturnValue(true);

let actualAccessControl: typeof import("@/server/middleware/access-control");

vi.mock("@/server/middleware/access-control", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/server/middleware/access-control")>();
  actualAccessControl = actual;
  return {
    ...actual,
    checkAccessControl: (...args: unknown[]) => mockCheckAccessControl(...args),
    isUserAllowed: (...args: unknown[]) => mockIsUserAllowed(...args),
  };
});

const { createDiscordRoute } = await import("@/server/routes/discord.route");

function createMockHandler() {
  return { handle: vi.fn() } as unknown as InteractionHandler;
}

function createMockMessageHandler() {
  return {
    handleGatewayEvent: mockHandleGatewayEvent,
  } as unknown as MessageHandler;
}

function postGatewayEvent(
  app: ReturnType<typeof createDiscordRoute>,
  event: unknown,
) {
  return app.request("/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-discord-gateway-token": "test-bot-token",
    },
    body: JSON.stringify(event),
  });
}

const testDeps = {
  interactionHandler: createMockHandler(),
  messageHandler: createMockMessageHandler(),
  discordClient: { sendMessage: mockSendMessage },
  botToken: "test-bot-token",
  applicationId: "test-app-id",
  allowedUsers: ["allowed-user-1"],
};

describe("createDiscordRoute - error cases", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLog.warn.mockReset();
    mockLog.error.mockReset();
    mockToDomain.mockReset();
    mockToDiscord.mockReset();
  });

  it("returns 400 when toDomain returns error", async () => {
    mockToDomain.mockReturnValue({
      ok: false,
      error: new Error("missing interaction id"),
    });
    const app = createDiscordRoute(testDeps);

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "missing interaction id" });
  });

  it("returns 500 when handler throws", async () => {
    const handler = createMockHandler();
    mockToDomain.mockReturnValue({
      ok: true,
      value: {
        id: "3",
        type: "command",
        channelId: "",
        userId: "",
        commandName: "fail",
        raw: {},
      },
    });
    vi.mocked(handler).handle = vi.fn().mockRejectedValue(new Error("boom"));
    const app = createDiscordRoute({
      ...testDeps,
      interactionHandler: handler,
    });

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 2, id: "3" }),
    });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal error" });
  });
});

describe("createDiscordRoute - invalid body", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockToDomain.mockReset();
    mockToDiscord.mockReset();
  });

  it("returns 500 when body is not valid JSON", async () => {
    const handler = createMockHandler();
    const app = createDiscordRoute({
      ...testDeps,
      interactionHandler: handler,
    });

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    expect(res.status).toBe(500);
  });
});

describe("createDiscordRoute - ping interaction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockToDomain.mockReset();
    mockToDiscord.mockReset();
  });

  it("returns 200 with pong for ping interaction", async () => {
    const interaction: DomainInteraction = {
      id: "1",
      type: "ping",
      channelId: "",
      userId: "",
      raw: {},
    };
    const handler = createMockHandler();
    mockToDomain.mockReturnValue({ ok: true, value: interaction });
    vi.mocked(handler).handle = vi.fn().mockResolvedValue({ type: 1 });
    mockToDiscord.mockReturnValue({ type: 1 });
    const app = createDiscordRoute({
      ...testDeps,
      interactionHandler: handler,
    });

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 1, id: "1" }),
    });

    expect(res.status).toBe(200);
    expect(handler.handle).toHaveBeenCalledWith(interaction);
    expect(mockToDiscord).toHaveBeenCalledWith({ type: 1 });
  });
});

describe("createDiscordRoute - command interaction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockToDomain.mockReset();
    mockToDiscord.mockReset();
  });

  it("returns 200 with command response", async () => {
    const interaction: DomainInteraction = {
      id: "2",
      type: "command",
      channelId: "ch1",
      userId: "u1",
      commandName: "ping",
      raw: {},
    };
    const domainResponse = { type: 4, data: { content: "Pong!" } };
    const handler = createMockHandler();
    mockToDomain.mockReturnValue({ ok: true, value: interaction });
    vi.mocked(handler).handle = vi.fn().mockResolvedValue(domainResponse);
    mockToDiscord.mockReturnValue(domainResponse);
    const app = createDiscordRoute({
      ...testDeps,
      interactionHandler: handler,
    });

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 2, id: "2", data: { name: "ping" } }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(domainResponse);
  });
});

describe("createDiscordRoute - gateway event routing", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockParseGatewayEvent.mockReset();
    mockHandleGatewayEvent.mockReset();
    mockToDomain.mockReset();
  });

  it("routes gateway event to messageHandler", async () => {
    const event = { type: "GATEWAY_MESSAGE_CREATE", timestamp: 1, data: {} };
    mockParseGatewayEvent.mockReturnValue({ ok: true, value: event });
    mockHandleGatewayEvent.mockResolvedValue(undefined);
    const app = createDiscordRoute(testDeps);

    const res = await app.request("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discord-gateway-token": "test-bot-token",
      },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockHandleGatewayEvent).toHaveBeenCalledWith(event);
    expect(mockToDomain).not.toHaveBeenCalled();
  });

  it("returns 401 for invalid gateway token", async () => {
    const app = createDiscordRoute(testDeps);

    const res = await app.request("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discord-gateway-token": "wrong-token",
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
  });
});

describe("createDiscordRoute - gateway invalid payload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockParseGatewayEvent.mockReset();
    mockHandleGatewayEvent.mockReset();
  });

  it("returns 400 for invalid gateway event payload", async () => {
    mockParseGatewayEvent.mockReturnValue({
      ok: false,
      error: { message: "bad" },
    });
    const app = createDiscordRoute(testDeps);

    const res = await app.request("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-discord-gateway-token": "test-bot-token",
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "bad" });
    expect(mockHandleGatewayEvent).not.toHaveBeenCalled();
  });
});

describe("createDiscordRoute - gateway mention access denial", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockParseGatewayEvent.mockReset();
    mockHandleGatewayEvent.mockReset();
    mockIsMentionEvent.mockReset();
    mockIsUserAllowed.mockReset();
    mockSendMessage.mockReset();
    mockLog.warn.mockReset();
  });

  it("denies mention event from disallowed user and sends deny message", async () => {
    const event = {
      type: "GATEWAY_MESSAGE_CREATE",
      timestamp: 1,
      data: { author: { id: "disallowed-user" }, channel_id: "ch-123" },
    };
    mockParseGatewayEvent.mockReturnValue({ ok: true, value: event });
    mockIsMentionEvent.mockReturnValue(true);
    mockIsUserAllowed.mockReturnValue(false);
    mockSendMessage.mockResolvedValue(true);

    const res = await postGatewayEvent(createDiscordRoute(testDeps), event);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockSendMessage).toHaveBeenCalledWith(
      "ch-123",
      actualAccessControl.ACCESS_DENIED_MESSAGE,
    );
    expect(mockHandleGatewayEvent).not.toHaveBeenCalled();
    expect(mockLog.warn).toHaveBeenCalledWith(
      { authorId: "disallowed-user" },
      "Gateway event denied: user not in allowed list",
    );
  });

  it("denies mention event without channel_id and does not send message", async () => {
    const event = {
      type: "GATEWAY_MESSAGE_CREATE",
      timestamp: 1,
      data: { author: { id: "disallowed-user" } },
    };
    mockParseGatewayEvent.mockReturnValue({ ok: true, value: event });
    mockIsMentionEvent.mockReturnValue(true);
    mockIsUserAllowed.mockReturnValue(false);

    const res = await postGatewayEvent(createDiscordRoute(testDeps), event);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockHandleGatewayEvent).not.toHaveBeenCalled();
  });
});

describe("createDiscordRoute - gateway mention access allowance", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockParseGatewayEvent.mockReset();
    mockHandleGatewayEvent.mockReset();
    mockIsMentionEvent.mockReset();
    mockIsUserAllowed.mockReset();
    mockSendMessage.mockReset();
  });

  it("allows mention event from allowed user", async () => {
    const event = {
      type: "GATEWAY_MESSAGE_CREATE",
      timestamp: 1,
      data: { author: { id: "allowed-user-1" }, channel_id: "ch-123" },
    };
    mockParseGatewayEvent.mockReturnValue({ ok: true, value: event });
    mockIsMentionEvent.mockReturnValue(true);
    mockIsUserAllowed.mockReturnValue(true);
    mockHandleGatewayEvent.mockResolvedValue(undefined);

    const res = await postGatewayEvent(createDiscordRoute(testDeps), event);

    expect(res.status).toBe(200);
    expect(mockSendMessage).not.toHaveBeenCalled();
    expect(mockHandleGatewayEvent).toHaveBeenCalledWith(event);
  });

  it("skips access control for non-mention gateway event", async () => {
    const event = {
      type: "GATEWAY_MESSAGE_CREATE",
      timestamp: 1,
      data: { author: { id: "disallowed-user" }, channel_id: "ch-123" },
    };
    mockParseGatewayEvent.mockReturnValue({ ok: true, value: event });
    mockIsMentionEvent.mockReturnValue(false);
    mockHandleGatewayEvent.mockResolvedValue(undefined);

    const res = await postGatewayEvent(createDiscordRoute(testDeps), event);

    expect(res.status).toBe(200);
    expect(mockIsUserAllowed).not.toHaveBeenCalled();
    expect(mockHandleGatewayEvent).toHaveBeenCalledWith(event);
  });
});

describe("createDiscordRoute - interaction access control", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCheckAccessControl.mockReset();
    mockToDomain.mockReset();
    mockLog.warn.mockReset();
  });

  it("returns access denied response from checkAccessControl", async () => {
    mockCheckAccessControl.mockResolvedValue(
      new Response(
        JSON.stringify({ type: 4, data: { content: "deny", flags: 64 } }),
        { status: 200 },
      ),
    );

    const app = createDiscordRoute(testDeps);

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 2, id: "1" }),
    });

    expect(res.status).toBe(200);
    expect(mockToDomain).not.toHaveBeenCalled();
  });

  it("continues to interaction handling when access is allowed", async () => {
    mockCheckAccessControl.mockResolvedValue(null);
    const interaction: DomainInteraction = {
      id: "1",
      type: "command",
      channelId: "ch1",
      userId: "allowed-user-1",
      commandName: "ping",
      raw: {},
    };
    mockToDomain.mockReturnValue({ ok: true, value: interaction });
    const handler = createMockHandler();
    vi.mocked(handler).handle = vi
      .fn()
      .mockResolvedValue({ type: 4, data: { content: "Pong!" } });

    const app = createDiscordRoute({
      ...testDeps,
      interactionHandler: handler,
    });

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 2, id: "1", data: { name: "ping" } }),
    });

    expect(res.status).toBe(200);
    expect(mockToDomain).toHaveBeenCalled();
    expect(handler.handle).toHaveBeenCalledWith(interaction);
  });
});
