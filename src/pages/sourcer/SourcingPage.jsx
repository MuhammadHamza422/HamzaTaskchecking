
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Typography,
  Button,
  message,
  Spin,
  Drawer,
  Form,
  Input,
  InputNumber,
  Select,
  Checkbox,
  DatePicker,
  Tooltip,
  Empty,
  Row,
  Col,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { debounce } from "lodash";
import dayjs from "dayjs";
import apiClient from "../../api/client";
import useFullscreen from "../../components/useFullscreen";
import SourcingImportModal from "./SourcingImportModal";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { statusPill } from "./utils/helpers";

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

/* ---------- UI helpers ---------- */
const gradientCardStyle = {
  borderRadius: 16,
  background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e6edff",
};
const chipStyle = {
  borderRadius: 10,
  padding: "2px 8px",
  background: "#f6f7ff",
  border: "1px solid #eef2ff",
};
const tableCardStyle = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #eef2ff",
  overflow: "hidden",
};

const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
const fmtMoney = (v) =>
  typeof v === "number" && !Number.isNaN(v) ? `$${v.toFixed(2)}` : "$0.00";
const formatOid = (id) =>
  id ? String(id).slice(0, 6) + "…" + String(id).slice(-4) : "—";

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

/* ---------- totals/efficiency ---------- */
const sellerTotal = (rec) =>
  num(rec.sellers_price) +
  num(rec.shipping_charges ?? rec.shipping_price) +
  num(rec.taxes ?? rec.tax);

const deriveEfficiency = (rec) => {
  if (
    typeof rec.purchase_efficiency === "number" &&
    !Number.isNaN(rec.purchase_efficiency)
  ) {
    return rec.purchase_efficiency;
  }
  return num(rec.target_total_cost) - sellerTotal(rec);
};

/* ---------- market pretty printer (handles slug/object/raw) ---------- */
const PRETTY_MARKET_MAP = {
  ebay: "eBay",
  mercari: "Mercari",
  facebook: "Facebook",
};
const prettifySlug = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const prettyMarketName = (marketMaybe) => {
  if (!marketMaybe) return "—";
  if (typeof marketMaybe === "object") {
    if (marketMaybe.name) return marketMaybe.name;
    if (marketMaybe.slug) {
      const slug = String(marketMaybe.slug).toLowerCase();
      return PRETTY_MARKET_MAP[slug] || prettifySlug(slug);
    }
    if (marketMaybe._id) return `Market ${formatOid(marketMaybe._id)}`;
  }
  const s = String(marketMaybe).trim();
  const low = s.toLowerCase();
  return PRETTY_MARKET_MAP[low] || prettifySlug(s);
};

/* ---------- seller name extractor ---------- */
const getSellerName = (rec) => {
  if (rec?.seller && typeof rec.seller === "object") {
    return rec.seller.name || `Seller ${formatOid(rec.seller._id)}`;
  }
  return (
    rec?.seller_name || (rec?.seller ? `Seller ${formatOid(rec.seller)}` : "—")
  );
};

// --- Market name resolver (cached) ---
const _marketCache = new Map(); // key -> { name, slug, _id }

function isObjectIdLike(v) {
  return typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);
}

