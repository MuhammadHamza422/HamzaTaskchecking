import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Descriptions, Tag, Space, Button, Divider, Table, Spin } from "antd";
import { ArrowLeft, Package, Calendar, User, MapPin, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const SsotDetailsPage = () => {
  const { orderNo } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);

  useEffect(() => {
    loadOrderDetails();
  }, [orderNo]);

  const loadOrderDetails = async () => {
    setLoading(true);
    // Simulate API call - replace with actual API call
    setTimeout(() => {
      // Mock data - replace with actual API response
      const mockData = {
        key: "1",
        platform: "Shopify",
        orderNo: orderNo || "1001",
        processedVia: "Hector",
        packingStatus: "Partially Packed",
        itemsPacked: 3,
        totalItems: 5,
        packedBy: "Hector",
        whShippingStatus: "Validated",
        dsStatus: "Pending",
        dsItems: 2,
        fulfillmentStatus: "Partially Fulfilled",
        fulfilledFrom: "Osaka",
        orderTs: "2023-10-26T10:00:00",
        processedAt: "2023-10-26T10:05:00",
        packedAt: "2023-10-26T10:30:00",
        shippedAt: null,
        deoFe: 85,
        whFe: 90,
        overallFe: 88,
        customerName: "John Doe",
        customerEmail: "john.doe@example.com",
        shippingAddress: "123 Main St, Osaka, Japan 12345",
        orderValue: 299.99,
        currency: "USD",
        items: [
          { sku: "SKU-001", name: "Product A", quantity: 2, status: "Packed" },
          { sku: "SKU-002", name: "Product B", quantity: 1, status: "Packed" },
          { sku: "SKU-003", name: "Product C", quantity: 2, status: "Pending" },
        ],
      };
      setOrderData(mockData);
      setLoading(false);
    }, 500);
  };

  const getStatusColor = (status) => {
    const statusMap = {
      Complete: "success",
      "Partially Packed": "warning",
      Pending: "default",
      Validated: "success",
      Invalid: "error",
      "Partially Fulfilled": "warning",
    };
    return statusMap[status] || "default";
  };

  const itemColumns = [
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
    },
    {
      title: "Product Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag color={status === "Packed" ? "success" : "warning"}>{status}</Tag>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <p className="text-red-600 mb-4">Order not found</p>
          <Button onClick={() => navigate("/fulfillment/ssot")}>Back to SSOT</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            icon={<ArrowLeft />}
            onClick={() => navigate("/fulfillment/ssot")}
            className="mb-4"
          >
            Back to SSOT
          </Button>
        </div>

        {/* Order Header Card */}
        <Card className="mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Order #{orderData.orderNo}
              </h1>
              <Tag color="blue" className="text-lg">
                {orderData.platform}
              </Tag>
            </div>
            <Tag color={getStatusColor(orderData.fulfillmentStatus)} className="text-lg px-4 py-2">
              {orderData.fulfillmentStatus}
            </Tag>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Order Information */}
            <Card title="Order Information" className="shadow-sm">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Order Number">{orderData.orderNo}</Descriptions.Item>
                <Descriptions.Item label="Platform">
                  <Tag color="blue">{orderData.platform}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Processed Via">{orderData.processedVia}</Descriptions.Item>
                <Descriptions.Item label="Order Timestamp">
                  {orderData.orderTs
                    ? format(new Date(orderData.orderTs), "MMM dd, yyyy HH:mm")
                    : "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Order Value">
                  {orderData.currency} {orderData.orderValue?.toFixed(2)}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Packing Information */}
            <Card title="Packing Information" className="shadow-sm">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Packing Status">
                  <Tag color={getStatusColor(orderData.packingStatus)}>
                    {orderData.packingStatus}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Items Packed">
                  {orderData.itemsPacked} / {orderData.totalItems}
                </Descriptions.Item>
                <Descriptions.Item label="Packed By">{orderData.packedBy}</Descriptions.Item>
                <Descriptions.Item label="Packed At">
                  {orderData.packedAt
                    ? format(new Date(orderData.packedAt), "MMM dd, yyyy HH:mm")
                    : "N/A"}
                </Descriptions.Item>
                <Descriptions.Item label="Processed At">
                  {orderData.processedAt
                    ? format(new Date(orderData.processedAt), "MMM dd, yyyy HH:mm")
                    : "N/A"}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Shipping Information */}
            <Card title="Shipping Information" className="shadow-sm">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="WH Shipping Status">
                  <Tag color={getStatusColor(orderData.whShippingStatus)}>
                    {orderData.whShippingStatus}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Shipped At">
                  {orderData.shippedAt
                    ? format(new Date(orderData.shippedAt), "MMM dd, yyyy HH:mm")
                    : "Not Shipped"}
                </Descriptions.Item>
                <Descriptions.Item label="Fulfilled From">
                  <Space>
                    <MapPin className="w-4 h-4" />
                    {orderData.fulfilledFrom}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Customer Information */}
            <Card title="Customer Information" className="shadow-sm">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="Customer Name">
                  <Space>
                    <User className="w-4 h-4" />
                    {orderData.customerName}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Email">{orderData.customerEmail}</Descriptions.Item>
                <Descriptions.Item label="Shipping Address">
                  <Space>
                    <MapPin className="w-4 h-4" />
                    {orderData.shippingAddress}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Dropship Information */}
            <Card title="Dropship Information" className="shadow-sm">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="DS Status">
                  <Tag color={getStatusColor(orderData.dsStatus)}>{orderData.dsStatus}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="DS Items">{orderData.dsItems}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Fulfillment Efficiency */}
            <Card title="Fulfillment Efficiency" className="shadow-sm">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-sm text-gray-600">DEO FE %</p>
                    <p
                      className={`text-2xl font-bold ${
                        orderData.deoFe < 90 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {orderData.deoFe}%
                    </p>
                  </div>
                  {orderData.deoFe < 90 ? (
                    <XCircle className="w-8 h-8 text-red-600" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-sm text-gray-600">WH FE %</p>
                    <p
                      className={`text-2xl font-bold ${
                        orderData.whFe < 90 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {orderData.whFe}%
                    </p>
                  </div>
                  {orderData.whFe < 90 ? (
                    <XCircle className="w-8 h-8 text-red-600" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  )}
                </div>
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-sm text-gray-600">Overall FE %</p>
                    <p
                      className={`text-2xl font-bold ${
                        orderData.overallFe < 90 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {orderData.overallFe}%
                    </p>
                  </div>
                  {orderData.overallFe < 90 ? (
                    <XCircle className="w-8 h-8 text-red-600" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Order Items Table */}
        <Card title="Order Items" className="mt-6 shadow-sm">
          <Table
            columns={itemColumns}
            dataSource={orderData.items}
            pagination={false}
            rowKey="sku"
          />
        </Card>
      </div>
    </div>
  );
};

export default SsotDetailsPage;

