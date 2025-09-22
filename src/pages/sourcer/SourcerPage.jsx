
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Form,
  Input,
  Button,
  Select,
  InputNumber,
  Table,
  Statistic,
  Card,
  Row,
  Col,
  Typography,
  Tooltip,
  Spin,
} from "antd";
import { motion } from "framer-motion";
import { DeleteOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import useProductSearch from "./hooks/useProductSearch";
import useCart from "./hooks/useCart";
import Swal from "sweetalert2";

const { Option } = Select;
const { Title, Text } = Typography;

/* ------------------- styling ------------------- */
const gradientStyle = {
  background: "linear-gradient(to right, #f8fbff, #e0f2fe)",
  borderRadius: "12px",
  padding: "1rem",
  marginBottom: "1rem",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
};

/* ------------------- helpers ------------------- */
const toNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
const round2 = (n) => Math.round((toNum(n) + Number.EPSILON) * 100) / 100;

const ensureHttp = (v) => {
  if (!v) return v;
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
};

const normalizeListingLink = (raw) => {
  if (!raw) return "";
  const v = String(raw).trim();
  if (!v) return "";
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  if (/\s/.test(withProto)) throw new Error("URL cannot contain spaces");
  let u;
  try {
    u = new URL(withProto);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!u.hostname || !u.hostname.includes(".")) throw new Error("Invalid URL host");
  return u.toString();
};

const listingLinkRule = () => ({
  validator: (_, value) => {
    if (!value) return Promise.resolve();
    try {
      const url = new URL(ensureHttp(value));
      if (!/^https?:$/.test(url.protocol)) {
        return Promise.reject(new Error("Link must start with http or https"));
      }
      if (!url.hostname.includes(".")) {
        return Promise.reject(new Error("URL must contain a valid domain (e.g. example.com)"));
      }
      return Promise.resolve();
    } catch {
      return Promise.reject(new Error("Please enter a valid URL"));
    }
  },
});

// Countries
const MAIN_COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Germany","France","Italy","Spain",
  "Netherlands","Sweden","Norway","Denmark","Switzerland","Belgium","Austria","Ireland",
  "Poland","Portugal","Czechia","Japan","South Korea","China","India","Pakistan",
  "United Arab Emirates","Saudi Arabia","Turkey","Mexico","Brazil","Argentina",
];
const COUNTRY_OPTIONS = MAIN_COUNTRIES.map((c) => ({ label: c, value: c }));

// Toasts
const baseToast = {
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  customClass: { popup: "rounded-lg" },
};
const toastSuccess = (title = "Success!", text = "") =>
  Swal.fire({ ...baseToast, icon: "success", title, text, background: "#10b981", color: "#fff" });
const toastError = (title = "Something went wrong", text = "") =>
  Swal.fire({ ...baseToast, icon: "error", title, text, background: "#ef4444", color: "#fff" });
const toastInfo = (title = "Heads up", text = "") =>
  Swal.fire({ ...baseToast, icon: "info", title, text });

