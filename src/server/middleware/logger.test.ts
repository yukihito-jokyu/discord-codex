import type { Context, Next } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const mockLog = { info: vi.fn() };

vi.mock("@/shared/utils/logger", () => ({ getLogger: () => mockLog }));

const { logger } = await import("@/server/middleware/logger");

function setupMiddleware() {
  const set = vi.fn();
  const next = vi.fn().mockResolvedValue(undefined) as unknown as Next;
  const c = {
    req: { method: "GET", path: "/health" },
    set,
    res: { status: 200 },
  } as unknown as Context;
  return { c, set, next };
}

describe("logger middleware", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLog.info.mockReset();
  });

  it("logs request start with requestId, method, and path", async () => {
    const { c, next } = setupMiddleware();
    await logger(c, next);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: expect.any(String),
        method: "GET",
        path: "/health",
      }),
      "request start",
    );
  });

  it("logs request end with status and duration", async () => {
    const { c, next } = setupMiddleware();
    await logger(c, next);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: expect.any(String),
        method: "GET",
        path: "/health",
        status: 200,
        duration: expect.any(Number),
      }),
      "request end",
    );
  });

  it("sets requestId as UUID format", async () => {
    const { c, set, next } = setupMiddleware();
    await logger(c, next);
    expect(set).toHaveBeenCalledWith(
      "requestId",
      expect.stringMatching(UUID_RE),
    );
  });

  it("calls next", async () => {
    const { c, next } = setupMiddleware();
    await logger(c, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
