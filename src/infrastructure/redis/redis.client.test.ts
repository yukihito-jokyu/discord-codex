import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockConnect = vi.fn();
const mockQuit = vi.fn();
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockSetEx = vi.fn();
const mockDel = vi.fn();
const mockPing = vi.fn();
const mockOn = vi.fn();

vi.mock("redis", () => ({
  createClient: vi.fn().mockReturnValue({
    connect: mockConnect,
    quit: mockQuit,
    get: mockGet,
    set: mockSet,
    setEx: mockSetEx,
    del: mockDel,
    ping: mockPing,
    on: mockOn,
  }),
}));

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogError = vi.fn();

vi.mock("@/shared/utils/logger", () => ({
  getLogger: vi.fn().mockReturnValue({
    info: mockLogInfo,
    warn: mockLogWarn,
    error: mockLogError,
  }),
}));

async function createClient() {
  const { RedisClient } = await import("./redis.client");
  return new RedisClient("redis://localhost:6379");
}

function setupConnectedClient() {
  mockConnect.mockResolvedValue(undefined);
  mockOn.mockReturnValue(undefined);
}

describe("RedisClient connect success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
  });

  it("connects and sets isConnected to true", async () => {
    const client = await createClient();
    await client.connect();
    expect(client.isConnected).toBe(true);
  });

  it("logs info on successful connection", async () => {
    const client = await createClient();
    await client.connect();
    expect(mockLogInfo).toHaveBeenCalledWith(
      { url: "redis://localhost:6379" },
      "Redis connected",
    );
  });

  it("registers error event handler", async () => {
    const client = await createClient();
    await client.connect();
    expect(mockOn).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("registers reconnecting event handler", async () => {
    const client = await createClient();
    await client.connect();
    expect(mockOn).toHaveBeenCalledWith("reconnecting", expect.any(Function));
  });

  it("registers ready event handler", async () => {
    const client = await createClient();
    await client.connect();
    expect(mockOn).toHaveBeenCalledWith("ready", expect.any(Function));
  });
});

describe("RedisClient connect failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockRejectedValue(new Error("ECONNREFUSED"));
    mockOn.mockReturnValue(undefined);
  });

  it("falls back on connection failure", async () => {
    const client = await createClient();
    await client.connect();
    expect(client.isConnected).toBe(false);
  });

  it("logs warn on connection failure", async () => {
    const client = await createClient();
    await client.connect();
    expect(mockLogWarn).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Redis connection failed, falling back to in-memory",
    );
  });
});

describe("RedisClient error event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
  });

  it("sets connected to false on error event", async () => {
    const client = await createClient();
    await client.connect();
    expect(client.isConnected).toBe(true);
    const errorHandler = mockOn.mock.calls.find(
      (c: string[]) => c[0] === "error",
    )?.[1];
    errorHandler?.(new Error("connection lost"));
    expect(client.isConnected).toBe(false);
  });

  it("logs error on error event", async () => {
    const client = await createClient();
    await client.connect();
    const errorHandler = mockOn.mock.calls.find(
      (c: string[]) => c[0] === "error",
    )?.[1];
    errorHandler?.(new Error("connection lost"));
    expect(mockLogError).toHaveBeenCalledWith(
      { err: "connection lost" },
      "Redis error",
    );
  });
});

describe("RedisClient reconnecting event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
  });

  it("logs warn on reconnecting event", async () => {
    const client = await createClient();
    await client.connect();
    const reconnectingHandler = mockOn.mock.calls.find(
      (c: string[]) => c[0] === "reconnecting",
    )?.[1];
    reconnectingHandler?.();
    expect(mockLogWarn).toHaveBeenCalledWith("Redis reconnecting...");
  });
});

