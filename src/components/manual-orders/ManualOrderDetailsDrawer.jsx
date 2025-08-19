import React from "react";
import { Drawer, Typography, Space, Button, Descriptions, Tag, Divider } from "antd";
import { motion } from "framer-motion";
import useFullscreen from "../useFullscreen";

const { Text, Title } = Typography;

export default function ManualOrderDetailsDrawer({
  open,
  onClose,
  selectedOrder,
  orderDetails,
  orderDetailsLoading,
}) {
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

  // Get platform name
  const getPlatformName = (platformId) => {
    const platformMap = {
      "6890cc6719f58a04b3f95a47": "WooCommerce",
      "6890cc6719f58a04b3f95a48": "Walmart",
      "6890cc6719f58a04b3f95a49": "Amazon",
    };
    return platformMap[platformId] || "Unknown Platform";
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "processing":
        return "blue";
      case "completed":
        return "green";
      case "cancelled":
        return "red";
      case "pending":
        return "orange";
      default:
        return "default";
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return "—";
    return `$${Number(amount).toFixed(2)}`;
  };

  // Format date
  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleString();
  };

  if (orderDetailsLoading) {
    return (
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
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading order details...</p>
            </div>
          </div>
        </Drawer>
      </div>
    );
  }

  return (
    <div ref={fullscreenRef}>
      <Drawer
        width={700}
        open={open}
        onClose={onClose}
        getContainer={getContainer}
        key={String(isFullscreen)}
        title={
          <div>
            <Title level={4} className="mb-0">
              Manual Order Details
            </Title>
            <Text className="text-gray-500">
              {selectedOrder?.orderNumber} - {getPlatformName(selectedOrder?.plateform)}
            </Text>
          </div>
        }
        footer={
          <Space className="w-full justify-end">
            <Button onClick={onClose}>Close</Button>
          </Space>
        }
      >
        {selectedOrder ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Order Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <Title level={5} className="mb-3">Order Summary</Title>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Order Number">
                  <Text strong>{selectedOrder.orderNumber}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Customer ID">
                  <Text>{selectedOrder.customerId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Platform">
                  <Tag color="blue">{getPlatformName(selectedOrder.plateform)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Order Total">
                  <Text strong className="text-green-600">
                    {formatCurrency(selectedOrder.order_total)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  <Text>{formatDate(selectedOrder.orderDate)}</Text>
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Customer Information */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <Title level={5} className="mb-3">Customer Information</Title>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Username">
                  <Text>{selectedOrder.customerUsername}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  <Text>{selectedOrder.customerEmail}</Text>
                </Descriptions.Item>
                {selectedOrder.requestShippingService && (
                  <Descriptions.Item label="Shipping Service Request">
                    <Text>{selectedOrder.requestShippingService}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>

            {/* Shipping Information */}
            {selectedOrder.shipTo && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <Title level={5} className="mb-3">Shipping Address</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Name">
                    <Text>{selectedOrder.shipTo.name}</Text>
                  </Descriptions.Item>
                  {selectedOrder.shipTo.company && (
                    <Descriptions.Item label="Company">
                      <Text>{selectedOrder.shipTo.company}</Text>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Address">
                    <div>
                      <div>{selectedOrder.shipTo.street1}</div>
                      {selectedOrder.shipTo.street2 && (
                        <div>{selectedOrder.shipTo.street2}</div>
                      )}
                      {selectedOrder.shipTo.street3 && (
                        <div>{selectedOrder.shipTo.street3}</div>
                      )}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="City, State, ZIP">
                    <Text>
                      {selectedOrder.shipTo.city}, {selectedOrder.shipTo.state} {selectedOrder.shipTo.postalCode}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Country">
                    <Text>{selectedOrder.shipTo.country}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    <Text>{selectedOrder.shipTo.phone}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Residential">
                    <Tag color={selectedOrder.shipTo.residential ? "green" : "orange"}>
                      {selectedOrder.shipTo.residential ? "Yes" : "No"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Address Verified">
                    <Tag color={selectedOrder.shipTo.addressVerified ? "green" : "red"}>
                      {selectedOrder.shipTo.addressVerified ? "Yes" : "No"}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}

            {/* Billing Information */}
            {selectedOrder.billTo && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <Title level={5} className="mb-3">Billing Address</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Name">
                    <Text>{selectedOrder.billTo.name}</Text>
                  </Descriptions.Item>
                  {selectedOrder.billTo.company && (
                    <Descriptions.Item label="Company">
                      <Text>{selectedOrder.billTo.company}</Text>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Address">
                    <div>
                      <div>{selectedOrder.billTo.street1}</div>
                      {selectedOrder.billTo.street2 && (
                        <div>{selectedOrder.billTo.street2}</div>
                      )}
                      {selectedOrder.billTo.street3 && (
                        <div>{selectedOrder.billTo.street3}</div>
                      )}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="City, State, ZIP">
                    <Text>
                      {selectedOrder.billTo.city}, {selectedOrder.billTo.state} {selectedOrder.billTo.postalCode}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Country">
                    <Text>{selectedOrder.billTo.country}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    <Text>{selectedOrder.billTo.phone}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Residential">
                    <Tag color={selectedOrder.billTo.residential ? "green" : "orange"}>
                      {selectedOrder.billTo.residential ? "Yes" : "No"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Address Verified">
                    <Tag color={selectedOrder.billTo.addressVerified ? "green" : "red"}>
                      {selectedOrder.billTo.addressVerified ? "Yes" : "No"}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}

            {/* Order Items */}
            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <Title level={5} className="mb-3">Order Items</Title>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <Text strong>Product ID: {item.product}</Text>
                        <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Details */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <Title level={5} className="mb-3">Order Details</Title>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Shipping Amount">
                  <Text>{formatCurrency(selectedOrder.shipping_amount)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Tax Amount">
                  <Text>{formatCurrency(selectedOrder.tax_amount)}</Text>
                </Descriptions.Item>
              </Descriptions>
            </div>
          </motion.div>
        ) : (
          <div className="text-center text-gray-500">
            No order details available
          </div>
        )}
      </Drawer>
    </div>
  );
}
