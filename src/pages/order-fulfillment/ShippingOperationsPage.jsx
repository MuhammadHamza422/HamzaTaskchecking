import { Routes, Route } from "react-router-dom";
import ShippingLandingPageNew from "./components/shipping/ShippingLandingPageNew";
import ShippingOrderDetailsNew from "./components/shipping/ShippingOrderDetailsNew";
import ShippingOperationsTable from "./components/shipping/ShippingOperationsTable";
import ShippingRecordDetailsPage from "./components/shipping/ShippingRecordDetailsPage";

export default function ShippingOperationsPage() {
  return (
    <Routes>
      {/* Main shipping landing page with scanner */}
      <Route index element={<ShippingLandingPageNew />} />
      
      {/* Shipping order details with steps (photo upload + details) */}
      <Route path=":trackingNumber" element={<ShippingOrderDetailsNew />} />
      
      {/* List all shipping records */}
      <Route path="list" element={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-[1550px] mx-auto">
            <ShippingOperationsTable />
          </div>
        </div>
      } />
      
      {/* Shipping record details page */}
      <Route path="details/:shippingRecordId" element={<ShippingRecordDetailsPage />} />
      
    </Routes>
  );
}
