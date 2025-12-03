import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import ShippingStepIndicator from "./ShippingStepIndicator";
import ShippingPhotoUploadStep from "./ShippingPhotoUploadStep";
import ShippingDetailsConfirmStep from "./ShippingDetailsConfirmStep";
import { getOrderDetails, scanTracking } from "../../../../api/shipping";
import Swal from "sweetalert2";

const STAGES = {
  PHOTO_UPLOAD: "photo_upload",
  DETAILS: "details",
};

export default function ShippingOrderDetailsNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackingNumber: trackingFromUrl } = useParams();
  
  const [stage, setStage] = useState(STAGES.PHOTO_UPLOAD); 
  const [photos, setPhotos] = useState([]);
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Scan validation state (for background validation)
  const [scanData, setScanData] = useState(location.state?.scanData || null);
  const [shippingRecordId, setShippingRecordId] = useState(
    location.state?.shippingRecordId || location.state?.scanData?.shippingRecordId || null
  );
  const [scanStatus, setScanStatus] = useState(
    location.state?.scanData ? "success" : "idle" // idle | loading | success | error
  );
  const [scanError, setScanError] = useState(null);

  // Get data from location state
  const trackingNumber = location.state?.trackingNumber || trackingFromUrl;
  const autoOpenCamera = location.state?.autoOpenCamera || false;

  // Background scanTracking validation (runs when we have trackingNumber but no scanData)
  useEffect(() => {
    if (!trackingNumber) return;
    if (scanData) return; // Already have scanData, skip validation
    if (scanStatus === "loading" || scanStatus === "success") return; // Already processing or done

    const validateTracking = async () => {
      setScanStatus("loading");
      setScanError(null);

      try {
        const scanResult = await scanTracking(trackingNumber.trim());

        if (scanResult.success && scanResult.data) {
          const resultScanData = scanResult.data;

          // Check if already processed
          if (resultScanData.alreadyProcessed) {
            setScanStatus("error");
            setScanError("ALREADY_PROCESSED");

            // Show alert and redirect
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
                        <p class="text-gray-900 font-semibold">${resultScanData.trackingNumber || trackingNumber}</p>
                      </div>
                      <div>
                        <p class="text-gray-500 font-medium mb-1">Status:</p>
                        <p class="text-gray-900 font-semibold">${resultScanData.status || "Completed"}</p>
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

            if (alertResult.isConfirmed && resultScanData.shippingRecordId) {
              navigate("/fulfillment/shipping/list", {
                state: { shippingRecordId: resultScanData.shippingRecordId },
              });
            } else {
              navigate("/fulfillment/shipping");
            }
            return;
          }

          // Success - store scanData and shippingRecordId
          setScanData(resultScanData);
          setShippingRecordId(resultScanData.shippingRecordId);
          setScanStatus("success");
          
          // Immediately start loading order details (don't wait for effect)
          if (resultScanData.shippingRecordId) {
            // Use setTimeout to ensure state is updated before calling
            setTimeout(() => {
              loadOrderDetails(resultScanData.shippingRecordId);
            }, 0);
          }
        } else {
          throw new Error("Tracking number not found");
        }
      } catch (error) {
        console.error("❌ Background validation error:", error);
        setScanStatus("error");
        setScanError(error.message || "Failed to validate tracking number");

        // Show error alert and redirect
        await Swal.fire({
          icon: "error",
          title: "Tracking Not Found",
          text: error.message || "No fulfillment found with this tracking number. Please try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });

        // Redirect back to landing
        navigate("/fulfillment/shipping");
      }
    };

    validateTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingNumber]);

  useEffect(() => {
    if (shippingRecordId && !orderDetails && !isLoadingDetails && scanStatus === "success") {
      loadOrderDetails(shippingRecordId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingRecordId, scanStatus, orderDetails, isLoadingDetails]);

  useEffect(() => {
    if (
      scanStatus === "success" &&
      scanData &&
      photos.length > 0 &&
      stage === STAGES.PHOTO_UPLOAD
    ) {
      const timer = setTimeout(() => {
        if (stage === STAGES.PHOTO_UPLOAD) {
          setStage(STAGES.DETAILS);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, isLoadingDetails ? 200 : 600); // Shorter delay if already loading, longer if not started yet
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStatus, scanData, photos.length, stage, isLoadingDetails]);

  const loadOrderDetails = async (recordId = null) => {
    const idToUse = recordId || shippingRecordId;
    if (!idToUse) {
      console.warn("⚠️ Cannot load order details: no shippingRecordId available");
      return;
    }

    // Prevent duplicate calls
    if (isLoadingDetails) {
      console.log("⏸️ Order details already loading, skipping duplicate call");
      return;
    }

    setIsLoadingDetails(true);
    setDetailsError(null);
    
    try {
      console.log("📋 Loading order details for shippingRecordId:", idToUse);
      const result = await getOrderDetails(idToUse);
      
      if (result.success && result.data) {
        setOrderDetails(result.data);
      } else {
        throw new Error("Failed to load order details");
      }
    } catch (error) {
      console.error("❌ Error loading order details:", error);
      setDetailsError(error.message || "Failed to load order details");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handlePhotosChange = (updatedPhotos) => {
    setPhotos(updatedPhotos);
  };

  const handleContinueToDetails = (force = false) => {
    if ((photos.length > 0 || force) && scanStatus === "success" && scanData) {
      setStage(STAGES.DETAILS);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (scanStatus === "loading") {
      Swal.fire({
        icon: "info",
        title: "Validating Tracking",
        text: "Please wait while we validate the tracking number. We'll automatically proceed once validation completes.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
        timer: 2000,
        timerProgressBar: true,
      });
    }
  };

  const handleBackToPhotos = () => {
    setStage(STAGES.PHOTO_UPLOAD);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRetryDetails = () => {
    if (shippingRecordId) {
      loadOrderDetails(shippingRecordId);
    }
  };

  const handleShippingComplete = () => {
    navigate("/fulfillment/shipping");
  };

  const handleBackToLanding = () => {
    navigate("/fulfillment/shipping");
  };

  if (!trackingNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Missing tracking number. Please scan a tracking number first.</p>
          <button
            onClick={handleBackToLanding}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Back to Shipping
          </button>
        </div>
      </div>
    );
  }

  const canComplete = photos.length >= 1 && scanStatus === "success" && scanData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-[1200px] mx-auto p-4">
        <FulfillmentBreadcrumb />

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={handleBackToLanding}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Shipping</span>
          </button>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Shipping Process
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="font-medium text-gray-700">Tracking:</p>
                    <p className="font-mono font-semibold text-purple-600">{trackingNumber}</p>
                    {scanStatus === "loading" && (
                      <Loader2 className="w-4 h-4 text-purple-600 animate-spin ml-2" />
                    )}
                    {scanStatus === "success" && (
                      <span className="text-green-600 text-xs ml-2">✓ Validated</span>
                    )}
                  </div>
                  {scanData?.fulfillment?.carrierName && (
                    <>
                      <span className="hidden sm:inline text-gray-300">|</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Carrier:</span>
                        <span className="text-gray-900">{scanData.fulfillment.carrierName}</span>
                      </div>
                    </>
                  )}
                  {scanData?.orderSummary?.shipToName && (
                    <>
                      <span className="hidden sm:inline text-gray-300">|</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">Ship To:</span>
                        <span className="text-gray-900">{scanData.orderSummary.shipToName}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Step Indicator */}
        <ShippingStepIndicator stage={stage} />

        {/* Validation Loading Overlay - Fixed position to cover entire viewport */}
        {scanStatus === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md mx-4 text-center">
              <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Validating Tracking Number</h3>
              <p className="text-gray-600 mb-4">
                Tracking: <span className="font-mono font-semibold text-purple-600">{trackingNumber}</span>
              </p>
              <p className="text-sm text-gray-500">Please wait while we validate your tracking number...</p>
            </div>
          </motion.div>
        )}

        {/* Order Details Loading Overlay - Fixed position to cover entire viewport */}
        {isLoadingDetails && stage === STAGES.DETAILS && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md mx-4 text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Order Details</h3>
              <p className="text-gray-600 mb-4">
                Tracking: <span className="font-mono font-semibold text-blue-600">{trackingNumber}</span>
              </p>
              <p className="text-sm text-gray-500">Please wait while we fetch complete order information...</p>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {stage === STAGES.PHOTO_UPLOAD && (
            <ShippingPhotoUploadStep
              photos={photos}
              onPhotosChange={handlePhotosChange}
              onComplete={handleContinueToDetails}
              canComplete={canComplete}
              submitting={submitting}
              autoOpenCamera={autoOpenCamera}
            />
          )}

          {stage === STAGES.DETAILS && (
            <ShippingDetailsConfirmStep
              scanData={scanData}
              trackingNumber={trackingNumber}
              orderDetails={orderDetails}
              isLoadingDetails={isLoadingDetails}
              detailsError={detailsError}
              photos={photos}
              onBack={handleBackToPhotos}
              onComplete={handleShippingComplete}
              onRetryDetails={handleRetryDetails}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

