import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Table,
  message,
  Tag,
  Select,
  Typography,
  Input,
  Tabs,
  DatePicker,
  Button,
  Card,
  Grid,
  Row,
  Col,
  Space,
  Empty,
  Tooltip,
} from "antd";
import {
  ReloadOutlined,
  LoadingOutlined,
  FilterOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import apiClient from "../../api/client";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useNavigate, useLocation } from "react-router-dom";
import useProductSearch from "../sourcer/hooks/useProductSearch"; // async product search (same as Sourcer)
import PurchaserDashboard from "./PurchaserDashboardPage";

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { useBreakpoint } = Grid;

/* ---------- helpers ---------- */
const toListingUrl = (url) =>
  !url ? "#" : /^https?:\/\//i.test(url) ? url : `https://${url}`;
const fmtCurrency = (n) =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        currencyDisplay: "narrowSymbol", // → "$" instead of "US$"
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n)
    : "—";

const fmtDateTime = (value) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "—"; 
const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
const getCreated = (rec) =>
  rec.created_at || rec.createdAt || rec.created_on || null;

const prettyMarket = (m) => {
  if (!m) return "";
  if (typeof m === "object") {
    return m.name || m.label || m.title || "";
  }
  // Hide likely ObjectId/UUIDs
  if (/^[0-9a-f]{24}$/i.test(m) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(m))
    return "";
  // Make codes like "us" or "north_america" look nicer
  return String(m)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/* normalize results */
const normalizeRequests = (payload) => {
  const list = Array.isArray(payload)
    ? payload
    : payload?.data || payload?.results || [];
  return (Array.isArray(list) ? list : []).map((doc) => {
    const id = doc._id ?? doc.id ?? String(doc._id || "");
    const created_at = getCreated(doc);
    const items = Array.isArray(doc.items) ? doc.items : [];

    const sourcer_name =
      doc.sourcer?.name ??
      doc.sourcer_name ??
      doc.sourcerName ??
      (typeof doc.sourcer === "string" ? doc.sourcer : undefined) ??
      "";

    const seller_name =
      doc.seller?.name ??
      doc.seller_name ??
      doc.sellerName ??
      (typeof doc.seller === "string" ? doc.seller : undefined) ??
      "";

    const market = prettyMarket(
      doc.seller?.market_name ??
        doc.seller?.marketName ??
        doc.market_name ??
        doc.marketName ??
        doc.seller?.market ?? // could be object, code, or id
        doc.market ?? // fallback
        ""
    );

    return {
      ...doc,
      _id: id,
      id,
      sourcing_id: doc.sourcing_id ?? doc.sourcingId ?? doc.sourcingID ?? null,
      created_at,
      items: items.map((it) => ({
        ...it,
        _id: it._id ?? it.id ?? String(it._id || ""),
        id: it.id ?? it._id,
        product_name: it.product_name ?? it.name ?? "Unnamed",
        sku: it.sku ?? it.product_sku ?? it.code ?? "",
        product_id: it.product_id ?? it.id ?? it._id,
        quantity_needed: it.quantity_needed ?? 1,
        product_type: it.product_type ?? "Game",
      })),
      sourcer_name,
      seller_name,
      market,
      sellers_price: doc.sellers_price ?? 0,
      shipping_charges: doc.shipping_charges ?? doc.shipping_price ?? 0,
      taxes: doc.taxes ?? doc.tax ?? 0,
      target_total_cost: doc.target_total_cost ?? 0,
      total_actual_cost: doc.total_actual_cost ?? 0,
      purchase_efficiency:
        typeof doc.purchase_efficiency === "number"
          ? doc.purchase_efficiency
          : safeNum(doc.target_total_cost) - safeNum(doc.total_actual_cost),
      status: doc.status ?? "Pending",
      listing_link: doc.listing_link ?? doc.listingLink ?? doc.url ?? null,
      listing_id: doc.listing_id ?? doc.listingId ?? null,
      assignedAt: doc.assigned_at ?? doc.assignedAt ?? null,
      purchaser_id: doc.purchaser_id ?? doc.purchaserId ?? null,
    };
  });
};

/* ---------- PENDING TAB ---------- */
// ⬆️ Make sure these are imported at the top, in addition to what you already have:
// import { Popover, Tooltip } from "antd";
// import { LinkOutlined, LoadingOutlined, ReloadOutlined } from "@ant-design/icons";

const statusColor = (s) => {
  switch (s) {
    case "Assigned":
      return "gold";
    case "Offer":
      return "blue";
    case "Purchased":
      return "green";
    case "Disapproved":
      return "red";
    case "Sold":
      return "purple";
    case "Hold":
      return "orange";
    case "Seller Rejected":
      return "magenta";
    case "Dropshipped":
      return "cyan";
    case "Returned":
      return "volcano";
    default:
      return "geekblue";
  }
};

function PendingTab({ onAssigned }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/v1/sourcing/pending");
      setRequests(normalizeRequests(res.data));
    } catch (err) {
      console.error(err);
      message.error("Failed to fetch pending requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleAssign = async (sourcingId) => {
    setAssigningId(sourcingId);
    try {
      const res = await apiClient.post(`/api/v1/sourcing/${sourcingId}/assign`);
      const assignedAt = new Date().toISOString();
      await apiClient.patch(`/api/v1/sourcing/${sourcingId}`, { assignedAt });

      const [updated] = normalizeRequests([{ ...res.data, assignedAt }]);
      setRequests((prev) =>
        prev.filter((r) => String(r._id) !== String(sourcingId))
      );
      message.success(
        `Assigned #${updated.id} — status: ${updated.status}${
          updated.purchaser_id ? `, purchaser: ${updated.purchaser_id}` : ""
        }`
      );
      onAssigned?.(updated);
    } catch (error) {
      console.error(error);
      message.error(
        error.response?.data?.message || "Failed to assign request."
      );
    } finally {
      setAssigningId(null);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "sourcing_id",
      width: 90,
      align: "left",
      render: (_, rec) => (
        <strong>
          #{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}
        </strong>
      ),
    },
    // {
    //   title: "Products",
    //   key: "products",
    //   width: 340,
    //   onCell: () => ({ style: { maxWidth: 340, paddingRight: 8 } }),
    //   render: (_, rec) => {
    //     const items = rec.items || [];
    //     if (!items.length) return <Text type="secondary">—</Text>;

    //     const first = items.slice(0, 3);
    //     const rest = items.slice(3);

    //     const popover = (
    //       <div style={{ maxWidth: 380 }}>
    //         <Space wrap size={[6, 6]}>
    //           {items.map((it) => (
    //             <Tag key={it._id} className="prod-chip">
    //               {it.sku ? `${it.sku} · ` : ""}
    //               {it.product_name}
    //             </Tag>
    //           ))}
    //         </Space>
    //       </div>
    //     );

    //     return (
    //       <div className="prod-cell">
    //         {first.map((it) => (
    //           <Tag key={it._id} className="prod-chip">
    //             {it.sku ? `${it.sku} · ` : ""}
    //             {it.product_name}
    //           </Tag>
    //         ))}
    //         {rest.length > 0 && (
    //           <Popover content={popover} title="Products" trigger="hover">
    //             <Tag color="processing" className="prod-chip">
    //               +{rest.length} more
    //             </Tag>
    //           </Popover>
    //         )}
    //       </div>
    //     );
    //   },
    // },
    {
      title: "Sourcer",
      dataIndex: "sourcer_name",
      width: 160,
      render: (v) => v || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
      align: "center",
      render: (s) => (
        <Tag
          color={statusColor(s)}
          style={{ fontWeight: 400, fontSize: 14, borderRadius: 6 }}
        >
          {s}
        </Tag>
      ),
    },
    // {
    //   title: "Seller / Market",
    //   key: "seller_market",
    //   width: 220,
    //   render: (_, rec) => (
    //     <span>
    //       {rec.seller_name || "—"}{" "}
    //       {rec.market ? (
    //         <Tag style={{ marginLeft: 6 }}>{rec.market}</Tag>
    //       ) : null}
    //     </span>
    //   ),
    // },

    {
      title: "Seller Name",
      dataIndex: "seller_name",
      width: 160,
      // render: (v) => v || "—",
      sorter: (a, b) =>
        (a?.seller_name || "").localeCompare(b?.seller_name || ""),
      render: (v) =>
        v ? (
          <p className="m-0 font-normal" style={{ marginLeft: 0 }}>
            {v}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Market",
      dataIndex: "market",
      width: 100,
      render: (v) => (v ? <p className="m-0 font-normal">{v}</p> : "—"),
    },
    {
      title: "Seller Price",
      dataIndex: "sellers_price",
      width: 120,
      align: "right",
      render: (v) =>
        v ? (
          <p className="m-0 font-normal">
            ${v ? parseFloat(v).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Ship Charges",
      dataIndex: "shipping_charges",
      width: 110,
      align: "right",
      render: (v) =>
        v ? (
          <p className="m-0 font-normal">
            ${v ? parseFloat(v).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Tax",
      dataIndex: "taxes",
      width: 100,
      align: "right",
      render: (v) =>
        v ? (
          <p className="m-0 font-normal">
            ${v ? parseFloat(v).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Target Cost",
      dataIndex: "target_total_cost",
      width: 130,
      align: "right",
      render: (v) =>
        v ? (
          <p className="m-0 font-normal">
            ${v ? parseFloat(v).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
      responsive: ["sm"],
    },
    {
      title: "Actual Cost",
      dataIndex: "total_actual_cost",
      width: 130,
      align: "right",
      render: (v) =>
        v ? (
          <p className="m-0 font-normal">
            ${v ? parseFloat(v).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
      responsive: ["sm"],
    },
    {
      title: "Efficiency",
      key: "efficiency",
      width: 140,
      align: "right",
      render: (_, rec) => {
        const eff =
          typeof rec.purchase_efficiency === "number"
            ? rec.purchase_efficiency
            : safeNum(rec.target_total_cost) - safeNum(rec.total_actual_cost);
        const color = eff >= 0 ? "#16a34a" : "#ef4444";
        return (
          // <span style={{ color, fontWeight: 600 }}>{fmtCurrency(eff)}</span>
          <p className="m-0 font-normal" style={{ color }}>
            ${eff ? parseFloat(eff).toFixed(2) : "0.00"}
          </p>
        );
      },
      responsive: ["md"],
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      width: 190,
      // render: (date, rec) =>
      //   new Date(date || rec.createdAt || rec.created_on || 0).toLocaleString(),
      render: (date, rec) => {
        const d = new Date(date || rec.createdAt || rec.created_on || 0);
        return (
          <span style={{ fontWeight: 400 }}>
            {d.toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
      fixed: "right",
      render: (_, record) => (
        <Button
          type="primary"
          onClick={(e) => {
            e.stopPropagation();
            handleAssign(record._id);
          }}
          loading={assigningId === record._id}
          disabled={assigningId !== null}
          style={{ border: "none", borderRadius: 8, fontWeight: 600 }}
        >
          Assign to Me
        </Button>
      ),
      align: "right",
    },
  ];

  return (
    <Card
      style={{
        borderRadius: 16,
        background: "rgba(255,255,255,0.95)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
      }}
      bodyStyle={{ padding: 16 }}
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchPending}
          aria-label="Refresh pending"
        >
          Refresh
        </Button>
      }
    >
      <Table
        className="pending-table"
        locale={{ emptyText: <Empty description="No pending requests" /> }}
        dataSource={requests}
        columns={columns}
        rowKey={(rec) => rec._id}
        loading={{
          spinning: loading,
          indicator: <LoadingOutlined style={{ fontSize: 24 }} spin />,
        }}
        pagination={{ pageSize: 10, responsive: true }}
        onRow={(record) => ({
          onClick: () => {
            const url = toListingUrl(record.listing_link);
            if (url !== "#") window.open(url, "_blank", "noopener,noreferrer");
          },
          style: { cursor: record.listing_link ? "pointer" : "default" },
        })}
        tableLayout="fixed" // ⬅️ prevent column spillover
        scroll={{ x: 1600 }} // ⬅️ horizontal scroll instead of squeeze
        sticky
        expandable={{
          expandedRowRender: (record) => (
            <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
          ),
          rowExpandable: (record) =>
            Array.isArray(record.items) && record.items.length > 0,
        }}
      />

      {/* tiny CSS helpers */}
      <style>{`
        .pending-table .ant-table-thead > tr > th {
          white-space: nowrap;
        }
        .prod-cell {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          overflow: hidden;       /* clip to cell width */
        }
        .prod-chip.ant-tag {
          margin: 0;
          border-radius: 6px;
          max-width: 100%;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
      `}</style>
    </Card>
  );
}

// mini items table shown when a row expands
const ExpandedItemsTable = ({ order, onOpen }) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!items.length) return <Empty description="No products on this request" />;

  const columns = [
    {
      title: "Product",
      dataIndex: "product_name",
      render: (_t, rec) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          onClick={(e) => {
            e.stopPropagation(); // don't bubble to parent row
            const id = order._id || order.id;
            if (id) onOpen(`/requests/${id}?item=${rec._id}`);
          }}
        >
          {rec.product_name || "Untitled"}
        </Button>
      ),
    },
    {
      title: "SKU",
      dataIndex: "sku",
      width: 210,
      render: (v) => <Text type="secondary">{v || "—"}</Text>,
    },
    {
      title: "Qty",
      dataIndex: "quantity_needed",
      width: 80,
      render: (v) => (typeof v === "number" ? v : Number(v) || 1),
    },
    {
      title: "Seller $",
      dataIndex: "sourced_price",
      width: 120,
      render: (v) =>
        typeof v === "number"
          ? v.toLocaleString(undefined, { style: "currency", currency: "USD" })
          : "—",
    },
    {
      title: "Condition",
      dataIndex: "product_condition",
      width: 160,
      render: (v) => v || "—",
    },
  ];

  return (
    <Table
      rowKey={(r) => r._id || r.id}
      size="small"
      pagination={false}
      dataSource={items}
      columns={columns}
    />
  );
};

/* ---------- MAIN PURCHASER PAGE ---------- */
export default function PurchaserPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  const screens = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab persistence with localStorage and URL state
  const getInitialActiveTab = () => {
    // First check URL params
    const urlParams = new URLSearchParams(location.search);
    const urlTab = urlParams.get('tab');
    if (urlTab && ['dashboard', 'all', 'returned', 'pending'].includes(urlTab)) {
      return urlTab;
    }
    // Then check localStorage
    const savedTab = localStorage.getItem('purchaserActiveTab');
    if (savedTab && ['dashboard', 'all', 'returned', 'pending'].includes(savedTab)) {
      return savedTab;
    }
    // Default to dashboard
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialActiveTab);

  // Handle tab change with persistence
  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    // Save to localStorage
    localStorage.setItem('purchaserActiveTab', key);
    // Update URL without page reload
    const url = new URL(window.location);
    url.searchParams.set('tab', key);
    window.history.replaceState({}, '', url);
  }, []);

  // Product async search
  const {
    products,
    loading: productLoading,
    mode,
    debouncedSearch,
    fetchInitialProducts,
  } = useProductSearch();
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: (
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <code style={{ fontSize: 12, color: "#555" }}>
              {p.sku || "NO-SKU"}
            </code>
            <span style={{ color: "#999" }}>—</span>
            <span style={{ fontSize: 13 }}>{p.product_name || "Untitled"}</span>
          </div>
        ),
        raw: p,
      })),
    [products]
  );

  const pageSize = screens.xxl
    ? 14
    : screens.xl
    ? 12
    : screens.lg
    ? 10
    : screens.md
    ? 8
    : 6;

  /* ----------- fetch (server params + client-side fallback) ----------- */
  const serverParams = useMemo(() => {
    const params = {};
    if (activeTab !== "pending" && statusFilter) params.status = statusFilter;
    if (activeTab === "returned") params.status = "Returned";
    if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
      params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
      params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
    }
    if (selectedProductIds?.length)
      params.product_ids = selectedProductIds.join(",");
    if (searchTerm?.trim()) params.q = searchTerm.trim(); // if backend supports q
    return params;
  }, [statusFilter, activeTab, dateRange, selectedProductIds, searchTerm]);

  const fetchAssigned = useCallback(async () => {
    if (activeTab === "pending") return; // Pending is a different source
    setLoading(true);
    try {
      const res = await apiClient.get("/api/v1/sourcing/assigned", {
        params: serverParams,
      });
      setRequests(normalizeRequests(res.data));
    } catch (err) {
      console.error(
        "Failed to fetch assigned:",
        err?.response?.data || err?.message
      );
      message.error("Failed to fetch assigned requests.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, serverParams]);

  const handleRefreshClick = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchAssigned();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAssigned]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  /* ----------- CLIENT-SIDE FILTERS (robust even if API ignores params) ----------- */
  const filteredRequests = useMemo(() => {
    const term = (searchTerm || "").toLowerCase().trim();
    const hasDate = dateRange?.length === 2 && dateRange[0] && dateRange[1];
    const start = hasDate ? dayjs(dateRange[0]).startOf("day") : null;
    const end = hasDate ? dayjs(dateRange[1]).endOf("day") : null;

    return requests.filter((req) => {
      const items = Array.isArray(req.items) ? req.items : [];

      // search across product name, sku, seller/sourcer names, market, listing/sourcing id
      const haystacks = [
        req.seller_name || "",
        req.sourcer_name || "",
        req.market || "",
        req.listing_id || "",
        req.sourcing_id || req.id || req._id || "",
        ...items.map((it) => it.product_name || ""),
        ...items.map((it) => it.sku || ""),
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || haystacks.includes(term);

      const matchesProduct =
        !selectedProductIds.length ||
        items.some((it) => {
          const pid = String(it.id || it._id || it.product_id || "");
          return selectedProductIds.includes(pid);
        });

      const created = getCreated(req);
      const matchesDate =
        !hasDate ||
        (!created
          ? false
          : dayjs(created).isAfter(start) && dayjs(created).isBefore(end));

      // tab & status
      const inReturnedTab =
        activeTab === "returned" ? req.status === "Returned" : true;
      const matchesStatus = !statusFilter || req.status === statusFilter;

      return (
        matchesSearch &&
        matchesProduct &&
        matchesDate &&
        inReturnedTab &&
        matchesStatus
      );
    });
  }, [
    requests,
    searchTerm,
    activeTab,
    selectedProductIds,
    dateRange,
    statusFilter,
  ]);

  /* ---------- Status → color map ---------- */
  const statusTagColor = (s) => {
    switch (s) {
      case "Assigned":
        return "gold";
      case "Offer":
        return "blue";
      case "Purchased":
        return "green";
      case "Disapproved":
        return "red";
      case "Sold":
        return "purple";
      case "Hold":
        return "orange";
      case "Seller Rejected":
        return "magenta";
      case "Dropshipped":
        return "cyan";
      case "Returned":
        return "volcano";
      default:
        return "geekblue";
    }
  };

  /* ---------- Columns ---------- */
  const columns = [
    {
      title: "ID",
      dataIndex: "sourcing_id",
      width: 120,
      sorter: (a, b) =>
        String(a?.sourcing_id ?? a?.id ?? a?._id ?? "").localeCompare(
          String(b?.sourcing_id ?? b?.id ?? b?._id ?? "")
        ),
      render: (_, rec) => (
        <strong style={{ color: "#2c2c2c" }}>
          #{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}
        </strong>
      ),
      responsive: ["sm"],
    },

    // {
    //   title: "Products",
    //   key: "products",
    //   width: 280,
    //   render: (_, rec) => {
    //     const items = rec.items || [];
    //     if (!items.length) return <Text type="secondary">—</Text>;
    //     return (
    //       <Space wrap size={[6, 6]}>
    //         {items.map((it) => (
    //           <Tag key={it._id} color="default" style={{ borderRadius: 6 }}>
    //             {it.sku ? `${it.sku} · ` : ""}{it.product_name}
    //           </Tag>
    //         ))}
    //       </Space>
    //     );
    //   },
    // },
    {
      title: "Sourcer",
      dataIndex: "sourcer_name",
      width: 160,
      sorter: (a, b) =>
        (a?.sourcer_name || "").localeCompare(b?.sourcer_name || ""),
      render: (v) =>
        v ? (
          <p className="m-0 font-medium" style={{ marginLeft: 0 }}>
            {v}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
      align: "center",
      sorter: (a, b) => (a?.status || "").localeCompare(b?.status || ""),
      render: (s) => (
        <Tag
          color={statusTagColor(s)}
          style={{ fontWeight: 400, fontSize: 13, borderRadius: 6 }}
        >
          {s}
        </Tag>
      ),
    },
    // {
    //   title: "Seller / Market",
    //   key: "seller_market",
    //   width: 220,
    //   render: (_, rec) => (
    //     <span>
    //       {rec.seller_name || "—"}{" "}
    //       {rec.market ? (
    //         <Tag style={{ marginLeft: 6 }}>{rec.market}</Tag>
    //       ) : null}
    //     </span>
    //   ),
    // },

    {
      title: "Seller",
      dataIndex: "seller_name",
      width: 180,
      ellipsis: true,
      onCell: () => ({
        style: {
          maxWidth: 180,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }),
      // render: (v) => v || "—",
      render: (v) =>
        v ? (
          <p className="m-0 font-normal" style={{ marginLeft: 0 }}>
            {v}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Market",
      dataIndex: "market",
      width: 100,
      ellipsis: true,
      onCell: () => ({
        style: {
          maxWidth: 100,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }),
      render: (v) =>
        v ? (
          <p className="m-0 font-normal" style={{ marginLeft: 0 }}>
            {v}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Seller Price",
      dataIndex: "sellers_price",
      width: 200,
      align: "right",
      onCell: () => ({
        style: {
          maxWidth: 200,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }),
      render: (price) =>
        price ? (
          <p className="m-0 text-sm font-normal">
            ${price ? parseFloat(price).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Shipping charges",
      dataIndex: "shipping_charges",
      width: 200,
      align: "right",
      render: (price) =>
        price ? (
          <p className="m-0 text-sm font-normal">
            ${price ? parseFloat(price).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Tax",
      dataIndex: "taxes",
      width: 100,
      align: "right",
      render: (price) =>
        price ? (
          <p className="m-0 text-sm font-normal">
            ${price ? parseFloat(price).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
    },
    {
      title: "Target Cost",
      dataIndex: "target_total_cost",
      width: 130,
      align: "right",
      render: (price) =>
        price ? (
          <p className="m-0 text-sm font-normal">
            ${price ? parseFloat(price).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
      responsive: ["md"],
    },
    {
      title: "Actual Cost",
      dataIndex: "total_actual_cost",
      width: 130,
      align: "right",
      // render: (v) => fmtCurrency(safeNum(v)),
      render: (price) =>
        price ? (
          <p className="m-0 text-sm font-normal">
            ${price ? parseFloat(price).toFixed(2) : "0.00"}
          </p>
        ) : (
          "—"
        ),
      responsive: ["md"],
    },
    {
      title: "Efficiency",
      key: "efficiency",
      width: 140,
      align: "right",
      render: (_, rec) => {
        const eff =
          typeof rec.purchase_efficiency === "number"
            ? rec.purchase_efficiency
            : safeNum(rec.target_total_cost) - safeNum(rec.total_actual_cost);
        const color = eff >= 0 ? "#16a34a" : "#ef4444";
        return (
          <p className="m-0 text-sm font-normal" style={{ color }}>
            ${eff ? parseFloat(eff).toFixed(2) : "0.00"}
          </p>
        );
      },
      responsive: ["lg"],
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      width: 190,
      render: (date, rec) => {
        const d = new Date(date || rec.createdAt || rec.created_on || 0);
        return (
          <span style={{ fontWeight: 400 }}>
            {d.toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        );
      },
    },
  ];

  /* ---------- Products select ---------- */
  const ProductsSelect = (
    <Select
      mode="multiple"
      showSearch
      allowClear
      maxTagCount="responsive"
      placeholder="Products"
      style={{ width: "100%" }}
      size={screens.xs ? "middle" : "large"}
      onSearch={debouncedSearch}
      onDropdownVisibleChange={(open) => open && fetchInitialProducts()}
      options={productOptions}
      filterOption={false}
      loading={productLoading}
      value={selectedProductIds}
      onChange={(vals) => setSelectedProductIds(vals)}
    />
  );

  const clearAll = () => {
    setStatusFilter("");
    setSearchTerm("");
    setDateRange([]);
    setSelectedProductIds([]);
    // keep current tab
    fetchAssigned();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header / KPIs + Filters */}
      <Card
        style={{
          borderRadius: 18,
          marginBottom: 16,
          background:
            "radial-gradient( circle at 10% 10%, rgba(92,51,200,0.08), transparent 60%), radial-gradient( circle at 90% 10%, rgba(0,242,254,0.08), transparent 50%)",
        }}
        bodyStyle={{ padding: screens.xs ? 12 : 20 }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Title
                level={3}
                style={{ margin: 0, color: "#1f2937", fontWeight: 500 }}
              >
                Total Orders: {filteredRequests.length}
              </Title>
              <Text type="secondary">Click a row to open request</Text>
            </Space>
          </Col>

          <Col xs={24} md={16}>
            <Row gutter={[8, 8]} justify="end">
              <button
                onClick={handleRefreshClick}
                disabled={isRefreshing}
                className="sm:w-auto w-full flex  min-w-fit text-[14px] sm:text-[15px] items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                <svg
                  className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </Row>
          </Col>
        </Row>

        {/* Selected products quick chips */}
        {selectedProductIds?.length ? (
          <Row style={{ marginTop: 8 }}>
            <Col span={24}>
              <Space size={[6, 6]} wrap>
                <Text type="secondary">Filtering by products:</Text>
                {selectedProductIds.map((pid) => (
                  <Tag
                    key={pid}
                    closable
                    onClose={() =>
                      setSelectedProductIds((prev) =>
                        prev.filter((id) => id !== pid)
                      )
                    }
                    style={{ borderRadius: 6 }}
                  >
                    {(() => {
                      const opt = productOptions.find((o) => o.value === pid);
                      const sku = opt?.raw?.sku || "NO-SKU";
                      const name = opt?.raw?.product_name || "Untitled";
                      return `${sku} · ${name}`;
                    })()}
                  </Tag>
                ))}
                <Button
                  size="small"
                  type="text"
                  onClick={() => setSelectedProductIds([])}
                >
                  Clear all
                </Button>
              </Space>
            </Col>
          </Row>
        ) : null}
      </Card>
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <Title level={4} style={{ margin: 0 }} className="text-gray-700">
            Filters
          </Title>
          <button
            onClick={clearAll}
            className="sm:w-auto w-full flex min-w-fit text-sm sm:text-base items-center justify-center gap-2 px-4 py-1 bg-red-500 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
          >
            Clear
          </button>
        </div>
        <Row gutter={[8, 8]}>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Status"
              style={{ width: "100%" }}
              onChange={(value) => setStatusFilter(value || "")}
              allowClear
              value={statusFilter || undefined}
              size={screens.xs ? "middle" : "large"}
            >
              {[
                "Assigned",
                "Offer",
                "Purchased",
                "Disapproved",
                "Sold",
                "Hold",
                "Seller Rejected",
                "Dropshipped",
                "Returned",
              ].map((status) => (
                <Option key={status} value={status}>
                  {status}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={7}>
            <Search
              placeholder="Search product/SKU/seller/sourcer/id"
              allowClear
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={(v) => setSearchTerm(v)}
              style={{ width: "100%" }}
              size={screens.xs ? "middle" : "large"}
              enterButton={<FilterOutlined />}
            />
          </Col>

          <Col xs={24} sm={24} md={10} lg={8}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              onChange={(dates) => setDateRange(dates ?? [])}
              value={dateRange}
              size={screens.xs ? "middle" : "large"}
            />
          </Col>
        </Row>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        style={{ marginBottom: 16, fontWeight: 500 }}
        tabBarStyle={{ fontSize: 16 }}
      >
        <TabPane tab="Dashboard" key="dashboard">
          <PurchaserDashboard
            data={filteredRequests} // ← use filtered
            loading={loading}
            onRefresh={fetchAssigned} // ← reuse your fetch
          />
        </TabPane>

        <TabPane tab="All Assigned" key="all">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Table
              locale={{
                emptyText: (
                  <Empty description="No assigned requests match your filters" />
                ),
              }}
              dataSource={filteredRequests}
              columns={columns}
              rowKey={(rec) => rec._id}
              loading={loading}
              size={screens.md ? "middle" : "small"}
              pagination={{
                pageSize,
                showSizeChanger: false,
                responsive: true,
              }}
              onRow={(record) => ({
                onClick: () => {
                  const id = record._id || record.id;
                  if (id) navigate(`/requests/${id}`);
                },
                style: { cursor: "pointer" },
              })}
              rowClassName={() => "row-clickable"}
              scroll={{ x: "max-content" }}
              tableLayout="fixed"
              sticky
              expandable={{
                expandedRowRender: (record) => (
                  <ExpandedItemsTable
                    order={record}
                    onOpen={(to) => navigate(to)}
                  />
                ),
                rowExpandable: (record) =>
                  Array.isArray(record.items) && record.items.length > 0,
              }}
            />
          </motion.div>
        </TabPane>

        <TabPane tab="Returned" key="returned">
          <Table
            locale={{
              emptyText: (
                <Empty description="No returned requests match your filters" />
              ),
            }}
            dataSource={filteredRequests}
            columns={columns}
            rowKey={(rec) => rec._id}
            loading={loading}
            size={screens.md ? "middle" : "small"}
            pagination={{ pageSize, showSizeChanger: false, responsive: true }}
            onRow={(record) => ({
              onClick: () => {
                const id = record._id || record.id;
                if (id) navigate(`/requests/${id}`);
              },
              style: { cursor: "pointer" },
            })}
            rowClassName={() => "row-clickable"}
            scroll={{ x: "max-content" }}
            tableLayout="fixed"
            sticky
          />
        </TabPane>

        <TabPane tab="Pending" key="pending">
          <PendingTab onAssigned={() => fetchAssigned()} />
        </TabPane>
      </Tabs>

      <style>{`
        .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
        
        /* Custom tab styling */
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab {
          background: #f5f5f5 !important;
          border: 1px solid #d9d9d9 !important;
          color: #666 !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
        }
        
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:hover {
          background: #e6f7ff !important;
          border-color: #91d5ff !important;
          color: #1890ff !important;
        }
        
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active {
          background: #1890ff !important;
          border-color: #1890ff !important;
          color: #fff !important;
          font-weight: 600 !important;
        }
        
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active:hover {
          background: #40a9ff !important;
          border-color: #40a9ff !important;
          color: #fff !important;
        }
        
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #fff !important;
        }
        
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab .ant-tabs-tab-btn {
          color: inherit !important;
        }
        
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:hover .ant-tabs-tab-btn {
          color: inherit !important;
        }
      `}</style>
    </motion.div>
  );
}
