import { describe, expect, it } from "vitest";
import { DISCORD_MAX_LENGTH } from "@/shared/utils/constants";
import { formatForDiscord } from "@/shared/utils/format";

describe("formatForDiscord", () => {
  it("returns empty string as-is", () => {
    expect(formatForDiscord("")).toBe("");
  });

  it("returns text as-is when within limit", () => {
    const text = "short message";
    expect(formatForDiscord(text)).toBe(text);
  });

  it("returns text as-is when exactly at limit", () => {
    const text = "a".repeat(DISCORD_MAX_LENGTH);
    expect(formatForDiscord(text)).toBe(text);
  });

  it("truncates and appends omission notice when over limit", () => {
    const text = "a".repeat(DISCORD_MAX_LENGTH + 100);
    const result = formatForDiscord(text);
    // biome-ignore lint/security/noSecrets: static Japanese notice text, not a secret
    expect(result).toContain("... (続きは省略されました)");
    expect(result.length).toBeLessThanOrEqual(DISCORD_MAX_LENGTH);
  });

  it("preserves first DISCORD_MAX_LENGTH - 50 characters", () => {
    const prefix = "b".repeat(DISCORD_MAX_LENGTH - 50);
    const text = prefix + "x".repeat(100);
    const result = formatForDiscord(text);
    expect(result.startsWith(prefix)).toBe(true);
  });

  it("truncates text that is exactly one character over limit", () => {
    const text = "a".repeat(DISCORD_MAX_LENGTH + 1);
    const result = formatForDiscord(text);
    expect(result.length).toBeLessThanOrEqual(DISCORD_MAX_LENGTH);
    // biome-ignore lint/security/noSecrets: static Japanese notice text, not a secret
    expect(result).toContain("... (続きは省略されました)");
  });
});
