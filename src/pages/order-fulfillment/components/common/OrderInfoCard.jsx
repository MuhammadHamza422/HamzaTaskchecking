import { Package, MapPin, DollarSign, User } from "lucide-react";
import { motion } from "framer-motion";
import PlatformBadge from "./PlatformBadge";

export default function OrderInfoCard({ order }) {
  if (!order) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 shadow-xl p-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/80 rounded-lg p-4 border border-blue-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Order Number</p>
          </div>
          <p className="text-lg font-bold text-gray-900">{order.orderNumber || "N/A"}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 rounded-lg p-4 border border-green-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <User className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Customer Name</p>
          </div>
          <p className="text-lg font-bold text-gray-900">{order.customerName || "N/A"}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/80 rounded-lg p-4 border border-purple-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <MapPin className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Ship To</p>
          </div>
          <p className="text-sm text-gray-900 line-clamp-2 font-medium">{order.shipTo || "N/A"}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 rounded-lg p-4 border border-emerald-100"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs font-medium text-gray-500">Total Order Value</p>
          </div>
          <p className="text-lg font-bold text-emerald-600">
            ${order.totalValue?.toFixed(2) || "0.00"}
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 pt-6 border-t border-blue-200"
      >
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-gray-600">Platform:</p>
          <PlatformBadge
            platform={order.platform ? order.platform.charAt(0).toUpperCase() + order.platform.slice(1) : order.platform}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
