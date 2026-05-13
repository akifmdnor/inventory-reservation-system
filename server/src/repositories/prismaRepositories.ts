import type { Prisma, PrismaClient } from "@prisma/client";
import { LedgerKind, ReservationStatus } from "@prisma/client";
import type { AvailabilitySnapshot, IInventoryRepository, IReservationRepository } from "./interfaces.js";

export class PrismaInventoryRepository implements IInventoryRepository {
  constructor(private readonly db: PrismaClient) {}

  findProductById(id: string) {
    return this.db.product.findUnique({ where: { id } });
  }

  listProducts() {
    return this.db.product.findMany({ orderBy: { name: "asc" } });
  }

  async availability(productId: string): Promise<AvailabilitySnapshot> {
    const product = await this.db.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }
    const [confirmed, active] = await Promise.all([
      this.db.reservation.aggregate({
        where: { productId, status: ReservationStatus.CONFIRMED },
        _sum: { quantity: true }
      }),
      this.db.reservation.aggregate({
        where: { productId, status: ReservationStatus.ACTIVE },
        _sum: { quantity: true }
      })
    ]);
    const confirmedQty = confirmed._sum.quantity ?? 0;
    const activeQty = active._sum.quantity ?? 0;
    const available = product.totalStock - confirmedQty - activeQty;
    return {
      totalStock: product.totalStock,
      confirmedQty,
      activeQty,
      available
    };
  }

  async bumpProductVersion(productId: string, expectedVersion: number): Promise<boolean> {
    const res = await this.db.product.updateMany({
      where: { id: productId, version: expectedVersion },
      data: { version: { increment: 1 } }
    });
    return res.count === 1;
  }
}

export class PrismaReservationRepository implements IReservationRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string) {
    return this.db.reservation.findUnique({ where: { id } });
  }

  createActive(data: {
    id: string;
    productId: string;
    userLabel: string;
    quantity: number;
    expiresAt: Date;
  }) {
    return this.db.reservation.create({
      data: {
        id: data.id,
        productId: data.productId,
        userLabel: data.userLabel,
        status: ReservationStatus.ACTIVE,
        quantity: data.quantity,
        expiresAt: data.expiresAt
      }
    });
  }

  markConfirmed(id: string, at: Date) {
    return this.db.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CONFIRMED, confirmedAt: at }
    }).then(() => undefined);
  }

  markCancelled(id: string, at: Date) {
    return this.db.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED, cancelledAt: at }
    }).then(() => undefined);
  }

  markExpired(id: string, _at: Date) {
    return this.db.reservation
      .update({
        where: { id },
        data: { status: ReservationStatus.EXPIRED }
      })
      .then(() => undefined);
  }
}

type DbClient = Prisma.TransactionClient | PrismaClient;

export async function appendLedger(
  db: DbClient,
  row: {
    productId: string;
    reservationId: string | null;
    kind: LedgerKind;
    quantityDelta: number;
    note?: string;
  }
) {
  await db.inventoryLedger.create({
    data: {
      productId: row.productId,
      reservationId: row.reservationId,
      kind: row.kind,
      quantityDelta: row.quantityDelta,
      note: row.note ?? ""
    }
  });
}
