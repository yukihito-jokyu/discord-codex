import { MessageFlags } from "discord-api-types/v10";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIService } from "@/ai/services/ai.service";
import type { DomainInteraction } from "@/sdk/discord/types/domain";
import { ExternalServiceError } from "@/shared/types/errors";
import { err, ok } from "@/shared/types/result";
import { ChatCommand } from "./chat.command";

vi.mock("@/shared/utils/logger", () => ({
  getLogger: vi.fn().mockReturnValue({ info: vi.fn(), debug: vi.fn() }),
}));

function createInteraction(
  overrides: Partial<DomainInteraction> = {},
): DomainInteraction {
  return {
    id: "test-id",
    type: "command",
    channelId: "channel-1",
    userId: "user-1",
    commandName: "chat",
    options: { message: "Hello" },
    raw: {},
    ...overrides,
  };
}

function createMockAIService(): AIService {
  return {
    chat: vi.fn(),
    resetConversation: vi.fn(),
  } as unknown as AIService;
}

describe("ChatCommand properties", () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = createMockAIService();
  });

  it("has name 'chat'", () => {
    const command = new ChatCommand(aiService);
    expect(command.name).toBe("chat");
  });
});

describe("ChatCommand message extraction", () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = createMockAIService();
  });

  it("extracts message option from interaction", async () => {
    const command = new ChatCommand(aiService);
    (aiService.chat as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok("AI response"),
    );

    await command.execute(
      createInteraction({ options: { message: "Hello AI" } }),
    );

    expect(aiService.chat).toHaveBeenCalledWith("channel-1", "Hello AI");
  });

  it("falls back to empty string when message option is missing", async () => {
    const command = new ChatCommand(aiService);
    (aiService.chat as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok("AI response"),
    );

    await command.execute(createInteraction({ options: {} }));

    expect(aiService.chat).toHaveBeenCalledWith("channel-1", "");
  });

  it("falls back to empty string when options is undefined", async () => {
    const command = new ChatCommand(aiService);
    (aiService.chat as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok("AI response"),
    );

    await command.execute(createInteraction({ options: undefined }));

    expect(aiService.chat).toHaveBeenCalledWith("channel-1", "");
  });

  it("handles empty message string", async () => {
    const command = new ChatCommand(aiService);
    (aiService.chat as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok("AI response"),
    );

    await command.execute(createInteraction({ options: { message: "" } }));

    expect(aiService.chat).toHaveBeenCalledWith("channel-1", "");
  });
});

describe("ChatCommand channelId forwarding", () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = createMockAIService();
  });

  it("passes channelId to AIService", async () => {
    const command = new ChatCommand(aiService);
    (aiService.chat as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok("AI response"),
    );

    await command.execute(createInteraction({ channelId: "ch-999" }));

    expect(aiService.chat).toHaveBeenCalledWith("ch-999", expect.any(String));
  });
});

describe("ChatCommand success response", () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = createMockAIService();
  });

  it("returns message response with AI result on success", async () => {
    const command = new ChatCommand(aiService);
    (aiService.chat as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok("AI response"),
    );

    const response = await command.execute(createInteraction());

    expect(response.type).toBe(4);
    expect(response.data?.content).toBe("AI response");
  });

  it("returns non-ephemeral response on success", async () => {
    const command = new ChatCommand(aiService);
    (aiService.chat as ReturnType<typeof vi.fn>).mockResolvedValue(
      ok("AI response"),
    );

    const response = await command.execute(createInteraction());

    expect(response.data?.flags).toBeUndefined();
  });
});

describe("ChatCommand error response", () => {
  let aiService: AIService;

  beforeEach(() => {
    aiService = createMockAIService();
  });

  it("returns ephemeral error when AIService fails", async () => {
    const command = new ChatCommand(aiService);
    (aiService.chat as ReturnType<typeof vi.fn>).mockResolvedValue(
      err(new ExternalServiceError("Codex", "timeout")),
    );

    const response = await command.execute(createInteraction());

    expect(response.type).toBe(4);
    expect(response.data?.content).toBe(
      // biome-ignore lint/security/noSecrets: Japanese test assertion, not a secret
      "エラーが発生しました。しばらくしてからお試しください。",
    );
    expect(response.data?.flags).toBe(MessageFlags.Ephemeral);
  });
});
