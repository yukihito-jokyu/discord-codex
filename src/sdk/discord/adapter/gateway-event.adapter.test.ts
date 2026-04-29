import { describe, expect, it } from "vitest";
import type { GatewayEvent } from "@/sdk/discord/types/gateway";
import {
  extractMessageData,
  isMentionEvent,
  parseGatewayEvent,
  stripMentionFromContent,
} from "./gateway-event.adapter";

const makeGatewayEvent = (
  overrides: Partial<GatewayEvent> = {},
): GatewayEvent => ({
  type: "GATEWAY_MESSAGE_CREATE",
  timestamp: Date.now(),
  data: {
    id: "msg-123",
    channel_id: "ch-456",
    content: "<@bot-id> hello",
    author: { id: "user-789", username: "testuser" },
    mentions: [{ id: "bot-id", username: "testbot" }],
  },
  ...overrides,
});

describe("parseGatewayEvent - valid input", () => {
  it("returns ok for valid gateway event", () => {
    const result = parseGatewayEvent({
      type: "GATEWAY_MESSAGE_CREATE",
      timestamp: 1234567890,
      data: { id: "1" },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.type).toBe("GATEWAY_MESSAGE_CREATE");
      expect(result.value.timestamp).toBe(1234567890);
    }
  });
});

describe("parseGatewayEvent - invalid input", () => {
  it("returns err for null input", () => {
    expect(parseGatewayEvent(null).ok).toBe(false);
  });

  it("returns err for string input", () => {
    expect(parseGatewayEvent("event").ok).toBe(false);
  });

  it("returns err for missing type", () => {
    expect(parseGatewayEvent({ timestamp: 1, data: {} }).ok).toBe(false);
  });

  it("returns err for non-string type", () => {
    expect(parseGatewayEvent({ type: 1, timestamp: 1, data: {} }).ok).toBe(
      false,
    );
  });

  it("returns err for missing timestamp", () => {
    expect(
      parseGatewayEvent({ type: "GATEWAY_MESSAGE_CREATE", data: {} }).ok,
    ).toBe(false);
  });

  it("returns err for non-number timestamp", () => {
    expect(
      parseGatewayEvent({
        type: "GATEWAY_MESSAGE_CREATE",
        timestamp: "now",
        data: {},
      }).ok,
    ).toBe(false);
  });

  it("returns err for missing data", () => {
    expect(
      parseGatewayEvent({
        type: "GATEWAY_MESSAGE_CREATE",
        timestamp: 1,
      }).ok,
    ).toBe(false);
  });

  it("returns err for null data", () => {
    expect(
      parseGatewayEvent({
        type: "GATEWAY_MESSAGE_CREATE",
        timestamp: 1,
        data: null,
      }).ok,
    ).toBe(false);
  });
});

describe("isMentionEvent", () => {
  it("returns true when bot is mentioned in MESSAGE_CREATE", () => {
    const event = makeGatewayEvent();
    expect(isMentionEvent(event, "bot-id")).toBe(true);
  });

  it("returns false when bot is not mentioned", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-123",
        channel_id: "ch-456",
        content: "hello",
        author: { id: "user-789", username: "testuser" },
        mentions: [],
      },
    });
    expect(isMentionEvent(event, "bot-id")).toBe(false);
  });

  it("returns false for non-MESSAGE_CREATE event", () => {
    const event = makeGatewayEvent({ type: "GATEWAY_MESSAGE_REACTION_ADD" });
    expect(isMentionEvent(event, "bot-id")).toBe(false);
  });

  it("returns false when data has no mentions array", () => {
    const event = makeGatewayEvent({ data: { id: "1" } });
    expect(isMentionEvent(event, "bot-id")).toBe(false);
  });

  it("returns false when mentions array is empty", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-123",
        channel_id: "ch-456",
        content: "hello",
        author: { id: "user-789", username: "testuser" },
        mentions: [],
      },
    });
    expect(isMentionEvent(event, "bot-id")).toBe(false);
  });

  it("returns true when bot is one of multiple mentions", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-123",
        channel_id: "ch-456",
        content: "<@other> <@bot-id> hello",
        author: { id: "user-789", username: "testuser" },
        mentions: [
          { id: "other", username: "otheruser" },
          { id: "bot-id", username: "testbot" },
        ],
      },
    });
    expect(isMentionEvent(event, "bot-id")).toBe(true);
  });
});

