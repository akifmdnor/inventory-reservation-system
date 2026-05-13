import { Router } from "express";

export function createHealthRoutes(): Router {
  const r = Router();

  r.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "inventory-reservation" });
  });

  return r;
}
