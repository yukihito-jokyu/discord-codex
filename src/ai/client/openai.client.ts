import OpenAI from "openai";

export interface ChatResult {
  response: string;
  usage: OpenAI.Completions.CompletionUsage | null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class OpenAIClient {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, options?: { baseUrl?: string; model?: string }) {
    this.openai = new OpenAI({
      apiKey,
      baseURL: options?.baseUrl,
      defaultHeaders: { "User-Agent": "discord-codex/1.0" },
    });
    this.model = options?.model ?? "codex-mini";
  }

  async chat(messages: ChatMessage[]): Promise<ChatResult> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI API");
    }

    return {
      response: content,
      usage: response.usage ?? null,
    };
  }
}
