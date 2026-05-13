import type { Response } from "express";

/** Structured HTTP failure — handled by `errorHandler` → `{ error, message, details? }` body */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function problemJson(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  const body: Record<string, unknown> = { error: code, message };
  if (details !== undefined) body.details = details;
  return res.status(status).json(body);
}

export function statusFallbackCode(status: number): string {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  return "INTERNAL_ERROR";
}
