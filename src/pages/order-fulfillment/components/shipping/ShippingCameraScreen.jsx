import { useState } from "react";
import { X, Check, Loader2, Package } from "lucide-react";
import CameraCapture from "./camera/CameraCapture";
import Swal from "sweetalert2";

export default function ShippingCameraScreen({
  scanData,
  trackingNumber,
  orderDetails,
  isLoadingDetails,
  detailsError,
  onPhotosUploaded,
  onCancel,
}) {
  const [photos, setPhotos] = useState([]);
  const [showCamera, setShowCamera] = useState(true);

  const maxPhotos = 5;

  const handleCapture = (file) => {
    setPhotos((prev) => [...prev, file]);
  };

  const handleAddPhoto = (file) => {
    setPhotos((prev) => [...prev, file]);
  };

  const handleCloseCamera = () => {
    setShowCamera(false);
  };

  const handleSaveAllComplete = async (photoCount) => {
    // Step 3: When photos are saved, auto-move to completion step
    // Photos are File objects - backend will handle S3 upload (same as packing)
    if (photos.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Photos Required",
        text: "Please take at least one photo before continuing.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    // Close camera
    setShowCamera(false);

    // Auto-move to completion step with File objects
    // Backend middleware will handle S3 upload (same pattern as packing)
    if (onPhotosUploaded) {
      onPhotosUploaded(photos); // Pass File objects, not URLs
    }
  };

  const handleCancel = () => {
    if (photos.length > 0) {
      if (window.confirm("Are you sure you want to cancel? Photos will be lost.")) {
        if (onCancel) {
          onCancel();
        }
      }
    } else {
      if (onCancel) {
        onCancel();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Confirmation Bar */}
      <div className="absolute top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Package className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {scanData?.orderSummary?.carrierName || "Carrier"}
                </span>
                <span className="text-blue-200">•</span>
                <span className="text-sm truncate">
                  {scanData?.orderSummary?.shipToName || "Customer"}
                </span>
                {scanData?.orderSummary?.shipToCity && (
                  <>
                    <span className="text-blue-200 hidden sm:inline">•</span>
                    <span className="text-sm hidden sm:inline">
                      {scanData.orderSummary.shipToCity}, {scanData.orderSummary.shipToState}
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs text-blue-100 mt-0.5">
                Tracking: {trackingNumber}
              </div>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera or Photo Review */}
      {showCamera ? (
        <CameraCapture
          onCapture={handleCapture}
          onClose={handleCloseCamera}
          onAddPhoto={handleAddPhoto}
          maxPhotos={maxPhotos}
          currentCount={0}
          pendingPhotos={photos}
          onSaveAllComplete={handleSaveAllComplete}
        />
      ) : (
        <div className="flex-1 flex flex-col bg-gray-900 pt-16">
          {/* Photo Review */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-white text-xl font-semibold mb-4">
                Review Photos ({photos.length})
              </h2>

              {photos.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No photos captured yet</p>
                  <button
                    onClick={() => setShowCamera(true)}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Open Camera
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                  {photos.map((photo, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-gray-800 rounded-lg overflow-hidden"
                    >
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Order Details (if loaded) */}
              {isLoadingDetails ? (
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin mr-2" />
                    <span className="text-gray-400">Loading order details...</span>
                  </div>
                </div>
              ) : orderDetails ? (
                <div className="bg-gray-800 rounded-lg p-6 mb-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Shipping Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    {/* Fulfillment Details */}
                    {orderDetails.fulfillment && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Shipment Number:</span>
                          <span className="text-white font-medium">
                            {orderDetails.fulfillment.orderNumber || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Carrier:</span>
                          <span className="text-white">
                            {orderDetails.fulfillment.carrierName || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Service:</span>
                          <span className="text-white">
                            {orderDetails.fulfillment.serviceCode || "N/A"}
                          </span>
                        </div>
                        {orderDetails.fulfillment.shipDate && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ship Date:</span>
                            <span className="text-white">
                              {new Date(orderDetails.fulfillment.shipDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {orderDetails.fulfillment.deliveredAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Delivered:</span>
                            <span className="text-white">
                              {new Date(orderDetails.fulfillment.deliveredAt).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {orderDetails.fulfillment.fee && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">Shipping Fee:</span>
                            <span className="text-white font-medium">
                              ${orderDetails.fulfillment.fee.amount?.toFixed(2) || "0.00"} {orderDetails.fulfillment.fee.currency?.toUpperCase() || "USD"}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Ship To Details */}
                    {orderDetails.fulfillment?.shipTo && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <h4 className="text-white font-medium mb-3">Ship To:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="text-white">
                            {orderDetails.fulfillment.shipTo.name}
                            {orderDetails.fulfillment.shipTo.companyName && (
                              <span className="text-gray-400"> ({orderDetails.fulfillment.shipTo.companyName})</span>
                            )}
                          </div>
                          <div className="text-gray-300">
                            {orderDetails.fulfillment.shipTo.addressLine1}
                            {orderDetails.fulfillment.shipTo.addressLine2 && (
                              <>, {orderDetails.fulfillment.shipTo.addressLine2}</>
                            )}
                          </div>
                          <div className="text-gray-300">
                            {orderDetails.fulfillment.shipTo.city}, {orderDetails.fulfillment.shipTo.state} {orderDetails.fulfillment.shipTo.postalCode}
                          </div>
                          {orderDetails.fulfillment.shipTo.phone && (
                            <div className="text-gray-300">
                              Phone: {orderDetails.fulfillment.shipTo.phone}
                            </div>
                          )}
                          {orderDetails.fulfillment.shipTo.email && (
                            <div className="text-gray-300">
                              Email: {orderDetails.fulfillment.shipTo.email}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order Details (if available) */}
                    {orderDetails.order && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <h4 className="text-white font-medium mb-3">Order Information:</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Order Number:</span>
                            <span className="text-white font-medium">
                              {orderDetails.order.orderNumber || "N/A"}
                            </span>
                          </div>
                          {orderDetails.order.customerName && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Customer:</span>
                              <span className="text-white">
                                {orderDetails.order.customerName}
                              </span>
                            </div>
                          )}
                          {orderDetails.order.customerEmail && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Email:</span>
                              <span className="text-white">
                                {orderDetails.order.customerEmail}
                              </span>
                            </div>
                          )}
                          {orderDetails.order.items && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Items:</span>
                              <span className="text-white">
                                {orderDetails.order.items.length || orderDetails.order.itemsCount || 0}
                              </span>
                            </div>
                          )}
                          {orderDetails.order.orderTotal && (
                            <div className="flex justify-between">
                              <span className="text-gray-400">Order Total:</span>
                              <span className="text-white font-medium">
                                ${orderDetails.order.orderTotal.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-gray-800 border-t border-gray-700 p-4">
            <div className="max-w-4xl mx-auto flex gap-3">
              {photos.length < maxPhotos && (
                <button
                  onClick={() => setShowCamera(true)}
                  className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Add More Photos
                </button>
              )}
              <button
                onClick={handleSaveAllComplete}
                disabled={photos.length === 0}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Save Photos & Continue
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

