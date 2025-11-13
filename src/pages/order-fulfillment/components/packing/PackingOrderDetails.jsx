import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle, Loader2, X, Package, MapPin, DollarSign, Clock } from "lucide-react";
import { motion } from "framer-motion";
import OrderInfoCard from "../common/OrderInfoCard";
import PackingOrderLines from "./PackingOrderLines";
import PackingPhotoUpload from "./PackingPhotoUpload";
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
            setSelectedItems(
              result.data.orderLines
                .filter((item) => item.isInStock)
                .map((item) => item.id)
            );
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
    const allItemIds = orderLines.map((item) => item.id);
    const outOfStockItems = allItemIds.filter((id) => !selectedItems.includes(id));
    const photoFiles = photos.map((photo) => photo.file);

    setSubmitting(true);

    try {
      const result = await createPacking({
        orderId: orderIdToUse,
        platform: platform,
        orderNumber: orderNumber,
        selectedItems: selectedItems,
        outOfStockItems: outOfStockItems,
        photos: photoFiles,
      });

      if (result.success) {
        const status = result.data.status;
        await Swal.fire({
          icon: "success",
          title: "Packing Complete!",
          text: `Order ${orderNumber} has been packed successfully. Status: ${status}`,
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
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-8">
        <FulfillmentBreadcrumb />
        
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(isViewMode ? "/fulfillment/packing/list" : "/fulfillment/packing")}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg hover:from-gray-800 hover:to-gray-900 transition-all duration-300 mb-6 text-sm font-medium shadow-md"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>{isViewMode ? "Back to Packing List" : "Back to Packing"}</span>
        </motion.button>

        <div className="mb-6">
          <OrderInfoCard order={order} />
        </div>

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
                    <p className="text-xs font-medium text-gray-500 mb-1">Out of Stock Items</p>
                    <p className="text-sm font-semibold text-amber-600">{packingData.outOfStockItems?.length || 0}</p>
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
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Package className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {packingData.orderLines.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-gray-50">
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
                          <td className="px-4 py-4 whitespace-nowrap">
                            {item.isInStock ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">
                                  In Stock{item.stockQuantity !== null ? ` (${item.stockQuantity})` : ""}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <X className="w-4 h-4" />
                                <span className="text-xs font-medium">Out of Stock</span>
                              </span>
                            )}
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-4">
                  {packingData.orderLines.map((item, index) => (
                    <motion.div
                      key={item.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3 mb-3">
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
                          <div className="flex items-center gap-2">
                            {item.isInStock ? (
                              <span className="inline-flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-medium">
                                  In Stock{item.stockQuantity !== null ? ` (${item.stockQuantity})` : ""}
                                </span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600">
                                <X className="w-4 h-4" />
                                <span className="text-xs font-medium">Out of Stock</span>
                              </span>
                            )}
                          </div>
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
                  ))}
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

        {!isViewMode && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <PackingOrderLines
                orderLines={orderLines}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-blue-200 shadow-lg p-6 sticky top-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        stage === STAGES.SELECTION
                          ? "bg-blue-600 text-white"
                          : "bg-green-500 text-white"
                      }`}
                    >
                      {stage === STAGES.SELECTION ? "1" : <CheckCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Stage 1: Item Selection</p>
                      <p className="text-xs text-gray-500">Select in-stock items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        stage === STAGES.PHOTO_UPLOAD
                          ? "bg-blue-600 text-white"
                          : stage === STAGES.SELECTION
                          ? "bg-gray-200 text-gray-500"
                          : "bg-green-500 text-white"
                      }`}
                    >
                      {stage === STAGES.PHOTO_UPLOAD ? "2" : stage === STAGES.SELECTION ? "2" : <CheckCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Stage 2: Photo Upload</p>
                      <p className="text-xs text-gray-500">Upload packing photos</p>
                    </div>
                  </div>
                </div>

                {stage === STAGES.SELECTION && (
                  <motion.button
                    onClick={handleContinueToPhotos}
                    disabled={!canContinueToPhotos}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 shadow-md ${
                      canContinueToPhotos
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    whileHover={canContinueToPhotos ? { scale: 1.02 } : {}}
                    whileTap={canContinueToPhotos ? { scale: 0.98 } : {}}
                  >
                    Continue to Packing Photos
                  </motion.button>
                )}

                {stage === STAGES.PHOTO_UPLOAD && (
                  <motion.button
                    onClick={handleCompletePacking}
                    disabled={!canCompletePacking || submitting}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-md ${
                      canCompletePacking && !submitting
                        ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                    whileHover={canCompletePacking && !submitting ? { scale: 1.02 } : {}}
                    whileTap={canCompletePacking && !submitting ? { scale: 0.98 } : {}}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creating Packing...</span>
                      </>
                    ) : (
                      "Complete Packing"
                    )}
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {!isViewMode && stage === STAGES.PHOTO_UPLOAD && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <PackingPhotoUpload onPhotosChange={setPhotos} />
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

