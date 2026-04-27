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

describe("logger", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mockPino.mockReset();
    mockPino.mockReturnValue({ info: vi.fn() });
  });

  it("creates logger with pino-pretty transport in development", async () => {
    mockEnv.NODE_ENV = "development";

    await import("@/shared/utils/logger");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.objectContaining({
          target: "pino-pretty",
        }),
      }),
    );
  });

  it("creates logger with pino-pretty transport in test", async () => {
    mockEnv.NODE_ENV = "test";

    await import("@/shared/utils/logger");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: expect.objectContaining({
          target: "pino-pretty",
        }),
      }),
    );
  });

  it("creates logger without transport in production", async () => {
    mockEnv.NODE_ENV = "production";

    await import("@/shared/utils/logger");

    expect(mockPino).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: undefined,
      }),
    );
  });
});
