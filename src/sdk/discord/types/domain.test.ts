import { describe, expect, it } from "vitest";
import type {
  DomainInteraction,
  DomainResponse,
  InteractionType,
} from "./domain";

describe("domain types", () => {
  it("InteractionType accepts valid values", () => {
    const types: InteractionType[] = ["ping", "command", "component", "modal"];
    expect(types).toHaveLength(4);
  });

  it("DomainInteraction holds required fields only", () => {
    const interaction: DomainInteraction = {
      id: "123",
      type: "command",
      channelId: "456",
      userId: "789",
      raw: {},
    };
    expect(interaction.id).toBe("123");
    expect(interaction.commandName).toBeUndefined();
    expect(interaction.options).toBeUndefined();
    expect(interaction.customId).toBeUndefined();
  });

  it("DomainInteraction holds all optional fields", () => {
    const interaction: DomainInteraction = {
      id: "123",
      type: "component",
      channelId: "456",
      userId: "789",
      commandName: "test-cmd",
      options: { key: "value" },
      customId: "my-button",
      raw: {},
    };
    expect(interaction.commandName).toBe("test-cmd");
    expect(interaction.options).toEqual({ key: "value" });
    expect(interaction.customId).toBe("my-button");
  });

  it("DomainResponse holds type and optional data", () => {
    const response: DomainResponse = { type: 4, data: { content: "hi" } };
    expect(response.type).toBe(4);
    expect(response.data).toEqual({ content: "hi" });
  });
});
