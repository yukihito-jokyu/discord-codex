import { beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

function setupEnv() {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env = { ...originalEnv, NODE_ENV: "test" };
  });
}

describe("env NODE_ENV", () => {
  setupEnv();

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

describe("env REDIS_URL", () => {
  setupEnv();

  it("parses REDIS_URL when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.REDIS_URL = "redis://localhost:6379";

    const { env } = await import("@/app/config/env");

    expect(env.REDIS_URL).toBe("redis://localhost:6379");
  });

  it("returns undefined for REDIS_URL when not set", async () => {
    delete process.env.REDIS_URL;

    const { env } = await import("@/app/config/env");

    expect(env.REDIS_URL).toBeUndefined();
  });

  it("accepts empty string for REDIS_URL", async () => {
    process.env.REDIS_URL = "";

    const { env } = await import("@/app/config/env");

    expect(env.REDIS_URL).toBe("");
  });
});

describe("env OPENAI_API_KEY", () => {
  setupEnv();

  it("parses OPENAI_API_KEY when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.OPENAI_API_KEY = "sk-test-key";

    const { env } = await import("@/app/config/env");

    expect(env.OPENAI_API_KEY).toBe("sk-test-key");
  });

  it("returns undefined when not set", async () => {
    delete process.env.OPENAI_API_KEY;

    const { env } = await import("@/app/config/env");

    expect(env.OPENAI_API_KEY).toBeUndefined();
  });
});

describe("env DISCORD_PUBLIC_KEY", () => {
  setupEnv();

  it("parses DISCORD_PUBLIC_KEY when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.DISCORD_PUBLIC_KEY = "abc123";

    const { env } = await import("@/app/config/env");

    expect(env.DISCORD_PUBLIC_KEY).toBe("abc123");
  });

  it("returns undefined when not set", async () => {
    delete process.env.DISCORD_PUBLIC_KEY;

    const { env } = await import("@/app/config/env");

    expect(env.DISCORD_PUBLIC_KEY).toBeUndefined();
  });
});

describe("env DISCORD_BOT_TOKEN", () => {
  setupEnv();

  it("parses DISCORD_BOT_TOKEN when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.DISCORD_BOT_TOKEN = "bot-token";

    const { env } = await import("@/app/config/env");

    expect(env.DISCORD_BOT_TOKEN).toBe("bot-token");
  });

  it("returns undefined when not set", async () => {
    delete process.env.DISCORD_BOT_TOKEN;

    const { env } = await import("@/app/config/env");

    expect(env.DISCORD_BOT_TOKEN).toBeUndefined();
  });
});

describe("env DISCORD_APPLICATION_ID", () => {
  setupEnv();

  it("parses DISCORD_APPLICATION_ID when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.DISCORD_APPLICATION_ID = "app-id";

    const { env } = await import("@/app/config/env");

    expect(env.DISCORD_APPLICATION_ID).toBe("app-id");
  });

  it("returns undefined when not set", async () => {
    delete process.env.DISCORD_APPLICATION_ID;

    const { env } = await import("@/app/config/env");

    expect(env.DISCORD_APPLICATION_ID).toBeUndefined();
  });
});

describe("env DISCORD_GUILD_ID", () => {
  setupEnv();

  it("parses DISCORD_GUILD_ID when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.DISCORD_GUILD_ID = "guild-123";

    const { env } = await import("@/app/config/env");

    expect(env.DISCORD_GUILD_ID).toBe("guild-123");
  });

  it("returns undefined when not set", async () => {
    delete process.env.DISCORD_GUILD_ID;

    const { env } = await import("@/app/config/env");

    expect(env.DISCORD_GUILD_ID).toBeUndefined();
  });
});

describe("env CODEX_BASE_URL", () => {
  setupEnv();

  it("parses CODEX_BASE_URL when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.CODEX_BASE_URL = "https://api.example.com";

    const { env } = await import("@/app/config/env");

    expect(env.CODEX_BASE_URL).toBe("https://api.example.com");
  });

  it("returns undefined when not set", async () => {
    delete process.env.CODEX_BASE_URL;

    const { env } = await import("@/app/config/env");

    expect(env.CODEX_BASE_URL).toBeUndefined();
  });
});

describe("env CODEX_API_KEY", () => {
  setupEnv();

  it("parses CODEX_API_KEY when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.CODEX_API_KEY = "codex-key-123";

    const { env } = await import("@/app/config/env");

    expect(env.CODEX_API_KEY).toBe("codex-key-123");
  });

  it("returns undefined when not set", async () => {
    delete process.env.CODEX_API_KEY;

    const { env } = await import("@/app/config/env");

    expect(env.CODEX_API_KEY).toBeUndefined();
  });
});

describe("env CODEX_MODEL", () => {
  setupEnv();

  it("parses CODEX_MODEL when set", async () => {
    process.env.NODE_ENV = "test";
    process.env.CODEX_MODEL = "codex-mini";

    const { env } = await import("@/app/config/env");

    expect(env.CODEX_MODEL).toBe("codex-mini");
  });

  it("returns undefined when not set", async () => {
    delete process.env.CODEX_MODEL;

    const { env } = await import("@/app/config/env");

    expect(env.CODEX_MODEL).toBeUndefined();
  });
});
