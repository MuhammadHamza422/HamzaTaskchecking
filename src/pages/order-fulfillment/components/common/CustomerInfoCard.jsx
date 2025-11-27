import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function CustomerInfoCard({ customerName, customerEmail, phone, delay = 0.2 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gradient-to-br from-white to-green-50 rounded-xl border-2 border-green-100 shadow-lg p-3 sm:p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Name</p>
          <p className="text-sm font-semibold text-gray-900">{customerName}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Email</p>
          <p className="text-sm text-gray-900">{customerEmail}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Phone</p>
          <p className="text-sm text-gray-900">{phone}</p>
        </div>
      </div>
    </motion.div>
  );
}

