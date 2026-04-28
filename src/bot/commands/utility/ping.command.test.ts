import { describe, expect, it } from "vitest";
import type { DomainInteraction } from "@/sdk/discord/types/domain";
import { PingCommand } from "./ping.command";

function createInteraction(
  overrides: Partial<DomainInteraction> = {},
): DomainInteraction {
  return {
    id: "test-id",
    type: "command",
    channelId: "channel-1",
    userId: "user-1",
    commandName: "ping",
    raw: {},
    ...overrides,
  };
}

describe("PingCommand", () => {
  const command = new PingCommand();

  it("has name 'ping'", () => {
    expect(command.name).toBe("ping");
  });

  it("returns message with content 'Pong!'", async () => {
    const response = await command.execute(createInteraction());

    expect(response.type).toBe(4);
    expect(response.data?.content).toBe("Pong!");
  });

  it("does not set ephemeral flag", async () => {
    const response = await command.execute(createInteraction());

    expect(response.data?.flags).toBeUndefined();
  });
});
