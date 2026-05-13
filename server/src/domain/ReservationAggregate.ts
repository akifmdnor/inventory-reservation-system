import { ReservationStatus } from "./ReservationStatus.js";

export type ReservationRecord = {
  id: string;
  productId: string;
  status: ReservationStatus;
  quantity: number;
  expiresAt: Date;
};

/**
 * ReservationAggregate: enforces legal state transitions for a reservation.
 */
export class ReservationAggregate {
  constructor(private readonly row: ReservationRecord) {}

  get id(): string {
    return this.row.id;
  }

  get productId(): string {
    return this.row.productId;
  }

  get quantity(): number {
    return this.row.quantity;
  }

  get status(): ReservationStatus {
    return this.row.status;
  }

  assertCanConfirm(now: Date): void {
    if (this.row.status !== ReservationStatus.ACTIVE) {
      throw new DomainError("INVALID_STATE", "Only ACTIVE reservations can be confirmed");
    }
    if (this.row.expiresAt.getTime() <= now.getTime()) {
      throw new DomainError("EXPIRED", "Reservation is expired");
    }
  }

  assertCanCancel(now: Date): void {
    if (this.row.status === ReservationStatus.CONFIRMED) {
      throw new DomainError("IMMUTABLE", "Confirmed purchases cannot be reversed or cancelled");
    }
    if (this.row.status !== ReservationStatus.ACTIVE) {
      throw new DomainError("INVALID_STATE", "Only ACTIVE reservations can be cancelled");
    }
    if (this.row.expiresAt.getTime() <= now.getTime()) {
      throw new DomainError("EXPIRED", "Reservation is expired");
    }
  }

  assertCanExpire(): void {
    if (this.row.status !== ReservationStatus.ACTIVE) {
      throw new DomainError("INVALID_STATE", "Only ACTIVE reservations can expire");
    }
  }

  assertConfirmedImmutable(): void {
    if (this.row.status === ReservationStatus.CONFIRMED) {
      throw new DomainError("IMMUTABLE", "Confirmed purchases cannot be reversed or cancelled");
    }
  }
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "DomainError";
  }
}
