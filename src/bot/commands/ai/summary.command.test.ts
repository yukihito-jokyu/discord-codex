import { describe, expect, it, vi } from "vitest";
import type { SummaryService } from "@/ai/services/summary.service";
import type { DiscordApiClient } from "@/infrastructure/discord/discord-api.client";
import type { DomainInteraction } from "@/sdk/discord/types/domain";
import { ExternalServiceError } from "@/shared/types/errors";
import { err, ok } from "@/shared/types/result";
import { SummaryCommand } from "./summary.command";

vi.mock("@/shared/utils/logger", () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

function createMockInteraction(
  overrides?: Partial<DomainInteraction>,
): DomainInteraction {
  return {
    id: "interaction-1",
    type: "command",
    channelId: "channel-1",
    userId: "user-1",
    commandName: "summary",
    raw: { token: "token-1" },
    ...overrides,
  };
}

function createMockSummaryService(): SummaryService {
  return { summarize: vi.fn() } as unknown as SummaryService;
}

function createMockDiscordApiClient(): DiscordApiClient {
  return {
    getFirstMessage: vi.fn(),
    editInteractionResponse: vi.fn().mockResolvedValue("msg-1"),
  } as unknown as DiscordApiClient;
}

const APPLICATION_ID = "app-1";

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("SummaryCommand properties", () => {
  it("has name 'summary'", () => {
    const command = new SummaryCommand(
      createMockSummaryService(),
      createMockDiscordApiClient(),
      APPLICATION_ID,
    );
    expect(command.name).toBe("summary");
  });

  it("has definition with description", () => {
    const command = new SummaryCommand(
      createMockSummaryService(),
      createMockDiscordApiClient(),
      APPLICATION_ID,
    );
    expect(command.definition).toEqual({
      // biome-ignore lint/security/noSecrets: static Japanese UI text, not a secret
      description: "フォーラム投稿のリンクを要約",
    });
  });
});

describe("SummaryCommand missing token", () => {
  it("returns error when interaction has no token", async () => {
    const command = new SummaryCommand(
      createMockSummaryService(),
      createMockDiscordApiClient(),
      APPLICATION_ID,
    );
    const response = await command.execute(createMockInteraction({ raw: {} }));

    expect(response.type).toBe(4);
    expect((response.data as { content: string }).content).toContain("エラー");
  });
});

describe("SummaryCommand no message", () => {
  it("replies error when first message not found", async () => {
    const discordApiClient = createMockDiscordApiClient();
    vi.mocked(discordApiClient.getFirstMessage).mockResolvedValue(null);

    const command = new SummaryCommand(
      createMockSummaryService(),
      discordApiClient,
      APPLICATION_ID,
    );
    await command.execute(createMockInteraction());
    await flushPromises();

    expect(discordApiClient.editInteractionResponse).toHaveBeenCalledWith(
      APPLICATION_ID,
      "token-1",
      // biome-ignore lint/security/noSecrets: Japanese test assertion, not a secret
      expect.stringContaining("メッセージの取得に失敗"),
    );
  });
});

describe("SummaryCommand no url", () => {
  it("replies error when no url in message", async () => {
    const discordApiClient = createMockDiscordApiClient();
    vi.mocked(discordApiClient.getFirstMessage).mockResolvedValue(
      "no-url-message",
    );

    const command = new SummaryCommand(
      createMockSummaryService(),
      discordApiClient,
      APPLICATION_ID,
    );
    await command.execute(createMockInteraction());
    await flushPromises();

    expect(discordApiClient.editInteractionResponse).toHaveBeenCalledWith(
      APPLICATION_ID,
      "token-1",
      expect.stringContaining("リンクが見つかりません"),
    );
  });
});

describe("SummaryCommand success", () => {
  it("returns deferred and replies summary", async () => {
    const summaryService = createMockSummaryService();
    const discordApiClient = createMockDiscordApiClient();
    vi.mocked(discordApiClient.getFirstMessage).mockResolvedValue(
      "https://example.com/article1",
    );
    vi.mocked(summaryService.summarize).mockResolvedValue(ok("summary ok"));

    const command = new SummaryCommand(
      summaryService,
      discordApiClient,
      APPLICATION_ID,
    );

    const response = await command.execute(createMockInteraction());
    expect(response.type).toBe(5);
    await flushPromises();

    expect(summaryService.summarize).toHaveBeenCalledWith([
      "https://example.com/article1",
    ]);
    expect(discordApiClient.editInteractionResponse).toHaveBeenCalledWith(
      APPLICATION_ID,
      "token-1",
      "summary ok",
    );
  });
});

describe("SummaryCommand service error", () => {
  it("replies error when summarize fails", async () => {
    const summaryService = createMockSummaryService();
    const discordApiClient = createMockDiscordApiClient();
    vi.mocked(discordApiClient.getFirstMessage).mockResolvedValue(
      "https://example.com",
    );
    vi.mocked(summaryService.summarize).mockResolvedValue(
      err(new ExternalServiceError("Codex", "API error")),
    );

    const command = new SummaryCommand(
      summaryService,
      discordApiClient,
      APPLICATION_ID,
    );
    await command.execute(createMockInteraction());
    await flushPromises();

    expect(discordApiClient.editInteractionResponse).toHaveBeenCalledWith(
      APPLICATION_ID,
      "token-1",
      // biome-ignore lint/security/noSecrets: Japanese test assertion, not a secret
      expect.stringContaining("要約の生成に失敗"),
    );
  });
});
