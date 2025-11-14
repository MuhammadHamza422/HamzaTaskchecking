import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle, Loader2, X, Package, MapPin, DollarSign, Clock, Camera, Upload } from "lucide-react";
import { motion } from "framer-motion";
import OrderInfoCard from "../common/OrderInfoCard";
import PackingOrderLines from "./PackingOrderLines";
import PackingPhotoUpload from "./PackingPhotoUpload";
import CameraCapture from "./CameraCapture";
import PhotoPreview from "./PhotoPreview";
import ImageModal from "../common/ImageModal";
import StatusBadge from "../common/StatusBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import { getOrderDetails, createPacking, getPackingOrderDetails } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

const STAGES = {
  SELECTION: "selection",
  PHOTO_UPLOAD: "photo_upload",
};

export default function PackingOrderDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const [stage, setStage] = useState(STAGES.SELECTION);
  const [selectedItems, setSelectedItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const [packingData, setPackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAlreadyPacked, setIsAlreadyPacked] = useState(false);
  const [packingInfo, setPackingInfo] = useState(null);

  useEffect(() => {
    const loadOrderDetails = async () => {
      const packingId = location.state?.packingId;

      setLoading(true);
      setError(null);

      try {
        if (packingId) {
          setIsViewMode(true);
          const result = await getPackingOrderDetails(packingId);

          if (result.success && result.data) {
            setPackingData(result.data);
            setSelectedItems(result.data.selectedItems || []);
          } else {
            throw new Error("Failed to load packing details");
          }
        } else {
          setIsViewMode(false);
          const searchData = location.state?.searchData;
          const platform = location.state?.platform;
          const alreadyPackedFromSearch = location.state?.isAlreadyPacked;
          const packingInfoFromSearch = location.state?.packingInfo;

          if (!platform) {
            setError("Platform information is missing");
            setLoading(false);
            return;
          }

          let orderIdToUse;

          if (platform === "shopify") {
            orderIdToUse = searchData?.orderId || location.state?.orderId;
          } else {
            orderIdToUse = decodeURIComponent(orderId);
          }

          if (!orderIdToUse) {
            throw new Error("Order ID is missing");
          }

          const result = await getOrderDetails(orderIdToUse, platform);

          if (result.success && result.data) {
            setOrderData(result.data);
            
            // Check if order is already packed
            const isPacked = result.data.isAlreadyPacked || alreadyPackedFromSearch || false;
            const packingInfoData = result.data.packingInfo || packingInfoFromSearch || null;
            
            setIsAlreadyPacked(isPacked);
            setPackingInfo(packingInfoData);
            
            // If already packed, switch to view mode
            if (isPacked && packingInfoData) {
              setIsViewMode(true);
              // Load packing details
              try {
                const packingResult = await getPackingOrderDetails(packingInfoData.packingId);
                if (packingResult.success && packingResult.data) {
                  setPackingData(packingResult.data);
                  setSelectedItems(packingResult.data.selectedItems || []);
                }
              } catch (err) {
                console.error("Error loading packing details:", err);
              }
            } else {
              // Select all items by default
              setSelectedItems(
                result.data.orderLines.map((item) => item.id)
              );
            }
          }
        }
      } catch (error) {
        console.error("Error loading details:", error);
        setError(error.message || "Failed to load details");

        Swal.fire({
          icon: "error",
          title: "Failed to Load",
          text: error.message || "Unable to fetch details. Please try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        }).then(() => {
          navigate("/fulfillment/packing/list");
        });
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId, location.state, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || (!orderData && !packingData)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 font-medium mb-4">
              {error || "Details not found"}
            </p>
            <button
              onClick={() => navigate(isViewMode ? "/fulfillment/packing/list" : "/fulfillment/packing")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isViewMode ? "Back to Packing List" : "Back to Packing"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const order = isViewMode
    ? {
        orderNumber: packingData.orderNumber || packingData.orderId,
        customerName: packingData.customerName || "N/A",
        platform: packingData.platform,
        shipTo: packingData.shipTo
          ? `${packingData.shipTo.address1}${packingData.shipTo.address2 ? `, ${packingData.shipTo.address2}` : ""}, ${packingData.shipTo.city}, ${packingData.shipTo.state} ${packingData.shipTo.zip}, ${packingData.shipTo.country}`
          : "N/A",
        totalValue: packingData.totalValue || 0,
      }
    : {
        orderNumber: orderData.orderNumber || orderData.orderId,
        customerName: orderData.customerName,
        platform: orderData.platform,
        shipTo: orderData.shipTo
          ? `${orderData.shipTo.address1}${orderData.shipTo.address2 ? `, ${orderData.shipTo.address2}` : ""}, ${orderData.shipTo.city}, ${orderData.shipTo.state} ${orderData.shipTo.zip}, ${orderData.shipTo.country}`
          : "N/A",
        totalValue: orderData.totalValue,
      };

  const orderLines = isViewMode ? packingData.orderLines || [] : orderData.orderLines || [];

  const handleContinueToPhotos = () => {
    if (selectedItems.length > 0) {
      setStage(STAGES.PHOTO_UPLOAD);
    }
  };

  const handleCompletePacking = async () => {
    if (photos.length < 1) {
      Swal.fire({
        icon: "warning",
        title: "Photos Required",
        text: "Please upload at least 1 photo to complete packing.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    if (selectedItems.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Items Required",
        text: "Please select at least one item to pack.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    const searchData = location.state?.searchData;
    const platform = location.state?.platform;
    let orderIdToUse;

    if (platform === "shopify") {
      orderIdToUse = searchData?.orderId || location.state?.orderId;
    } else {
      orderIdToUse = decodeURIComponent(orderId);
    }

    const orderNumber = orderData.orderNumber || orderData.orderId;
    const allItemIds = orderLines.map((item) => String(item.id));
    const selectedItemsNormalized = selectedItems.map((id) => String(id));
    const deselectedItems = allItemIds.filter((id) => !selectedItemsNormalized.includes(String(id)));
    const deselectedItemsData = orderLines.filter((item) => deselectedItems.includes(String(item.id)));
    const photoFiles = photos.map((photo) => photo.file);

    // Debug logging
    console.log("🔍 Packing Debug Info:", {
      allItemIds,
      selectedItems: selectedItemsNormalized,
      deselectedItems,
      deselectedItemsCount: deselectedItems.length,
      deselectedItemsData: deselectedItemsData.map(item => ({ id: item.id, name: item.name })),
    });

    setSubmitting(true);

    try {
      const result = await createPacking({
        orderId: orderIdToUse,
        platform: platform,
        orderNumber: orderNumber,
        selectedItems: selectedItemsNormalized,
        deselectedItems: deselectedItems,
        deselectedItemsData: deselectedItemsData,
        orderData: {
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          phone: orderData.phone,
          shipTo: orderData.shipTo,
          totalValue: orderData.totalValue,
          currency: orderData.currency,
          subtotal: orderData.subtotal,
          tax: orderData.tax,
          shipping: orderData.shipping,
          discount: orderData.discount,
        },
        photos: photoFiles,
      });

      if (result.success) {
        const status = result.data.status;
        const dropshipCreated = result.data.dropshipCreated;
        const dropshipId = result.data.dropshipId;
        const deselectedItemsCount = result.data.deselectedItemsCount || deselectedItems.length;
        
        let message = `Order ${orderNumber} has been packed successfully. Status: ${status}`;
        if (dropshipCreated && dropshipId) {
          message += `. Dropship order ${dropshipId} created for ${deselectedItemsCount} deselected item(s).`;
        } else if (deselectedItemsCount > 0) {
          message += `. ${deselectedItemsCount} item(s) were deselected but dropship creation failed.`;
        }
        
        await Swal.fire({
          icon: "success",
          title: "Packing Complete!",
          text: message,
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });

        navigate("/fulfillment/packing/list", {
          state: {
            message: `Order ${orderNumber} packed successfully. Status: ${status}`,
          },
        });
      }
    } catch (error) {
      console.error("Error creating packing:", error);
      const errorMessage =
        error.details || error.message || "Failed to create packing record. Please try again.";

      Swal.fire({
        icon: "error",
        title: "Packing Failed",
        text: errorMessage,
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const canContinueToPhotos = selectedItems.length > 0;
  const canCompletePacking = photos.length >= 1;

  // Photo Upload Step Component with auto-open camera
  const PhotoUploadStepComponent = ({ onPhotosChange, photos, onComplete, canComplete, submitting }) => {
    const [showCamera, setShowCamera] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [hasAutoOpened, setHasAutoOpened] = useState(false);
    const fileInputRef = useRef(null);
    const MAX_PHOTOS = 5;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const ACCEPTED_FORMATS = ["image/jpeg", "image/png", "image/webp"];

    // Auto-open camera ONLY on first mount of this step (before any photos are taken)
    useEffect(() => {
      // Only auto-open if:
      // 1. We haven't auto-opened before
      // 2. There are no photos yet
      // 3. We haven't reached max photos
      if (!hasAutoOpened && photos.length === 0 && photos.length < MAX_PHOTOS) {
        const timer = setTimeout(() => {
          setShowCamera(true);
          setHasAutoOpened(true); // Mark as auto-opened so it won't open again
        }, 300); // Small delay for smooth transition
        return () => clearTimeout(timer);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount - never auto-open again after this

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
            <motion.button
              onClick={() => setStage(STAGES.SELECTION)}
              className="flex-1 px-4 md:px-6 py-3 md:py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm md:text-base hover:bg-gray-50 transition-all duration-300 shadow-sm"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              ← Back to Items
            </motion.button>
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
  };

  // Step indicator component
  const StepIndicator = () => {
    if (isViewMode || isAlreadyPacked) return null;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 md:mb-8"
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full font-semibold text-sm md:text-base transition-all ${
                  stage === STAGES.SELECTION
                    ? "bg-blue-600 text-white shadow-lg scale-110"
                    : "bg-green-500 text-white"
                }`}
              >
                {stage === STAGES.SELECTION ? "1" : <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />}
              </div>
              <div className="flex-1">
                <p className="text-xs md:text-sm font-semibold text-gray-900">Step 1: Item Selection</p>
                <p className="text-xs text-gray-500 hidden sm:block">Select items to pack</p>
              </div>
            </div>

            {/* Connector Line */}
            <div className={`flex-1 h-0.5 mx-2 md:mx-4 transition-all ${
              stage === STAGES.PHOTO_UPLOAD ? "bg-green-500" : "bg-gray-300"
            }`} />

            {/* Step 2 */}
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              <div
                className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full font-semibold text-sm md:text-base transition-all ${
                  stage === STAGES.PHOTO_UPLOAD
                    ? "bg-blue-600 text-white shadow-lg scale-110"
                    : stage === STAGES.SELECTION
                    ? "bg-gray-200 text-gray-500"
                    : "bg-green-500 text-white"
                }`}
              >
                {stage === STAGES.PHOTO_UPLOAD ? "2" : stage === STAGES.SELECTION ? "2" : <CheckCircle className="w-5 h-5 md:w-6 md:h-6" />}
              </div>
              <div className="flex-1">
                <p className="text-xs md:text-sm font-semibold text-gray-900">Step 2: Photo Upload</p>
                <p className="text-xs text-gray-500 hidden sm:block">Capture packing photos</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1550px] mx-auto px-3 md:px-4 lg:px-6 py-4 md:py-6">
        <FulfillmentBreadcrumb />
        
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(isViewMode ? "/fulfillment/packing/list" : "/fulfillment/packing")}
          className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300 mb-4 md:mb-6 text-xs md:text-sm font-medium shadow-md"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
          <span>{isViewMode ? "Back to Packing List" : "Back to Packing"}</span>
        </motion.button>

        {/* Step Indicator */}
        <StepIndicator />

        {/* Order Info Card - Only show in Step 1 */}
        {!isViewMode && !isAlreadyPacked && stage === STAGES.SELECTION && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 md:mb-6"
          >
            <OrderInfoCard order={order} />
          </motion.div>
        )}

        {/* Warning Banner for Already Packed Orders */}
        {isAlreadyPacked && packingInfo && !isViewMode && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-amber-50 border-2 border-amber-200 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  This Order Has Already Been Packed
                </h3>
                <div className="bg-white rounded-lg p-4 mb-4 border border-amber-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Packing ID</p>
                      <p className="text-sm font-semibold text-gray-900">{packingInfo.packingId || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                      <StatusBadge status={packingInfo.status} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Packed By</p>
                      <p className="text-sm font-semibold text-gray-900">{packingInfo.packedBy || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Packed At</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {packingInfo.packedAt ? new Date(packingInfo.packedAt).toLocaleString() : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (packingInfo.packingId) {
                      navigate("/fulfillment/packing/list", {
                        state: { packingId: packingInfo.packingId },
                      });
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  View Packing Details
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {isViewMode && packingData && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-blue-100 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Packing Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
                    <StatusBadge status={packingData.status} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Items Packed</p>
                    <p className="text-sm font-semibold text-gray-900">{packingData.selectedItems?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Deselected Items</p>
                    <p className="text-sm font-semibold text-amber-600">{packingData.deselectedItemsCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Photos</p>
                    <p className="text-sm font-semibold text-gray-900">{packingData.photoUrls?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Packed By</p>
                    <p className="text-sm font-semibold text-gray-900">{packingData.packedBy?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Packed At</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {packingData.packedAt ? new Date(packingData.packedAt).toLocaleString() : "N/A"}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-white to-green-50 rounded-xl border-2 border-green-100 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
                    <p className="text-sm font-semibold text-gray-900">{packingData.customerName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-gray-900">{packingData.customerEmail || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Phone</p>
                    <p className="text-sm text-gray-900">{packingData.phone || "N/A"}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {packingData.shipTo && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-white to-purple-50 rounded-xl border-2 border-purple-100 shadow-lg p-6 mb-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
                    <p className="text-sm font-semibold text-gray-900">{packingData.shipTo.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Phone</p>
                    <p className="text-sm text-gray-900">{packingData.shipTo.phone || "N/A"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Address</p>
                    <p className="text-sm text-gray-900">
                      {packingData.shipTo.address1 || ""}
                      {packingData.shipTo.address2 ? `, ${packingData.shipTo.address2}` : ""}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">City, State, ZIP</p>
                    <p className="text-sm text-gray-900">
                      {packingData.shipTo.city}, {packingData.shipTo.state} {packingData.shipTo.zip}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Country</p>
                    <p className="text-sm text-gray-900">{packingData.shipTo.country || "N/A"}</p>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-white to-emerald-50 rounded-xl border-2 border-emerald-100 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Order Financials</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <p className="text-xs font-medium text-gray-500">Subtotal</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {packingData.currency || "USD"} {packingData.subtotal?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs font-medium text-gray-500">Tax</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {packingData.currency || "USD"} {packingData.tax?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs font-medium text-gray-500">Shipping</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {packingData.currency || "USD"} {packingData.shipping?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  {packingData.discount > 0 && (
                    <div className="flex justify-between">
                      <p className="text-xs font-medium text-gray-500">Discount</p>
                      <p className="text-sm font-semibold text-red-600">
                        -{packingData.currency || "USD"} {packingData.discount?.toFixed(2) || "0.00"}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">Total</p>
                    <p className="text-base font-bold text-blue-600">
                      {packingData.currency || "USD"} {packingData.totalValue?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-white to-orange-50 rounded-xl border-2 border-orange-100 shadow-lg p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Order Status</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Order Status</p>
                    <p className="text-sm font-semibold text-gray-900">{packingData.orderStatus || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Fulfillment Status</p>
                    <StatusBadge status={packingData.fulfillmentStatus || packingData.status} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Order Created</p>
                    <p className="text-sm text-gray-900">
                      {packingData.orderCreatedAt ? new Date(packingData.orderCreatedAt).toLocaleString() : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Order Updated</p>
                    <p className="text-sm text-gray-900">
                      {packingData.orderUpdatedAt ? new Date(packingData.orderUpdatedAt).toLocaleString() : "N/A"}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {packingData.orderLines && packingData.orderLines.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6 mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Package className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
                  </div>
                  {isViewMode && (
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span className="text-gray-600">
                          Packed:{" "}
                          <span className="font-semibold text-gray-900">
                            {packingData.orderLines.filter((item) => item.isSelected === true).length}
                          </span>
                        </span>
                      </div>
                      {packingData.deselectedItemsCount > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                          <span className="text-gray-600">
                            Deselected:{" "}
                            <span className="font-semibold text-gray-900">
                              {packingData.deselectedItemsCount ||
                                packingData.orderLines.filter((item) => item.isDeselected === true).length}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {packingData.orderLines.map((item, index) => {
                        const isSelected = item.isSelected === true;
                        const isDeselected = item.isDeselected === true;
                        return (
                          <tr
                            key={item.id || index}
                            className={`hover:bg-gray-50 ${
                              isDeselected
                                ? "bg-amber-50/50 border-l-4 border-l-amber-400"
                                : isSelected
                                ? "bg-green-50/30 border-l-4 border-l-green-400"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <span>✅</span>
                                  <span>Packed</span>
                                </span>
                              ) : isDeselected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                  <span>❌</span>
                                  <span>Deselected</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                  <span>—</span>
                                  <span>N/A</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                {item.image && (
                                  <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-full object-cover rounded"
                                    />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.name || "N/A"}</p>
                                  {item.variant && <p className="text-xs text-gray-500">{item.variant}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-900">{item.sku || "N/A"}</p>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="text-sm font-medium text-gray-900">{item.quantity || 0}</p>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-900">
                                {packingData.currency || "USD"} {item.price?.toFixed(2) || "0.00"}
                              </p>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="text-sm font-semibold text-gray-900">
                                {packingData.currency || "USD"} {item.total?.toFixed(2) || "0.00"}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-4">
                  {packingData.orderLines.map((item, index) => {
                    const isSelected = item.isSelected === true;
                    const isDeselected = item.isDeselected === true;
                    return (
                      <motion.div
                        key={item.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`rounded-lg border-2 p-4 shadow-sm ${
                          isDeselected
                            ? "bg-amber-50/50 border-amber-300"
                            : isSelected
                            ? "bg-green-50/30 border-green-300"
                            : "bg-white border-gray-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            {item.image && (
                              <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 mb-1">{item.name || "N/A"}</h4>
                              {item.variant && <p className="text-xs text-gray-500 mb-2">{item.variant}</p>}
                            </div>
                          </div>
                          <div>
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <span>✅</span>
                                <span>Packed</span>
                              </span>
                            ) : isDeselected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <span>❌</span>
                                <span>Deselected</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">SKU</p>
                            <p className="text-sm font-semibold text-gray-900">{item.sku || "N/A"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Quantity</p>
                            <p className="text-sm font-semibold text-gray-900">{item.quantity || 0}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Price</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {packingData.currency || "USD"} {item.price?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Total</p>
                            <p className="text-sm font-semibold text-blue-600">
                              {packingData.currency || "USD"} {item.total?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
            </motion.div>
          )}

          {packingData.photoUrls && packingData.photoUrls.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-gradient-to-br from-white to-pink-50 rounded-xl border-2 border-pink-100 shadow-lg p-6 mb-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-pink-100 rounded-lg">
                  <Package className="w-5 h-5 text-pink-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Packing Photos</h3>
              </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {packingData.photoUrls.map((url, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-100 cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => {
                        setSelectedImage(url);
                        setIsImageModalOpen(true);
                      }}
                    >
                      <img
                        src={url}
                        alt={`Packing photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

        {/* Step 1: Item Selection */}
        {!isViewMode && !isAlreadyPacked && stage === STAGES.SELECTION && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 md:space-y-6"
          >
            <PackingOrderLines
              orderLines={orderLines}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
              <motion.button
                onClick={() => navigate("/fulfillment/packing")}
                className="flex-1 px-4 md:px-6 py-3 md:py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm md:text-base hover:bg-gray-50 transition-all duration-300 shadow-sm"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleContinueToPhotos}
                disabled={!canContinueToPhotos}
                className={`flex-1 px-4 md:px-6 py-3 md:py-3.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg ${
                  canContinueToPhotos
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                whileHover={canContinueToPhotos ? { scale: 1.01 } : {}}
                whileTap={canContinueToPhotos ? { scale: 0.99 } : {}}
              >
                Continue to Photos →
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Photo Upload */}
        {!isViewMode && !isAlreadyPacked && stage === STAGES.PHOTO_UPLOAD && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 md:space-y-6"
          >
            {/* Order Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 md:p-6"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-1">
                    Order {order.orderNumber}
                  </h3>
                  <p className="text-xs md:text-sm text-gray-600">
                    {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
                  </p>
                </div>
                <button
                  onClick={() => setStage(STAGES.SELECTION)}
                  className="text-sm md:text-base text-blue-600 hover:text-blue-700 font-medium flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Edit Items
                </button>
              </div>
            </motion.div>

            {/* Photo Upload Component - Camera opens automatically */}
            <PhotoUploadStepComponent
              onPhotosChange={setPhotos}
              photos={photos}
              onComplete={handleCompletePacking}
              canComplete={canCompletePacking}
              submitting={submitting}
            />
          </motion.div>
        )}

        <ImageModal
          imageUrl={selectedImage}
          isOpen={isImageModalOpen}
          onClose={() => {
            setIsImageModalOpen(false);
            setSelectedImage(null);
          }}
        />
      </div>
    </div>
  );
}

