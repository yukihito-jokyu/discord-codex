import type { WebFetcherClient } from "@/infrastructure/web/web-fetcher.client";
import { ExternalServiceError } from "@/shared/types/errors";
import { err, ok, type Result } from "@/shared/types/result";
import { formatForDiscord } from "@/shared/utils/format";
import { getLogger } from "@/shared/utils/logger";
import type { CodexClient } from "../client/codex.client";
import {
  buildSummaryPrompt,
  type FetchedContent,
} from "../prompts/templates/summary";

export class SummaryService {
  constructor(
    private client: CodexClient,
    private webFetcher: WebFetcherClient,
  ) {}

  async summarize(urls: string[]): Promise<Result<string>> {
    const log = getLogger();

    const contents: FetchedContent[] = [];
    for (const url of urls) {
      // biome-ignore lint/performance/noAwaitInLoops: sequential fetch to avoid rate limiting
      const result = await this.webFetcher.fetchContent(url);
      if (result.ok) {
        contents.push({ url, text: result.value });
      } else {
        log.warn({ url, error: result.error.message }, "Failed to fetch URL");
      }
    }

    if (contents.length === 0) {
      return err(
        new ExternalServiceError("WebFetch", "All URL fetches failed"),
      );
    }

    const prompt = buildSummaryPrompt(contents);

    try {
      const result = await this.client.chat(null, prompt);
      return ok(formatForDiscord(result.response));
    } catch (e) {
      return err(
        new ExternalServiceError(
          "Codex",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }
  }
}
