import { createClient, type RedisClientType } from "redis";
import { getLogger } from "@/shared/utils/logger";

type FallbackEntry = { value: string; expiresAt?: number };

export class RedisClient {
  private client: RedisClientType | null = null;
  private fallback = new Map<string, FallbackEntry>();
  private connected = false;

  constructor(private url: string) {}

  async connect(): Promise<void> {
    try {
      this.client = createClient({ url: this.url });
      this.client.on("error", (err) => {
        getLogger().error({ err: err.message }, "Redis error");
        this.connected = false;
      });
      this.client.on("reconnecting", () => {
        getLogger().warn("Redis reconnecting...");
      });
      this.client.on("ready", () => {
        this.connected = true;
        getLogger().info("Redis reconnected and ready");
      });
      await this.client.connect();
      this.connected = true;
      getLogger().info({ url: this.url }, "Redis connected");
    } catch (err) {
      getLogger().warn(
        { err },
        "Redis connection failed, falling back to in-memory",
      );
      this.client = null;
      this.connected = false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // 接続が既に切断されている場合は無視
      } finally {
        this.client = null;
        this.connected = false;
        getLogger().info("Redis disconnected");
      }
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.connected) {
      try {
        return await this.client.get(key);
      } catch {
        return this.fallbackGet(key);
      }
    }
    return this.fallbackGet(key);
  }

  async set(
    key: string,
    value: string,
    opts?: { ttlMs?: number },
  ): Promise<void> {
    if (this.client && this.connected) {
      try {
        if (opts?.ttlMs) {
          await this.client.setEx(key, Math.ceil(opts.ttlMs / 1000), value);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // fallthrough to fallback
      }
    }
    this.fallback.set(key, {
      value,
      expiresAt: opts?.ttlMs ? Date.now() + opts.ttlMs : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    if (this.client && this.connected) {
      try {
        await this.client.del(key);
      } catch {
        // noop
      }
    }
    this.fallback.delete(key);
  }

  async ping(): Promise<boolean> {
    if (!(this.client && this.connected)) return false;
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  private fallbackGet(key: string): string | null {
    const entry = this.fallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.fallback.delete(key);
      return null;
    }
    return entry.value;
  }
}
