import { useState } from "react";
import { Table, Select, DatePicker, Input, Button } from "antd";
import { Search, Package, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import PlatformBadge from "../common/PlatformBadge";
import StatusBadge from "../common/StatusBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
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

  const renderMobileCard = (record) => (
    <motion.div
      key={record.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 mb-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-base mb-1">
            {record.originalOrderNumber}
          </h3>
          <PlatformBadge platform={record.marketplaceName} />
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="space-y-2 mb-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Marketplace Order</p>
          <p className="text-sm font-semibold text-gray-900">
            {record.marketplaceOrderNumber}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Date</p>
          <p className="text-sm font-semibold text-gray-900">
            {dayjs(record.date).format("MMM DD, YYYY")}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Unselected Items</p>
          <div className="space-y-1">
            {record.unselectedItems.map((item, idx) => (
              <p key={idx} className="text-sm text-gray-700">
                {item.name} (SKU: {item.sku}) × {item.quantity}
              </p>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={() => handleCreateDropship(record)}
        disabled={record.status === "Fulfilled"}
        className={`w-full py-2 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
          record.status === "Fulfilled"
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
        }`}
      >
        <Package className="w-4 h-4" />
        <span>Create Dropship</span>
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-8">
        <FulfillmentBreadcrumb />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Drop-ship Management</h1>
          <p className="text-gray-600">Manage orders with unselected items</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <Input
                  placeholder="Search by order number"
                  prefix={<Search className="w-4 h-4 text-gray-400" />}
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full h-11"
                  allowClear
                />
              </div>
              <Select
                placeholder="Marketplace"
                allowClear
                value={filters.marketplace}
                onChange={(value) => setFilters({ ...filters, marketplace: value })}
                className="w-full h-11"
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
                className="w-full h-11"
              />
            </div>
          </div>

          <div className="hidden md:block">
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

          <div className="md:hidden p-4">
            {filteredData.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No orders found</p>
              </div>
            ) : (
              <>
                {filteredData.map(renderMobileCard)}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

