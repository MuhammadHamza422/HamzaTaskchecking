import React from "react";
import { Card, Row, Col, Tag } from "antd";

export default function ProcessedWooCommerceDetails({
  order,
  selectedOrder,
}) {
  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return (
      dateString.split("T")[0] + ", " + dateString.split("T")[1].split(".")[0]
    );
  };

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card size="small" className="bg-blue-50 border-blue-200">
        <Row gutter={16}>
          <Col span={8} className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              ${order?.total}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </Col>
          <Col span={8} className="text-center">
            <div className="text-lg font-semibold text-gray-800">
              {order?.line_items?.length}
            </div>
            <div className="text-sm text-gray-600">Items</div>
          </Col>
          <Col span={8} className="text-center">
            <Tag color="blue" className="capitalize">
              {order?.status}
            </Tag>
            <div className="text-sm text-gray-600 mt-1">Status</div>
          </Col>
        </Row>
      </Card>

      {/* Payment Information */}
      <Card
        size="small"
        title="Payment Information"
        className="border border-green-200 rounded-lg shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2">
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Payment:</dt>
              <dd className="text-gray-700">{order?.payment_method_title}</dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Method:</dt>
              <dd className="text-gray-700">{order?.payment_method}</dd>
            </div>
          </dl>
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Txn ID:</dt>
              <dd className="text-gray-700 font-mono text-sm">
                {order?.transaction_id}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Date:</dt>
              <dd className="text-gray-700">
                {formatDate(order?.date_created)}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* Billing Address */}
      <Card
        size="small"
        title="Billing Address"
        className="border border-blue-200 rounded-lg shadow-sm"
      >
        <div className="text-gray-700 space-y-2">
          <div>
            <span className="font-semibold">Name:</span>{" "}
            {order?.billing?.first_name} {order?.billing?.last_name}
          </div>
          <div>
            <span className="font-semibold">Address:</span>{" "}
            {[
              order?.billing?.address_1,
              order?.billing?.address_2,
              order?.billing?.city,
              order?.billing?.state,
              order?.billing?.postcode,
              order?.billing?.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
          {order?.billing?.phone && (
            <div>
              <span className="font-semibold">Phone:</span>{" "}
              {order.billing.phone}
            </div>
          )}
        </div>
      </Card>

      {/* Shipping Address */}
      <Card
        size="small"
        title="Shipping Address"
        className="border border-purple-200 rounded-lg shadow-sm"
      >
        <div className="text-gray-700 space-y-2">
          <div>
            <span className="font-semibold">Name:</span>{" "}
            {order?.shipping?.first_name} {order?.shipping?.last_name}
          </div>
          <div>
            <span className="font-semibold">Address:</span>{" "}
            {[
              order?.shipping?.address_1,
              order?.shipping?.address_2,
              order?.shipping?.city,
              order?.shipping?.state,
              order?.shipping?.postcode,
              order?.shipping?.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
          {order?.shipping?.phone && (
            <div>
              <span className="font-semibold">Phone:</span>{" "}
              {order.shipping.phone}
            </div>
          )}
        </div>
      </Card>

      {/* Order Items */}
      <Card size="small" title="Order Items" className="border-orange-200">
        <div className="space-y-3">
          {order?.line_items?.map((item) => {
            const itemId = item?.product_id || item?.id;
            
            return (
              <div
                key={item?.id}
                className="flex justify-between p-3 bg-gray-50 rounded border"
              >
                <div className="flex items-start gap-3 flex-1">
                  {/* Item Details */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {item?.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      SKU: {item?.sku} | Qty: {item?.quantity}
                    </div>
                    {item?.image?.src && (
                      <img
                        src={item.image.src}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded mt-2"
                      />
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {/* Check if this specific line item has mapped products */}
                  {(() => {
                    const lineItemId = item?.product_id || item?.id;
                    const hasMappedProducts =
                      selectedOrder?.kit_products &&
                      selectedOrder.kit_products.includes(
                        lineItemId?.toString()
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
                  <div className="font-semibold text-gray-900">
                    ${item?.total}
                  </div>
                  <div className="text-sm text-gray-600">
                    ${item?.price} each
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Order Notes */}
      {order?.meta_data?.find((m) => m.key === "_aftership_order_notes")
        ?.value && (
        <Card
          size="small"
          title="Activities"
          className="border-yellow-200 text-base"
        >
          <div className="space-y-2">
            {order.meta_data
              .find((m) => m.key === "_aftership_order_notes")
              .value.map((note, i) => (
                <div key={i} className="p-2 bg-yellow-50 rounded text-sm">
                  <div className="flex justify-between items-start">
                    <div className="text-gray-700">{note?.note}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(note?.date_created_gmt).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    By: {note?.author}
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
