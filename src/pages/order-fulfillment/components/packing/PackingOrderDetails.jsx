import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import OrderInfoCard from "../common/OrderInfoCard";
import PackingOrderLines from "./PackingOrderLines";
import PackingPhotoUpload from "./PackingPhotoUpload";
import { getOrderDetails } from "../../../../api/fulfillment";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadOrderDetails = async () => {
      const searchData = location.state?.searchData;
      const platform = location.state?.platform;
      const stateOrderKey = location.state?.orderKey;

      if (!platform) {
        setError("Platform information is missing");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
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
      } catch (error) {
        console.error("Error loading order details:", error);
        setError(error.message || "Failed to load order details");

        Swal.fire({
          icon: "error",
          title: "Failed to Load Order",
          text: error.message || "Unable to fetch order details. Please try again.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        }).then(() => {
          navigate("/fulfillment/packing");
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

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 font-medium mb-4">
              {error || "Order not found"}
            </p>
            <button
              onClick={() => navigate("/fulfillment/packing")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Packing
            </button>
          </div>
        </div>
      </div>
    );
  }

  const order = {
    orderNumber: orderData.orderNumber || orderData.orderId,
    customerName: orderData.customerName,
    platform: orderData.platform,
    shipTo: orderData.shipTo
      ? `${orderData.shipTo.address1}${orderData.shipTo.address2 ? `, ${orderData.shipTo.address2}` : ""}, ${orderData.shipTo.city}, ${orderData.shipTo.state} ${orderData.shipTo.zip}, ${orderData.shipTo.country}`
      : "N/A",
    totalValue: orderData.totalValue,
  };

  const orderLines = orderData.orderLines || [];

  const handleContinueToPhotos = () => {
    if (selectedItems.length > 0) {
      setStage(STAGES.PHOTO_UPLOAD);
    }
  };

  const handleCompletePacking = () => {
    if (photos.length >= 1) {
      const hasUnselectedItems = selectedItems.length < orderLines.length;
      const status = hasUnselectedItems ? "Partially Fulfilled" : "Completely Fulfilled";
      
      navigate("/fulfillment/packing/list", {
        state: { message: `Order ${orderId} packed successfully. Status: ${status}` },
      });
    }
  };

  const canContinueToPhotos = selectedItems.length > 0;
  const canCompletePacking = photos.length >= 1;

  return (
    <div className="min-h-screen">
      <div className="max-w-[1550px] mx-auto">
        <button
          onClick={() => navigate("/fulfillment/packing")}
          className="flex items-center gap-2 px-4 py-2 bg-black/80 text-white rounded-lg hover:bg-black transition-colors mb-6 text-sm font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Packing</span>
        </button>

        <div className="mb-6">
          <OrderInfoCard order={order} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <PackingOrderLines
              orderLines={orderLines}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 sticky top-6">
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
                <button
                  onClick={handleContinueToPhotos}
                  disabled={!canContinueToPhotos}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    canContinueToPhotos
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Continue to Packing Photos
                </button>
              )}

              {stage === STAGES.PHOTO_UPLOAD && (
                <button
                  onClick={handleCompletePacking}
                  disabled={!canCompletePacking}
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    canCompletePacking
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Complete Packing
                </button>
              )}
            </div>
          </div>
        </div>

        {stage === STAGES.PHOTO_UPLOAD && (
          <div>
            <PackingPhotoUpload onPhotosChange={setPhotos} />
          </div>
        )}
      </div>
    </div>
  );
}

