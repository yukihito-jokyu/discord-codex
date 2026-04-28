import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStartThread = vi.fn();
const mockResumeThread = vi.fn();
const mockRun = vi.fn();

vi.mock("@openai/codex-sdk", () => ({
  // biome-ignore lint/complexity/useArrowFunction: constructor mock requires function expression
  Codex: vi.fn().mockImplementation(function () {
    return {
      startThread: mockStartThread,
      resumeThread: mockResumeThread,
    };
  }),
}));

async function createClient() {
  const { CodexClient } = await import("./codex.client");
  return new CodexClient("test-api-key");
}

describe("CodexClient chat new thread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartThread.mockReturnValue({
      run: mockRun,
      id: "new-thread-123",
    });
    mockRun.mockResolvedValue({
      finalResponse: "Hello from AI",
      usage: {
        input_tokens: 10,
        cached_input_tokens: 0,
        output_tokens: 5,
        reasoning_output_tokens: 0,
      },
    });
  });

  it("starts new thread when threadId is null", async () => {
    const client = await createClient();
    const result = await client.chat(null, "Hello");
    expect(mockStartThread).toHaveBeenCalledWith({
      model: "codex-mini",
      sandboxMode: "read-only",
      networkAccessEnabled: true,
      webSearchMode: "live",
    });
    expect(result.response).toBe("Hello from AI");
    expect(result.threadId).toBe("new-thread-123");
  });

  it("returns usage from turn", async () => {
    const client = await createClient();
    const result = await client.chat(null, "Hello");
    expect(result.usage).toEqual({
      input_tokens: 10,
      cached_input_tokens: 0,
      output_tokens: 5,
      reasoning_output_tokens: 0,
    });
  });
});

describe("CodexClient chat existing thread", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResumeThread.mockReturnValue({
      run: mockRun,
      id: "existing-thread-456",
    });
    mockRun.mockResolvedValue({
      finalResponse: "Continued response",
      usage: {
        input_tokens: 20,
        cached_input_tokens: 5,
        output_tokens: 10,
        reasoning_output_tokens: 2,
      },
    });
  });

  it("resumes existing thread when threadId is provided", async () => {
    const client = await createClient();
    const result = await client.chat("existing-thread-456", "Continue");
    expect(mockResumeThread).toHaveBeenCalledWith("existing-thread-456");
    expect(mockStartThread).not.toHaveBeenCalled();
    expect(result.response).toBe("Continued response");
    expect(result.threadId).toBe("existing-thread-456");
  });
});

describe("CodexClient chat SDK error", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartThread.mockReturnValue({
      run: mockRun,
      id: "thread-error",
    });
    mockRun.mockRejectedValue(new Error("SDK internal error"));
  });

  it("propagates SDK error", async () => {
    const client = await createClient();
    await expect(client.chat(null, "Hello")).rejects.toThrow(
      "SDK internal error",
    );
  });
});

describe("CodexClient chat missing thread ID", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartThread.mockReturnValue({
      run: mockRun,
      id: "",
    });
    mockRun.mockResolvedValue({
      finalResponse: "Response",
      usage: null,
    });
  });

  it("throws when thread ID is empty after run", async () => {
    const client = await createClient();
    await expect(client.chat(null, "Hello")).rejects.toThrow(
      "Thread ID is not available after run",
    );
  });
});

describe("CodexClient chat empty input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartThread.mockReturnValue({
      run: mockRun,
      id: "thread-empty-input",
    });
    mockRun.mockResolvedValue({
      finalResponse: "Got empty",
      usage: null,
    });
  });

  it("handles empty string input", async () => {
    const client = await createClient();
    const result = await client.chat(null, "");
    expect(result.response).toBe("Got empty");
    expect(result.threadId).toBe("thread-empty-input");
  });
});

describe("CodexClient chat usage null", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStartThread.mockReturnValue({
      run: mockRun,
      id: "thread-null-usage",
    });
    mockRun.mockResolvedValue({
      finalResponse: "No usage",
      usage: null,
    });
  });

  it("handles null usage", async () => {
    const client = await createClient();
    const result = await client.chat(null, "Hello");
    expect(result.usage).toBeNull();
    expect(result.response).toBe("No usage");
  });
});
