import React, { useState, useEffect, useMemo } from "react";
import { Card, Row, Col, Tag } from "antd";
import apiClient from "../../api/client";

export default function ProcessedWalmartDetails({
  order,
  selectedOrder,
  onAddProduct = () => {},
  onEditProduct = () => {},
}) {
  const [mergedProducts, setMergedProducts] = useState([]);

  // Load merged products for this order
  const loadMergedProducts = async () => {
    if (!selectedOrder?.orderId) return;
    try {
      const mergedRes = await apiClient.get(
        `/api/v1/products/mapped/product/${selectedOrder.orderId}`
      );
      setMergedProducts(
        Array.isArray(mergedRes.data?.product) ? mergedRes.data.product : []
      );
    } catch (err) {
      console.error("Failed to fetch merged products", err);
    }
  };

  useEffect(() => {
    loadMergedProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.orderId]);

  // Compute hidden line item ids from merged productIds
  const hiddenLineItemIds = useMemo(() => {
    const set = new Set();
    if (Array.isArray(mergedProducts)) {
      mergedProducts.forEach((mp) => {
        (mp?.productIds || []).forEach((id) => set.add(String(id)));
      });
    }
    return set;
  }, [mergedProducts]);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card size="small" className="bg-green-50 border-green-200">
        <Row gutter={16}>
          <Col span={8} className="text-center">
            <div className="text-2xl font-bold text-green-600">
              $
              {order?.orderLines?.orderLine
                ?.reduce((total, line) => {
                  const charge = line?.charges?.charge?.find(
                    (c) => c?.chargeType === "PRODUCT"
                  );
                  return total + (charge?.chargeAmount?.amount || 0);
                }, 0)
                .toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </Col>
          <Col span={8} className="text-center">
            <div className="text-lg font-semibold text-gray-800">
              {order?.orderLines?.orderLine?.length}
            </div>
            <div className="text-sm text-gray-600">Items</div>
          </Col>
          <Col span={8} className="text-center">
            <Tag color="green" className="capitalize">
              {order?.orderLines?.orderLine?.[0]?.orderLineStatuses
                ?.orderLineStatus?.[0]?.status || "N/A"}
            </Tag>
            <div className="text-sm text-gray-600 mt-1">Status</div>
          </Col>
        </Row>
      </Card>

      {/* Customer Information */}
      <Card
        size="small"
        title="Customer Information"
        className="border border-blue-200 rounded-lg shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-24 font-semibold text-gray-800">Customer:</dt>
              <dd className="text-gray-700">
                {order?.customerOrderId || "N/A"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 font-semibold text-gray-800">Order Date:</dt>
              <dd className="text-gray-700">
                {formatTimestamp(order?.orderDate)}
              </dd>
            </div>
          </dl>
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-24 font-semibold text-gray-800">Ship Method:</dt>
              <dd className="text-gray-700">
                {order?.orderLines?.orderLine?.[0]?.orderLineQuantity
                  ?.unitOfMeasurement || "N/A"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 font-semibold text-gray-800">Status:</dt>
              <dd className="text-gray-700">
                {order?.orderLines?.orderLine?.[0]?.orderLineStatuses
                  ?.orderLineStatus?.[0]?.status || "N/A"}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* Shipping Information */}
      <Card
        size="small"
        title="Shipping Information"
        className="border border-purple-200 rounded-lg shadow-sm"
      >
        <div className="text-gray-700 space-y-2">
          <div>
            <span className="font-semibold">Address:</span>{" "}
            {order?.shippingInfo?.postalAddress
              ? [
                  order.shippingInfo.postalAddress.name,
                  order.shippingInfo.postalAddress.address1,
                  order.shippingInfo.postalAddress.address2,
                  order.shippingInfo.postalAddress.city,
                  order.shippingInfo.postalAddress.state,
                  order.shippingInfo.postalAddress.postalCode,
                  order.shippingInfo.postalAddress.country,
                ]
                  .filter(Boolean)
                  .join(", ")
              : "N/A"}
          </div>
          {order?.shippingInfo?.phone && (
            <div>
              <span className="font-semibold">Phone:</span>{" "}
              {order.shippingInfo.phone}
            </div>
          )}
        </div>
      </Card>

      {/* Order Items */}
      <Card size="small" title="Order Items" className="border-orange-200">
        {/* Show merged products first */}
        {mergedProducts.length > 0 && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Tag color="purple" className="font-medium">
                Merged Products
              </Tag>
              <span className="text-sm text-gray-600">
                {mergedProducts.length} merged product{mergedProducts.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-2">
              {mergedProducts.map((mergedProduct, index) => {
                const firstProductId = mergedProduct?.productIds?.[0];
                const firstProduct = order?.orderLines?.orderLine?.find(
                  (line) => String(line?.lineNumber || line?.orderLineId || line?.id) === String(firstProductId)
                );

                return (
                  <div
                    key={index}
                    className="flex justify-between p-3 bg-white rounded border border-purple-200"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {mergedProduct?.productName || firstProduct?.item?.productName || "Merged Product"}
                      </div>
                      <div className="text-sm text-gray-600">
                        SKU: {mergedProduct?.sku || firstProduct?.item?.sku || "N/A"} | Qty: {mergedProduct?.quantity || firstProduct?.orderLineQuantity?.amount || 1}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        Contains {mergedProduct?.productIds?.length || 0} product{mergedProduct?.productIds?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                          Merged
                        </span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Mapped
                        </span>
                        <button
                          type="button"
                          className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProduct(firstProductId);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Show individual unmapped products */}
        <div className="space-y-3">
          {(Array.isArray(order?.orderLines?.orderLine)
            ? order.orderLines.orderLine.filter(
                (line) =>
                  !hiddenLineItemIds.has(String(line?.lineNumber || line?.orderLineId || line?.id))
              )
            : []
          ).map((line, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-gray-50 rounded"
            >
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  {line?.item?.productId}
                </p>
                <p className="font-medium text-gray-900">
                  {line?.item?.productName}
                </p>
                <p className="text-sm text-gray-600">
                  SKU: {line?.item?.sku} | Condition: {line?.item?.condition}
                </p>
                <p className="text-sm text-gray-600">
                  Qty: {line?.orderLineQuantity?.amount}{" "}
                  {line?.orderLineQuantity?.unitOfMeasurement}
                </p>
              </div>
              <div className="text-right">
                {/* Check if this specific line item has mapped products */}
                {(() => {
                  const lineItemId = line?.lineNumber || line?.orderLineId || line?.id;
                  const skuForMapping = line?.item?.sku || lineItemId;
                  const hasMappedProducts =
                    selectedOrder?.kit_products &&
                    selectedOrder.kit_products.includes(skuForMapping?.toString());

                  if (hasMappedProducts) {
                    return (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Mapped
                        </span>
                        <button
                          type="button"
                          className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProduct(lineItemId);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          Not Mapped
                        </span>
                        <button
                          type="button"
                          className="text-sm text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddProduct(lineItemId);
                          }}
                        >
                          Add Picking
                        </button>
                      </div>
                    );
                  }
                })()}
                {line?.charges?.charge?.map((charge, j) => (
                  <div key={j} className="text-sm">
                    <div className="font-semibold text-gray-900">
                      ${charge?.chargeAmount?.amount}{" "}
                      {charge?.chargeAmount?.currency}
                    </div>
                    <div className="text-xs text-gray-600">
                      {charge?.chargeName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
