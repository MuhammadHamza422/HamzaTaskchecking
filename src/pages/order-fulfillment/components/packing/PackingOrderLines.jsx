import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input, Button } from "antd";
import Swal from "sweetalert2";
import { message } from "antd";

export default function PackingOrderLines({ 
  orderLines = [], 
  selectedItems: initialSelectedItems = [], 
  onSelectionChange,
  missingProducts = [],
  onMissingProductAdd = null,
  onMissingProductDelete = null
}) {
  const [selectedItems, setSelectedItems] = useState(
    new Set(initialSelectedItems)
  );
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [missingProductInputs, setMissingProductInputs] = useState({});
  const [addingMissingProduct, setAddingMissingProduct] = useState({});

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
      // Trying to deselect an item
      // Prevent if this is the last selected item
      if (newSelected.size === 1) {
        Swal.fire({
          icon: "warning",
          title: "Cannot Deselect All Items",
          text: "At least one item must be selected for packing. If you need to deselect all items, please cancel this packing operation.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
        return; // Don't allow deselection
      }
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
    // Prevent deselecting all items
    Swal.fire({
      icon: "warning",
      title: "Cannot Deselect All Items",
      text: "At least one item must be selected for packing. If you need to deselect all items, please cancel this packing operation.",
      confirmButtonColor: "#2563eb",
      confirmButtonText: "OK",
    });
    return; // Don't allow deselection
  };

  const allSelected = selectedItems.size === orderLines.length && orderLines.length > 0;
  const unselectedCount = orderLines.length - selectedItems.size;
  const hasNoSelection = selectedItems.size === 0;

  const toggleRow = (itemId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedRows(newExpanded);
  };

  const handleAddMissingProduct = (lineItemId) => {
    const productName = missingProductInputs[lineItemId]?.trim();
    if (!productName) {
      return;
    }

    setAddingMissingProduct(prev => ({ ...prev, [lineItemId]: true }));
    
    try {
      if (onMissingProductAdd) {
        onMissingProductAdd(lineItemId, productName);
        // Expand row to show the newly added product
        if (!expandedRows.has(lineItemId)) {
          toggleRow(lineItemId);
        }
      }
    } catch (error) {
      console.error("Error adding missing product:", error);
    } finally {
      // Always reset input field after adding (or on error)
      setMissingProductInputs(prev => ({ ...prev, [lineItemId]: "" }));
      setAddingMissingProduct(prev => ({ ...prev, [lineItemId]: false }));
    }
  };

  const handleDeleteMissingProduct = (missingProductId) => {
    Swal.fire({
      icon: "warning",
      title: "Delete Missing Product?",
      text: "Are you sure you want to remove this missing product?",
      showCancelButton: true,
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    }).then((result) => {
      if (result.isConfirmed && onMissingProductDelete) {
        onMissingProductDelete(missingProductId);
      }
    });
  };

  const getMissingProductsForItem = (lineItemId) => {
    return missingProducts.filter(mp => mp.lineItemId === lineItemId);
  };

  const hasMissingProducts = (lineItemId) => {
    return getMissingProductsForItem(lineItemId).length > 0;
  };

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
              disabled={selectedItems.size <= 1}
              className={`text-sm font-medium ${
                selectedItems.size <= 1
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:text-gray-700"
              }`}
              title={selectedItems.size <= 1 ? "At least one item must be selected" : "Clear All"}
            >
              Clear All
            </button>
          </div>
        </div>
        {hasNoSelection && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <p className="text-sm text-red-800 font-semibold">
              ❌ Error: At least one item must be selected for packing. Please select at least one item to continue.
            </p>
          </div>
        )}
        {!hasNoSelection && unselectedCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ {unselectedCount} item{unselectedCount > 1 ? "s" : ""} unselected. These will be moved to dropshipping.
            </p>
          </div>
        )}
        {!hasNoSelection && unselectedCount === 0 && orderLines.length > 0 && (
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
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
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
              {onMissingProductAdd && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Missing Products
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderLines.map((item) => {
              const isSelected = selectedItems.has(item.id);
              const itemHasMissingProducts = hasMissingProducts(item.id);
              const itemMissingProducts = getMissingProductsForItem(item.id);
              const isExpanded = expandedRows.has(item.id);
              return (
                <>
                <tr
                  key={item.id}
                  onClick={() => handleToggleItem(item.id)}
                  className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isSelected ? "bg-amber-50/50" : ""
                  } ${itemHasMissingProducts ? "bg-amber-50/70 border-l-4 border-l-amber-400" : ""}`}
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
                  {onMissingProductAdd && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(item.id);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span>Missing Products</span>
                        {itemHasMissingProducts && (
                          <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">
                            {itemMissingProducts.length}
                          </span>
                        )}
                      </button>
                    </td>
                  )}
                </tr>
                {isExpanded && onMissingProductAdd && (
                  <tr key={`${item.id}-expanded`}>
                    <td colSpan={onMissingProductAdd ? 6 : 5} className="px-6 py-4 bg-gray-50">
                      <div className="space-y-4">
                        {/* Missing Products List */}
                        {itemMissingProducts.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Missing Products:</h4>
                            <div className="space-y-2">
                              {itemMissingProducts.map((mp) => (
                                <div key={mp.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200">
                                  <span className="text-sm text-gray-900">{mp.productName}</span>
                                  {onMissingProductDelete && (
                                    <button
                                      onClick={() => handleDeleteMissingProduct(mp.id)}
                                      className="text-red-600 hover:text-red-700 p-1"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Add Missing Product Form */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter missing product name"
                            value={missingProductInputs[item.id] || ""}
                            onChange={(e) => setMissingProductInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onPressEnter={() => handleAddMissingProduct(item.id)}
                            className="flex-1"
                          />
                          <Button
                            type="primary"
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => handleAddMissingProduct(item.id)}
                            loading={addingMissingProduct[item.id]}
                            disabled={!missingProductInputs[item.id]?.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden p-4 space-y-4">
        {orderLines.map((item, index) => {
          const isSelected = selectedItems.has(item.id);
          const itemHasMissingProducts = hasMissingProducts(item.id);
          const itemMissingProducts = getMissingProductsForItem(item.id);
          const isExpanded = expandedRows.has(item.id);
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-lg border-2 p-4 shadow-sm transition-all ${
                isSelected
                  ? "border-blue-500 bg-blue-50/30"
                  : "border-amber-300 bg-amber-50/50"
              } ${itemHasMissingProducts ? "border-l-4 border-l-amber-400" : ""}`}
            >
              <div className="flex items-start gap-3 mb-3" onClick={() => handleToggleItem(item.id)}>
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
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 mb-3">
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
              {onMissingProductAdd && (
                <>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(item.id);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      <span>Missing Products</span>
                      {itemHasMissingProducts && (
                        <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">
                          {itemMissingProducts.length}
                        </span>
                      )}
                    </button>
                  </div>
                  {isExpanded && (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-gray-200 space-y-3"
                      >
                        {itemMissingProducts.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-700 mb-2">Missing Products:</h4>
                            <div className="space-y-2">
                              {itemMissingProducts.map((mp) => (
                                <div key={mp.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-amber-200">
                                  <span className="text-xs text-gray-900">{mp.productName}</span>
                                  {onMissingProductDelete && (
                                    <button
                                      onClick={() => handleDeleteMissingProduct(mp.id)}
                                      className="text-red-600 hover:text-red-700 p-1"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter missing product name"
                            value={missingProductInputs[item.id] || ""}
                            onChange={(e) => setMissingProductInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onPressEnter={() => handleAddMissingProduct(item.id)}
                            size="small"
                            className="flex-1"
                          />
                          <Button
                            type="primary"
                            icon={<Plus className="w-3 h-3" />}
                            onClick={() => handleAddMissingProduct(item.id)}
                            loading={addingMissingProduct[item.id]}
                            disabled={!missingProductInputs[item.id]?.trim()}
                            size="small"
                          >
                            Add
                          </Button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

