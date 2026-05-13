import { Router } from "express";
import { z } from "zod";
import type { InventoryReservationService } from "../services/InventoryReservationService.js";

export function createApiRouter(
  service: InventoryReservationService,
  options: { demoRoutesEnabled: boolean }
): Router {
  const r = Router();

  r.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "inventory-reservation" });
  });

  r.get("/products", async (_req, res, next) => {
    try {
      const products = await service.listProducts();
      res.json(
        products.map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          brand: p.brand,
          imageUrl: p.imageUrl,
          description: p.description,
          priceCents: p.priceCents,
          totalStock: p.totalStock
        }))
      );
    } catch (e) {
      next(e);
    }
  });

  r.get("/products/:id/availability", async (req, res, next) => {
    try {
      const snap = await service.getAvailability(req.params.id);
      res.json({
        totalStock: snap.totalStock,
        confirmedQty: snap.confirmedQty,
        activeReservationsQty: snap.activeQty,
        available: snap.available,
        formula: "Available = TotalStock − Confirmed − ActiveReservations"
      });
    } catch (e) {
      next(e);
    }
  });

  const reserveBody = z.object({
    productId: z.string().min(1),
    userLabel: z.string().min(1).max(64).optional(),
    quantity: z.coerce.number().int().min(1).max(99).default(1)
  });

  r.post("/reservations", async (req, res, next) => {
    try {
      const body = reserveBody.parse(req.body ?? {});
      const result = await service.reserve({
        productId: body.productId,
        userLabel: body.userLabel ?? "guest",
        quantity: body.quantity
      });
      if (!result.ok) {
        const status = result.code === "NOT_FOUND" ? 404 : 409;
        return res.status(status).json({ error: result.code, message: result.message });
      }
      res.status(201).json({
        reservationId: result.reservationId,
        expiresAt: result.expiresAt.toISOString(),
        ttlSeconds: service.ttlSeconds
      });
    } catch (e) {
      next(e);
    }
  });

  r.post("/reservations/:id/confirm", async (req, res, next) => {
    try {
      await service.confirmReservation(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  r.post("/reservations/:id/cancel", async (req, res, next) => {
    try {
      await service.cancelReservation(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  if (options.demoRoutesEnabled) {
    const raceBody = z.object({
      productId: z.string().min(1),
      concurrency: z.coerce.number().int().min(1).max(5000).default(500)
    });
    r.post("/demo/reset", async (_req, res, next) => {
      try {
        await service.demoReset();
        res.json({ ok: true });
      } catch (e) {
        next(e);
      }
    });
    r.post("/demo/race", async (req, res, next) => {
      try {
        const body = raceBody.parse(req.body ?? {});
        await service.demoReset();
        await service.demoFlashSaleSetup(body.productId, 1);
        const out = await service.runRaceSimulation({
          productId: body.productId,
          concurrency: body.concurrency
        });
        res.json(out);
      } catch (e) {
        next(e);
      }
    });
  }

  return r;
}
