import { Router } from "express";
import { z } from "zod";
import { reserveFailureToHttp } from "../lib/reserveFailureToHttp.js";
import type { InventoryReservationService } from "../services/InventoryReservationService.js";

const reserveBody = z.object({
  productId: z.string().min(1),
  userLabel: z.string().min(1).max(64).optional(),
  quantity: z.coerce.number().int().min(1).max(99).default(1)
});

export function createReservationRoutes(service: InventoryReservationService): Router {
  const r = Router();

  r.post("/reservations", async (req, res, next) => {
    try {
      const body = reserveBody.parse(req.body ?? {});
      const result = await service.reserve({
        productId: body.productId,
        userLabel: body.userLabel ?? "guest",
        quantity: body.quantity
      });
      if (!result.ok) {
        throw reserveFailureToHttp(result);
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

  return r;
}
