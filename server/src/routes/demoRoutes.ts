import { Router } from "express";
import { z } from "zod";
import type { InventoryReservationService } from "../services/InventoryReservationService.js";

const raceBody = z.object({
  productId: z.string().min(1),
  concurrency: z.coerce.number().int().min(1).max(5000).default(500)
});

export function createDemoRoutes(service: InventoryReservationService): Router {
  const r = Router();

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

  return r;
}
