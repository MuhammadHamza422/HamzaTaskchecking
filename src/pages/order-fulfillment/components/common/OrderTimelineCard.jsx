import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import StatusBadge from "./StatusBadge";

export default function OrderTimelineCard({ 
  createdAt, 
  updatedAt, 
  createdBy, 
  orderStatus,
  fulfillmentStatus,
  delay = 0.5 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gradient-to-br from-white to-orange-50 rounded-xl border-2 border-orange-100 shadow-lg p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Clock className="w-5 h-5 text-orange-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">
          {orderStatus !== undefined ? "Order Status" : "Order Timeline"}
        </h3>
      </div>
      <div className="space-y-3">
        {orderStatus !== undefined && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Order Status</p>
            <p className="text-sm font-semibold text-gray-900">{orderStatus || "N/A"}</p>
          </div>
        )}
        {fulfillmentStatus && StatusBadge && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Fulfillment Status</p>
            <StatusBadge status={fulfillmentStatus} />
          </div>
        )}
        {createdAt && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">
              {orderStatus !== undefined ? "Order Created" : "Created At"}
            </p>
            <p className="text-sm text-gray-900">
              {dayjs(createdAt).format("MMM DD, YYYY HH:mm")}
            </p>
          </div>
        )}
        {updatedAt && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">
              {orderStatus !== undefined ? "Order Updated" : "Updated At"}
            </p>
            <p className="text-sm text-gray-900">
              {dayjs(updatedAt).format("MMM DD, YYYY HH:mm")}
            </p>
          </div>
        )}
        {createdBy && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Created By</p>
            <p className="text-sm text-gray-900">{createdBy?.name || createdBy || "N/A"}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

