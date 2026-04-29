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
vi.mock("@/sdk/discord/adapter/gateway-event.adapter", () => ({
  parseGatewayEvent: (...args: unknown[]) => mockParseGatewayEvent(...args),
}));

const mockHandleGatewayEvent = vi.fn();

const { createDiscordRoute } = await import("@/server/routes/discord.route");

function createMockHandler() {
  return { handle: vi.fn() } as unknown as InteractionHandler;
}

function createMockMessageHandler() {
  return {
    handleGatewayEvent: mockHandleGatewayEvent,
  } as unknown as MessageHandler;
}

const testDeps = {
  interactionHandler: createMockHandler(),
  messageHandler: createMockMessageHandler(),
  botToken: "test-bot-token",
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

  it("returns 200 for invalid gateway event payload", async () => {
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

    expect(res.status).toBe(200);
    expect(mockHandleGatewayEvent).not.toHaveBeenCalled();
  });
});