function MarketName({ market }) {
  const [name, setName] = React.useState("—");

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!market) return setName("—");

      // populated object
      if (typeof market === "object") {
        if (market.name) return setName(market.name);
        if (market.slug && _marketCache.has(market.slug)) {
          return setName(_marketCache.get(market.slug).name);
        }
        if (market._id && _marketCache.has(market._id)) {
          return setName(_marketCache.get(market._id).name);
        }
      }

      // string: ObjectId or slug
      const key =
        typeof market === "string" ? market : market._id || market.slug || "";

      if (!key) return setName("—");

      if (_marketCache.has(key)) {
        return setName(_marketCache.get(key).name);
      }

      try {
        let rec = null;

        if (isObjectIdLike(key)) {
          const { data } = await apiClient.get(`/api/v1/markets/${key}`);
          rec = data;
        } else {
          const { data } = await apiClient.get(`/api/v1/markets`, {
            params: { q: key },
          });
          const list = Array.isArray(data) ? data : [];
          rec =
            list.find(
              (m) => (m.slug || "").toLowerCase() === key.toLowerCase()
            ) ||
            list[0] ||
            null;
        }

        if (!cancelled) {
          if (rec?.name) {
            _marketCache.set(key, rec);
            if (rec.slug) _marketCache.set(rec.slug, rec);
            if (rec._id) _marketCache.set(rec._id, rec);
            setName(rec.name);
          } else {
            setName("—");
          }
        }
      } catch {
        if (!cancelled) setName("—");
      }
    };

    resolve();
    return () => (cancelled = true);
  }, [market]);

  return <span>{name}</span>;
}

