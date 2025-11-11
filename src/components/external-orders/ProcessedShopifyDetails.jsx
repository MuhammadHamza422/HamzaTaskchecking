import React, { useState, useEffect, useMemo } from "react";
import { Card, Row, Col, Tag, Button } from "antd";
import apiClient from "../../api/client";

export default function ProcessedShopifyDetails({
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
        `/api/v1/products/mapped/product/${encodeURIComponent(selectedOrder.orderId)}`
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

  // Helper function to format currency
  const formatCurrency = (amount, currencyCode = "USD") => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  // Get order status message with background highlighting
  const getOrderStatusMessage = (selectedOrder) => {
    const shopifyDetails = selectedOrder?.shopifyDetails;
    if (!shopifyDetails) return null;

    // Check for fraud
    if (shopifyDetails.cancel_reason === "fraud") {
      return {
        message: "⚠️ This order has a high risk of fraud and should be reviewed carefully.",
        bgColor: "bg-red-50 border-red-200",
        textColor: "text-red-800",
        icon: "🚨"
      };
    }

    // Check for cancelled orders
    if (shopifyDetails.cancelled_at) {
      const cancelReason = shopifyDetails.cancel_reason;
      const reasonText = {
        customer: "Customer requested cancellation",
        staff: "Cancelled by staff",
        inventory: "Cancelled due to inventory issues",
        fraud: "Cancelled due to fraud detection"
      }[cancelReason] || `Cancelled: ${cancelReason || "Unknown reason"}`;

      return {
        message: `❌ Order cancelled: ${reasonText}`,
        bgColor: "bg-orange-50 border-orange-200",
        textColor: "text-orange-800",
        icon: "⚠️"
      };
    }

    // // Check for refunded orders
    // if (shopifyDetails.financial_status === "refunded") {
    //   return {
    //     message: "💸 This order has been refunded.",
    //     bgColor: "bg-blue-50 border-blue-200",
    //     textColor: "text-blue-800",
    //     icon: "💰"
    //   };
    // }

    return null;
  };

  const lineItems = (order?.lineItems?.edges || []).map((e) => e.node);

  const resolveProductUrl = (node) => {
    if (!node) return null;
    const directUrl = node?.product?.onlineStoreUrl || node?.onlineStoreUrl;
    if (directUrl) return directUrl;
    const handle = node?.product?.handle || node?.handle;
    if (handle) {
      return `https://retrofam.com/products/${handle}`;
    }
    return null;
  };

  const statusMessage = getOrderStatusMessage(selectedOrder);

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {statusMessage && (
        <div className={`p-4 rounded-lg border-2 ${statusMessage.bgColor}`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">{statusMessage.icon}</span>
            <span className={`font-medium ${statusMessage.textColor}`}>
              {statusMessage.message}
            </span>
          </div>
        </div>
      )}

      {/* Order Summary */}
      <Card size="small" className="bg-blue-50 border-blue-200">
        <Row gutter={16}>
          <Col span={8} className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                order?.totalPriceSet?.shopMoney?.amount,
                order?.totalPriceSet?.shopMoney?.currencyCode
              )}
            </div>
            <div className="text-sm text-gray-600">Total</div>
          </Col>
          <Col span={8} className="text-center">
            <div className="text-lg font-semibold text-gray-800">
              {lineItems.length}
            </div>
            <div className="text-sm text-gray-600">Items</div>
          </Col>
          <Col span={8} className="text-center">
            <div className="flex flex-col items-center gap-1">
              {/* <Tag color="blue">{order?.displayFinancialStatus}</Tag> */}
              <Tag color="orange">{order?.displayFulfillmentStatus}</Tag>
            </div>
            <div className="text-sm text-gray-600 mt-1">Status</div>
          </Col>
        </Row>
      </Card>

      {/* Payment & Totals */}
      <Card
        size="small"
        title="Payment & Totals"
        className="border border-green-200 rounded-lg shadow-sm"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Payment:</dt>
              <dd className="text-gray-700">
                {(order?.paymentGatewayNames || []).join(", ") || "—"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Confirm #:</dt>
              <dd className="text-gray-700">{order?.confirmationNumber || "—"}</dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Locale:</dt>
              <dd className="text-gray-700">{order?.customerLocale || "—"}</dd>
            </div>
          </dl>
          <dl className="space-y-2">
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Subtotal:</dt>
              <dd className="text-gray-700">
                {formatCurrency(
                  order?.subtotalPriceSet?.shopMoney?.amount,
                  order?.subtotalPriceSet?.shopMoney?.currencyCode || order?.totalPriceSet?.shopMoney?.currencyCode
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Discounts:</dt>
              <dd className="text-gray-700">
                {formatCurrency(
                  order?.totalDiscountsSet?.shopMoney?.amount,
                  order?.totalDiscountsSet?.shopMoney?.currencyCode || order?.totalPriceSet?.shopMoney?.currencyCode
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-28 font-semibold text-gray-800">Tax:</dt>
              <dd className="text-gray-700">
                {formatCurrency(
                  order?.totalTaxSet?.shopMoney?.amount,
                  order?.totalTaxSet?.shopMoney?.currencyCode || order?.totalPriceSet?.shopMoney?.currencyCode
                )}
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
            {order?.billingAddress?.firstName} {order?.billingAddress?.lastName}
          </div>
          <div>
            <span className="font-semibold">Address:</span>{" "}
            {[
              order?.billingAddress?.address1,
              order?.billingAddress?.address2,
              order?.billingAddress?.city,
              order?.billingAddress?.province,
              order?.billingAddress?.zip,
              order?.billingAddress?.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
          {order?.billingAddress?.phone && (
            <div>
              <span className="font-semibold">Phone:</span>{" "}
              {order.billingAddress.phone}
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
            {order?.shippingAddress?.firstName} {order?.shippingAddress?.lastName}
          </div>
          <div>
            <span className="font-semibold">Address:</span>{" "}
            {[
              order?.shippingAddress?.address1,
              order?.shippingAddress?.address2,
              order?.shippingAddress?.city,
              order?.shippingAddress?.province,
              order?.shippingAddress?.zip,
              order?.shippingAddress?.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
          {order?.shippingAddress?.phone && (
            <div>
              <span className="font-semibold">Phone:</span>{" "}
              {order.shippingAddress.phone}
            </div>
          )}
        </div>
      </Card>

      {/* Order Items */}
      <Card size="small" title="Order Items" className="border-orange-200">
        {/* Show merged products first */}
        {Array.isArray(mergedProducts) && mergedProducts.length > 0 && (
          <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="space-y-2">
              {mergedProducts.map((mergedProduct, index) => {
                const firstProductId = mergedProduct?.productIds?.[0];
                const firstNode = lineItems.find(
                  (n) => String(n?.id) === String(firstProductId)
                );
                const actionId = String(
                  mergedProduct?.productIds?.[0] || mergedProduct?.shopify_id || ""
                );
                return (
                  <div
                    key={index}
                    className="flex justify-between p-3 bg-white rounded border border-purple-200"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {mergedProduct?.pro_title || firstNode?.name || "Merged Product"}
                      </div>
                      <div className="text-sm text-gray-600">
                        SKU: {mergedProduct?.sku || firstNode?.sku || "N/A"}
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        Contains {mergedProduct?.productIds?.length || 0} product
                        {mergedProduct?.productIds?.length !== 1 ? "s" : ""}
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
                        {resolveProductUrl(firstNode) && (
                          <Button
                            size="small"
                            type="link"
                            href={resolveProductUrl(firstNode)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Listing
                          </Button>
                        )}
                        {actionId && (
                          <button
                            type="button"
                            className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditProduct(actionId);
                            }}
                          >
                            Edit
                          </button>
                        )}
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
          {lineItems
            .filter((node) => !hiddenLineItemIds.has(String(node?.id)))
            .map((node) => {
              const isMapped = Array.isArray(selectedOrder?.kit_products)
                ? selectedOrder.kit_products.includes(String(node?.id))
                : false;

              const unitAmount = parseFloat(
                node?.originalUnitPriceSet?.shopMoney?.amount || 0
              );
              const unitCurrency =
                node?.originalUnitPriceSet?.shopMoney?.currencyCode || "USD";
              const totalAmount = unitAmount * (node?.quantity || 1);

              return (
                <div
                  key={node?.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{node?.name}</div>
                    <div className="text-sm text-gray-600">
                      SKU: {node?.sku || "N/A"} | Qty: {node?.quantity}
                    </div>
                  </div>
                  <div className="text-right">
                    {isMapped ? (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Mapped
                        </span>
                        {resolveProductUrl(node) && (
                          <Button
                            size="small"
                            type="link"
                            href={resolveProductUrl(node)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Listing
                          </Button>
                        )}
                        <button
                          type="button"
                          className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditProduct(node?.id);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                          Not Mapped
                        </span>
                        {resolveProductUrl(node) && (
                          <Button
                            size="small"
                            type="link"
                            href={resolveProductUrl(node)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Listing
                          </Button>
                        )}
                        <button
                          type="button"
                          className="text-sm text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddProduct(node?.id);
                          }}
                        >
                          Add Picking
                        </button>
                      </div>
                    )}
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(totalAmount, unitCurrency)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatCurrency(unitAmount, unitCurrency)} each
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
}


