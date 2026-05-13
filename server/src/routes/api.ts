import { Router } from "express";
import type { InventoryReservationService } from "../services/InventoryReservationService.js";
import { createDemoRoutes } from "./demoRoutes.js";
import { createHealthRoutes } from "./healthRoutes.js";
import { createProductRoutes } from "./productRoutes.js";
import { createReservationRoutes } from "./reservationRoutes.js";

export function createApiRouter(
  service: InventoryReservationService,
  options: { demoRoutesEnabled: boolean }
): Router {
  const r = Router();

  r.use(createHealthRoutes());
  r.use(createProductRoutes(service));
  r.use(createReservationRoutes(service));
  if (options.demoRoutesEnabled) {
    r.use(createDemoRoutes(service));
  }

  return r;
}
