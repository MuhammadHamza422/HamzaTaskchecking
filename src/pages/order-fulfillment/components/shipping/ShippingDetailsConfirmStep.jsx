import { useState } from "react";
import { Check, Loader2, Package, Truck, MapPin, AlertCircle, Image as ImageIcon, ArrowLeft, Calendar, User, DollarSign, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { completeShipping } from "../../../../api/shipping";
import Swal from "sweetalert2";
import StatusBadge from "../common/StatusBadge";

export default function ShippingDetailsConfirmStep({
  scanData,
  trackingNumber,
  orderDetails,
  isLoadingDetails,
  detailsError,
  photos,
  onBack,
  onComplete,
}) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [notes, setNotes] = useState("");

  // Get fulfillment data (prefer orderDetails, fallback to scanData)
  const fulfillment = orderDetails?.fulfillment || scanData?.fulfillment;
  // API returns shipstationOrder instead of order
  const shipstationOrder = orderDetails?.shipstationOrder;

  const handleComplete = async () => {
    if (!photos || photos.length === 0) {
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
      
      // Extract File objects from photos array
      const photoFiles = photos.map(p => p.file);
      
      const result = await completeShipping(scanData.shippingRecordId, {
        photos: photoFiles,
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

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900 font-mono tracking-tight">{trackingNumber}</h2>
            <StatusBadge status={fulfillment?.status || "pending"} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-gray-400" />
              {fulfillment?.carrierName || "Unknown Carrier"}
              {fulfillment?.serviceCode && <span className="text-gray-400 px-1">•</span>}
              {fulfillment?.serviceCode}
            </span>
            {fulfillment?.orderNumber && (
              <span className="flex items-center gap-1.5 px-3 py-0.5 bg-gray-100 rounded-full font-medium text-gray-700">
                Order #{fulfillment.orderNumber}
              </span>
            )}
          </div>
        </div>
        <div className="text-left md:text-right">
          <div className="text-sm text-gray-500">
            {fulfillment?.shipDate ? `Shipped: ${formatDate(fulfillment.shipDate)}` : "Not Shipped Yet"}
          </div>
          <div className="text-xs text-gray-400 mt-1">
             Record ID: {scanData.shippingRecordId.slice(-8).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Shipment & Customer */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Addresses Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ship To Address */}
            {fulfillment?.shipTo && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Ship To</h3>
                </div>
                <div className="p-4 space-y-1 text-sm">
                  <p className="font-bold text-gray-900">{fulfillment.shipTo.name}</p>
                  {fulfillment.shipTo.companyName && (
                    <p className="text-gray-600">{fulfillment.shipTo.companyName}</p>
                  )}
                  <p className="text-gray-700">{fulfillment.shipTo.addressLine1}</p>
                  {fulfillment.shipTo.addressLine2 && <p className="text-gray-700">{fulfillment.shipTo.addressLine2}</p>}
                  <p className="text-gray-700">
                    {fulfillment.shipTo.city}, {fulfillment.shipTo.state} {fulfillment.shipTo.postalCode}
                  </p>
                  <p className="text-gray-500 text-xs mt-2 uppercase tracking-wide">{fulfillment.shipTo.countryCode}</p>
                  {(fulfillment.shipTo.phone || fulfillment.shipTo.email) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                      {fulfillment.shipTo.email && <p className="text-gray-500 text-xs truncate">{fulfillment.shipTo.email}</p>}
                      {fulfillment.shipTo.phone && <p className="text-gray-500 text-xs">{fulfillment.shipTo.phone}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bill To Address (only if available from Order details) */}
            {shipstationOrder?.billTo && shipstationOrder.billTo.name && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Bill To</h3>
                </div>
                <div className="p-4 space-y-1 text-sm">
                  <p className="font-bold text-gray-900">{shipstationOrder.billTo.name}</p>
                  {shipstationOrder.billTo.company && (
                    <p className="text-gray-600">{shipstationOrder.billTo.company}</p>
                  )}
                  <p className="text-gray-700">{shipstationOrder.billTo.street1}</p>
                  {shipstationOrder.billTo.street2 && <p className="text-gray-700">{shipstationOrder.billTo.street2}</p>}
                  <p className="text-gray-700">
                    {[shipstationOrder.billTo.city, shipstationOrder.billTo.state, shipstationOrder.billTo.postalCode].filter(Boolean).join(", ")}
                  </p>
                  <p className="text-gray-500 text-xs mt-2 uppercase tracking-wide">{shipstationOrder.billTo.country}</p>
                </div>
              </div>
            )}
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Order Items</h3>
              </div>
              {shipstationOrder?.items && (
                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                  {shipstationOrder.items.length} Item(s)
                </span>
              )}
            </div>
            
            {shipstationOrder?.items && shipstationOrder.items.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {shipstationOrder.items.map((item, index) => (
                  <div key={item.orderItemId || index} className="p-4 flex gap-4 items-start">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 border border-gray-200 overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {item.sku && <span>SKU: {item.sku}</span>}
                        {item.upc && <span>UPC: {item.upc}</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900">x{item.quantity}</div>
                      {item.unitPrice !== undefined && (
                        <div className="text-xs text-gray-500">${item.unitPrice.toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-sm">
                No items information available
              </div>
            )}
          </div>
          
          {/* Notes Input */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
             <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Shipment Notes</h3>
              </div>
              <div className="p-4">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isCompleting}
                  placeholder="Add any internal notes about this shipment..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 resize-none"
                  rows={3}
                />
              </div>
          </div>
        </div>

        {/* Right Column: Details & Financials */}
        <div className="space-y-6">
          
          {/* Status & Dates Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Timeline & Status</h3>
            </div>
            <div className="p-4 space-y-3 text-sm">
               <div className="flex justify-between items-center">
                 <span className="text-gray-500">Order Status</span>
                 <span className="font-medium capitalize text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                   {shipstationOrder?.orderStatus?.replace(/_/g, ' ') || "N/A"}
                 </span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-gray-500">Order Date</span>
                 <span className="text-gray-900">{shipstationOrder?.orderDate ? formatDate(shipstationOrder.orderDate) : "N/A"}</span>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-gray-500">Ship By</span>
                 <span className="text-gray-900">{shipstationOrder?.shipByDate ? formatDate(shipstationOrder.shipByDate) : "N/A"}</span>
               </div>
               {fulfillment?.deliveredAt && (
                 <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                   <span className="text-gray-500">Delivered</span>
                   <span className="text-green-600 font-medium">{formatDate(fulfillment.deliveredAt)}</span>
                 </div>
               )}
            </div>
          </div>

          {/* Financials Card */}
          {shipstationOrder && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Financials</h3>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${((shipstationOrder.orderTotal || 0) - (shipstationOrder.taxAmount || 0) - (shipstationOrder.shippingAmount || 0)).toFixed(2)}</span>
                </div>
                {shipstationOrder.taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>${shipstationOrder.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {shipstationOrder.shippingAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>${shipstationOrder.shippingAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 mt-2">
                  <span>Total</span>
                  <span>${(shipstationOrder.orderTotal || 0).toFixed(2)}</span>
                </div>
                {shipstationOrder.amountPaid > 0 && (
                   <div className="flex justify-between text-xs text-green-600 font-medium mt-1">
                     <span>Paid</span>
                     <span>${shipstationOrder.amountPaid.toFixed(2)}</span>
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Customer & Internal Notes Display */}
          {(shipstationOrder?.customerNotes || shipstationOrder?.internalNotes) && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                   <FileText className="w-4 h-4 text-blue-600" />
                   <h3 className="font-semibold text-gray-900 text-sm">Order Notes</h3>
                </div>
                <div className="p-4 space-y-4 text-sm">
                   {shipstationOrder.customerNotes && (
                     <div>
                       <span className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Customer</span>
                       <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{shipstationOrder.customerNotes}</p>
                     </div>
                   )}
                   {shipstationOrder.internalNotes && (
                     <div>
                       <span className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Internal</span>
                       <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic">{shipstationOrder.internalNotes}</p>
                     </div>
                   )}
                </div>
             </div>
          )}
          
          {/* Loading/Error State for Order Details */}
          {isLoadingDetails && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-blue-700 text-xs font-medium">Loading details...</span>
            </div>
          )}
          
          {detailsError && !isLoadingDetails && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 text-xs font-medium">Partial Details Loaded</p>
                <p className="text-amber-700 text-[10px] mt-0.5">Some order information might be missing, but you can proceed.</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Photos Preview - Full Width */}
      {photos && photos.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-600" />
              <h3 className="font-semibold text-gray-900 text-sm">Captured Photos ({photos.length})</h3>
           </div>
           <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {photos.map((photo, index) => (
                  <div key={photo.id || index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group">
                    <img src={photo.preview} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 truncate">
                      Photo {index + 1}
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="sticky bottom-4 md:static z-10 flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 bg-gray-50/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none p-4 md:p-0 rounded-xl md:rounded-none -mx-4 md:mx-0 shadow-lg md:shadow-none">
        <motion.button
          onClick={onBack}
          disabled={isCompleting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          whileHover={!isCompleting ? { scale: 1.01 } : {}}
          whileTap={!isCompleting ? { scale: 0.99 } : {}}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Photos
        </motion.button>
        <motion.button
          onClick={handleComplete}
          disabled={isCompleting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-70"
          whileHover={!isCompleting ? { scale: 1.01 } : {}}
          whileTap={!isCompleting ? { scale: 0.99 } : {}}
        >
          {isCompleting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Complete Shipping
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}
