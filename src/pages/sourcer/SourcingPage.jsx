
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Space,
  message,
  Spin,
  Input,
  Select,
  DatePicker,
  Empty,
  Row,
  Col,
} from "antd";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";

import apiClient from "../../api/client";
import SourcingImportModal from "./SourcingImportModal";
import { RefreshCcw, Plus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { statusPill } from "./utils/helpers";
import { getSourcingColumns, makeItemsTable } from "./utils/sourcingColumns";
import SleekPagination from "./components/Sleekpagination";

const { Option } = Select;
const { RangePicker } = DatePicker;

/* ---------- UI ---------- */
const gradientCardStyle = {
  borderRadius: 16,
  background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e6edff",
};
const tableCardStyle = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #eef2ff",
  overflow: "hidden",
};

/* ---------- normalize possible API shapes safely ---------- */
const normalizeArray = (data) =>
  Array.isArray(data)
    ? data
    : data?.all_requests ||
      data?.recent_requests ||
      data?.results ||
      data?.items ||
      data?.data ||
      [];

/* ---------- Component ---------- */
export default function SourcingOrdersPage() {
  const { user } = useAuth();
  const role = user?.roles?.role || user?.role || "";
  const isAdmin = role === "admin";
  const isSourcer = role === "sourcer";
  const isPurchaser = role === "purchaser";
  const canEdit = isAdmin || isSourcer;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sourcerQueryId = params.get("sourcer_id"); // from /sourcing/orders?sourcer_id=...

  // show the New Sourcing button ONLY on exact /sourcing/orders
  const isOrdersRoute = location.pathname === "/sourcing/orders";

  const [filters, setFilters] = useState({
    product: "",
    sku: "",
    status: "",
    dateRange: null,
    sourcingId: "",
  });

  /* ---------- Endpoint by role ---------- */
  const endpoint = useMemo(() => {
    if (isAdmin) return "/api/v1/sourcing/all-sourcing";
    if (isPurchaser) return "/api/v1/sourcing/assigned";
    return "/api/v1/sourcing/mine";
  }, [isAdmin, isPurchaser]);

  /* ---------- Load Orders ---------- */
  const fetchOrders = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    try {
      const config = {};
      if (
        isAdmin &&
        sourcerQueryId &&
        endpoint === "/api/v1/sourcing/all-sourcing"
      ) {
        config.params = { sourcer_id: sourcerQueryId };
      }
      const { data } = await apiClient.get(endpoint, config);
      setOrders(normalizeArray(data));
    } catch (err) {
      console.error(err);
      message.error("Failed to load sourcing orders.");
    } finally {
      setLoading(false);
    }
  }, [endpoint, isAdmin, sourcerQueryId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  /* ---------- Delete Order ---------- */
  const handleDeleteOrder = useCallback(
    async (orderId) => {
      if (!orderId) return;
      try {
        await apiClient.delete(`/api/v1/sourcing/${orderId}`);
        message.success("Sourcing request deleted");
        fetchOrders();
      } catch (err) {
        console.error(err);
        message.error(
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            "Delete failed"
        );
      }
    },
    [fetchOrders]
  );

  /* ---------- Filters ---------- */
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const items = order.items || [];

      const matchesProduct =
        !filters.product ||
        items.some((i) =>
          (i.name || i.product_name || "")
            .toLowerCase()
            .includes((filters.product || "").toLowerCase())
        );

      const matchesSku =
        !filters.sku ||
        items.some((i) =>
          (i.sku || "")
            .toLowerCase()
            .includes((filters.sku || "").toLowerCase())
        );

      const matchesStatus = !filters.status || order.status === filters.status;

      const created = order.createdAt || order.created_at || order.created_on;
      const matchesDate =
        !filters.dateRange ||
        (created &&
          dayjs(created).isAfter(filters.dateRange[0].startOf("day")) &&
          dayjs(created).isBefore(filters.dateRange[1].endOf("day")));

      const idForFilter = String(
        order.sourcing_id ?? order._id ?? order.id ?? ""
      );
      const matchesSourcingId =
        !filters.sourcingId || idForFilter.includes(String(filters.sourcingId));

      return (
        matchesProduct &&
        matchesSku &&
        matchesStatus &&
        matchesDate &&
        matchesSourcingId
      );
    });
  }, [orders, filters]);

  /* ---------- Pagination reactions ---------- */
  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((filteredOrders.length || 0) / (limit || 1))
    );
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders.length, limit]);

  const total = filteredOrders.length;
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, page, limit]);

  /* ---------- Columns (shared) ---------- */
  const columns = useMemo(
    () =>
      getSourcingColumns({
        statusPill,
        canEdit,
        navigate,
        handleDeleteOrder,
      }),
    [canEdit, navigate, handleDeleteOrder]
  );

  const pageTitle = isAdmin
    ? sourcerQueryId
      ? "All Sourcing Orders (Selected Sourcer)"
      : "All Sourcing Orders"
    : isPurchaser
    ? "Assigned Requests"
    : "My Sourcing Orders";

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          paddingTop: "4rem",
        }}
      >
        <Spin />
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          title={<span style={{ fontWeight: 700, letterSpacing: 0.2 }}>{pageTitle}</span>}
          extra={
            <Space>
              <button
                type="button"
                onClick={fetchOrders}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700
                           border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-md
                           w-full md:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>

              {canEdit && (
                <button
                  onClick={() => setImportOpen(true)}
                  className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
                >
                  Import CSV
                </button>
              )}

              {/* Show "New Sourcing" only on /sourcing/orders */}
              {canEdit && isOrdersRoute && (
                <button
                  onClick={() => navigate("/sourcing/orders/new")}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New Sourcing
                </button>
              )}
            </Space>
          }
          style={gradientCardStyle}
          bodyStyle={{ padding: 18 }}
        >
          <Row gutter={[16, 16]} className="mb-2">
            <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <Input
                  placeholder="Filter by Product Name"
                  allowClear
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, product: e.target.value }))
                  }
                  size="large"
                  className="w-full rounded-lg"
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={5}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU
                </label>
                <Input
                  placeholder="Filter by SKU"
                  allowClear
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, sku: e.target.value }))
                  }
                  size="large"
                  className="w-full rounded-lg"
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={5}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  placeholder="Filter by Status"
                  allowClear
                  className="w-full rounded-lg"
                  onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
                  dropdownStyle={{ borderRadius: 10 }}
                  size="large"
                >
                  <Option value="Pending">Pending</Option>
                  <Option value="Assigned">Assigned</Option>
                  <Option value="Offer">Offer</Option>
                  <Option value="Purchased">Purchased</Option>
                  <Option value="Disapproved">Disapproved</Option>
                  <Option value="Sold">Sold</Option>
                  <Option value="Hold">Hold</Option>
                  <Option value="Seller Rejected">Seller Rejected</Option>
                  <Option value="Dropshipped">Dropshipped</Option>
                  <Option value="Returned">Returned</Option>
                  <Option value="Completed">Completed</Option>
                </Select>
              </div>
            </Col>

            <Col xs={24} sm={12} md={12} lg={5}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <RangePicker
                  className="w-full rounded-lg"
                  size="large"
                  onChange={(range) =>
                    setFilters((f) => ({ ...f, dateRange: range }))
                  }
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={12} lg={3}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sourcing ID
                </label>
                <Input
                  placeholder="Sourcing ID (#)"
                  allowClear
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, sourcingId: e.target.value }))
                  }
                  size="large"
                  className="w-full rounded-lg"
                />
              </div>
            </Col>
          </Row>

          <div style={tableCardStyle}>
            <Table
              dataSource={paginatedOrders}
              columns={columns}
              rowKey={(rec) => rec._id || rec.id}
              expandable={{ expandedRowRender: makeItemsTable }}
              pagination={false}
              size="middle"
              bordered={false}
              sticky
              scroll={{ x: 1350, y: 520 }}
              onRow={() => ({
                style: { transition: "background 0.2s" },
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#fafbff"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "unset"),
              })}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No sourcing orders found"
                  />
                ),
              }}
            />

            <SleekPagination
              page={page}
              setPage={setPage}
              limit={limit}
              setLimit={setLimit}
              total={total}
            />
          </div>
        </Card>
      </motion.div>

      <SourcingImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        orders={orders}
        onImported={fetchOrders}
      />
    </>
  );
}
