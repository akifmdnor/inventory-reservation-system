import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useShopSession } from "@/context/ShopSessionContext";
import { irisApi } from "@/lib/api";
import type { Product } from "@/lib/types";

function formatPrice(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5 text-amber-400" aria-hidden>
      {"★★★★★".split("").map((c, i) => (
        <span key={i}>{c}</span>
      ))}
    </div>
  );
}

export function ProductShowcase() {
  const navigate = useNavigate();
  const { products, availability, activeReservation, setActiveReservation, refreshAll } =
    useShopSession();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const lines = useMemo(() => {
    return products.map((p) => {
      const a = availability[p.id];
      const isHot = a ? a.available <= 2 && a.available > 0 : false;
      return { p, a, isHot };
    });
  }, [products, availability]);

  const hasReservationElsewhere = (productId: string) =>
    activeReservation != null && activeReservation.productId !== productId;

  const buyNow = async (product: Product) => {
    setBusyId(product.id);
    setMessage(null);
    try {
      const tag = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? String(Date.now());
      const r = await irisApi.reserve(product.id, `you-${tag}`);
      setActiveReservation({ productId: product.id, reservation: r });
      await refreshAll();
      navigate("/checkout");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not add to bag — try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <div className="mb-10 flex flex-col gap-4 border-b border-iris-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-iris-text sm:text-3xl">
            Shop all
          </h2>
          <p className="mt-2 max-w-xl text-sm text-iris-muted">
            Hand-picked pieces with live inventory. Free shipping on every order.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-iris-muted">
          <span className="rounded-full border border-iris-border bg-iris-surface px-3 py-1.5 text-xs font-medium">
            Sort: Featured
          </span>
          <span className="rounded-full border border-iris-border bg-iris-surface px-3 py-1.5 text-xs font-medium">
            Filter
          </span>
        </div>
      </div>

      {message && (
        <p className="mb-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {message}
        </p>
      )}

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {lines.map(({ p, a, isHot }) => {
          const avail = a?.available ?? null;
          const blocked = hasReservationElsewhere(p.id);
          const isHoldingThis = activeReservation?.productId === p.id;

          return (
            <article
              key={p.id}
              className={`group flex flex-col overflow-hidden rounded-2xl border border-iris-border bg-iris-surface shadow-sm transition hover:shadow-md ${
                isHot ? "ring-1 ring-teal-200" : ""
              }`}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-iris-bg">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                  {isHot && (
                    <span className="rounded-md bg-iris-text px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-iris-surface">
                      Selling fast
                    </span>
                  )}
                  {avail === 0 && (
                    <span className="rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      Sold out
                    </span>
                  )}
                  {isHoldingThis && (
                    <span className="rounded-md bg-teal-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      In your bag
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                    {p.brand}
                  </p>
                  <Stars />
                </div>
                <h3 className="mt-2 text-lg font-semibold leading-snug tracking-tight text-iris-text">
                  {p.name}
                </h3>
                <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-iris-muted">
                  {p.description}
                </p>
                <p className="mt-3 text-xs text-emerald-700">Free delivery · 30-day returns</p>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-iris-border pt-4">
                  <p className="text-xl font-semibold tabular-nums text-iris-text">
                    {formatPrice(p.priceCents)}
                  </p>
                  <p className="text-right text-xs text-iris-muted">
                    <span className="font-medium text-iris-text">{avail ?? "—"}</span> left
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary mt-4 h-12 w-full rounded-xl text-[15px]"
                  disabled={busyId !== null || avail === 0 || blocked}
                  title={
                    blocked ? "Finish or cancel checkout for the item in your bag first" : undefined
                  }
                  onClick={() => void buyNow(p)}
                >
                  {busyId === p.id ? "Adding…" : avail === 0 ? "Sold out" : "Buy now"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
