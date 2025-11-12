import { useState } from "react";
import { Table, Select, DatePicker, Input, Button } from "antd";
import { Search, Package } from "lucide-react";
import PlatformBadge from "../common/PlatformBadge";
import StatusBadge from "../common/StatusBadge";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const mockData = [
  {
    id: 1,
    originalOrderNumber: "ORD-12345",
    marketplaceName: "Shopify",
    marketplaceOrderNumber: "SH-12345",
    unselectedItems: [
      { name: "Product A", sku: "SKU-001", quantity: 1 },
      { name: "Product B", sku: "SKU-002", quantity: 2 },
    ],
    date: "2025-01-15",
    status: "Unfulfilled",
  },
  {
    id: 2,
    originalOrderNumber: "ORD-12346",
    marketplaceName: "WooCommerce",
    marketplaceOrderNumber: "WC-12346",
    unselectedItems: [{ name: "Product C", sku: "SKU-003", quantity: 1 }],
    date: "2025-01-15",
    status: "Fulfilled",
  },
];

export default function DropshipManagementTable() {
  const [filters, setFilters] = useState({
    marketplace: null,
    dateRange: null,
    search: "",
  });

  const handleCreateDropship = (record) => {
    console.log("Create dropship for:", record);
  };

  const columns = [
    {
      title: "Original Order Number",
      dataIndex: "originalOrderNumber",
      key: "originalOrderNumber",
      render: (text) => <span className="font-medium text-gray-900">{text}</span>,
    },
    {
      title: "Marketplace",
      dataIndex: "marketplaceName",
      key: "marketplaceName",
      render: (platform) => <PlatformBadge platform={platform} />,
    },
    {
      title: "Marketplace Order Number",
      dataIndex: "marketplaceOrderNumber",
      key: "marketplaceOrderNumber",
    },
    {
      title: "Unselected Items",
      dataIndex: "unselectedItems",
      key: "unselectedItems",
      render: (items) => (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="text-sm text-gray-600">
              {item.name} (SKU: {item.sku}) × {item.quantity}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      render: (date) => dayjs(date).format("MMM DD, YYYY"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button
          type="primary"
          icon={<Package />}
          onClick={() => handleCreateDropship(record)}
          disabled={record.status === "Fulfilled"}
        >
          Create Dropship
        </Button>
      ),
    },
  ];

  const filteredData = mockData.filter((item) => {
    if (filters.marketplace && item.marketplaceName.toLowerCase() !== filters.marketplace.toLowerCase()) {
      return false;
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !item.originalOrderNumber.toLowerCase().includes(searchLower) &&
        !item.marketplaceOrderNumber.toLowerCase().includes(searchLower)
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
              placeholder="Search by order number"
              prefix={<Search className="w-4 h-4 text-gray-400" />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full"
            />
          </div>
          <Select
            placeholder="Marketplace"
            allowClear
            value={filters.marketplace}
            onChange={(value) => setFilters({ ...filters, marketplace: value })}
            className="w-full md:w-48"
            options={[
              { label: "Shopify", value: "shopify" },
              { label: "WooCommerce", value: "woocommerce" },
              { label: "Walmart", value: "walmart" },
              { label: "Amazon", value: "amazon" },
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
      />
    </div>
  );
}

