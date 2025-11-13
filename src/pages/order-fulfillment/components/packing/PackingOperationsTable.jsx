import { useState } from "react";
import { Table, Select, DatePicker, Input } from "antd";
import { Search } from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import PlatformBadge from "../common/PlatformBadge";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const mockData = [
  {
    id: 1,
    orderNumber: "ORD-12345",
    customerName: "John Doe",
    platform: "Shopify",
    date: "2025-01-15",
    status: "Completely Fulfilled",
    totalValue: 299.99,
  },
  {
    id: 2,
    orderNumber: "ORD-12346",
    customerName: "Jane Smith",
    platform: "WooCommerce",
    date: "2025-01-15",
    status: "Partially Fulfilled",
    totalValue: 149.50,
  },
  {
    id: 3,
    orderNumber: "ORD-12347",
    customerName: "Bob Johnson",
    platform: "Walmart",
    date: "2025-01-14",
    status: "Completely Fulfilled",
    totalValue: 89.99,
  },
];

export default function PackingOperationsTable() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    platform: null,
    status: null,
    dateRange: null,
    search: "",
  });

  const columns = [
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (text) => <span className="font-semibold text-gray-900 text-sm">{text}</span>,
    },
    {
      title: "Customer Name",
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
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => <span className="text-sm text-gray-600">{dayjs(date).format("MMM DD, YYYY")}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Total Value",
      dataIndex: "totalValue",
      key: "totalValue",
      render: (value) => <span className="font-semibold text-gray-900 text-sm">${value.toFixed(2)}</span>,
    },
  ];

  const filteredData = mockData.filter((item) => {
    if (filters.platform && item.platform.toLowerCase() !== filters.platform.toLowerCase()) {
      return false;
    }
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !item.orderNumber.toLowerCase().includes(searchLower) &&
        !item.customerName.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search by order number or customer name"
              prefix={<Search className="w-4 h-4 text-gray-400" />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full"
            />
          </div>
          <Select
            placeholder="Platform"
            allowClear
            value={filters.platform}
            onChange={(value) => setFilters({ ...filters, platform: value })}
            className="w-full md:w-48"
            options={[
              { label: "Shopify", value: "shopify" },
              { label: "WooCommerce", value: "woocommerce" },
              { label: "Walmart", value: "walmart" },
              { label: "Amazon", value: "amazon" },
            ]}
          />
          <Select
            placeholder="Status"
            allowClear
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            className="w-full md:w-48"
            options={[
              { label: "Completely Fulfilled", value: "Completely Fulfilled" },
              { label: "Partially Fulfilled", value: "Partially Fulfilled" },
            ]}
          />
          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
            className="w-full md:w-64"
          />
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Total ${total} orders`,
        }}
        className="fulfillment-table"
        onRow={(record) => ({
          onClick: () => navigate(`/fulfillment/packing/${record.orderNumber}`),
          className: "cursor-pointer hover:bg-gray-50 transition-colors",
        })}
      />
    </div>
  );
}

