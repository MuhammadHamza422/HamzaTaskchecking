import { useState, useEffect } from "react";
import ShippingScanScreen from "./ShippingScanScreen";
import ShippingCameraScreen from "./ShippingCameraScreen";
import ShippingCompleteStep from "./ShippingCompleteStep";
import { getOrderDetails } from "../../../../api/shipping";

export default function ShippingProcessFlow() {
  const [currentStep, setCurrentStep] = useState("scan"); // "scan" | "camera" | "complete"
  const [scanData, setScanData] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [photoFiles, setPhotoFiles] = useState([]); // Store File objects (not URLs)
  
  // Order details state (fetched in background after scan)
  const [orderDetails, setOrderDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const handleScanSuccess = (tracking, data) => {
    setTrackingNumber(tracking);
    setScanData(data);
    
    // Reset order details state
    setOrderDetails(null);
    setDetailsError(null);
    
    // Step 2: Camera opens immediately after validation
    setCurrentStep("camera");
    
    // Step 3: Start loading order details in background
    if (data?.shippingRecordId) {
      loadOrderDetails(data.shippingRecordId);
    }
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
    setCurrentStep("scan");
    setScanData(null);
    setTrackingNumber("");
    setPhotoFiles([]);
    setOrderDetails(null);
    setDetailsError(null);
    setIsLoadingDetails(false);
  };

  const handleCancel = () => {
    // Return to scan screen
    setCurrentStep("scan");
    setScanData(null);
    setTrackingNumber("");
    setPhotoFiles([]);
    setOrderDetails(null);
    setDetailsError(null);
    setIsLoadingDetails(false);
  };

  return (
    <>
      {currentStep === "scan" && (
        <ShippingScanScreen onScanSuccess={handleScanSuccess} />
      )}

      {currentStep === "camera" && scanData && (
        <ShippingCameraScreen
          scanData={scanData}
          trackingNumber={trackingNumber}
          orderDetails={orderDetails}
          isLoadingDetails={isLoadingDetails}
          detailsError={detailsError}
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

