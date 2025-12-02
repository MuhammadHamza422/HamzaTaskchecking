import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, List, Loader2, Sparkles, ScanLine, Box } from "lucide-react";
import { motion } from "framer-motion";
import ScanInput from "../common/ScanInput";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import QuaggaBarcodeScanner from "../packing/QuaggaBarcodeScanner";
// import { searchPackingOrder } from "../../../../api/fulfillment"; // To be implemented
import Swal from "sweetalert2";

export default function ShippingLandingPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [showScanner, setShowScanner] = useState(true); // Auto-open scanner
  const [showManualSearch, setShowManualSearch] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handlePackingFound = async (packingId) => {
    if (!packingId || packingId.trim() === "") {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setShowScanner(false);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const searchResult = {
        success: true,
        data: {
          packingId: packingId.trim(),
          status: "READY_FOR_SHIPPING",
          orderId: "ORD-123",
        }
      };

      if (searchResult.success && searchResult.data) {
        navigate(`/fulfillment/shipping/${encodeURIComponent(searchResult.data.packingId)}`, {
          state: {
            packingId: searchResult.data.packingId,
            shippingData: searchResult.data,
            autoOpenCamera: true, // Auto-open camera for next step (shipping photos)
          },
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      setError(error.message || "Failed to find packing order");

      Swal.fire({
        icon: "error",
        title: "Packing Order Not Found",
        text: error.message || "No packing order found with the provided ID. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      }).then(() => {
        setShowScanner(true);
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScannerSuccess = async (barcode, searchData) => {
    handlePackingFound(barcode);
  };

  const handleManualSearchClick = () => {
    setShowScanner(false);
    setShowManualSearch(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setShowManualSearch(true);
  };

  if (showScanner && !showManualSearch) {
    return (
      <QuaggaBarcodeScanner
        onScanSuccess={handleScannerSuccess}
        onManualSearch={handleManualSearchClick}
        onClose={handleCloseScanner}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
              className="p-2 md:p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg md:rounded-2xl shadow-lg"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Truck className="w-8 h-8 text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                Shipping Operations
              </h1>
              <p className="text-gray-600 text-base">
                Scan a packing slip or packing ID to ship
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ScanLine className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Scan Packing Slip</h2>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <motion.button
                    onClick={() => {
                      setShowManualSearch(false);
                      setShowScanner(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ScanLine className="w-5 h-5" />
                    <span>Camera Scan</span>
                  </motion.button>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">OR</span>
                  </div>
                </div>
                <ScanInput
                  onScan={handlePackingFound}
                  onSearch={handlePackingFound}
                  placeholder="Scan or enter Packing ID"
                  hideCameraButton={true}
                />
              </div>

              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-purple-600">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <p className="text-sm font-medium">Searching for packing order...</p>
                  </div>
                </motion.div>
              )}

              {error && !isProcessing && (
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
              onClick={() => navigate("/fulfillment/shipping/list")}
              className="w-full p-4 md:p-6 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center gap-3 group"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <List className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>View All Shipments</span>
            </motion.button>

            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Shipping Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Scan the packing slip barcode to start</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Capture clear photo of the shipping label</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Verify weight and dimensions before confirming</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

