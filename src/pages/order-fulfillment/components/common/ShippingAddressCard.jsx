import { MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function ShippingAddressCard({ shipTo, delay = 0.3 }) {
  if (!shipTo) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gradient-to-br from-white to-purple-50 rounded-xl border-2 border-purple-100 shadow-lg p-6"
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
          <p className="text-sm font-semibold text-gray-900">{shipTo.name || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Phone</p>
          <p className="text-sm text-gray-900">{shipTo.phone || "N/A"}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Address</p>
          <p className="text-sm text-gray-900">
            {shipTo.address1 || ""}
            {shipTo.address2 ? `, ${shipTo.address2}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">City, State, ZIP</p>
          <p className="text-sm text-gray-900">
            {shipTo.city}, {shipTo.state} {shipTo.zip}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Country</p>
          <p className="text-sm text-gray-900">{shipTo.country || "N/A"}</p>
        </div>
      </div>
    </motion.div>
  );
}

