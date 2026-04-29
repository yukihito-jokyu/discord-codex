import { describe, expect, it } from "vitest";
import { buildSummaryPrompt } from "./summary";

describe("buildSummaryPrompt", () => {
  it(// biome-ignore lint/security/noSecrets: test description, not a secret
  "単一コンテンツのプロンプトを生成する", () => {
    const result = buildSummaryPrompt([
      { url: "https://example.com", text: "Hello world" },
    ]);
    expect(result).toContain("https://example.com");
    expect(result).toContain("Hello world");
    expect(result).toContain("要約してください");
  });

  it(// biome-ignore lint/security/noSecrets: test description, not a secret
  "複数コンテンツのプロンプトを生成する", () => {
    const contents = [
      { url: "https://example.com", text: "Content A" },
      { url: "https://example.org", text: "Content B" },
    ];
    const result = buildSummaryPrompt(contents);
    expect(result).toContain("### https://example.com");
    expect(result).toContain("Content A");
    expect(result).toContain("### https://example.org");
    expect(result).toContain("Content B");
  });
});
