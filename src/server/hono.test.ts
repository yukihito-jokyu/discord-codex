import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

describe("createApp", () => {
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
});
