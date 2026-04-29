import { Codex, type Input, type Usage } from "@openai/codex-sdk";

export interface ChatResult {
  response: string;
  threadId: string;
  usage: Usage | null;
}

export class CodexClient {
  private codex: Codex;
  private model: string | undefined;

  constructor(apiKey: string, options?: { baseUrl?: string; model?: string }) {
    this.codex = new Codex({ apiKey, baseUrl: options?.baseUrl });
    this.model = options?.model;
  }

  async chat(threadId: string | null, input: Input): Promise<ChatResult> {
    const threadOptions = {
      model: this.model ?? "codex-mini",
      sandboxMode: "read-only" as const,
      networkAccessEnabled: true,
      webSearchMode: "live" as const,
      skipGitRepoCheck: true,
    };

    const thread = threadId
      ? this.codex.resumeThread(threadId, threadOptions)
      : this.codex.startThread(threadOptions);

    const turn = await thread.run(input);
    const id = thread.id;
    if (!id) throw new Error("Thread ID is not available after run");
    return {
      response: turn.finalResponse,
      threadId: id,
      usage: turn.usage,
    };
  }
}
