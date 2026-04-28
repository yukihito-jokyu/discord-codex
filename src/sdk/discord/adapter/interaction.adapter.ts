import { ValidationError } from "@/shared/types/errors";
import type { Result } from "@/shared/types/result";
import { err, ok } from "@/shared/types/result";
import { isNonEmptyString } from "@/shared/utils/validation";
import type { APIInteraction } from "../types";
import { DiscordInteractionType } from "../types";
import type { DomainInteraction, InteractionType } from "../types/domain";

export function toDomain(raw: unknown): Result<DomainInteraction> {
  const validated = validate(raw);
  if (!validated.ok) return validated;

  const interaction = raw as APIInteraction;

  return ok({
    id: interaction.id,
    type: mapType(interaction.type),
    channelId:
      (interaction.channel as { id?: string } | undefined)?.id ??
      interaction.channel_id ??
      "",
    userId: interaction.member?.user?.id ?? interaction.user?.id ?? "",
    commandName: (interaction.data as { name?: string } | undefined)?.name,
    options: extractOptions(interaction),
    customId: (interaction.data as { custom_id?: string } | undefined)
      ?.custom_id,
    raw: interaction,
  });
}

function validate(raw: unknown): Result<void> {
  if (!raw || typeof raw !== "object")
    return err(new ValidationError("interaction payload is not an object"));

  const obj = raw as Record<string, unknown>;

  if (!isNonEmptyString(obj.id))
    return err(new ValidationError("missing or invalid interaction id"));

  if (typeof obj.type !== "number")
    return err(new ValidationError("missing or invalid interaction type"));

  return ok(undefined);
}

function mapType(type: DiscordInteractionType): InteractionType {
  switch (type) {
    case DiscordInteractionType.Ping:
      return "ping";
    case DiscordInteractionType.ApplicationCommand:
    case DiscordInteractionType.ApplicationCommandAutocomplete:
      return "command";
    case DiscordInteractionType.MessageComponent:
      return "component";
    case DiscordInteractionType.ModalSubmit:
      return "modal";
    default:
      return "command";
  }
}

function extractOptions(
  interaction: APIInteraction,
): Record<string, unknown> | undefined {
  const data = (
    interaction as {
      data?: { options?: Array<{ name: string; value: unknown }> };
    }
  ).data;
  if (!data?.options) return;

  const result: Record<string, unknown> = {};
  for (const opt of data.options) {
    result[opt.name] = opt.value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}
