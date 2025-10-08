
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
  Empty,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { ReloadOutlined, FilterOutlined } from "@ant-design/icons";
import { debounce } from "lodash";
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
const cardHoverEffect = { whileHover: { scale: 1.01 }, whileTap: { scale: 0.99 } };
const num = (v) => (typeof v === "number" ? v : Number(v) || 0);


// ✅ Actual total from header numbers
const calcActualTotal = (r) =>
  num(r.sellers_price) + num(r.shipping_charges ?? r.shipping_price) + num(r.taxes ?? r.tax);

// ✅ Target total from items if order-level is missing
const calcTargetTotalFromItems = (items = []) =>
  items.reduce(
    (sum, it) =>
      sum +
      num(it.target_cost_per_unit ?? it.target_cost ?? 0) *
        num(it.quantity_needed ?? it.qty ?? 1),
    0
  );

const sameId = (a, b) => String(a || "").trim() === String(b || "").trim();

const orderBelongsToUser = (order, user) => {
  if (!user) return false;
  const userId = String(user._id || user.id || "");
  const userEmail = (user.email || "").toLowerCase();

  const candidates = [order.sourcer, order.sourcer_id, order.sourcerId, order.createdBy, order.created_by];
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === "string" || typeof c === "number") {
      if (userId && sameId(c, userId)) return true;
    }
    if (typeof c === "object") {
      const cid = String(c._id || c.id || "");
      const cemail = (c.email || "").toLowerCase();
      if (userId && sameId(cid, userId)) return true;
      if (userEmail && cemail && cemail === userEmail) return true;
    }
  }
  const deepUser = order?.sourcer?.user || order?.createdBy?.user;
  if (deepUser) {
    const cid = String(deepUser._id || deepUser.id || "");
    const cemail = (deepUser.email || "").toLowerCase();
    if (userId && sameId(cid, userId)) return true;
    if (userEmail && cemail && cemail === userEmail) return true;
  }
  const creatorEmail = (order.created_by_email || order.sourcer_email || "").toLowerCase();
  if (creatorEmail && userEmail && creatorEmail === userEmail) return true;
  return false;
};

/* --------------------------- perms helpers --------------------------- */
const lower = (v) => String(v ?? "").trim().toLowerCase();
const sourcerPermsFromRole = (roleObj) => {
  const acc = (roleObj?.access || []).find((a) => lower(a?.app) === "sourcer");
  const menu = Array.isArray(acc?.menu) ? acc.menu.map(lower) : [];
  return {
    createOrder: menu.includes("create order"),
    myRequests: menu.includes("my requests"),
    editMyRequests: menu.includes("edit my requests"),
    cancelMyRequests: menu.includes("cancel my requests"),
    // optional: importCsv: menu.includes("import csv"),
  };
};

