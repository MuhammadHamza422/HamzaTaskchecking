import { AlertTriangle, User, Clock } from "lucide-react";
import { motion } from "framer-motion";
import dayjs from "dayjs";

export default function MissingProductsCard({ missingProducts = [], missingProductsCount = 0 }) {
  if (!missingProducts || missingProducts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 shadow-lg p-6"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Missing Products</h3>
          <p className="text-xs text-gray-600 mt-1">
            {missingProductsCount} missing product{missingProductsCount !== 1 ? "s" : ""} reported
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {missingProducts.map((missingProduct) => (
          <motion.div
            key={missingProduct.missingProductId}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  {missingProduct.productName}
                </h4>
                
                {missingProduct.notes && (
                  <p className="text-xs text-gray-600 mb-2 bg-gray-50 p-2 rounded border border-gray-200">
                    {missingProduct.notes}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mt-3">
                  {missingProduct.addedBy && (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>
                        {missingProduct.addedBy.name || missingProduct.addedBy.email || "Unknown"}
                      </span>
                    </div>
                  )}
                  {missingProduct.addedAt && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{dayjs(missingProduct.addedAt).format("MMM DD, YYYY HH:mm")}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

