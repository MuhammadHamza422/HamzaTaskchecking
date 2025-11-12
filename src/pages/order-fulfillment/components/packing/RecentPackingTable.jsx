import { Table } from "antd";
import { useNavigate } from "react-router-dom";
import StatusBadge from "../common/StatusBadge";
import PlatformBadge from "../common/PlatformBadge";
import dayjs from "dayjs";

const mockRecentData = [
  {
    id: 1,
    orderNumber: "ORD-12345",
    customerName: "John Doe",
    platform: "Shopify",
    date: "2025-01-15T10:30:00",
    status: "Completely Fulfilled",
    totalValue: 299.99,
  },
  {
    id: 2,
    orderNumber: "ORD-12346",
    customerName: "Jane Smith",
    platform: "WooCommerce",
    date: "2025-01-15T09:15:00",
    status: "Partially Fulfilled",
    totalValue: 149.50,
  },
  {
    id: 3,
    orderNumber: "ORD-12347",
    customerName: "Bob Johnson",
    platform: "Walmart",
    date: "2025-01-15T08:45:00",
    status: "Completely Fulfilled",
    totalValue: 89.99,
  },
  {
    id: 4,
    orderNumber: "ORD-12348",
    customerName: "Alice Williams",
    platform: "Shopify",
    date: "2025-01-14T16:20:00",
    status: "Completely Fulfilled",
    totalValue: 199.99,
  },
  {
    id: 5,
    orderNumber: "ORD-12349",
    customerName: "Charlie Brown",
    platform: "WooCommerce",
    date: "2025-01-14T14:10:00",
    status: "Partially Fulfilled",
    totalValue: 79.99,
  },
];

export default function RecentPackingTable() {
  const navigate = useNavigate();

  const columns = [
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (text) => (
        <span className="font-semibold text-gray-900 text-sm">{text}</span>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      render: (text) => <span className="text-sm text-gray-700">{text}</span>,
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (platform) => <PlatformBadge platform={platform} />,
    },
    {
      title: "Date & Time",
      dataIndex: "date",
      key: "date",
      render: (date) => (
        <span className="text-sm text-gray-600">
          {dayjs(date).format("MMM DD, YYYY HH:mm")}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Value",
      dataIndex: "totalValue",
      key: "totalValue",
      render: (value) => (
        <span className="font-semibold text-gray-900 text-sm">
          ${value.toFixed(2)}
        </span>
      ),
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Recent Packing Operations
            </h3>
            <p className="text-sm text-gray-600">
              Latest {mockRecentData.length} packing operations
            </p>
          </div>
          <button
            onClick={() => navigate("/fulfillment/packing/list")}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All →
          </button>
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={mockRecentData}
        rowKey="id"
        pagination={false}
        onRow={(record) => ({
          onClick: () => navigate(`/fulfillment/packing/${record.orderNumber}`),
          className: "cursor-pointer hover:bg-gray-50 transition-colors",
        })}
        className="fulfillment-table"
      />
    </div>
  );
}

