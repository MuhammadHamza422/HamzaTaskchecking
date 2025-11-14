import { useState, useEffect, useRef } from "react";
import { Camera, Upload, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import CameraCapture from "./CameraCapture";
import PhotoPreview from "./PhotoPreview";
import ImageModal from "../common/ImageModal";
import Swal from "sweetalert2";

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

export default function PhotoUploadStep({ 
  photos = [], 
  onPhotosChange, 
  onComplete, 
  canComplete, 
  submitting,
  onBack 
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-open camera ONLY on first mount (before any photos are taken)
  useEffect(() => {
    if (!hasAutoOpened && photos.length === 0 && photos.length < MAX_PHOTOS) {
      const timer = setTimeout(() => {
        setShowCamera(true);
        setHasAutoOpened(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateFile = (file) => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return { valid: false, message: "Invalid image format. Only JPEG, PNG, and WebP are allowed." };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, message: "Photo size must be less than 10MB." };
    }
    return { valid: true };
  };

  const addPhoto = (file) => {
    if (photos.length >= MAX_PHOTOS) {
      return;
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      Swal.fire({
        icon: "error",
        title: "Invalid File",
        text: validation.message,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const newPhoto = {
        id: Date.now() + Math.random(),
        file: file,
        preview: e.target.result,
      };
      const updatedPhotos = [...photos, newPhoto];
      onPhotosChange(updatedPhotos);
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (file) => {
    addPhoto(file);
    setShowCamera(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (files.length > remainingSlots) {
      Swal.fire({
        icon: "warning",
        title: "Too Many Photos",
        text: `You can only add ${remainingSlots} more photo(s).`,
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    files.forEach((file) => addPhoto(file));
    e.target.value = "";
  };

  const handleRemovePhoto = (photoId) => {
    const updatedPhotos = photos.filter((p) => p.id !== photoId);
    onPhotosChange(updatedPhotos);
  };

  const handleImageClick = (photo) => {
    setSelectedImage(photo.preview);
    setIsImageModalOpen(true);
  };

  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 md:p-6">
        <div className="mb-4 md:mb-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
            Packing Photos
          </h3>
          <p className="text-sm md:text-base text-gray-600">
            Upload up to {MAX_PHOTOS} photos. At least 1 photo is required to complete packing.
          </p>
        </div>

        {/* Photo Grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mb-4 md:mb-6">
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

        {/* Upload Actions */}
        {canAddMore && (
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-4 md:mb-6">
            <motion.button
              onClick={() => setShowCamera(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 md:py-3.5 px-4 md:px-6 bg-blue-600 text-white rounded-xl font-semibold text-sm md:text-base hover:bg-blue-700 transition-all duration-300 shadow-lg"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Camera className="w-5 h-5 md:w-6 md:h-6" />
              <span>Take Photo</span>
            </motion.button>
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 md:py-3.5 px-4 md:px-6 bg-gray-600 text-white rounded-xl font-semibold text-sm md:text-base hover:bg-gray-700 transition-all duration-300 shadow-lg"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <Upload className="w-5 h-5 md:w-6 md:h-6" />
              <span>Upload from Device</span>
            </motion.button>
          </div>
        )}

        {/* Photo Count */}
        {photos.length > 0 && (
          <div className="mb-4 md:mb-6">
            <p className={`text-sm md:text-base font-semibold ${
              photos.length >= 1 ? "text-green-600" : "text-amber-600"
            }`}>
              {photos.length} of {MAX_PHOTOS} photos uploaded
              {photos.length < 1 && <span className="text-amber-600 ml-2">(At least 1 required)</span>}
            </p>
          </div>
        )}

        {/* Complete Button */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4 border-t border-gray-200">
          {onBack && (
            <motion.button
              onClick={onBack}
              className="flex-1 px-4 md:px-6 py-3 md:py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm md:text-base hover:bg-gray-50 transition-all duration-300 shadow-sm"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              ← Back to Items
            </motion.button>
          )}
          <motion.button
            onClick={onComplete}
            disabled={!canComplete || submitting}
            className={`flex-1 px-4 md:px-6 py-3 md:py-3.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
              canComplete && !submitting
                ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
            whileHover={canComplete && !submitting ? { scale: 1.01 } : {}}
            whileTap={canComplete && !submitting ? { scale: 0.99 } : {}}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating Packing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Complete Packing</span>
              </>
            )}
          </motion.button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          maxPhotos={MAX_PHOTOS}
          currentCount={photos.length}
        />
      )}

      {/* Image Modal */}
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

