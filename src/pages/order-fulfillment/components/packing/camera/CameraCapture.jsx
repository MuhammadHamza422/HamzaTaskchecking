import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "./hooks/useBodyScrollLock";
import { useCameraInitialization } from "./hooks/useCameraInitialization";
import { stopWebcamStream, getVideoConstraints } from "./utils/cameraUtils";
import { convertToFile } from "./utils/imageUtils";
import CameraView from "./components/CameraView";
import ImageEditView from "./components/ImageEditView";

export default function CameraCapture({ 
  onCapture, 
  onClose, 
  onAddPhoto, 
  maxPhotos, 
  currentCount, 
  pendingPhotos = [], 
  onSaveAllComplete 
}) {
  const [mode, setMode] = useState("camera"); // "camera" | "edit"
  const [capturedPhotos, setCapturedPhotos] = useState(pendingPhotos);
  const [currentImage, setCurrentImage] = useState(null);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [cameraError, setCameraError] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [webcamKey, setWebcamKey] = useState(0);
  
  const webcamRef = useRef(null);

  // Lock body scroll
  useBodyScrollLock();

  // Initialize camera
  useCameraInitialization(mode, webcamRef, setIsCameraReady, setCameraError);

  // Helper function to stop webcam stream
  const stopWebcamStreamHandler = useCallback(() => {
    stopWebcamStream(webcamRef, setIsCameraReady);
  }, []);

  // Cleanup: Stop webcam stream when component unmounts
  useEffect(() => {
    return () => {
      stopWebcamStreamHandler();
    };
  }, [stopWebcamStreamHandler]);

  const handleClose = useCallback(() => {
    stopWebcamStreamHandler();
    if (onClose) {
      onClose();
    }
  }, [stopWebcamStreamHandler, onClose]);

  const capture = useCallback(() => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      // Revoke any previous image URL to prevent memory leaks
      if (currentImage && currentImage.startsWith('blob:')) {
        URL.revokeObjectURL(currentImage);
      }
      if (croppedImageUrl && croppedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(croppedImageUrl);
      }
      
      // Set new image and reset ALL crop state for fresh photo
      setCurrentImage(imageSrc);
      setCroppedImageUrl(null);
      setCrop({
        unit: "%",
        width: 90,
        aspect: undefined,
        x: 5,
        y: 5,
      });
      setCompletedCrop(null);
      setRotation(0);
      setMode("edit");
    }
  }, [currentImage, croppedImageUrl]);

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
    
    // First, add all photos from the capturedPhotos array
    capturedPhotos.forEach((photo) => {
      photosToSave.push(photo.file);
    });
    
    // If there's a current photo in edit mode that hasn't been added yet, convert and add it
    if (mode === "edit" && currentImage) {
      try {
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
      
      // Call onSaveAllComplete callback if provided
      if (onSaveAllComplete) {
        setTimeout(() => {
          onSaveAllComplete(photosToSave.length);
        }, 100);
      }
    }
  };

  const switchCamera = async () => {
    // Stop current stream first
    stopWebcamStreamHandler();
    setIsCameraReady(false);
    
    // Switch facing mode and force remount
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
    setWebcamKey(prev => prev + 1);
  };

  const handleRetry = () => {
    // Force remount by incrementing webcamKey
    setWebcamKey(prev => prev + 1);
  };

  // Sync capturedPhotos with pendingPhotos from parent
  useEffect(() => {
    if (pendingPhotos && pendingPhotos.length >= 0) {
      const formattedPhotos = pendingPhotos.map((file) => {
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
  const canAddPhoto = mode === "edit" && currentImage && canCaptureMore;
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
        <CameraView
          webcamRef={webcamRef}
          webcamKey={webcamKey}
          facingMode={facingMode}
          isCameraReady={isCameraReady}
          cameraError={cameraError}
          capturedPhotos={capturedPhotos}
          canCaptureMore={canCaptureMore}
          canSaveAll={canSaveAll}
          totalPhotosToSave={totalPhotosToSave}
          maxPhotos={maxPhotos}
          onCapture={capture}
          onClose={handleClose}
          onSwitchCamera={switchCamera}
          onRemovePhoto={removePhoto}
          onSaveAll={saveAllPhotos}
          setIsCameraReady={setIsCameraReady}
          setCameraError={setCameraError}
          stopWebcamStream={stopWebcamStreamHandler}
          onRetry={handleRetry}
        />
      )}

      {mode === "edit" && currentImage && (
        <ImageEditView
          currentImage={currentImage}
          crop={crop}
          completedCrop={completedCrop}
          rotation={rotation}
          croppedImageUrl={croppedImageUrl}
          setCrop={setCrop}
          setCompletedCrop={setCompletedCrop}
          setRotation={setRotation}
          setCroppedImageUrl={setCroppedImageUrl}
          canAddPhoto={canAddPhoto}
          canSaveAll={canSaveAll}
          totalPhotosToSave={totalPhotosToSave}
          onRetake={retakeCurrent}
          onAddPhoto={addPhoto}
          onSaveAll={saveAllPhotos}
        />
      )}
    </div>
  );

  // Render using portal directly to document.body
  return createPortal(cameraModal, document.body);
}

