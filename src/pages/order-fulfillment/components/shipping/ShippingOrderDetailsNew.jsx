import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import ShippingStepIndicator from "./ShippingStepIndicator";
import ShippingPhotoUploadStep from "./ShippingPhotoUploadStep";
import ShippingDetailsConfirmStep from "./ShippingDetailsConfirmStep";
import { getOrderDetails } from "../../../../api/shipping";

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

  // Get data from location state
  const scanData = location.state?.scanData;
  const trackingNumber = location.state?.trackingNumber || trackingFromUrl;
  const shippingRecordId = location.state?.shippingRecordId || scanData?.shippingRecordId;
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

  // Load order details in background
  useEffect(() => {
    if (shippingRecordId && !orderDetails && !isLoadingDetails) {
      loadOrderDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingRecordId]);

  const loadOrderDetails = async () => {
    setIsLoadingDetails(true);
    setDetailsError(null);
    
    try {
      console.log("📋 Loading order details in background for:", shippingRecordId);
      const result = await getOrderDetails(shippingRecordId);
      console.log("✅ Order details loaded:", result);
      
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
    if (photos.length > 0 || force) {
      setStage(STAGES.DETAILS);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
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

  // Check if we have required data
  if (!scanData || !trackingNumber) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Missing shipping data. Please scan a tracking number first.</p>
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

  const canComplete = photos.length >= 1;

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

