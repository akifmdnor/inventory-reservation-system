import type { Availability } from "@/lib/types";

export function InventoryPanel(props: { availability: Availability | null; productLabel: string }) {
  const { availability, productLabel } = props;
  if (!availability) {
    return (
      <div className="glass-panel rounded-2xl p-6 text-sm text-iris-muted">
        Select a product to inspect ledger-accurate availability.
      </div>
    );
  }
  const rows = [
    { label: "Total stock", value: availability.totalStock },
    { label: "Confirmed sold", value: availability.confirmedQty },
    { label: "Active holds", value: availability.activeReservationsQty },
    { label: "Available now", value: availability.available, highlight: true }
  ];
  return (
    <div className="glass-panel shimmer-border rounded-2xl p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-iris-gold/80">Live ledger</p>
      <h3 className="font-display mt-3 text-xl text-iris-text">{productLabel}</h3>
      <p className="mt-2 text-xs text-iris-muted">{availability.formula}</p>
      <dl className="mt-6 space-y-4">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-white/5 pb-3 last:border-0">
            <dt className="text-xs text-iris-muted">{r.label}</dt>
            <dd className={`text-sm font-semibold tabular-nums ${r.highlight ? "text-iris-gold" : "text-iris-text"}`}>
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
