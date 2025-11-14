import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Select, DatePicker, Input, Button, Pagination } from "antd";
import { Search, Package, XCircle, Loader2, Calendar, Filter } from "lucide-react";
import { motion } from "framer-motion";
import PlatformBadge from "../common/PlatformBadge";
import StatusBadge from "../common/StatusBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import FilterDrawer from "../common/FilterDrawer";
import { getAllDropshipOrders } from "../../../../api/fulfillment";
import apiClient from "../../../../api/client";
import dayjs from "dayjs";
import Swal from "sweetalert2";

const { RangePicker } = DatePicker;

export default function DropshipManagementTable() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 30,
    total: 0,
  });
  const [filters, setFilters] = useState({
    platform: null,
    status: null,
    dateRange: null,
    search: "",
  });
  const [platforms, setPlatforms] = useState([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const fetchPlatforms = async () => {
    try {
      setPlatformsLoading(true);
      const response = await apiClient.get("/api/v1/plateforms/all");
      if (response.data.success) {
        const sortedPlatforms = response.data.platforms.sort((a, b) => {
          const idA = parseInt(a.plt_id);
          const idB = parseInt(b.plt_id);
          return idA - idB;
        });
        setPlatforms(sortedPlatforms);
      }
    } catch (error) {
      console.error("Error fetching platforms:", error);
    } finally {
      setPlatformsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const loadDropshipOrders = async (page = 1, pageSize = 30) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };

      if (filters.platform) {
        params.platform = filters.platform;
      }
      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].startOf("day").toISOString();
        params.endDate = filters.dateRange[1].endOf("day").toISOString();
      }

      const result = await getAllDropshipOrders(params);

      if (result.success && result.data) {
        setData(result.data.orders || []);
        setPagination({
          current: result.data.pagination?.page || page,
          pageSize: result.data.pagination?.perPage || pageSize,
          total: result.data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Error loading dropship orders:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Orders",
        text: error.message || "Unable to fetch dropship orders. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDropshipOrders(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.platform, filters.status, filters.search, filters.dateRange]);

  const handleTableChange = (newPagination) => {
    loadDropshipOrders(newPagination.current, newPagination.pageSize);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleRowClick = (record) => {
    navigate(`/fulfillment/dropship/${record.dropshipId}`);
  };

  const columns = [
    {
      title: "Dropship ID",
      dataIndex: "dropshipId",
      key: "dropshipId",
      render: (text) => <span className="font-semibold text-gray-900 text-sm">{text}</span>,
    },
    {
      title: "Original Order",
      dataIndex: "originalOrderNumber",
      key: "originalOrderNumber",
      render: (text) => <span className="font-medium text-gray-900 text-sm">{text}</span>,
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (platform) => (
        <PlatformBadge
          platform={platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : platform}
        />
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      render: (name) => <span className="text-sm text-gray-700">{name || "N/A"}</span>,
    },
    {
      title: "Items",
      dataIndex: "deselectedItemsCount",
      key: "deselectedItemsCount",
      render: (count) => <span className="text-sm text-gray-700 font-medium">{count || 0}</span>,
    },
    {
      title: "Total Value",
      dataIndex: "totalValue",
      key: "totalValue",
      render: (value, record) => (
        <span className="text-sm font-semibold text-gray-900">
          {record.currency || "USD"} {value?.toFixed(2) || "0.00"}
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
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => (
        <span className="text-sm text-gray-600">
          {date ? dayjs(date).format("MMM DD, YYYY HH:mm") : "N/A"}
        </span>
      ),
    },
  ];

  const renderMobileCard = (record, index) => (
    <motion.div
      key={record.dropshipId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => handleRowClick(record)}
      className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-4 mb-4 cursor-pointer hover:shadow-md hover:border-purple-300 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-base mb-1">
            {record.dropshipId}
          </h3>
          <p className="text-sm text-gray-600 mb-1">Order: {record.originalOrderNumber}</p>
          <PlatformBadge
            platform={record.platform ? record.platform.charAt(0).toUpperCase() + record.platform.slice(1) : record.platform}
          />
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Customer</p>
          <p className="text-sm font-semibold text-gray-900">
            {record.customerName || "N/A"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Items</p>
          <p className="text-sm font-semibold text-gray-900">
            {record.deselectedItemsCount || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Total Value</p>
          <p className="text-sm font-semibold text-blue-600">
            {record.currency || "USD"} {record.totalValue?.toFixed(2) || "0.00"}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Created At</p>
          <p className="text-sm font-semibold text-gray-900">
            {record.createdAt ? dayjs(record.createdAt).format("MMM DD, YYYY") : "N/A"}
          </p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1550px] mx-auto p-2">
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
          {/* Desktop Filters */}
          <div className="hidden md:block p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <Input
                  placeholder="Search by order number, dropship ID"
                  prefix={<Search className="w-4 h-4 text-gray-400" />}
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  onPressEnter={() => loadDropshipOrders(1, pagination.pageSize)}
                  className="w-full h-11"
                  allowClear
                />
              </div>
              <Select
                placeholder="Platform"
                allowClear
                value={filters.platform}
                onChange={(value) => handleFilterChange("platform", value)}
                className="w-full h-11"
                loading={platformsLoading}
                options={platforms.map((platform) => ({
                  label: platform.plt_name,
                  value: platform.plt_name,
                }))}
              />
              <Select
                placeholder="Status"
                allowClear
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value)}
                className="w-full h-11"
                options={[
                  { label: "Unfulfilled", value: "Unfulfilled" },
                  { label: "Fulfilled", value: "Fulfilled" },
                  { label: "Cancelled", value: "Cancelled" },
                ]}
              />
            </div>
            <div className="mt-4">
              <RangePicker
                value={filters.dateRange}
                onChange={(dates) => handleFilterChange("dateRange", dates)}
                className="w-full md:w-auto h-11"
                suffixIcon={<Calendar className="w-4 h-4 text-gray-400" />}
              />
            </div>
          </div>

          {/* Mobile Filter Button */}
          <div className="md:hidden p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
            <Button
              type="primary"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setFilterDrawerOpen(true)}
              className="w-full h-11 flex items-center justify-center gap-2"
            >
              Filters
              {(filters.search || filters.platform || filters.status || (filters.dateRange && filters.dateRange.length === 2)) && (
                <span className="ml-1 px-2 py-0.5 bg-white text-purple-600 rounded-full text-xs font-semibold">
                  {[
                    filters.search && "1",
                    filters.platform && "1",
                    filters.status && "1",
                    filters.dateRange && filters.dateRange.length === 2 && "1",
                  ].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Loading dropship orders...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <Table
                  columns={columns}
                  dataSource={data}
                  rowKey="dropshipId"
                  loading={loading}
                  pagination={false}
                  className="fulfillment-table"
                  onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                    className: "cursor-pointer hover:bg-purple-50 transition-colors",
                  })}
                />
              </div>

              <div className="md:hidden p-4">
                {data.length === 0 ? (
                  <div className="text-center py-12">
                    <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No dropship orders found</p>
                  </div>
                ) : (
                  <>
                    {data.map((record, index) => renderMobileCard(record, index))}
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-center pb-4">
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  showSizeChanger
                  showTotal={(total) => `Total ${total} orders`}
                  pageSizeOptions={["10", "30", "50", "100"]}
                  onChange={handleTableChange}
                  className="ant-pagination-alt"
                />
              </div>
            </>
          )}
        </motion.div>

        {/* Mobile Filter Drawer */}
        <FilterDrawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          filters={filters}
          onFilterChange={handleFilterChange}
          platforms={platforms}
          platformsLoading={platformsLoading}
          statusOptions={[
            { label: "Unfulfilled", value: "Unfulfilled" },
            { label: "Fulfilled", value: "Fulfilled" },
            { label: "Cancelled", value: "Cancelled" },
          ]}
          searchPlaceholder="Search by order number, dropship ID"
          onApply={() => loadDropshipOrders(1, pagination.pageSize)}
        />
      </div>
    </div>
  );
}

