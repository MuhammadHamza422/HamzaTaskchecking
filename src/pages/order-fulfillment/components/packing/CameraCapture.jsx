import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Webcam from "react-webcam";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, RotateCcw, Check, RotateCw, Plus, Save } from "lucide-react";

// More flexible video constraints for better mobile compatibility
const getVideoConstraints = (facingMode) => ({
  width: { ideal: 1280, min: 640 },
  height: { ideal: 720, min: 480 },
  facingMode: facingMode || "environment",
  // Add focus mode for better image quality
  focusMode: "continuous",
});

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (imageSrc, crop, rotation = 0, displayedWidth = 0, displayedHeight = 0) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!crop || !image) {
    return imageSrc;
  }

  // Use provided displayed dimensions, or fall back to natural dimensions
  const displayWidth = displayedWidth > 0 ? displayedWidth : image.width;
  const displayHeight = displayedHeight > 0 ? displayedHeight : image.height;

  // Calculate scale factors between displayed size and natural size
  const scaleX = image.naturalWidth / displayWidth;
  const scaleY = image.naturalHeight / displayHeight;

  // Convert crop coordinates from percentage/pixels to natural image pixels
  let cropX, cropY, cropWidth, cropHeight;

  if (crop.unit === "%") {
    // Crop is in percentage - convert to pixels based on displayed size, then scale to natural
    cropX = (crop.x / 100) * displayWidth * scaleX;
    cropY = (crop.y / 100) * displayHeight * scaleY;
    cropWidth = (crop.width / 100) * displayWidth * scaleX;
    cropHeight = (crop.height / 100) * displayHeight * scaleY;
  } else {
    // Crop is in pixels - scale directly to natural size
    cropX = crop.x * scaleX;
    cropY = crop.y * scaleY;
    cropWidth = crop.width * scaleX;
    cropHeight = crop.height * scaleY;
  }

  // Ensure crop coordinates are within image bounds
  cropX = Math.max(0, Math.min(cropX, image.naturalWidth));
  cropY = Math.max(0, Math.min(cropY, image.naturalHeight));
  cropWidth = Math.min(cropWidth, image.naturalWidth - cropX);
  cropHeight = Math.min(cropHeight, image.naturalHeight - cropY);

  // Set canvas size to the cropped dimensions
  canvas.width = cropWidth;
  canvas.height = cropHeight;

  ctx.imageSmoothingQuality = "high";

  // Draw only the cropped portion of the image
  // This directly extracts the selected region from the source image
  ctx.drawImage(
    image,
    cropX,           // Source X (where to start cropping from original image)
    cropY,           // Source Y
    cropWidth,       // Source width (how much to crop)
    cropHeight,      // Source height
    0,               // Destination X (where to place on canvas)
    0,               // Destination Y
    cropWidth,       // Destination width
    cropHeight       // Destination height
  );

  // Handle rotation AFTER cropping (rotate the cropped result)
  if (rotation !== 0) {
    const rotateRads = (rotation * Math.PI) / 180;
    
    // Calculate the bounding box needed for rotation
    const rotatedWidth = Math.abs(cropWidth * Math.cos(rotateRads)) + Math.abs(cropHeight * Math.sin(rotateRads));
    const rotatedHeight = Math.abs(cropWidth * Math.sin(rotateRads)) + Math.abs(cropHeight * Math.cos(rotateRads));

    // Create a new canvas for the rotated result
    const rotatedCanvas = document.createElement("canvas");
    rotatedCanvas.width = rotatedWidth;
    rotatedCanvas.height = rotatedHeight;
    const rotatedCtx = rotatedCanvas.getContext("2d");
    rotatedCtx.imageSmoothingQuality = "high";

    // Draw the cropped image onto the rotated canvas with rotation
    rotatedCtx.save();
    rotatedCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
    rotatedCtx.rotate(rotateRads);
    rotatedCtx.drawImage(canvas, -cropWidth / 2, -cropHeight / 2);
    rotatedCtx.restore();

    // Return the rotated canvas blob
    return new Promise((resolve) => {
      rotatedCanvas.toBlob((blob) => {
        if (!blob) {
          resolve(imageSrc);
          return;
        }
        const fileUrl = URL.createObjectURL(blob);
        resolve(fileUrl);
      }, "image/jpeg", 0.9);
    });
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(imageSrc);
        return;
      }
      const fileUrl = URL.createObjectURL(blob);
      resolve(fileUrl);
    }, "image/jpeg", 0.9);
  });
};

