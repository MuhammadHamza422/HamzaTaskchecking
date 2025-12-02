import { useState, useEffect } from "react";
import { 
  X, 
  Package, 
  MapPin, 
  Truck, 
  Calendar, 
  User, 
  DollarSign,
  Image as ImageIcon,
  Loader2,
  Download
} from "lucide-react";
import { getShippingRecordDetails } from "../../../../api/shipping";
import Swal from "sweetalert2";

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-800",
  photos_captured: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS = {
  pending: "Pending",
  photos_captured: "Photos Captured",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export default function ShippingRecordDetailsModal({ recordId, onClose, onDeleted }) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    loadDetails();
  }, [recordId]);

  const loadDetails = async () => {
    setIsLoading(true);
    try {
      const result = await getShippingRecordDetails(recordId);
      if (result.success && result.data) {
        setDetails(result.data);
      }
    } catch (error) {
      console.error("Error loading details:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Details",
        text: error.message || "Unable to load shipping record details. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Shipping Record Details
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-4 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
            ) : details ? (
              <div className="space-y-6">
                {/* Status and Tracking */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Tracking Number
                    </label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      {details.trackingNumber}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Status
                    </label>
                    <div className="mt-1">
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          STATUS_COLORS[details.status] || STATUS_COLORS.pending
                        }`}
                      >
                        {STATUS_LABELS[details.status] || details.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Carrier Info */}
                {(details.carrierName || details.carrierCode) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Carrier Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Carrier:</span>
                        <span className="ml-2 font-medium text-gray-900">
                          {details.carrierName || "N/A"}
                        </span>
                      </div>
                      {details.serviceCode && (
                        <div>
                          <span className="text-gray-500">Service:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {details.serviceCode}
                          </span>
                        </div>
                      )}
                      {details.serviceName && (
                        <div>
                          <span className="text-gray-500">Service Name:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {details.serviceName}
                          </span>
                        </div>
                      )}
                      {details.shipstationShipmentNumber && (
                        <div>
                          <span className="text-gray-500">Shipment Number:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {details.shipstationShipmentNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Ship To */}
                {details.shipTo && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Ship To Address
                    </h4>
                    <div className="text-sm text-gray-900">
                      <p className="font-medium">{details.shipTo.name}</p>
                      {details.shipTo.companyName && (
                        <p className="text-gray-600">{details.shipTo.companyName}</p>
                      )}
                      <p className="mt-2">{details.shipTo.addressLine1}</p>
                      {details.shipTo.addressLine2 && (
                        <p>{details.shipTo.addressLine2}</p>
                      )}
                      <p>
                        {details.shipTo.city}, {details.shipTo.state}{" "}
                        {details.shipTo.postalCode}
                      </p>
                      <p>{details.shipTo.countryCode}</p>
                      {details.shipTo.phone && (
                        <p className="mt-2 text-gray-600">
                          Phone: {details.shipTo.phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ShipStation Order Snapshot */}
                {details.shipstationOrderSnapshot && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Order Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {details.shipstationOrderSnapshot.orderNumber && (
                        <div>
                          <span className="text-gray-500">Order Number:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {details.shipstationOrderSnapshot.orderNumber}
                          </span>
                        </div>
                      )}
                      {details.shipstationOrderSnapshot.orderKey && (
                        <div>
                          <span className="text-gray-500">Order Key:</span>
                          <span className="ml-2 font-medium text-gray-900 font-mono text-xs">
                            {details.shipstationOrderSnapshot.orderKey}
                          </span>
                        </div>
                      )}
                      {details.shipstationOrderSnapshot.orderStatus && (
                        <div>
                          <span className="text-gray-500">Order Status:</span>
                          <span className="ml-2 font-medium text-gray-900 capitalize">
                            {details.shipstationOrderSnapshot.orderStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                      )}
                      {details.shipstationOrderSnapshot.customerEmail && (
                        <div>
                          <span className="text-gray-500">Customer Email:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {details.shipstationOrderSnapshot.customerEmail}
                          </span>
                        </div>
                      )}
                      {details.shipstationOrderSnapshot.items && (
                        <div>
                          <span className="text-gray-500">Items:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {details.shipstationOrderSnapshot.items.length} item(s)
                          </span>
                        </div>
                      )}
                      {details.shipstationOrderSnapshot.orderTotal !== undefined && (
                        <div>
                          <span className="text-gray-500">Order Total:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            ${details.shipstationOrderSnapshot.orderTotal.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {details.shipstationOrderSnapshot.amountPaid !== undefined && (
                        <div>
                          <span className="text-gray-500">Amount Paid:</span>
                          <span className="ml-2 font-medium text-green-600">
                            ${details.shipstationOrderSnapshot.amountPaid.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Order Items */}
                    {details.shipstationOrderSnapshot.items && details.shipstationOrderSnapshot.items.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-xs font-semibold text-gray-700 mb-2">
                          Items
                        </h5>
                        <div className="space-y-2">
                          {details.shipstationOrderSnapshot.items.map((item, index) => (
                            <div
                              key={item.orderItemId || index}
                              className="flex justify-between text-sm bg-white p-2 rounded"
                            >
                              <div>
                                <p className="font-medium text-gray-900">
                                  {item.name}
                                </p>
                                {item.sku && (
                                  <p className="text-xs text-gray-500">
                                    SKU: {item.sku}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-gray-900">
                                  Qty: {item.quantity}
                                </p>
                                {item.unitPrice !== undefined && (
                                  <p className="text-xs text-gray-500">
                                    ${item.unitPrice.toFixed(2)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Source Platform Info */}
                {(details.sourcePlatform || details.sourceOrderKey) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      Source Platform
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {details.sourcePlatform && (
                        <div>
                          <span className="text-gray-500">Platform:</span>
                          <span className="ml-2 font-medium text-gray-900 capitalize">
                            {details.sourcePlatform}
                          </span>
                        </div>
                      )}
                      {details.sourceOrderKey && (
                        <div>
                          <span className="text-gray-500">Order Key:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {details.sourceOrderKey}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Photos */}
                {details.photoUrls && details.photoUrls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Photos ({details.photoUrls.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {details.photoUrls.map((url, index) => (
                        <div
                          key={index}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-75 transition-opacity"
                          onClick={() => setSelectedImage(url)}
                        >
                          <img
                            src={url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dates & Timeline */}
                {(details.shipDate || details.scannedAt || details.completedAt || details.deliveredAt) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Timeline
                    </h4>
                    <div className="space-y-2 text-sm">
                      {details.shipDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Ship Date:</span>
                          <span className="text-gray-900">
                            {formatDate(details.shipDate)}
                          </span>
                        </div>
                      )}
                      {details.scannedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Scanned At:</span>
                          <span className="text-gray-900">
                            {formatDate(details.scannedAt)}
                          </span>
                        </div>
                      )}
                      {details.photosUploadedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Photos Uploaded:</span>
                          <span className="text-gray-900">
                            {formatDate(details.photosUploadedAt)}
                          </span>
                        </div>
                      )}
                      {details.completedAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Completed At:</span>
                          <span className="text-gray-900">
                            {formatDate(details.completedAt)}
                          </span>
                        </div>
                      )}
                      {details.deliveredAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Delivered At:</span>
                          <span className="text-gray-900">
                            {formatDate(details.deliveredAt)}
                          </span>
                        </div>
                      )}
                      {details.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created At:</span>
                          <span className="text-gray-900">
                            {formatDate(details.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Operator */}
                {(details.operatorName || details.operatorEmail) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Operator
                    </h4>
                    <div className="text-sm">
                      {details.operatorName && (
                        <p className="font-medium text-gray-900">
                          {details.operatorName}
                        </p>
                      )}
                      {details.operatorEmail && (
                        <p className="text-gray-600">{details.operatorEmail}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Fulfillment Fee */}
                {details.fulfillmentFee && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Shipping Fee
                    </h4>
                    <div className="text-sm">
                      <p className="font-medium text-gray-900">
                        ${details.fulfillmentFee.amount?.toFixed(2) || "0.00"} {details.fulfillmentFee.currency?.toUpperCase() || "USD"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {details.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Notes
                    </h4>
                    <p className="text-sm text-gray-700">{details.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No details available</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}

