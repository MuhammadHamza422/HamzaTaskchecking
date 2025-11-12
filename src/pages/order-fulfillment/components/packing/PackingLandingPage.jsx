import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, List, Loader2 } from "lucide-react";
import ScanInput from "../common/ScanInput";
import { searchOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

export default function PackingLandingPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleOrderFound = async (orderNumber) => {
    if (!orderNumber || orderNumber.trim() === "") {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await searchOrder(orderNumber.trim());

      if (result.success && result.data) {
        const { orderId, orderNumber, platform, orderKey, order_key } = result.data;
        
        let urlIdentifier;
        if (platform === "shopify") {
          urlIdentifier = orderNumber || orderKey || order_key || orderId;
        } else {
          urlIdentifier = orderId || orderNumber;
        }
        
        navigate(`/fulfillment/packing/${encodeURIComponent(urlIdentifier)}`, {
          state: {
            orderId,
            platform,
            orderKey: orderNumber || orderKey || order_key,
            searchData: result.data,
          },
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      setError(error.message || "Failed to find order");

      Swal.fire({
        icon: "error",
        title: "Order Not Found",
        text: error.message || "No order found with the provided query. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <Package className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Packing Operations</h1>
          <p className="text-gray-600">Scan or search for an order to begin packing</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <ScanInput
            onScan={handleOrderFound}
            onSearch={handleOrderFound}
            placeholder="Scan or enter order number / ShipStation packing slip barcode"
          />
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate("/fulfillment/packing/list")}
            className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <List className="w-5 h-5" />
            <span>View All Packing Operations</span>
          </button>
        </div>

        {isProcessing && (
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="text-sm font-medium">Searching for order...</p>
            </div>
          </div>
        )}

        {error && !isProcessing && (
          <div className="mt-4 text-center">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

