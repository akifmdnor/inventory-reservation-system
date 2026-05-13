import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { DomainError } from "../domain/ReservationAggregate.js";
import { HttpError, problemJson } from "../lib/httpError.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return problemJson(res, err.status, err.code, err.message, err.details);
  }
  if (err instanceof ZodError) {
    return problemJson(res, 400, "BAD_REQUEST", "Validation failed", err.flatten());
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
    return problemJson(res, status, err.code, err.message);
  }
  console.error("[inventory]", err);
  return problemJson(res, 500, "INTERNAL_ERROR", "Internal Server Error");
}
