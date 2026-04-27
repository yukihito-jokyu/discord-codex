import { beforeEach, describe, expect, it, vi } from "vitest";
import { botConfigSchema } from "@/app/config/bot.config";

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}));

const validYaml = `
bot:
  defaultModel: "codex-mini"
  maxTokens: 4096
  timeoutMs: 30000
server:
  port: 3000
`;

describe("botConfigSchema valid", () => {
  it("parses valid config", () => {
    const result = botConfigSchema.parse({
      bot: {
        defaultModel: "codex-mini",
        maxTokens: 4096,
        timeoutMs: 30000,
      },
      server: { port: 3000 },
    });

    expect(result).toEqual({
      bot: {
        defaultModel: "codex-mini",
        maxTokens: 4096,
        timeoutMs: 30000,
      },
      server: { port: 3000 },
    });
  });

  it("accepts maxTokens of 0", () => {
    const result = botConfigSchema.parse({
      bot: { defaultModel: "model", maxTokens: 0, timeoutMs: 30000 },
      server: { port: 3000 },
    });

    expect(result.bot.maxTokens).toBe(0);
  });

  it("accepts timeoutMs of 0", () => {
    const result = botConfigSchema.parse({
      bot: { defaultModel: "model", maxTokens: 4096, timeoutMs: 0 },
      server: { port: 3000 },
    });

    expect(result.bot.timeoutMs).toBe(0);
  });
});

describe("botConfigSchema invalid bot fields", () => {
  it("rejects missing bot.defaultModel", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: { maxTokens: 4096, timeoutMs: 30000 },
        server: { port: 3000 },
      }),
    ).toThrow();
  });

  it("rejects empty string for defaultModel", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: { defaultModel: "", maxTokens: 4096, timeoutMs: 30000 },
        server: { port: 3000 },
      }),
    ).toThrow();
  });

  it("rejects wrong type for maxTokens", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: {
          defaultModel: "codex-mini",
          maxTokens: "not-a-number",
          timeoutMs: 30000,
        },
        server: { port: 3000 },
      }),
    ).toThrow();
  });

  it("rejects negative maxTokens", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: { defaultModel: "codex-mini", maxTokens: -1, timeoutMs: 30000 },
        server: { port: 3000 },
      }),
    ).toThrow();
  });
});

describe("botConfigSchema invalid server fields", () => {
  it("rejects missing server.port", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: {
          defaultModel: "codex-mini",
          maxTokens: 4096,
          timeoutMs: 30000,
        },
        server: {},
      }),
    ).toThrow();
  });

  it("rejects port of 0", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
        server: { port: 0 },
      }),
    ).toThrow();
  });

  it("rejects negative server.port", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
        server: { port: -1 },
      }),
    ).toThrow();
  });
});

describe("botConfigSchema logging valid", () => {
  it("accepts config without logging section", () => {
    const result = botConfigSchema.parse({
      bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
      server: { port: 3000 },
    });

    expect(result).not.toHaveProperty("logging");
  });

  it.each([
    "fatal",
    "error",
    "warn",
    "info",
    "debug",
    "trace",
    "silent",
  ])("accepts logging with valid level %s", (level) => {
    const result = botConfigSchema.parse({
      bot: {
        defaultModel: "codex-mini",
        maxTokens: 4096,
        timeoutMs: 30000,
      },
      server: { port: 3000 },
      logging: { level },
    });

    expect(result.logging?.level).toBe(level);
  });

  it("accepts logging without level", () => {
    const result = botConfigSchema.parse({
      bot: { defaultModel: "codex-mini", maxTokens: 4096, timeoutMs: 30000 },
      server: { port: 3000 },
      logging: {},
    });

    expect(result.logging).toEqual({});
  });
});

describe("botConfigSchema logging invalid", () => {
  it("rejects invalid log level string", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: {
          defaultModel: "codex-mini",
          maxTokens: 4096,
          timeoutMs: 30000,
        },
        server: { port: 3000 },
        logging: { level: "verbose" },
      }),
    ).toThrow();
  });

  it("rejects non-string log level", () => {
    expect(() =>
      botConfigSchema.parse({
        bot: {
          defaultModel: "codex-mini",
          maxTokens: 4096,
          timeoutMs: 30000,
        },
        server: { port: 3000 },
        logging: { level: 123 },
      }),
    ).toThrow();
  });
});

async function setupLoadConfig(mockValue: string) {
  const { readFileSync } = await import("node:fs");
  vi.mocked(readFileSync).mockReturnValue(mockValue);
  return import("@/app/config/bot.config");
}

describe("loadConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("parses valid YAML config", async () => {
    const { loadConfig } = await setupLoadConfig(validYaml);

    const config = loadConfig();

    expect(config).toEqual({
      bot: {
        defaultModel: "codex-mini",
        maxTokens: 4096,
        timeoutMs: 30000,
      },
      server: { port: 3000 },
    });
  });

  it("reads from default path", async () => {
    const { loadConfig } = await setupLoadConfig(validYaml);
    const { readFileSync } = await import("node:fs");

    loadConfig();

    expect(readFileSync).toHaveBeenCalledWith(
      "src/app/config/config.yaml",
      "utf-8",
    );
  });

  it("reads from custom path", async () => {
    const { loadConfig } = await setupLoadConfig(validYaml);
    const { readFileSync } = await import("node:fs");

    loadConfig("custom/path.yaml");

    expect(readFileSync).toHaveBeenCalledWith("custom/path.yaml", "utf-8");
  });

  it("throws on non-existent file", async () => {
    const { readFileSync } = await import("node:fs");
    vi.mocked(readFileSync).mockImplementation(() => {
      throw new Error("ENOENT: no such file");
    });

    const { loadConfig } = await import("@/app/config/bot.config");

    expect(() => loadConfig("nonexistent.yaml")).toThrow("ENOENT");
  });
});
