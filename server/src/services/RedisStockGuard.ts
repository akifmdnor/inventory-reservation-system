import { Redis } from "ioredis";

const STOCK_PREFIX = "inv:stock:";
export const INV_HOLD_PREFIX = "inv:hold:";

/** Atomic reserve: decrement stock and create TTL hold key. Returns ok boolean. */
const LUA_RESERVE = `
local stockKey = KEYS[1]
local holdKey = KEYS[2]
local qty = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local cur = redis.call('GET', stockKey)
if cur == false then
  return {-1}
end
cur = tonumber(cur)
if cur < qty then
  return {0}
end
redis.call('DECRBY', stockKey, qty)
redis.call('SET', holdKey, '1', 'EX', ttl)
return {1}
`;

/** Release hold: delete TTL key and increment stock (cancel / expiry). Idempotent if hold missing. */
const LUA_RELEASE = `
local stockKey = KEYS[1]
local holdKey = KEYS[2]
local qty = tonumber(ARGV[1])

local hold = redis.call('GET', holdKey)
if hold == false then
  return {0}
end
redis.call('DEL', holdKey)
redis.call('INCRBY', stockKey, qty)
return {1}
`;

/** Confirm: remove hold only; stock stays reduced. Idempotent if hold missing. */
const LUA_CONFIRM_DROP_HOLD = `
local holdKey = KEYS[1]
local hold = redis.call('GET', holdKey)
if hold == false then
  return {0}
end
redis.call('DEL', holdKey)
return {1}
`;

export type RedisStockGuardOptions = {
  keyPrefixStock?: string;
  keyPrefixHold?: string;
};

export class RedisStockGuard {
  private readonly stockPrefix: string;
  private readonly holdPrefix: string;

  constructor(
    private readonly redis: Redis,
    opts?: RedisStockGuardOptions
  ) {
    this.stockPrefix = opts?.keyPrefixStock ?? STOCK_PREFIX;
    this.holdPrefix = opts?.keyPrefixHold ?? INV_HOLD_PREFIX;
  }

  stockKey(productId: string): string {
    return `${this.stockPrefix}${productId}`;
  }

  holdKey(reservationId: string): string {
    return `${this.holdPrefix}${reservationId}`;
  }

  async setAvailableStock(productId: string, available: number): Promise<void> {
    await this.redis.set(this.stockKey(productId), String(available));
  }

  async getAvailableStock(productId: string): Promise<number | null> {
    const v = await this.redis.get(this.stockKey(productId));
    if (v == null) return null;
    return Number(v);
  }

  /**
   * Atomically tries to reserve quantity. On success, creates hold key with TTL.
   */
  async tryReserve(productId: string, reservationId: string, quantity: number, ttlSeconds: number) {
    const out = (await this.redis.eval(
      LUA_RESERVE,
      2,
      this.stockKey(productId),
      this.holdKey(reservationId),
      String(quantity),
      String(ttlSeconds)
    )) as number[];
    const code = out[0];
    if (code === -1) return { ok: false as const, reason: "STOCK_NOT_INITIALIZED" as const };
    if (code === 0) return { ok: false as const, reason: "OUT_OF_STOCK" as const };
    return { ok: true as const };
  }

  async releaseHold(productId: string, reservationId: string, quantity: number) {
    const out = (await this.redis.eval(
      LUA_RELEASE,
      2,
      this.stockKey(productId),
      this.holdKey(reservationId),
      String(quantity)
    )) as number[];
    return out[0] === 1;
  }

  async confirmDropHold(reservationId: string) {
    const out = (await this.redis.eval(LUA_CONFIRM_DROP_HOLD, 1, this.holdKey(reservationId))) as number[];
    return out[0] === 1;
  }

  /** Roll back a successful Lua reserve if DB commit failed afterward. */
  async rollbackReserve(productId: string, reservationId: string, quantity: number) {
    await this.releaseHold(productId, reservationId, quantity);
  }
}
