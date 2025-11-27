import { useRef, useCallback, useEffect } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { getCroppedImg, getRotatedImg } from "../utils/imageUtils";
import RotateControls from "./RotateControls";
import EditControls from "./EditControls";

export default function ImageEditView({
  currentImage,
  crop,
  completedCrop,
  rotation,
  croppedImageUrl,
  setCrop,
  setCompletedCrop,
  setRotation,
  setCroppedImageUrl,
  canAddPhoto,
  canSaveAll,
  totalPhotosToSave,
  onRetake,
  onAddPhoto,
  onSaveAll,
}) {
  const imgRef = useRef(null);

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
  }, [setCrop]);

  const applyCropAndRotation = useCallback(async () => {
    if (!currentImage) {
      setCroppedImageUrl(null);
      return;
    }

    try {
      // If no crop is set or crop covers the entire image, just apply rotation
      if (!completedCrop || !crop) {
        if (rotation !== 0) {
          const rotated = await getRotatedImg(currentImage, rotation);
          setCroppedImageUrl(rotated);
        } else {
          setCroppedImageUrl(currentImage);
        }
        return;
      }

      // Check if crop covers the entire image (within 1% tolerance)
      const cropWidth = crop.unit === "%" ? crop.width : (crop.width / (imgRef.current?.width || 1)) * 100;
      const cropHeight = crop.unit === "%" ? crop.height : (crop.height / (imgRef.current?.height || 1)) * 100;
      const cropX = crop.unit === "%" ? crop.x : (crop.x / (imgRef.current?.width || 1)) * 100;
      const cropY = crop.unit === "%" ? crop.y : (crop.y / (imgRef.current?.height || 1)) * 100;

      // If crop covers entire image (within tolerance), treat as no crop
      if (cropWidth >= 99 && cropHeight >= 99 && cropX <= 1 && cropY <= 1) {
        if (rotation !== 0) {
          const rotated = await getRotatedImg(currentImage, rotation);
          setCroppedImageUrl(rotated);
        } else {
          setCroppedImageUrl(currentImage);
        }
        return;
      }

      // Get the actual displayed image dimensions from the ref
      const displayedWidth = imgRef.current?.width || 0;
      const displayedHeight = imgRef.current?.height || 0;
      
      const cropped = await getCroppedImg(currentImage, completedCrop, rotation, displayedWidth, displayedHeight);
      setCroppedImageUrl(cropped);
    } catch (error) {
      console.error("Error cropping image:", error);
      setCroppedImageUrl(currentImage);
    }
  }, [currentImage, completedCrop, crop, rotation, setCroppedImageUrl]);

  useEffect(() => {
    if (currentImage) {
      // Reset croppedImageUrl when a new image is loaded to ensure fresh crop
      setCroppedImageUrl(null);
      applyCropAndRotation();
    }
  }, [currentImage, completedCrop, rotation, applyCropAndRotation, setCroppedImageUrl]);

  const rotateImage = (direction) => {
    setRotation((prev) => (direction === "right" ? prev + 90 : prev - 90));
  };

  return (
    <>
      {/* Custom styles for ReactCrop centering */}
      <style>{`
        .ReactCrop {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 100% !important;
          touch-action: none !important;
        }
        .ReactCrop__crop-selection {
          margin: 0 auto !important;
          touch-action: none !important;
        }
        .ReactCrop__image {
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 auto !important;
          touch-action: none !important;
        }
        /* Ensure bottom buttons are always clickable - prevent ReactCrop from blocking */
        .camera-edit-bottom-bar {
          position: fixed !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          z-index: 100000 !important;
          pointer-events: auto !important;
          touch-action: manipulation !important;
          isolation: isolate !important;
        }
        .camera-edit-bottom-bar * {
          pointer-events: auto !important;
          touch-action: manipulation !important;
        }
        .camera-edit-bottom-bar button {
          pointer-events: auto !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
          position: relative !important;
          z-index: 100001 !important;
        }
        /* Prevent ReactCrop overlay from blocking bottom bar */
        .ReactCrop__drag-handle,
        .ReactCrop__drag-bar {
          touch-action: none !important;
        }
        /* Ensure scrollable area doesn't block bottom bar */
        .camera-edit-scroll-area {
          padding-bottom: 120px !important;
        }
      `}</style>
      <div 
        className="flex-1 flex flex-col bg-black overflow-hidden"
        style={{
          position: 'relative',
          touchAction: 'pan-y', // Allow vertical scrolling
        }}
      >
        <RotateControls 
          onRotateLeft={() => rotateImage("left")} 
          onRotateRight={() => rotateImage("right")} 
        />

        <div 
          className="flex-1 overflow-y-auto flex items-center justify-center p-0 sm:p-4 pb-24 camera-edit-scroll-area"
          style={{
            paddingBottom: '120px', // Extra space for fixed bottom bar
            touchAction: 'pan-y', // Allow vertical scrolling but prevent horizontal
            position: 'relative',
            zIndex: 1,
          }}
          onTouchStart={(e) => {
            // Allow scrolling but don't let touches propagate to bottom bar
            const target = e.target;
            if (target.closest('.camera-edit-bottom-bar')) {
              e.stopPropagation();
            }
          }}
        >
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-full">
            <div className="w-full flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-none sm:rounded-lg p-1 sm:p-4 mb-1 sm:mb-4">
              <div className="w-full flex items-center justify-center">
                <div
                  style={{
                    position: 'relative',
                    zIndex: 1,
                  }}
                  onTouchStart={(e) => {
                    // Prevent ReactCrop touches from blocking bottom bar
                    const bottomBar = document.querySelector('.camera-edit-bottom-bar');
                    if (bottomBar && bottomBar.contains(e.target)) {
                      e.stopPropagation();
                    }
                  }}
                >
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={undefined}
                    minWidth={50}
                    minHeight={50}
                    style={{
                      touchAction: 'none', // Prevent ReactCrop from interfering with button touches
                      position: 'relative',
                      zIndex: 1,
                    }}
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
                      touchAction: 'none', // Prevent image drag from interfering
                    }}
                  />
                  </ReactCrop>
                </div>
              </div>
            </div>

            <div className="w-full bg-black/60 backdrop-blur-sm rounded-none sm:rounded-lg p-2 sm:p-3">
              <p className="text-white text-xs sm:text-sm text-center">
                Drag the corners to crop the image
              </p>
            </div>
          </div>
        </div>

        <EditControls
          currentImage={currentImage}
          totalPhotosToSave={totalPhotosToSave}
          onRetake={onRetake}
          onAddPhoto={onAddPhoto}
          onSaveAll={onSaveAll}
        />
      </div>
    </>
  );
}

