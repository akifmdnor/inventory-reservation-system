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
      setResult(`500 simultaneous hold requests on one unit: ${out.successes} succeeded, ${out.failures} declined (only one should win).`);
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Race failed");
    } finally {
      setRunning(false);
    }
  }, [productId]);

  return (
    <div className="glass-panel rounded-2xl p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-700/90">Load test</p>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-iris-text">Parallel reservation check</h3>
      <p className="mt-2 text-xs leading-relaxed text-iris-muted">
        The demo resets this item to a single available unit, then fires 500 overlapping reservation attempts. You
        should see exactly one success.
      </p>
      <button
        type="button"
        className="btn-primary mt-6 w-full sm:w-auto"
        disabled={!productId || running}
        onClick={() => void run()}
      >
        {running ? "Running…" : "Run 500 parallel attempts"}
      </button>
      {result && <p className="mt-4 text-sm text-iris-text/90">{result}</p>}
    </div>
  );
}