describe("RedisClient ready event", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
  });

  it("sets connected to true on ready event", async () => {
    const client = await createClient();
    await client.connect();
    const errorHandler = mockOn.mock.calls.find(
      (c: string[]) => c[0] === "error",
    )?.[1];
    errorHandler?.(new Error("connection lost"));
    expect(client.isConnected).toBe(false);
    const readyHandler = mockOn.mock.calls.find(
      (c: string[]) => c[0] === "ready",
    )?.[1];
    readyHandler?.();
    expect(client.isConnected).toBe(true);
  });

  it("logs info on ready event", async () => {
    const client = await createClient();
    await client.connect();
    const readyHandler = mockOn.mock.calls.find(
      (c: string[]) => c[0] === "ready",
    )?.[1];
    readyHandler?.();
    expect(mockLogInfo).toHaveBeenCalledWith("Redis reconnected and ready");
  });
});

describe("RedisClient disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
    mockQuit.mockResolvedValue(undefined);
  });

  it("disconnects connected client", async () => {
    const client = await createClient();
    await client.connect();
    await client.disconnect();
    expect(client.isConnected).toBe(false);
  });

  it("calls quit on the redis client", async () => {
    const client = await createClient();
    await client.connect();
    await client.disconnect();
    expect(mockQuit).toHaveBeenCalled();
  });

  it("is no-op when not connected", async () => {
    const client = await createClient();
    await client.disconnect();
    expect(mockQuit).not.toHaveBeenCalled();
  });

  it("cleans up when quit throws", async () => {
    mockQuit.mockRejectedValue(new Error("already closed"));
    const client = await createClient();
    await client.connect();
    await client.disconnect();
    expect(client.isConnected).toBe(false);
  });

  it("logs info when quit throws", async () => {
    mockQuit.mockRejectedValue(new Error("already closed"));
    const client = await createClient();
    await client.connect();
    await client.disconnect();
    expect(mockLogInfo).toHaveBeenCalledWith("Redis disconnected");
  });
});

describe("RedisClient get from redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
    mockGet.mockResolvedValue("value-from-redis");
    mockSet.mockResolvedValue("OK");
  });

  it("returns value from redis when connected", async () => {
    const client = await createClient();
    await client.connect();
    expect(await client.get("key")).toBe("value-from-redis");
  });

  it("returns null for missing key from redis", async () => {
    mockGet.mockResolvedValue(null);
    const client = await createClient();
    await client.connect();
    expect(await client.get("missing")).toBeNull();
  });

  it("falls back when redis throws", async () => {
    mockSet.mockRejectedValue(new Error("redis error"));
    mockGet.mockRejectedValue(new Error("redis error"));
    const client = await createClient();
    await client.connect();
    await client.set("key", "fallback-value");
    expect(await client.get("key")).toBe("fallback-value");
  });
});

describe("RedisClient get fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns value from fallback when not connected", async () => {
    const client = await createClient();
    await client.set("key", "in-memory-value");
    expect(await client.get("key")).toBe("in-memory-value");
  });

  it("returns null for missing fallback key", async () => {
    const client = await createClient();
    expect(await client.get("nonexistent")).toBeNull();
  });

  it("returns null and deletes expired entry", async () => {
    vi.useFakeTimers();
    const client = await createClient();
    await client.set("key", "value", { ttlMs: 1000 });
    vi.advanceTimersByTime(1001);
    expect(await client.get("key")).toBeNull();
    vi.useRealTimers();
  });
});

describe("RedisClient set to redis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
    mockSet.mockResolvedValue("OK");
    mockSetEx.mockResolvedValue("OK");
  });

  it("calls client.set without TTL", async () => {
    const client = await createClient();
    await client.connect();
    await client.set("key", "value");
    expect(mockSet).toHaveBeenCalledWith("key", "value");
  });

  it("calls client.setEx with TTL in seconds", async () => {
    const client = await createClient();
    await client.connect();
    await client.set("key", "value", { ttlMs: 5000 });
    expect(mockSetEx).toHaveBeenCalledWith("key", 5, "value");
  });

  it("falls back when redis throws on set", async () => {
    mockSet.mockRejectedValue(new Error("redis error"));
    const client = await createClient();
    await client.connect();
    await client.set("key", "fallback-value");
    expect(await client.get("key")).toBe("fallback-value");
  });

  it("calls client.set instead of setEx when ttlMs is 0", async () => {
    const client = await createClient();
    await client.connect();
    await client.set("key", "value", { ttlMs: 0 });
    expect(mockSet).toHaveBeenCalledWith("key", "value");
    expect(mockSetEx).not.toHaveBeenCalled();
  });
});

