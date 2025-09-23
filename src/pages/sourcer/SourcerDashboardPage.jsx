
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Card,
  Col,
  Row,
  Statistic,
  Table,
  message,
  Tag,
  Space,
  Typography,
  Tabs,
  Spin,
  Select,
  DatePicker,
  Input,
  Button,
  Tooltip,
  Empty,
  Skeleton,
} from "antd";
import { motion } from "framer-motion";
import {
  LoadingOutlined,
  ReloadOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { debounce } from "lodash";
import dayjs from "dayjs";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import AppBreadcrumbs from "../../components/AppBreadCrumbs";
import SourcingOrdersPage from "./SourcingPage";

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

/** -------------------- UI helpers -------------------- */
const gradientCardStyle = {
  borderRadius: 16,
  background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e6edff",
};
const statsCardStyle = {
  borderRadius: 14,
  background: "linear-gradient(135deg, #ffffff, #f6f9ff)",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  border: "1px solid #eef2ff",
};
const tableCardStyle = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #eef2ff",
  overflow: "hidden",
};
const cardHoverEffect = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.99 },
};

const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
const formatDT = (dt) => (dt ? new Date(dt).toLocaleString() : "N/A");

const calcActualTotal = (r) =>
  num(r.sellers_price) +
  num(r.shipping_charges ?? r.shipping_price) +
  num(r.taxes ?? r.tax);

const calcBaselineFromItems = (items = [], target_cost_per_unit = 0) => {
  const perItemBaseline = items.reduce(
    (sum, it) => sum + num(it.sourced_price) * num(it.quantity_needed || 1),
    0
  );
  if (perItemBaseline > 0) return perItemBaseline;
  const totalQty = items.reduce((q, it) => q + num(it.quantity_needed || 1), 0);
  return num(target_cost_per_unit) * totalQty;
};

// status colors
const statusColor = (s) =>
  s === "Pending"
    ? "gold"
    : s === "Purchased"
    ? "green"
    : s === "Dropshipped"
    ? "blue"
    : s === "Assigned"
    ? "purple"
    : s === "Completed"
    ? "geekblue"
    : s === "Disapproved"
    ? "volcano"
    : s === "Returned"
    ? "red"
    : s === "Offer"
    ? "cyan"
    : s === "Hold"
    ? "orange"
    : s === "Seller Rejected"
    ? "magenta"
    : "default";

// map products to Select options
const mapProductToOption = (p) => {
  const id = p._id || p.id;
  const sku = p.sku || "NO-SKU";
  const name = p.pro_title || p.product_name || p.title || p.name || "Untitled";
  const price = p.sale_price ?? p.price ?? null;
  return {
    value: String(id),
    label: `${sku} — ${name}${
      price != null ? ` ($${Number(price).toFixed(2)})` : ""
    }`,
    product: { id, sku, name, price, raw: p },
  };
};

/** -------------------- user-owned filter -------------------- */
const sameId = (a, b) => String(a || "").trim() === String(b || "").trim();

const orderBelongsToUser = (order, user) => {
  if (!user) return false;
  const userId = String(user._id || user.id || "");
  const userEmail = (user.email || "").toLowerCase();

  // candidate fields in different shapes
  const candidates = [
    order.sourcer,
    order.sourcer_id,
    order.sourcerId,
    order.createdBy,
    order.created_by,
  ];

  for (const c of candidates) {
    if (!c) continue;
    // if string id
    if (typeof c === "string" || typeof c === "number") {
      if (userId && sameId(c, userId)) return true;
    }
    // object with _id / id / email
    if (typeof c === "object") {
      const cid = String(c._id || c.id || "");
      const cemail = (c.email || "").toLowerCase();
      if (userId && sameId(cid, userId)) return true;
      if (userEmail && cemail && cemail === userEmail) return true;
    }
  }

  // sometimes API nests as { sourcer: { user: { _id, email } } }
  const deepUser = order?.sourcer?.user || order?.createdBy?.user;
  if (deepUser) {
    const cid = String(deepUser._id || deepUser.id || "");
    const cemail = (deepUser.email || "").toLowerCase();
    if (userId && sameId(cid, userId)) return true;
    if (userEmail && cemail && cemail === userEmail) return true;
  }

  // last resort: direct email fields
  const creatorEmail = (
    order.created_by_email ||
    order.sourcer_email ||
    ""
  ).toLowerCase();
  if (creatorEmail && userEmail && creatorEmail === userEmail) return true;

  return false;
};

