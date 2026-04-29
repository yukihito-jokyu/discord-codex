import { beforeEach, describe, expect, it, vi } from "vitest";
import type { InteractionHandler } from "@/bot/handlers/interaction.handler";
import type { DomainInteraction } from "@/sdk/discord/types/domain";

const mockLog = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock("@/shared/utils/logger", () => ({ getLogger: () => mockLog }));

vi.mock("@/server/middleware/verify-discord", () => ({
  verifyDiscord: async (_c: unknown, next: () => Promise<void>) => {
    await next();
  },
}));

const mockToDomain = vi.fn();
vi.mock("@/sdk/discord/adapter/interaction.adapter", () => ({
  toDomain: (...args: unknown[]) => mockToDomain(...args),
}));

const mockToDiscord = vi.fn();
vi.mock("@/sdk/discord/adapter/response.adapter", () => ({
  toDiscord: (...args: unknown[]) => mockToDiscord(...args),
}));

const { createDiscordRoute } = await import("@/server/routes/discord.route");

function createMockHandler() {
  return { handle: vi.fn() } as unknown as InteractionHandler;
}

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
    const app = createDiscordRoute({ interactionHandler: createMockHandler() });

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
    const app = createDiscordRoute({ interactionHandler: handler });

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
    const app = createDiscordRoute({ interactionHandler: handler });

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    expect(res.status).toBe(500);
  });
});

describe("createDiscordRoute - success cases", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockToDomain.mockReset();
    mockToDiscord.mockReset();
  });

  it("returns 200 with pong for ping interaction", async () => {
    const handler = createMockHandler();
    const interaction: DomainInteraction = {
      id: "1",
      type: "ping",
      channelId: "",
      userId: "",
      raw: {},
    };
    mockToDomain.mockReturnValue({ ok: true, value: interaction });
    vi.mocked(handler).handle = vi.fn().mockResolvedValue({ type: 1 });
    mockToDiscord.mockReturnValue({ type: 1 });
    const app = createDiscordRoute({ interactionHandler: handler });

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 1, id: "1" }),
    });

    expect(res.status).toBe(200);
    expect(handler.handle).toHaveBeenCalledWith(interaction);
    expect(mockToDiscord).toHaveBeenCalledWith({ type: 1 });
  });

  it("returns 200 with command response", async () => {
    const handler = createMockHandler();
    const interaction: DomainInteraction = {
      id: "2",
      type: "command",
      channelId: "ch1",
      userId: "u1",
      commandName: "ping",
      raw: {},
    };
    const domainResponse = { type: 4, data: { content: "Pong!" } };
    mockToDomain.mockReturnValue({ ok: true, value: interaction });
    vi.mocked(handler).handle = vi.fn().mockResolvedValue(domainResponse);
    mockToDiscord.mockReturnValue({ type: 4, data: { content: "Pong!" } });
    const app = createDiscordRoute({ interactionHandler: handler });

    const res = await app.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 2, id: "2", data: { name: "ping" } }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ type: 4, data: { content: "Pong!" } });
  });
});
