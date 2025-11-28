import { useState } from "react";
import { Package, CheckCircle, XCircle, ExternalLink, AlertTriangle, ChevronDown, ChevronUp, User, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

export default function DropshipItemsDisplay({
  items = [],
  currency = "USD",
  title = "Dropship Items",
  dropshipId = null,
  onFulfillClick = null,
  onFulfillMissingProductClick = null,
  fulfilledItemsCount = 0,
  remainingItemsCount = 0,
}) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  // const handleRowClick = (item) => {
  //   // Only allow clicking unfulfilled items that can be fulfilled
  //   if (item.fulfillmentStatus === "Unfulfilled" && item.canFulfillMainProduct && onFulfillClick) {
  //     onFulfillClick(item);
  //   }
  // };

  const handleMissingProductClick = (item, missingProduct, e) => {
    e.stopPropagation();
    if (missingProduct.fulfillmentStatus === "Unfulfilled" && onFulfillMissingProductClick) {
      onFulfillMissingProductClick(item, missingProduct);
    }
  };

  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRowExpansion = (itemId, e) => {
    e.stopPropagation();
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handlePackingOrderClick = (packingId, e) => {
    e.stopPropagation();
    if (packingId) {
      navigate(`/fulfillment/packing/${packingId}`, {
        state: {
          packingId: packingId,
        },
      });
    }
  };

  // Helper function to check if main product can be fulfilled
  const canFulfillMainProduct = (item) => {
    if (item.fulfillmentStatus === "Fulfilled") return false;

    const missingProducts = item.missingProducts || [];
    if (missingProducts.length === 0) return true;

    // Check if all missing products are fulfilled
    return missingProducts.every(mp => mp.fulfillmentStatus === "Fulfilled");
  };

  const handleRowClick = (item) => {
    // Only allow clicking unfulfilled items that can be fulfilled
    if (item.fulfillmentStatus === "Unfulfilled" && canFulfillMainProduct(item) && onFulfillClick) {
      onFulfillClick(item);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border-2 border-gray-200 shadow-lg p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {(fulfilledItemsCount !== undefined || remainingItemsCount !== undefined) && (
          <div className="flex items-center gap-4 text-sm">
            {fulfilledItemsCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-600">
                  Fulfilled: <span className="font-semibold text-gray-900">{fulfilledItemsCount}</span>
                </span>
              </div>
            )}
            {remainingItemsCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-gray-600">
                  Remaining: <span className="font-semibold text-gray-900">{remainingItemsCount}</span>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => {
              const isFulfilled = item.fulfillmentStatus === "Fulfilled";
              const isUnfulfilled = item.fulfillmentStatus === "Unfulfilled" || !item.fulfillmentStatus;
              const hasMissingProducts = item.hasMissingProducts || (item.missingProductsCount > 0);
              const missingProducts = item.missingProducts || [];
              const isExpanded = expandedRows.has(item.id);

              return (
                <>
                  <tr
                    key={item.id || index}
                    onClick={() => handleRowClick(item)}
                    className={`
                      hover:bg-gray-50 transition-colors
                      ${hasMissingProducts ? "bg-amber-50/50" : ""}
                      ${isFulfilled ? "bg-green-50/30" : ""}
                      ${isUnfulfilled ? "cursor-pointer" : ""}
                    `}
                  >
                    <td className={`px-4 py-4 whitespace-nowrap ${hasMissingProducts ? "border-l-4 border-l-amber-400" : ""}`}>
                      {isFulfilled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Fulfilled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <XCircle className="w-3 h-3" />
                          Unfulfilled
                        </span>
                      )}
                    </td>
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">{item.name || "N/A"}</p>
                            {hasMissingProducts && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3" />
                                {item.missingProductsCount || missingProducts.length}
                              </span>
                            )}
                          </div>
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
                    <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {hasMissingProducts && (
                          <button
                            onClick={(e) => toggleRowExpansion(item.id, e)}
                            className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                            title={isExpanded ? "Hide missing products" : "Show missing products"}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                        {isFulfilled ? (
                          <div className="space-y-1">
                            {item.packingId && (
                              <Button
                                type="link"
                                size="small"
                                icon={<ExternalLink className="w-3 h-3" />}
                                onClick={(e) => handlePackingOrderClick(item.packingId, e)}
                                className="p-0 h-auto text-blue-600 hover:text-blue-700"
                              >
                                View Packing
                              </Button>
                            )}
                            {item.trackingLink && (
                              <a
                                href={item.trackingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Track
                              </a>
                            )}
                          </div>
                        ) : (
                          <>
                            {canFulfillMainProduct(item) ? (
                              <Button
                                type="primary"
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(item);
                                }}
                                disabled={!isUnfulfilled}
                              >
                                Fulfill
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-500 italic">
                                Missing first
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && hasMissingProducts && missingProducts.length > 0 && (
                    <tr key={`${item.id}-expanded`} className="bg-amber-50/30">
                      <td colSpan={7} className={`px-4 py-4 ${hasMissingProducts ? "border-l-4 border-l-amber-400" : ""}`}>
                        <div className="space-y-3">
                          <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            Missing Products ({missingProducts.length})
                          </h5>
                          <div className="space-y-2">
                            {missingProducts.map((missingProduct) => {
                              const isFulfilled = missingProduct.fulfillmentStatus === "Fulfilled";
                              return (
                                <div
                                  key={missingProduct.missingProductId}
                                  className={`flex items-start justify-between bg-white border rounded-lg p-3 ${isFulfilled ? "border-green-200 bg-green-50/30" : "border-amber-200"
                                    }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="text-sm font-medium text-gray-900">
                                        {missingProduct.productName}
                                      </p>
                                      {isFulfilled && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <CheckCircle className="w-3 h-3" />
                                          Fulfilled
                                        </span>
                                      )}
                                    </div>
                                    {missingProduct.notes && (
                                      <p className="text-xs text-gray-500 mt-1">{missingProduct.notes}</p>
                                    )}
                                    {isFulfilled && missingProduct.packingOrderNumber && (
                                      <p className="text-xs text-green-600 mt-1">
                                        Packing Order: {missingProduct.packingOrderNumber}
                                      </p>
                                    )}
                                    {isFulfilled && missingProduct.fulfilledAt && (
                                      <p className="text-xs text-gray-400 mt-1">
                                        Fulfilled: {dayjs(missingProduct.fulfilledAt).format("MMM DD, YYYY HH:mm")}
                                      </p>
                                    )}
                                    {!isFulfilled && (
                                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
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
                                    )}
                                  </div>
                                  {!isFulfilled && onFulfillMissingProductClick && (
                                    <Button
                                      type="primary"
                                      size="small"
                                      onClick={(e) => handleMissingProductClick(item, missingProduct, e)}
                                      className="ml-2"
                                    >
                                      Fulfill
                                    </Button>
                                  )}
                                </div>
                              );
                            })}
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
          const isFulfilled = item.fulfillmentStatus === "Fulfilled";
          const isUnfulfilled = item.fulfillmentStatus === "Unfulfilled" || !item.fulfillmentStatus;
          const hasMissingProducts = item.hasMissingProducts || (item.missingProductsCount > 0);
          const missingProducts = item.missingProducts || [];
          const isExpanded = expandedRows.has(item.id);

          return (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleRowClick(item)}
              className={`rounded-lg border-2 p-4 shadow-sm ${hasMissingProducts
                ? "bg-amber-50/50 border-amber-400 border-l-4"
                : isFulfilled
                  ? "bg-green-50/30 border-green-300"
                  : isUnfulfilled
                    ? "bg-white border-gray-200 cursor-pointer hover:border-blue-300"
                    : "bg-white border-gray-200"
                }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex sm:flex-row flex-col items-start gap-3 flex-1">
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
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-gray-900">{item.name || "N/A"}</h4>
                      {hasMissingProducts && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          {item.missingProductsCount || missingProducts.length}
                        </span>
                      )}
                    </div>
                    {item.variant && <p className="text-xs text-gray-500 mb-2">{item.variant}</p>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isFulfilled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      Fulfilled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      <XCircle className="w-3 h-3" />
                      Unfulfilled
                    </span>
                  )}
                </div>
              </div>

              {/* Fulfillment Details for Fulfilled Items */}
              {isFulfilled && (
                <div className="mb-3 p-3 bg-white rounded border border-green-200 space-y-2">
                  {/* Fulfillment Type Display */}
                  {(item.fulfillmentType || item.marketplaceName || item.courierService) && (
                    <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-gray-200">
                      <span className="text-gray-500">Fulfilled via:</span>
                      <span className="font-medium text-gray-900">
                        {item.fulfillmentType === "japan" && item.courierService
                          ? item.courierService
                          : item.fulfillmentType === "marketplace" && item.marketplaceName
                          ? item.marketplaceName
                          : item.marketplaceName || item.courierService || "Marketplace"}
                      </span>
                    </div>
                  )}
                  
                  {/* Courier Service (Japan fulfillment) */}
                  {item.fulfillmentType === "japan" && item.courierService && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Courier Service:</span>
                      <span className="font-medium text-gray-900">{item.courierService}</span>
                    </div>
                  )}
                  
                  {/* Marketplace Name (Marketplace fulfillment) */}
                  {item.fulfillmentType === "marketplace" && item.marketplaceName && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Marketplace:</span>
                      <span className="font-medium text-gray-900">{item.marketplaceName}</span>
                    </div>
                  )}
                  
                  {/* Marketplace Order Number */}
                  {item.marketplaceOrderNumber && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Order #:</span>
                      <span className="font-medium text-gray-900">{item.marketplaceOrderNumber}</span>
                    </div>
                  )}
                  
                  {/* Tracking ID */}
                  {item.trackingId && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Tracking:</span>
                      <span className="font-medium text-gray-900">{item.trackingId}</span>
                    </div>
                  )}
                  
                  {/* Tracking Link (only for marketplace) */}
                  {item.trackingLink && (
                    <a
                      href={item.trackingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Track Package
                    </a>
                  )}
                  
                  {/* Packing Order Link */}
                  {item.packingId && (
                    <Button
                      type="link"
                      size="small"
                      icon={<ExternalLink className="w-3 h-3" />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePackingOrderClick(item.packingId, e);
                      }}
                      className="p-0 h-auto text-blue-600 hover:text-blue-700 text-xs"
                    >
                      View Packing Order
                    </Button>
                  )}
                </div>
              )}

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



              {/* Fulfill Button for Unfulfilled Items */}
              {isUnfulfilled && canFulfillMainProduct(item) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <Button
                    type="primary"
                    block
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRowClick(item);
                    }}
                    disabled={!isUnfulfilled}
                  >
                    Fulfill Item
                  </Button>
                </div>
              )}
              {isUnfulfilled && !canFulfillMainProduct(item) && hasMissingProducts && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-amber-600 text-center italic">
                    Missing first
                  </p>
                </div>
              )}
              {/* Missing Products Toggle Button - Show above fulfill button if item has missing products */}
              {hasMissingProducts && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpansion(item.id, e);
                    }}
                    className="w-full flex items-center justify-between text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Missing Products</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs">
                        {item.missingProductsCount || missingProducts.length}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              )}

              {/* Missing Products Section - Show after Fulfill Button */}
              <AnimatePresence>
                {isExpanded && hasMissingProducts && missingProducts.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 pt-3 border-t border-amber-200 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h5 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      Missing Products ({missingProducts.length})
                    </h5>
                    <div className="space-y-2">
                      {missingProducts.map((missingProduct) => {
                        const isFulfilled = missingProduct.fulfillmentStatus === "Fulfilled";
                        return (
                          <div
                            key={missingProduct.missingProductId}
                            className={`flex items-start justify-between bg-white border rounded-lg p-2 ${isFulfilled ? "border-green-200 bg-green-50/30" : "border-amber-200"
                              }`}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-medium text-gray-900">
                                  {missingProduct.productName}
                                </p>
                                {isFulfilled && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3" />
                                    Fulfilled
                                  </span>
                                )}
                              </div>
                              {missingProduct.notes && (
                                <p className="text-xs text-gray-500 mt-1">{missingProduct.notes}</p>
                              )}
                              {isFulfilled && (
                                <div className="mt-2 space-y-1">
                                  {/* Fulfillment Type Display */}
                                  {(missingProduct.fulfillmentType || missingProduct.marketplaceName || missingProduct.courierService) && (
                                    <p className="text-xs text-gray-600">
                                      <span className="text-gray-500">Fulfilled via:</span>{" "}
                                      <span className="font-medium">
                                        {missingProduct.fulfillmentType === "japan" && missingProduct.courierService
                                          ? missingProduct.courierService
                                          : missingProduct.fulfillmentType === "marketplace" && missingProduct.marketplaceName
                                          ? missingProduct.marketplaceName
                                          : missingProduct.marketplaceName || missingProduct.courierService || "Marketplace"}
                                      </span>
                                    </p>
                                  )}
                                  {/* Courier Service (Japan) */}
                                  {missingProduct.fulfillmentType === "japan" && missingProduct.courierService && (
                                    <p className="text-xs text-gray-600">
                                      <span className="text-gray-500">Courier:</span>{" "}
                                      <span className="font-medium">{missingProduct.courierService}</span>
                                    </p>
                                  )}
                                  {/* Marketplace Name */}
                                  {missingProduct.fulfillmentType === "marketplace" && missingProduct.marketplaceName && (
                                    <p className="text-xs text-gray-600">
                                      <span className="text-gray-500">Marketplace:</span>{" "}
                                      <span className="font-medium">{missingProduct.marketplaceName}</span>
                                    </p>
                                  )}
                                  {/* Tracking ID */}
                                  {missingProduct.trackingId && (
                                    <p className="text-xs text-gray-600">
                                      <span className="text-gray-500">Tracking:</span>{" "}
                                      <span className="font-medium">{missingProduct.trackingId}</span>
                                    </p>
                                  )}
                                  {/* Packing Order Number */}
                                  {missingProduct.packingOrderNumber && (
                                    <p className="text-xs text-green-600">
                                      PO: {missingProduct.packingOrderNumber}
                                    </p>
                                  )}
                                </div>
                              )}
                              {!isFulfilled && (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
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
                              )}
                            </div>
                            {!isFulfilled && onFulfillMissingProductClick && (
                              <Button
                                type="primary"
                                size="small"
                                onClick={(e) => handleMissingProductClick(item, missingProduct, e)}
                                className="ml-2"
                              >
                                Fulfill
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

