import { useCallback, useState } from "react";

import { irisApi } from "@/lib/api";

export function RaceLab(props: { productId: string | null }) {
  const { productId } = props;
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!productId) return;
    setRunning(true);
    setResult(null);
    try {
      const out = await irisApi.demoRace(productId, 500);
      setResult(`500 parallel reserves on a single unit: ${out.successes} success, ${out.failures} failures (expected 1 / 499).`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Race failed");
    } finally {
      setRunning(false);
    }
  }, [productId]);

  return (
    <div className="glass-panel rounded-2xl p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-iris-gold/80">Stress console</p>
      <h3 className="font-display mt-3 text-xl text-iris-text">500-request oversell probe</h3>
      <p className="mt-2 text-xs leading-relaxed text-iris-muted">
        Server resets catalog inventory, isolates this SKU to <span className="font-semibold text-iris-text">one</span>{" "}
        sellable unit, re-syncs Redis from PostgreSQL, then fires 500 overlapping Lua-guarded reservations.
      </p>
      <button
        type="button"
        className="btn-primary mt-6 w-full sm:w-auto"
        disabled={!productId || running}
        onClick={() => void run()}
      >
        {running ? "Running…" : "Run parallel burst"}
      </button>
      {result && <p className="mt-4 text-sm text-iris-text/90">{result}</p>}
    </div>
  );
}