export default function SourcerDashboardPage() {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(authUser || null);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    productId: null,
    productText: "",
    status: "",
    dateRange: null,
    sourcingId: "",
  });

  // Product dropdown options
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
          const { data } = await apiClient.get(
            "/api/v1/sourcing/products/search",
            {
              params: { search: query, limit: 20, page: 1 },
            }
          );
          const list = Array.isArray(data?.products) ? data.products : [];
          setSearchOptions(list.map(mapProductToOption));
        } catch (err) {
          console.error(err);
        }
      }, 300),
    []
  );

  // Load current user (fallback to API if context is missing)
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
      } catch (err) {
        console.warn("Failed to fetch /me; continuing with limited user info.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  // Fetch orders then filter to this user (even if backend returns all)
  const fetchMine = useCallback(async (u) => {
    if (!u) return [];
    // try a "mine" endpoint first
    try {
      const r = await apiClient.get("/api/v1/sourcing/mine");
      const raw = r?.data;
      const list = Array.isArray(raw)
        ? raw
        : raw?.orders || raw?.data || raw?.results || [];
      return list;
    } catch {
      // fallback to broader endpoints, then filter locally
      try {
        const r = await apiClient.get("/api/v1/sourcing/all-sourcing");
        const raw = r?.data;
        const all = Array.isArray(raw)
          ? raw
          : raw?.orders || raw?.data || raw?.results || raw?.items || [];
        return all.filter((o) => orderBelongsToUser(o, u));
      } catch {
        // last fallback: maybe a different route exposes recent requests
        const r = await apiClient.get("/api/v1/sourcing/pending");
        const raw = r?.data;
        const pending = Array.isArray(raw)
          ? raw
          : raw?.orders || raw?.data || raw?.results || [];
        return pending.filter((o) => orderBelongsToUser(o, u));
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const u = authUser || user;
        if (!u) {
          setOrders([]);
        } else {
          const mine = await fetchMine(u);
          if (!cancelled) setOrders(mine);
        }
      } catch (e) {
        console.error(e);
        message.error(
          "Could not load dashboard data. Check login, CORS, and API baseURL."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser, user, fetchMine]);

  // Handle filter changes with table loading
  useEffect(() => {
    if (!loading) {
      setTableLoading(true);
      // Simulate a brief loading state for filter changes
      const timer = setTimeout(() => {
        setTableLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [filters, loading]);

  // Enrich for metrics
  const enriched = useMemo(() => {
    return (orders || []).map((r) => {
      const baselineBackend = num(r.target_total_cost);
      const baseline =
        baselineBackend > 0
          ? baselineBackend
          : calcBaselineFromItems(r.items, r.target_cost_per_unit);
      const actual = calcActualTotal(r);
      const savingsDollar = baseline - actual;
      const effPct = baseline > 0 ? (savingsDollar / baseline) * 100 : 0;
      return {
        ...r,
        target_total: baseline,
        savings_dollar: savingsDollar,
        efficiency_pct: effPct,
        created_at: r.createdAt || r.created_at,
        finalized_at: r.purchaserResponseTime || r.updatedAt || null,
      };
    });
  }, [orders]);

  // High-level stats
  const totalBaseline = useMemo(
    () => enriched.reduce((s, r) => s + num(r.target_total), 0),
    [enriched]
  );
  const totalSavings = useMemo(
    () => enriched.reduce((s, r) => s + num(r.savings_dollar), 0),
    [enriched]
  );
  const overallEffPct = useMemo(
    () => (totalBaseline > 0 ? (totalSavings / totalBaseline) * 100 : 0),
    [totalBaseline, totalSavings]
  );
  const requestsPending = useMemo(
    () => enriched.filter((r) => r.status === "Pending").length,
    [enriched]
  );
  const requestsPurchased = useMemo(
    () => enriched.filter((r) => r.status === "Purchased").length,
    [enriched]
  );

  // Apply dashboard filters
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
          dayjs(created).isAfter(filters.dateRange[0].startOf("day")) &&
          dayjs(created).isBefore(filters.dateRange[1].endOf("day")));

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

  const recentRequests = useMemo(() => {
    return [...filtered]
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 5);
  }, [filtered]);

  // Columns
  const columns = [
    {
      title: "ID",
      dataIndex: "sourcing_id",
      key: "sourcing_id",
      width: 90,
      render: (v) => (v != null ? `#${v}` : "—"),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => <Tag color={statusColor(s)}>{s}</Tag>,
    },
    {
      title: "Product(s)",
      dataIndex: "items",
      key: "items",
      render: (items) => (
        <Space direction="vertical" size="small">
          {(items || []).map((item, i) => (
            <Text key={i}>
              {item.product_name || item.name || "Unnamed Product"}
            </Text>
          ))}
        </Space>
      ),
    },
    {
      title: "Baseline $",
      dataIndex: "target_total",
      key: "target_total",
      render: (v) => <Tag color="purple">${num(v).toFixed(2)}</Tag>,
    },
    {
      title: "Efficiency $",
      dataIndex: "savings_dollar",
      key: "savings_dollar",
      render: (v) => (
        <Tag color={num(v) >= 0 ? "green" : "red"}>${num(v).toFixed(2)}</Tag>
      ),
    },
    {
      title: "Efficiency %",
      dataIndex: "efficiency_pct",
      key: "efficiency_pct",
      render: (v) => (
        <Tag color={num(v) >= 0 ? "geekblue" : "volcano"}>
          {num(v).toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: "Created On",
      dataIndex: "created_at",
      key: "created_at",
      render: formatDT,
    },
    {
      title: "Finalized At",
      dataIndex: "finalized_at",
      key: "finalized_at",
      render: formatDT,
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
      <Spin size="large" />
    </div>
    );
  }

  return (
    <div className="min-h-screen">

       <AppBreadcrumbs fromLocation />

      <Tabs defaultActiveKey="1" type="card" className="mt-4">
        <TabPane tab="Dashboard Overview" key="1">
          <div
            className="p-0 md:p-[1.25rem] rounded-[16px] sm:shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:border border-[#e6edff] bg-none md:bg-[linear-gradient(135deg,#f8fbff,#eef4ff)]"
          >
            {/* Filter Bar */}
            <Card
              size="small"
              className="mb-4 rounded-lg border border-[#eaf0ff]"
              bodyStyle={{ padding: 12 }}
              title={
                <Space>
                  <FilterOutlined />
                  <span style={{ fontWeight: 600 }}>Filters</span>
                </Space>
              }
              extra={
                <Space>
                  <Tooltip title="Reset filters">
                    <Button
                      size="small"
                      onClick={() =>
                        setFilters({
                          productId: null,
                          productText: "",
                          status: "",
                          dateRange: null,
                          sourcingId: "",
                        })
                      }
                    >
                      Clear
                    </Button>
                  </Tooltip>
                  <Tooltip title="Reload my orders">
                    <Button
                      icon={<ReloadOutlined />}
                      size="small"
                      onClick={async () => {
                        setTableLoading(true);
                        setStatsLoading(true);
                        try {
                          const u = user;
                          const mine = await fetchMine(u);
                          setOrders(mine);
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
                </Space>
              }
            >
              <Row gutter={[12, 12]}>
                <Col xs={24} md={10} lg={8}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Filter by Master Product (SKU or Name)…"
                    style={{ width: "100%" }}
                    filterOption={false}
                    onSearch={debouncedSearch}
                    options={searchOptions}
                    onChange={(val, option) => {
                      setFilters((f) => ({ ...f, productId: val || null }));
                      if (option?.product?.name) {
                        setFilters((f) => ({
                          ...f,
                          productText: option.product.name,
                        }));
                      }
                    }}
                    onClear={() => {
                      setFilters((f) => ({
                        ...f,
                        productId: null,
                        productText: "",
                      }));
                      setSearchOptions([]);
                    }}
                  />
                </Col>

                <Col xs={24} md={8} lg={6}>
                  <Input
                    placeholder="Or filter by Product Name contains…"
                    allowClear
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, productText: e.target.value }))
                    }
                  />
                </Col>

                <Col xs={24} md={8} lg={5}>
                  <Select
                    placeholder="Status"
                    allowClear
                    style={{ width: "100%" }}
                    onChange={(val) =>
                      setFilters((f) => ({ ...f, status: val || "" }))
                    }
                    dropdownStyle={{ borderRadius: 10 }}
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
                </Col>

                <Col xs={24} md={12} lg={5}>
                  <RangePicker
                    style={{ width: "100%" }}
                    onChange={(range) =>
                      setFilters((f) => ({ ...f, dateRange: range }))
                    }
                  />
                </Col>

                <Col xs={24} md={12} lg={4}>
                  <Input
                    placeholder="Sourcing ID (#)"
                    allowClear
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, sourcingId: e.target.value }))
                    }
                  />
                </Col>
              </Row>
            </Card>

            {/* Stats row */}
            <Row gutter={[16, 16]}>
              {[
                { title: "Total Requests Submitted", value: enriched.length },
                {
                  title: "My Total Savings Generated",
                  value: totalSavings,
                  prefix: "$",
                  precision: 2,
                },
                {
                  title: "Total Baseline",
                  value: totalBaseline,
                  prefix: "$",
                  precision: 2,
                },
                {
                  title: "Overall Efficiency %",
                  value: overallEffPct,
                  precision: 1,
                  suffix: "%",
                },
                { title: "Requests Pending", value: requestsPending },
                { title: "Requests Purchased", value: requestsPurchased },
              ].map((stat, index) => (
                <Col xs={24} sm={12} md={8} lg={6} key={index}>
                  <motion.div {...cardHoverEffect}>
                    <Card style={statsCardStyle} bodyStyle={{ padding: 16 }}>
                      {statsLoading ? (
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
                          valueStyle={{ fontWeight: 700 }}
                        />
                      )}
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>

            {/* Recent requests table */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <Card
                title={
                  <span style={{ fontWeight: 700 }}>
                    My 5 Most Recent Requests
                  </span>
                }
                extra={
                  <Text type="secondary">
                    {filtered.length
                      ? `${filtered.length} matching`
                      : "No records"}
                  </Text>
                }
                style={{ marginTop: 16, ...tableCardStyle }}
                bodyStyle={{ padding: 0 }}
              >
                <Table
                  dataSource={recentRequests}
                  columns={columns}
                  rowKey={(r) => r._id || r.sourcing_id || r.id}
                  pagination={false}
                  size="middle"
                  loading={tableLoading}
                  locale={{
                    emptyText: <Empty description="No requests found" />,
                  }}
                  // add overflow-x-auto
                  className="overflow-x-auto"
                />
              </Card>
            </motion.div>
          </div>
        </TabPane>



        <TabPane tab="All Sourcing Orders" key="2">
          <SourcingOrdersPage/>
        </TabPane>
      </Tabs>
    </div>
  );
}
