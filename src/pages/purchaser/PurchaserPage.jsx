

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
} from "antd";
import {
  ReloadOutlined,
  LoadingOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import apiClient from "../../api/client";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import useProductSearch from "../sourcer/hooks/useProductSearch"; // async product search (same as Sourcer)

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { useBreakpoint } = Grid;

/* ---------- helpers ---------- */
const toListingUrl = (url) => (!url ? "#" : /^https?:\/\//i.test(url) ? url : `https://${url}`);
const fmtCurrency = (n) =>
  typeof n === "number" ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "—";
const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);

/* normalize results */
const normalizeRequests = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.data || payload?.results || [];
  return (Array.isArray(list) ? list : []).map((doc) => {
    const id = doc._id ?? doc.id ?? String(doc._id || "");
    const created_at = doc.created_at ?? doc.createdAt ?? doc.created_on ?? null;
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

    const market = doc.seller?.market ?? doc.market ?? "";

    return {
      ...doc,
      _id: id,
      id,
      sourcing_id: doc.sourcing_id ?? doc.sourcingId ?? doc.sourcingID ?? null,
      created_at,
      items: items.map((it) => ({
        ...it,
        _id: it._id ?? it.id ?? String(it._id || ""),
        id: it.id ?? it._id, // ensure id exists for filter mapping
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

/* ---------- Pending tab ---------- */
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
      setRequests((prev) => prev.filter((r) => String(r._id) !== String(sourcingId)));
      message.success(
        `Assigned #${updated.id} — status: ${updated.status}${
          updated.purchaser_id ? `, purchaser: ${updated.purchaser_id}` : ""
        }`
      );
      onAssigned?.(updated);
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || "Failed to assign request.");
    } finally {
      setAssigningId(null);
    }
  };

  const columns = [
{
  title: "ID",
  dataIndex: "sourcing_id",
  width: 120,
  render: (_, rec) => (
    <strong style={{ color: "#2c2c2c" }}>
      #{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}
    </strong>
  ),
  responsive: ["sm"],
},
    {
      title: "Product(s)",
      render: (_, record) => (
        <div>
          {(record.items || []).map((item) => (
            <div key={item._id} style={{ fontWeight: 500, color: "#3a3a3a" }}>
              {item.product_name}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (s) => <Tag color={s === "Pending" ? "gold" : s === "Assigned" ? "blue" : "green"}>{s}</Tag>,
      responsive: ["md"],
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 200,
      render: (date) => <span style={{ color: "#777" }}>{date ? new Date(date).toLocaleString() : "—"}</span>,
      responsive: ["lg"],
    },
    {
      title: "Actions",
      key: "actions",
      width: 170,
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
      style={{ borderRadius: 16, background: "rgba(255,255,255,0.95)", boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}
      bodyStyle={{ padding: 16 }}
      extra={
        <Button icon={<ReloadOutlined />} onClick={fetchPending} aria-label="Refresh pending">
          Refresh
        </Button>
      }
    >
      <Table
        locale={{ emptyText: <Empty description="No pending requests" /> }}
        dataSource={requests}
        columns={columns}
        rowKey={(rec) => rec._id}
        loading={{ spinning: loading, indicator: <LoadingOutlined style={{ fontSize: 24 }} spin /> }}
        pagination={{ pageSize: 10, responsive: true }}
        onRow={(record) => ({
          onClick: () => {
            const url = toListingUrl(record.listing_link);
            if (url !== "#") window.open(url, "_blank", "noopener,noreferrer");
          },
          style: { cursor: record.listing_link ? "pointer" : "default" },
        })}
        rowClassName={() => "row-clickable"}
        scroll={{ x: true }}
        sticky
      />
    </Card>
  );
}

/* ---------- Main Purchaser page ---------- */
export default function PurchaserPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const screens = useBreakpoint();
  const navigate = useNavigate();

  // Async product search (same as Sourcer)
  const { products, loading: productLoading, mode, debouncedSearch, fetchInitialProducts } = useProductSearch();
  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: (
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <code style={{ fontSize: 12, color: "#555" }}>{p.sku || "NO-SKU"}</code>
            <span style={{ color: "#999" }}>—</span>
            <span style={{ fontSize: 13 }}>{p.product_name || "Untitled"}</span>
          </div>
        ),
        raw: p,
      })),
    [products]
  );

  const pageSize = screens.xxl ? 14 : screens.xl ? 12 : screens.lg ? 10 : screens.md ? 8 : 6;

  const fetchAssigned = useCallback(() => {
    if (activeTab === "pending") return;
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (activeTab === "returned") params.status = "Returned";
    if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
      params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
      params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
    }
    // optional: pass product_ids to API if supported (still filter client-side below)
    if (selectedProductIds?.length) params.product_ids = selectedProductIds.join(",");

    apiClient
      .get("/api/v1/sourcing/assigned", { params })
      .then((res) => setRequests(normalizeRequests(res.data)))
      .catch((err) => {
        console.error("Failed to fetch assigned:", err?.response?.data || err?.message);
        message.error("Failed to fetch assigned requests.");
      })
      .finally(() => setLoading(false));
  }, [statusFilter, activeTab, dateRange, selectedProductIds]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  /* ---------- Filtering ---------- */
  const filteredRequests = useMemo(() => {
    const term = (searchTerm || "").toLowerCase();
    return requests.filter((req) => {
      const items = Array.isArray(req.items) ? req.items : [];
      const matchesSearch =
        !term ||
        items.some(
          (it) => (it.product_name || "").toLowerCase().includes(term) || (it.sku || "").toLowerCase().includes(term)
        );

      const matchesProduct =
        !selectedProductIds.length ||
        items.some((it) => selectedProductIds.includes(String(it.id || it._id || it.product_id || "")));

      if (activeTab === "returned") {
        return matchesSearch && matchesProduct && req.status === "Returned";
      }
      return matchesSearch && matchesProduct;
    });
  }, [requests, searchTerm, activeTab, selectedProductIds]);

  /* ---------- Status → color map ---------- */
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

  /* ---------- Columns (adds Products column) ---------- */
  const columns = [
    {
      title: "ID",
      dataIndex: "sourcing_id",
      width: 120,
      render: (_, rec) => (
        <strong style={{ color: "#2c2c2c" }}>
          #{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}
        </strong>
      ),
      responsive: ["sm"],
    },
    {
      title: "Products",
      key: "products",
      width: 280,
      render: (_, rec) => {
        const items = rec.items || [];
        if (!items.length) return <Text type="secondary">—</Text>;
        return (
          <Space wrap size={[6, 6]}>
            {items.map((it) => (
              <Tag key={it._id} color="default" style={{ borderRadius: 6 }}>
                {it.sku ? `${it.sku} · ` : ""}
                {it.product_name}
              </Tag>
            ))}
          </Space>
        );
      },
    },
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
        <Tag color={statusColor(s)} style={{ fontWeight: 500, fontSize: 13, borderRadius: 6 }}>
          {s}
        </Tag>
      ),
    },
    {
      title: "Seller / Market",
      key: "seller_market",
      width: 220,
      render: (_, rec) => (
        <span>
          {rec.seller_name || "—"} {rec.market ? <Tag style={{ marginLeft: 6 }}>{rec.market}</Tag> : null}
        </span>
      ),
    },
    {
      title: "Seller $",
      dataIndex: "sellers_price",
      width: 120,
      align: "right",
      render: (v) => fmtCurrency(safeNum(v)),
    },
    {
      title: "Ship $",
      dataIndex: "shipping_charges",
      width: 110,
      align: "right",
      render: (v) => fmtCurrency(safeNum(v)),
    },
    {
      title: "Tax $",
      dataIndex: "taxes",
      width: 100,
      align: "right",
      render: (v) => fmtCurrency(safeNum(v)),
    },
    {
      title: "Target $",
      dataIndex: "target_total_cost",
      width: 130,
      align: "right",
      render: (v) => fmtCurrency(safeNum(v)),
      responsive: ["md"],
    },
    {
      title: "Actual $",
      dataIndex: "total_actual_cost",
      width: 130,
      align: "right",
      render: (v) => fmtCurrency(safeNum(v)),
      responsive: ["md"],
    },
    {
      title: "Efficiency $",
      key: "efficiency",
      width: 140,
      align: "right",
      render: (_, rec) => {
        const eff =
          typeof rec.purchase_efficiency === "number"
            ? rec.purchase_efficiency
            : safeNum(rec.target_total_cost) - safeNum(rec.total_actual_cost);
        const color = eff >= 0 ? "#16a34a" : "#ef4444";
        return <span style={{ color, fontWeight: 600 }}>{fmtCurrency(eff)}</span>;
      },
      responsive: ["lg"],
    },
    {
      title: "Created",
      dataIndex: "created_at",
      width: 190,
      render: (date, rec) => new Date(date || rec.createdAt || rec.created_on || 0).toLocaleString(),
    },
  ];

  /* ---------- Toolbar with dedicated Products dropdown ---------- */
  const ProductsSelect = (
    <Select
      mode="multiple"
      showSearch
      allowClear
      maxTagCount="responsive"
      placeholder={`Products (${mode.toUpperCase()})`}
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

  return (
    <motion.div
      className="page-container"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ padding: screens.xs ? "1rem" : "2rem", background: "#f5f7fb", minHeight: "100vh" }}
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
              <Title level={4} style={{ margin: 0, color: "#1f2937", fontWeight: 800 }}>
                Total Orders: {filteredRequests.length}
              </Title>
              <Text type="secondary">Click a row to open request</Text>
            </Space>
          </Col>

          <Col xs={24} md={16}>
            <Row gutter={[8, 8]} justify="end">
              <Col xs={24} sm={12} md={6} lg={5}>
                <Select
                  placeholder="Status"
                  style={{ width: "100%" }}
                  onChange={(value) => setStatusFilter(value)}
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
                  placeholder="Search SKU or Product"
                  allowClear
                  onChange={(e) => setSearchTerm(e.target.value)}
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

              {/* Products dropdown field */}
              <Col xs={24} sm={24} md={12} lg={8}>
                {ProductsSelect}
              </Col>

              <Col>
                <Button
                  icon={<ReloadOutlined />}
                  size={screens.xs ? "middle" : "large"}
                  onClick={fetchAssigned}
                >
                  Refresh
                </Button>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Quick chips under the toolbar (selected products summary) */}
        {selectedProductIds?.length ? (
          <Row style={{ marginTop: 8 }}>
            <Col span={24}>
              <Space size={[6, 6]} wrap>
                <Text type="secondary">Filtering by products:</Text>
                {selectedProductIds.map((pid) => (
                  <Tag
                    key={pid}
                    closable
                    onClose={() => setSelectedProductIds((prev) => prev.filter((id) => id !== pid))}
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
                <Button size="small" type="text" onClick={() => setSelectedProductIds([])}>
                  Clear all
                </Button>
              </Space>
            </Col>
          </Row>
        ) : null}
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginBottom: 16, fontWeight: 500 }}
        tabBarStyle={{ fontSize: 16 }}
      >
        <TabPane tab="All Assigned" key="all">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              background: "#ffffff",
              padding: screens.xs ? "12px" : "20px",
              borderRadius: "16px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
            }}
          >
            <Table
              locale={{ emptyText: <Empty description="No assigned requests match your filters" /> }}
              dataSource={filteredRequests}
              columns={columns}
              rowKey={(rec) => rec._id}
              loading={loading}
              bordered
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
              scroll={{ x: true }}
              sticky
            />
          </motion.div>
        </TabPane>

        <TabPane tab="Returned" key="returned">
          <Table
            locale={{ emptyText: <Empty description="No returned requests match your filters" /> }}
            dataSource={filteredRequests}
            columns={columns}
            rowKey={(rec) => rec._id}
            loading={loading}
            bordered
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
            scroll={{ x: true }}
            sticky
          />
        </TabPane>

        <TabPane tab="Pending" key="pending">
          <PendingTab onAssigned={() => fetchAssigned()} />
        </TabPane>
      </Tabs>

      <style>{`
        .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
      `}</style>
    </motion.div>
  );
}
