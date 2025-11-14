import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Package, List, Loader2, Sparkles, ScanLine } from "lucide-react";
import { motion } from "framer-motion";
import ScanInput from "../common/ScanInput";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import { searchOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

export default function PackingLandingPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [alreadyPackedWarning, setAlreadyPackedWarning] = useState(null);

  const handleOrderFound = async (orderNumber) => {
    if (!orderNumber || orderNumber.trim() === "") {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const result = await searchOrder(orderNumber.trim());

      if (result.success && result.data) {
        const { orderId, orderNumber, platform, orderKey, order_key, isAlreadyPacked, packingInfo } = result.data;
        
        // Check if order is already packed
        if (isAlreadyPacked && packingInfo) {
          setIsProcessing(false);
          
          // Set warning message to show under input
          setAlreadyPackedWarning({
            packingId: packingInfo.packingId,
            status: packingInfo.status,
            packedBy: packingInfo.packedBy,
            packedAt: packingInfo.packedAt,
          });
          
          // Show SweetAlert popup
          const result = await Swal.fire({
            icon: "warning",
            title: "Order Already Packed",
            html: `
              <div class="text-left">
                <p class="mb-4 text-gray-700">This order has already been packed and cannot be packed again.</p>
                <div class="bg-gray-50 rounded-lg p-4 mb-4">
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p class="text-gray-500 font-medium mb-1">Packing ID:</p>
                      <p class="text-gray-900 font-semibold">${packingInfo.packingId || "N/A"}</p>
                    </div>
                    <div>
                      <p class="text-gray-500 font-medium mb-1">Status:</p>
                      <p class="text-gray-900 font-semibold">${packingInfo.status || "N/A"}</p>
                    </div>
                    <div>
                      <p class="text-gray-500 font-medium mb-1">Packed By:</p>
                      <p class="text-gray-900 font-semibold">${packingInfo.packedBy || "N/A"}</p>
                    </div>
                    <div>
                      <p class="text-gray-500 font-medium mb-1">Packed At:</p>
                      <p class="text-gray-900 font-semibold">${packingInfo.packedAt ? new Date(packingInfo.packedAt).toLocaleString() : "N/A"}</p>
                    </div>
                  </div>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "View Packing Details",
            cancelButtonText: "OK",
            confirmButtonColor: "#2563eb",
            cancelButtonColor: "#6b7280",
          });

          if (result.isConfirmed && packingInfo.packingId) {
            // Navigate to packing list with packingId to show details
            setAlreadyPackedWarning(null);
            navigate("/fulfillment/packing/list", {
              state: { packingId: packingInfo.packingId },
            });
          }
          return;
        }
        
        // Clear warning if order is not packed
        setAlreadyPackedWarning(null);
        
        // Order is not packed, proceed to details page
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
            isAlreadyPacked: false,
            packingInfo: null,
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="max-w-[1550px] mx-auto p-4">
        <FulfillmentBreadcrumb />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className="p-2 md:p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg md:rounded-2xl shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Package className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Packing Operations
              </h1>
              <p className="text-gray-600 text-base">
                Scan or search for an order to begin packing
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ScanLine className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Scan or Search Order</h2>
              </div>

              <ScanInput
                onScan={handleOrderFound}
                onSearch={handleOrderFound}
                placeholder="Scan or enter order number / ShipStation packing slip barcode"
              />

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <p className="text-sm font-medium">Searching for order...</p>
                  </div>
                </motion.div>
              )}

              {alreadyPackedWarning && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-amber-100 rounded-lg flex-shrink-0">
                      <Package className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 mb-2">
                        ⚠️ This order has already been packed
                      </p>
                      <div className="text-xs text-amber-800 space-y-1">
                        <p><span className="font-medium">Packing ID:</span> {alreadyPackedWarning.packingId || "N/A"}</p>
                        <p><span className="font-medium">Status:</span> {alreadyPackedWarning.status || "N/A"}</p>
                        <p><span className="font-medium">Packed By:</span> {alreadyPackedWarning.packedBy || "N/A"}</p>
                        {alreadyPackedWarning.packedAt && (
                          <p><span className="font-medium">Packed At:</span> {new Date(alreadyPackedWarning.packedAt).toLocaleString()}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (alreadyPackedWarning.packingId) {
                            setAlreadyPackedWarning(null);
                            navigate("/fulfillment/packing/list", {
                              state: { packingId: alreadyPackedWarning.packingId },
                            });
                          }
                        }}
                        className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        View Packing Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && !isProcessing && !alreadyPackedWarning && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <p className="text-sm text-red-600 text-center">{error}</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <motion.button
              onClick={() => navigate("/fulfillment/packing/list")}
              className="w-full p-4 md:p-6 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <List className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>View All Packing Operations</span>
            </motion.button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Quick Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Use barcode scanner for faster processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Camera scan works on mobile devices</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Search by order number or barcode</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
