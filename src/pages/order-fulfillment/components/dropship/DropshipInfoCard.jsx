import { Package } from "lucide-react";
import { motion } from "framer-motion";
import StatusBadge from "../common/StatusBadge";
import PlatformBadge from "../common/PlatformBadge";
import dayjs from "dayjs";

export default function DropshipInfoCard({ 
  dropshipId,
  originalOrderNumber,
  platform,
  status,
  deselectedItemsCount = 0,
  fulfilledItemsCount = 0,
  remainingItemsCount = 0,
  missingProductsCount = 0,
  createdAt,
  marketplaceName,
  marketplaceOrderNumber,
  delay = 0.1 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-gradient-to-br from-white to-purple-50 rounded-xl border-2 border-purple-100 shadow-lg p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Package className="w-5 h-5 text-purple-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Dropship Information</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Dropship ID</p>
          <p className="text-sm font-semibold text-gray-900">{dropshipId}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Original Order</p>
          <p className="text-sm font-semibold text-gray-900">{originalOrderNumber}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Platform</p>
          <PlatformBadge
            platform={platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : platform}
          />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Status</p>
          <StatusBadge status={status} />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Total Items</p>
          <p className="text-sm font-semibold text-gray-900">{deselectedItemsCount}</p>
        </div>
        {fulfilledItemsCount > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Fulfilled Items</p>
            <p className="text-sm font-semibold text-green-600">{fulfilledItemsCount}</p>
          </div>
        )}
        {remainingItemsCount > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Remaining Items</p>
            <p className="text-sm font-semibold text-amber-600">{remainingItemsCount}</p>
          </div>
        )}
        {missingProductsCount !== undefined && missingProductsCount > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Missing Products</p>
            <p className="text-sm font-semibold text-amber-600">{missingProductsCount}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Created At</p>
          <p className="text-sm font-semibold text-gray-900">
            {createdAt ? dayjs(createdAt).format("MMM DD, YYYY HH:mm") : "N/A"}
          </p>
        </div>
        {marketplaceName && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Marketplace</p>
            <p className="text-sm font-semibold text-gray-900">{marketplaceName}</p>
          </div>
        )}
        {marketplaceOrderNumber && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Marketplace Order</p>
            <p className="text-sm font-semibold text-gray-900">{marketplaceOrderNumber}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

