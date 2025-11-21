import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Package,
  Edit,
  Trash2,
  CheckCircle,
} from "lucide-react";
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
import OrderDetailsSkeleton from "../common/OrderDetailsSkeleton";
import EditPackingModal from "./EditPackingModal";
import {
  getOrderDetails,
  createPacking,
  getPackingOrderDetails,
  updatePackingOrder,
  deletePackingOrder,
  searchOrder,
} from "../../../../api/fulfillment";
import Swal from "sweetalert2";
import { message } from "antd";

const STAGES = {
  SELECTION: "selection",
  PHOTO_UPLOAD: "photo_upload",
};

export default function PackingOrderDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId } = useParams();
  const [stage, setStage] = useState(STAGES.PHOTO_UPLOAD); // Start with photo upload
  const [selectedItems, setSelectedItems] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [orderData, setOrderData] = useState(null);
  const [missingProducts, setMissingProducts] = useState([]); // Store missing products during packing
  const [packingData, setPackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isAlreadyPacked, setIsAlreadyPacked] = useState(false);

  // Get storage key based on orderId
  const getStorageKey = () => {
    if (isViewMode) return null; // Don't use storage in view mode
    
    const orderIdFromParams = orderId;
    const orderIdFromState = location.state?.orderId || location.state?.searchData?.orderId;
    const platform = location.state?.platform;
    const identifier = orderIdFromParams || orderIdFromState;
    if (!identifier) return null;
    return `packing_${identifier}_${platform || 'unknown'}`;
  };

  // Convert File to base64 for storage
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Convert base64 back to File
  const base64ToFile = (base64, filename) => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Load persisted data from localStorage on mount
  useEffect(() => {
    if (isViewMode) return; // Don't load persisted data in view mode
    
    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      const persisted = localStorage.getItem(storageKey);
      if (persisted) {
        const data = JSON.parse(persisted);
        
        // Restore stage
        if (data.stage) {
          setStage(data.stage);
        }
        
        // Restore selected items
        if (data.selectedItems && Array.isArray(data.selectedItems)) {
          setSelectedItems(data.selectedItems);
        }
        
        // Restore missing products
        if (data.missingProducts && Array.isArray(data.missingProducts)) {
          setMissingProducts(data.missingProducts);
        }
        
        // Restore photos (convert base64 back to File objects)
        if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
          Promise.all(
            data.photos.map(async (photoData) => {
              if (photoData.base64) {
                try {
                  return await base64ToFile(photoData.base64, photoData.name || 'photo.jpg');
                } catch (error) {
                  console.error("Error converting base64 to file:", error);
                  return null;
                }
              }
              return null;
            })
          ).then((restoredPhotos) => {
            const validPhotos = restoredPhotos.filter(p => p !== null);
            if (validPhotos.length > 0) {
              setPhotos(validPhotos);
            }
          });
        }
      }
    } catch (error) {
      console.error("Error loading persisted data:", error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (isViewMode) return; // Don't save in view mode
    if (!orderData) return; // Don't save until order data is loaded
    
    const storageKey = getStorageKey();
    if (!storageKey) return;

    // Save photos, selectedItems, missingProducts, and stage
    const saveData = async () => {
      try {
        // Convert photos to base64 for storage
        const photosData = await Promise.all(
          photos.map(async (photo) => {
            if (photo instanceof File) {
              const base64 = await fileToBase64(photo);
              return {
                base64,
                name: photo.name,
                type: photo.type,
                size: photo.size,
              };
            }
            return photo; // Already stored format
          })
        );

        const dataToSave = {
          photos: photosData,
          selectedItems,
          missingProducts,
          stage,
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(dataToSave));
      } catch (error) {
        console.error("Error saving persisted data:", error);
      }
    };

    // Debounce saves to avoid too frequent writes
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [photos, selectedItems, missingProducts, stage, isViewMode, orderData]);

  // Clear persisted data
  const clearPersistedData = () => {
    const storageKey = getStorageKey();
    if (!storageKey) return;
    
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Error clearing persisted data:", error);
    }
  };
  const [packingInfo, setPackingInfo] = useState(null);
  const [packingId, setPackingId] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo({ top: 0, behavior: "smooth" });

    const loadOrderDetails = async () => {
      const packingId = location.state?.packingId;
      const autoOpenCamera = location.state?.autoOpenCamera;

      setLoading(true);
      setError(null);

      try {
        if (packingId) {
          setIsViewMode(true);
          setPackingId(packingId);
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
          const isOptimistic = searchData?.isOptimistic;

          let orderIdToUse;

          // For optimistic navigation, use barcode from state first (most reliable), then URL
          // State barcode is set directly from scanner, URL might have encoding issues
          if (isOptimistic) {
            // Priority: searchData.barcode (from state) > orderId from URL
            orderIdToUse = searchData?.barcode || decodeURIComponent(orderId || "");
          } else if (platform === "shopify") {
            orderIdToUse = searchData?.orderId || location.state?.orderId;
          } else {
            orderIdToUse = decodeURIComponent(orderId);
          }

          if (!orderIdToUse) {
            throw new Error("Order ID is missing");
          }

          // For optimistic navigation, platform will be determined after search
          if (!isOptimistic && !platform) {
            setError("Platform information is missing");
            setLoading(false);
            return;
          }

          // If autoOpenCamera flag is set, immediately go to photo upload stage
          // Don't wait for order details - load them in background
          if (autoOpenCamera) {
            setStage(STAGES.PHOTO_UPLOAD);
            setLoading(false); // Don't block UI, allow camera to open immediately

            // For optimistic navigation, search order by barcode in background
            const isOptimistic = location.state?.searchData?.isOptimistic;
            if (isOptimistic && orderIdToUse) {
              // Add small delay and retry logic for better reliability
              const searchWithRetry = async (query, retries = 3, delay = 300) => {
                // Ensure query is a clean string
                const cleanQuery = String(query).trim();
                
                for (let attempt = 0; attempt < retries; attempt++) {
                  try {
                    // Add delay before each attempt (exponential backoff)
                    if (attempt > 0) {
                      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
                    } else {
                      // First attempt: small initial delay to ensure API is ready
                      await new Promise(resolve => setTimeout(resolve, delay));
                    }
                    
                    const searchResult = await searchOrder(cleanQuery);
                    
                    if (searchResult.success && searchResult.data) {
                      const { orderId, orderNumber, platform: foundPlatform } = searchResult.data;
                      const finalOrderId = orderId || orderNumber || query;
                      const finalPlatform = foundPlatform || platform;
                      
                      if (!finalPlatform) {
                        throw new Error("Platform not found in search result");
                      }
                      
                      // Now get full order details
                      const result = await getOrderDetails(finalOrderId, finalPlatform);
                      
                      if (result.success && result.data) {
                        setOrderData(result.data);
                        // Select all items by default
                        setSelectedItems(result.data.orderLines?.map((item) => item.id) || []);
                        setError(null); // Clear any previous errors
                        return; // Success, exit retry loop
                      }
                    }
                    throw new Error("Order not found");
                  } catch (error) {
                    
                    // If this is the last attempt, set error (but don't block UI)
                    if (attempt === retries - 1) {
                      console.error("Error loading order details (optimistic):", error);
                      // Only set error if we're not in photo upload stage (user might still be taking photos)
                      // Error will be shown when user tries to proceed
                      setError(error.message || "Failed to load order details");
                    }
                    // Otherwise, continue to next retry
                  }
                }
              };
              
              // Start search with retry in background (non-blocking)
              searchWithRetry(orderIdToUse).catch((error) => {
                console.error("All search retries failed:", error);
              });
            } else {
              // Load order details in background (non-blocking)
              getOrderDetails(orderIdToUse, platform)
              .then((result) => {
                if (result.success && result.data) {
                  setOrderData(result.data);

                  // Check if order is already packed
                  const isPacked =
                    result.data.isAlreadyPacked ||
                    alreadyPackedFromSearch ||
                    false;
                  const packingInfoData =
                    result.data.packingInfo || packingInfoFromSearch || null;

                  setIsAlreadyPacked(isPacked);
                  setPackingInfo(packingInfoData);

                  // If already packed, switch to view mode
                  if (isPacked && packingInfoData) {
                    setIsViewMode(true);
                    setPackingId(packingInfoData.packingId);
                    // Load packing details
                    getPackingOrderDetails(packingInfoData.packingId)
                      .then((packingResult) => {
                        if (packingResult.success && packingResult.data) {
                          setPackingData(packingResult.data);
                          setSelectedItems(
                            packingResult.data.selectedItems || []
                          );
                        }
                      })
                      .catch((err) => {
                        console.error("Error loading packing details:", err);
                      });
                  } else {
                    // Select all items by default
                    setSelectedItems(
                      result.data.orderLines.map((item) => item.id)
                    );
                  }
                }
              })
              .catch((error) => {
                console.error(
                  "Error loading order details in background:",
                  error
                );
                // Don't show error immediately, just log it
                // User can still take photos, error will show if they try to proceed
                setError(error.message || "Failed to load order details");
              });
            }

            return; // Exit early, don't wait for order details
          }

          // If not autoOpenCamera, load order details normally (blocking)
          const result = await getOrderDetails(orderIdToUse, platform);

          if (result.success && result.data) {
            setOrderData(result.data);

            // Check if order is already packed
            const isPacked =
              result.data.isAlreadyPacked || alreadyPackedFromSearch || false;
            const packingInfoData =
              result.data.packingInfo || packingInfoFromSearch || null;

            setIsAlreadyPacked(isPacked);
            setPackingInfo(packingInfoData);

            // If already packed, switch to view mode
            if (isPacked && packingInfoData) {
              setIsViewMode(true);
              setPackingId(packingInfoData.packingId);
              // Load packing details
              try {
                const packingResult = await getPackingOrderDetails(
                  packingInfoData.packingId
                );
                if (packingResult.success && packingResult.data) {
                  setPackingData(packingResult.data);
                  setSelectedItems(packingResult.data.selectedItems || []);
                }
              } catch (err) {
                console.error("Error loading packing details:", err);
              }
            } else {
              // Select all items by default
              setSelectedItems(result.data.orderLines.map((item) => item.id));
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

  // Don't show error if we're in autoOpenCamera mode and on photo upload stage
  // Order details are loading in background, allow camera to open immediately
  const isAutoOpenCameraMode = location.state?.autoOpenCamera && stage === STAGES.PHOTO_UPLOAD;
  const shouldShowError = error && !isAutoOpenCameraMode;
  const shouldShowNotFound = !loading && !orderData && !packingData && !isAutoOpenCameraMode;

  if (shouldShowError || shouldShowNotFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 font-medium mb-4">
              {error || "Details not found"}
            </p>
            <button
              onClick={() =>
                navigate(
                  isViewMode
                    ? "/fulfillment/packing/list"
                    : "/fulfillment/packing"
                )
              }
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isViewMode ? "Back to Packing List" : "Back to Packing"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only create order object if data is available
  const order = loading
    ? null
    : isViewMode
    ? {
        orderNumber: packingData?.orderNumber || packingData?.orderId || "N/A",
        customerName: packingData?.customerName || "N/A",
        platform: packingData?.platform,
        shipTo: packingData?.shipTo
          ? `${packingData.shipTo.address1}${
              packingData.shipTo.address2
                ? `, ${packingData.shipTo.address2}`
                : ""
            }, ${packingData.shipTo.city}, ${packingData.shipTo.state} ${
              packingData.shipTo.zip
            }, ${packingData.shipTo.country}`
          : "N/A",
        totalValue: packingData?.totalValue || 0,
      }
    : {
        orderNumber: orderData?.orderNumber || orderData?.orderId || "N/A",
        customerName: orderData?.customerName || "N/A",
        platform: orderData?.platform,
        shipTo: orderData?.shipTo
          ? `${orderData.shipTo.address1}${
              orderData.shipTo.address2 ? `, ${orderData.shipTo.address2}` : ""
            }, ${orderData.shipTo.city}, ${orderData.shipTo.state} ${
              orderData.shipTo.zip
            }, ${orderData.shipTo.country}`
          : "N/A",
        totalValue: orderData?.totalValue || 0,
      };

  const orderLines = loading
    ? []
    : isViewMode
    ? packingData?.orderLines || []
    : orderData?.orderLines || [];

  const handleContinueToItems = (force = false) => {
    // If force is true, proceed even if photos.length is 0 (photos were just saved but state hasn't updated yet)
    // Otherwise, check that photos exist
    if (force || photos.length > 0) {
      setStage(STAGES.SELECTION);
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

    // Fix: Use orderData.platform as fallback for optimistic navigation
    // This ensures platform is available even when location.state.platform is null
    const searchData = location.state?.searchData;
    const platform = location.state?.platform || orderData?.platform;
    
    // Validate platform exists before proceeding
    if (!platform) {
      Swal.fire({
        icon: "error",
        title: "Platform Required",
        text: "Order details are still loading. Please wait a moment and try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    let orderIdToUse;

    if (platform === "shopify") {
      orderIdToUse = searchData?.orderId || location.state?.orderId;
    } else {
      orderIdToUse = decodeURIComponent(orderId);
    }

    const orderNumber = orderData?.orderNumber || orderData?.orderId;
    const allItemIds = orderLines.map((item) => String(item.id));
    const selectedItemsNormalized = selectedItems.map((id) => String(id));
    const deselectedItems = allItemIds.filter(
      (id) => !selectedItemsNormalized.includes(String(id))
    );
    
    // Transform deselectedItemsData to match API specification
    // Each item must have: id, name, quantity, price (required)
    // Optional: total, productId, sku, variant, image
    const deselectedItemsData = orderLines
      .filter((item) => deselectedItems.includes(String(item.id)))
      .map((item) => {
        // Calculate total if not present
        const total = item.total ?? (item.quantity && item.price ? item.quantity * item.price : 0);
        
        // Normalize variant: ensure it's an object or null, not a string
        let normalizedVariant = null;
        if (item.variant) {
          if (typeof item.variant === 'object' && item.variant !== null) {
            normalizedVariant = item.variant;
          } else if (typeof item.variant === 'string' && item.variant.trim() !== '') {
            // If variant is a string, convert to object or set to null
            normalizedVariant = null; // Backend expects object or null
          }
        }
        
        return {
          id: String(item.id), // Required - must match deselectedItems ID
          name: item.name || "", // Required
          quantity: Number(item.quantity) || 1, // Required
          price: Number(item.price) || 0, // Required
          total: Number(total), // Optional (calculated if missing)
          productId: item.productId || "", // Optional (empty string if missing)
          sku: item.sku || "", // Optional (empty string if missing)
          variant: normalizedVariant, // Optional (object or null, not string)
          image: item.image || null, // Optional (null if missing)
        };
      });
    
    const photoFiles = photos.map((photo) => photo.file);


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
        missingProducts: missingProducts.map(mp => ({
          lineItemId: mp.lineItemId,
          productName: mp.productName,
          notes: mp.notes || null,
        })),
      });

      if (result.success) {
        const status = result.data.status;
        const dropshipCreated = result.data.dropshipCreated; // Can be true, false, or undefined
        const dropshipId = result.data.dropshipId; // Only present if dropshipCreated is true
        const deselectedItemsCount = result.data.deselectedItemsCount || 0;
        const missingProductsCount = result.data.missingProductsCount || 0;

        let message = `Order ${orderNumber} has been packed successfully. Status: ${status}`;
        
        // Handle dropship creation status
        if (deselectedItemsCount > 0) {
          if (dropshipCreated === true && dropshipId) {
            message += ` Dropship order ${dropshipId} created for ${deselectedItemsCount} deselected item(s).`;
          } else if (dropshipCreated === false) {
            message += ` ${deselectedItemsCount} item(s) were deselected but dropship creation failed.`;
          } else {
            // dropshipCreated is undefined (shouldn't happen if deselectedItemsCount > 0, but handle it)
            message += ` ${deselectedItemsCount} item(s) were deselected.`;
          }
        }
        
        // Handle missing products count
        if (missingProductsCount > 0) {
          message += ` ${missingProductsCount} missing product(s) recorded.`;
        }

        await Swal.fire({
          icon: "success",
          title: "Packing Complete!",
          text: message,
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });

        // Clear persisted data after successful packing creation
        clearPersistedData();
        
        // Auto-redirect to landing page which will auto-open scanner for next order
        navigate("/fulfillment/packing");
      }
    } catch (error) {
      console.error("Error creating packing:", error);
      const errorMessage =
        error.details ||
        error.message ||
        "Failed to create packing record. Please try again.";

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

  // Fix: Ensure orderData and platform are available before allowing packing creation
  // This prevents "Platform is required" error for optimistic navigation
  const canCompletePacking = 
    photos.length >= 1 && 
    selectedItems.length > 0 && 
    orderData && 
    (location.state?.platform || orderData?.platform);

  const handleEditPacking = () => {
    if (!packingData) return;
    setEditModalOpen(true);
  };

  const handleEditSuccess = async (updatedData) => {
    // Reload packing details to get updated data
    if (packingId) {
      try {
        const packingResult = await getPackingOrderDetails(packingId);
        if (packingResult.success && packingResult.data) {
          setPackingData(packingResult.data);
        }
      } catch (error) {
        console.error("Error reloading packing details:", error);
      }
    }
  };

  const handleDeletePacking = async () => {
    if (!packingId) return;

    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Packing Order?",
      text: "Are you sure you want to delete this packing order? This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    });

    if (result.isConfirmed) {
      try {
        const deleteResult = await deletePackingOrder(packingId);

        if (deleteResult.success) {
          await Swal.fire({
            icon: "success",
            title: "Packing Order Deleted",
            text: "The packing order has been deleted successfully.",
            confirmButtonColor: "#2563eb",
            confirmButtonText: "OK",
          });
          navigate("/fulfillment/packing/list");
        }
      } catch (error) {
        console.error("Error deleting packing order:", error);
        Swal.fire({
          icon: "error",
          title: "Failed to Delete",
          text:
            error.message ||
            "Unable to delete packing order. Please try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1550px] mx-auto sm:px-3 md:px-4 lg:px-6 sm:py-4 md:py-6">
        <FulfillmentBreadcrumb />

        <div className="flex items-center justify-between mb-4 md:mb-6">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() =>
              navigate(
                isViewMode
                  ? "/fulfillment/packing/list"
                  : "/fulfillment/packing"
              )
            }
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300 text-xs md:text-sm font-medium shadow-md"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
            <span>
              {isViewMode ? "Back to Packing List" : "Back to Packing"}
            </span>
          </motion.button>

          {/* Edit and Delete Buttons - Only show in view mode */}
          {isViewMode && packingId && (
            <div className="flex items-center gap-2">
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleEditPacking}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 text-xs md:text-sm font-medium shadow-md"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Edit className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </motion.button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleDeletePacking}
                className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-300 text-xs md:text-sm font-medium shadow-md"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </motion.button>
            </div>
          )}
        </div>

        {/* Step Indicator */}
        <StepIndicator
          stage={stage}
          isViewMode={isViewMode}
          isAlreadyPacked={isAlreadyPacked}
        />

        {loading ? (
          <OrderDetailsSkeleton />
        ) : (
          <>
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
                    missingProducts={missingProducts}
                    onMissingProductAdd={(lineItemId, productName, notes) => {
                      const newMissingProduct = {
                        id: `temp-${Date.now()}-${Math.random()}`,
                        lineItemId,
                        productName,
                        notes: notes || null,
                      };
                      setMissingProducts([...missingProducts, newMissingProduct]);
                      
                      // Show success toast notification
                      message.success(`"${productName}" has been added. It will be saved when you create the packing order.`);
                    }}
                    onMissingProductDelete={(missingProductId) => {
                      const deletedProduct = missingProducts.find(mp => mp.id === missingProductId);
                      setMissingProducts(missingProducts.filter(mp => mp.id !== missingProductId));
                      
                      // Show success toast notification
                      if (deletedProduct) {
                        message.success(`"${deletedProduct.productName}" has been removed.`);
                      }
                    }}
                  />
                </motion.div>

                {/* Order Info Card - Show second on mobile, first on desktop */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="order-2 lg:order-1"
                >
                  {order && <OrderInfoCard order={order} />}
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
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Packing ID
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {packingInfo.packingId || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Status
                          </p>
                          <StatusBadge status={packingInfo.status} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Packed By
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {packingInfo.packedBy || "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Packed At
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {packingInfo.packedAt
                              ? new Date(packingInfo.packedAt).toLocaleString()
                              : "N/A"}
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
                      packedCount={
                        packingData.orderLines.filter(
                          (item) => item.isSelected === true
                        ).length
                      }
                      deselectedCount={packingData.deselectedItemsCount}
                      packingId={packingId}
                      isViewMode={isViewMode}
                      // Remove missing products from view mode
                      onMissingProductAdd={null}
                      onMissingProductDelete={null}
                    />
                  </div>

                  {/* Other Info Sections - Second on mobile, first on desktop */}
                  <div className="order-2 lg:order-1 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <PackingInfoCard
                        status={packingData.status}
                        selectedItemsCount={
                          packingData.selectedItems?.length || 0
                        }
                        deselectedItemsCount={
                          packingData.deselectedItemsCount || 0
                        }
                        photosCount={packingData.photoUrls?.length || 0}
                        packedBy={packingData.packedBy?.name}
                        packedAt={packingData.packedAt}
                      />
                      <CustomerInfoCard
                        customerName={
                          packingData.customerName || packingData.shipTo?.name
                        }
                        customerEmail={
                          packingData.customerEmail || packingData.shipTo?.email
                        }
                        phone={packingData.phone || packingData.shipTo?.phone}
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
                        fulfillmentStatus={
                          packingData.fulfillmentStatus || packingData.status
                        }
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
                      <h3 className="text-lg font-semibold text-gray-900">
                        Packing Photos
                      </h3>
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

            {/* Step 2: Item Selection - Action Buttons */}
            {!isViewMode && !isAlreadyPacked && stage === STAGES.SELECTION && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 md:mt-6"
              >
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 md:gap-4 pt-4">
                  <motion.button
                    onClick={() => setStage(STAGES.PHOTO_UPLOAD)}
                    className="flex-1 px-4 md:px-6 py-3 md:py-3.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold text-sm md:text-base hover:bg-gray-50 transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Photos
                  </motion.button>
                  <motion.button
                    onClick={handleCompletePacking}
                    disabled={!canCompletePacking || submitting}
                    className={`flex-1 px-4 md:px-6 py-3 md:py-3.5 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg flex items-center justify-center gap-2 ${
                      canCompletePacking && !submitting
                        ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    whileHover={
                      canCompletePacking && !submitting ? { scale: 1.01 } : {}
                    }
                    whileTap={
                      canCompletePacking && !submitting ? { scale: 0.99 } : {}
                    }
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Packing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Create Packing</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 1: Photo Upload */}
            {!isViewMode &&
              !isAlreadyPacked &&
              stage === STAGES.PHOTO_UPLOAD && (
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
                          Order{" "}
                          {order?.orderNumber ||
                            orderData?.orderNumber ||
                            location.state?.searchData?.orderNumber ||
                            "Loading..."}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-600">
                          Step 1: Upload packing photos
                          {!orderData && (
                            <span className="ml-2 text-blue-600">
                              (Loading order details in background...)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Photo Upload Component - Camera opens automatically */}
                  <PhotoUploadStep
                    onPhotosChange={setPhotos}
                    photos={photos}
                    onComplete={handleContinueToItems}
                    canComplete={photos.length > 0}
                    submitting={false}
                    onBack={null}
                    continueButtonText="Continue to Items"
                  />
                </motion.div>
              )}
          </>
        )}

        <ImageModal
          imageUrl={selectedImage}
          isOpen={isImageModalOpen}
          onClose={() => {
            setIsImageModalOpen(false);
            setSelectedImage(null);
          }}
        />

        {/* Edit Packing Modal */}
        {isViewMode && packingData && (
          <EditPackingModal
            open={editModalOpen}
            onCancel={() => setEditModalOpen(false)}
            packingData={packingData}
            onSuccess={handleEditSuccess}
          />
        )}
      </div>
    </div>
  );
}