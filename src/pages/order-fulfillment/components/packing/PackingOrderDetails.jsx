import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { motion } from "framer-motion";
import OrderInfoCard from "../common/OrderInfoCard";
import PackingOrderLines from "./PackingOrderLines";
import ImageModal from "../common/ImageModal";
import StatusBadge from "../common/StatusBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import CustomerInfoCard from "../common/CustomerInfoCard";
import ShippingAddressCard from "../common/ShippingAddressCard";
import OrderFinancialsCard from "../common/OrderFinancialsCard";
import OrderTimelineCard from "../common/OrderTimelineCard";
import OrderItemsDisplay from "../common/OrderItemsDisplay";
import PackingInfoCard from "./PackingInfoCard";
import StepIndicator from "./StepIndicator";
import PhotoUploadStep from "./PhotoUploadStep";
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
        <StepIndicator 
          stage={stage} 
          isViewMode={isViewMode} 
          isAlreadyPacked={isAlreadyPacked} 
        />

        {/* Mobile-first layout: Order lines on top, Order Info below */}
        {!isViewMode && !isAlreadyPacked && stage === STAGES.SELECTION && (
          <div className="flex flex-col lg:flex-col-reverse gap-4 md:gap-6">
            {/* Order Lines - Show first on mobile, second on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="order-1 lg:order-2"
            >
              <PackingOrderLines
                orderLines={orderLines}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
              />
            </motion.div>

            {/* Order Info Card - Show second on mobile, first on desktop */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="order-2 lg:order-1"
            >
              <OrderInfoCard order={order} />
            </motion.div>
          </div>
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
            {/* Mobile-first: Order Lines on top, other info below */}
            <div className="flex flex-col lg:flex-col-reverse gap-6 mb-6">
              {/* Order Lines - First on mobile, last on desktop */}
              <div className="order-1 lg:order-2">
                <OrderItemsDisplay
                  items={packingData.orderLines}
                  currency={packingData.currency}
                  showStatus={true}
                  packedCount={packingData.orderLines.filter((item) => item.isSelected === true).length}
                  deselectedCount={packingData.deselectedItemsCount}
                />
              </div>

              {/* Other Info Sections - Second on mobile, first on desktop */}
              <div className="order-2 lg:order-1 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <PackingInfoCard
                    status={packingData.status}
                    selectedItemsCount={packingData.selectedItems?.length || 0}
                    deselectedItemsCount={packingData.deselectedItemsCount || 0}
                    photosCount={packingData.photoUrls?.length || 0}
                    packedBy={packingData.packedBy?.name}
                    packedAt={packingData.packedAt}
                  />
                  <CustomerInfoCard
                    customerName={packingData.customerName}
                    customerEmail={packingData.customerEmail}
                    phone={packingData.phone}
                  />
                </div>

                <ShippingAddressCard shipTo={packingData.shipTo} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <OrderFinancialsCard
                    currency={packingData.currency}
                    subtotal={packingData.subtotal}
                    tax={packingData.tax}
                    shipping={packingData.shipping}
                    discount={packingData.discount}
                    totalValue={packingData.totalValue}
                  />
                  <OrderTimelineCard
                    createdAt={packingData.orderCreatedAt}
                    updatedAt={packingData.orderUpdatedAt}
                    orderStatus={packingData.orderStatus}
                    fulfillmentStatus={packingData.fulfillmentStatus || packingData.status}
                  />
                </div>
              </div>
            </div>

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

        {/* Step 1: Item Selection - Action Buttons */}
        {!isViewMode && !isAlreadyPacked && stage === STAGES.SELECTION && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 md:mt-6"
          >
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
            <PhotoUploadStep
              onPhotosChange={setPhotos}
              photos={photos}
              onComplete={handleCompletePacking}
              canComplete={canCompletePacking}
              submitting={submitting}
              onBack={() => setStage(STAGES.SELECTION)}
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