/* =============================== PAGE =============================== */
export default function SourcerDashboardPage() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(authUser || null);
  const navigate = useNavigate();

  // perms from /api/v1/role/all
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [canCreateOrder, setCanCreateOrder] = useState(false);
  const [canViewMyRequests, setCanViewMyRequests] = useState(false);
  const [canEditMyRequests, setCanEditMyRequests] = useState(false);
  const [canCancelMyRequests, setCanCancelMyRequests] = useState(false);

  const roleName = lower(user?.roles?.role || user?.role || "");

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  const [sourcerId, setSourcerId] = useState(null);
  const [sourcerOptions, setSourcerOptions] = useState([]);
  const [sourcerOptionsLoading, setSourcerOptionsLoading] = useState(false);

  // ✅ Default to the current month
  const [filters, setFilters] = useState({
    productId: null,
    productText: "",
    status: "",
    dateRange: [dayjs().startOf("month"), dayjs().endOf("month")],
    sourcingId: "",
  });

  const [searchOptions, setSearchOptions] = useState([]);
  const debouncedSearch = useMemo(
    () =>
      debounce(async (q) => {
        const query = (q || "").trim();
        if (query.length < 2) {
          setSearchOptions([]);
          return;
        }
        try {
          const { data } = await apiClient.get("/api/v1/sourcing/products/search", {
            params: { search: query, limit: 20, page: 1 },
          });
          const list = Array.isArray(data?.products) ? data.products : [];
          setSearchOptions(
            list.map((p) => {
              const id = p._id || p.id;
              const sku = p.sku || "NO-SKU";
              const name = p.pro_title || p.product_name || p.title || p.name || "Untitled";
              const price = p.sale_price ?? p.price ?? null;
              return {
                value: String(id),
                label: `${sku} — ${name}${price != null ? ` ($${Number(price).toFixed(2)})` : ""}`,
                product: { id, sku, name, price, raw: p },
              };
            })
          );
        } catch (err) {
          console.error(err);
        }
      }, 300),
    []
  );

  /* --------------------------- user bootstrap --------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!authUser) {
          try {
            const res = await apiClient.get("/api/v1/auth/me");
            if (!cancelled) setUser(res.data?.user || res.data || null);
          } catch {
            const res2 = await apiClient.get("/api/v1/users/me");
            if (!cancelled) setUser(res2.data?.user || res2.data || null);
          }
        }
      } catch {
        console.warn("Failed to fetch /me; continuing with limited user info.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  /* --------------------------- fetch role perms -------------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/role/all");
        const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
        const matched = rolesArr.find((r) => lower(r?.role) === roleName) || null;
        const { createOrder, myRequests, editMyRequests, cancelMyRequests } =
          sourcerPermsFromRole(matched);

        if (!cancelled) {
          setCanCreateOrder(!!createOrder);
          setCanViewMyRequests(!!myRequests);
          setCanEditMyRequests(!!editMyRequests);
          setCanCancelMyRequests(!!cancelMyRequests);
          setRolesLoaded(true);
        }
      } catch (err) {
        console.error("Failed to fetch roles (/api/v1/role/all):", err?.response?.data || err?.message || err);
        if (!cancelled) {
          setCanCreateOrder(false);
          setCanViewMyRequests(false);
          setCanEditMyRequests(false);
          setCanCancelMyRequests(false);
          setRolesLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleName]);

  /* ------------------------ admin sourcer options ----------------------- */
  const loadSourcerOptions = useCallback(async () => {
    if (!canViewMyRequests) return;
    const isAdminByName = roleName === "admin";
    if (!isAdminByName) return;

    setSourcerOptionsLoading(true);
    try {
      const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", { params: { page: 1, limit: 200 } });
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
      setSourcerOptions(Array.from(map.values()).sort((a, b) => (a.label || "").localeCompare(b.label || "")));
    } catch (e) {
      console.error(e);
    } finally {
      setSourcerOptionsLoading(false);
    }
  }, [roleName, canViewMyRequests]);

  useEffect(() => {
    loadSourcerOptions();
  }, [loadSourcerOptions]);

  /* ---------------------------- data fetching --------------------------- */
  const fetchMine = useCallback(async (u) => {
    if (!u) return [];
    try {
      const r = await apiClient.get("/api/v1/sourcing/mine");
      const raw = r?.data;
      return Array.isArray(raw) ? raw : raw?.orders || raw?.data || raw?.results || [];
    } catch {
      try {
        const r = await apiClient.get("/api/v1/sourcing/all-sourcing");
        const raw = r?.data;
        const all = Array.isArray(raw) ? raw : raw?.orders || raw?.data || raw?.results || raw?.items || [];
        return all.filter((o) => orderBelongsToUser(o, u));
      } catch {
        const r = await apiClient.get("/api/v1/sourcing/pending");
        const raw = r?.data;
        const pending = Array.isArray(raw) ? raw : raw?.orders || raw?.data || raw?.results || [];
        return pending.filter((o) => orderBelongsToUser(o, u));
      }
    }
  }, []);

  const fetchForSourcer = useCallback(async (sid) => {
    const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
      params: { sourcer_id: sid, page: 1, limit: 200 },
    });
    return Array.isArray(data) ? data : data?.results || data?.data || [];
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!rolesLoaded) return;
      setLoading(true);
      try {
        if (!canViewMyRequests) {
          if (!cancelled) setOrders([]);
        } else {
          const u = authUser || user;
          if (!u) {
            setOrders([]);
          } else {
            const isAdminByName = roleName === "admin";
            if (isAdminByName && sourcerId) {
              const list = await fetchForSourcer(sourcerId);
              if (!cancelled) setOrders(list);
            } else {
              const mine = await fetchMine(u);
              if (!cancelled) setOrders(mine);
            }
          }
        }
      } catch (e) {
        console.error(e);
        message.error("Could not load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, user, rolesLoaded, canViewMyRequests, roleName, sourcerId, fetchMine, fetchForSourcer]);

  useEffect(() => {
    if (!loading) {
      setTableLoading(true);
      const timer = setTimeout(() => setTableLoading(false), 300);
      return () => clearTimeout(timer);
    }
  }, [filters, loading]);

  /* ---------------------------- enrichment ----------------------------- */
  const enriched = useMemo(() => {
    return (orders || []).map((r) => {
      const targetFromBackend = num(r.target_total_cost);
      const targetFromItems = calcTargetTotalFromItems(r.items);
      const targetTotal = targetFromBackend > 0 ? targetFromBackend : targetFromItems;

      const actualTotal = calcActualTotal(r);
      const savingsDollar = targetTotal - actualTotal;
      const efficiencyPct = targetTotal > 0 ? (savingsDollar / targetTotal) * 100 : 0;

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
        items.some((i) => String(i._id || i.id || i.product_id) === String(filters.productId));

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

      const idForFilter = String(order.sourcing_id ?? order._id ?? order.id ?? "");
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
  const totalBaseline = useMemo(
    () => filtered.reduce((s, r) => s + num(r.target_total), 0),
    [filtered]
  );
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

  const handleDeleteOrder = useCallback(
    async (orderId) => {
      if (!orderId) return;
      try {
        await apiClient.delete(`/api/v1/sourcing/${orderId}`);
        message.success("Sourcing request deleted");
        setTableLoading(true);
        try {
          if (!canViewMyRequests) {
            setOrders([]);
          } else {
            const isAdminByName = roleName === "admin";
            if (isAdminByName && sourcerId) {
              const list = await fetchForSourcer(sourcerId);
              setOrders(list);
            } else {
              const u = authUser || user;
              if (u) setOrders(await fetchMine(u));
            }
          }
        } finally {
          setTableLoading(false);
        }
      } catch (err) {
        console.error(err);
        message.error(err?.response?.data?.message || err?.response?.data?.detail || "Delete failed");
      }
    },
    [authUser, user, fetchMine, fetchForSourcer, roleName, sourcerId, canViewMyRequests]
  );

  /* ------------------------------ render ------------------------------- */
  if (!rolesLoaded || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spin size="large" />
      </div>
    );
  }

  // STRICT: if My Requests is OFF, show banner (no data/stats)
  if (!canViewMyRequests) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-between gap-3">
          <AppBreadcrumbs fromLocation />
          {canCreateOrder && (
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
            <h3 className="text-lg font-semibold mb-1">No permission to view “My Requests”</h3>
            <p className="text-gray-600">Ask an admin to enable <b>Sourcer → “my requests”</b> for your role.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between gap-3">
        <AppBreadcrumbs fromLocation />
        {canCreateOrder && (
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
        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <FilterOutlined className="text-gray-500" />
              <Title level={4} style={{ margin: 0 }} className="!mb-0 text-gray-700">
                Filters
              </Title>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Admin sourcer switcher (optional) */}
              {roleName === "admin" && (
                <Tooltip title="Pick a sourcer (admins only)">
                  <Select
                    allowClear
                    showSearch
                    className="w-64"
                    placeholder="View sourcer…"
                    options={sourcerOptions}
                    loading={sourcerOptionsLoading}
                    value={sourcerId || undefined}
                    onChange={async (val) => {
                      setSourcerId(val || null);
                      setTableLoading(true);
                      setStatsLoading(true);
                      try {
                        if (val) {
                          setOrders(await fetchForSourcer(val));
                        } else {
                          const u = authUser || user;
                          if (u) setOrders(await fetchMine(u));
                        }
                      } catch (e) {
                        console.error(e);
                        message.error("Failed to load sourcer’s orders");
                      } finally {
                        setTableLoading(false);
                        setStatsLoading(false);
                      }
                    }}
                    filterOption={(input, option) =>
                      (option?.label || "").toLowerCase().includes((input || "").toLowerCase())
                    }
                  />
                </Tooltip>
              )}

              {roleName === "admin" && sourcerId && (
                <Button type="primary" onClick={() => navigate(`/sourcing/orders?sourcer_id=${sourcerId}`)}>
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
                      dateRange: [dayjs().startOf("month"), dayjs().endOf("month")], // ✅ default current month
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
                  style={{ padding: "0.5rem 1rem", height: "auto", width: "auto" }}
                  onClick={async () => {
                    setTableLoading(true);
                    setStatsLoading(true);
                    try {
                      const isAdminByName = roleName === "admin";
                      if (isAdminByName && sourcerId) {
                        setOrders(await fetchForSourcer(sourcerId));
                      } else {
                        const u = user;
                        setOrders(await fetchMine(u));
                      }
                    } catch (err) {
                      console.error(err);
                      message.error("Failed to refresh.");
                    } finally {
                      setTableLoading(false);
                      setStatsLoading(false);
                    }
                  }}
                />
              </Tooltip>
            </div>
          </div>

          {/* Controls */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8} lg={6}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Name contains</label>
                <Input
                  placeholder="e.g. controller"
                  allowClear
                  value={filters.productText}
                  onChange={(e) => setFilters((f) => ({ ...f, productText: e.target.value }))}
                  size="large"
                />
              </div>
            </Col>

            <Col xs={24} md={8} lg={5}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <Select
                  placeholder="Status"
                  allowClear
                  className="w-full"
                  value={filters.status || undefined}
                  onChange={(val) => setFilters((f) => ({ ...f, status: val || "" }))}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <RangePicker
                  className="w-full"
                  value={filters.dateRange || null}
                  onChange={(range) => setFilters((f) => ({ ...f, dateRange: range }))}
                  size="large"
                />
              </div>
            </Col>
          </Row>
        </div>

        {/* Stats */}
{/* Stats */}
<Row gutter={[16, 16]}>
  {[
    {
      key: "count",
      title:
        roleName === "admin" && sourcerId
          ? "Total Requests (Selected Sourcer)"
          : "Total Requests Submitted",
      value: filtered.length,
    },
    {
      key: "savings",
      title: "Total Savings Generated",
      value: totalSavings,
      prefix: "$",
      precision: 2,
      valueStyle: { fontWeight: 700, color: savingsColor }, // <= color by sign
    },
    { key: "pending", title: "Requests Pending", value: requestsPending },
    { key: "purchased", title: "Requests Purchased", value: requestsPurchased },
  ].map((stat) => (
    <Col xs={24} sm={12} md={8} lg={6} key={stat.key}>
      <motion.div {...cardHoverEffect}>
        <Card style={statsCardStyle} bodyStyle={{ padding: 16 }}>
          {statsLoading ? (
            <Skeleton active paragraph={{ rows: 2 }} title={{ width: "80%" }} />
          ) : (
            <Statistic
              title={<span style={{ fontWeight: 600 }}>{stat.title}</span>}
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


        {/* Recent requests table */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4">
          <RecentlyCreatedFive
            orders={filtered}
            loading={tableLoading}
            title={roleName === "admin" && sourcerId ? "5 Most Recent (Selected Sourcer)" : "My 5 Most Recent Requests"}
            canViewMyRequests={canViewMyRequests}
            canEdit={canEditMyRequests}
            canCancel={canCancelMyRequests}
            navigate={navigate}
            handleDeleteOrder={handleDeleteOrder}
            itemTable={makeItemsTable}
            statusPill={statusPill}
          />
        </motion.div>
      </div>
    </div>
  );
}
