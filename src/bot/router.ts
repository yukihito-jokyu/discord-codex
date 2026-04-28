import type { DomainInteraction } from "@/sdk/discord/types/domain";
import type { Command } from "./commands/command.interface";

export class Router {
  private map = new Map<string, Command>();

  constructor(commands: Command[]) {
    for (const c of commands) {
      this.map.set(c.name, c);
    }
  }

  resolve(interaction: DomainInteraction): Command | null {
    if (!interaction.commandName) return null;
    return this.map.get(interaction.commandName) ?? null;
  }
}
