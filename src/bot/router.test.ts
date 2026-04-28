import { describe, expect, it } from "vitest";
import type { DomainInteraction } from "@/sdk/discord/types/domain";
import type { Command } from "./commands/command.interface";
import { Router } from "./router";

function createCommand(name: string): Command {
  return {
    name,
    execute: async () => ({ type: 4, data: { content: name } }),
  };
}

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

describe("Router constructor", () => {
  it("registers commands by name", () => {
    const ping = createCommand("ping");
    const chat = createCommand("chat");
    const router = new Router([ping, chat]);

    expect(router.resolve(createInteraction({ commandName: "ping" }))).toBe(
      ping,
    );
    expect(router.resolve(createInteraction({ commandName: "chat" }))).toBe(
      chat,
    );
  });

  it("overwrites duplicate command names with the last one", () => {
    const ping1 = createCommand("ping");
    const ping2 = createCommand("ping");
    const router = new Router([ping1, ping2]);

    expect(router.resolve(createInteraction({ commandName: "ping" }))).toBe(
      ping2,
    );
  });
});

describe("Router resolve", () => {
  it("returns matching command for known commandName", () => {
    const ping = createCommand("ping");
    const router = new Router([ping]);

    expect(router.resolve(createInteraction({ commandName: "ping" }))).toBe(
      ping,
    );
  });

  it("returns null for unknown commandName", () => {
    const router = new Router([createCommand("ping")]);

    expect(
      router.resolve(createInteraction({ commandName: "unknown" })),
    ).toBeNull();
  });

  it("returns null when commandName is undefined", () => {
    const router = new Router([createCommand("ping")]);

    expect(
      router.resolve(createInteraction({ commandName: undefined })),
    ).toBeNull();
  });

  it("returns null when commandName is empty string", () => {
    const router = new Router([createCommand("ping")]);

    expect(router.resolve(createInteraction({ commandName: "" }))).toBeNull();
  });

  it("works with empty commands array", () => {
    const router = new Router([]);

    expect(
      router.resolve(createInteraction({ commandName: "ping" })),
    ).toBeNull();
  });
});