/* ------------------- page ------------------- */
export default function SourcerPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams(); // if present => edit mode
  const isEdit = Boolean(id);

  const { user } = useAuth();
  const totals = Form.useWatch("totals", form);
  const headerWatch = Form.useWatch("header", form);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);

  const { products, loading, mode, debouncedSearch, setTerm, fetchInitialProducts } =
    useProductSearch();

  // cart depends on totals to compute some previews
  const cart = useCart(totals);

  // ProductType (UI only)
  const ProductType = { Accessory: "Accessory", Console: "Console", Game: "Game", Handheld: "Handheld" };

  // search options for product picker
  const options = useMemo(
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
        product: p,
      })),
    [products]
  );

  const addToCart = (p) => {
    cart.add({
      id: p.id,
      product_name: p.product_name,
      sku: p.sku,
      product_type: p.product_type || ProductType.Game,
      category: p.category,
      // UI-only: target per unit (we will post order-level totals)
      target_cost: Number(p.target_cost) || 0,
      quantity_needed: 1,
      // per-item line seller total computed on submit
      sourced_price: 0,
    });
  };

  const onSelectChange = (_vals, opts) => {
    (Array.isArray(opts) ? opts : [opts]).forEach((o) => o?.product && addToCart(o.product));
    form.setFieldsValue({ search: [] });
    setTerm("");
  };

  /* ------------------- totals & metrics ------------------- */
  const sellersPrice = toNum(totals?.sellers_price);
  const shippingCharges = toNum(totals?.shipping_charges);
  const taxes = toNum(totals?.taxes);

  // Actual Cost (order-level) = seller + shipping + taxes
  const totalActualCost = useMemo(
    () => round2(sellersPrice + shippingCharges + taxes),
    [sellersPrice, shippingCharges, taxes]
  );

  // Total Target Price = sum(target * qty) from cart
  const targetTotalCost = useMemo(
    () =>
      round2(
        cart.rawItems.reduce(
          (sum, i) => sum + toNum(i.target_cost) * toNum(i.quantity_needed),
          0
        )
      ),
    [cart.rawItems]
  );

  // Efficiency = Target Total - Actual Total
  const purchaseEfficiency = useMemo(
    () => round2(targetTotalCost - totalActualCost),
    [targetTotalCost, totalActualCost]
  );

  // Per-unit seller allocation factor (for preview & line totals when saving)
  const totalTargetFromCart = targetTotalCost;
  const allocationFactor = useMemo(() => {
    const denom = totalTargetFromCart;
    const numer = sellersPrice;
    if (denom <= 0) return 0;
    return numer / denom;
  }, [sellersPrice, totalTargetFromCart]);

  const actualAllocationFactor = useMemo(() => {
    if (targetTotalCost <= 0) return 0;
    return totalActualCost / targetTotalCost;
  }, [totalActualCost, targetTotalCost]);

  /* ------------------- Seller search/create (inline) ------------------- */
  const [sellerOptions, setSellerOptions] = useState([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const sellerSearchTimer = useRef(null);
  const lastSellerQuery = useRef("");

  const debouncedSellerSearch = useCallback((q, market) => {
    if (!market) {
      setSellerOptions([]);
      return;
    }
    lastSellerQuery.current = q;
    if (sellerSearchTimer.current) clearTimeout(sellerSearchTimer.current);
    sellerSearchTimer.current = setTimeout(async () => {
      try {
        setSellerLoading(true);
        const { data } = await apiClient.get("/api/v1/sellers", {
          params: { q, market },
        });
        const opts = (data || []).map((s) => ({
          label: s.name,
          value: s._id,
          meta: s,
        }));
        setSellerOptions(opts);
      } catch (e) {
        // silent fail to avoid noisy UX
      } finally {
        setSellerLoading(false);
      }
    }, 300);
  }, []);

  // include "Create" option if no exact match for current query
  const sellerOptionsWithCreate = useMemo(() => {
    const q = String(lastSellerQuery.current || "").trim();
    if (!q) return sellerOptions;
    const exact = sellerOptions.some(
      (o) => (o.label || "").toLowerCase() === q.toLowerCase()
    );
    return exact
      ? sellerOptions
      : [
          ...sellerOptions,
          {
            label: `Create “${q}”`,
            value: "__CREATE__",
            meta: { createName: q },
          },
        ];
  }, [sellerOptions]);

  const handleSellerSearch = (val) => {
    const market = form.getFieldValue(["header", "market"]);
    debouncedSellerSearch(val, market);
  };

  const handleSellerSelect = async (val, option) => {
    if (val === "__CREATE__") {
      const createName = option?.meta?.createName;
      const market = form.getFieldValue(["header", "market"]);
      if (!market) {
        toastInfo("Please select a marketplace first");
        return;
      }
      try {
        const { data } = await apiClient.post("/api/v1/sellers/find-or-create", {
          name: createName,
          market,
        });
        form.setFieldsValue({
          header: {
            ...form.getFieldValue("header"),
            seller_name: data.name,
            seller_id: data._id,
          },
        });
        toastSuccess("Seller added", `${data.name} (${data.market})`);
      } catch (e) {
        toastError("Could not create seller", e?.response?.data?.message || "");
      }
    } else {
      // existing seller selected
      form.setFieldsValue({
        header: {
          ...form.getFieldValue("header"),
          seller_name: option?.label,
          seller_id: val,
        },
      });
    }
  };

  // When marketplace changes, clear selected seller to avoid cross-market mismatch
  useEffect(() => {
    const market = headerWatch?.market;
    if (!market) return;
    // clear seller fields if market changes after selection
    // (We track previous market via ref)
  }, [headerWatch?.market]); // eslint-disable-line

  /* ------------------- edit mode: load order ------------------- */
  useEffect(() => {
    if (!isEdit || !id) return;
    const load = async () => {
      try {
        setLoadingOrder(true);
        const { data } = await apiClient.get(`/api/v1/sourcing/${id}`);

        // Header & totals
        form.setFieldsValue({
          header: {
            listing_link: data?.listing_link || "",
            seller_name: data?.seller?.name || data?.seller_name || "",
            seller_id: data?.seller?._id || undefined,
            market: data?.seller?.market || data?.market || "eBay",
            origin: data?.origin || undefined,
          },
          totals: {
            sellers_price: toNum(data?.sellers_price),
            shipping_charges: toNum(data?.shipping_charges ?? data?.shipping_price),
            taxes: toNum(data?.taxes ?? data?.tax),
          },
        });

        // Items
        cart.reset();
        const items = Array.isArray(data?.items) ? data.items : [];
        const totalUnits = items.reduce((s, it) => s + toNum(it.quantity_needed || 1), 0);

        // derive per-unit target from order.target_total_cost (if available)
        const orderTargetTotal = toNum(data?.target_total_cost);
        const derivedTargetPerUnit =
          totalUnits > 0 && orderTargetTotal > 0 ? orderTargetTotal / totalUnits : 0;

        items.forEach((it) => {
          cart.add({
            id: it._id, // keep stable for editing in the UI
            product_name: it.name || it.product_name || "Untitled",
            sku: it.sku || "",
            product_type: it.product_type || ProductType.Game,
            category: it.category || "",
            // we do NOT store per-item target in DB; derive from order-level totals
            target_cost: derivedTargetPerUnit,
            quantity_needed: toNum(it.quantity_needed || 1),
            // DB stores sourced_price as a line total in your subdoc
            sourced_price: toNum(it.sourced_price || 0),
          });
        });
      } catch (err) {
        toastError("Failed to load order", err?.response?.data?.message || err?.message || "");
      } finally {
        setLoadingOrder(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, id]);

  /* ------------------- save (create / update) ------------------- */
  const buildPayload = (values) => {
    const listing_link = normalizeListingLink(values.header?.listing_link);

    // Build items (sourced_price must be a LINE TOTAL)
    const itemsPayload = cart.rawItems.map((i) => {
      const qty = toNum(i.quantity_needed) || 1;
      const targetUnit = toNum(i.target_cost);
      const sellerUnit = round2(allocationFactor * targetUnit);
      const lineSellerTotal = round2(sellerUnit * qty);

      return {
        product_name: i.product_name,
        sku: i.sku,
        quantity_needed: qty,
        sourced_price: lineSellerTotal, // line total (kept in your sub-doc)
        product_type: i.product_type,
        category: i.category,
        tested: false,
        product_condition: null,
      };
    });

    return {
      // identity & seller normalization (backend can map seller_name+market to Seller ref)
      sourcer_id: user?.id,
      seller: values.header?.seller_id || undefined, // prefer persistent id if selected/created
      seller_name: values.header?.seller_name,       // keep for display/back-compat
      market: values.header?.market ?? "",
      listing_link,
      origin: values.header?.origin ?? "",

      // order-level amounts (model field names)
      sellers_price: toNum(values.totals?.sellers_price),
      shipping_charges: toNum(values.totals?.shipping_charges ?? values.totals?.shipping_price),
      taxes: toNum(values.totals?.taxes ?? values.totals?.tax),

      // Store these in DB (per your spec)
      target_total_cost: targetTotalCost,
      total_actual_cost: totalActualCost,
      purchase_efficiency: purchaseEfficiency,

      items: itemsPayload,
    };
  };

  const onSubmit = async () => {
    if (!cart.rawItems.length) {
      toastInfo("Cart is empty", "Add at least one product to proceed.");
      return;
    }
    if (!user?.id) {
      toastInfo("Please log in first");
      return;
    }

    setIsSubmitting(true);
    try {
      const values = await form.validateFields();
      const payload = buildPayload(values);

      if (isEdit) {
        await apiClient.put(`/api/v1/sourcing/${id}`, payload);
        toastSuccess("Record Updated!", "Your sourcing order has been updated.");
      } else {
        await apiClient.post("/api/v1/sourcing", payload);
        toastSuccess("Record Created Successfully!", "Your sourcing order has been created.");
      }

      form.resetFields();
      cart.reset();
      navigate("/"); // back to list
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      toastError(isEdit ? "Failed to update order" : "Failed to create order", apiMsg || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ------------------- table columns ------------------- */
  const columns = useMemo(
    () => [
      {
        title: "Product",
        dataIndex: "product_name",
        render: (text, rec) => (
          <div>
            <strong>{text}</strong>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>{rec.sku}</Text>
          </div>
        ),
      },
      {
        title: "Sourcer",
        dataIndex: "sourcer_id",
        width: 90,
        render: () => (
          <Tooltip title="Person who created this sourcing order">
            <span>{user?.name || "Unknown"}</span>
          </Tooltip>
        ),
      },
      {
        title: "Qty",
        dataIndex: "quantity_needed",
        width: 96,
        render: (val, rec) => (
          <InputNumber
            min={1}
            size="large"
            value={val}
            onChange={(v) => cart.update(rec.id, { quantity_needed: Number(v) || 1 })}
          />
        ),
      },
      {
        title: "Type",
        dataIndex: "product_type",
        width: 120,
        render: (val, rec) => (
          <Select
            value={val}
            style={{ width: "100%" }}
            onChange={(newType) => cart.update(rec.id, { product_type: newType })}
          >
            {Object.values(ProductType).map((type) => (
              <Option key={type} value={type}>
                {type}
              </Option>
            ))}
          </Select>
        ),
      },
      {
        title: "Target $ per unit",
        dataIndex: "target_cost",
        render: (v) => `$${toNum(v).toFixed(2)}`,
      },
      {
        title: "Total Target (line)",
        key: "total_target_cost_per_unit",
        width: 180,
        render: (_v, rec) => {
          const qty = toNum(rec.quantity_needed);
          const target = toNum(rec.target_cost);
          return `$${(qty * target).toFixed(2)}`;
        },
      },
      {
        title: "Actual $ per unit",
        key: "actual_per_unit",
        width: 180,
        render: (_v, rec) => {
          const perUnitActual = round2(actualAllocationFactor * toNum(rec.target_cost));
          return <InputNumber disabled size="large" value={perUnitActual} />;
        },
      },
      {
        title: "Total Actual cost",
        key: "total_actual_cost_line",
        width: 180,
        render: (_v, rec) => {
          const qty = toNum(rec.quantity_needed);
          const perUnitActual = round2(actualAllocationFactor * toNum(rec.target_cost));
          return `$${(qty * perUnitActual).toFixed(2)}`;
        },
      },
      {
        title: "",
        width: 64,
        render: (_v, rec) => (
          <Button
            size="large"
            icon={<DeleteOutlined />}
            danger
            onClick={() => cart.remove(rec.id)}
          />
        ),
      },
    ],
    [cart, user?.name, allocationFactor, actualAllocationFactor]
  );

  /* ------------------- render ------------------- */
  return (
    <div style={{ padding: "1.5rem", borderRadius: 10, position: "relative" }}>
      {/* optional overlay when loading edit data */}
      {isEdit && loadingOrder && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            borderRadius: 10,
          }}
        >
          <Spin size="large" />
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          header: { market: "eBay" },
          totals: { sellers_price: 0, shipping_charges: 0, taxes: 0 },
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Title level={3}>{isEdit ? "Edit Sourcing Order" : "New Sourcing Order"}</Title>
        </motion.div>

        {/* Header */}
        <Card style={gradientStyle}>
          <Row gutter={[12, 12]} align="top">
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={["header", "listing_link"]}
                label="Listing Link"
                hasFeedback
                validateFirst
                validateTrigger={["onChange", "onBlur"]}
                rules={[
                  { required: true, message: "Listing link is required" },
                  listingLinkRule(),
                ]}
              >
                <Input
                  size="large"
                  placeholder="example.com/item/123"
                  onBlur={(e) => {
                    const fixed = ensureHttp(e.target.value);
                    if (fixed && fixed !== e.target.value) {
                      form.setFieldsValue({ header: { listing_link: fixed } });
                    }
                  }}
                  onPressEnter={(e) => {
                    const fixed = ensureHttp(e.currentTarget.value);
                    if (fixed && fixed !== e.currentTarget.value) {
                      form.setFieldsValue({ header: { listing_link: fixed } });
                    }
                  }}
                />
              </Form.Item>
            </Col>

            {/* Hidden seller_id to send stable ref when available */}
            <Form.Item name={["header", "seller_id"]} hidden>
              <Input />
            </Form.Item>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={["header", "seller_name"]}
                label="Seller"
                rules={[{ required: true, message: "Please select or create a seller" }]}
              >
                <Select
                  showSearch
                  size="large"
                  placeholder="Type to search or create"
                  onSearch={handleSellerSearch}
                  filterOption={false}
                  options={sellerOptionsWithCreate}
                  loading={sellerLoading}
                  onSelect={handleSellerSelect}
                  allowClear
                  onClear={() =>
                    form.setFieldsValue({
                      header: { ...form.getFieldValue("header"), seller_id: undefined, seller_name: undefined },
                    })
                  }
                  // Display current name for UX after selection/creation
                  value={form.getFieldValue(["header", "seller_name"]) || undefined}
                  // Make it controlled by name; selecting an option updates seller_name via handleSellerSelect
                  onChange={() => {}}
                  notFoundContent={sellerLoading ? "Loading..." : null}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={["header", "market"]}
                label="Marketplace"
                rules={[{ required: true, message: "Please select a marketplace" }]}
              >
                <Select
                  size="large"
                  onChange={() => {
                    // clear seller on market change
                    form.setFieldsValue({
                      header: {
                        ...form.getFieldValue("header"),
                        seller_id: undefined,
                        seller_name: undefined,
                      },
                    });
                    setSellerOptions([]);
                  }}
                >
                  <Option value="eBay">eBay</Option>
                  <Option value="Mercari">Mercari</Option>
                  <Option value="Facebook">Facebook</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={["header", "origin"]}
                label="Origin"
                rules={[
                  { required: true, message: "Please add an origin" },
                  () => ({
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      return COUNTRY_OPTIONS.some((o) => o.value === value)
                        ? Promise.resolve()
                        : Promise.reject(new Error("Please select a country from the list"));
                    },
                  }),
                ]}
              >
                <Select
                  size="large"
                  showSearch
                  allowClear
                  placeholder="Select country"
                  options={COUNTRY_OPTIONS}
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Search + Efficiency */}
        <Card style={gradientStyle}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={16}>
              <Form.Item name="search" noStyle>
                <Select
                  mode="multiple"
                  showSearch
                  allowClear
                  size="large"
                  style={{ width: "100%" }}
                  placeholder={`Search ${mode.toUpperCase()}...`}
                  onSearch={debouncedSearch}
                  options={options}
                  filterOption={false}
                  onChange={onSelectChange}
                  loading={loading}
                  onDropdownVisibleChange={(open) => {
                    if (open) fetchInitialProducts();
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Efficiency (Target − Actual)"
                prefix="$"
                value={purchaseEfficiency}
                precision={2}
                valueStyle={{ color: purchaseEfficiency >= 0 ? "green" : "red" }}
              />
            </Col>
          </Row>
        </Card>

        {/* Cart */}
        <Card style={gradientStyle}>
          <Table
            size="small"
            columns={columns}
            dataSource={cart.items}
            rowKey="id"
            pagination={false}
          />
          <Row justify="end" style={{ marginTop: 12 }}>
            <Col>
              <Statistic
                title="Total Target Price"
                prefix="$"
                value={targetTotalCost}
                precision={2}
                valueStyle={{ fontWeight: 700 }}
              />
            </Col>
          </Row>
        </Card>

        {/* Totals */}
        <Card style={gradientStyle}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Form.Item name={["totals", "sellers_price"]} label="Seller Price ($)">
                <InputNumber step={0.01} style={{ width: "100%" }} size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name={["totals", "shipping_charges"]} label="Shipping ($)">
                <InputNumber step={0.01} style={{ width: "100%" }} size="large" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name={["totals", "taxes"]} label="Taxes ($)">
                <InputNumber step={0.01} style={{ width: "100%" }} size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end">
            <Col>
              <Statistic
                title="Actual Cost"
                prefix="$"
                value={totalActualCost}
                precision={2}
                valueStyle={{ fontWeight: 700 }}
              />
            </Col>
          </Row>
        </Card>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{ position: "fixed", bottom: 24, right: 32, zIndex: 999 }}
        >
          <Button
            type="primary"
            size="large"
            onClick={onSubmit}
            loading={isSubmitting}
            disabled={!cart.rawItems.length || isSubmitting}
            style={{
              padding: "0.75rem 2rem",
              fontWeight: 600,
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {isEdit ? "Save Changes" : "Create Record"}
          </Button>
        </motion.div>
      </Form>
    </div>
  );
}
