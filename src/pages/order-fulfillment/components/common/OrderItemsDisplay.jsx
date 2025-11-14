import { Package } from "lucide-react";
import { motion } from "framer-motion";

export default function OrderItemsDisplay({ 
  items = [], 
  currency = "USD",
  showStatus = false,
  packedCount,
  deselectedCount,
  delay = 0.6,
  title = "Order Items"
}) {
  if (!items || items.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {(packedCount !== undefined || deselectedCount !== undefined) && (
          <div className="flex items-center gap-4 text-sm">
            {packedCount !== undefined && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-600">
                  Packed: <span className="font-semibold text-gray-900">{packedCount}</span>
                </span>
              </div>
            )}
            {deselectedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-gray-600">
                  Deselected: <span className="font-semibold text-gray-900">{deselectedCount}</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {/* {showStatus && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              )} */}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => {
              const isSelected = item.isSelected === true;
              const isDeselected = item.isDeselected === true;
              return (
                <tr
                  key={item.id || index}
                  className={`hover:bg-gray-50`}
                >
                  {/* {showStatus && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <span>✅</span>
                          <span>Packed</span>
                        </span>
                      ) : isDeselected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <span>❌</span>
                          <span>Deselected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <span>—</span>
                          <span>N/A</span>
                        </span>
                      )}
                    </td>
                  )} */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {item.image && (
                        <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.name || "N/A"}</p>
                        {item.variant && <p className="text-xs text-gray-500">{item.variant}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{item.sku || "N/A"}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{item.quantity || 0}</p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">
                      {currency} {item.price?.toFixed(2) || "0.00"}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="text-sm font-semibold text-gray-900">
                      {currency} {item.total?.toFixed(2) || "0.00"}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {items.map((item, index) => {
          const isSelected = item.isSelected === true;
          const isDeselected = item.isDeselected === true;
          return (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-lg border-2 p-4 shadow-sm ${
                isDeselected
                  ? "bg-amber-50/50 border-amber-300"
                  : isSelected
                  ? "bg-green-50/30 border-green-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  {item.image && (
                    <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">{item.name || "N/A"}</h4>
                    {item.variant && <p className="text-xs text-gray-500 mb-2">{item.variant}</p>}
                  </div>
                </div>
                {showStatus && (
                  <div>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <span>✅</span>
                        <span>Packed</span>
                      </span>
                    ) : isDeselected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <span>❌</span>
                        <span>Deselected</span>
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">SKU</p>
                  <p className="text-sm font-semibold text-gray-900">{item.sku || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Quantity</p>
                  <p className="text-sm font-semibold text-gray-900">{item.quantity || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Price</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {currency} {item.price?.toFixed(2) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-sm font-semibold text-blue-600">
                    {currency} {item.total?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

