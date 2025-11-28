import { useState, useEffect, useRef } from "react";
import { Camera, Upload, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import CameraCapture from "../../packing/camera/CameraCapture";
import PhotoPreview from "../../packing/PhotoPreview";
import ImageModal from "../../common/ImageModal";
import Swal from "sweetalert2";

const MAX_PHOTOS = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

export default function ShippingPhotosStep({ 
  photos = [], 
  onPhotosChange, 
  onNext, 
  onBack,
  autoOpenCamera = false
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const fileInputRef = useRef(null);

  // Auto-open camera if requested
  useEffect(() => {
    if (autoOpenCamera && !hasAutoOpened && photos.length === 0) {
      requestAnimationFrame(() => {
        setShowCamera(true);
        setHasAutoOpened(true);
      });
    }
  }, [autoOpenCamera, hasAutoOpened, photos.length]);

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
  };

  const handleAddPhoto = (file) => {
    addPhoto(file);
    setPendingPhotos((prev) => [...prev, file]);
  };

  const handleCameraClose = () => {
    setPendingPhotos([]);
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

  const canComplete = photos.length > 0;
  const canAddMore = photos.length < MAX_PHOTOS;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Camera className="w-5 h-5 text-purple-600" />
            Proof of Shipment
          </h2>
          <p className="text-gray-600">
            Please capture photos of the shipping label and sealed package.
            At least 1 photo is required.
          </p>
        </div>

        <div className="mb-6">
          {/* Photo Preview */}
          <div className="mb-4">
            {photos.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="w-40 h-40">
                    <PhotoPreview
                      photo={photo}
                      onRemove={handleRemovePhoto}
                      onImageClick={() => handleImageClick(photo)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-40 h-40 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                <p className="text-gray-400 text-sm text-center px-2">No photos yet</p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <p className={`text-sm font-semibold ${
              photos.length >= 1 ? "text-green-600" : "text-amber-600"
            }`}>
              {photos.length} of {MAX_PHOTOS} photos uploaded
              {photos.length < 1 && <span className="text-amber-600 ml-2">(At least 1 required)</span>}
            </p>
          </div>

          {canAddMore && (
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowCamera(true)}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-purple-600 text-white rounded-lg font-semibold shadow-md hover:bg-purple-700 transition-colors"
              >
                <Camera className="w-5 h-5" />
                <span>Take Photo</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 py-4 px-6 bg-gray-600 text-white rounded-lg font-semibold shadow-md hover:bg-gray-700 transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span>Upload from Device</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-1 py-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!canComplete}
          className={`flex-1 py-4 rounded-xl font-bold shadow-lg transition-colors flex items-center justify-center gap-2 ${
            canComplete
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          <CheckCircle className="w-5 h-5" />
          <span>Review & Confirm</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
          onAddPhoto={handleAddPhoto}
          maxPhotos={MAX_PHOTOS}
          currentCount={photos.length}
          pendingPhotos={pendingPhotos}
          onSaveAllComplete={(savedCount) => {
            if (savedCount > 0) {
              // Optional: auto-advance or just let user see photos
            }
          }}
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
    </motion.div>
  );
}

