import React, { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Tag, Button, Checkbox, message } from "antd";
import apiClient from "../../../api/client";
import Swal from "sweetalert2";

export default function ShopifyDetails({
  order,
  selectedOrder,
  onAddProduct,
  onEditProduct,
  refetchOrderDetails,
  onProductMappingSuccess,
  localKitProducts = [],
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [localMergedIds, setLocalMergedIds] = useState([]);
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

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return (
      dateString.split("T")[0] + ", " + dateString.split("T")[1].split(".")[0]
    );
  };

  // Helper function to format currency
  const formatCurrency = (amount, currencyCode = "USD") => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(parseFloat(amount));
  };

  // Handle checkbox selection
  const handleItemSelect = (itemId, checked) => {
    if (checked) {
      setSelectedItems((prev) => [...prev, itemId]);
    } else {
      setSelectedItems((prev) => prev.filter((id) => id !== itemId));
    }
  };

  // Handle merge items
  const handleMergeItems = async () => {
    if (selectedItems.length < 2) {
      message.warning("Please select at least 2 items to merge");
      return;
    }

    setIsMerging(true);
    try {
      const itemsToMerge = order?.lineItems?.edges
        ?.filter((edge) => selectedItems.includes(edge.node.id))
        ?.map((edge) => edge.node) || [];

      if (itemsToMerge.length === 0) {
        message.error("No items found to merge");
        return;
      }

      // Create merge payload
      const mergePayload = {
        orderId: selectedOrder.orderId,
        items: itemsToMerge.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.originalUnitPriceSet?.shopMoney?.amount || "0",
          sku: item.sku || "",
        })),
      };

      const response = await apiClient.post(
        "/api/v1/products/merge/shopify",
        mergePayload
      );

      if (response.data?.success) {
        message.success("Items merged successfully");
        setSelectedItems([]);
        loadMergedProducts();
        refetchOrderDetails();
      } else {
        message.error(response.data?.message || "Failed to merge items");
      }
    } catch (error) {
      console.error("Error merging items:", error);
      message.error(
        error.response?.data?.message || "Failed to merge items"
      );
    } finally {
      setIsMerging(false);
    }
  };

  // Calculate selected items total
  const selectedItemsTotal = useMemo(() => {
    if (!order?.lineItems?.edges) return 0;
    
    return order.lineItems.edges
      .filter((edge) => selectedItems.includes(edge.node.id))
      .reduce((total, edge) => {
        const price = parseFloat(edge.node.originalUnitPriceSet?.shopMoney?.amount || "0");
        const quantity = edge.node.quantity || 1;
        return total + (price * quantity);
      }, 0);
  }, [selectedItems, order?.lineItems?.edges]);

  // Get line items (excluding merged ones)
  const visibleLineItems = useMemo(() => {
    if (!order?.lineItems?.edges) return [];
    
    return order.lineItems.edges
      .map((edge) => edge.node)
      .filter((item) => !hiddenLineItemIds.has(item.id));
  }, [order?.lineItems?.edges, hiddenLineItemIds]);

  return (
    <div className="space-y-4">
      {/* Order Information */}
      <Card
        size="small"
        title="Order Information"
        className="border border-blue-200 rounded-lg shadow-sm"
      >
        <div className="text-gray-700 space-y-2">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Order ID:</dt>
              <dd className="text-gray-700">
                {order?.id?.replace('gid://shopify/Order/', '') || order?.id}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Name:</dt>
              <dd className="text-gray-700">{order?.name}</dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Email:</dt>
              <dd className="text-gray-700">{order?.email || "—"}</dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Phone:</dt>
              <dd className="text-gray-700">{order?.phone || "—"}</dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Total:</dt>
              <dd className="text-gray-700">
                {formatCurrency(
                  order?.totalPriceSet?.shopMoney?.amount,
                  order?.totalPriceSet?.shopMoney?.currencyCode
                )}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Status:</dt>
              <dd className="text-gray-700">
                <Tag color="blue">{order?.displayFinancialStatus}</Tag>
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Fulfillment:</dt>
              <dd className="text-gray-700">
                <Tag color="orange">{order?.displayFulfillmentStatus}</Tag>
              </dd>
            </div>
            <div className="flex">
              <dt className="w-20 font-semibold text-gray-800">Date:</dt>
              <dd className="text-gray-700">
                {formatDate(order?.createdAt)}
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
        {/* Show merged products from order.merged_products_data if present */}
        {Array.isArray(mergedProducts) && mergedProducts.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-semibold text-purple-700 mb-2">
              Merged Product(s)
            </div>
            <div className="space-y-2">
              {mergedProducts.map((mp) => {
                const actionId = String(mp?.productIds?.[0] || mp?.shopify_id || "");
                const hasMappedProducts =
                  !!actionId &&
                  ((Array.isArray(selectedOrder?.kit_products) &&
                    selectedOrder?.kit_products.includes(actionId)) ||
                    (Array.isArray(localKitProducts) &&
                      localKitProducts.includes(actionId)));
                return (
                  <div
                    key={mp._id}
                    className="flex justify-between items-center p-3 rounded border-2 border-purple-200 bg-purple-50"
                  >
                    <div>
                      <div className="font-bold text-purple-900">
                        {mp?.pro_title}
                      </div>
                      <div className="text-xs text-gray-700">SKU: {mp?.sku}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-right ml-2">
                        <div className="font-semibold text-purple-900">
                          ${mp?.price}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-medium">
                          Merged
                        </p>
                        {hasMappedProducts && (
                          <p className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                            Mapped
                          </p>
                        )}
                        {actionId &&
                          (hasMappedProducts ? (
                            <button
                              className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                              onClick={() => onEditProduct(actionId)}
                            >
                              Edit
                            </button>
                          ) : (
                            <button
                              className="text-sm whitespace-nowrap text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                              onClick={() => onAddProduct(actionId)}
                            >
                              Add Picking
                            </button>
                          ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Merge Button */}
        {selectedItems.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-800">
                  {selectedItems.length} item(s) selected
                </span>
                <span className="text-sm text-blue-600">
                  Total: {formatCurrency(selectedItemsTotal, order?.totalPriceSet?.shopMoney?.currencyCode)}
                </span>
              </div>
              <Button
                type="primary"
                onClick={handleMergeItems}
                loading={isMerging}
                className="bg-green-600 hover:bg-green-700 border-green-600"
                size="small"
              >
                {isMerging ? "Merging..." : "Merge Selected Items"}
              </Button>
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="space-y-3">
          {visibleLineItems.map((item) => {
            const isSelected = selectedItems.includes(item.id);
            const hasMappedProducts =
              Array.isArray(selectedOrder?.kit_products) &&
              selectedOrder?.kit_products.includes(item.id);
            const hasLocalMappedProducts =
              Array.isArray(localKitProducts) &&
              localKitProducts.includes(item.id);

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleItemSelect(item.id, e.target.checked)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Quantity: {item.quantity}</div>
                        {item.sku && <div>SKU: {item.sku}</div>}
                        {item.vendor && <div>Vendor: {item.vendor}</div>}
                        <div>
                          Price: {formatCurrency(
                            item.originalUnitPriceSet?.shopMoney?.amount,
                            item.originalUnitPriceSet?.shopMoney?.currencyCode
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {formatCurrency(
                          (parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || "0") * item.quantity),
                          item.originalUnitPriceSet?.shopMoney?.currencyCode
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(hasMappedProducts || hasLocalMappedProducts) && (
                        <p className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          Mapped
                        </p>
                      )}
                      {(hasMappedProducts || hasLocalMappedProducts) ? (
                        <button
                          className="text-sm text-blue-600 p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 transition-colors"
                          onClick={() => onEditProduct(item.id)}
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          className="text-sm whitespace-nowrap text-gray-600 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
                          onClick={() => onAddProduct(item.id)}
                        >
                          Add Picking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {visibleLineItems.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No items available
          </div>
        )}
      </Card>
    </div>
  );
}