describe("RedisClient set fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores in fallback when not connected", async () => {
    const client = await createClient();
    await client.set("key", "value");
    expect(await client.get("key")).toBe("value");
  });
});

describe("RedisClient delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
    mockSet.mockResolvedValue("OK");
    mockDel.mockResolvedValue(1);
  });

  it("deletes from redis and fallback when connected", async () => {
    const client = await createClient();
    await client.connect();
    await client.set("key", "value");
    await client.delete("key");
    expect(mockDel).toHaveBeenCalledWith("key");
    expect(await client.get("key")).toBeNull();
  });

  it("deletes from fallback only when not connected", async () => {
    const client = await createClient();
    await client.set("key", "value");
    await client.delete("key");
    expect(await client.get("key")).toBeNull();
  });

  it("does not throw on non-existent key", async () => {
    const client = await createClient();
    await expect(client.delete("nonexistent")).resolves.toBeUndefined();
  });

  it("still deletes from fallback when redis del throws", async () => {
    mockDel.mockRejectedValue(new Error("redis error"));
    const client = await createClient();
    await client.connect();
    await client.set("key", "value");
    await client.delete("key");
    expect(await client.get("key")).toBeNull();
  });
});

describe("RedisClient ping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
    mockPing.mockResolvedValue("PONG");
  });

  it("returns true when connected and PONG received", async () => {
    const client = await createClient();
    await client.connect();
    expect(await client.ping()).toBe(true);
  });

  it("returns false when not connected", async () => {
    const client = await createClient();
    expect(await client.ping()).toBe(false);
  });

  it("returns false when ping throws", async () => {
    mockPing.mockRejectedValue(new Error("timeout"));
    const client = await createClient();
    await client.connect();
    expect(await client.ping()).toBe(false);
  });
});

describe("RedisClient isConnected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
    mockQuit.mockResolvedValue(undefined);
  });

  it("returns false initially", async () => {
    const client = await createClient();
    expect(client.isConnected).toBe(false);
  });

  it("returns true after connect", async () => {
    const client = await createClient();
    await client.connect();
    expect(client.isConnected).toBe(true);
  });

  it("returns false after disconnect", async () => {
    const client = await createClient();
    await client.connect();
    await client.disconnect();
    expect(client.isConnected).toBe(false);
  });
});

describe("RedisClient fallback TTL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns value before expiry", async () => {
    vi.useFakeTimers();
    const client = await createClient();
    await client.set("key", "value", { ttlMs: 10000 });
    vi.advanceTimersByTime(5000);
    expect(await client.get("key")).toBe("value");
  });

  it("returns null after expiry", async () => {
    vi.useFakeTimers();
    const client = await createClient();
    await client.set("key", "value", { ttlMs: 1000 });
    vi.advanceTimersByTime(1001);
    expect(await client.get("key")).toBeNull();
  });

  it("keeps permanent entry without TTL", async () => {
    vi.useFakeTimers();
    const client = await createClient();
    await client.set("key", "value");
    vi.advanceTimersByTime(86400000);
    expect(await client.get("key")).toBe("value");
  });
});

describe("RedisClient setEx TTL boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupConnectedClient();
    mockSetEx.mockResolvedValue("OK");
  });

  it("ceils ttlMs 1 to 1 second", async () => {
    const client = await createClient();
    await client.connect();
    await client.set("key", "value", { ttlMs: 1 });
    expect(mockSetEx).toHaveBeenCalledWith("key", 1, "value");
  });

  it("ceils ttlMs 999 to 1 second", async () => {
    const client = await createClient();
    await client.connect();
    await client.set("key", "value", { ttlMs: 999 });
    expect(mockSetEx).toHaveBeenCalledWith("key", 1, "value");
  });

  it("ceils ttlMs 1001 to 2 seconds", async () => {
    const client = await createClient();
    await client.connect();
    await client.set("key", "value", { ttlMs: 1001 });
    expect(mockSetEx).toHaveBeenCalledWith("key", 2, "value");
  });
});
