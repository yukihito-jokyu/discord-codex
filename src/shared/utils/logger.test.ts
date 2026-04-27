import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPino = vi.fn();

const mockEnv = { NODE_ENV: "test" };

vi.mock("pino", () => ({
  default: (...args: unknown[]) => mockPino(...args),
}));

vi.mock("@/app/config/env", () => ({
  get env() {
    return mockEnv;
  },
}));

function setup() {
  vi.resetModules();
  vi.restoreAllMocks();
  mockPino.mockReset();
  mockPino.mockReturnValue({ info: vi.fn() });
  return import("@/shared/utils/logger");
}

describe("createLogger level", () => {
  beforeEach(async () => {
    const { resetLogger } = await setup();
    resetLogger();
  });

  it("creates logger with config level when provided", async () => {
    const { createLogger } = await setup();
    const { resetLogger } = await import("@/shared/utils/logger");
    resetLogger();

    createLogger({ level: "debug" });

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "debug" }),
    );
  });

  it("falls back to env default when config has no level", async () => {
    mockEnv.NODE_ENV = "development";
    const { createLogger, resetLogger } = await setup();
    resetLogger();

    createLogger({});

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "debug" }),
    );
  });

  it("falls back to env default when config is undefined", async () => {
    mockEnv.NODE_ENV = "production";
    const { createLogger, resetLogger } = await setup();
    resetLogger();

    createLogger();

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "info" }),
    );
  });
});

describe("createLogger transport", () => {
  beforeEach(async () => {
    const { resetLogger } = await setup();
    resetLogger();
  });

  it("uses pino-pretty transport in development", async () => {
    mockEnv.NODE_ENV = "development";
    const { createLogger, resetLogger } = await setup();
    resetLogger();

    createLogger();

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.objectContaining({ target: "pino-pretty" }),
      }),
    );
  });

  it("uses pino-pretty transport in test", async () => {
    mockEnv.NODE_ENV = "test";
    const { createLogger, resetLogger } = await setup();
    resetLogger();

    createLogger();

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.objectContaining({ target: "pino-pretty" }),
      }),
    );
  });

  it("uses no transport in production", async () => {
    mockEnv.NODE_ENV = "production";
    const { createLogger, resetLogger } = await setup();
    resetLogger();

    createLogger();

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ transport: undefined }),
    );
  });
});

describe("getLogger", () => {
  beforeEach(async () => {
    const { resetLogger } = await setup();
    resetLogger();
  });

  it("returns cached logger after createLogger is called", async () => {
    mockPino.mockReturnValue({ info: vi.fn(), tag: "first" });
    const { createLogger, getLogger, resetLogger } = await setup();
    resetLogger();

    createLogger({ level: "warn" });
    const logger1 = getLogger();
    const logger2 = getLogger();

    expect(logger1).toBe(logger2);
  });

  it("lazily initializes with env defaults", async () => {
    mockEnv.NODE_ENV = "test";
    const { getLogger, resetLogger } = await setup();
    resetLogger();

    getLogger();

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({ level: "silent" }),
    );
  });
});

describe("resetLogger", () => {
  beforeEach(async () => {
    const { resetLogger } = await setup();
    resetLogger();
  });

  it("clears cached logger instance", async () => {
    const { createLogger, getLogger, resetLogger } = await setup();
    resetLogger();
    const first = { info: vi.fn(), tag: "first" };
    const second = { info: vi.fn(), tag: "second" };
    mockPino.mockReturnValueOnce(first);
    mockPino.mockReturnValueOnce(second);

    createLogger();
    const logger1 = getLogger();
    resetLogger();
    const logger2 = getLogger();

    expect(logger1).not.toBe(logger2);
  });
});
