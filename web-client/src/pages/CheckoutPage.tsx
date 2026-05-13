import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHeader } from "@/components/store/StoreHeader";
import { useShopSession } from "@/context/ShopSessionContext";
import { useCountdown } from "@/hooks/useCountdown";
import { irisApi } from "@/lib/api";

function formatPrice(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const {
    products,
    activeReservation,
    setActiveReservation,
    refreshAll
  } = useShopSession();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const product = useMemo(
    () => (activeReservation ? products.find((p) => p.id === activeReservation.productId) ?? null : null),
    [activeReservation, products]
  );

  const onExpire = useCallback(() => {
    setActiveReservation(null);
    void refreshAll();
    navigate("/", { replace: true });
  }, [navigate, refreshAll, setActiveReservation]);

  const expiresAt = activeReservation?.reservation.expiresAt ?? null;
  const countdown = useCountdown(complete ? null : expiresAt, onExpire);

  useEffect(() => {
    if (complete) return;
    if (!activeReservation) {
      navigate("/", { replace: true });
      return;
    }
    if (products.length > 0 && !products.some((p) => p.id === activeReservation.productId)) {
      setActiveReservation(null);
      navigate("/", { replace: true });
    }
  }, [activeReservation, complete, navigate, products, setActiveReservation]);

  const markPaid = async () => {
    if (!activeReservation) return;
    setBusy(true);
    setMessage(null);
    try {
      await irisApi.confirm(activeReservation.reservation.reservationId);
      setActiveReservation(null);
      await refreshAll();
      setComplete(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Payment could not be confirmed");
    } finally {
      setBusy(false);
    }
  };

  const cancelCheckout = async () => {
    if (!activeReservation) return;
    setBusy(true);
    setMessage(null);
    try {
      await irisApi.cancel(activeReservation.reservation.reservationId);
      setActiveReservation(null);
      await refreshAll();
      navigate("/", { replace: true });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not cancel reservation");
    } finally {
      setBusy(false);
    }
  };

  if (complete) {
    return (
      <div className="min-h-screen bg-iris-bg">
        <StoreHeader />
        <div className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✓</div>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight text-iris-text">Thanks — you&apos;re all set</h1>
          <p className="mt-3 text-sm text-iris-muted">Your order is confirmed. Inventory has been updated.</p>
          <Link
            to="/"
            className="mt-10 inline-flex h-12 items-center justify-center rounded-xl bg-iris-text px-8 text-sm font-semibold text-iris-surface no-underline hover:opacity-90"
          >
            Continue shopping
          </Link>
        </div>
        <StoreFooter />
      </div>
    );
  }

  if (!product || !activeReservation) {
    return null;
  }

  const shipping = 0;
  const subtotal = product.priceCents;
  const total = subtotal + shipping;

  return (
    <div className="min-h-screen bg-iris-bg">
      <StoreHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="text-xs text-iris-muted">
          <Link to="/" className="text-teal-700 no-underline hover:underline">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-iris-text">Checkout</span>
        </nav>

        <div className="mt-6 flex flex-wrap gap-3 text-[11px] font-medium">
          <StepPill done label="Bag" />
          <StepPill active label="Checkout" />
          <StepPill label="Confirmation" />
        </div>

        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-iris-text">Checkout</h1>
        <p className="mt-2 text-sm text-iris-muted">Finish payment before your reservation timer ends.</p>

        {message && (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{message}</p>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-6">
            <div className="rounded-2xl border border-iris-border bg-iris-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-iris-text">Delivery</h2>
              <p className="mt-3 text-sm text-iris-muted">Demo store — enter details for display only.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <FakeField label="Email" />
                <FakeField label="Full name" />
                <FakeField label="Address" className="sm:col-span-2" />
                <FakeField label="City" />
                <FakeField label="ZIP" />
              </div>
            </div>

            <div className="rounded-2xl border border-iris-border bg-iris-surface p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-iris-text">Payment</h2>
              <p className="mt-3 text-sm text-iris-muted">Simulated step — use the button below to record payment.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {["Card", "Apple Pay", "PayPal"].map((x) => (
                  <span
                    key={x}
                    className="rounded-lg border border-iris-border bg-iris-bg px-4 py-2 text-xs font-medium text-iris-muted"
                  >
                    {x}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-iris-border bg-iris-surface shadow-sm">
              <div className="border-b border-iris-border bg-teal-50/80 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Reserved</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-iris-text">
                  {formatCountdown(Math.max(0, countdown ?? 0))}
                </p>
                <p className="mt-1 text-xs text-teal-900/80">Time left to complete checkout</p>
              </div>
              <div className="flex gap-4 p-5">
                <img src={product.imageUrl} alt="" className="h-24 w-20 rounded-xl object-cover ring-1 ring-black/5" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-700">{product.brand}</p>
                  <p className="mt-1 font-medium text-iris-text">{product.name}</p>
                  <p className="mt-1 text-sm font-semibold">{formatPrice(product.priceCents)}</p>
                  <p className="mt-1 text-xs text-iris-muted">Qty 1</p>
                </div>
              </div>
              <dl className="space-y-3 border-t border-iris-border px-5 py-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-iris-muted">Subtotal</dt>
                  <dd className="font-medium tabular-nums text-iris-text">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-iris-muted">Shipping</dt>
                  <dd className="font-medium text-emerald-700">Free</dd>
                </div>
                <div className="flex justify-between border-t border-iris-border pt-3 text-base">
                  <dt className="font-semibold text-iris-text">Total</dt>
                  <dd className="font-semibold tabular-nums text-iris-text">{formatPrice(total)}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2 border-t border-iris-border p-5">
                <button type="button" className="btn-primary h-12 w-full rounded-xl text-base" disabled={busy} onClick={() => void markPaid()}>
                  {busy ? "Processing…" : "Pay now & confirm"}
                </button>
                <button
                  type="button"
                  className="btn-ghost h-11 w-full rounded-xl text-sm"
                  disabled={busy}
                  onClick={() => void cancelCheckout()}
                >
                  Cancel and return to shop
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-iris-muted">256-bit demo · Your items are held during checkout</p>
          </aside>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}

function StepPill({ label, active, done }: { label: string; active?: boolean; done?: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 ${
        done ? "bg-emerald-100 text-emerald-800" : active ? "bg-iris-text text-iris-surface" : "bg-iris-surface text-iris-muted ring-1 ring-iris-border"
      }`}
    >
      {label}
    </span>
  );
}

function FakeField({ label, className = "" }: { label: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-iris-muted">{label}</span>
      <input
        type="text"
        readOnly
        placeholder=""
        className="mt-1.5 w-full rounded-lg border border-iris-border bg-iris-bg px-3 py-2.5 text-sm text-iris-text outline-none focus:border-teal-500/40"
      />
    </label>
  );
}
