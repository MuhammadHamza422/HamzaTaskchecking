// /src/pages/sourcer/SourcerDashboardPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  message,
  Select,
  DatePicker,
  Input,
  Button,
  Tooltip,
  Spin,
  Skeleton,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { ReloadOutlined, FilterOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

import { useNavigate } from "react-router-dom";

import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import AppBreadcrumbs from "../../components/AppBreadCrumbs";

import RecentlyCreatedFive from "./components/RecentlyCreatedFive";
import { statusPill } from "./utils/helpers";
import { makeItemsTable } from "./utils/sourcingColumns";
import { Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCan } from "../../hooks/usePermissions";

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

/* -------------------------- styles / helpers -------------------------- */
const statsCardStyle = {
  borderRadius: 14,
  background: "linear-gradient(135deg, #ffffff, #f6f9ff)",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  border: "1px solid #eef2ff",
};
const cardHoverEffect = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.99 },
};
const num = (v) => (typeof v === "number" ? v : Number(v) || 0);

// ✅ Actual total from header numbers
const calcActualTotal = (r) =>
  num(r.sellers_price) +
  num(r.shipping_charges ?? r.shipping_price) +
  num(r.taxes ?? r.tax);

// ✅ Target total from items if order-level is missing
const calcTargetTotalFromItems = (items = []) =>
  items.reduce(
    (sum, it) =>
      sum +
      num(it.target_cost_per_unit ?? it.target_cost ?? 0) *
        num(it.quantity_needed ?? it.qty ?? 1),
    0
  );

/* ----------------------------- API helpers ---------------------------- */
const normalizeList = (raw) =>
  Array.isArray(raw)
    ? raw
    : raw?.orders || raw?.data || raw?.results || raw?.items || [];

// mine
const fetchMine = async () => {
  const { data } = await apiClient.get("/api/v1/sourcing/mine");
  return normalizeList(data);
};

// admin — for a specific sourcer_id
const fetchForSourcer = async (sid) => {
  const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
    params: { sourcer_id: sid, page: 1, limit: 200 },
  });
  return Array.isArray(data) ? data : data?.results || data?.data || [];
};

// admin — build sourcer dropdown (unique sourcer_ids)
const fetchSourcerOptions = async () => {
  const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
    params: { page: 1, limit: 200 },
  });
  const list = Array.isArray(data) ? data : data?.results || data?.data || [];
  const map = new Map();
  list.forEach((o) => {
    const s = o?.sourcer_id;
    if (!s) return;
    const id = String(s?._id || s);
    if (!id) return;
    const name = [s?.firstName, s?.lastName].filter(Boolean).join(" ");
    const label = name || s?.email || `Sourcer ${id.slice(-4)}`;
    if (!map.has(id)) map.set(id, { value: id, label });
  });
  return Array.from(map.values()).sort((a, b) =>
    (a.label || "").localeCompare(b.label || "")
  );
};

const deleteOrderRequest = async (orderId) => {
  await apiClient.delete(`/api/v1/sourcing/${orderId}`);
  return orderId;
};