describe("extractMessageData - valid input", () => {
  it("returns ok for valid message data", () => {
    const event = makeGatewayEvent();
    const result = extractMessageData(event);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("msg-123");
      expect(result.value.channel_id).toBe("ch-456");
      expect(result.value.content).toBe("<@bot-id> hello");
      expect(result.value.author.id).toBe("user-789");
      expect(result.value.mentions).toHaveLength(1);
    }
  });

  it("extracts optional guild_id", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-123",
        channel_id: "ch-456",
        content: "hello",
        author: { id: "user-789", username: "testuser" },
        mentions: [],
        guild_id: "guild-1",
      },
    });
    const result = extractMessageData(event);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.guild_id).toBe("guild-1");
  });

  it("sets guild_id to undefined when not present", () => {
    const event = makeGatewayEvent();
    const result = extractMessageData(event);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.guild_id).toBeUndefined();
  });

  it("extracts bot flag from author", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-123",
        channel_id: "ch-456",
        content: "hello",
        author: { id: "user-789", username: "testuser", bot: true },
        mentions: [],
      },
    });
    const result = extractMessageData(event);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.author.bot).toBe(true);
  });
});

describe("extractMessageData - invalid input (part 1)", () => {
  it("returns err when data is not an object", () => {
    const event = makeGatewayEvent({ data: "invalid" });
    expect(extractMessageData(event).ok).toBe(false);
  });

  it("returns err when data is null", () => {
    const event: GatewayEvent = {
      type: "GATEWAY_MESSAGE_CREATE",
      timestamp: 1,
      data: null,
    };
    expect(extractMessageData(event).ok).toBe(false);
  });

  it("returns err for missing id", () => {
    const event = makeGatewayEvent({
      data: {
        channel_id: "ch",
        content: "hi",
        author: { id: "u1", username: "user" },
        mentions: [],
      },
    });
    expect(extractMessageData(event).ok).toBe(false);
  });

  it("returns err for missing channel_id", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-1",
        content: "hi",
        author: { id: "u1", username: "user" },
        mentions: [],
      },
    });
    expect(extractMessageData(event).ok).toBe(false);
  });
});

describe("extractMessageData - invalid input (part 2)", () => {
  it("returns err for missing content", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-1",
        channel_id: "ch",
        author: { id: "u1", username: "user" },
        mentions: [],
      },
    });
    expect(extractMessageData(event).ok).toBe(false);
  });

  it("returns err for missing author", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-1",
        channel_id: "ch",
        content: "hi",
        mentions: [],
      },
    });
    expect(extractMessageData(event).ok).toBe(false);
  });

  it("returns err for missing mentions", () => {
    const event = makeGatewayEvent({
      data: {
        id: "msg-1",
        channel_id: "ch",
        content: "hi",
        author: { id: "u1", username: "user" },
      },
    });
    expect(extractMessageData(event).ok).toBe(false);
  });
});

describe("stripMentionFromContent", () => {
  it("strips <@id> mention from content", () => {
    expect(stripMentionFromContent("<@123456> hello", "123456")).toBe("hello");
  });

  it("strips <@!id> nickname mention from content", () => {
    expect(stripMentionFromContent("<@!123456> hello", "123456")).toBe("hello");
  });

  it("returns content unchanged when no mention present", () => {
    expect(stripMentionFromContent("hello world", "123456")).toBe(
      "hello world",
    );
  });

  it("strips multiple mentions of the same bot", () => {
    expect(
      stripMentionFromContent("<@123456> hello <@123456> again", "123456"),
    ).toBe("hello  again");
  });

  it("does not strip other user mentions", () => {
    expect(stripMentionFromContent("<@999999> hello", "123456")).toBe(
      "<@999999> hello",
    );
  });

  it("returns empty string when content is only a mention", () => {
    expect(stripMentionFromContent("<@123456>", "123456")).toBe("");
  });

  it("handles content with extra whitespace", () => {
    expect(stripMentionFromContent("  <@123456>   hello   ", "123456")).toBe(
      "hello",
    );
  });
});
