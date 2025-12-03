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
  
  const [stage, setStage] = useState(STAGES.PHOTO_UPLOAD); // Start with photo upload
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

  // Get storage key
  const getStorageKey = () => {
    if (!trackingNumber) return null;
    return `shipping_${trackingNumber}`;
  };

  // Convert File to base64 for storage
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Convert base64 back to File
  const base64ToFile = (base64, filename) => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Load persisted data from localStorage on mount
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return;

    const loadPersistedData = async () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          
          // Restore photos
          if (parsed.photos && parsed.photos.length > 0) {
            const restoredPhotos = await Promise.all(
              parsed.photos.map(async (photoData) => {
                const file = base64ToFile(photoData.base64, photoData.filename);
                return {
                  id: photoData.id,
                  file: file,
                  preview: photoData.base64,
                };
              })
            );
            setPhotos(restoredPhotos);
          }
          
          // Restore stage
          if (parsed.stage) {
            setStage(parsed.stage);
          }
        }
      } catch (error) {
        console.error("Error loading persisted data:", error);
      }
    };

    loadPersistedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist data to localStorage whenever it changes
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return;

    const persistData = async () => {
      try {
        const photosData = await Promise.all(
          photos.map(async (photo) => ({
            id: photo.id,
            base64: photo.preview,
            filename: photo.file.name,
          }))
        );

        const dataToSave = {
          photos: photosData,
          stage: stage,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } catch (error) {
        console.error("Error persisting data:", error);
      }
    };

    persistData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, stage]);

  // Background scanTracking validation (runs when we have trackingNumber but no scanData)
  useEffect(() => {
    if (!trackingNumber) return;
    if (scanData) return; // Already have scanData, skip validation
    if (scanStatus === "loading" || scanStatus === "success") return; // Already processing or done

    const validateTracking = async () => {
      setScanStatus("loading");
      setScanError(null);

      try {
        console.log("🔍 Background validation: Calling scan-tracking API with:", trackingNumber);
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

            // Clear persisted data
            const storageKey = getStorageKey();
            if (storageKey) {
              localStorage.removeItem(storageKey);
            }

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
          console.log("✅ Background validation successful:", resultScanData);
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

        // Clear persisted data
        const storageKey = getStorageKey();
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }

        // Redirect back to landing
        navigate("/fulfillment/shipping");
      }
    };

    validateTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingNumber]);

  // Load order details in background (after scanData is available)
  useEffect(() => {
    if (shippingRecordId && !orderDetails && !isLoadingDetails && scanStatus === "success") {
      loadOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingRecordId, scanStatus]);

  // Auto-advance to details step when validation completes and user has photos
  useEffect(() => {
    if (
      scanStatus === "success" &&
      scanData &&
      photos.length > 0 &&
      stage === STAGES.PHOTO_UPLOAD
    ) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setStage(STAGES.DETAILS);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 300);
      
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanStatus, scanData, photos.length, stage]);

  const loadOrderDetails = async () => {
    setIsLoadingDetails(true);
    setDetailsError(null);
    
    try {
      const result = await getOrderDetails(shippingRecordId);
      
      if (result.success && result.data) {
        setOrderDetails(result.data);
      } else {
        throw new Error("Failed to load order details");
      }
    } catch (error) {
      console.error("❌ Error loading order details:", error);
      setDetailsError(error.message || "Failed to load order details");
      // Don't show error - details are optional
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handlePhotosChange = (updatedPhotos) => {
    setPhotos(updatedPhotos);
  };

  const handleContinueToDetails = (force = false) => {
    // Gate progression: need photos AND successful validation
    if ((photos.length > 0 || force) && scanStatus === "success" && scanData) {
      setStage(STAGES.DETAILS);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (scanStatus === "loading") {
      // Show brief message if validation is still in progress
      // Auto-advance will happen when validation completes
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

  const handleShippingComplete = () => {
    // Clear persisted data
    const storageKey = getStorageKey();
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    
    // Navigate back to landing page
    navigate("/fulfillment/shipping");
  };

  const handleBackToLanding = () => {
    navigate("/fulfillment/shipping");
  };

  // Check if we have tracking number (required)
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

  // Can proceed to details only if: have photos AND validation is successful
  // Note: We allow photo upload even while validation is in progress (non-blocking)
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
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700">Tracking:</span>
                    <span className="font-mono font-semibold text-purple-600">{trackingNumber}</span>
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

        {/* Non-blocking Validation Status Banner */}
        {scanStatus === "loading" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3"
          >
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Validating tracking number...</p>
              <p className="text-xs text-blue-700 mt-0.5">You can start taking photos while we validate.</p>
            </div>
          </motion.div>
        )}
        
        {scanStatus === "success" && scanData && stage === STAGES.PHOTO_UPLOAD && photos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900">Tracking validated successfully!</p>
              <p className="text-xs text-green-700 mt-0.5">Moving to details step...</p>
            </div>
          </motion.div>
        )}

        {/* Step Indicator */}
        <ShippingStepIndicator stage={stage} />

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
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

