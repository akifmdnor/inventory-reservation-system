import { useCallback, useEffect, useMemo, useState } from "react";

import { irisApi } from "@/lib/api";
import type { Availability, Product, ReserveResponse } from "@/lib/types";

function formatPrice(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function useCountdown(iso: string | null, onExpire: () => void) {
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!iso) {
      setLeft(null);
      return;
    }
    const end = new Date(iso).getTime();
    const tick = () => {
      const s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) onExpire();
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [iso, onExpire]);

  return left;
}

export function ProductShowcase(props: {
  products: Product[];
  availability: Record<string, Availability | undefined>;
  onRefresh: () => Promise<void>;
  activeReservation: { productId: string; reservation: ReserveResponse } | null;
  onReservationChange: (v: { productId: string; reservation: ReserveResponse } | null) => void;
}) {
  const { products, availability, onRefresh, activeReservation, onReservationChange } = props;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshAvailability = useCallback(async () => {
    await onRefresh();
  }, [onRefresh]);

  const activeIso = activeReservation?.reservation.expiresAt ?? null;
  const countdown = useCountdown(activeIso, () => {
    void refreshAvailability();
    onReservationChange(null);
  });

  const lines = useMemo(() => {
    return products.map((p) => {
      const a = availability[p.id];
      const isHot = a ? a.available <= 2 && a.available > 0 : false;
      return { p, a, isHot };
    });
  }, [products, availability]);

  const reserve = async (product: Product) => {
    setBusyId(product.id);
    setMessage(null);
    try {
      const tag = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? String(Date.now());
      const r = await irisApi.reserve(product.id, `you-${tag}`);
      onReservationChange({ productId: product.id, reservation: r });
      await refreshAvailability();
      setMessage("Hold secured. Confirm before the window closes.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reserve failed");
    } finally {
      setBusyId(null);
    }
  };

  const confirm = async () => {
    if (!activeReservation) return;
    setBusyId(activeReservation.productId);
    setMessage(null);
    try {
      await irisApi.confirm(activeReservation.reservation.reservationId);
      onReservationChange(null);
      await refreshAvailability();
      setMessage("Purchase confirmed. Inventory locked in as sold.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Confirm failed");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async () => {
    if (!activeReservation) return;
    setBusyId(activeReservation.productId);
    setMessage(null);
    try {
      await irisApi.cancel(activeReservation.reservation.reservationId);
      onReservationChange(null);
      await refreshAvailability();
      setMessage("Hold released. Stock returned to the floor.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-medium text-iris-text">This week’s floor</h2>
          <p className="mt-2 text-sm text-iris-muted">Objects, not SKUs — each row below is wired into the live guard.</p>
        </div>
        {activeReservation && countdown != null && (
          <div className="glass-panel rounded-xl px-4 py-3 text-sm text-iris-text">
            <span className="text-iris-muted">Hold window </span>
            <span className="tabular-nums font-semibold text-iris-gold">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </span>
          </div>
        )}
      </div>

      {message && (
        <p className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-iris-text/90">
          {message}
        </p>
      )}

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {lines.map(({ p, a, isHot }) => {
          const avail = a?.available ?? null;
          const isActiveCard = activeReservation?.productId === p.id;
          return (
            <article
              key={p.id}
              className={`glass-panel shimmer-border group relative overflow-hidden rounded-2xl transition hover:-translate-y-0.5 ${isHot ? "ring-1 ring-iris-gold/35" : ""}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                <div className="absolute left-4 top-4 flex gap-2">
                  {isHot && (
                    <span className="rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-iris-gold">
                      Low floor
                    </span>
                  )}
                  {avail === 0 && (
                    <span className="rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-iris-rose">
                      Sold through
                    </span>
                  )}
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-iris-gold/90">{p.brand}</p>
                  <h3 className="font-display mt-1 text-xl text-white">{p.name}</h3>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <p className="line-clamp-2 text-xs leading-relaxed text-iris-muted">{p.description}</p>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-2xl text-iris-text">{formatPrice(p.priceCents)}</p>
                  <p className="text-right text-[11px] text-iris-muted">
                    Avail.{" "}
                    <span className="font-semibold text-iris-text">{avail ?? "—"}</span>
                    <span className="block text-[10px] text-iris-muted/80">of {p.totalStock} total</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-primary flex-1 min-w-[140px]"
                    disabled={busyId !== null || avail === 0 || (activeReservation != null && !isActiveCard)}
                    onClick={() => void reserve(p)}
                  >
                    {busyId === p.id ? "Reserving…" : "Reserve"}
                  </button>
                  {isActiveCard && (
                    <>
                      <button type="button" className="btn-primary flex-1 min-w-[120px]" disabled={busyId !== null} onClick={() => void confirm()}>
                        Confirm
                      </button>
                      <button type="button" className="btn-ghost" disabled={busyId !== null} onClick={() => void cancel()}>
                        Release
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