/* =============================== PAGE =============================== */
export default function SourcerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Permissions via shared hooks
  const canViewMyRequests = useCan("sourcer", "my requests"); // null | boolean
  const canCreateOrder = useCan("sourcer", "create order");
  const canEditMyRequests = useCan("sourcer", "edit my requests");
  const canCancelMyRequests = useCan("sourcer", "cancel my requests");

  // We only render once permission has resolved from null → boolean
  const permsLoaded = canViewMyRequests !== null;

  // Admin check (by role name on user, still harmless to keep)
  const roleName = String(user?.roles?.role || user?.role || "")
    .trim()
    .toLowerCase();
  const isAdmin = roleName === "admin";

  // Admin sourcer picker
  const [sourcerId, setSourcerId] = useState(null);

  // ✅ Default to the current month
  const [filters, setFilters] = useState({
    productId: null,
    productText: "",
    status: "",
    dateRange: [dayjs().startOf("month"), dayjs().endOf("month")],
    sourcingId: "",
  });

  /* -------------------------- Queries (React Query) -------------------------- */

  // Admin-only sourcer options (do not refetch on focus/reconnect/mount)
  const sourcerOptsQ = useQuery({
    queryKey: ["sourcing", "sourcerOptions"],
    queryFn: fetchSourcerOptions,
    enabled: permsLoaded && canViewMyRequests === true && isAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    keepPreviousData: true,
  });

  // Orders (mine OR chosen sourcer if admin + sourcerId selected)
  // Make the key a simple, stable string to avoid any hash edge cases.
  const ordersScope = isAdmin && sourcerId ? `bySourcer:${sourcerId}` : "mine";
  const ordersQ = useQuery({
    queryKey: ["sourcing", "dashboard", ordersScope],
    queryFn: () =>
      ordersScope.startsWith("bySourcer:")
        ? fetchForSourcer(sourcerId)
        : fetchMine(),
    enabled:
      permsLoaded &&
      canViewMyRequests === true &&
      (!!user || (isAdmin && !!sourcerId)),
    // Keep data fresh for 5 minutes, and **don't** refetch on focus/reconnect/mount.
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    keepPreviousData: true,
  });

  const orders = ordersQ.data || [];
  const loading = !permsLoaded || ordersQ.isLoading;

  /* -------------------------- Optimistic delete -------------------------- */
  const deleteM = useMutation({
    mutationFn: deleteOrderRequest,
    onMutate: async (orderId) => {
      await queryClient.cancelQueries({ queryKey: ["sourcing", "dashboard"] });
      const key = ["sourcing", "dashboard", ordersScope];
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, (old) =>
        Array.isArray(old)
          ? old.filter((o) => (o._id || o.id) !== orderId)
          : old
      );
      return { previous, key };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous && ctx?.key) {
        queryClient.setQueryData(ctx.key, ctx.previous);
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
    onSettled: (_data, _err, _vars, ctx) => {
      if (ctx?.key) queryClient.invalidateQueries({ queryKey: ctx.key });
    },
  });

  const handleDeleteOrder = useCallback(
    (orderId) => {
      if (!orderId) return;
      deleteM.mutate(orderId);
    },
    [deleteM]
  );

  /* ---------------------------- enrichment ----------------------------- */
  const enriched = useMemo(() => {
    return (orders || []).map((r) => {
      const targetFromBackend = num(r.target_total_cost);
      const targetFromItems = calcTargetTotalFromItems(r.items);
      const targetTotal =
        targetFromBackend > 0 ? targetFromBackend : targetFromItems;

      const actualTotal = calcActualTotal(r);
      const savingsDollar = targetTotal - actualTotal;
      const efficiencyPct =
        targetTotal > 0 ? (savingsDollar / targetTotal) * 100 : 0;

      return {
        ...r,
        target_total: targetTotal,
        actual_total: actualTotal,
        savings_dollar: savingsDollar,
        efficiency_pct: efficiencyPct,
        created_at: r.createdAt || r.created_at,
        finalized_at: r.purchaserResponseTime || r.updatedAt || null,
      };
    });
  }, [orders]);

  /* ------------------------------ filtering ---------------------------- */
  const filtered = useMemo(() => {
    return enriched.filter((order) => {
      const items = order.items || [];

      const matchesProductId =
        !filters.productId ||
        items.some(
          (i) =>
            String(i._id || i.id || i.product_id) === String(filters.productId)
        );

      const matchesProductText =
        !filters.productText ||
        items.some((i) =>
          (i.name || i.product_name || "")
            .toLowerCase()
            .includes((filters.productText || "").toLowerCase())
        );

      const matchesStatus = !filters.status || order.status === filters.status;

      const created = order.created_at || order.createdAt || order.created_on;
      const matchesDate =
        !filters.dateRange ||
        (created &&
          dayjs(created).isBetween(
            filters.dateRange[0].startOf("day"),
            filters.dateRange[1].endOf("day"),
            "day",
            "[]" // inclusive
          ));

      const idForFilter = String(
        order.sourcing_id ?? order._id ?? order.id ?? ""
      );
      const matchesSourcingId =
        !filters.sourcingId || idForFilter.includes(String(filters.sourcingId));

      return (
        matchesProductId &&
        matchesProductText &&
        matchesStatus &&
        matchesDate &&
        matchesSourcingId
      );
    });
  }, [enriched, filters]);

  /* ------------------------------ metrics ------------------------------ */
  const totalSavings = useMemo(
    () => filtered.reduce((s, r) => s + num(r.savings_dollar), 0),
    [filtered]
  );
  const requestsPending = useMemo(
    () => filtered.filter((r) => String(r.status) === "Pending").length,
    [filtered]
  );
  const requestsPurchased = useMemo(
    () => filtered.filter((r) => String(r.status) === "Purchased").length,
    [filtered]
  );
  const savingsColor = totalSavings >= 0 ? "#16a34a" : "#ef4444";

  /* ------------------------------ render ------------------------------- */
  if (!permsLoaded || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  // STRICT: if My Requests is OFF, show banner (no data/stats)
  if (canViewMyRequests !== true) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-between gap-3">
          <AppBreadcrumbs fromLocation />
          {canCreateOrder === true && (
            <button
              onClick={() => navigate("/sourcing/orders/new")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Sourcing
            </button>
          )}
        </div>

        <Card style={{ marginTop: 16 }}>
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-1">
              No permission to view “My Requests”
            </h3>
            <p className="text-gray-600">
              Ask an admin to enable <b>Sourcer → “my requests”</b> for your
              role.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen">
        <div className="flex items-center justify-between gap-3">
          <AppBreadcrumbs fromLocation />
          {canCreateOrder === true && (
            <button
              onClick={() => navigate("/sourcing/orders/new")}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Sourcing
            </button>
          )}
        </div>

        {/* DASHBOARD CONTENT (no tabs) */}
        <div className="mt-4 p-0 md:p-[1.25rem] rounded-[16px] sm:shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:border border-[#e6edff] bg-none md:bg-[linear-gradient(135deg,#f8fbff,#eef4ff)]">
          {/* Stats */}
          <Row gutter={[16, 16]}>
            {[
              {
                key: "count",
                title:
                  isAdmin && sourcerId ? "Total Listings " : "Total Listings",
                value: filtered.length,
              },

              {
                key: "pending",
                title: "Listings Pending",
                value: requestsPending,
              },
              {
                key: "purchased",
                title: "Listings Purchased",
                value: requestsPurchased,
              },
              {
                key: "savings",
                title: "Total Savings Generated",
                value: totalSavings,
                prefix: "$",
                precision: 2,
                valueStyle: { fontWeight: 700, color: savingsColor },
              },
            ].map((stat) => (
              <Col xs={24} sm={12} md={8} lg={6} key={stat.key}>
                <motion.div {...cardHoverEffect}>
                  <Card style={statsCardStyle} bodyStyle={{ padding: 16 }}>
                    {/* ⬇️ Only show skeleton on first load, not during background fetches */}
                    {ordersQ.isLoading ? (
                      <Skeleton
                        active
                        paragraph={{ rows: 2 }}
                        title={{ width: "80%" }}
                      />
                    ) : (
                      <Statistic
                        title={
                          <span style={{ fontWeight: 600 }}>{stat.title}</span>
                        }
                        value={stat.value}
                        prefix={stat.prefix}
                        suffix={stat.suffix}
                        precision={stat.precision}
                        valueStyle={stat.valueStyle || { fontWeight: 700 }}
                      />
                    )}
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>

          {/* Filters */}
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200 mt-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <FilterOutlined className="text-gray-500" />
                <Title
                  level={4}
                  style={{ margin: 0 }}
                  className="!mb-0 text-gray-700"
                >
                  Filters
                </Title>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Admin sourcer switcher (optional) */}
                {isAdmin && (
                  <Tooltip title="Pick a sourcer (admins only)">
                    <Select
                      allowClear
                      showSearch
                      className="w-64"
                      placeholder="View sourcer…"
                      options={sourcerOptsQ.data || []}
                      loading={sourcerOptsQ.isFetching}
                      value={sourcerId || undefined}
                      onChange={(val) => setSourcerId(val || null)}
                      filterOption={(input, option) =>
                        (option?.label || "")
                          .toLowerCase()
                          .includes((input || "").toLowerCase())
                      }
                    />
                  </Tooltip>
                )}

                {isAdmin && sourcerId && (
                  <Button
                    type="primary"
                    onClick={() =>
                      navigate(`/sourcing/orders?sourcer_id=${sourcerId}`)
                    }
                  >
                    View All
                  </Button>
                )}

                <Tooltip title="Reset filters">
                  <button
                    onClick={() =>
                      setFilters({
                        productId: null,
                        productText: "",
                        status: "",
                        dateRange: [
                          dayjs().startOf("month"),
                          dayjs().endOf("month"),
                        ],
                        sourcingId: "",
                      })
                    }
                    className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
                  >
                    Reset Filters
                  </button>
                </Tooltip>

                <Tooltip title="Reload">
                  <Button
                    icon={<ReloadOutlined />}
                    style={{
                      padding: "0.5rem 1rem",
                      height: "auto",
                      width: "auto",
                    }}
                    onClick={() => ordersQ.refetch()}
                    loading={ordersQ.isFetching}
                  />
                </Tooltip>
              </div>
            </div>

            {/* Controls */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={8} lg={6}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name contains
                  </label>
                  <Input
                    placeholder="e.g. controller"
                    allowClear
                    value={filters.productText}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, productText: e.target.value }))
                    }
                    size="large"
                  />
                </div>
              </Col>

              <Col xs={24} md={8} lg={5}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <Select
                    placeholder="Status"
                    allowClear
                    className="w-full"
                    value={filters.status || undefined}
                    onChange={(val) =>
                      setFilters((f) => ({ ...f, status: val || "" }))
                    }
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

              <Col xs={24} md={12} lg={5}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <RangePicker
                    className="w-full"
                    value={filters.dateRange || null}
                    onChange={(range) =>
                      setFilters((f) => ({ ...f, dateRange: range }))
                    }
                    size="large"
                  />
                </div>
              </Col>
            </Row>
          </div>

          {/* Recent requests table */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4"
          >
            <RecentlyCreatedFive
              orders={filtered}
              // ⬇️ Only show table spinner on first load
              loading={ordersQ.isLoading}
              title={
                isAdmin && sourcerId
                  ? "5 Most Recent Listings"
                  : "My 5 Most Recent Listings"
              }
              canViewMyRequests={canViewMyRequests === true}
              canEdit={canEditMyRequests === true}
              canCancel={canCancelMyRequests === true}
              navigate={navigate}
              handleDeleteOrder={handleDeleteOrder}
              itemTable={makeItemsTable}
              statusPill={statusPill}
            />
          </motion.div>
        </div>
      </div>

      {/* Floating FAB – centered icon, expands on hover */}
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
            {/* Icon */}
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

            {/* Label */}
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
