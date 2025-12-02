import { useState } from "react";
import { Package, List, Plus } from "lucide-react";
import ShippingProcessFlow from "./ShippingProcessFlow";
import ShippingRecordsTable from "./ShippingRecordsTable";

export default function ShippingOperationsMain() {
  const [activeView, setActiveView] = useState("list"); // "list" | "process"

  return (
    <div className="min-h-screen bg-gray-50">
      {activeView === "list" ? (
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Package className="w-7 h-7" />
                  Shipping Operations
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage and track all shipping operations
                </p>
              </div>
              <button
                onClick={() => setActiveView("process")}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
              >
                <Plus className="w-5 h-5" />
                New Shipping
              </button>
            </div>

            {/* Records Table */}
            <ShippingRecordsTable />
          </div>
        </div>
      ) : (
        <ShippingProcessFlow />
      )}

      {/* Floating Action Button (when in process view) */}
      {activeView === "process" && (
        <button
          onClick={() => setActiveView("list")}
          className="fixed bottom-6 right-6 p-4 bg-gray-800 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors z-40"
          title="View All Records"
        >
          <List className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}

