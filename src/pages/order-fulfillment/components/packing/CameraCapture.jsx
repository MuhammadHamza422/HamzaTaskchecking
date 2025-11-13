import { useState, useRef, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { X, RotateCcw, Check, RotateCw, Plus, Save } from "lucide-react";

const videoConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: { ideal: "environment" },
};

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });

const getCroppedImg = async (imageSrc, crop, rotation = 0) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!crop || !image) {
    return imageSrc;
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio;

  canvas.width = crop.width * scaleX * pixelRatio;
  canvas.height = crop.height * scaleY * pixelRatio;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = "high";

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;
  const rotateRads = (rotation * Math.PI) / 180;
  const centerX = image.naturalWidth / 2;
  const centerY = image.naturalHeight / 2;

  ctx.save();
  ctx.translate(-cropX, -cropY);
  ctx.translate(centerX, centerY);
  ctx.rotate(rotateRads);
  ctx.translate(-centerX, -centerY);
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
    0,
    0,
    image.naturalWidth,
    image.naturalHeight
  );

  ctx.restore();

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

export default function CameraCapture({ onCapture, onClose, maxPhotos, currentCount }) {
  const [mode, setMode] = useState("camera"); // "camera" | "edit" | "review"
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(-1);
  const [currentImage, setCurrentImage] = useState(null);
  const [crop, setCrop] = useState(null);
  const [completedCrop, setCompletedCrop] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [croppedImageUrl, setCroppedImageUrl] = useState(null);
  const webcamRef = useRef(null);
  const imgRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");

  const capture = useCallback(() => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCurrentImage(imageSrc);
      setCrop({
        unit: "%",
        width: 90,
        aspect: undefined,
        x: 5,
        y: 5,
      });
      setRotation(0);
      setMode("edit");
    }
  }, []);

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
      const cropped = await getCroppedImg(currentImage, completedCrop, rotation);
      setCroppedImageUrl(cropped);
    } catch (error) {
      console.error("Error cropping image:", error);
      setCroppedImageUrl(currentImage);
    }
  }, [currentImage, completedCrop, rotation]);

  useEffect(() => {
    if (mode === "edit" && currentImage) {
      applyCropAndRotation();
    }
  }, [mode, currentImage, completedCrop, rotation, applyCropAndRotation]);

  const convertToFile = async (imageUrl) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      return new File([blob], `camera-${Date.now()}.jpg`, {
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
        const file = await convertToFile(croppedImageUrl);
        const newPhotos = [...capturedPhotos, { file, preview: croppedImageUrl }];
        setCapturedPhotos(newPhotos);
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
        onCapture(file);
        onClose();
      } catch (error) {
        console.error("Error saving photo:", error);
      }
    }
  };

  const retakeCurrent = () => {
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

  const saveAllPhotos = () => {
    if (capturedPhotos.length > 0) {
      capturedPhotos.forEach((photo) => {
        onCapture(photo.file);
      });
      onClose();
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const rotateImage = (direction) => {
    setRotation((prev) => (direction === "right" ? prev + 90 : prev - 90));
  };

  const canCaptureMore = currentCount + capturedPhotos.length < maxPhotos;
  const canAddPhoto = croppedImageUrl && canCaptureMore;
  const canSaveAll = capturedPhotos.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {mode === "camera" && (
        <>
          <div className="flex-1 relative flex items-center justify-center overflow-hidden">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                ...videoConstraints,
                facingMode: facingMode,
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              <button
                onClick={onClose}
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
                    <span>Save All ({capturedPhotos.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {mode === "edit" && currentImage && (
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 mb-4">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={undefined}
                  minWidth={50}
                >
                  <img
                    ref={imgRef}
                    src={currentImage}
                    alt="Crop me"
                    onLoad={onImageLoad}
                    style={{
                      maxWidth: "100%",
                      transform: `rotate(${rotation}deg)`,
                      transition: "transform 0.3s",
                    }}
                  />
                </ReactCrop>
              </div>

              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <RotateCw className="w-5 h-5" />
                    <span className="text-sm font-medium">Rotate</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rotateImage("left")}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                      aria-label="Rotate left"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => rotateImage("right")}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
                      aria-label="Rotate right"
                    >
                      <RotateCw className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/20">
                  <p className="text-white text-xs">
                    Drag the corners to crop the image
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/90 backdrop-blur-md border-t border-white/10 p-4">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={retakeCurrent}
                  className="flex-1 py-3 px-6 bg-gray-700 text-white rounded-lg font-semibold hover:bg-gray-600 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>Retake</span>
                </button>
                <button
                  onClick={saveSinglePhoto}
                  className="flex-1 py-3 px-6 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95"
                >
                  <Save className="w-5 h-5" />
                  <span>Save Photo</span>
                </button>
                {canAddPhoto && (
                  <button
                    onClick={addPhoto}
                    className="flex-1 py-3 px-6 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Photo</span>
                  </button>
                )}
                {canSaveAll && (
                  <button
                    onClick={saveAllPhotos}
                    className="flex-1 py-3 px-6 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg active:scale-95"
                  >
                    <Check className="w-5 h-5" />
                    <span>Save All ({capturedPhotos.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
