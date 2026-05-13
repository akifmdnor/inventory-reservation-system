import { irisApi } from "@/lib/api";
import { useShopSession } from "@/context/ShopSessionContext";

export function ShopToolbar() {
  const { refreshAll, setError } = useShopSession();

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className="btn-ghost text-xs" onClick={() => void refreshAll()}>
        Refresh catalog
      </button>
      <button
        type="button"
        className="btn-ghost text-xs"
        onClick={() => {
          void irisApi
            .demoReset()
            .then(() => refreshAll())
            .catch((e) => setError(e instanceof Error ? e.message : "Reset failed"));
        }}
      >
        Reset demo data
      </button>
    </div>
  );
}
