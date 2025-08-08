import React, { useState, useEffect } from "react";
import {
  Drawer,
  Typography,
  Space,
  Button,
  Spin,
} from "antd";

import AddProductModal from "./AddProductModal";
import WooCommerceDetails from "./WooCommerceDetails";
import WalmartDetails from "./WalmartDetails";

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

  // Reset local optimistic kit state when switching orders
  useEffect(() => {
    setLocalKitProducts([]);
  }, [selectedOrder?._id, selectedOrder?.orderId]);

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
      <Drawer
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
    );
  }

  return (
    <>
      <Drawer
        width={700}
        open={open}
        onClose={onClose}
        title={
          <div>
            <Title level={4} className="mb-0">
              Order Details
            </Title>
            <Text className="text-gray-500">
              {selectedOrder?.orderId} - {tabConfig?.label}
            </Text>
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
              <WooCommerceDetails
                order={orderDetails?.order}
                selectedOrder={selectedOrder}
                onAddProduct={handleAddProduct}
                onEditProduct={handleEditProduct}
                refetchOrderDetails={refetchOrderDetails}
                onProductMappingSuccess={onProductMappingSuccess}
                localKitProducts={localKitProducts}
              />
            )}
            {activeTab === "walmart" && (
              <WalmartDetails
                order={orderDetails?.order?.order}
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
