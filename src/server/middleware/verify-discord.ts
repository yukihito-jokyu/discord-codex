import { etc, verifyAsync } from "@noble/ed25519";
import type { MiddlewareHandler } from "hono";
import { env } from "@/app/config/env";
import { HTTP_UNAUTHORIZED } from "@/shared/utils/http-status";
import { getLogger } from "@/shared/utils/logger";

export const verifyDiscord: MiddlewareHandler = async (c, next) => {
  const log = getLogger();
  const publicKey = env.DISCORD_PUBLIC_KEY;

  if (!publicKey) {
    log.error("DISCORD_PUBLIC_KEY is not configured");
    return c.json({ error: "Server configuration error" }, HTTP_UNAUTHORIZED);
  }

  const signature = c.req.header("x-signature-ed25519");
  const timestamp = c.req.header("x-signature-timestamp");

  if (!(signature && timestamp)) {
    log.warn(
      { hasSignature: Boolean(signature), hasTimestamp: Boolean(timestamp) },
      "Missing signature headers",
    );
    return c.json({ error: "Missing signature headers" }, HTTP_UNAUTHORIZED);
  }

  const body = await c.req.raw.clone().text();
  const message = new TextEncoder().encode(timestamp + body);

  let isValid: boolean;
  try {
    isValid = await verifyAsync(
      etc.hexToBytes(signature),
      message,
      etc.hexToBytes(publicKey),
    );
  } catch {
    log.error("Signature verification error");
    return c.json({ error: "Invalid signature" }, HTTP_UNAUTHORIZED);
  }

  if (!isValid) {
    log.warn("Discord signature verification failed");
    return c.json({ error: "Invalid signature" }, HTTP_UNAUTHORIZED);
  }

  log.debug("Discord signature verification passed");
  await next();
};
