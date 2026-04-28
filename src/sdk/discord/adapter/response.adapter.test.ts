import { InteractionResponseType, MessageFlags } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { deferred, message, pong, toDiscord } from "./response.adapter";

describe("pong", () => {
  it("returns Pong type (1)", () => {
    expect(pong().type).toBe(InteractionResponseType.Pong);
  });

  it("has no data field", () => {
    expect("data" in pong()).toBe(false);
  });
});

describe("message", () => {
  it("returns ChannelMessageWithSource type (4) with content", () => {
    const result = message("hello");
    expect(result.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    expect(result.data).toEqual({ content: "hello" });
  });

  it("omits flags when ephemeral is false (default)", () => {
    expect(message("hello").data).not.toHaveProperty("flags");
  });

  it("sets flags to MessageFlags.Ephemeral when ephemeral is true", () => {
    expect(message("secret", true).data).toEqual({
      content: "secret",
      flags: MessageFlags.Ephemeral,
    });
  });

  it("returns valid response for empty string content", () => {
    const result = message("");
    expect(result.type).toBe(InteractionResponseType.ChannelMessageWithSource);
    expect(result.data).toEqual({ content: "" });
  });
});

describe("deferred", () => {
  it("returns DeferredChannelMessageWithSource type (5)", () => {
    expect(deferred().type).toBe(
      InteractionResponseType.DeferredChannelMessageWithSource,
    );
  });

  it("omits data when ephemeral is false", () => {
    expect(deferred().data).toBeUndefined();
  });

  it("sets flags to MessageFlags.Ephemeral when ephemeral is true", () => {
    expect(deferred(true).data).toEqual({ flags: MessageFlags.Ephemeral });
  });

  it("explicit false matches default behavior", () => {
    expect(deferred(false)).toEqual(deferred());
  });
});

describe("toDiscord", () => {
  it("passes through type and data from DomainResponse", () => {
    expect(
      toDiscord({
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: "hi" },
      }),
    ).toEqual({
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { content: "hi" },
    });
  });

  it("works with data undefined", () => {
    const result = toDiscord({ type: InteractionResponseType.Pong });
    expect(result.type).toBe(InteractionResponseType.Pong);
    expect(result.data).toBeUndefined();
  });
});
