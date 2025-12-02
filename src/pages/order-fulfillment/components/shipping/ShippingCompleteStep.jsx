import { useState } from "react";
import { Check, Loader2, Package, X, Image as ImageIcon, Truck, MapPin, AlertCircle } from "lucide-react";
import { completeShipping } from "../../../../api/shipping";
import Swal from "sweetalert2";

export default function ShippingCompleteStep({
  scanData,
  trackingNumber,
  photoFiles,
  orderDetails,
  isLoadingDetails,
  detailsError,
  onComplete,
  onCancel,
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [notes, setNotes] = useState("");

  // Get fulfillment data (prefer orderDetails, fallback to scanData)
  const fulfillment = orderDetails?.fulfillment || scanData?.fulfillment;
  const order = orderDetails?.order;

  // Step 4: Complete shipping record when user clicks button
  // Send File objects via multipart/form-data (same as packing)
  const handleComplete = async () => {
    if (!photoFiles || photoFiles.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Photos Required",
        text: "No photos available. Please go back and take photos before completing.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    setIsCompleting(true);

    try {
      console.log("✅ Completing shipping with photos:", photoFiles.length);
      // Backend middleware will handle S3 upload (same as packing)
      const result = await completeShipping(scanData.shippingRecordId, {
        photos: photoFiles, // File objects
        notes: notes.trim() || undefined,
      });

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "Shipping Completed!",
          text: "Shipping record completed successfully.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
        
        // Step 5: Loop back to scan screen
        if (onComplete) {
          onComplete();
        }
      } else {
        throw new Error("Failed to complete shipping record");
      }
    } catch (error) {
      console.error("❌ Error completing shipping:", error);
      Swal.fire({
        icon: "error",
        title: "Completion Failed",
        text: error.message || "Failed to complete shipping record. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      setIsCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-green-50 via-white to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-semibold">Completing Shipping</h2>
              <p className="text-sm text-green-100">Tracking: {trackingNumber}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isCompleting}
            className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
            aria-label="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Status Message */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6 text-center">
            {isCompleting ? (
              <>
                <div className="mb-4">
                  <Loader2 className="w-16 h-16 text-green-500 animate-spin mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Completing Shipping Record...
                </h3>
                <p className="text-gray-600">
                  Finalizing your shipping record
                </p>
              </>
            ) : (
              <>
                <div className="mb-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Photos Uploaded Successfully!
                </h3>
                <p className="text-gray-600">
                  Ready to complete shipping record
                </p>
              </>
            )}
          </div>

          {/* Summary Cards */}
          <div className="space-y-6 mb-6">
            {/* Tracking & Carrier Info */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                Shipping Information
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tracking Number:</span>
                  <span className="font-medium text-gray-900 font-mono">{trackingNumber}</span>
                </div>
                {fulfillment?.orderNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Order Number:</span>
                    <span className="font-medium text-gray-900">{fulfillment.orderNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Carrier:</span>
                  <span className="font-medium text-gray-900">
                    {fulfillment?.carrierName || scanData?.orderSummary?.carrierName || "N/A"}
                  </span>
                </div>
                {fulfillment?.serviceCode && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium text-gray-900">{fulfillment.serviceCode}</span>
                  </div>
                )}
                {fulfillment?.providerName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider:</span>
                    <span className="font-medium text-gray-900">{fulfillment.providerName}</span>
                  </div>
                )}
                {fulfillment?.shipDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ship Date:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(fulfillment.shipDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {fulfillment?.deliveredAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivered:</span>
                    <span className="font-medium text-green-600">
                      {new Date(fulfillment.deliveredAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {fulfillment?.fee && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping Fee:</span>
                    <span className="font-medium text-gray-900">
                      ${fulfillment.fee.amount?.toFixed(2) || "0.00"} {fulfillment.fee.currency?.toUpperCase() || "USD"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Photos Captured:</span>
                  <span className="font-medium text-gray-900">
                    {photoFiles?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Ship To Address */}
            {fulfillment?.shipTo && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-600" />
                  Ship To Address
                </h4>
                <div className="space-y-2">
                  <div className="text-gray-900 font-medium">
                    {fulfillment.shipTo.name}
                    {fulfillment.shipTo.companyName && (
                      <span className="text-gray-600 font-normal"> ({fulfillment.shipTo.companyName})</span>
                    )}
                  </div>
                  <div className="text-gray-700">
                    {fulfillment.shipTo.addressLine1}
                    {fulfillment.shipTo.addressLine2 && (
                      <>, {fulfillment.shipTo.addressLine2}</>
                    )}
                  </div>
                  <div className="text-gray-700">
                    {fulfillment.shipTo.city}, {fulfillment.shipTo.state} {fulfillment.shipTo.postalCode}
                  </div>
                  <div className="text-gray-700">
                    {fulfillment.shipTo.countryCode}
                  </div>
                  {fulfillment.shipTo.phone && (
                    <div className="text-gray-600 text-sm">
                      Phone: {fulfillment.shipTo.phone}
                    </div>
                  )}
                  {fulfillment.shipTo.email && (
                    <div className="text-gray-600 text-sm">
                      Email: {fulfillment.shipTo.email}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Information (if available) */}
            {order && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-purple-600" />
                  Order Information
                </h4>
                <div className="space-y-3">
                  {order.orderNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium text-gray-900">{order.orderNumber}</span>
                    </div>
                  )}
                  {order.customerName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span className="font-medium text-gray-900">{order.customerName}</span>
                    </div>
                  )}
                  {order.customerEmail && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium text-gray-900">{order.customerEmail}</span>
                    </div>
                  )}
                  {(order.items || order.itemsCount) && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items:</span>
                      <span className="font-medium text-gray-900">
                        {order.items?.length || order.itemsCount || 0}
                      </span>
                    </div>
                  )}
                  {order.orderTotal && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Total:</span>
                      <span className="font-medium text-gray-900">
                        ${order.orderTotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading/Error State for Order Details */}
            {isLoadingDetails && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <span className="text-blue-800 text-sm">Loading additional order details...</span>
                </div>
              </div>
            )}
            
            {detailsError && !isLoadingDetails && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-amber-900 text-sm font-medium">Unable to load full order details</p>
                    <p className="text-amber-700 text-xs mt-1">You can still complete the shipment with the available information.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes Input */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isCompleting}
              placeholder="Add any notes about this shipment..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={3}
            />
          </div>

          {/* Photos Preview */}
          {photoFiles && photoFiles.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Captured Photos ({photoFiles.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photoFiles.map((file, index) => (
                  <div
                    key={index}
                    className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complete Button */}
          {!isCompleting && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <button
                onClick={handleComplete}
                className="w-full py-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Check className="w-5 h-5" />
                Complete & Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

