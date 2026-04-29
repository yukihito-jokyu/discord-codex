import type { Context, Next } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLog = {
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};

const mockEnv: { DISCORD_PUBLIC_KEY: string | undefined } = {
  DISCORD_PUBLIC_KEY: "test-public-key",
};

vi.mock("@/shared/utils/logger", () => ({ getLogger: () => mockLog }));

vi.mock("@/app/config/env", () => ({
  get env() {
    return mockEnv;
  },
}));

const mockVerifyAsync = vi.fn();

vi.mock("@noble/ed25519", () => ({
  etc: { hexToBytes: (hex: string) => new TextEncoder().encode(hex) },
  verifyAsync: (...args: unknown[]) => mockVerifyAsync(...args),
}));

const { verifyDiscord } = await import("@/server/middleware/verify-discord");

function createContext(headers: Record<string, string> = {}, body = "") {
  const raw = new Request("https://example.com", {
    method: "POST",
    headers,
    body,
  });
  const set = vi.fn();
  const next = vi.fn().mockResolvedValue(undefined) as unknown as Next;
  const c = {
    req: { header: (name: string) => headers[name] ?? null, raw },
    set,
    json: vi.fn().mockReturnValue({}),
    res: { status: 200 },
  } as unknown as Context;
  return { c, set, next };
}

describe("verifyDiscord - config and header errors", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLog.error.mockReset();
    mockLog.warn.mockReset();
    mockEnv.DISCORD_PUBLIC_KEY = "test-public-key";
  });

  it("returns 401 when DISCORD_PUBLIC_KEY is not configured", async () => {
    mockEnv.DISCORD_PUBLIC_KEY = undefined;
    const { c, next } = createContext();

    await verifyDiscord(c, next);

    expect(c.json).toHaveBeenCalledWith(
      { error: "Server configuration error" },
      401,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when x-signature-ed25519 header is missing", async () => {
    const { c, next } = createContext({ "x-signature-timestamp": "ts" });

    await verifyDiscord(c, next);

    expect(c.json).toHaveBeenCalledWith(
      { error: "Missing signature headers" },
      401,
    );
  });

  it("returns 401 when x-signature-timestamp header is missing", async () => {
    const { c, next } = createContext({ "x-signature-ed25519": "sig" });

    await verifyDiscord(c, next);

    expect(c.json).toHaveBeenCalledWith(
      { error: "Missing signature headers" },
      401,
    );
  });
});

describe("verifyDiscord - signature rejection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLog.warn.mockReset();
    mockLog.error.mockReset();
    mockVerifyAsync.mockReset();
    mockEnv.DISCORD_PUBLIC_KEY = "test-public-key";
  });

  it("returns 401 when signature is invalid", async () => {
    mockVerifyAsync.mockResolvedValue(false);
    const { c, next } = createContext(
      { "x-signature-ed25519": "badsig", "x-signature-timestamp": "ts" },
      '{"type":1}',
    );

    await verifyDiscord(c, next);

    expect(c.json).toHaveBeenCalledWith({ error: "Invalid signature" }, 401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when verifyAsync throws", async () => {
    mockVerifyAsync.mockRejectedValue(new Error("bad key"));
    const { c, next } = createContext(
      { "x-signature-ed25519": "sig", "x-signature-timestamp": "ts" },
      '{"type":1}',
    );

    await verifyDiscord(c, next);

    expect(c.json).toHaveBeenCalledWith({ error: "Invalid signature" }, 401);
  });
});

describe("verifyDiscord - signature success", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLog.debug.mockReset();
    mockVerifyAsync.mockReset();
    mockEnv.DISCORD_PUBLIC_KEY = "test-public-key";
  });

  it("calls next when signature is valid", async () => {
    mockVerifyAsync.mockResolvedValue(true);
    const { c, next } = createContext(
      { "x-signature-ed25519": "validsig", "x-signature-timestamp": "ts" },
      '{"type":1}',
    );

    await verifyDiscord(c, next);

    expect(next).toHaveBeenCalledOnce();
    expect(mockLog.debug).toHaveBeenCalledWith(
      "Discord signature verification passed",
    );
  });

  it("preserves request body for downstream handler", async () => {
    mockVerifyAsync.mockResolvedValue(true);
    const body = '{"type":1,"id":"test"}';
    const { c, next } = createContext(
      { "x-signature-ed25519": "validsig", "x-signature-timestamp": "ts" },
      body,
    );

    await verifyDiscord(c, next);

    expect(await c.req.raw.text()).toBe(body);
  });
});
