import { createDiscordAdapter } from "@chat-adapter/discord";
import { env } from "@/app/config/env";
import { getLogger } from "@/shared/utils/logger";

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
    });

    this.abortController = new AbortController();

    log.info(
      { webhookUrl: webhookUrl ?? "not configured" },
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
      undefined,
      this.abortController.signal,
      webhookUrl,
    );
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      getLogger().info("Gateway listener stopped");
    }
  }
}
