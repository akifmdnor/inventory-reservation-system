import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from "react";

import { irisApi } from "@/lib/api";
import type { Availability, Product, ReserveResponse } from "@/lib/types";

export type ActiveReservationState = { productId: string; reservation: ReserveResponse } | null;

type ShopSessionContextValue = {
  products: Product[];
  availability: Record<string, Availability>;
  activeReservation: ActiveReservationState;
  setActiveReservation: Dispatch<SetStateAction<ActiveReservationState>>;
  refreshAll: () => Promise<void>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
};

const ShopSessionContext = createContext<ShopSessionContextValue | null>(null);

export function ShopSessionProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [activeReservation, setActiveReservation] = useState<ActiveReservationState>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    setError(null);
    try {
      const list = await irisApi.products();
      setProducts(list);
      const entries = await Promise.all(
        list.map(async (p) => {
          const a = await irisApi.availability(p.id);
          return [p.id, a] as const;
        })
      );
      setAvailability(Object.fromEntries(entries));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load catalog");
    }
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const value = useMemo(
    () => ({
      products,
      availability,
      activeReservation,
      setActiveReservation,
      refreshAll,
      error,
      setError
    }),
    [products, availability, activeReservation, refreshAll, error]
  );

  return <ShopSessionContext.Provider value={value}>{children}</ShopSessionContext.Provider>;
}

export function useShopSession() {
  const ctx = useContext(ShopSessionContext);
  if (!ctx) throw new Error("useShopSession must be used within ShopSessionProvider");
  return ctx;
}
