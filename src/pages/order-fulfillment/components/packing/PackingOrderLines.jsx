import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function PackingOrderLines({ orderLines = [], selectedItems: initialSelectedItems = [], onSelectionChange }) {
  const [selectedItems, setSelectedItems] = useState(
    new Set(initialSelectedItems)
  );

  useEffect(() => {
    if (initialSelectedItems.length > 0) {
      setSelectedItems(new Set(initialSelectedItems));
    } else {
      // Select all items by default
      setSelectedItems(
        new Set(orderLines.map((item) => item.id))
      );
    }
  }, [initialSelectedItems, orderLines]);

  const handleToggleItem = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSelected));
    }
  };

  const handleSelectAll = () => {
    const allSelected = new Set(orderLines.map((item) => item.id));
    setSelectedItems(allSelected);
    if (onSelectionChange) {
      onSelectionChange(Array.from(allSelected));
    }
  };

  const handleDeselectAll = () => {
    setSelectedItems(new Set());
    if (onSelectionChange) {
      onSelectionChange([]);
    }
  };

  const allSelected = selectedItems.size === orderLines.length && orderLines.length > 0;
  const unselectedCount = orderLines.length - selectedItems.size;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Order Lines</h3>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={handleDeselectAll}
              className="text-sm text-gray-600 hover:text-gray-700 font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
        {unselectedCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Please unselect out-of-stock items ({unselectedCount} item{unselectedCount > 1 ? "s" : ""} unselected)
            </p>
          </div>
        )}
        {unselectedCount === 0 && orderLines.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800 font-medium">
              ✓ All items are selected. You can proceed to upload packing photos.
            </p>
          </div>
        )}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={allSelected ? handleDeselectAll : handleSelectAll}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderLines.map((item) => {
              const isSelected = selectedItems.has(item.id);
              return (
                <tr
                  key={item.id}
                  onClick={() => handleToggleItem(item.id)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isSelected ? "bg-amber-50/50" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleItem(item.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                        ) : (
                          <span className="text-gray-400 text-xs">No Image</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium w-[250px] text-gray-900">{item.name}</p>
                        {item.variant && (
                          <p className="text-xs text-gray-500">{item.variant}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm text-gray-900">{item.sku || "N/A"}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">{item.quantity}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">${item.price}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden p-4 space-y-4">
        {orderLines.map((item, index) => {
          const isSelected = selectedItems.has(item.id);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleToggleItem(item.id)}
              className={`bg-white rounded-lg border-2 p-4 shadow-sm cursor-pointer transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50/30"
                  : "border-amber-300 bg-amber-50/50"
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div onClick={(e) => e.stopPropagation()} className="mt-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleItem(item.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                </div>
                <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center shrink-0">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-gray-400 text-xs">No Image</span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">{item.name}</h4>
                  {item.variant && <p className="text-xs text-gray-500 mb-2">{item.variant}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500 mb-1">SKU</p>
                  <p className="text-sm font-semibold text-gray-900">{item.sku || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Quantity</p>
                  <p className="text-sm font-semibold text-gray-900">{item.quantity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Price</p>
                  <p className="text-sm font-semibold text-blue-600">${item.price}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

