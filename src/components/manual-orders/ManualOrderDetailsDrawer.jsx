import React from "react";
import { Drawer, Typography, Space, Button, Descriptions, Tag, Divider } from "antd";
import { motion } from "framer-motion";
import useFullscreen from "../useFullscreen";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";

const { Text, Title } = Typography;

export default function ManualOrderDetailsDrawer({
  open,
  onClose,
  selectedOrder,
  orderDetails,
  orderDetailsLoading,
}) {
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

  // Fetch platforms from API
  const { data: platformsData } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/plateforms/all");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get platform name
  const getPlatformName = (platformId) => {
    if (!platformsData?.platforms) return "Unknown Platform";
    
    const platform = platformsData.platforms.find(p => p._id === platformId);
    return platform?.plt_name || "Unknown Platform";
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
              {selectedOrder?.orderNumber} - {getPlatformName(selectedOrder?.plateform?._id || selectedOrder?.plateform)}
            </Text>
          </div>
        }
        footer={
          <Space className="w-full justify-end">
            <Button onClick={onClose}>Close</Button>
          </Space>
        }
      >
        {orderDetails?.data ? (
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
                  <Text strong>{orderDetails.data.orderNumber}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Customer ID">
                  <Text>{orderDetails.data.customerId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Platform">
                  <Tag color="blue">{getPlatformName(orderDetails.data.plateform?._id)}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag color={getStatusColor(orderDetails.data.status)}>
                    {orderDetails.data.status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Order Total">
                  <Text strong className="text-green-600">
                    {formatCurrency(orderDetails.data.order_total)}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  <Text>{formatDate(orderDetails.data.orderDate)}</Text>
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Customer Information */}
            <div className="bg-white border border-gray-200 p-4 rounded-lg">
              <Title level={5} className="mb-3">Customer Information</Title>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Username">
                  <Text>{orderDetails.data.customerUsername}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  <Text>{orderDetails.data.customerEmail}</Text>
                </Descriptions.Item>
                {orderDetails.data.requestedShippingService && (
                  <Descriptions.Item label="Shipping Service Request">
                    <Text>{orderDetails.data.requestedShippingService}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>

            {/* Shipping Information */}
            {orderDetails.data.shipTo && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <Title level={5} className="mb-3">Shipping Address</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Name">
                    <Text>{orderDetails.data.shipTo.name}</Text>
                  </Descriptions.Item>
                  {orderDetails.data.shipTo.company && (
                    <Descriptions.Item label="Company">
                      <Text>{orderDetails.data.shipTo.company}</Text>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Address">
                    <div>
                      <div>{orderDetails.data.shipTo.street1}</div>
                      {orderDetails.data.shipTo.street2 && (
                        <div>{orderDetails.data.shipTo.street2}</div>
                      )}
                      {orderDetails.data.shipTo.street3 && (
                        <div>{orderDetails.data.shipTo.street3}</div>
                      )}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="City, State, ZIP">
                    <Text>
                      {orderDetails.data.shipTo.city}, {orderDetails.data.shipTo.state} {orderDetails.data.shipTo.postalCode}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Country">
                    <Text>{orderDetails.data.shipTo.country}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    <Text>{orderDetails.data.shipTo.phone}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Residential">
                    <Tag color={orderDetails.data.shipTo.residential ? "green" : "orange"}>
                      {orderDetails.data.shipTo.residential ? "Yes" : "No"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Address Verified">
                    <Tag color={orderDetails.data.shipTo.addressVerified ? "green" : "red"}>
                      {orderDetails.data.shipTo.addressVerified ? "Yes" : "No"}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}

            {/* Billing Information */}
            {orderDetails.data.billTo && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <Title level={5} className="mb-3">Billing Address</Title>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Name">
                    <Text>{orderDetails.data.billTo.name}</Text>
                  </Descriptions.Item>
                  {orderDetails.data.billTo.company && (
                    <Descriptions.Item label="Company">
                      <Text>{orderDetails.data.billTo.company}</Text>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="Address">
                    <div>
                      <div>{orderDetails.data.billTo.street1}</div>
                      {orderDetails.data.billTo.street2 && (
                        <div>{orderDetails.data.billTo.street2}</div>
                      )}
                      {orderDetails.data.billTo.street3 && (
                        <div>{orderDetails.data.billTo.street3}</div>
                      )}
                    </div>
                  </Descriptions.Item>
                  <Descriptions.Item label="City, State, ZIP">
                    <Text>
                      {orderDetails.data.billTo.city}, {orderDetails.data.billTo.state} {orderDetails.data.billTo.postalCode}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Country">
                    <Text>{orderDetails.data.billTo.country}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phone">
                    <Text>{orderDetails.data.billTo.phone}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Residential">
                    <Tag color={orderDetails.data.billTo.residential ? "green" : "orange"}>
                      {orderDetails.data.billTo.residential ? "Yes" : "No"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Address Verified">
                    <Tag color={orderDetails.data.billTo.addressVerified ? "green" : "red"}>
                      {orderDetails.data.billTo.addressVerified ? "Yes" : "No"}
                    </Tag>
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}

            {/* Order Items */}
            {orderDetails.data.items && orderDetails.data.items.length > 0 && (
              <div className="bg-white border border-gray-200 p-4 rounded-lg">
                <Title level={5} className="mb-3">Order Items</Title>
                <div className="space-y-3">
                  {orderDetails.data.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <Text strong>{item.product?.pro_title || `Product ID: ${item.product?._id}`}</Text>
                        <div className="text-sm text-gray-600">SKU: {item.product?.sku}</div>
                        <div className="text-sm text-gray-600">Quantity: {item.quantity}</div>
                        <div className="text-sm text-gray-600">Price: {formatCurrency(item.product?.sale_price)}</div>
                      </div>
                      <div className="text-right">
                        <Text strong className="text-green-600">
                          {formatCurrency((item.product?.sale_price || 0) * item.quantity)}
                        </Text>
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
                  <Text>{formatCurrency(orderDetails.data.shipping_amount)}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Tax Amount">
                  <Text>{formatCurrency(orderDetails.data.tax_amount)}</Text>
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
