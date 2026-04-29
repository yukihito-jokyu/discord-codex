import { ExternalServiceError } from "@/shared/types/errors";
import { err, ok, type Result } from "@/shared/types/result";
import { getLogger } from "@/shared/utils/logger";

const MAX_CONTENT_LENGTH = 5000;
const FETCH_TIMEOUT_MS = 30_000;
const JINA_READER_BASE = "https://r.jina.ai";

export class WebFetcherClient {
  async fetchContent(url: string): Promise<Result<string>> {
    const log = getLogger();

    try {
      const response = await fetch(`${JINA_READER_BASE}/${url}`, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: "text/plain" },
      });

      if (!response.ok) {
        log.warn(
          { status: response.status, url },
          "Failed to fetch URL content via Jina Reader",
        );
        return err(
          new ExternalServiceError("WebFetch", `HTTP ${response.status}`),
        );
      }

      const text = await response.text();

      if (text.trim().length === 0) {
        return err(
          new ExternalServiceError(
            "WebFetch",
            "Empty content from Jina Reader",
          ),
        );
      }

      const truncated =
        text.length > MAX_CONTENT_LENGTH
          ? `${text.slice(0, MAX_CONTENT_LENGTH)}...`
          : text;

      return ok(truncated);
    } catch (e) {
      log.warn(
        { err: e instanceof Error ? e.message : String(e), url },
        "Web fetch via Jina Reader failed",
      );
      return err(
        new ExternalServiceError(
          "WebFetch",
          e instanceof Error ? e.message : String(e),
        ),
      );
    }
  }
}
