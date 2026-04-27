import { describe, expect, it } from "vitest";
import {
  DEFAULT_TTL_MS,
  DISCORD_MAX_LENGTH,
  RATE_LIMIT_TTL_MS,
} from "@/shared/utils/constants";

describe("constants", () => {
  it("DISCORD_MAX_LENGTH is 2000", () => {
    expect(DISCORD_MAX_LENGTH).toBe(2000);
  });

  it("DEFAULT_TTL_MS is 86400000 (24h)", () => {
    expect(DEFAULT_TTL_MS).toBe(24 * 60 * 60 * 1000);
  });

  it("RATE_LIMIT_TTL_MS is 3600000 (1h)", () => {
    expect(RATE_LIMIT_TTL_MS).toBe(60 * 60 * 1000);
  });
});
