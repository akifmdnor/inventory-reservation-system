export function StoreHero() {
  return (
    <section className="relative overflow-hidden border-b border-iris-border bg-gradient-to-br from-teal-50 via-iris-surface to-zinc-50">
      <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-teal-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-zinc-200/60 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
          Spring collection
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight text-iris-text sm:text-5xl">
          Quality gear, <span className="text-teal-700">real-time</span> availability
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-iris-muted">
          Free shipping on every order · Easy returns · Stock updates the moment you buy
        </p>
        <div className="mt-8 flex flex-wrap gap-3 text-xs font-medium text-iris-muted">
          <span className="rounded-full border border-iris-border bg-iris-surface px-3 py-1.5">
            Trusted checkout
          </span>
          <span className="rounded-full border border-iris-border bg-iris-surface px-3 py-1.5">
            Secure hold
          </span>
          <span className="rounded-full border border-iris-border bg-iris-surface px-3 py-1.5">
            4.9 store rating
          </span>
        </div>
      </div>
    </section>
  );
}
