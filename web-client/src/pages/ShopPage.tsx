import { useEffect, useMemo, useState } from "react";

import { ProductShowcase } from "@/components/ProductShowcase";
import { StoreFooter } from "@/components/store/StoreFooter";
import { StoreHero } from "@/components/store/StoreHero";
import { StoreHeader } from "@/components/store/StoreHeader";
import { useShopSession } from "@/context/ShopSessionContext";
import { ShopInspectorColumn } from "@/pages/shop/ShopColumns";
import { ShopToolbar } from "@/pages/shop/ShopToolbar";

export function ShopPage() {
  const { error, products } = useShopSession();
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    const first = products[0]?.id ?? null;
    setFocusedId((prev) => (prev && products.some((p) => p.id === prev) ? prev : first));
  }, [products]);

  const errorBanner = useMemo(
    () =>
      error ? (
        <div className="mb-8">
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        </div>
      ) : null,
    [error]
  );

  return (
    <div className="min-h-screen bg-iris-bg">
      <StoreHeader />

      <StoreHero />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {errorBanner}
        <ProductShowcase />

        <details className="group mt-16 rounded-2xl border border-iris-border bg-iris-surface p-5 shadow-sm open:shadow-md">
          <summary className="cursor-pointer list-none text-sm font-semibold text-iris-text marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              Demo tools
              <span className="text-xs font-normal text-iris-muted">(stock breakdown &amp; load test)</span>
            </span>
          </summary>
          <p className="mt-3 text-xs text-iris-muted">
            For developers testing the reservation API. Typical shoppers won&apos;t need this section.
          </p>
          <div className="mt-6 space-y-6 border-t border-iris-border pt-6">
            <ShopToolbar />
            <ShopInspectorColumn focusedId={focusedId} onFocusedIdChange={setFocusedId} />
          </div>
        </details>
      </div>

      <StoreFooter />
    </div>
  );
}
