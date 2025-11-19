import { useState } from "react";
import { Package, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";

export default function DropshipItemsDisplay({
  items = [],
  currency = "USD",
  title = "Dropship Items",
  dropshipId = null,
  onFulfillClick = null,
  fulfilledItemsCount = 0,
  remainingItemsCount = 0,
}) {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const handleRowClick = (item) => {
    // Only allow clicking unfulfilled items
    if (item.fulfillmentStatus === "Unfulfilled" && onFulfillClick) {
      onFulfillClick(item);
    }
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
              
              return (
                <tr
                  key={item.id || index}
                  onClick={() => handleRowClick(item)}
                  className={`hover:bg-gray-50 transition-colors ${
                    isFulfilled ? "bg-green-50/30" : isUnfulfilled ? "cursor-pointer" : ""
                  }`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
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
                  <td className="px-4 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
                    )}
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
          const isFulfilled = item.fulfillmentStatus === "Fulfilled";
          const isUnfulfilled = item.fulfillmentStatus === "Unfulfilled" || !item.fulfillmentStatus;
          
          return (
            <motion.div
              key={item.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleRowClick(item)}
              className={`rounded-lg border-2 p-4 shadow-sm ${
                isFulfilled
                  ? "bg-green-50/30 border-green-300"
                  : isUnfulfilled
                  ? "bg-white border-gray-200 cursor-pointer hover:border-blue-300"
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
                <div>
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
                  {item.marketplaceName && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Marketplace:</span>
                      <span className="font-medium text-gray-900">{item.marketplaceName}</span>
                    </div>
                  )}
                  {item.marketplaceOrderNumber && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Order #:</span>
                      <span className="font-medium text-gray-900">{item.marketplaceOrderNumber}</span>
                    </div>
                  )}
                  {item.trackingId && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Tracking:</span>
                      <span className="font-medium text-gray-900">{item.trackingId}</span>
                    </div>
                  )}
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
              {isUnfulfilled && (
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
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

