import { useState } from "react";
import { Package, ChevronDown, ChevronUp, Plus, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Button } from "antd";

export default function OrderItemsDisplay({ 
  items = [], 
  currency = "USD",
  showStatus = false,
  packedCount,
  deselectedCount,
  delay = 0.6,
  title = "Order Items",
  packingId = null,
  isViewMode = false,
  onMissingProductAdd = null,
  onMissingProductDelete = null
}) {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [missingProductInputs, setMissingProductInputs] = useState({});
  const [addingMissingProduct, setAddingMissingProduct] = useState({});

  if (!items || items.length === 0) return null;

  const toggleRow = (itemId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedRows(newExpanded);
  };

  const handleAddMissingProduct = async (lineItemId) => {
    const productName = missingProductInputs[lineItemId]?.trim();
    if (!productName) {
      return;
    }

    setAddingMissingProduct(prev => ({ ...prev, [lineItemId]: true }));
    
    try {
      if (onMissingProductAdd) {
        await onMissingProductAdd(packingId, lineItemId, productName);
        setMissingProductInputs(prev => ({ ...prev, [lineItemId]: "" }));
        // Expand row to show the newly added product
        if (!expandedRows.has(lineItemId)) {
          toggleRow(lineItemId);
        }
      }
    } catch (error) {
      console.error("Error adding missing product:", error);
    } finally {
      setAddingMissingProduct(prev => ({ ...prev, [lineItemId]: false }));
    }
  };

  const handleDeleteMissingProduct = async (lineItemId, missingProductId) => {
    if (onMissingProductDelete) {
      await onMissingProductDelete(packingId, lineItemId, missingProductId);
    }
  };

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
              {isViewMode && packingId && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => {
              const isSelected = item.isSelected === true;
              const isDeselected = item.isDeselected === true;
              const hasMissingProducts = item.hasMissingProducts || (item.missingProductsCount > 0);
              const missingProducts = item.missingProducts || [];
              const isExpanded = expandedRows.has(item.id);
              
              return (
                <>
                  <tr
                    key={item.id || index}
                    className={`hover:bg-gray-50 transition-colors ${
                      hasMissingProducts ? "bg-amber-50/50 border-l-4 border-l-amber-400" : ""
                    }`}
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
                  {isViewMode && packingId && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {hasMissingProducts && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <AlertCircle className="w-3 h-3" />
                            {item.missingProductsCount || missingProducts.length}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRow(item.id);
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              {hasMissingProducts ? "View Missing" : "Add Missing"}
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
                {isExpanded && isViewMode && packingId && (
                  <tr key={`${item.id}-expanded`} className="bg-gray-50">
                    <td colSpan={isViewMode && packingId ? 6 : 5} className="px-4 py-4">
                      <div className="space-y-4">
                        {/* Missing Products List */}
                        {missingProducts.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Missing Products:</h5>
                            {missingProducts.map((missingProduct) => (
                              <div
                                key={missingProduct.missingProductId || missingProduct.id}
                                className="flex items-center justify-between bg-white border border-amber-200 rounded-lg p-3"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {missingProduct.productName}
                                  </p>
                                  {missingProduct.notes && (
                                    <p className="text-xs text-gray-500 mt-1">{missingProduct.notes}</p>
                                  )}
                                  {missingProduct.addedAt && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      Added: {new Date(missingProduct.addedAt).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteMissingProduct(item.id, missingProduct.missingProductId || missingProduct.id)}
                                  className="ml-4 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                  title="Delete missing product"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Missing Product Form */}
                        <div className="bg-white border border-amber-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Add Missing Product:</h5>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter missing product name"
                              value={missingProductInputs[item.id] || ""}
                              onChange={(e) => setMissingProductInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onPressEnter={() => handleAddMissingProduct(item.id)}
                              className="flex-1"
                              disabled={addingMissingProduct[item.id]}
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

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {items.map((item, index) => {
          const isSelected = item.isSelected === true;
          const isDeselected = item.isDeselected === true;
          const hasMissingProducts = item.hasMissingProducts || (item.missingProductsCount > 0);
          const missingProducts = item.missingProducts || [];
          const isExpanded = expandedRows.has(item.id);
          
          return (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-lg border-2 p-4 shadow-sm ${
                hasMissingProducts
                  ? "bg-amber-50/50 border-amber-400 border-l-4"
                  : isDeselected
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

              {/* Mobile: Missing Products Section */}
              {isViewMode && packingId && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => toggleRow(item.id)}
                    className="w-full flex items-center justify-between text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <span className="flex items-center gap-2">
                      {hasMissingProducts && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <AlertCircle className="w-3 h-3" />
                          {item.missingProductsCount || missingProducts.length} Missing
                        </span>
                      )}
                      {isExpanded ? "Hide Missing Products" : "Add Missing Products"}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-3 space-y-3 overflow-hidden"
                      >
                        {/* Missing Products List */}
                        {missingProducts.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-xs font-semibold text-gray-700">Missing Products:</h5>
                            {missingProducts.map((missingProduct) => (
                              <div
                                key={missingProduct.missingProductId || missingProduct.id}
                                className="flex items-start justify-between bg-white border border-amber-200 rounded-lg p-2"
                              >
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-gray-900">
                                    {missingProduct.productName}
                                  </p>
                                  {missingProduct.notes && (
                                    <p className="text-xs text-gray-500 mt-1">{missingProduct.notes}</p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteMissingProduct(item.id, missingProduct.missingProductId || missingProduct.id)}
                                  className="ml-2 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Missing Product Form */}
                        <div className="bg-white border border-amber-200 rounded-lg p-3">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">Add Missing Product:</h5>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Product name"
                              value={missingProductInputs[item.id] || ""}
                              onChange={(e) => setMissingProductInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                              onPressEnter={() => handleAddMissingProduct(item.id)}
                              size="small"
                              disabled={addingMissingProduct[item.id]}
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
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

