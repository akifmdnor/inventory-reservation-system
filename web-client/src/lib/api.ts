import type { Availability, Product, RaceResponse, ReserveResponse } from "@/lib/types";

const base = import.meta.env.VITE_API_BASE ?? "";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      message?: string;
      error?: string;
    } | null;
    throw new Error(body?.message ?? body?.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const irisApi = {
  products: () => api<Product[]>("/api/products"),
  availability: (productId: string) => api<Availability>(`/api/products/${productId}/availability`),
  reserve: (productId: string, userLabel: string) =>
    api<ReserveResponse>("/api/reservations", {
      method: "POST",
      body: JSON.stringify({ productId, userLabel, quantity: 1 })
    }),
  confirm: (reservationId: string) =>
    api<{ ok: boolean }>(`/api/reservations/${reservationId}/confirm`, { method: "POST" }),
  cancel: (reservationId: string) =>
    api<{ ok: boolean }>(`/api/reservations/${reservationId}/cancel`, { method: "POST" }),
  demoReset: () => api<{ ok: boolean }>("/api/demo/reset", { method: "POST" }),
  demoRace: (productId: string, concurrency = 500) =>
    api<RaceResponse>("/api/demo/race", {
      method: "POST",
      body: JSON.stringify({ productId, concurrency })
    })
};
