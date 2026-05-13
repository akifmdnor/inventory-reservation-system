import { Redis } from "ioredis";
import { INV_HOLD_PREFIX } from "../services/RedisStockGuard.js";
import type { InventoryReservationService } from "../services/InventoryReservationService.js";

/**
 * Listens for Redis TTL expirations on reservation hold keys and finalizes expiry in Postgres + guard.
 */
export class ReservationExpiryWorker {
  private subscriber: Redis | null = null;

  constructor(
    private readonly redis: Redis,
    private readonly service: InventoryReservationService
  ) {}

  start(): void {
    if (this.subscriber) return;
    const sub = this.redis.duplicate();
    this.subscriber = sub;
    void sub.psubscribe("__keyevent@*__:expired").catch((err: unknown) => {
      console.error("[expiry-worker] psubscribe failed", err);
    });
    sub.on("pmessage", (_pattern: string, _channel: string, key: string) => {
      if (typeof key !== "string" || !key.startsWith(INV_HOLD_PREFIX)) return;
      const reservationId = key.slice(INV_HOLD_PREFIX.length);
      void this.service.onHoldExpired(reservationId).catch((err: unknown) => {
        console.error("[expiry-worker] onHoldExpired", reservationId, err);
      });
    });
    sub.on("error", (err: Error) => {
      console.error("[expiry-worker] subscriber error", err);
    });
  }

  async stop(): Promise<void> {
    if (!this.subscriber) return;
    try {
      await this.subscriber.punsubscribe();
      this.subscriber.removeAllListeners();
      this.subscriber.disconnect();
    } catch {
      /* noop */
    }
    this.subscriber = null;
  }
}
