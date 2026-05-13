import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ShopSessionProvider } from "@/context/ShopSessionContext";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { ShopPage } from "@/pages/ShopPage";

export function App() {
  return (
    <ShopSessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ShopPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ShopSessionProvider>
  );
}
