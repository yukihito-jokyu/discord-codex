import { createDiscordAdapter } from "@chat-adapter/discord";
import { env } from "@/app/config/env";
import { getLogger } from "@/shared/utils/logger";

const GATEWAY_DURATION_MS = 86_400_000; // 24 hours

function createPinoLoggerAdapter() {
  const log = getLogger();
  const wrap =
    (fn: (msg: string) => void) =>
    (msg: string, data?: Record<string, unknown>) => {
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        log.info(data, `[gateway] ${msg}`);
      } else {
        fn(`[gateway] ${msg}`);
      }
    };
  const logger = {
    info: wrap((m) => log.info(m)),
    error: wrap((m) => log.error(m)),
    warn: wrap((m) => log.warn(m)),
    debug: wrap((m) => log.debug(m)),
    child: () => logger,
  };
  return logger;
}

export class DiscordGateway {
  private abortController: AbortController | null = null;

  async start(webhookUrl?: string): Promise<void> {
    const { DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, DISCORD_APPLICATION_ID } =
      env;

    if (!(DISCORD_BOT_TOKEN && DISCORD_PUBLIC_KEY && DISCORD_APPLICATION_ID)) {
      throw new Error(
        "Gateway requires DISCORD_BOT_TOKEN, DISCORD_PUBLIC_KEY, and DISCORD_APPLICATION_ID",
      );
    }

    const log = getLogger();
    const adapter = createDiscordAdapter({
      botToken: DISCORD_BOT_TOKEN,
      publicKey: DISCORD_PUBLIC_KEY,
      applicationId: DISCORD_APPLICATION_ID,
      logger: createPinoLoggerAdapter(),
    });
    // Adapter requires chat instance for startGatewayListener to proceed
    await (
      adapter as { initialize: (chat: unknown) => Promise<void> }
    ).initialize({});

    this.abortController = new AbortController();

    log.info(
      {
        webhookUrl: webhookUrl ?? "not configured",
        durationHours: GATEWAY_DURATION_MS / 3_600_000,
      },
      "Starting Gateway listener",
    );

    await adapter.startGatewayListener(
      {
        waitUntil: (task) => {
          task.catch((err) => {
            log.error({ err: String(err) }, "Gateway background task error");
          });
        },
      },
      GATEWAY_DURATION_MS,
      this.abortController.signal,
      webhookUrl,
    );

    log.info("Gateway listener startGatewayListener returned");
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      getLogger().info("Gateway listener stopped");
    }
  }
}
