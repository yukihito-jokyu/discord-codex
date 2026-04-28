import { Codex, type Input, type Usage } from "@openai/codex-sdk";

export interface ChatResult {
  response: string;
  threadId: string;
  usage: Usage | null;
}

export class CodexClient {
  private codex: Codex;

  constructor(apiKey: string) {
    this.codex = new Codex({ apiKey });
  }

  async chat(threadId: string | null, input: Input): Promise<ChatResult> {
    const thread = threadId
      ? this.codex.resumeThread(threadId)
      : this.codex.startThread({
          model: "codex-mini",
          sandboxMode: "read-only",
          networkAccessEnabled: true,
          webSearchMode: "live",
        });

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
