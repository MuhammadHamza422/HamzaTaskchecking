import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Select, DatePicker, Input } from "antd";
import { Search, Filter, Calendar, Tag, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import StatusBadge from "../common/StatusBadge";
import PlatformBadge from "../common/PlatformBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import { getAllPackingOrders } from "../../../../api/fulfillment";
import apiClient from "../../../../api/client";
import dayjs from "dayjs";
import Swal from "sweetalert2";

const { RangePicker } = DatePicker;

export default function PackingOperationsTable() {
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

  const loadPackingOrders = async (page = 1, pageSize = 30) => {
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

      const result = await getAllPackingOrders(params);

      if (result.success && result.data) {
        setData(result.data.orders || []);
        setPagination({
          current: result.data.pagination?.page || page,
          pageSize: result.data.pagination?.perPage || pageSize,
          total: result.data.pagination?.total || 0,
        });
      }
    } catch (error) {
      console.error("Error loading packing orders:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Orders",
        text: error.message || "Unable to fetch packing orders. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackingOrders(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.platform, filters.status, filters.search, filters.dateRange]);

  const handleTableChange = (newPagination) => {
    loadPackingOrders(newPagination.current, newPagination.pageSize);
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const columns = [
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (text) => <span className="font-semibold text-gray-900 text-sm">{text}</span>,
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (platform) => (
        <PlatformBadge platform={platform ? platform.charAt(0).toUpperCase() + platform.slice(1) : platform} />
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Items Packed",
      dataIndex: "selectedItemsCount",
      key: "selectedItemsCount",
      render: (count) => <span className="text-sm text-gray-700">{count || 0}</span>,
    },
    {
      title: "Deselected Items",
      dataIndex: "deselectedItemsCount",
      key: "deselectedItemsCount",
      render: (count) => (
        <span className={`text-sm ${count > 0 ? "text-amber-600 font-medium" : "text-gray-600"}`}>
          {count || 0}
        </span>
      ),
    },
    {
      title: "Photos",
      dataIndex: "photosCount",
      key: "photosCount",
      render: (count) => <span className="text-sm text-gray-700">{count || 0}</span>,
    },
    {
      title: "Packed By",
      dataIndex: "packedBy",
      key: "packedBy",
      render: (name) => <span className="text-sm text-gray-700">{name || "N/A"}</span>,
    },
    {
      title: "Packed At",
      dataIndex: "packedAt",
      key: "packedAt",
      render: (date) => (
        <span className="text-sm text-gray-600">
          {date ? dayjs(date).format("MMM DD, YYYY HH:mm") : "N/A"}
        </span>
      ),
    },
  ];

  const renderMobileCard = (record) => (
    <motion.div
      key={record.packingId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/fulfillment/packing/${record.orderNumber}`, {
        state: { packingId: record.packingId },
      })}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-base mb-1">{record.orderNumber}</h3>
          <PlatformBadge platform={record.platform ? record.platform.charAt(0).toUpperCase() + record.platform.slice(1) : record.platform} />
        </div>
        <StatusBadge status={record.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Items Packed</p>
          <p className="text-sm font-semibold text-gray-900">{record.selectedItemsCount || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Deselected Items</p>
          <p className={`text-sm font-semibold ${record.deselectedItemsCount > 0 ? "text-amber-600" : "text-gray-900"}`}>
            {record.deselectedItemsCount || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Photos</p>
          <p className="text-sm font-semibold text-gray-900">{record.photosCount || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Packed By</p>
          <p className="text-sm font-semibold text-gray-900">{record.packedBy || "N/A"}</p>
        </div>
      </div>

      {record.packedAt && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Packed: {dayjs(record.packedAt).format("MMM DD, YYYY HH:mm")}
          </p>
        </div>
      )}
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
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">All Packing Operations</h1>
          <p className="text-gray-600">View and manage all packing orders</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <Input
                  placeholder="Search by order number"
                  prefix={<Search className="w-4 h-4 text-gray-400" />}
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  onPressEnter={() => loadPackingOrders(1, pagination.pageSize)}
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
                suffixIcon={<Tag className="w-4 h-4 text-gray-400" />}
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
                suffixIcon={<CheckCircle className="w-4 h-4 text-gray-400" />}
                options={[
                  { label: "Completely Fulfilled", value: "Completely Fulfilled" },
                  { label: "Partially Fulfilled", value: "Partially Fulfilled" },
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

          <div className="hidden md:block">
            <Table
              columns={columns}
              dataSource={data}
              rowKey="packingId"
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} orders`,
                pageSizeOptions: ["10", "30", "50", "100"],
              }}
              onChange={handleTableChange}
              className="fulfillment-table"
              onRow={(record) => ({
                onClick: () => navigate(`/fulfillment/packing/${record.orderNumber}`, {
                  state: { packingId: record.packingId },
                }),
                className: "cursor-pointer hover:bg-blue-50 transition-colors",
              })}
            />
          </div>

          <div className="md:hidden p-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No orders found</p>
              </div>
            ) : (
              <>
                {data.map(renderMobileCard)}
                <div className="flex justify-center mt-6 gap-2">
                  <button
                    onClick={() => loadPackingOrders(pagination.current - 1, pagination.pageSize)}
                    disabled={pagination.current === 1}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-700">
                    Page {pagination.current} of {Math.ceil(pagination.total / pagination.pageSize)}
                  </span>
                  <button
                    onClick={() => loadPackingOrders(pagination.current + 1, pagination.pageSize)}
                    disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
