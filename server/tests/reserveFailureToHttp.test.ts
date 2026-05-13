import { describe, expect, it } from "vitest";
import { reserveFailureToHttp } from "../src/lib/reserveFailureToHttp.js";

describe("reserveFailureToHttp", () => {
  it("maps reserve failure codes to HTTP errors", () => {
    expect(reserveFailureToHttp({ ok: false, code: "NOT_FOUND", message: "m" }).status).toBe(404);
    expect(reserveFailureToHttp({ ok: false, code: "INVALID", message: "m" }).status).toBe(400);
    expect(reserveFailureToHttp({ ok: false, code: "OUT_OF_STOCK", message: "m" }).status).toBe(
      409
    );
    expect(reserveFailureToHttp({ ok: false, code: "NOT_READY", message: "m" }).status).toBe(409);
    expect(reserveFailureToHttp({ ok: false, code: "PERSIST_FAILED", message: "m" }).status).toBe(
      500
    );
    const fallback = reserveFailureToHttp({ ok: false, code: "UNKNOWN", message: "z" });
    expect(fallback.status).toBe(500);
    expect(fallback.code).toBe("INTERNAL_ERROR");
  });
});
