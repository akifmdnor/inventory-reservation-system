import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { DomainError } from "../domain/ReservationAggregate.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "BAD_REQUEST", issues: err.flatten() });
  }
  if (err instanceof DomainError) {
    const status =
      err.code === "NOT_FOUND"
        ? 404
        : err.code === "VERSION_CONFLICT"
          ? 409
          : err.code === "IMMUTABLE"
            ? 409
            : 400;
    return res.status(status).json({ error: err.code, message: err.message });
  }
  const message = err instanceof Error ? err.message : "Internal error";
  console.error("[error]", err);
  return res.status(500).json({ error: "INTERNAL", message });
}
