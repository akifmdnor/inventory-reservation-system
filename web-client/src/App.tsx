import { useCallback, useEffect, useMemo, useState } from "react";

import { InventoryPanel } from "@/components/InventoryPanel";
import { PremiumHeader } from "@/components/PremiumHeader";
import { ProductShowcase } from "@/components/ProductShowcase";
import { RaceLab } from "@/components/RaceLab";
import { irisApi } from "@/lib/api";
import type { Availability, Product, ReserveResponse } from "@/lib/types";

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [activeReservation, setActiveReservation] = useState<{
    productId: string;
    reservation: ReserveResponse;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      const list = await irisApi.products();
      setProducts(list);
      const first = list[0]?.id ?? null;
      setFocusedId((prev) => (prev && list.some((p) => p.id === prev) ? prev : first));
      const entries = await Promise.all(
        list.map(async (p) => {
          const a = await irisApi.availability(p.id);
          return [p.id, a] as const;
        })
      );
      setAvailability(Object.fromEntries(entries));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const focusedProduct = useMemo(() => products.find((p) => p.id === focusedId) ?? null, [products, focusedId]);
  const panelAvailability = focusedId ? availability[focusedId] ?? null : null;

  return (
    <div className="min-h-screen pb-24">
      <PremiumHeader />

      {error && (
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
        </div>
      )}

      <div className="mx-auto mb-12 flex max-w-6xl flex-wrap gap-3 px-4 sm:px-6">
        <button type="button" className="btn-ghost text-xs" onClick={() => void refreshAll()}>
          Refresh state
        </button>
        <button
          type="button"
          className="btn-ghost text-xs"
          onClick={() => {
            void irisApi
              .demoReset()
              .then(() => refreshAll())
              .catch((e) => setError(e instanceof Error ? e.message : "Reset failed"));
          }}
        >
          Demo reset (server)
        </button>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <ProductShowcase
            products={products}
            availability={availability}
            onRefresh={refreshAll}
            activeReservation={activeReservation}
            onReservationChange={setActiveReservation}
          />
        </div>
        <aside className="flex flex-col gap-6 lg:sticky lg:top-8 lg:self-start">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.25em] text-iris-muted" htmlFor="sku-focus">
              Inspect SKU
            </label>
            <select
              id="sku-focus"
              className="mt-2 w-full rounded-xl border border-white/10 bg-iris-surface px-3 py-2.5 text-sm text-iris-text outline-none focus:border-iris-gold/50"
              value={focusedId ?? ""}
              onChange={(e) => setFocusedId(e.target.value || null)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <InventoryPanel availability={panelAvailability} productLabel={focusedProduct?.name ?? "—"} />
          <RaceLab productId={focusedId} />
        </aside>
      </div>

      <footer className="mx-auto mt-20 max-w-6xl border-t border-white/10 px-4 py-10 text-center text-[11px] text-iris-muted sm:px-6">
      Guard &amp; commit · Redis Lua atomics · PostgreSQL optimistic version bump on confirm
      </footer>
    </div>
  );
}
