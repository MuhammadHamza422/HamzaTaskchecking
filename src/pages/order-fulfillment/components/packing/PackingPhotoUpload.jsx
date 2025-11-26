import { useState, useRef } from "react";
import { Upload, Image as ImageIcon, Camera } from "lucide-react";
import CameraCapture from "./camera";
import PhotoPreview from "./PhotoPreview";
import ImageModal from "../common/ImageModal";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

export default function PackingPhotoUpload({ maxPhotos = 5, onPhotosChange }) {
  const [photos, setPhotos] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const validateFile = (file) => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return {
        valid: false,
        message: "Invalid image format. Only JPEG, PNG, and WebP are allowed.",
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        message: "Photo size must be less than 10MB.",
      };
    }
    return { valid: true };
  };

  const addPhoto = (file) => {
    if (photos.length >= maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed.`);
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.message);
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const newPhoto = {
        id: Date.now() + Math.random(),
        file: file,
        preview: e.target.result,
      };
      const updatedPhotos = [...photos, newPhoto];
      setPhotos(updatedPhotos);
      if (onPhotosChange) {
        onPhotosChange(updatedPhotos);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    if (files.length > remainingSlots) {
      setError(`You can only add ${remainingSlots} more photo(s).`);
      return;
    }

    files.forEach((file) => {
      addPhoto(file);
    });

    e.target.value = "";
  };

  const handleCameraCapture = (file) => {
    addPhoto(file);
  };

  const handleRemovePhoto = (photoId) => {
    const updatedPhotos = photos.filter((p) => p.id !== photoId);
    setPhotos(updatedPhotos);
    setError(null);
    if (onPhotosChange) {
      onPhotosChange(updatedPhotos);
    }
  };

  const handleCameraClick = () => {
    if (photos.length >= maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed.`);
      return;
    }
    setShowCamera(true);
  };

  const handleFileUploadClick = () => {
    if (photos.length >= maxPhotos) {
      setError(`Maximum ${maxPhotos} photos allowed.`);
      return;
    }
    fileInputRef.current?.click();
  };

  const canAddMore = photos.length < maxPhotos;

  const handleImageClick = (photo) => {
    setSelectedImage(photo.preview);
    setIsImageModalOpen(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Packing Photos
          </h3>
          <p className="text-sm text-gray-600">
            Upload up to {maxPhotos} photos. At least 1 photo is required.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-4">
            {photos.map((photo) => (
              <PhotoPreview
                key={photo.id}
                photo={photo}
                onRemove={handleRemovePhoto}
                onImageClick={() => handleImageClick(photo)}
              />
            ))}
          </div>
        )}

        {canAddMore && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <button
              onClick={handleCameraClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span>Take Photo</span>
            </button>
            <button
              onClick={handleFileUploadClick}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              <Upload className="w-5 h-5" />
              <span>Upload from Device</span>
            </button>
          </div>
        )}

        {photos.length === 0 && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-8 text-center">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2 font-medium">No photos uploaded yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Upload at least 1 photo to continue
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleCameraClick}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>
              <button
                onClick={handleFileUploadClick}
                className="flex items-center justify-center gap-2 py-2 px-4 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Upload from Device</span>
              </button>
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`font-medium ${
                photos.length >= 1 ? "text-green-600" : "text-amber-600"
              }`}
            >
              {photos.length} of {maxPhotos} photos uploaded
            </span>
            {photos.length < 1 && (
              <span className="text-amber-600">(At least 1 required)</span>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          maxPhotos={maxPhotos}
          currentCount={photos.length}
        />
      )}

      <ImageModal
        imageUrl={selectedImage}
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setSelectedImage(null);
        }}
      />
    </>
  );
}
