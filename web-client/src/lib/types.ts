export type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  imageUrl: string;
  description: string;
  priceCents: number;
  totalStock: number;
};

export type Availability = {
  totalStock: number;
  confirmedQty: number;
  activeReservationsQty: number;
  available: number;
  formula: string;
};

export type ReserveResponse = {
  reservationId: string;
  expiresAt: string;
  ttlSeconds: number;
};

export type RaceResponse = {
  successes: number;
  failures: number;
  reservationIds: string[];
};
