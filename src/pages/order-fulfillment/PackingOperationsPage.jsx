import { Routes, Route } from "react-router-dom";
import PackingLandingPage from "./components/packing/PackingLandingPage";
import PackingOrderDetails from "./components/packing/PackingOrderDetails";
import PackingOperationsTable from "./components/packing/PackingOperationsTable";

export default function PackingOperationsPage() {
  return (
    <Routes>
      <Route index element={<PackingLandingPage />} />
      <Route path="list" element={
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-[1550px] mx-auto">
            {/* <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Packing Operations
              </h1>
              <p className="text-gray-600">View and manage all packing operations</p>
            </div> */}
            <PackingOperationsTable />
          </div>
        </div>
      } />
      <Route path=":orderId" element={<PackingOrderDetails />} />
    </Routes>
  );
}

