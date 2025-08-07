import React from "react";
import { Card, Row, Col, Tag } from "antd";

export default function ProcessedWalmartDetails({
  order,
  selectedOrder,
}) {
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
        <div className="space-y-3">
          {order?.orderLines?.orderLine?.map((line, i) => (
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
                  // For Walmart, we need to check using the SKU since that's what's stored in kits
                  const lineItemId = line?.lineNumber || line?.orderLineId || line?.id;
                  const skuForMapping = line?.item?.sku || lineItemId;
                  const hasMappedProducts =
                    selectedOrder?.kit_products &&
                    selectedOrder.kit_products.includes(
                      skuForMapping?.toString()
                    );

                  if (hasMappedProducts) {
                    return (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Mapped
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        Not Mapped
                      </span>
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
