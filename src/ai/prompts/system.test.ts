import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./system";

describe("buildSystemPrompt", () => {
  it("returns non-empty string", () => {
    const result = buildSystemPrompt();
    expect(result.length).toBeGreaterThan(0);
  });

  it("contains constraint keywords", () => {
    const result = buildSystemPrompt();
    expect(result).toContain("ファイル");
    expect(result).toContain("拒否");
    expect(result).toContain("コマンド");
    expect(result).toContain("URL");
  });

  it("returns identical string on every call", () => {
    const first = buildSystemPrompt();
    const second = buildSystemPrompt();
    expect(first).toBe(second);
  });
});
