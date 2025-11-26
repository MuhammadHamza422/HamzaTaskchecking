// Camera utility functions

export const getVideoConstraints = (facingMode) => ({
  width: { ideal: 1280, min: 640 },
  height: { ideal: 720, min: 480 },
  facingMode: facingMode || "environment",
  focusMode: "continuous",
});

export const waitForCameraAvailable = async () => {
  console.log("Waiting for camera to become available...");
  
  const maxAttempts = 6;
  const delayBetweenAttempts = 200;
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Camera availability check attempt ${attempt}/${maxAttempts}`);
      
      // Check devices first
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error("No camera devices available");
      }
      
      console.log(`Found ${videoDevices.length} camera device(s)`);
      
      // Try to actually request camera access to verify it's available
      try {
        const testStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        
        // If we got here, camera is available! Release it immediately
        console.log("Camera is available! Releasing test stream...");
        testStream.getTracks().forEach(track => track.stop());
        
        console.log("Camera verified and ready for use");
        return; // Success!
        
      } catch (streamError) {
        console.warn(`Attempt ${attempt}: Cannot access camera yet:`, streamError.name);
        lastError = streamError;
        
        // If it's a NotReadableError or similar, camera is still in use
        if (streamError.name === "NotReadableError" || 
            streamError.name === "AbortError" ||
            streamError.name === "NotAllowedError") {
          // Wait longer and retry
          if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
            continue;
          }
        } else {
          // Other errors might not be recoverable
          throw streamError;
        }
      }
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      lastError = error;
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
      }
    }
  }
  
  // If we get here, all attempts failed
  console.error("Failed to verify camera availability after all attempts");
  const errorMsg = lastError?.name === "NotReadableError" 
    ? "Camera is still in use. Please wait a moment and try again."
    : `Camera not available: ${lastError?.message || lastError?.name || 'Unknown error'}`;
  throw new Error(errorMsg);
};

export const stopWebcamStream = (webcamRef, setIsCameraReady) => {
  if (webcamRef.current) {
    // Try multiple ways to access the stream
    const videoElement = webcamRef.current.video;
    if (videoElement) {
      const stream = videoElement.srcObject;
      if (stream && stream instanceof MediaStream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => {
          track.stop();
        });
        videoElement.srcObject = null;
      }
    }
    // Also try to access stream directly from webcamRef if available
    if (webcamRef.current.stream) {
      const tracks = webcamRef.current.stream.getTracks();
      tracks.forEach((track) => {
        track.stop();
      });
    }
  }
  if (setIsCameraReady) {
    setIsCameraReady(false);
  }
};

export const getCameraErrorMessage = (error) => {
  if (error.name === "NotAllowedError") {
    return "Camera permission denied. Please allow camera access in your browser settings.";
  } else if (error.name === "NotFoundError") {
    return "No camera found on this device.";
  } else if (error.name === "NotReadableError") {
    return "Camera is temporarily unavailable. The previous camera session is still closing. Please wait 2-3 seconds and click Retry.";
  } else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
    return "Camera constraints not supported. Please try switching cameras or wait a moment and retry.";
  } else if (error.name === "AbortError") {
    return "Camera access was interrupted. Please wait 2-3 seconds and click Retry.";
  } else {
    return `Camera error: ${error.message || error.name}. Please wait a moment and click Retry.`;
  }
};

