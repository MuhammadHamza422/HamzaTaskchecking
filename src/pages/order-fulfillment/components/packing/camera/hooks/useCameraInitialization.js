import { useEffect, useRef } from "react";
import { waitForCameraAvailable } from "../utils/cameraUtils";

// Hook to handle camera initialization and readiness checking
export const useCameraInitialization = (mode, webcamRef, setIsCameraReady, setCameraError) => {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const initializeCamera = async () => {
      if (mode !== "camera") return;

      console.log("CameraCapture: Starting camera initialization");
      
      // Wait for previous camera stream to be fully released
      try {
        await waitForCameraAvailable();
      } catch (availabilityError) {
        console.error("Camera not available after waiting:", availabilityError);
        
        if (!mountedRef.current) return;
        
        const errorDetails = availabilityError.message || "Unknown error";
        setCameraError(
          `Camera initialization failed: ${errorDetails}. ` +
          "This usually happens if the camera is still releasing from the previous session. " +
          "Please wait a moment and click Retry, or close and reopen the camera."
        );
        return;
      }

      if (!mountedRef.current) return;
      
      console.log("CameraCapture: Waiting for camera to be ready after initial delay");

      // Check if webcam is ready
      let checkCount = 0;
      const maxChecks = 60; // 6 seconds
      
      const checkReady = setInterval(() => {
        checkCount++;
        
        if (webcamRef.current?.video) {
          const video = webcamRef.current.video;
          
          // Check if video has valid dimensions (not blank)
          const hasValidDimensions = video.videoWidth > 0 && video.videoHeight > 0;
          const hasValidReadyState = video.readyState >= 2; // HAVE_CURRENT_DATA or higher
          const hasStream = video.srcObject && video.srcObject instanceof MediaStream;
          const hasActiveTracks = hasStream && video.srcObject.getTracks().length > 0 && 
                                 video.srcObject.getTracks().some(t => t.readyState === 'live');
          
          if (hasValidReadyState && hasValidDimensions && hasActiveTracks) {
            console.log("Camera ready - dimensions:", video.videoWidth, "x", video.videoHeight);
            setIsCameraReady(true);
            setCameraError(null);
            clearInterval(checkReady);
            return;
          }
          
          // If video element exists but no valid dimensions after 4 seconds, might be blank
          if (checkCount > 40 && !hasValidDimensions) {
            console.warn("Camera video element exists but has no valid dimensions after 4s");
          }
          
          // If video has no stream or inactive tracks after 4 seconds
          if (checkCount > 40 && (!hasStream || !hasActiveTracks)) {
            console.warn("Camera video has no active stream/tracks after 4s");
          }
        }
        
        // If we've checked too many times, show error with retry option
        if (checkCount >= maxChecks) {
          clearInterval(checkReady);
          if (mountedRef.current) {
            console.error("Camera failed to initialize after max checks");
            setCameraError("Camera is taking longer than expected to initialize. Please click Retry or close and reopen the camera.");
          }
        }
      }, 100);

      return () => {
        clearInterval(checkReady);
      };
    };

    initializeCamera();

    return () => {
      mountedRef.current = false;
    };
  }, [mode, webcamRef, setIsCameraReady, setCameraError]);
};

