import React, { useState } from "react";
import { Drawer, Typography, Space, Button, Spin } from "antd";

import ProcessedWooCommerceDetails from "./ProcessedWooCommerceDetails";
import ProcessedWalmartDetails from "./ProcessedWalmartDetails";
import ProcessedShopifyDetails from "./ProcessedShopifyDetails";
import AddProductModal from "./OrderDetailsDrawer/AddProductModal";
import useFullscreen from "../useFullscreen";

const { Text, Title } = Typography;

export default function ProcessedOrderDetailsDrawer({
  open,
  onClose,
  selectedOrder,
  orderDetails,
  orderDetailsLoading,
  activeTab,
  tabConfig,
  refetch,
  refetchOrderDetails,
}) {
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [selectedLineItemId, setSelectedLineItemId] = useState("");
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

  const handleAddProduct = (lineItemId) => {
    setSelectedLineItemId(lineItemId);
    setAddProductModalVisible(true);
  };

  const handleEditProduct = (lineItemId) => {
    setSelectedLineItemId(lineItemId);
    setAddProductModalVisible(true);
  };

  const handleModalClose = () => {
    setAddProductModalVisible(false);
    setSelectedLineItemId("");
  };

  const handleModalSuccess = () => {
    // Refresh lists/details so UI reflects changes immediately
    refetch?.();
    refetchOrderDetails?.();
    handleModalClose();
  };
  if (orderDetailsLoading) {
    return (
      // Show a fullscreen loading spinner when loading
      <div ref={fullscreenRef}>
        <Drawer
          width={700}
          open={open}
          onClose={onClose}
          title="Order Details"
          getContainer={getContainer}
          key={String(isFullscreen)}
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
        {/* Fullscreen container for AntD Drawer */}
        <Drawer
          width={700}
          open={open}
          onClose={onClose}
          getContainer={getContainer}
          key={String(isFullscreen)}
          title={
            <div>
              <Title level={4} className="mb-0">
                Processed Order Details of {tabConfig?.label}
              </Title>
              {activeTab === "shopify" && selectedOrder?.orderId?.includes('gid://shopify/Order/') ? (
                <Text className="text-gray-500">
                  {selectedOrder?.orderId?.replace('gid://shopify/Order/', '')} - {tabConfig?.label}
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
              {activeTab === "woocommerce" && (
                <ProcessedWooCommerceDetails
                  order={orderDetails?.order}
                  selectedOrder={selectedOrder}
                  onAddProduct={handleAddProduct}
                  onEditProduct={handleEditProduct}
                />
              )}
              {activeTab === "walmart" && (
                <ProcessedWalmartDetails
                  order={orderDetails?.order?.order}
                  selectedOrder={selectedOrder}
                  onAddProduct={handleAddProduct}
                  onEditProduct={handleEditProduct}
                />
              )}
              {activeTab === "shopify" && (
                <ProcessedShopifyDetails
                  order={orderDetails?.order}
                  selectedOrder={selectedOrder}
                  onAddProduct={handleAddProduct}
                  onEditProduct={handleEditProduct}
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

      {/* Add/Edit Product Modal */}
      <AddProductModal
        visible={addProductModalVisible}
        onCancel={handleModalClose}
        selectedOrder={selectedOrder}
        activeTab={activeTab}
        orderDetails={orderDetails}
        selectedLineItemId={selectedLineItemId}
        onSuccess={handleModalSuccess}
        getContainer={getContainer}
      />
    </>
  );
}
