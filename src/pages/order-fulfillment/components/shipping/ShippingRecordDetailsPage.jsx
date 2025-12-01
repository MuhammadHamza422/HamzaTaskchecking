import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  Truck,
  Trash2,
  Package,
  Image as ImageIcon,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
  Flag,
  Info,
  ShieldCheck,
  Check
} from "lucide-react";
import { motion } from "framer-motion";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import StatusBadge from "../common/StatusBadge";
import ImageModal from "../common/ImageModal";
import OrderDetailsSkeleton from "../common/OrderDetailsSkeleton";
import { getShippingRecordDetails, deleteShippingRecord } from "../../../../api/shipping";
import Swal from "sweetalert2";

export default function ShippingRecordDetailsPage() {
  const navigate = useNavigate();
  const { shippingRecordId } = useParams();
  
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingRecordId]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const result = await getShippingRecordDetails(shippingRecordId);
      if (result.success && result.data) {
        setDetails(result.data);
      }
    } catch (error) {
      console.error("Error loading shipping record details:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Details",
        text: error.message || "Unable to load shipping record details. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      }).then(() => {
        navigate("/fulfillment/shipping/list");
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Shipping Record?",
      text: "Are you sure you want to delete this shipping record? This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    setDeleting(true);
    try {
      const deleteResult = await deleteShippingRecord(shippingRecordId);
      if (deleteResult.success) {
        await Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Shipping record deleted successfully.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
        navigate("/fulfillment/shipping/list");
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.message || "Failed to delete shipping record. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
        <div className="max-w-[1550px] mx-auto p-4">
          <FulfillmentBreadcrumb />
          <OrderDetailsSkeleton />
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">Shipping record not found.</p>
          <button
            onClick={() => navigate("/fulfillment/shipping/list")}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Back to Shipping List
          </button>
        </div>
      </div>
    );
  }

  // Extract data for easy access
  const { fulfillment, shipstationOrder, shipTo, carrier, dates, photoUrls, status, operator, notes, flags, fulfillmentFee } = details;
  const items = shipstationOrder?.items || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="max-w-[1550px] mx-auto p-4">
        <FulfillmentBreadcrumb />

        {/* Header & Actions */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button
            onClick={() => navigate("/fulfillment/shipping/list")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back to Shipping List</span>
          </button>
          <motion.button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm font-medium text-sm"
            whileHover={!deleting ? { scale: 1.02 } : {}}
            whileTap={!deleting ? { scale: 0.98 } : {}}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Delete Record</span>
              </>
            )}
          </motion.button>
        </div>

        {/* Main Content Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          
          {/* Header Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900 font-mono tracking-tight">{details.trackingNumber}</h2>
                <StatusBadge status={status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-gray-400" />
                  {carrier?.name || fulfillment?.carrierName || "Unknown Carrier"}
                  {(carrier?.serviceCode || fulfillment?.serviceCode) && <span className="text-gray-400 px-1">•</span>}
                  {carrier?.serviceCode || fulfillment?.serviceCode}
                </span>
                {(shipstationOrder?.orderNumber || fulfillment?.orderNumber) && (
                  <span className="flex items-center gap-1.5 px-3 py-0.5 bg-gray-100 rounded-full font-medium text-gray-700">
                    Order #{shipstationOrder?.orderNumber || fulfillment?.orderNumber}
                  </span>
                )}
                {shipstationOrder?.requestedShippingService && (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    Service: {shipstationOrder.requestedShippingService}
                  </span>
                )}
              </div>
            </div>
            <div className="text-left md:text-right">
              <div className="text-sm text-gray-500">
                {dates?.shipDate ? `Shipped: ${formatDate(dates.shipDate)}` : "Not Shipped Yet"}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-mono">
                 ID: {details.shippingRecordId.slice(-8).toUpperCase()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Primary Info */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Addresses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ship To Address */}
                {shipTo && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <h3 className="font-semibold text-gray-900 text-sm">Ship To</h3>
                    </div>
                    <div className="p-4 space-y-1 text-sm">
                      <p className="font-bold text-gray-900">{shipTo.name}</p>
                      {shipTo.companyName && (
                        <p className="text-gray-600">{shipTo.companyName}</p>
                      )}
                      <p className="text-gray-700">{shipTo.addressLine1}</p>
                      {shipTo.addressLine2 && <p className="text-gray-700">{shipTo.addressLine2}</p>}
                      {shipTo.addressLine3 && <p className="text-gray-700">{shipTo.addressLine3}</p>}
                      <p className="text-gray-700">
                        {shipTo.city}, {shipTo.state} {shipTo.postalCode}
                      </p>
                      <p className="text-gray-500 text-xs mt-2 uppercase tracking-wide">{shipTo.countryCode}</p>
                      {(shipTo.phone || shipTo.email) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                          {shipTo.email && <p className="text-gray-500 text-xs truncate">{shipTo.email}</p>}
                          {shipTo.phone && <p className="text-gray-500 text-xs">{shipTo.phone}</p>}
                        </div>
                      )}
                      {shipstationOrder?.shipTo?.addressVerified && (
                        <p className="text-green-600 text-xs mt-2 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> {shipstationOrder.shipTo.addressVerified}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Bill To Address (from ShipStation order) */}
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
                      {(shipstationOrder.billTo.phone || shipstationOrder.customerEmail) && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                          {shipstationOrder.customerEmail && <p className="text-gray-500 text-xs truncate">{shipstationOrder.customerEmail}</p>}
                          {shipstationOrder.billTo.phone && <p className="text-gray-500 text-xs">{shipstationOrder.billTo.phone}</p>}
                        </div>
                      )}
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
                  <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                    {items.length} Item(s)
                  </span>
                </div>
                
                {items.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {items.map((item, index) => (
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

              {/* Notes */}
              {(notes || shipstationOrder?.customerNotes || shipstationOrder?.internalNotes) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <h3 className="font-semibold text-gray-900 text-sm">Notes</h3>
                  </div>
                  <div className="p-4 space-y-4 text-sm">
                    {notes && (
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Shipment Note</span>
                        <p className="text-gray-700 bg-amber-50 p-2 rounded border border-amber-100">{notes}</p>
                      </div>
                    )}
                    {shipstationOrder?.customerNotes && (
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Customer Note</span>
                        <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">{shipstationOrder.customerNotes}</p>
                      </div>
                    )}
                    {shipstationOrder?.internalNotes && (
                      <div>
                        <span className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Internal Note</span>
                        <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 italic">{shipstationOrder.internalNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Metadata & Financials */}
            <div className="space-y-6">
              
              {/* Timeline & Status */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Timeline & Details</h3>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Order Status</span>
                    <span className="font-medium capitalize text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                      {shipstationOrder?.orderStatus?.replace(/_/g, ' ') || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Scanned At</span>
                    <span className="text-gray-900">{dates?.scannedAt ? formatDate(dates.scannedAt) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Photos Uploaded</span>
                    <span className="text-gray-900">{dates?.photosUploadedAt ? formatDate(dates.photosUploadedAt) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Completed At</span>
                    <span className="text-gray-900">{dates?.completedAt ? formatDate(dates.completedAt) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-gray-500">Order Date</span>
                    <span className="text-gray-900">{shipstationOrder?.orderDate ? formatDate(shipstationOrder.orderDate) : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Ship By</span>
                    <span className="text-gray-900">{shipstationOrder?.shipByDate ? formatDate(shipstationOrder.shipByDate) : "N/A"}</span>
                  </div>
                  {dates?.deliveredAt && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-gray-500">Delivered</span>
                      <span className="text-green-600 font-medium">{formatDate(dates.deliveredAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Configuration & Flags */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Configuration & Flags</h3>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  {/* Flags */}
                  {flags && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Voided</span>
                        <span className={`font-medium ${flags.isVoided ? 'text-red-600' : 'text-gray-900'}`}>
                          {flags.isVoided ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {flags.hasMultipleFulfillments && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Multiple Fulfillments</span>
                          <span className="text-amber-600 font-medium">Yes</span>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Weight & Dimensions */}
                  {shipstationOrder?.weight && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Weight</span>
                      <span className="text-gray-900">
                        {shipstationOrder.weight.value} {shipstationOrder.weight.units}
                      </span>
                    </div>
                  )}
                  {shipstationOrder?.dimensions && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Dimensions</span>
                      <span className="text-gray-900">
                        {shipstationOrder.dimensions.length}x{shipstationOrder.dimensions.width}x{shipstationOrder.dimensions.height} {shipstationOrder.dimensions.units}
                      </span>
                    </div>
                  )}

                  {/* Payment Method */}
                  {shipstationOrder?.paymentMethod && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Payment</span>
                      <span className="text-gray-900 capitalize">{shipstationOrder.paymentMethod}</span>
                    </div>
                  )}

                  {/* Advanced Options Flags */}
                  {shipstationOrder?.advancedOptions && (
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      {shipstationOrder.advancedOptions.saturdayDelivery && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Saturday Delivery</span>
                          <span className="text-green-600 font-medium">Yes</span>
                        </div>
                      )}
                      {shipstationOrder.advancedOptions.nonMachinable && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Non-Machinable</span>
                          <span className="text-amber-600 font-medium">Yes</span>
                        </div>
                      )}
                      {shipstationOrder.advancedOptions.containsAlcohol && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Contains Alcohol</span>
                          <span className="text-red-600 font-medium">Yes</span>
                        </div>
                      )}
                      {shipstationOrder.externallyFulfilled && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Externally Fulfilled</span>
                          <span className="text-blue-600 font-medium">Yes</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Insurance Info (if insured) */}
              {shipstationOrder?.insuranceOptions?.insureShipment && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Insurance</h3>
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Provider</span>
                      <span className="text-gray-900 capitalize">{shipstationOrder.insuranceOptions.provider || "N/A"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Insured Value</span>
                      <span className="text-gray-900 font-medium">${shipstationOrder.insuranceOptions.insuredValue?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Financials */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900 text-sm">Financials</h3>
                </div>
                <div className="p-4 space-y-2 text-sm">
                  {shipstationOrder ? (
                    <>
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
                    </>
                  ) : (
                    <div className="text-center text-gray-500 text-xs">Financial details not available</div>
                  )}
                  {/* Fulfillment Fee */}
                  {fulfillmentFee && fulfillmentFee.amount > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 mt-2">
                      <span className="text-gray-500">Shipping Cost</span>
                      <span className="text-gray-900 font-medium">
                        ${fulfillmentFee.amount.toFixed(2)} {fulfillmentFee.currency?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Operator Info */}
              {operator && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Operator</h3>
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-sm">
                      {operator.name ? operator.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{operator.name || "Unknown Operator"}</p>
                      <p className="text-xs text-gray-500">{operator.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Source Info (if available) */}
              {(shipstationOrder?.advancedOptions?.source || shipstationOrder?.advancedOptions?.storeId || shipstationOrder?.advancedOptions?.customField1) && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-semibold text-gray-900 text-sm">Source Info</h3>
                  </div>
                  <div className="p-4 space-y-2 text-sm">
                    {shipstationOrder?.advancedOptions?.source && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Source</span>
                        <span className="text-gray-900">{shipstationOrder.advancedOptions.source}</span>
                      </div>
                    )}
                    {shipstationOrder?.advancedOptions?.storeId && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Store ID</span>
                        <span className="text-gray-900">{shipstationOrder.advancedOptions.storeId}</span>
                      </div>
                    )}
                    {shipstationOrder?.advancedOptions?.customField1 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Custom Field 1</span>
                        <span className="text-gray-900">{shipstationOrder.advancedOptions.customField1}</span>
                      </div>
                    )}
                    {shipstationOrder?.orderKey && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Order Key</span>
                        <span className="text-gray-900 font-mono text-xs">{shipstationOrder.orderKey}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Photos Section */}
          {photoUrls && photoUrls.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Captured Photos ({photoUrls.length})</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {photoUrls.map((url, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-100 cursor-pointer group relative"
                      onClick={() => {
                        setSelectedImage(url);
                        setIsImageModalOpen(true);
                      }}
                    >
                      <img
                        src={url}
                        alt={`Shipping photo ${index + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        Photo {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Image Modal */}
      <ImageModal
        imageUrl={selectedImage}
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setSelectedImage(null);
        }}
      />
    </div>
  );
}
