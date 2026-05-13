import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { DomainError } from "../../src/domain/ReservationAggregate.js";
import { createIntegrationContext, type IntegrationCtx } from "../helpers/integrationContext.js";

const run = process.env.RUN_INTEGRATION === "1";

describe.skipIf(!run)("inventory integration (Postgres + Redis)", () => {
  let ctx: IntegrationCtx;

  beforeAll(async () => {
    ctx = await createIntegrationContext(120);
  });

  afterAll(async () => {
    await ctx?.dispose();
  });

  it("race: exactly one reservation succeeds when stock is 1 and 500 parallel reserve calls fire", async () => {
    await ctx.service.demoReset();
    const products = await ctx.service.listProducts();
    const target = products[0];
    if (!target) throw new Error("no seeded products");
    await ctx.service.demoFlashSaleSetup(target.id, 1);
    const out = await ctx.service.runRaceSimulation({ productId: target.id, concurrency: 500 });
    expect(out.successes).toBe(1);
    expect(out.failures).toBe(499);
  });

  it("expiry path restores availability via onHoldExpired", async () => {
    await ctx.service.demoReset();
    const products = await ctx.service.listProducts();
    const target = products[0];
    if (!target) throw new Error("no seeded products");
    await ctx.service.demoFlashSaleSetup(target.id, 1);
    const before = await ctx.service.getAvailability(target.id);
    expect(before.available).toBe(1);
    const r = await ctx.service.reserve({ productId: target.id, userLabel: "expiry-test", quantity: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const mid = await ctx.service.getAvailability(target.id);
    expect(mid.available).toBe(0);
    await ctx.service.onHoldExpired(r.reservationId);
    const after = await ctx.service.getAvailability(target.id);
    expect(after.available).toBe(1);
  });

  it("confirmed purchase cannot be cancelled", async () => {
    await ctx.service.demoReset();
    const products = await ctx.service.listProducts();
    const target = products[0];
    if (!target) throw new Error("no seeded products");
    await ctx.service.demoFlashSaleSetup(target.id, 3);
    const r = await ctx.service.reserve({ productId: target.id, userLabel: "buyer", quantity: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    await ctx.service.confirmReservation(r.reservationId);
    await expect(ctx.service.cancelReservation(r.reservationId)).rejects.toBeInstanceOf(DomainError);
  });
});
