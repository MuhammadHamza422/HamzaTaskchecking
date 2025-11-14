import { Package } from "lucide-react";
import { motion } from "framer-motion";
import StatusBadge from "../common/StatusBadge";

export default function PackingInfoCard({ 
  status, 
  selectedItemsCount = 0, 
  deselectedItemsCount = 0, 
  photosCount = 0, 
  packedBy, 
  packedAt,
  delay = 0.1 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gradient-to-br from-white to-blue-50 rounded-xl border-2 border-blue-100 shadow-lg p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Package className="w-5 h-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Packing Information</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
          <StatusBadge status={status} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Items Packed</p>
          <p className="text-sm font-semibold text-gray-900">{selectedItemsCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Out of Stock Items</p>
          <p className="text-sm font-semibold text-amber-600">{deselectedItemsCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Photos</p>
          <p className="text-sm font-semibold text-gray-900">{photosCount}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Packed By</p>
          <p className="text-sm font-semibold text-gray-900">{packedBy || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Packed At</p>
          <p className="text-sm font-semibold text-gray-900">
            {packedAt ? new Date(packedAt).toLocaleString() : "N/A"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

