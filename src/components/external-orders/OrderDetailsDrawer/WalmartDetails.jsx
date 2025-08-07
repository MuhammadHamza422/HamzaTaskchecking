import React from "react";
import { Card, Row, Col, Tag } from "antd";

export default function WalmartDetails({
  order,
  selectedOrder,
  onAddProduct,
  onEditProduct,
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
              <dt className="w-24 font-semibold text-gray-800">Order ID:</dt>
              <dd className="text-gray-700 font-mono text-sm">
                {order?.purchaseOrderId}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-24 font-semibold text-gray-800">
                Customer ID:
              </dt>
              <dd className="text-gray-700 font-mono text-sm">
                {order?.customerOrderId}
              </dd>
            </div>
          </dl>
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-24 font-semibold text-gray-800">Email:</dt>
              <dd className="text-gray-700">{order?.customerEmailId}</dd>
            </div>
            <div className="flex">
              <dt className="w-24 font-semibold text-gray-800">
                Order Date:
              </dt>
              <dd className="text-gray-700">
                {formatTimestamp(order?.orderDate)}
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
        <div className="space-y-4">
          <div>
            <div className="font-semibold text-gray-800 mb-2">
              Shipping Address
            </div>
            <div className="text-gray-700 space-y-1">
              <div>{order?.shippingInfo?.postalAddress?.name}</div>
              <div>{order?.shippingInfo?.postalAddress?.address1}</div>
              {order?.shippingInfo?.postalAddress?.address2 && (
                <div>{order.shippingInfo.postalAddress.address2}</div>
              )}
              <div>
                {order?.shippingInfo?.postalAddress?.city},{" "}
                {order?.shippingInfo?.postalAddress?.state}{" "}
                {order?.shippingInfo?.postalAddress?.postalCode}
              </div>
              <div>{order?.shippingInfo?.postalAddress?.country}</div>
              <div className="mt-2">
                <span className="font-semibold">Phone:</span>{" "}
                {order?.shippingInfo?.phone}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="font-semibold text-gray-800 mb-1">
                Shipping Method
              </div>
              <div className="text-gray-700">
                {order?.shippingInfo?.carrierMethodName} (
                {order?.shippingInfo?.methodCode})
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-800 mb-1">
                Delivery Estimates
              </div>
              <div className="text-gray-700 text-sm">
                <div>
                  Ship:{" "}
                  {formatTimestamp(order?.shippingInfo?.estimatedShipDate)}
                </div>
                <div>
                  Delivery:{" "}
                  {formatTimestamp(
                    order?.shippingInfo?.estimatedDeliveryDate
                  )}
                </div>
              </div>
            </div>
          </div>
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
                  // For Walmart, we need to check using the SKU since that's what's stored in mapped_products
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
                        <button
                          className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                          onClick={() => onEditProduct(lineItemId)}
                        >
                          Edit
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <button
                        className="text-sm text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                        onClick={() => onAddProduct(lineItemId)}
                      >
                        Add Picking
                      </button>
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

      {/* Fulfillment Information */}
      <Card
        size="small"
        title="Fulfillment Information"
        className="border border-green-200 rounded-lg shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="font-semibold text-gray-800 mb-1">Ship Node</div>
            <div className="text-gray-700">
              <div>
                {order?.shipNode?.name} ({order?.shipNode?.type})
              </div>
              <div className="text-sm text-gray-600">
                ID: {order?.shipNode?.id}
              </div>
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-800 mb-1">
              Fulfillment
            </div>
            <div className="text-gray-700">
              <div>
                {
                  order?.orderLines?.orderLine?.[0]?.fulfillment
                    ?.fulfillmentOption
                }
              </div>
              <div className="text-sm text-gray-600">
                {order?.orderLines?.orderLine?.[0]?.fulfillment?.shipMethod} -{" "}
                {
                  order?.orderLines?.orderLine?.[0]?.fulfillment
                    ?.shippingProgramType
                }
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
