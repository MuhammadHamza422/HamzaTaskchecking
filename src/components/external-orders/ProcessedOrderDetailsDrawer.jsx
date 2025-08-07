import React from "react";
import {
  Drawer,
  Typography,
  Space,
  Button,
  Spin,
} from "antd";

import ProcessedWooCommerceDetails from "./ProcessedWooCommerceDetails";
import ProcessedWalmartDetails from "./ProcessedWalmartDetails";

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
    <Drawer
      width={700}
      open={open}
      onClose={onClose}
      title={
        <div>
          <Title level={4} className="mb-0">
            Processed Order Details
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
            <ProcessedWooCommerceDetails
              order={orderDetails?.order}
              selectedOrder={selectedOrder}
            />
          )}
          {activeTab === "walmart" && (
            <ProcessedWalmartDetails
              order={orderDetails?.order?.order}
              selectedOrder={selectedOrder}
            />
          )}
        </div>
      ) : (
        <div className="text-center text-gray-500">
          No order details available
        </div>
      )}
    </Drawer>
  );
}
