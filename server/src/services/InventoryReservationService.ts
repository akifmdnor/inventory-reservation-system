import { randomUUID } from "node:crypto";
import { LedgerKind, ReservationStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { DomainError, ReservationAggregate } from "../domain/ReservationAggregate.js";
import { ReservationStatus as RS } from "../domain/ReservationStatus.js";
import type { IInventoryRepository, IReservationRepository } from "../repositories/interfaces.js";
import { appendLedger } from "../repositories/prismaRepositories.js";
import type { RedisStockGuard } from "./RedisStockGuard.js";

export type ReserveResult =
  | { ok: true; reservationId: string; expiresAt: Date }
  | { ok: false; code: string; message: string };

export class InventoryReservationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly inventory: IInventoryRepository,
    private readonly reservations: IReservationRepository,
    private readonly guard: RedisStockGuard,
    private readonly reservationTtlSeconds: number
  ) {}

  get ttlSeconds(): number {
    return this.reservationTtlSeconds;
  }

  async reconcileRedisForProduct(productId: string) {
    const snap = await this.inventory.availability(productId);
    if (snap.available < 0) {
      throw new Error("INVARIANT_BROKEN_NEGATIVE_AVAILABLE");
    }
    await this.guard.setAvailableStock(productId, snap.available);
    return snap;
  }

  async reconcileAllProducts(): Promise<void> {
    const products = await this.inventory.listProducts();
    await Promise.all(products.map((p) => this.reconcileRedisForProduct(p.id)));
  }

  async getAvailability(productId: string) {
    return this.inventory.availability(productId);
  }

  async listProducts() {
    return this.inventory.listProducts();
  }

  async reserve(input: {
    productId: string;
    userLabel: string;
    quantity: number;
  }): Promise<ReserveResult> {
    const product = await this.inventory.findProductById(input.productId);
    if (!product) {
      return { ok: false, code: "NOT_FOUND", message: "Product not found" };
    }
    if (input.quantity < 1) {
      return { ok: false, code: "INVALID", message: "Quantity must be positive" };
    }

    const reservationId = randomUUID();
    const redisInit = await this.guard.getAvailableStock(input.productId);
    if (redisInit == null) {
      await this.reconcileRedisForProduct(input.productId);
    }

    const guard = await this.guard.tryReserve(
      input.productId,
      reservationId,
      input.quantity,
      this.reservationTtlSeconds
    );
    if (!guard.ok) {
      if (guard.reason === "STOCK_NOT_INITIALIZED") {
        return { ok: false, code: "NOT_READY", message: "Stock guard not initialized" };
      }
      return { ok: false, code: "OUT_OF_STOCK", message: "Not enough available stock" };
    }

    const expiresAt = new Date(Date.now() + this.reservationTtlSeconds * 1000);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.reservation.create({
          data: {
            id: reservationId,
            productId: input.productId,
            userLabel: input.userLabel,
            status: ReservationStatus.ACTIVE,
            quantity: input.quantity,
            expiresAt
          }
        });
        await appendLedger(tx, {
          productId: input.productId,
          reservationId,
          kind: LedgerKind.RESERVE,
          quantityDelta: -input.quantity,
          note: "reserve"
        });
      });
    } catch (e) {
      await this.guard.rollbackReserve(input.productId, reservationId, input.quantity);
      return {
        ok: false,
        code: "PERSIST_FAILED",
        message: e instanceof Error ? e.message : "Persist failed"
      };
    }

    return { ok: true, reservationId, expiresAt };
  }

  async confirmReservation(reservationId: string): Promise<void> {
    const row = await this.reservations.findById(reservationId);
    if (!row) {
      throw new DomainError("NOT_FOUND", "Reservation not found");
    }
    const agg = new ReservationAggregate({
      id: row.id,
      productId: row.productId,
      status: row.status as RS,
      quantity: row.quantity,
      expiresAt: row.expiresAt
    });
    const now = new Date();
    agg.assertCanConfirm(now);

    const product = await this.inventory.findProductById(row.productId);
    if (!product) {
      throw new DomainError("NOT_FOUND", "Product not found");
    }

    await this.prisma.$transaction(async (tx) => {
      const bumped = await tx.product.updateMany({
        where: { id: product.id, version: product.version },
        data: { version: { increment: 1 } }
      });
      if (bumped.count !== 1) {
        throw new DomainError("VERSION_CONFLICT", "Optimistic lock failed; retry confirm");
      }
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CONFIRMED, confirmedAt: now }
      });
      await appendLedger(tx, {
        productId: row.productId,
        reservationId,
        kind: LedgerKind.CONFIRM,
        quantityDelta: 0,
        note: "confirm"
      });
    });

    await this.guard.confirmDropHold(reservationId);
    await this.reconcileRedisForProduct(row.productId);
  }

  async cancelReservation(reservationId: string): Promise<void> {
    const row = await this.reservations.findById(reservationId);
    if (!row) {
      throw new DomainError("NOT_FOUND", "Reservation not found");
    }
    const agg = new ReservationAggregate({
      id: row.id,
      productId: row.productId,
      status: row.status as RS,
      quantity: row.quantity,
      expiresAt: row.expiresAt
    });
    const now = new Date();
    agg.assertCanCancel(now);

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.CANCELLED, cancelledAt: now }
      });
      await appendLedger(tx, {
        productId: row.productId,
        reservationId,
        kind: LedgerKind.CANCEL,
        quantityDelta: row.quantity,
        note: "cancel"
      });
    });

    await this.guard.releaseHold(row.productId, reservationId, row.quantity);
    await this.reconcileRedisForProduct(row.productId);
  }

  /**
   * Invoked when Redis TTL expires on a hold key (or idempotent repair).
   */
  async onHoldExpired(reservationId: string): Promise<void> {
    const row = await this.reservations.findById(reservationId);
    if (!row) return;
    if (row.status !== ReservationStatus.ACTIVE) return;

    const agg = new ReservationAggregate({
      id: row.id,
      productId: row.productId,
      status: row.status as RS,
      quantity: row.quantity,
      expiresAt: row.expiresAt
    });
    try {
      agg.assertCanExpire();
    } catch {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.EXPIRED }
      });
      await appendLedger(tx, {
        productId: row.productId,
        reservationId,
        kind: LedgerKind.EXPIRE,
        quantityDelta: row.quantity,
        note: "expire"
      });
    });

    await this.reconcileRedisForProduct(row.productId);
  }

  async demoReset(): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.inventoryLedger.deleteMany(),
      this.prisma.reservation.deleteMany(),
      this.prisma.product.updateMany({ data: { version: 0 } })
    ]);
    await this.prisma.$executeRawUnsafe(`
      UPDATE products SET total_stock = CASE sku
        WHEN 'IRIS-LTD-001' THEN 3
        WHEN 'IRIS-LTD-002' THEN 12
        WHEN 'IRIS-LTD-003' THEN 5
        ELSE total_stock
      END
    `);
    await this.reconcileAllProducts();
  }

  /**
   * Narrow a SKU to an exact on-hand integer for flash-sale demos (clears reservations for that product).
   */
  async demoFlashSaleSetup(productId: string, totalStock: number): Promise<void> {
    await this.prisma.inventoryLedger.deleteMany({ where: { productId } });
    await this.prisma.reservation.deleteMany({ where: { productId } });
    await this.prisma.product.update({
      where: { id: productId },
      data: { totalStock, version: 0 }
    });
    await this.reconcileRedisForProduct(productId);
  }

  async runRaceSimulation(input: { productId: string; concurrency: number }): Promise<{
    successes: number;
    failures: number;
    reservationIds: string[];
  }> {
    const attempts = Array.from({ length: input.concurrency }, (_, i) =>
      this.reserve({ productId: input.productId, userLabel: `race-${i}`, quantity: 1 })
    );
    const results = await Promise.all(attempts);
    let successes = 0;
    const reservationIds: string[] = [];
    for (const r of results) {
      if (r.ok) {
        successes += 1;
        reservationIds.push(r.reservationId);
      }
    }
    return {
      successes,
      failures: results.length - successes,
      reservationIds
    };
  }
}
