// /src/pages/purchaser/PurchaserDashboard.jsx
import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  Row,
  Col,
  Space,
  Typography,
  Button,
  Statistic,
  Divider,
  Table,
  Tag,
  Empty,
  Skeleton,
  Card,
  Spin,
  Select,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useNavigate, useLocation } from "react-router-dom";

import PurchasedTop5Table from "./components/PurchasedTop5Table";
import PurchaserFilters from "./components/PurchaserFilters";
import {
  labelFromMarket,
  normalizeRequests,
  statusColor,
} from "./utils/PurchaseTableUtils";

import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../api/client";
import { PieChart, ShoppingBag, Store, Users } from "lucide-react";
import AdminOpsOverview from "./components/AdminOpsOverview";
import StatPanels from "./components/StatsPanel";

// Colors match your KPI cards: from-white via-white to-slate-50 + ring-slate-200
const slateTheme = {
  panelBg: "bg-gradient-to-b from-white via-white to-slate-50/20",
  panelRing: "ring-1 ring-slate-200",
  textPrimary: "text-slate-800",
  textAccent: "text-slate-600",
  badge: "text-slate-700 bg-slate-50 ring-1 ring-inset ring-slate-200",
  tableBlend: `
    [&_.ant-table]:bg-transparent
    [&_.ant-table-container]:bg-transparent
    [&_.ant-table-thead>tr>th]:bg-transparent
    [&_.ant-table-thead>tr>th]:text-slate-700
    [&_.ant-table-tbody>tr>td]:bg-transparent
    [&_.ant-table-tbody>tr:hover>td]:bg-slate-50
    [&_.ant-table-cell]:border-slate-100
  `,
};