export default function SourcingOrdersPage() {
  const { user } = useAuth(); // <-- ADMIN LOGIC
  const role = user?.roles?.role || user?.role || "";
  const isAdmin = role === "admin";
  const isSourcer = role === "sourcer";
  const isPurchaser = role === "purchaser";
  const canEdit = isAdmin || isSourcer;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [importOpen, setImportOpen] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [isNewItem, setIsNewItem] = useState(false);

  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    product: "",
    sku: "",
    status: "",
    dateRange: null,
    sourcingId: "",
  });

  /* ---------- Product search in Drawer ---------- */
  const [searchOptions, setSearchOptions] = useState([]);
  const mapProductToOption = (p) => {
    const id = p._id || p.id;
    const sku = p.sku || "NO-SKU";
    const name =
      p.pro_title || p.product_name || p.title || p.name || "Untitled";
    const price = p.sale_price ?? p.price ?? null;

    return {
      value: String(id),
      label: `${sku} — ${name}${
        price != null ? ` ($${Number(price).toFixed(2)})` : ""
      }`,
      product: { id, sku, name, price, raw: p },
    };
  };

  const debouncedSearch = useMemo(
    () =>
      debounce(async (q) => {
        const query = (q || "").trim();
        if (query.length < 2) return;
        try {
          const { data } = await apiClient.get(
            "/api/v1/sourcing/products/search",
            {
              params: { search: query, limit: 20, page: 1 },
            }
          );
          const list = Array.isArray(data?.products)
            ? data.products
            : normalizeArray(data);
          setSearchOptions(list.map(mapProductToOption));
        } catch (err) {
          console.error(err);
        }
      }, 300),
    []
  );

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
      const { data } = await apiClient.get(endpoint);
      setOrders(normalizeArray(data));
    } catch (err) {
      console.error(err);
      message.error("Failed to load sourcing orders.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

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

  /* ---------- Drawer (load/edit) ---------- */
  const loadItemForEdit = async (orderId, itemId) => {
    if (!canEdit) return;
    setDrawerLoading(true);
    try {
      const { data: order } = await apiClient.get(
        `/api/v1/sourcing/${orderId}`
      );
      const items = order.items || [];
      const fullItem = items.find((i) => String(i._id) === String(itemId));
      if (!fullItem) throw new Error("Product not found.");

      setEditingItem(fullItem);
      setIsNewItem(false);
      setEditingOrderId(orderId);
      setDrawerOpen(true);

      form.setFieldsValue({
        name: fullItem.name || fullItem.product_name || "",
        sku: fullItem.sku || "",
        quantity_needed: num(fullItem.quantity_needed || 1),
        sourced_price: num(fullItem.sourced_price),
        category: fullItem.category,
        tested: Boolean(fullItem.tested),
        product_condition: fullItem.product_condition || undefined,
      });
    } catch (err) {
      console.error(err);
      message.error(err.message || "Could not load item.");
    } finally {
      setDrawerLoading(false);
    }
  };

  const openNewItem = (orderId) => {
    if (!canEdit) return;
    setIsNewItem(true);
    setEditingOrderId(orderId);
    setEditingItem(null);
    form.resetFields();
    setDrawerOpen(true);
  };

  const handleProductSelect = (_val, option) => {
    const p = option?.product || {};
    form.setFieldsValue({
      name: p.name,
      sku: p.sku,
    });
  };

  const saveItem = async () => {
    if (!canEdit) return;
    try {
      const values = await form.validateFields();
      const payload = {
        name: values.name,
        product_name: values.name,
        sku: values.sku,
        quantity_needed: num(values.quantity_needed || 1),
        sourced_price: num(values.sourced_price),
        category: values.category,
        tested: Boolean(values.tested),
        product_condition: values.product_condition || null,
      };

      if (isNewItem) {
        await apiClient.post(
          `/api/v1/sourcing/${editingOrderId}/items`,
          payload
        );
        message.success("Item created");
      } else {
        await apiClient.patch(
          `/api/v1/sourcing/items/${editingItem._id}`,
          payload
        );
        message.success("Item updated");
      }
      setDrawerOpen(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
      message.error(
        err?.response?.data?.message ||
          err?.response?.data?.detail ||
          "Save failed"
      );
    }
  };

  /* ---------- Expanded row (items) ---------- */
  const itemTable = (order) => {
    const data = order.items || [];
    return (
      <>
        {canEdit && (
          <div style={{ textAlign: "right", marginBottom: 8 }}>
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => openNewItem(order._id)}
            >
              Add Product
            </Button>
          </div>
        )}
        <Table
          rowKey="_id"
          size="small"
          pagination={false}
          dataSource={data}
          columns={[
            {
              title: "Product",
              dataIndex: "name",
              render: (_text, rec) => {
                const label = rec.name || rec.product_name || "Untitled";
                return canEdit ? (
                  <Button
                    type="link"
                    onClick={() => loadItemForEdit(order._id, rec._id)}
                  >
                    {label}
                  </Button>
                ) : (
                  <span>{label}</span>
                );
              },
            },
            {
              title: "SKU",
              dataIndex: "sku",
              render: (v) => <Text type="secondary">{v || "—"}</Text>,
            },
            { title: "Qty", dataIndex: "quantity_needed", width: 80 },
            {
              title: "Seller $",
              dataIndex: "sourced_price",
              width: 110,
              render: (v) => fmtMoney(num(v)),
            },
            {
              title: "Condition",
              dataIndex: "product_condition",
              width: 140,
              render: (v) => v || "—",
            },
          ]}
        />
      </>
    );
  };

  /* ---------- Main table columns (separate Seller & Market) ---------- */
  const columns = useMemo(() => {
    const base = [
      {
        title: "ID",
        dataIndex: "sourcing_id",
        key: "sourcing_id",
        width: 110,
        render: (sid, rec) => (
          <Tooltip title={`MongoID: ${rec._id || rec.id || "N/A"}`}>
            <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
              {sid != null ? `#${sid}` : "—"}
            </span>
          </Tooltip>
        ),
      },
      {
        title: "Sourcer Name",
        dataIndex: "sourcerName",
        key: "sourcerName",
        width: 230,
        render: (val, rec) => {
          const fallback =
            [rec?.sourcer_id?.firstName, rec?.sourcer_id?.lastName]
              .filter(Boolean)
              .join(" ") ||
            rec?.sourcer_id?.email ||
            "—";
          const display = val || fallback;
          return (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600 }}>{display}</div>
              {rec?.sourcer_id?.email && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {rec.sourcer_id.email}
                </Text>
              )}
            </div>
          );
        },
      },
      {
        title: "Purchaser",
        dataIndex: "purchaserName",
        key: "purchaserName",
        width: 230,
        render: (val, rec) => {
          const full = [
            rec?.purchaser_id?.firstName,
            rec?.purchaser_id?.lastName,
          ]
            .filter(Boolean)
            .join(" ");
          const fallback = full || rec?.purchaser_id?.email || "—";
          const display = val || fallback || "—";
          return (
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600 }}>{display}</div>
              {rec?.purchaser_id?.email && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {rec.purchaser_id.email}
                </Text>
              )}
            </div>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 130,
        render: (s) => <Tag color={statusPill(s)}>{s || "Pending"}</Tag>,
      },
      {
        title: "Seller",
        key: "seller",
        width: 100,
        render: (_, rec) => (
          <span style={{ fontWeight: 600 }}>{getSellerName(rec)}</span>
        ),
      },
      {
        title: "Market",
        key: "market",
        width: 100,
        render: (_, rec) => {
          const marketRef =
            rec?.seller && typeof rec.seller === "object"
              ? rec.seller.market
              : rec.market;
          const origin = rec.origin || "—";
          return (
            <div style={{ lineHeight: 1.2 }}>
              <div>
                <MarketName market={marketRef} />
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {origin}
              </Text>
            </div>
          );
        },
      },

      {
        title: "Seller $",
        dataIndex: "sellers_price",
        key: "sellers_price",
        width: 110,
        render: (v) => (
          <span style={{ fontWeight: 600 }}>{fmtMoney(num(v))}</span>
        ),
      },
      {
        title: "Ship $",
        dataIndex: "shipping_charges",
        key: "shipping_charges",
        width: 110,
        render: (_, rec) =>
          fmtMoney(num(rec.shipping_charges ?? rec.shipping_price)),
      },
      {
        title: "Tax $",
        dataIndex: "taxes",
        key: "taxes",
        width: 110,
        render: (_, rec) => fmtMoney(num(rec.taxes ?? rec.tax)),
      },
      {
        title: "Total Target $",
        dataIndex: "target_total_cost",
        key: "target_total_cost",
        width: 150,
        render: (v) => fmtMoney(num(v)),
      },
      {
        title: "Actual Cost $",
        dataIndex: "total_actual_cost",
        key: "total_actual_cost",
        width: 150,
        render: (v) => fmtMoney(num(v)),
      },
      {
        title: "Efficiency $",
        key: "purchase_efficiency",
        width: 150,
        render: (_, rec) => {
          const eff = deriveEfficiency(rec);
          const n = num(eff);
          return (
            <span style={{ fontWeight: 600, color: n >= 0 ? "green" : "red" }}>
              {fmtMoney(n)}
            </span>
          );
        },
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 170,
        render: (dt, rec) => {
          const actual = dt || rec.created_at || rec.created_on;
          return actual ? new Date(actual).toLocaleString() : "N/A";
        },
      },
    ];

    if (canEdit) {
      base.push({
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: 120,
        render: (_, rec) => (
          <Space size={4}>
            <Tooltip title="Edit">
              <Button
                type="text" // subtle icon-only
                icon={<Pencil size={16} />}
                aria-label="Edit"
                onClick={() => navigate(`/sourcing/edit/${rec._id}`)}
              />
            </Tooltip>

            <Popconfirm
              title="Delete this sourcing request?"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteOrder(rec._id || rec.id)}
            >
              <Tooltip title="Delete">
                <Button
                  type="text"
                  danger
                  icon={<Trash2 size={16} />}
                  aria-label="Delete"
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      });
    }

    return base;
  }, [canEdit, navigate, handleDeleteOrder]);

  const pageTitle = isAdmin
    ? "All Sourcing Orders"
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card
          title={
            <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
              {pageTitle}
            </span>
          }
          extra={
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchOrders}
                style={chipStyle}
              >
                Refresh
              </Button>
              {canEdit && (
                <>
                  <Button
                    onClick={() => setImportOpen(true)}
                    style={{ borderRadius: 10 }}
                  >
                    Import CSV
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate("/sourcing/orders/new")}
                    style={{ borderRadius: 10 }}
                  >
                    New Sourcing
                  </Button>
                </>
              )}
            </Space>
          }
          style={gradientCardStyle}
          bodyStyle={{ padding: 18 }}
        >
          {/* Filters */}
          <Row gutter={[12, 12]} style={{ marginBottom: 10 }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Filter by Product Name"
                allowClear
                onChange={(e) =>
                  setFilters((f) => ({ ...f, product: e.target.value }))
                }
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Input
                placeholder="Filter by SKU"
                allowClear
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sku: e.target.value }))
                }
                style={{ borderRadius: 8 }}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Select
                placeholder="Filter by Status"
                allowClear
                style={{ width: "100%" }}
                onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
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
            <Col xs={24} sm={12} md={12} lg={5}>
              <RangePicker
                style={{ width: "100%" }}
                onChange={(range) =>
                  setFilters((f) => ({ ...f, dateRange: range }))
                }
              />
            </Col>
            <Col xs={24} sm={12} md={12} lg={3}>
              <Input
                placeholder="Sourcing ID (#)"
                allowClear
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sourcingId: e.target.value }))
                }
                style={{ borderRadius: 8 }}
              />
            </Col>
          </Row>

          <div style={tableCardStyle}>
            <Table
              dataSource={filteredOrders}
              columns={columns}
              rowKey={(rec) => rec._id || rec.id}
              expandable={{ expandedRowRender: itemTable }}
              pagination={{ defaultPageSize: 20, showSizeChanger: true }}
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
          </div>
        </Card>
      </motion.div>

      <SourcingImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        orders={orders}
        onImported={() => fetchOrders()}
      />

      {drawerOpen && canEdit && (
        <div ref={fullscreenRef}>
          <Drawer
            getContainer={getContainer}
            key={String(isFullscreen)}
            title={isNewItem ? "Add Product" : `Edit Item`}
            width={520}
            onClose={() => setDrawerOpen(false)}
            open={drawerOpen}
            destroyOnClose
            footer={
              <Space style={{ float: "right" }}>
                <Button
                  icon={<CloseOutlined />}
                  onClick={() => setDrawerOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={saveItem}
                  loading={drawerLoading}
                >
                  Save
                </Button>
              </Space>
            }
          >
            {drawerLoading ? (
              <Spin />
            ) : (
              <Form layout="vertical" form={form}>
                {isNewItem && (
                  <Form.Item label="Pick from Master Products">
                    <Select
                      showSearch
                      placeholder="Search SKU or Name..."
                      filterOption={false}
                      onSearch={debouncedSearch}
                      options={searchOptions}
                      onSelect={handleProductSelect}
                      allowClear
                      showArrow={false}
                    />
                  </Form.Item>
                )}

                <Form.Item
                  label="Product Name"
                  name="name"
                  rules={[
                    { required: true, message: "Product name is required" },
                  ]}
                >
                  <Input />
                </Form.Item>

                <Form.Item label="SKU" name="sku">
                  <Input />
                </Form.Item>

                <Form.Item
                  label="Quantity"
                  name="quantity_needed"
                  rules={[{ required: true, type: "number", min: 1 }]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item label="Seller $ (line)" name="sourced_price">
                  <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
                </Form.Item>

                <Form.Item label="Category" name="category">
                  <Input />
                </Form.Item>

                <Form.Item valuePropName="checked" name="tested">
                  <Checkbox>Tested</Checkbox>
                </Form.Item>

                <Form.Item label="Condition" name="product_condition">
                  <Select allowClear>
                    <Option value="Excellent">Excellent</Option>
                    <Option value="Refurbished">Refurbished</Option>
                    <Option value="Acceptable">Acceptable</Option>
                    <Option value="Scratched">Scratched</Option>
                    <Option value="Unacceptable">Unacceptable</Option>
                  </Select>
                </Form.Item>
              </Form>
            )}
          </Drawer>
        </div>
      )}
    </>
  );
}
