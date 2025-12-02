import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Select, DatePicker, Input, Button } from "antd";
import { Search, Filter, Calendar, Truck, Eye, Trash2, Loader2, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import StatusBadge from "../common/StatusBadge";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import FilterDrawer from "../common/FilterDrawer";
import TableSkeleton from "../common/TableSkeleton";
import MobileCardSkeleton from "../common/MobileCardSkeleton";
import CustomPagination from "../common/CustomPagination";
import { getAllShippingRecords, deleteShippingRecord } from "../../../../api/shipping";
import dayjs from "dayjs";
import Swal from "sweetalert2";

const { RangePicker } = DatePicker;

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Photos Captured", value: "photos_captured" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
  { label: "Cancelled", value: "cancelled" },
];

const SORT_BY_OPTIONS = [
  { label: "Created Date", value: "createdAt" },
  { label: "Scanned Date", value: "scannedAt" },
  { label: "Completed Date", value: "completedAt" },
  { label: "Tracking Number", value: "trackingNumber" },
];

export default function ShippingOperationsTable() {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 25,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [filters, setFilters] = useState({
    status: null,
    trackingNumber: "",
    dateRange: null,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const loadShippingRecords = async (pageNum = page, pageSize = limit) => {
    setLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: pageSize,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.status) {
        params.status = filters.status;
      }
      if (filters.trackingNumber) {
        params.trackingNumber = filters.trackingNumber;
      }
      if (filters.dateRange && filters.dateRange.length === 2) {
        params.startDate = filters.dateRange[0].startOf("day").toISOString();
        params.endDate = filters.dateRange[1].endOf("day").toISOString();
      }

      const result = await getAllShippingRecords(params);

      if (result.success && result.data) {
        setData(result.data.records || []);
        setPagination({
          currentPage: result.data.pagination?.page || pageNum,
          totalPages: result.data.pagination?.totalPages || 1,
          totalRecords: result.data.pagination?.total || 0,
          limit: result.data.pagination?.pageSize || pageSize,
          hasNextPage: (result.data.pagination?.page || 1) < (result.data.pagination?.totalPages || 1),
          hasPrevPage: (result.data.pagination?.page || 1) > 1,
        });
      }
    } catch (error) {
      console.error("Error loading shipping records:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Records",
        text: error.message || "Unable to fetch shipping records. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data when page, limit, or filters change
  useEffect(() => {
    loadShippingRecords(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters.status, filters.trackingNumber, filters.dateRange, filters.sortBy, filters.sortOrder]);

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

  const handleViewDetails = (record) => {
    const recordId = record.shippingRecordId || record._id;
    if (recordId) {
      navigate(`/fulfillment/shipping/details/${recordId}`);
    }
  };

  const handleDelete = async (recordId) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete Shipping Record?",
      text: "Are you sure you want to delete this shipping record? This action cannot be undone.",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const deleteResult = await deleteShippingRecord(recordId);
      if (deleteResult.success) {
        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Shipping record deleted successfully.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });
        loadShippingRecords(page, limit);
      }
    } catch (error) {
      console.error("Error deleting record:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: error.message || "Failed to delete shipping record. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    }
  };

  const columns = [
    {
      title: "Tracking Number",
      dataIndex: "trackingNumber",
      key: "trackingNumber",
      render: (text) => <span className="font-semibold text-gray-900 text-sm font-mono">{text}</span>,
    },
    {
      title: "Carrier",
      dataIndex: "carrierName",
      key: "carrierName",
      render: (carrier) => (
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-700">{carrier || "N/A"}</span>
        </div>
      ),
    },
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      render: (text) => <span className="text-sm text-gray-700">{text || "N/A"}</span>,
    },
    {
      title: "Ship To",
      key: "shipTo",
      render: (_, record) => (
        <div className="text-sm">
          <div className="text-gray-900 font-medium">{record.shipToName || "N/A"}</div>
          {record.shipToCity && record.shipToState && (
            <div className="text-gray-500 text-xs">{record.shipToCity}, {record.shipToState}</div>
          )}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Photos",
      dataIndex: "photoCount",
      key: "photoCount",
      render: (count) => (
        <span className="text-sm text-gray-700">{count || 0}</span>
      ),
    },
    {
      title: "Operator",
      dataIndex: "operatorName",
      key: "operatorName",
      render: (name) => <span className="text-sm text-gray-700">{name || "N/A"}</span>,
    },
    {
      title: "Completed At",
      dataIndex: "completedAt",
      key: "completedAt",
      render: (date) => (
        <span className="text-sm text-gray-600">
          {date ? dayjs(date).format("MMM DD, YYYY HH:mm") : "N/A"}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewDetails(record);
            }}
            className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(record.shippingRecordId || record._id);
            }}
            className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileCard = (record) => (
    <motion.div
      key={record.shippingRecordId || record._id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base mb-1 font-mono truncate">
            {record.trackingNumber}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Truck className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">{record.carrierName || "N/A"}</span>
          </div>
          {record.orderNumber && (
            <p className="text-xs text-gray-500 mt-1">Order: {record.orderNumber}</p>
          )}
        </div>
        <StatusBadge status={record.status} />
      </div>

      {(record.shipToName || record.shipToCity) && (
        <div className="mb-3 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{record.shipToName || "N/A"}</p>
              {record.shipToCity && record.shipToState && (
                <p className="text-xs text-gray-500">
                  {record.shipToCity}, {record.shipToState}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500 mb-1">Photos</p>
          <p className="text-sm font-semibold text-gray-900">{record.photoCount || 0}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Operator</p>
          <p className="text-sm font-semibold text-gray-900">{record.operatorName || "N/A"}</p>
        </div>
      </div>

      {record.completedAt && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Completed: {dayjs(record.completedAt).format("MMM DD, YYYY HH:mm")}
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={() => handleViewDetails(record)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
        >
          <Eye className="w-4 h-4" />
          View Details
        </button>
        <button
          onClick={() => handleDelete(record.shippingRecordId || record._id)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      <div className="max-w-[1550px] mx-auto p-2">
        <FulfillmentBreadcrumb />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">All Shipping Operations</h1>
              <p className="text-gray-600">View and manage all shipping records</p>
            </div>
            {/* <motion.button
              onClick={() => navigate("/fulfillment/shipping")}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Truck className="w-4 h-4" />
              New Shipping
            </motion.button> */}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
        >
          {/* Desktop Filters */}
          <div className="hidden md:block p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-2">
                <Input
                  placeholder="Search by tracking number"
                  prefix={<Search className="w-4 h-4 text-gray-400" />}
                  value={filters.trackingNumber}
                  onChange={(e) => handleFilterChange("trackingNumber", e.target.value)}
                  onPressEnter={() => handleFilterChange("trackingNumber", filters.trackingNumber)}
                  className="w-full h-11"
                  allowClear
                />
              </div>
              {/* <Select
                placeholder="Status"
                allowClear
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value)}
                className="w-full h-11"
                suffixIcon={<Filter className="w-4 h-4 text-gray-400" />}
                options={STATUS_OPTIONS}
              /> */}
                <RangePicker
                  value={filters.dateRange}
                  onChange={(dates) => handleFilterChange("dateRange", dates)}
                  className="h-11"
                  suffixIcon={<Calendar className="w-4 h-4 text-gray-400" />}
                />
                <Select
                placeholder="Sort Order"
                value={filters.sortOrder}
                onChange={(value) => handleFilterChange("sortOrder", value)}
                className="w-full md:w-auto h-11"
                options={[
                  { label: "Descending", value: "desc" },
                  { label: "Ascending", value: "asc" },
                ]}
              />
              {/* <Select
                placeholder="Sort By"
                value={filters.sortBy}
                onChange={(value) => handleFilterChange("sortBy", value)}
                className="w-full h-11"
                options={SORT_BY_OPTIONS}
              /> */}
            </div>
            {/* <div className="mt-4 flex items-center gap-4">
              
            </div> */}
          </div>

          {/* Mobile Filter Button */}
          <div className="md:hidden p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <Button
              type="primary"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setFilterDrawerOpen(true)}
              className="w-full h-11 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700"
            >
              Filters
              {(filters.trackingNumber || filters.status || (filters.dateRange && filters.dateRange.length === 2)) && (
                <span className="ml-1 px-2 py-0.5 bg-white text-purple-600 rounded-full text-xs font-semibold">
                  {[
                    filters.trackingNumber && "1",
                    filters.status && "1",
                    filters.dateRange && filters.dateRange.length === 2 && "1",
                  ].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>

          <div className="hidden md:block">
            {loading ? (
              <div className="p-6">
                <TableSkeleton columns={columns} rows={8} />
              </div>
            ) : (
              <Table
                columns={columns}
                dataSource={data}
                rowKey={(record) => record.shippingRecordId || record._id}
                pagination={false}
                className="fulfillment-table"
                onRow={(record) => ({
                  onClick: () => handleViewDetails(record),
                  className: "cursor-pointer hover:bg-purple-50 transition-colors",
                })}
              />
            )}
          </div>

          <div className="md:hidden p-4">
            {loading ? (
              <MobileCardSkeleton count={5} />
            ) : data.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No shipping records found</p>
              </div>
            ) : (
              <>
                {data.map(renderMobileCard)}
              </>
            )}
          </div>

          {/* Custom Pagination Component */}
          {!loading && pagination.totalRecords > 0 && (
            <CustomPagination
              page={pagination.currentPage}
              limit={pagination.limit}
              total={pagination.totalRecords}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              itemName="records"
              limitOptions={[10, 25, 50, 100]}
            />
          )}
        </motion.div>

        {/* Mobile Filter Drawer */}
        <FilterDrawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          filters={{
            search: filters.trackingNumber,
            status: filters.status,
            dateRange: filters.dateRange,
          }}
          onFilterChange={(key, value) => {
            if (key === "search") {
              handleFilterChange("trackingNumber", value);
            } else {
              handleFilterChange(key, value);
            }
          }}
          platforms={[]}
          platformsLoading={false}
          statusOptions={STATUS_OPTIONS}
          searchPlaceholder="Search by tracking number"
          onApply={() => {
            setPage(1);
            loadShippingRecords(1, limit);
          }}
        />

      </div>
    </div>
  );
}