export default function CameraCapture({ onCapture, onClose, onAddPhoto, maxPhotos, currentCount, pendingPhotos = [], onSaveAllComplete }) {
  const [mode, setMode] = useState("camera"); // "camera" | "edit" | "review"
  // Initialize with pending photos from parent to persist across camera opens
  const [capturedPhotos, setCapturedPhotos] = useState(pendingPhotos);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(-1);
  const [currentImage, setCurrentImage] = useState(null);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const webcamRef = useRef(null);
  const imgRef = useRef(null);

  // Lock body scroll and ensure full screen coverage when camera is open
  useEffect(() => {
    // Store original styles
    const originalBodyStyle = {
      overflow: document.body.style.overflow,
      padding: document.body.style.padding,
      paddingRight: document.body.style.paddingRight,
      margin: document.body.style.margin,
    };
    const originalHtmlStyle = {
      overflow: document.documentElement.style.overflow,
      padding: document.documentElement.style.padding,
      margin: document.documentElement.style.margin,
    };

    // Remove all margins and padding from body and html
    document.body.style.overflow = "hidden";
    document.body.style.padding = "0";
    document.body.style.paddingRight = "0";
    document.body.style.margin = "0";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.padding = "0";
    document.documentElement.style.margin = "0";

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = originalBodyStyle.overflow;
      document.body.style.padding = originalBodyStyle.padding;
      document.body.style.paddingRight = originalBodyStyle.paddingRight;
      document.body.style.margin = originalBodyStyle.margin;
      document.documentElement.style.overflow = originalHtmlStyle.overflow;
      document.documentElement.style.padding = originalHtmlStyle.padding;
      document.documentElement.style.margin = originalHtmlStyle.margin;
    };
  }, []);
  const [facingMode, setFacingMode] = useState("environment");
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Wait for camera to be available (after Quagga scanner releases it)
  const waitForCameraAvailable = useCallback(async () => {
    // Wait a bit longer to ensure previous camera stream is fully released
    // This is critical when coming from Quagga scanner
    await new Promise(resolve => setTimeout(resolve, 800));
  }, []);

  // Helper function to stop webcam stream
  const stopWebcamStream = useCallback(() => {
    if (webcamRef.current) {
      // Try multiple ways to access the stream
      const videoElement = webcamRef.current.video;
      if (videoElement) {
        const stream = videoElement.srcObject;
        if (stream && stream instanceof MediaStream) {
          const tracks = stream.getTracks();
          tracks.forEach((track) => {
            track.stop();
            // console.log("Stopped webcam track:", track.kind, track.label);
          });
          // Clear the srcObject
          videoElement.srcObject = null;
        }
      }
      // Also try to access stream directly from webcamRef if available
      if (webcamRef.current.stream) {
        const tracks = webcamRef.current.stream.getTracks();
        tracks.forEach((track) => {
          track.stop();
          // console.log("Stopped webcam track (direct):", track.kind, track.label);
        });
      }
    }
    setIsCameraReady(false);
  }, []);

  // Wait for camera to be available and initialize when component mounts
  useEffect(() => {
    let mounted = true;

    const initializeCamera = async () => {
      if (mode !== "camera") return;

      // Wait for previous camera stream to be fully released
      // This is critical when coming from Quagga scanner
      await waitForCameraAvailable();

      if (!mounted) return;

      // Check if webcam is ready (react-webcam handles permission request)
      // We just wait for it to initialize
      const checkReady = setInterval(() => {
        if (webcamRef.current?.video) {
          const video = webcamRef.current.video;
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA or higher
            setIsCameraReady(true);
            setCameraError(null);
            clearInterval(checkReady);
          }
        }
      }, 100);

      // Clear interval after 5 seconds if camera doesn't initialize
      setTimeout(() => {
        clearInterval(checkReady);
      }, 5000);

      return () => {
        clearInterval(checkReady);
      };
    };

    initializeCamera();

    return () => {
      mounted = false;
    };
  }, [mode, waitForCameraAvailable]);

  // Cleanup: Stop webcam stream when component unmounts
  useEffect(() => {
    return () => {
      stopWebcamStream();
    };
  }, [stopWebcamStream]);


  const handleClose = useCallback(() => {
    stopWebcamStream();
    if (onClose) {
      onClose();
    }
  }, [stopWebcamStream, onClose]);

  const capture = useCallback(() => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      // Revoke any previous image URL to prevent memory leaks and ensure fresh state
      if (currentImage && currentImage.startsWith('blob:')) {
        URL.revokeObjectURL(currentImage);
      }
      if (croppedImageUrl && croppedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(croppedImageUrl);
      }
      
      // Set new image and reset ALL crop state for fresh photo
      setCurrentImage(imageSrc);
      setCroppedImageUrl(null); // Reset cropped image URL for new photo
      setCrop({
        unit: "%",
        width: 90,
        aspect: undefined,
        x: 5,
        y: 5,
      });
      setCompletedCrop(null); // Reset completed crop
      setRotation(0);
      setMode("edit");
    }
  }, [currentImage, croppedImageUrl]);

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget;
    const aspect = width / height;
    setCrop({
      unit: "%",
      width: 90,
      aspect: aspect,
      x: 5,
      y: 5,
    });
  }, []);

  const applyCropAndRotation = useCallback(async () => {
    if (!currentImage || !completedCrop) {
      setCroppedImageUrl(currentImage);
      return;
    }

    try {
      // Get the actual displayed image dimensions from the ref
      const displayedWidth = imgRef.current?.width || 0;
      const displayedHeight = imgRef.current?.height || 0;
      
      const cropped = await getCroppedImg(currentImage, completedCrop, rotation, displayedWidth, displayedHeight);
      setCroppedImageUrl(cropped);
    } catch (error) {
      console.error("Error cropping image:", error);
      setCroppedImageUrl(currentImage);
    }
  }, [currentImage, completedCrop, rotation]);

  useEffect(() => {
    if (mode === "edit" && currentImage) {
      // Reset croppedImageUrl when a new image is loaded to ensure fresh crop
      setCroppedImageUrl(null);
      applyCropAndRotation();
    }
  }, [mode, currentImage, completedCrop, rotation, applyCropAndRotation]);

  const convertToFile = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      // Use a unique timestamp to ensure each file is different
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      return new File([blob], `camera-${timestamp}-${random}.jpg`, {
        type: "image/jpeg",
      });
    } catch (error) {
      console.error("Error converting image:", error);
      throw error;
    }
  };

  const addPhoto = async () => {
    if (croppedImageUrl) {
      try {
        // Convert the cropped image to a file BEFORE resetting state
        const file = await convertToFile(croppedImageUrl);
        
        // Revoke the old blob URL to free memory
        if (croppedImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(croppedImageUrl);
        }
        
        // Create a new preview URL from the file
        const previewUrl = URL.createObjectURL(file);
        const newPhotos = [...capturedPhotos, { file, preview: previewUrl }];
        setCapturedPhotos(newPhotos);
        
        // Notify parent component about the new photo
        if (onAddPhoto) {
          onAddPhoto(file);
        }
        
        // Reset all state AFTER converting to file
        setCurrentImage(null);
        setCroppedImageUrl(null);
        setCrop(null);
        setCompletedCrop(null);
        setRotation(0);
        setMode("camera");
      } catch (error) {
        console.error("Error adding photo:", error);
      }
    }
  };

  const saveSinglePhoto = async () => {
    if (croppedImageUrl) {
      try {
        const file = await convertToFile(croppedImageUrl);
        // If there are already photos in the array, add this one too
        if (capturedPhotos.length > 0) {
          const previewUrl = URL.createObjectURL(file);
          const allPhotos = [...capturedPhotos, { file, preview: previewUrl }];
          allPhotos.forEach((photo) => {
            onCapture(photo.file);
          });
        } else {
          onCapture(file);
        }
        handleClose();
      } catch (error) {
        console.error("Error saving photo:", error);
      }
    }
  };

  const retakeCurrent = () => {
    // Revoke blob URL if it exists
    if (croppedImageUrl && croppedImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(croppedImageUrl);
    }
    if (currentImage && currentImage.startsWith('blob:')) {
      URL.revokeObjectURL(currentImage);
    }
    setCurrentImage(null);
    setCroppedImageUrl(null);
    setCrop(null);
    setCompletedCrop(null);
    setRotation(0);
    setMode("camera");
  };

  const removePhoto = (index) => {
    const newPhotos = capturedPhotos.filter((_, i) => i !== index);
    setCapturedPhotos(newPhotos);
  };

  const saveAllPhotos = async () => {
    const photosToSave = [];
    
    // First, add all photos from the capturedPhotos array (already converted to files)
    capturedPhotos.forEach((photo) => {
      photosToSave.push(photo.file);
    });
    
    // If there's a current photo in edit mode that hasn't been added yet, convert and add it
    // Use croppedImageUrl if available (after crop/rotation), otherwise fall back to currentImage
    if (mode === "edit" && currentImage) {
      try {
        // Use croppedImageUrl if it exists (after crop/rotation), otherwise use currentImage
        const imageToSave = croppedImageUrl || currentImage;
        const file = await convertToFile(imageToSave);
        photosToSave.push(file);
        
        // Revoke the blob URL after converting
        if (croppedImageUrl && croppedImageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(croppedImageUrl);
        }
        if (currentImage && currentImage.startsWith('blob:') && currentImage !== croppedImageUrl) {
          URL.revokeObjectURL(currentImage);
        }
      } catch (error) {
        console.error("Error converting current photo:", error);
        // If conversion fails, try to use currentImage directly as fallback
        if (currentImage && !croppedImageUrl) {
          try {
            const file = await convertToFile(currentImage);
            photosToSave.push(file);
          } catch (fallbackError) {
            console.error("Error in fallback conversion:", fallbackError);
          }
        }
      }
    }
    
    // Save all photos in order
    if (photosToSave.length > 0) {
      photosToSave.forEach((file) => {
        onCapture(file);
      });
      handleClose();
      
      // Call onSaveAllComplete callback if provided (to move to next step)
      // Pass the count of photos saved so parent can verify
      // Always call this when photos are saved, whether it's 1 or multiple
      if (onSaveAllComplete) {
        // Use setTimeout to ensure photos are saved before moving to next step
        setTimeout(() => {
          onSaveAllComplete(photosToSave.length);
        }, 100);
      }
    }
  };

  const switchCamera = async () => {
    // Stop current stream first
    stopWebcamStream();
    setIsCameraReady(false);
    
    // Wait for camera to be fully released before switching
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Switch facing mode (react-webcam will handle permission)
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const rotateImage = (direction) => {
    setRotation((prev) => (direction === "right" ? prev + 90 : prev - 90));
  };

  // Sync capturedPhotos with pendingPhotos from parent when component mounts or updates
  useEffect(() => {
    if (pendingPhotos && pendingPhotos.length >= 0) {
      // Convert pending photos (files) to the format expected by capturedPhotos
      const formattedPhotos = pendingPhotos.map((file) => {
        // Check if we already have this file in capturedPhotos to avoid recreating URLs
        const existing = capturedPhotos.find((p) => p.file === file);
        if (existing) {
          return existing;
        }
        return {
          file,
          preview: URL.createObjectURL(file),
        };
      });
      setCapturedPhotos(formattedPhotos);
    }
  }, [pendingPhotos]); // eslint-disable-line react-hooks/exhaustive-deps

  const canCaptureMore = currentCount + capturedPhotos.length + (croppedImageUrl && mode === "edit" ? 1 : 0) < maxPhotos;
  // Show "Add Photo" when in edit mode with current image and can capture more
  const canAddPhoto = mode === "edit" && currentImage && canCaptureMore;

  // Can save all if there are photos in array OR if there's a current photo in edit mode
  const canSaveAll = capturedPhotos.length > 0 || (mode === "edit" && currentImage);
  const totalPhotosToSave = capturedPhotos.length + (mode === "edit" && currentImage ? 1 : 0);

  const cameraModal = (
    <div 
      className="fixed bg-black flex flex-col"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        margin: 0,
        padding: 0,
      }}
    >
      {mode === "camera" && (
        <>
          <div 
            className="relative flex items-center justify-center overflow-hidden"
            style={{
              width: '100%',
              height: '100%',
              margin: 0,
              padding: 0,
            }}
          >
            {/* Webcam for photo capture */}
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={getVideoConstraints(facingMode)}
              onUserMedia={(stream) => {
                setIsCameraReady(true);
                setCameraError(null);
              }}
              onUserMediaError={(error) => {
                console.error("Webcam error:", error);
                setIsCameraReady(false);
                
                let errorMessage = "Failed to access camera. Please check permissions.";
                if (error.name === "NotAllowedError") {
                  errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
                } else if (error.name === "NotFoundError") {
                  errorMessage = "No camera found on this device.";
                } else if (error.name === "NotReadableError") {
                  errorMessage = "Camera is already in use by another application.";
                }
                setCameraError(errorMessage);
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                zIndex: 1,
              }}
            />
            
            {/* Camera Error Display */}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-sm mx-4 text-center">
                  <p className="text-white text-lg font-semibold mb-2">Camera Error</p>
                  <p className="text-gray-300 text-sm mb-4">{cameraError}</p>
                  <button
                    onClick={async () => {
                      setCameraError(null);
                      setIsCameraReady(false);
                      
                      // Stop any existing stream
                      stopWebcamStream();
                      
                      // Wait for camera to be fully released
                      await new Promise(resolve => setTimeout(resolve, 500));
                      
                      // Force webcam to retry by toggling facingMode
                      setFacingMode(prev => prev === "environment" ? "user" : "environment");
                      setTimeout(() => {
                        setFacingMode(prev => prev === "user" ? "environment" : "user");
                      }, 100);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            
            {/* Camera Loading Indicator */}
            {!isCameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white text-sm">Initializing camera...</p>
                </div>
              </div>
            )}
            
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
              <button
                onClick={handleClose}
                className="p-3 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-colors shadow-lg"
                aria-label="Close camera"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={switchCamera}
                className="p-3 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-black/80 transition-colors shadow-lg"
                aria-label="Switch camera"
              >
                <RotateCcw className="w-6 h-6" />
              </button>
            </div>

            {capturedPhotos.length > 0 && (
              <div className="absolute top-20 left-4 right-4 z-10">
                <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-white text-sm font-medium mb-2">
                    {capturedPhotos.length} photo{capturedPhotos.length > 1 ? "s" : ""} captured
                  </p>
                  <div className="flex gap-2 overflow-x-auto">
                    {capturedPhotos.map((photo, index) => (
                      <div key={index} className="relative shrink-0">
                        <img
                          src={photo.preview}
                          alt={`Photo ${index + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <button
                          onClick={() => removePhoto(index)}
                          className="absolute -top-1 -right-1 p-1 bg-red-500 rounded-full text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 pb-8 flex flex-col items-center gap-4 z-10">
              {!canCaptureMore && (
                <div className="mb-2">
                  <p className="text-white bg-red-500/90 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
                    Maximum {maxPhotos} photos reached
                  </p>
                </div>
              )}
              <button
                onClick={capture}
                disabled={!canCaptureMore}
                className={`relative w-20 h-20 rounded-full border-4 shadow-2xl transition-all ${
                  canCaptureMore
                    ? "border-white bg-white/30 hover:bg-white/40 active:scale-95"
                    : "border-gray-500 bg-gray-500/30 cursor-not-allowed"
                } flex items-center justify-center`}
                aria-label="Capture photo"
              >
                <div
                  className={`w-16 h-16 rounded-full ${
                    canCaptureMore ? "bg-white" : "bg-gray-400"
                  } shadow-inner`}
                ></div>
                {canCaptureMore && (
                  <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse"></div>
                )}
              </button>
              <div className="flex gap-2 items-center">
                <p className="text-white text-sm font-medium bg-black/50 px-4 py-1 rounded-full backdrop-blur-sm">
                  Tap to capture
                </p>
                {canSaveAll && (
                  <button
                    onClick={saveAllPhotos}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save All ({totalPhotosToSave})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {mode === "edit" && currentImage && (
        <>
          {/* Custom styles for ReactCrop centering */}
          <style>{`
            .ReactCrop {
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              width: 100% !important;
            }
            .ReactCrop__crop-selection {
              margin: 0 auto !important;
            }
            .ReactCrop__image {
              max-width: 100% !important;
              height: auto !important;
              display: block !important;
              margin: 0 auto !important;
            }
          `}</style>
          <div className="flex-1 flex flex-col bg-black overflow-hidden">
            {/* Fixed rotate controls - always visible at top */}
            <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-md border-b border-white/10 p-3">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <RotateCw className="w-5 h-5" />
                    <span className="text-sm font-medium">Rotate</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rotateImage("left")}
                      className="p-3 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors active:scale-95 shadow-lg"
                      aria-label="Rotate left"
                    >
                      <RotateCcw className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => rotateImage("right")}
                      className="p-3 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors active:scale-95 shadow-lg"
                      aria-label="Rotate right"
                    >
                      <RotateCw className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto flex items-center justify-center p-0 sm:p-4 pb-20">
              <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-full">
                <div className="w-full flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-none sm:rounded-lg p-1 sm:p-4 mb-1 sm:mb-4">
                  <div className="w-full flex items-center justify-center">
                    <ReactCrop
                      crop={crop}
                      onChange={(c) => setCrop(c)}
                      onComplete={(c) => setCompletedCrop(c)}
                      aspect={undefined}
                      minWidth={50}
                      minHeight={50}
                    >
                      <img
                        ref={imgRef}
                        src={currentImage}
                        alt="Crop me"
                        onLoad={onImageLoad}
                        className="w-full h-auto max-h-[calc(100vh-200px)] sm:max-h-[70vh] object-contain"
                        style={{
                          display: "block",
                          transform: `rotate(${rotation}deg)`,
                          transition: "transform 0.3s",
                          margin: "0 auto",
                        }}
                      />
                    </ReactCrop>
                  </div>
                </div>

                <div className="w-full bg-black/60 backdrop-blur-sm rounded-none sm:rounded-lg p-2 sm:p-3">
                  <p className="text-white text-xs sm:text-sm text-center">
                    Drag the corners to crop the image
                  </p>
                </div>
              </div>
            </div>

            {/* Fixed bottom button bar - icon-only with better visibility */}
            <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-white/10 p-3 z-50">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={retakeCurrent}
                    className="flex flex-col items-center justify-center gap-1 p-3 bg-gray-700/90 hover:bg-gray-600 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px]"
                    title="Retake"
                  >
                    <RotateCcw className="w-6 h-6" />
                    <span className="text-xs font-medium">Retake</span>
                  </button>
                  {canAddPhoto && (
                    <button
                      onClick={addPhoto}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-blue-600/90 hover:bg-blue-700 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px]"
                      title="Add Photo"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-xs font-medium">Add</span>
                    </button>
                  )}
                  {canSaveAll && (
                    <button
                      onClick={saveAllPhotos}
                      className="flex flex-col items-center justify-center gap-1 p-3 bg-green-600/90 hover:bg-green-700 rounded-full text-white transition-all duration-200 shadow-lg active:scale-95 min-w-[70px]"
                      title={`Save All (${totalPhotosToSave})`}
                    >
                      <Check className="w-6 h-6" />
                      <span className="text-xs font-medium">Save ({totalPhotosToSave})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Render using portal directly to document.body to bypass any parent container styling
  return createPortal(cameraModal, document.body);
}
