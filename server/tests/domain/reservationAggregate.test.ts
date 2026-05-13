import { describe, expect, it } from "vitest";

import { DomainError, ReservationAggregate } from "../../src/domain/ReservationAggregate.js";
import { ReservationStatus } from "../../src/domain/ReservationStatus.js";

describe("ReservationAggregate", () => {
  const base = {
    id: "r1",
    productId: "p1",
    status: ReservationStatus.ACTIVE,
    quantity: 1,
    expiresAt: new Date(Date.now() + 60_000)
  };

  it("allows confirm when active and not expired", () => {
    const agg = new ReservationAggregate(base);
    agg.assertCanConfirm(new Date());
  });

  it("rejects confirm when expired", () => {
    const agg = new ReservationAggregate({
      ...base,
      expiresAt: new Date(Date.now() - 1_000)
    });
    expect(() => agg.assertCanConfirm(new Date())).toThrow(DomainError);
  });

  it("rejects cancel when confirmed (immutable)", () => {
    const agg = new ReservationAggregate({
      ...base,
      status: ReservationStatus.CONFIRMED
    });
    expect(() => agg.assertCanCancel(new Date())).toThrow(DomainError);
    try {
      agg.assertCanCancel(new Date());
    } catch (e) {
      expect(e).toBeInstanceOf(DomainError);
      expect((e as DomainError).code).toBe("IMMUTABLE");
    }
  });

  it("rejects confirm when not active", () => {
    const agg = new ReservationAggregate({
      ...base,
      status: ReservationStatus.CANCELLED
    });
    expect(() => agg.assertCanConfirm(new Date())).toThrow(DomainError);
  });

  it("assertConfirmedImmutable blocks confirmed rows", () => {
    const agg = new ReservationAggregate({
      ...base,
      status: ReservationStatus.CONFIRMED
    });
    expect(() => agg.assertConfirmedImmutable()).toThrow(DomainError);
  });
});
