import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/logger", () => ({
  getLogger: vi.fn().mockReturnValue({ info: vi.fn() }),
}));

describe("createApp without deps", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns a Hono instance with fetch method", async () => {
    const { createApp } = await import("@/server/hono");

    const app = createApp();

    expect(typeof app.fetch).toBe("function");
    expect(typeof app.request).toBe("function");
  });

  it("responds to GET /health with 200", async () => {
    const { createApp } = await import("@/server/hono");

    const app = createApp();
    const res = await app.request("/health");

    expect(res.status).toBe(200);
  });

  it("responds to unknown route with 404", async () => {
    const { createApp } = await import("@/server/hono");

    const app = createApp();
    const res = await app.request("/nonexistent");

    expect(res.status).toBe(404);
  });

  it("does not mount discord route when no deps provided", async () => {
    const { createApp } = await import("@/server/hono");

    const app = createApp();
    const res = await app.request("/api/webhooks/discord", { method: "POST" });

    expect(res.status).toBe(404);
  });
});

describe("createApp with deps", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("mounts discord route when deps are provided", async () => {
    vi.doMock("@/server/middleware/verify-discord", () => ({
      verifyDiscord: async (_c: unknown, next: () => Promise<void>) => {
        await next();
      },
    }));
    vi.doMock("@/sdk/discord/adapter/interaction.adapter", () => ({
      toDomain: () => ({
        ok: true,
        value: { id: "1", type: "ping", channelId: "", userId: "" },
      }),
    }));
    vi.doMock("@/sdk/discord/adapter/response.adapter", () => ({
      toDiscord: (r: unknown) => r,
    }));

    const { createApp } = await import("@/server/hono");
    const mockHandler = {
      handle: vi.fn().mockResolvedValue({ type: 1 }),
    };

    const app = createApp({ interactionHandler: mockHandler as never });
    const res = await app.request("/api/webhooks/discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: 1 }),
    });

    expect(res.status).toBe(200);
  });
});
