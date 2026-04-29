import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebFetcherClient } from "./web-fetcher.client";

vi.mock("@/shared/utils/logger", () => ({
  getLogger: vi.fn().mockReturnValue({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  }),
}));

const JINA_BASE = "https://r.jina.ai";

describe("WebFetcherClient success", () => {
  let client: WebFetcherClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new WebFetcherClient();
  });

  it("fetches content via Jina Reader API", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("Article content here"),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await client.fetchContent("https://example.com/article");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toContain("Article content here");
    }
    expect(mockFetch).toHaveBeenCalledWith(
      `${JINA_BASE}/https://example.com/article`,
      expect.objectContaining({
        headers: { Accept: "text/plain" },
      }),
    );
  });

  it("truncates content exceeding max length", async () => {
    const longText = "a".repeat(6000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(longText),
      }),
    );

    const result = await client.fetchContent("https://example.com/long");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBeLessThan(6000);
      expect(result.value).toContain("...");
    }
  });
});

describe("WebFetcherClient errors", () => {
  let client: WebFetcherClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new WebFetcherClient();
  });

  it("returns err on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    const result = await client.fetchContent("https://example.com/notfound");
    expect(result.ok).toBe(false);
  });

  it("returns err on empty content", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve("   "),
      }),
    );

    const result = await client.fetchContent("https://example.com/empty");
    expect(result.ok).toBe(false);
  });

  it("returns err on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const result = await client.fetchContent("https://example.com");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("Network error");
    }
  });
});
