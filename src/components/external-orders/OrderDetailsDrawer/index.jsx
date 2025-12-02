import React, { useState, useEffect } from "react";
import { Drawer, Typography, Space, Button, Spin, message } from "antd";
import apiClient from "../../../api/client";

import AddProductModal from "./AddProductModal";
import WooCommerceDetails from "./WooCommerceDetails";
import WalmartDetails from "./WalmartDetails";
import ShopifyDetails from "./ShopifyDetails";
import ProcessedWooCommerceDetails from "../ProcessedWooCommerceDetails";
import useFullscreen from "../../useFullscreen";

const { Text, Title } = Typography;

export default function OrderDetailsDrawer({
  open,
  onClose,
  selectedOrder,
  orderDetails,
  orderDetailsLoading,
  activeTab,
  tabConfig,
  refetch,
  refetchOrderDetails,
  onProductMappingSuccess,
}) {
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [selectedLineItemId, setSelectedLineItemId] = useState("");
  const [localKitProducts, setLocalKitProducts] = useState([]);
  const [autoMapLoading, setAutoMapLoading] = useState(false);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  
  // Reset local optimistic kit state when switching orders
  useEffect(() => {
    setLocalKitProducts([]);
  }, [selectedOrder?._id, selectedOrder?.orderId]);

  // Auto-map order when drawer opens and products have existing kits
  useEffect(() => {
    const checkAndAutoMap = async () => {
      // Avoid double calls while already checking
      if (autoMapLoading) return;

      // Only check if drawer is open, order details are loaded
      if (
        !open ||
        orderDetailsLoading ||
        !orderDetails?.order ||
        !selectedOrder?.orderId
      ) {
        return;
      }

      try {
        setAutoMapLoading(true);

        // Map activeTab to platform name for API
        const platformMap = {
          woocommerce: "woocommerce",
          walmart: "walmart",
          shopify: "shopify",
        };
        const platform = platformMap[activeTab];

        if (!platform) {
          return;
        }

        // Extract productIds (Product IDs, not LineItem IDs) from order details based on platform
        let productIds = [];
        const order = orderDetails.order;

        if (platform === "shopify" && order?.lineItems?.edges) {
          productIds = order.lineItems.edges
            .map((edge) => edge.node?.product?.id)
            .filter(Boolean);
        } else if (platform === "woocommerce" && Array.isArray(order?.line_items)) {
          productIds = order.line_items
            .map((item) => item?.id)
            .filter(Boolean);
        } else if (platform === "walmart" && order?.order?.orderLines?.orderLine) {
         
          productIds = order.order.orderLines.orderLine
            .map((line) => line?.item?.sku || line?.lineNumber || line?.orderLineId)
            .filter(Boolean);
        }

        // Call auto-map endpoint with productIds
        const response = await apiClient.post("/api/v1/orders/auto-map", {
          orderId: selectedOrder.orderId,
          platform: platform,
          productIds: productIds,
        });

        // If products were auto-mapped, update local state and refresh
        if (response.data?.success && response.data?.autoMapped) {
          const mappedProducts = response.data?.mappedProducts || [];
          
          // Update local kit products state for immediate UI feedback
          if (mappedProducts.length > 0) {
            setLocalKitProducts((prev) => {
              const next = new Set(prev.map(String));
              mappedProducts.forEach((id) => next.add(String(id)));
              return Array.from(next);
            });

            // Notify parent component about mapped products
            mappedProducts.forEach((productId) => {
              onProductMappingSuccess?.(productId);
            });
          }

          // User feedback for successful auto-mapping
          if (mappedProducts.length > 0) {
            message.success(
              `${mappedProducts.length} product${
                mappedProducts.length > 1 ? "s" : ""
              } automatically mapped to existing kit(s).`
            );
          } else if (
            response.data?.status === "processed" &&
            (response.data?.lineItemsCount || 0) ===
              (response.data?.kitsCount || 0)
          ) {
            // All products already mapped
            message.info("All products in this order are already mapped to kits.");
          }

          // Refresh the order list and details
          refetch?.();
          refetchOrderDetails?.();
        }
      } catch (error) {
        // Silently fail - don't show error to user as this is a background check
        console.log("Auto-map check failed:", error);
      } finally {
        setAutoMapLoading(false);
      }
    };

    // Add a small delay to ensure order details are fully loaded
    const timeoutId = setTimeout(() => {
      checkAndAutoMap();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    open,
    orderDetailsLoading,
    orderDetails?.order,
    selectedOrder?.orderId,
    activeTab,
    refetch,
    refetchOrderDetails,
    onProductMappingSuccess,
  ]);

  // Handle add product
  const handleAddProduct = (lineItemId) => {
    setSelectedLineItemId(lineItemId);
    setAddProductModalVisible(true);
  };

  // Handle edit product
  const handleEditProduct = async (lineItemId) => {
    setSelectedLineItemId(lineItemId);
    setAddProductModalVisible(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setAddProductModalVisible(false);
    setSelectedLineItemId("");
  };

  // Handle modal success
  const handleModalSuccess = (newMappedId) => {
    // Optimistically add to mapped list for instant UI feedback
    if (newMappedId) {
      setLocalKitProducts((prev) => {
        const next = new Set(prev.map(String));
        next.add(String(newMappedId));
        return Array.from(next);
      });
    }

    // Update upstream state and refetch as before
    onProductMappingSuccess(newMappedId);
    refetchOrderDetails();
  };

  if (orderDetailsLoading) {
    return (
      <div ref={fullscreenRef}>
      <Drawer
        getContainer={getContainer}
        key={String(isFullscreen)}
        width={700}
        open={open}
        onClose={onClose}
        title="Order Details"
        footer={
          <Space className="w-full justify-end">
            <Button onClick={onClose}>Close</Button>
          </Space>
        }
      >
        <div className="flex justify-center items-center h-full">
          <Spin size="large" />
        </div>
      </Drawer>
      </div>
    );
  }

  return (
    <>
      <div ref={fullscreenRef}>
        <Drawer
          getContainer={getContainer}
          key={String(isFullscreen)}
          width={700}
          open={open}
          onClose={onClose}
          title={
            <div>
              <Title level={4} className="mb-0">
                Order Details
              </Title>
              {/* in shopify orderId will be show like this 6163651690800, so we need to remove the gid://shopify/Order/ */}
              {activeTab === "shopify" &&
              selectedOrder?.orderId?.includes("gid://shopify/Order/") ? (
                <Text className="text-gray-500">
                  {orderDetails.order?.name} - {tabConfig?.label}
                </Text>
              ) : (
                <Text className="text-gray-500">
                  {selectedOrder?.orderId} - {tabConfig?.label}
                </Text>
              )}
            </div>
          }
          footer={
            <Space className="w-full justify-end">
              <Button onClick={onClose}>Close</Button>
            </Space>
          }
        >
          {orderDetails?.order ? (
            <div className="space-y-6">
              {/* Platform-specific content */}
              {activeTab === "woocommerce" &&
                (selectedOrder?.status === "processed" ? (
                  <ProcessedWooCommerceDetails
                    order={orderDetails?.order}
                    selectedOrder={selectedOrder}
                    onAddProduct={handleAddProduct}
                    onEditProduct={handleEditProduct}
                  />
                ) : (
                  <WooCommerceDetails
                    order={orderDetails?.order}
                    selectedOrder={selectedOrder}
                    onAddProduct={handleAddProduct}
                    onEditProduct={handleEditProduct}
                    refetchOrderDetails={refetchOrderDetails}
                    onProductMappingSuccess={onProductMappingSuccess}
                    localKitProducts={localKitProducts}
                  />
                ))}
              {activeTab === "walmart" && (
                <WalmartDetails
                  order={orderDetails?.order?.order}
                  selectedOrder={selectedOrder}
                  onAddProduct={handleAddProduct}
                  onEditProduct={handleEditProduct}
                />
              )}
              {activeTab === "shopify" && (
                <ShopifyDetails
                  order={orderDetails?.order}
                  selectedOrder={selectedOrder}
                  onAddProduct={handleAddProduct}
                  onEditProduct={handleEditProduct}
                  refetchOrderDetails={refetchOrderDetails}
                  onProductMappingSuccess={onProductMappingSuccess}
                  localKitProducts={localKitProducts}
                />
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              No order details available
            </div>
          )}
        </Drawer>
      </div>
      {/* Add Product Modal */}
      <AddProductModal
        visible={addProductModalVisible}
        onCancel={handleModalClose}
        selectedOrder={selectedOrder}
        activeTab={activeTab}
        orderDetails={orderDetails}
        selectedLineItemId={selectedLineItemId}
        onSuccess={handleModalSuccess}
      />
    </>
  );
}
