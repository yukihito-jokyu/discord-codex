import { InteractionType as DiscordInteractionType } from "discord-api-types/v10";
import { describe, expect, it } from "vitest";
import { toDomain } from "./interaction.adapter";

const makeRaw = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "interaction-123",
  type: DiscordInteractionType.ApplicationCommand,
  channel: { id: "channel-456" },
  member: { user: { id: "user-789" } },
  data: { name: "test-cmd" },
  ...overrides,
});

describe("toDomain validation failures", () => {
  it("returns err for null input", () => {
    const result = toDomain(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns err for non-object input (string)", () => {
    expect(toDomain("string").ok).toBe(false);
  });

  it("returns err for non-object input (number)", () => {
    expect(toDomain(123).ok).toBe(false);
  });

  it("returns err for empty object", () => {
    expect(toDomain({}).ok).toBe(false);
  });

  it("returns err for empty id string", () => {
    expect(toDomain({ id: "", type: 1 }).ok).toBe(false);
  });

  it("returns err for whitespace-only id", () => {
    expect(toDomain({ id: "  ", type: 1 }).ok).toBe(false);
  });

  it("returns err for object with id but missing type", () => {
    expect(toDomain({ id: "123" }).ok).toBe(false);
  });

  it("returns err for object with id but non-number type", () => {
    expect(toDomain({ id: "123", type: "1" }).ok).toBe(false);
  });
});

describe("toDomain type mapping", () => {
  it("maps Ping (type=1) to 'ping'", () => {
    const result = toDomain(makeRaw({ type: DiscordInteractionType.Ping }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("ping");
  });

  it("maps ApplicationCommand (type=2) to 'command'", () => {
    const result = toDomain(
      makeRaw({ type: DiscordInteractionType.ApplicationCommand }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("command");
  });

  it("maps ApplicationCommandAutocomplete (type=4) to 'command'", () => {
    const result = toDomain(
      makeRaw({ type: DiscordInteractionType.ApplicationCommandAutocomplete }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("command");
  });

  it("maps MessageComponent (type=3) to 'component'", () => {
    const result = toDomain(
      makeRaw({ type: DiscordInteractionType.MessageComponent }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("component");
  });

  it("maps ModalSubmit (type=5) to 'modal'", () => {
    const result = toDomain(
      makeRaw({ type: DiscordInteractionType.ModalSubmit }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("modal");
  });
});

describe("toDomain user and channel extraction", () => {
  it("extracts id, channelId, userId from guild interaction", () => {
    const result = toDomain(
      makeRaw({ channel: { id: "ch-1" }, member: { user: { id: "usr-1" } } }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toBe("interaction-123");
      expect(result.value.channelId).toBe("ch-1");
      expect(result.value.userId).toBe("usr-1");
    }
  });

  it("extracts userId from DM interaction (user field)", () => {
    const result = toDomain(
      makeRaw({ member: undefined, user: { id: "dm-user" } }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.userId).toBe("dm-user");
  });

  it("falls back to channel_id when channel object is absent", () => {
    const result = toDomain(
      makeRaw({ channel: undefined, channel_id: "fallback-ch" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.channelId).toBe("fallback-ch");
  });
});

describe("toDomain data field extraction", () => {
  it("extracts commandName from application command data", () => {
    const result = toDomain(makeRaw({ data: { name: "hello" } }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.commandName).toBe("hello");
  });

  it("extracts customId from message component data", () => {
    const result = toDomain(
      makeRaw({
        type: DiscordInteractionType.MessageComponent,
        data: { custom_id: "my-button" },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.customId).toBe("my-button");
  });

  it("extracts options as Record<string, unknown>", () => {
    const result = toDomain(
      makeRaw({
        data: {
          name: "cmd",
          options: [
            { name: "key1", value: "val1" },
            { name: "key2", value: 42 },
          ],
        },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok)
      expect(result.value.options).toEqual({ key1: "val1", key2: 42 });
  });

  it("returns undefined options when data has no options", () => {
    const result = toDomain(makeRaw({ data: { name: "cmd" } }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.options).toBeUndefined();
  });

  it("preserves raw interaction in raw field", () => {
    const raw = makeRaw();
    const result = toDomain(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.raw).toBe(raw);
  });

  it("maps unknown interaction type to 'command' (default)", () => {
    const result = toDomain(makeRaw({ type: 999 }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.type).toBe("command");
  });

  it("returns undefined options when options array is empty", () => {
    const result = toDomain(makeRaw({ data: { name: "cmd", options: [] } }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.options).toBeUndefined();
  });
});

describe("toDomain fallbacks for missing user and channel", () => {
  it("returns empty userId when both member and user are absent", () => {
    const result = toDomain(makeRaw({ member: undefined, user: undefined }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.userId).toBe("");
  });

  it("returns empty channelId when both channel and channel_id are absent", () => {
    const result = toDomain(
      makeRaw({ channel: undefined, channel_id: undefined }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.channelId).toBe("");
  });
});
