import type { Context, MiddlewareHandler } from "hono";
import { HTTP_OK } from "@/shared/utils/http-status";
import { getLogger } from "@/shared/utils/logger";

const DISCORD_INTERACTION_TYPE_PING = 1;
// biome-ignore lint/suspicious/noBitwiseOperators: Discord ephemeral flag requires bitwise operation
const EPHEMERAL_FLAG = 1 << 6;
// biome-ignore lint/security/noSecrets: false positive — user-facing error message, not a secret
export const ACCESS_DENIED_MESSAGE = "このBotを利用する権限がありません。";

export async function checkAccessControl(
  c: Context,
  allowedUsers?: string[],
): Promise<Response | null> {
  const body = await c.req.raw.clone().text();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (parsed.type === DISCORD_INTERACTION_TYPE_PING) return null;

  const userId = extractUserId(parsed);
  if (!isUserAllowed(userId, allowedUsers)) {
    getLogger().warn({ userId }, "Access denied: user not in allowed list");
    return ephemeralDeny(c);
  }

  return null;
}

export function isUserAllowed(
  userId: string | undefined,
  allowedUsers?: string[],
): boolean {
  if (!allowedUsers || allowedUsers.length === 0) return true;
  return Boolean(userId && allowedUsers.includes(userId));
}

function extractUserId(parsed: Record<string, unknown>): string | undefined {
  const member = parsed.member as Record<string, unknown> | undefined;
  const memberUser = member?.user as Record<string, unknown> | undefined;
  const user = parsed.user as Record<string, unknown> | undefined;
  return (memberUser?.id ?? user?.id) as string | undefined;
}

function ephemeralDeny(c: Context): Response {
  return c.json(
    {
      type: 4,
      data: {
        content: ACCESS_DENIED_MESSAGE,
        flags: EPHEMERAL_FLAG,
      },
    },
    HTTP_OK,
  );
}

export function createAccessControl(
  allowedUsers?: string[],
): MiddlewareHandler {
  return async (c, next) => {
    const result = await checkAccessControl(c, allowedUsers);
    if (result) return result;
    await next();
  };
}
