import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, List, Loader2, Sparkles, ScanLine } from "lucide-react";
import { motion } from "framer-motion";
import ScanInput from "../common/ScanInput";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import ShippingBarcodeScanner from "./ShippingBarcodeScanner";
import { scanTracking } from "../../../../api/shipping";
import Swal from "sweetalert2";

export default function ShippingLandingPageNew() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [alreadyProcessedWarning, setAlreadyProcessedWarning] = useState(null);
  const [showScanner, setShowScanner] = useState(true); // Auto-open scanner
  const [showManualSearch, setShowManualSearch] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleTrackingFound = async (trackingNumber) => {
    if (!trackingNumber || trackingNumber.trim() === "") {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setShowScanner(false); // Close scanner when processing

    try {
      // Call scan-tracking API
      console.log("🔍 Calling scan-tracking API with:", trackingNumber.trim());
      const scanResult = await scanTracking(trackingNumber.trim());
      console.log("✅ Scan result:", scanResult);

      if (scanResult.success && scanResult.data) {
        const scanData = scanResult.data;
        
        // Check if already processed
        if (scanData.alreadyProcessed) {
          setIsProcessing(false);
          
          // Set warning message
          setAlreadyProcessedWarning({
            trackingNumber: scanData.trackingNumber,
            status: scanData.status || "Completed",
            shippingRecordId: scanData.shippingRecordId,
          });
          
          // Show SweetAlert popup
          const alertResult = await Swal.fire({
            icon: "warning",
            title: "Already Processed",
            html: `
              <div class="text-left">
                <p class="mb-4 text-gray-700">This tracking number has already been processed.</p>
                <div class="bg-gray-50 rounded-lg p-4 mb-4">
                  <div class="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p class="text-gray-500 font-medium mb-1">Tracking Number:</p>
                      <p class="text-gray-900 font-semibold">${scanData.trackingNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p class="text-gray-500 font-medium mb-1">Status:</p>
                      <p class="text-gray-900 font-semibold">${scanData.status || "Completed"}</p>
                    </div>
                  </div>
                </div>
              </div>
            `,
            showCancelButton: true,
            confirmButtonText: "View Details",
            cancelButtonText: "OK",
            confirmButtonColor: "#2563eb",
            cancelButtonColor: "#6b7280",
          });

          if (alertResult.isConfirmed && scanData.shippingRecordId) {
            // Navigate to shipping list to show details
            setAlreadyProcessedWarning(null);
            navigate("/fulfillment/shipping/list", {
              state: { shippingRecordId: scanData.shippingRecordId },
            });
          } else {
            // Reopen scanner after closing alert
            setShowScanner(true);
          }
          return;
        }
        
        // Clear warning if not processed
        setAlreadyProcessedWarning(null);
        
        // Navigate to shipping details page with scan data
        navigate(`/fulfillment/shipping/${encodeURIComponent(scanData.trackingNumber)}`, {
          state: {
            trackingNumber: scanData.trackingNumber,
            shippingRecordId: scanData.shippingRecordId,
            scanData: scanData, // Pass scan result
            autoOpenCamera: true, // Flag to auto-open camera
          },
        });
      }
    } catch (error) {
      console.error("Scan error:", error);
      setError(error.message || "Failed to validate tracking number");

      Swal.fire({
        icon: "error",
        title: "Tracking Not Found",
        text: error.message || "No fulfillment found with this tracking number. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      }).then(() => {
        // Reopen scanner after error
        setShowScanner(true);
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScannerSuccess = async (trackingNumber, scanData) => {
    // Scanner provides scan result
    // Navigate immediately with scan data
    navigate(`/fulfillment/shipping/${encodeURIComponent(scanData.trackingNumber)}`, {
      state: {
        trackingNumber: scanData.trackingNumber,
        shippingRecordId: scanData.shippingRecordId,
        scanData: scanData,
        autoOpenCamera: true, // Flag to auto-open camera
      },
    });
  };

  const handleManualSearchClick = () => {
    setShowScanner(false);
    setShowManualSearch(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setShowManualSearch(true);
  };

  // Show scanner by default, manual search only when requested
  if (showScanner && !showManualSearch) {
    return (
      <ShippingBarcodeScanner
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
                Scan or search for a tracking number to begin shipping
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
                <h2 className="text-xl font-semibold text-gray-900">Scan or Search Tracking Number</h2>
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
                  onScan={handleTrackingFound}
                  onSearch={handleTrackingFound}
                  placeholder="Scan or enter tracking number"
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
                    <p className="text-sm font-medium">Validating tracking number...</p>
                  </div>
                </motion.div>
              )}

              {alreadyProcessedWarning && !isProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-amber-100 rounded-lg flex-shrink-0">
                      <Truck className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900 mb-2">
                        ⚠️ This tracking number has already been processed
                      </p>
                      <div className="text-xs text-amber-800 space-y-1">
                        <p><span className="font-medium">Tracking:</span> {alreadyProcessedWarning.trackingNumber || "N/A"}</p>
                        <p><span className="font-medium">Status:</span> {alreadyProcessedWarning.status || "N/A"}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (alreadyProcessedWarning.shippingRecordId) {
                            setAlreadyProcessedWarning(null);
                            navigate("/fulfillment/shipping/list", {
                              state: { shippingRecordId: alreadyProcessedWarning.shippingRecordId },
                            });
                          }
                        }}
                        className="mt-3 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && !isProcessing && !alreadyProcessedWarning && (
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
                  <span>Scan the tracking barcode from shipping label</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Camera opens automatically to capture photos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Review details before completing shipment</span>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

