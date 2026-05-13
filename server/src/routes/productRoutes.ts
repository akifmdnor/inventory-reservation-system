import { Router } from "express";
import type { InventoryReservationService } from "../services/InventoryReservationService.js";

export function createProductRoutes(service: InventoryReservationService): Router {
  const r = Router();

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

  return r;
}
