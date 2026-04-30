import type { Context, Next } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockLog = {
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
};

vi.mock("@/shared/utils/logger", () => ({ getLogger: () => mockLog }));

const { checkAccessControl, createAccessControl, isUserAllowed } = await import(
  "@/server/middleware/access-control"
);

function createContext(body: string) {
  const raw = new Request("https://example.com", {
    method: "POST",
    body,
  });
  const json = vi.fn().mockReturnValue({});
  const next = vi.fn().mockResolvedValue(undefined) as unknown as Next;
  const c = {
    req: { raw },
    json,
  } as unknown as Context;
  return { c, next };
}

const ALLOWED_USERS = ["user_1", "user_2"];

describe("checkAccessControl - pass-through conditions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLog.warn.mockReset();
  });

  it("returns ephemeral response when allowedUsers is undefined", async () => {
    const { c } = createContext('{"type":2,"member":{"user":{"id":"user_1"}}}');
    const result = await checkAccessControl(c);
    expect(result).not.toBeNull();
  });

  it("returns ephemeral response when allowedUsers is empty array", async () => {
    const { c } = createContext('{"type":2,"member":{"user":{"id":"user_1"}}}');
    const result = await checkAccessControl(c, []);
    expect(result).not.toBeNull();
  });

  it("returns null for PING interaction (type=1)", async () => {
    const { c } = createContext('{"type":1}');
    const result = await checkAccessControl(c, ALLOWED_USERS);
    expect(result).toBeNull();
  });

  it("returns null when userId is in allowedUsers (member.user.id)", async () => {
    const { c } = createContext('{"type":2,"member":{"user":{"id":"user_1"}}}');
    const result = await checkAccessControl(c, ALLOWED_USERS);
    expect(result).toBeNull();
  });

  it("returns null when userId is in allowedUsers (user.id)", async () => {
    const { c } = createContext('{"type":2,"user":{"id":"user_2"}}');
    const result = await checkAccessControl(c, ALLOWED_USERS);
    expect(result).toBeNull();
  });
});

describe("checkAccessControl - denial", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLog.warn.mockReset();
  });

  it("returns ephemeral response when userId is not in allowedUsers", async () => {
    const { c } = createContext(
      '{"type":2,"member":{"user":{"id":"unknown_user"}}}',
    );
    const result = await checkAccessControl(c, ALLOWED_USERS);

    expect(result).not.toBeNull();
    expect(c.json).toHaveBeenCalledWith(
      {
        type: 4,
        data: {
          content: "このBotを利用する権限がありません。",
          flags: 64,
        },
      },
      200,
    );
    expect(mockLog.warn).toHaveBeenCalledWith(
      { userId: "unknown_user" },
      "Access denied: user not in allowed list",
    );
  });

  it("returns ephemeral response when userId is empty string", async () => {
    const { c } = createContext('{"type":2,"member":{"user":{"id":""}}}');
    const result = await checkAccessControl(c, ALLOWED_USERS);

    expect(result).not.toBeNull();
    expect(c.json).toHaveBeenCalledWith(
      {
        type: 4,
        data: {
          content: "このBotを利用する権限がありません。",
          flags: 64,
        },
      },
      200,
    );
  });

  it("returns ephemeral response when user field is missing", async () => {
    const { c } = createContext('{"type":2}');
    const result = await checkAccessControl(c, ALLOWED_USERS);

    expect(result).not.toBeNull();
  });
});

describe("isUserAllowed", () => {
  it("returns true when userId is in allowedUsers", () => {
    expect(isUserAllowed("user_1", ALLOWED_USERS)).toBe(true);
  });

  it("returns false when userId is not in allowedUsers", () => {
    expect(isUserAllowed("unknown", ALLOWED_USERS)).toBe(false);
  });

  it("returns false when userId is undefined", () => {
    expect(isUserAllowed(undefined, ALLOWED_USERS)).toBe(false);
  });

  it("returns false when allowedUsers is undefined", () => {
    expect(isUserAllowed("user_1", undefined)).toBe(false);
  });

  it("returns false when allowedUsers is empty array", () => {
    expect(isUserAllowed("user_1", [])).toBe(false);
  });

  it("returns false when userId is empty string", () => {
    expect(isUserAllowed("", ALLOWED_USERS)).toBe(false);
  });
});

describe("createAccessControl - middleware wrapper", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls next when access is allowed", async () => {
    const middleware = createAccessControl(ALLOWED_USERS);
    const { c, next } = createContext(
      '{"type":2,"member":{"user":{"id":"user_1"}}}',
    );

    await middleware(c, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("returns ephemeral response when access is denied", async () => {
    const middleware = createAccessControl(ALLOWED_USERS);
    const { c, next } = createContext(
      '{"type":2,"member":{"user":{"id":"unknown"}}}',
    );

    await middleware(c, next);

    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith(
      {
        type: 4,
        data: {
          content: "このBotを利用する権限がありません。",
          flags: 64,
        },
      },
      200,
    );
  });

  it("returns ephemeral response when allowedUsers is undefined", async () => {
    const middleware = createAccessControl(undefined);
    const { c, next } = createContext(
      '{"type":2,"member":{"user":{"id":"user_1"}}}',
    );

    await middleware(c, next);

    expect(next).not.toHaveBeenCalled();
    expect(c.json).toHaveBeenCalledWith(
      {
        type: 4,
        data: {
          content: "このBotを利用する権限がありません。",
          flags: 64,
        },
      },
      200,
    );
  });
});
