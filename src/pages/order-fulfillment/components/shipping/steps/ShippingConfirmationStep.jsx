import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Truck, Package, ArrowLeft, Loader2 } from "lucide-react";
import Swal from "sweetalert2";

export default function ShippingConfirmationStep({ data, photos, onBack, onComplete }) {
  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    setSubmitting(true);
    
    // Simulate API call to complete shipment
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await Swal.fire({
        icon: "success",
        title: "Shipment Completed!",
        text: "The order has been marked as shipped.",
        confirmButtonColor: "#2563eb",
      });
      
      onComplete();
    } catch (error) {
      console.error("Error completing shipment:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Complete",
        text: "Something went wrong. Please try again.",
        confirmButtonColor: "#2563eb",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Truck className="w-5 h-5 text-purple-600" />
          Review Shipment
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              Shipment Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Order ID:</span>
                <span className="font-medium text-gray-900">{data.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Packing ID:</span>
                <span className="font-medium text-gray-900">{data.packingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Carrier:</span>
                <span className="font-medium text-gray-900">{data.carrier || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service:</span>
                <span className="font-medium text-gray-900">{data.service || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Proof of Shipment</h3>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="w-16 h-16 rounded border border-gray-200 overflow-hidden bg-white">
                  <img 
                    src={photo.preview} 
                    alt="Proof" 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {photos.length} photo(s) attached
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 text-sm">Ready to Ship</h4>
              <p className="text-blue-700 text-sm mt-1">
                Confirming will mark this order as shipped and notify the marketplace.
                Ensure the label is applied correctly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={submitting}
          className="flex-1 py-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <button
          onClick={handleComplete}
          disabled={submitting}
          className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Truck className="w-5 h-5" />
              <span>Complete Shipment</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

