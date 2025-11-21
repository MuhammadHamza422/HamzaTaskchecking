import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Select, DatePicker, Input, Button } from "antd";
import {
  Search,
  Package,
  XCircle,
  Loader2,
  Calendar,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import PlatformBadge from "../common/PlatformBadge";
import StatusBadge from "../common/StatusBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import FilterDrawer from "../common/FilterDrawer";
import TableSkeleton from "../common/TableSkeleton";
import MobileCardSkeleton from "../common/MobileCardSkeleton";
import CustomPagination from "../common/CustomPagination";
import { getAllDropshipOrders } from "../../../../api/fulfillment";
import apiClient from "../../../../api/client";
import dayjs from "dayjs";
import Swal from "sweetalert2";

const { RangePicker } = DatePicker;

export default function DropshipManagementTable() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(30);
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 30,
    total: 0,
    totalPages: 1,
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
    // Scroll to top on mount
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetchPlatforms();
  }, []);

  const loadDropshipOrders = async (pageNum = page, pageSize = limit) => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
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
          page: result.data.pagination?.page || pageNum,
          perPage: result.data.pagination?.perPage || pageSize,
          total: result.data.pagination?.total || 0,
          totalPages: result.data.pagination?.totalPages || 1,
        });
      }
    } catch (error) {
      console.error("Error loading dropship orders:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Orders",
        text:
          error.message || "Unable to fetch dropship orders. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data when page, limit, or filters change
  useEffect(() => {
    loadDropshipOrders(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters.platform, filters.status, filters.search, filters.dateRange]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1); // Reset to page 1 when changing limit
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to page 1 when filters change
  };

  const handleRowClick = (record) => {
    navigate(`/fulfillment/dropship/${record.dropshipId}`);
  };

  const columns = [
    {
      title: "Dropship ID",
      dataIndex: "dropshipId",
      key: "dropshipId",
      render: (text) => (
        <span className="font-semibold text-gray-900 text-sm">{text}</span>
      ),
    },
    {
      title: "Original Order",
      dataIndex: "originalOrderNumber",
      key: "originalOrderNumber",
      render: (text) => (
        <span className="font-medium text-gray-900 text-sm">{text}</span>
      ),
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (platform) => (
        <PlatformBadge
          platform={
            platform
              ? platform.charAt(0).toUpperCase() + platform.slice(1)
              : platform
          }
        />
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      key: "customerName",
      render: (name) => (
        <span className="text-sm text-gray-700">{name || "N/A"}</span>
      ),
    },
    {
      title: "Items",
      dataIndex: "deselectedItemsCount",
      key: "deselectedItemsCount",
      render: (count, record) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm text-gray-700 font-medium">Total: {count || 0}</span>
          {record.fulfilledItemsCount > 0 && (
            <span className="text-xs text-green-600">Fulfilled: {record.fulfilledItemsCount}</span>
          )}
          {record.remainingItemsCount > 0 && (
            <span className="text-xs text-amber-600">Remaining: {record.remainingItemsCount}</span>
          )}
        </div>
      ),
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
          <p className="text-sm text-gray-600 mb-1">
            Order: {record.originalOrderNumber}
          </p>
          <PlatformBadge
            platform={
              record.platform
                ? record.platform.charAt(0).toUpperCase() +
                  record.platform.slice(1)
                : record.platform
            }
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
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-semibold text-gray-900">
              Total: {record.deselectedItemsCount || 0}
            </p>
            {record.fulfilledItemsCount > 0 && (
              <p className="text-xs text-green-600">Fulfilled: {record.fulfilledItemsCount}</p>
            )}
            {record.remainingItemsCount > 0 && (
              <p className="text-xs text-amber-600">Remaining: {record.remainingItemsCount}</p>
            )}
          </div>
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
            {record.createdAt
              ? dayjs(record.createdAt).format("MMM DD, YYYY")
              : "N/A"}
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
            Drop-ship Management
          </h1>
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
                  onPressEnter={() => handleFilterChange("search", filters.search)}
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
              {(filters.search ||
                filters.platform ||
                filters.status ||
                (filters.dateRange && filters.dateRange.length === 2)) && (
                <span className="ml-1 px-2 py-0.5 bg-white text-purple-600 rounded-full text-xs font-semibold">
                  {
                    [
                      filters.search && "1",
                      filters.platform && "1",
                      filters.status && "1",
                      filters.dateRange &&
                        filters.dateRange.length === 2 &&
                        "1",
                    ].filter(Boolean).length
                  }
                </span>
              )}
            </Button>
          </div>

          <>
            <div className="hidden md:block">
              {loading ? (
                <div className="p-6">
                  <TableSkeleton columns={columns} rows={8} />
                </div>
              ) : (
                <Table
                  columns={columns}
                  dataSource={data}
                  rowKey="dropshipId"
                  pagination={false}
                  className="fulfillment-table"
                  onRow={(record) => ({
                    onClick: () => handleRowClick(record),
                    className:
                      "cursor-pointer hover:bg-purple-50 transition-colors",
                  })}
                />
              )}
            </div>

            <div className="md:hidden p-4">
              {loading ? (
                <MobileCardSkeleton count={5} />
              ) : data.length === 0 ? (
                <div className="text-center py-12">
                  <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No dropship orders found</p>
                </div>
              ) : (
                <>
                  {data.map((record, index) =>
                    renderMobileCard(record, index)
                  )}
                </>
              )}
            </div>

          {/* Custom Pagination Component */}
          {!loading && pagination.total > 0 && (
            <CustomPagination
              page={pagination.page}
              limit={pagination.perPage}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              itemName="orders"
              limitOptions={[10, 20, 30, 50, 100]}
            />
          )}
          </>
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
          onApply={() => {
            setPage(1);
            loadDropshipOrders(1, limit);
          }}
        />
      </div>
    </div>
  );
}
