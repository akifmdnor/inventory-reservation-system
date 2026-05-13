export function PremiumHeader() {
  return (
    <header className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-14 pb-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:pt-20">
      <div className="max-w-xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-iris-gold/90">
          Private access // flash inventory
        </p>
        <h1 className="font-display mt-4 text-4xl font-medium leading-[1.08] tracking-tight text-iris-text sm:text-5xl">
          Curated drops with{" "}
          <span className="italic text-iris-gold">atomic reservation guardrails</span>.
        </h1>
        <p className="mt-5 max-w-md text-sm leading-relaxed text-iris-muted">
          Redis Lua holds, PostgreSQL truth, and a two-minute commitment window engineered so the last
          unit behaves like the last unit.
        </p>
      </div>
      <div className="glass-panel shimmer-border max-w-md rounded-2xl p-6 lg:text-right">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-iris-muted">Availability law</p>
        <p className="font-display mt-3 text-lg text-iris-text">
          Available = Total − Confirmed − Active holds
        </p>
        <p className="mt-2 text-xs text-iris-muted">
          Holds auto-release on TTL; confirmations are intentionally irreversible.
        </p>
      </div>
    </header>
  );
}
