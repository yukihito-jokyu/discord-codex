import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();
const mockOpenAIConstructor = vi.fn();

vi.mock("openai", () => ({
  default: vi
    .fn()
    // biome-ignore lint/complexity/useArrowFunction: constructor mock requires function expression
    .mockImplementation(function (options?: unknown) {
      mockOpenAIConstructor(options);
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    }),
}));

async function createClient(
  apiKey = "test-api-key",
  options?: { baseUrl?: string; model?: string },
) {
  const { OpenAIClient } = await import("./openai.client");
  return new OpenAIClient(apiKey, options);
}

describe("OpenAIClient constructor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes apiKey to OpenAI constructor", async () => {
    await createClient("my-key");

    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: "my-key",
      baseURL: undefined,
      defaultHeaders: { "User-Agent": "discord-codex/1.0" },
    });
  });

  it("passes baseUrl as baseURL to OpenAI constructor", async () => {
    await createClient("my-key", { baseUrl: "https://custom.api" });

    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: "my-key",
      baseURL: "https://custom.api",
      defaultHeaders: { "User-Agent": "discord-codex/1.0" },
    });
  });

  it("passes model option and uses it in create call", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Response" } }],
      usage: null,
    });

    const client = await createClient("my-key", { model: "custom-model" });
    await client.chat([{ role: "user", content: "Hello" }]);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "custom-model" }),
    );
  });

  it("defaults model to codex-mini when not provided", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Response" } }],
      usage: null,
    });

    const client = await createClient("my-key");
    await client.chat([{ role: "user", content: "Hello" }]);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "codex-mini" }),
    );
  });
});

describe("OpenAIClient chat successful call", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "Hello from AI" } }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
      },
    });
  });

  it("calls chat.completions.create with messages", async () => {
    const client = await createClient();
    const messages = [
      { role: "system" as const, content: "You are helpful" },
      { role: "user" as const, content: "Hello" },
    ];
    const result = await client.chat(messages);

    expect(mockCreate).toHaveBeenCalledWith({
      model: "codex-mini",
      messages,
    });
    expect(result.response).toBe("Hello from AI");
  });

  it("returns usage from API response", async () => {
    const client = await createClient();
    const result = await client.chat([{ role: "user", content: "Hello" }]);

    expect(result.usage).toEqual({
      prompt_tokens: 10,
      completion_tokens: 5,
      total_tokens: 15,
    });
  });
});

describe("OpenAIClient chat error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propagates OpenAI API error", async () => {
    mockCreate.mockRejectedValue(new Error("API internal error"));

    const client = await createClient();
    await expect(
      client.chat([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow("API internal error");
  });

  it("throws when no response content", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
      usage: null,
    });

    const client = await createClient();
    await expect(
      client.chat([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow("No response content from OpenAI API");
  });

  it("throws when choices array is empty", async () => {
    mockCreate.mockResolvedValue({
      choices: [],
      usage: null,
    });

    const client = await createClient();
    await expect(
      client.chat([{ role: "user", content: "Hello" }]),
    ).rejects.toThrow("No response content from OpenAI API");
  });
});

describe("OpenAIClient chat usage null", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: "No usage" } }],
      usage: null,
    });
  });

  it("handles null usage", async () => {
    const client = await createClient();
    const result = await client.chat([{ role: "user", content: "Hello" }]);
    expect(result.usage).toBeNull();
    expect(result.response).toBe("No usage");
  });
});
