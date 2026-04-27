import { DISCORD_MAX_LENGTH } from "./constants";

// biome-ignore lint/security/noSecrets: static Japanese notice text, not a secret
const OMISSION_NOTICE = "\n\n... (続きは省略されました)";

export function formatForDiscord(text: string): string {
  if (text.length <= DISCORD_MAX_LENGTH) return text;
  return `${text.slice(0, DISCORD_MAX_LENGTH - 50)}${OMISSION_NOTICE}`;
}
