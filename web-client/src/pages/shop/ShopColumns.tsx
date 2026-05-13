import type { Dispatch, SetStateAction } from "react";

import { InventoryPanel } from "@/components/InventoryPanel";
import { RaceLab } from "@/components/RaceLab";
import { useShopSession } from "@/context/ShopSessionContext";

type ShopInspectorColumnProps = {
  focusedId: string | null;
  onFocusedIdChange: Dispatch<SetStateAction<string | null>>;
};

export function ShopInspectorColumn({ focusedId, onFocusedIdChange }: ShopInspectorColumnProps) {
  const { products, availability } = useShopSession();
  const focusedProduct = products.find((p) => p.id === focusedId) ?? null;
  const panelAvailability = focusedId ? availability[focusedId] ?? null : null;

  return (
    <aside className="flex flex-col gap-6">
      <div>
        <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-iris-muted" htmlFor="sku-focus">
          Focus product
        </label>
        <select
          id="sku-focus"
          className="mt-2 w-full rounded-lg border border-iris-border bg-iris-surface px-3 py-2.5 text-sm text-iris-text shadow-sm outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30"
          value={focusedId ?? ""}
          onChange={(e) => onFocusedIdChange(e.target.value || null)}
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
  );
}
