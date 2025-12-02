import { useState, useEffect } from "react";
import ShippingScanScreen from "./ShippingScanScreen";
import ShippingCameraScreen from "./ShippingCameraScreen";
import ShippingCompleteStep from "./ShippingCompleteStep";
import { getOrderDetails, scanTracking } from "../../../../api/shipping";
import Swal from "sweetalert2";

export default function ShippingProcessFlow() {
  const [currentStep, setCurrentStep] = useState("scan"); // "scan" | "camera" | "complete"
  const [scanData, setScanData] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]); // Store File objects (not URLs)
  
  // Order details state (fetched in background after scan)
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Background validation state for scanTracking
  const [isValidatingTracking, setIsValidatingTracking] = useState(false);
  const [trackingError, setTrackingError] = useState(null);

  const resetFlowState = () => {
    setCurrentStep("scan");
    setScanData(null);
    setTrackingNumber("");
    setPhotoFiles([]);
    setOrderDetails(null);
    setDetailsError(null);
    setIsLoadingDetails(false);
    setIsValidatingTracking(false);
    setTrackingError(null);
  };

  const validateTrackingInBackground = async (tracking) => {
    setIsValidatingTracking(true);
    setTrackingError(null);

    try {
      console.log("🔍 Validating tracking in background for:", tracking);
      const result = await scanTracking(tracking);
      console.log("✅ Background scan result:", result);

      if (!result.success || !result.data) {
        throw new Error("Tracking number not found");
      }

      const backgroundScanData = result.data;

      if (backgroundScanData.alreadyProcessed) {
        // Don't interrupt the camera flow – just surface the message
        const alreadyMsg =
          `This tracking number has already been processed.` +
          (backgroundScanData.status
            ? ` Status: ${backgroundScanData.status}.`
            : "");
        setTrackingError(alreadyMsg);
      } else {
        setScanData(backgroundScanData);

        // Start loading order details in background (same pattern as before)
        if (backgroundScanData.shippingRecordId) {
          loadOrderDetails(backgroundScanData.shippingRecordId);
        }
      }
    } catch (error) {
      console.error("❌ Error validating tracking in background:", error);
      const message =
        error.message ||
        "Failed to validate tracking number. Please try again.";

      setTrackingError(message);
    } finally {
      setIsValidatingTracking(false);
    }
  };

  const handleScanSuccess = (tracking) => {
    // Store the tracking number and immediately move to camera
    setTrackingNumber(tracking);
    setScanData(null);

    // Reset order details and validation errors
    setOrderDetails(null);
    setDetailsError(null);
    setTrackingError(null);

    // Step 2: Camera opens immediately after barcode read
    setCurrentStep("camera");

    // Step 3: Start validating tracking and loading details in background
    validateTrackingInBackground(tracking);
  };

  const loadOrderDetails = async (shippingRecordId) => {
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
      // Don't show error toast - details are optional, don't interrupt UX
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handlePhotosSaved = (photos) => {
    // Step 3: Photos saved (File objects), auto-move to completion step
    // Backend will handle S3 upload when completing (same as packing)
    setPhotoFiles(photos); // Store File objects
    setCurrentStep("complete");
  };

  const handleShippingCompleted = () => {
    // Step 5: Loop back to scan screen for next package
    resetFlowState();
  };

  const handleCancel = () => {
    // Return to scan screen
    resetFlowState();
  };

  return (
    <>
      {currentStep === "scan" && (
        <ShippingScanScreen onScanSuccess={handleScanSuccess} />
      )}

      {currentStep === "camera" && trackingNumber && (
        <ShippingCameraScreen
          scanData={scanData}
          trackingNumber={trackingNumber}
          orderDetails={orderDetails}
          isLoadingDetails={isLoadingDetails}
          detailsError={detailsError}
          isValidatingTracking={isValidatingTracking}
          trackingError={trackingError}
          onPhotosUploaded={handlePhotosSaved}
          onCancel={handleCancel}
        />
      )}

      {currentStep === "complete" && scanData && (
        <ShippingCompleteStep
          scanData={scanData}
          trackingNumber={trackingNumber}
          photoFiles={photoFiles}
          orderDetails={orderDetails}
          isLoadingDetails={isLoadingDetails}
          detailsError={detailsError}
          onComplete={handleShippingCompleted}
          onCancel={handleCancel}
        />
      )}
    </>
  );
}

