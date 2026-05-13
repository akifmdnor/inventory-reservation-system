import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

import { useShopSession } from "@/context/ShopSessionContext";

function formatClock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function StoreHeader() {
  const { activeReservation } = useShopSession();
  const hasHold = activeReservation != null;

  return (
    <header className="sticky top-0 z-50 border-b border-iris-border bg-iris-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-iris-text no-underline">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-iris-text text-sm font-bold text-iris-surface">
            E
          </span>
          <span className="text-base font-semibold tracking-tight">Everest Supply</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-2 text-sm font-medium no-underline transition ${
                isActive ? "bg-iris-bg text-iris-text" : "text-iris-muted hover:text-iris-text"
              }`
            }
          >
            Shop
          </NavLink>
          <NavLink
            to="/checkout"
            className={({ isActive }) =>
              `relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold no-underline transition ${
                !hasHold
                  ? "pointer-events-none text-iris-muted opacity-50"
                  : isActive
                    ? "bg-iris-text text-iris-surface"
                    : "bg-iris-bg text-iris-text hover:bg-zinc-200"
              }`
            }
            aria-disabled={!hasHold}
            title={hasHold ? "Go to checkout" : "Add an item from the shop first"}
          >
            Bag
            {hasHold && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                1
              </span>
            )}
          </NavLink>
        </nav>
      </div>
      {hasHold && activeReservation && (
        <div className="border-t border-iris-border bg-iris-bg/80 px-4 py-2 text-center text-xs text-iris-muted sm:px-6">
          Item reserved — complete checkout within{" "}
          <HeaderHoldTicker expiresAt={activeReservation.reservation.expiresAt} />
        </div>
      )}
    </header>
  );
}

function HeaderHoldTicker({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const tick = () => setLeft(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  return <span className="font-semibold tabular-nums text-iris-text">{formatClock(left)}</span>;
}