function StatPanel({ icon: Icon, title, count, children, className }) {
  return (
    <div
      className={[
        "flex-1 rounded-lg p-3 sm:p-4 shadow-sm",
        slateTheme.panelBg,
        slateTheme.panelRing,
        className || "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 ${slateTheme.textPrimary}`}>
          {Icon ? (
            <Icon className={`h-4 w-4 ${slateTheme.textAccent}`} />
          ) : null}
          <span className="font-semibold">{title}</span>
        </div>
        <span
          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${slateTheme.badge}`}
        >
          {count}
        </span>
      </div>

      <div className={slateTheme.tableBlend}>{children}</div>
    </div>
  );
}

const { Title, Text } = Typography;

const lower = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();
function toDate(v) {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
}
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
const pickRows = (body) =>
  Array.isArray(body)
    ? body
    : body?.docs || body?.data || body?.results || body?.items || [];

/* -------------------- permissions from /api/v1/role/all -------------------- */
const extractPurchaserPerms = (roleObj) => {
  const access = Array.isArray(roleObj?.access) ? roleObj.access : [];
  const purchaser = access.find((a) => lower(a?.app) === "purchaser");
  const menu = Array.isArray(purchaser?.menu) ? purchaser.menu.map(lower) : [];
  return {
    canSeeAssignedMine: menu.includes("assigned to me"),
    canSeeAllAssigned: menu.includes("all assigned"),
  };
};

/* ------------------- purchaser search control for admins ------------------- */
function usePurchaserSearch() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const t = useRef(null);

  const mapUser = (u) => ({
    value: String(u.value),
    label: (
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontWeight: 600 }}>
          {u.label || u.email || "Unnamed"}
        </span>
        {u.email ? <span style={{ color: "#999" }}>· {u.email}</span> : null}
      </div>
    ),
    raw: u,
  });

  const fetchUsers = async (q = "", page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/v1/sourcing/purchasers/search", {
        params: { q, page, limit },
      });
      const list = res.data?.results || [];
      setOptions(list.map(mapUser));
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) message.warning("Only admins can search purchasers.");
      else
        message.error(
          e?.response?.data?.message || "Failed to search purchasers."
        );
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = (q) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fetchUsers(q), 300);
  };

  const fetchInitial = () => !options.length && fetchUsers("");

  return { options, loading, debouncedSearch, fetchInitial };
}

/* ========================================================================== */
export default function PurchaserDashboard() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = pathname.startsWith("/purchasing")
    ? "/purchasing"
    : "/purchaser";

  const { user: authUser } = useAuth();
  const roleName = lower(authUser?.roles?.role || authUser?.role || "");

  const isAdmin = useMemo(() => {
    const r = authUser?.roles;
    if (Array.isArray(r)) {
      return r
        .map((x) =>
          typeof x === "string"
            ? x.toLowerCase()
            : String(x?.role || "").toLowerCase()
        )
        .includes("admin");
    }
    return String(r?.role || r || "").toLowerCase() === "admin";
  }, [authUser]);

  /* -------------------- permissions gate -------------------- */
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [canSeeAssignedMine, setCanSeeAssignedMine] = useState(false);
  const [canSeeAllAssigned, setCanSeeAllAssigned] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/role/all");
        const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
        const matched =
          rolesArr.find((r) => lower(r?.role) === roleName) || null;
        const { canSeeAssignedMine, canSeeAllAssigned } = extractPurchaserPerms(
          matched || {}
        );
        if (!cancelled) {
          setCanSeeAssignedMine(!!canSeeAssignedMine);
          setCanSeeAllAssigned(!!canSeeAllAssigned);
          setRolesLoaded(true);
        }
      } catch (e) {
        console.error("Failed to load roles:", e);
        if (!cancelled) {
          setCanSeeAssignedMine(false);
          setCanSeeAllAssigned(false);
          setRolesLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleName]);

  /* -------------------------- filters & scope -------------------------- */
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // 🔹 Default to current month
  const [dateRange, setDateRange] = useState(() => [
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);

  const [selectedPurchaser, setSelectedPurchaser] = useState(null);

  const {
    options: purchaserOptions,
    loading: purchaserLoading,
    debouncedSearch: purchaserSearch,
    fetchInitial: fetchInitialPurchasers,
  } = usePurchaserSearch();

  /* ---------------------------- data state ---------------------------- */
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ------------------------ server query params ------------------------ */
  const serverParams = useMemo(() => {
    // Permission gates
    if (isAdmin) {
      if (!canSeeAllAssigned) return null; // admin but cannot see "all assigned"
    } else {
      if (!canSeeAssignedMine) return null; // non-admin but cannot see "assigned to me"
    }

    const params = {};
    if (isAdmin) {
      if (selectedPurchaser?.value)
        params.purchaser_id = selectedPurchaser.value;
    } else {
      params.mine = true;
    }

    if (statusFilter) params.status = statusFilter;

    // 🔹 Include current-month range by default (and whenever user changes it)
    if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
      params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
      params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
    }

    if (searchTerm?.trim()) params.q = searchTerm.trim();
    return params;
  }, [
    isAdmin,
    canSeeAllAssigned,
    canSeeAssignedMine,
    selectedPurchaser,
    statusFilter,
    dateRange,
    searchTerm,
  ]);

  const fetchData = useCallback(async () => {
    if (!serverParams) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const LIMIT = 500; // plenty for dashboard metrics
      const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
        params: { ...serverParams, page: 1, limit: LIMIT, sort: "-createdAt" },
      });
      const rows = pickRows(data);
      setRequests(normalizeRequests(rows));
    } catch (err) {
      console.error(
        "Failed to fetch dashboard data:",
        err?.response?.data || err?.message
      );
      message.error(err?.response?.data?.message || "Failed to fetch data.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [serverParams]);

  useEffect(() => {
    if (!rolesLoaded) return;
    fetchData();
  }, [rolesLoaded, fetchData]);

  const onRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchData();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchData]);

  const clearAll = () => {
    setStatusFilter("");
    setSearchTerm("");
    // 🔹 Reset back to "this month" when clearing filters
    setDateRange([dayjs().startOf("month"), dayjs().endOf("month")]);
    setSelectedPurchaser(null);
    fetchData();
  };

  /* ------------------------------ metrics ------------------------------ */
  const {
    count,
    byStatus,
    byMarket,
    bySellerAllCount,
    bySellerTop5,
    purchasedCount,
    avgResponseMs,
    responseCount,
  } = useMemo(() => {
    const rows = Array.isArray(requests) ? requests : [];
    const agg = {
      count: rows.length,
      byStatus: new Map(),
      byMarket: new Map(),
      bySeller: new Map(),
      purchasedCount: 0,
      responseSumMs: 0,
      responseCount: 0,
    };

    for (const d of rows) {
      const s = String(d?.status ?? "Pending");
      agg.byStatus.set(s, (agg.byStatus.get(s) || 0) + 1);

      const mkt = labelFromMarket(d?.market ?? d?.sellerMarket);
      agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

      const sellerName = d?.seller_name ?? d?.sellerName ?? "—";
      agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

      if (s === "Purchased") agg.purchasedCount += 1;

      const assignedAt = toDate(d?.assignedAt);
      const actionAt =
        toDate(d?.purchaserActionTime) || toDate(d?.purchaserResponseTime);
      if (assignedAt && actionAt) {
        const delta = actionAt.getTime() - assignedAt.getTime();
        if (Number.isFinite(delta) && delta >= 0) {
          agg.responseSumMs += delta;
          agg.responseCount += 1;
        }
      }
    }

    const sortDesc = (arr) => arr.sort((a, b) => b[1] - a[1]);
    const byMarketArr = sortDesc(Array.from(agg.byMarket.entries())).slice(
      0,
      6
    );
    const bySellerArr = sortDesc(Array.from(agg.bySeller.entries()));
    const bySellerTop5 = bySellerArr.slice(0, 5);

    return {
      count: agg.count,
      byStatus: Array.from(agg.byStatus.entries()).sort((a, b) => b[1] - a[1]),
      byMarket: byMarketArr,
      bySellerAllCount: bySellerArr.length,
      bySellerTop5,
      purchasedCount: agg.purchasedCount,
      avgResponseMs: agg.responseCount
        ? Math.round(agg.responseSumMs / agg.responseCount)
        : null,
      responseCount: agg.responseCount,
    };
  }, [requests]);

  /* ------------------------------ render ------------------------------ */
  if (!rolesLoaded) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 240 }}>
        <Spin />
      </div>
    );
  }

  if (isAdmin && !canSeeAllAssigned) {
    return (
      <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
        <Empty
          description={
            <div className="text-center">
              <div className="font-semibold">
                No permission to view “All Assigned”
              </div>
              <div className="text-gray-500">
                Ask an admin to enable Purchaser → “all assigned”.
              </div>
            </div>
          }
        />
      </Card>
    );
  }

  if (!isAdmin && !canSeeAssignedMine) {
    return (
      <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
        <Empty
          description={
            <div className="text-center">
              <div className="font-semibold">
                No permission to view “Assigned to Me”
              </div>
              <div className="text-gray-500">
                Ask an admin to enable Purchaser → “assigned to me”.
              </div>
            </div>
          }
        />
      </Card>
    );
  }

  const showAdminScopeControl = isAdmin && canSeeAllAssigned;
  const AdminScopeControl = showAdminScopeControl ? (
    <Select
      allowClear
      showSearch
      placeholder="View purchaser…"
      style={{ minWidth: 260 }}
      options={purchaserOptions}
      loading={purchaserLoading}
      value={selectedPurchaser?.value}
      onSearch={purchaserSearch}
      onDropdownVisibleChange={(open) => open && fetchInitialPurchasers()}
      onChange={(_, option) => setSelectedPurchaser(option || null)}
      filterOption={false}
      size="large"
    />
  ) : null;

  return (
    <motion.div
      initial={{ scale: 0.99, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="
        rounded-xl p-4
        bg-white
        border border-slate-200
        shadow-sm
      "
    >
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Purchaser Dashboard
          </Title>
          <Text type="secondary">
            {loading
              ? "Loading…"
              : `Showing ${count} records${
                  responseCount ? ` · ${responseCount} with response time` : ""
                }`}
          </Text>

          {showAdminScopeControl && selectedPurchaser ? (
            <div style={{ marginTop: 6 }}>
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 text-slate-700 px-2 py-1 text-xs border border-slate-200">
                {selectedPurchaser?.label}
                <button
                  onClick={() => setSelectedPurchaser(null)}
                  className="ml-1 rounded-sm px-1 hover:bg-slate-100"
                  aria-label="Clear purchaser scope"
                >
                  ✕
                </button>
              </span>
            </div>
          ) : null}
        </Col>

        <Col>
          <Space wrap>
            {AdminScopeControl}
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              disabled={loading || isRefreshing}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Filters */}
      <PurchaserFilters
        screens={{}}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateRange={dateRange}
        setDateRange={setDateRange}
        AdminScopeControl={null}
        onClear={clearAll}
        showStatusNote="Filters apply to dashboard metrics and quick view"
      />

      {/* KPIs */}
      <Row gutter={[12, 12]} align="stretch">
        {[
          { title: "Total Orders", value: count },
          { title: "Purchased", value: purchasedCount },
          {
            title: "Average Response Time",
            value: avgResponseMs === null ? "—" : formatDuration(avgResponseMs),
          },
        ].map((kpi, i) => {
          const tones = [
            {
              grad: "from-sky-50 to-sky-100",
              ring: "ring-sky-200",
              accent: "bg-sky-300/70",
            },
            {
              grad: "from-emerald-50 to-emerald-100",
              ring: "ring-emerald-200",
              accent: "bg-emerald-300/70",
            },
            {
              grad: "from-indigo-50 to-indigo-100",
              ring: "ring-indigo-200",
              accent: "bg-indigo-300/70",
            },
          ];
          const t = tones[i % tones.length];

          return (
            <Col xs={12} md={8} key={i} className="flex">
              <div
                className={[
                  "relative flex-1 overflow-hidden rounded-xl p-4",
                  "bg-gradient-to-b",
                  t.grad,
                  t.ring,
                  "ring-1 shadow-sm",
                  "transition-all duration-150 hover:shadow-md hover:scale-[1.01]",
                ].join(" ")}
              >
                {/* top & bottom thin accents */}
                <div className={`absolute inset-x-0 top-0 h-0.5 ${t.accent}`} />
                <div
                  className={`absolute inset-x-0 bottom-0 h-[0.5px] ${t.accent}`}
                />

                {loading ? (
                  <Skeleton active paragraph={false} />
                ) : (
                  <Statistic
                    title={
                      <span className="text-sm font-medium text-slate-700">
                        {kpi.title}
                      </span>
                    }
                    value={kpi.value}
                    valueStyle={{
                      fontWeight: 700,
                      color: "#0f172a", // slate-900
                      fontSize: "1.25rem",
                    }}
                  />
                )}
              </div>
            </Col>
          );
        })}
      </Row>

      {/* Breakdowns */}

      <StatPanels
        loading={loading}
        byStatus={byStatus}
        byMarket={byMarket}
        bySellerTop5={bySellerTop5}
        bySellerAllCount={bySellerAllCount}
        statusColor={statusColor}
      />

      {isAdmin && (
        <AdminOpsOverview isAdmin={isAdmin} data={requests} loading={loading} />
      )}

      {/* Latest Purchased (quick view only) */}
      <div className="mt-4 rounded-lg p-3 bg-gradient-to-b from-white via-white to-slate-50 ring-1 ring-slate-200">
        <PurchasedTop5Table
          data={requests}
          loading={loading}
          title="Latest 5 Purchased Orders"
          currency="USD"
          requirePurchased={false}
          onOpen={(rec) => {
            const id = rec?._id || rec?.id || rec?.sourcing_id || "";
            if (!id) return;
            navigate(`/requests/${String(id)}`);
          }}
        />
      </div>

      <style>{`
        .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
        .ant-statistic-title { color: #64748b; }
      `}</style>
    </motion.div>
  );
}
