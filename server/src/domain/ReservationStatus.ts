export const ReservationStatus = {
  ACTIVE: "ACTIVE",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED"
} as const;

export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];
