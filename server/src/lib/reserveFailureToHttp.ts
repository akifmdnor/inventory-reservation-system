import { HttpError } from "../lib/httpError.js";

/** Maps domain reserve failures to HTTP — thrown so responses match confirm/cancel (`DomainError`) path */
export function reserveFailureToHttp(result: {
  ok: false;
  code: string;
  message: string;
}): HttpError {
  switch (result.code) {
    case "NOT_FOUND":
      return new HttpError(404, result.code, result.message);
    case "INVALID":
      return new HttpError(400, result.code, result.message);
    case "OUT_OF_STOCK":
    case "NOT_READY":
      return new HttpError(409, result.code, result.message);
    case "PERSIST_FAILED":
      return new HttpError(500, result.code, result.message);
    default:
      return new HttpError(500, "INTERNAL_ERROR", result.message);
  }
}
