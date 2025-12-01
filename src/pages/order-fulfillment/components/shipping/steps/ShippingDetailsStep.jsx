import { motion } from "framer-motion";
import { Package, MapPin, Scale, ArrowRight } from "lucide-react";

export default function ShippingDetailsStep({ data, onNext }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-600" />
          Verify Shipment Details
        </h2>

        <div className="space-y-6">
          {/* Address Section */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <MapPin className="w-5 h-5 text-gray-400 mt-1" />
            <div>
              <p className="text-sm font-medium text-gray-500">Ship To</p>
              <p className="font-semibold text-gray-900">{data?.customer?.name}</p>
              <p className="text-gray-600">{data?.customer?.address}</p>
            </div>
          </div>

          {/* Package Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-500">Weight</p>
              </div>
              <p className="font-semibold text-gray-900">{data.weight} lbs</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-medium text-gray-500">Dimensions</p>
              </div>
              <p className="font-semibold text-gray-900">{data.dimensions}</p>
            </div>
          </div>

          {/* Items List */}
          <div>
            <p className="text-sm font-medium text-gray-500 mb-2">Packed Items</p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
              {data?.items?.map((item) => (
                <div key={item.id} className="p-3 flex justify-between items-center">
                  <span className="text-gray-700">{item.name}</span>
                  <span className="font-medium bg-gray-100 px-2 py-1 rounded text-sm">
                    x{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
      >
        <span>Confirm Details & Continue</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </motion.div>
  );
}

