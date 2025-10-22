
// /src/pages/sourcer/SourcingOrdersPage.jsx
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import apiClient from "../../api/client";
import SourcingImportModal from "./SourcingImportModal";
import { RefreshCcw, Plus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { statusPill } from "./utils/helpers";
import { getSourcingColumns, makeItemsTable } from "./utils/sourcingColumns";
import SleekPagination from "./components/Sleekpagination";
import SourcingExportButton from "./components/SourcingExportButton";
import { useCan } from "../../hooks/usePermissions";

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

/* ---------- API functions (React Query) ---------- */
const fetchMyOrders = async () => {
  const { data } = await apiClient.get("/api/v1/sourcing/mine");
  return normalizeArray(data);
};

const deleteOrderRequest = async (orderId) => {
  await apiClient.delete(`/api/v1/sourcing/${orderId}`);
  return orderId;
};

export default function SourcingOrdersPage() {
  const { user } = useAuth(); // not strictly needed here, but kept if you expand later
  const queryClient = useQueryClient();

  // Route helpers
  const navigate = useNavigate();
  const location = useLocation();
  const isOrdersRoute = location.pathname === "/sourcing/orders";

  // Modal
  const [importOpen, setImportOpen] = useState(false);

  // filters + pagination (client-side)
  const [filters, setFilters] = useState({
    product: "",
    sku: "",
    status: "",
    dateRange: null,
    sourcingId: "",
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  /* ---------- Permissions via your shared hooks ---------- */
  // useCan returns `null` while loading, then boolean
  const canViewMyRequests = useCan("sourcer", "my requests");
  const canCreateOrder = useCan("sourcer", "create order");
  const canEditMyRequests = useCan("sourcer", "edit my requests");
  const canCancelMyRequests = useCan("sourcer", "cancel my requests");

  // page is “ready” when we’ve evaluated perms at least for view
  const rolesLoaded = canViewMyRequests !== null;
  // STRICT visibility rule: if "my requests" is OFF, nobody sees data.
  const canSeeAnyList = canViewMyRequests === true;
  const canImport = (canCreateOrder || canEditMyRequests) === true;

  /* ---------- Orders via React Query ---------- */
  const ordersQ = useQuery({
    queryKey: ["sourcing", "mine"],
    queryFn: fetchMyOrders,
    enabled: rolesLoaded && canSeeAnyList,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: "always",
    keepPreviousData: true,
  });

  // Local alias (empty array if disabled/not loaded)
  const orders = ordersQ.data || [];

  /* ---------- Optimistic delete mutation ---------- */
  const deleteM = useMutation({
    mutationFn: deleteOrderRequest,
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: ["sourcing", "mine"] });
      const previous = queryClient.getQueryData(["sourcing", "mine"]);
      queryClient.setQueryData(["sourcing", "mine"], (old) =>
        Array.isArray(old) ? old.filter((o) => (o._id || o.id) !== orderId) : old
      );
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["sourcing", "mine"], ctx.previous);
      }
      message.error(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Delete failed"
      );
    },
    onSuccess: () => {
      message.success("Sourcing request deleted");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["sourcing", "mine"] });
    },
  });

  const handleDeleteOrder = useCallback(
    (orderId) => {
      if (!orderId) return;
      deleteM.mutate(orderId);
    },
    [deleteM]
  );

  /* ---------- Client-side Filters ---------- */
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

  /* ---------- Columns ---------- */
  const columns = useMemo(
    () =>
      getSourcingColumns({
        statusPill,
        canEdit: canEditMyRequests === true,
        canCancel: canCancelMyRequests === true,
        navigate,
        handleDeleteOrder,
      }),
    [canEditMyRequests, canCancelMyRequests, navigate, handleDeleteOrder]
  );

  /* ---------- Loader: wait for permissions OR data ---------- */
  if (!rolesLoaded || (canSeeAnyList && ordersQ.isLoading)) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  /* ---------- If my requests is OFF: banner (keep New Sourcing) ---------- */
  if (!canSeeAnyList) {
    return (
      <Card style={gradientCardStyle} bodyStyle={{ padding: 24 }}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">
            No permission to view “My Requests”
          </h3>
        </div>

        {isOrdersRoute && canCreateOrder === true && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/sourcing/orders/new")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Sourcing
            </button>
          </div>
        )}
      </Card>
    );
  }

  /* ---------- Page title ---------- */
  const pageTitle = "Sourcing Listings"; // strict mode: always mine

  /* ---------- Render ---------- */
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          title={<span style={{ fontWeight: 700, letterSpacing: 0.2 }}>{pageTitle}</span>}
          extra={
            <Space>
              <button
                type="button"
                onClick={() => ordersQ.refetch()}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700
                           border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-md
                           w-full md:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>

              {/* Import CSV */}
              {canImport && (
                <button
                  onClick={() => setImportOpen(true)}
                  className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
                >
                  Import CSV
                </button>
              )}

              <SourcingExportButton
                orders={filteredOrders}
                filenameBase="sourcing_orders"
                className="
                  border border-orange-800
                  bg-orange-600 hover:bg-orange-800 active:bg-orange-900
                  text-white
                  shadow-sm hover:shadow
                  focus-visible:ring-2 focus-visible:ring-orange-300
                  disabled:opacity-60 disabled:cursor-not-allowed
                  w-full md:w-auto
                "
              />

              {isOrdersRoute && canCreateOrder === true && (
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
          {/* Filters */}
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
              expandable={{
                expandedRowRender: (rec) => makeItemsTable(rec),
                indentSize: 0,
              }}
              pagination={false}
              size="middle"
              bordered={false}
              sticky
              scroll={{ x: 1350, y: 520 }}
              loading={ordersQ.isFetching}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No sourcing orders found"
                  />
                ),
              }}
              className={`
                [&_.ant-table-tbody>tr:nth-child(odd)>td]:bg-[#f8fbff]
                [&_.ant-table-tbody>tr:nth-child(even)>td]:bg-white
                [&_.ant-table-tbody>tr:hover>td]:!bg-[#f0f7ff]
                transition-colors
              `}
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

      {/* Import modal */}
      <SourcingImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        orders={orders}
        onImported={() => ordersQ.refetch()}
      />

      {canCreateOrder === true && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            type="button"
            onClick={() => navigate("/sourcing/orders/new")}
            aria-label="Create new sourcing order"
            className="
              group relative
              h-14 w-14 hover:w-44 focus-visible:w-44
              rounded-full bg-blue-600 text-white
              shadow-lg shadow-blue-600/30
              ring-1 ring-white/40 backdrop-blur
              transition-all duration-300 ease-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70
            "
          >
            <span
              className="
                absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                grid h-10 w-10 place-items-center rounded-full
                transition-all duration-300
                group-hover:left-6 group-focus-visible:left-6
              "
            >
              <Plus className="h-7 w-7 text-white" strokeWidth={3} />
            </span>

            <span
              className="
                absolute top-1/2 -translate-y-1/2 left-14 right-3
                opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
                transition-opacity duration-200
                font-medium tracking-tight whitespace-nowrap
              "
            >
              New Sourcing
            </span>
          </button>
        </div>
      )}
    </>
  );
}
