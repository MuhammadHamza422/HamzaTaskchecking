import { Routes, Route } from "react-router-dom";
import ShippingLandingPage from "./components/shipping/ShippingLandingPage";
import ShippingProcess from "./components/shipping/ShippingProcess";

export default function ShippingOperationsPage() {
  return (
    <Routes>
      <Route index element={<ShippingLandingPage />} />
      <Route path="list" element={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-gray-500">Shipping List - Coming Soon</p>
        </div>
      } />
      <Route path=":packingId" element={<ShippingProcess />} />
    </Routes>
  );
}
