import type { Product, Reservation } from "@prisma/client";

export type AvailabilitySnapshot = {
  totalStock: number;
  confirmedQty: number;
  activeQty: number;
  available: number;
};

export interface IInventoryRepository {
  findProductById(id: string): Promise<Product | null>;
  listProducts(): Promise<Product[]>;
  availability(productId: string): Promise<AvailabilitySnapshot>;
  /** Optimistic lock bump used on confirm to document the strategy; inventory quantities come from reservations. */
  bumpProductVersion(productId: string, expectedVersion: number): Promise<boolean>;
}

export interface IReservationRepository {
  findById(id: string): Promise<Reservation | null>;
  createActive(data: {
    id: string;
    productId: string;
    userLabel: string;
    quantity: number;
    expiresAt: Date;
  }): Promise<Reservation>;
  markConfirmed(id: string, at: Date): Promise<void>;
  markCancelled(id: string, at: Date): Promise<void>;
  markExpired(id: string, at: Date): Promise<void>;
}
