import { beforeEach, describe, expect, it, vi } from "vitest";

describe("env", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  it('defaults NODE_ENV to "development" when not set', async () => {
    delete process.env.NODE_ENV;

    const { env } = await import("@/app/config/env");

    expect(env.NODE_ENV).toBe("development");
  });

  it('accepts "development" as NODE_ENV', async () => {
    process.env.NODE_ENV = "development";

    const { env } = await import("@/app/config/env");

    expect(env.NODE_ENV).toBe("development");
  });

  it('accepts "production" as NODE_ENV', async () => {
    process.env.NODE_ENV = "production";

    const { env } = await import("@/app/config/env");

    expect(env.NODE_ENV).toBe("production");
  });

  it('accepts "test" as NODE_ENV', async () => {
    process.env.NODE_ENV = "test";

    const { env } = await import("@/app/config/env");

    expect(env.NODE_ENV).toBe("test");
  });

  it("throws ZodError for invalid NODE_ENV", async () => {
    process.env.NODE_ENV = "invalid";

    await expect(import("@/app/config/env")).rejects.toThrow();
  });

  it("throws ZodError for empty string NODE_ENV", async () => {
    process.env.NODE_ENV = "";

    await expect(import("@/app/config/env")).rejects.toThrow();
  });
});
