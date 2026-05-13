import { Link } from "react-router-dom";

export function StoreFooter() {
  return (
    <footer className="mt-20 border-t border-iris-border bg-iris-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-iris-text">Everest Supply</p>
            <p className="mt-2 max-w-xs text-sm text-iris-muted">Demo storefront with live inventory. Not a real merchant.</p>
          </div>
          <div className="flex flex-wrap gap-8 text-sm">
            <div>
              <p className="font-medium text-iris-text">Shop</p>
              <Link to="/" className="mt-2 block text-iris-muted no-underline hover:text-iris-text">
                All products
              </Link>
            </div>
            <div>
              <p className="font-medium text-iris-text">Help</p>
              <span className="mt-2 block text-iris-muted">Shipping &amp; returns (demo)</span>
            </div>
          </div>
        </div>
        <p className="mt-10 text-center text-xs text-iris-muted">© {new Date().getFullYear()} Everest Supply · demo environment</p>
      </div>
    </footer>
  );
}
