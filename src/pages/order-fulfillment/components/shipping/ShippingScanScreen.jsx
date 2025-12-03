import { useState, useRef, useEffect } from "react";
import { Camera, Search, Package, Loader2 } from "lucide-react";
import { scanTracking } from "../../../../api/shipping";
import ShippingBarcodeScanner from "./ShippingBarcodeScanner";
import Swal from "sweetalert2";

export default function ShippingScanScreen({ onScanSuccess }) {
  const [trackingInput, setTrackingInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(true); // Auto-open scanner by default
  const [isValidating, setIsValidating] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    // Only focus input if scanner is not showing
    if (!showBarcodeScanner) {
      inputRef.current?.focus();
    }
  }, [showBarcodeScanner]);

  const handleScan = async () => {
    if (!trackingInput.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Tracking Number Required",
        text: "Please enter a tracking number to continue.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    setIsValidating(true);
    const trackingNumber = trackingInput.trim();

    try {
      console.log("🔍 Calling scan-tracking API with:", trackingNumber);
      const result = await scanTracking(trackingNumber);
      console.log("✅ Scan result:", result);

      if (result.success && result.data) {
        const scanData = result.data;

        if (scanData.alreadyProcessed) {
          Swal.fire({
            icon: "warning",
            title: "Already Processed",
            text: "This tracking number has already been processed.",
            confirmButtonColor: "#2563eb",
            confirmButtonText: "OK",
          });
          setTrackingInput("");
          setIsValidating(false);
          return;
        }

        // Immediately move to camera after successful scan
        if (onScanSuccess) {
          onScanSuccess(trackingNumber, scanData);
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Tracking Not Found",
          text: "Tracking number not found. Please check and try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
        setTrackingInput("");
      }
    } catch (error) {
      console.error("❌ Error scanning tracking:", error);
      console.error("Error details:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
      });
      
      if (error.code === "FULFILLMENT_NOT_FOUND") {
        Swal.fire({
          icon: "error",
          title: "Tracking Not Found",
          text: "Tracking number not found in ShipStation. Please verify and try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
      } else if (error.code === "ALREADY_PROCESSED") {
        Swal.fire({
          icon: "warning",
          title: "Already Processed",
          text: "This tracking has already been processed.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Validation Failed",
          text: error.message || "Failed to validate tracking number. Please try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
      }
      
      setTrackingInput("");
    } finally {
      setIsValidating(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleScan();
    }
  };

  const handleBarcodeScanSuccess = (trackingNumber) => {
    // Scanner now only provides tracking number (detection-only)
    // For backward compatibility with ShippingProcessFlow, we still call onScanSuccess
    // but ShippingProcessFlow will need to handle validation itself
    setShowBarcodeScanner(false);
    if (onScanSuccess) {
      // Pass trackingNumber only - parent component should handle validation
      onScanSuccess(trackingNumber, null);
    }
  };

  const handleManualSearch = () => {
    setShowBarcodeScanner(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Shipping Operations
            </h1>
            <p className="text-gray-600">
              Scan tracking barcode or enter manually to begin
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-6">
            {/* Scan Input */}
            <div className="mb-6">
              <label
                htmlFor="tracking-input"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tracking Number
              </label>
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  id="tracking-input"
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter or scan tracking number..."
                  disabled={isValidating}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-lg"
                  autoFocus
                />
                <button
                  onClick={handleScan}
                  disabled={isValidating || !trackingInput.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="hidden sm:inline">Validating...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span className="hidden sm:inline">Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* Barcode Scanner Button */}
            <button
              onClick={() => setShowBarcodeScanner(true)}
              disabled={isValidating}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              <Camera className="w-6 h-6" />
              <span className="text-lg">Open Barcode Scanner</span>
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              Instructions
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Scan the tracking barcode from the shipping label</li>
              <li>• System validates tracking number with ShipStation</li>
              <li>• Camera opens automatically to capture package photos</li>
              <li>• Review details and complete the shipping record</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <ShippingBarcodeScanner
          onScanSuccess={handleBarcodeScanSuccess}
          onManualSearch={handleManualSearch}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </>
  );
}
