

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
import useProductSearch from "./hooks/useProductSearch"; // expects (typeCode)
import useCart from "./hooks/useCart";
import Swal from "sweetalert2";
import AppBreadcrumbs from "../../components/AppBreadCrumbs";

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

/* ------------------- type code helpers ------------------- */
const TYPE_CODE_TO_NAME = { CON: "Console", HAN: "Handheld", ACC: "Accessory", GAM: "Game" };

/* ------------------- market helpers ------------------- */
const getMarketSlug = (m) => {
  if (!m) return "";
  if (typeof m === "string") return m.toLowerCase();
  if (typeof m === "object") return (m.slug || m.name || "").toLowerCase();
  return String(m).toLowerCase();
};

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

  // product search filters/state
  const [typeCode, setTypeCode] = useState(""); // "", "ACC", "CON", "HAN", "GAM"
  const [searchText, setSearchText] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // hook: backend search (keeps it simple)
  const { products, loading, debouncedSearch, fetchInitialProducts } = useProductSearch(typeCode);

  // cart depends on totals to compute some previews
  const cart = useCart(totals);

  // ProductType (UI only)
  const ProductType = { Accessory: "Accessory", Console: "Console", Game: "Game", Handheld: "Handheld" };

  // click-outside to close dropdown
  useEffect(() => {
    const onDocClick = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setShowProductDropdown(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // search input change -> call hook's debounced API
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    debouncedSearch(val); // hits /all?page=1&limit=50&search=val&type=typeCode
  };

  // add to cart (map both schema shapes)
  const addToCart = (p) => {
    const id = p._id || p.id;
    const name = p.pro_title || p.product_name || "Untitled";
    const code = p.type_code || p.product_type_code || "";
    const resolvedType = p.product_type || TYPE_CODE_TO_NAME[code] || ProductType.Game;

    cart.add({
      id,
      product_name: name,
      sku: p.sku,
      product_type: resolvedType,
      category: p.category,
      target_cost: Number(p.target_cost) || 0,
      quantity_needed: 1,
      sourced_price: 0,
    });
  };

  const onPickProduct = (p) => {
    addToCart(p);
    setShowProductDropdown(false);
    setSearchText("");
  };

  /* ------------------- totals & metrics ------------------- */
  const sellersPrice = toNum(totals?.sellers_price);
  const shippingCharges = toNum(totals?.shipping_charges);
  const taxes = toNum(totals?.taxes);

  const totalActualCost = useMemo(
    () => round2(sellersPrice + shippingCharges + taxes),
    [sellersPrice, shippingCharges, taxes]
  );

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

  const purchaseEfficiency = useMemo(
    () => round2(targetTotalCost - totalActualCost),
    [targetTotalCost, totalActualCost]
  );

  const actualAllocationFactor = useMemo(() => {
    if (targetTotalCost <= 0) return 0;
    return totalActualCost / targetTotalCost;
  }, [totalActualCost, targetTotalCost]);

  /* ------------------- MARKET search/create ------------------- */
  const [marketOpts, setMarketOpts] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const marketTimer = useRef(null);
  const lastMarketQuery = useRef("");

  const debouncedMarketSearch = useCallback((q) => {
    lastMarketQuery.current = q;
    if (marketTimer.current) clearTimeout(marketTimer.current);
    marketTimer.current = setTimeout(async () => {
      try {
        setMarketLoading(true);
        const { data } = await apiClient.get("/api/v1/markets", { params: { q } });
        const list = Array.isArray(data) ? data : [];
        setMarketOpts(
          list.map((m) => ({
            label: `${m.name} (${m.slug})`,
            value: m.slug, // value is slug
            meta: m,
          }))
        );
      } catch {
        setMarketOpts([]);
      } finally {
        setMarketLoading(false);
      }
    }, 300);
  }, []);

  const marketOptionsWithCreate = useMemo(() => {
    const q = String(lastMarketQuery.current || "").trim();
    if (!q) return marketOpts;
    const exists = marketOpts.some(
      (o) =>
        (o.meta?.slug || "").toLowerCase() === q.toLowerCase() ||
        (o.meta?.name || "").toLowerCase() === q.toLowerCase()
    );
    return exists
      ? marketOpts
      : [...marketOpts, { label: `Create “${q}”`, value: "__CREATE__", meta: { createName: q } }];
  }, [marketOpts]);

  const onMarketSelect = async (val, option) => {
    if (val === "__CREATE__") {
      const createName = option?.meta?.createName;
      try {
        const { data } = await apiClient.post("/api/v1/markets/find-or-create", { name: createName });
        form.setFieldsValue({
          header: { ...form.getFieldValue("header"), market: data.slug }, // store slug
        });
        toastSuccess("Market added", `${data.name} (${data.slug})`);
        // clear seller since market changed
        form.setFieldsValue({
          header: { ...form.getFieldValue("header"), seller_id: undefined, seller_name: undefined },
        });
        setSellerOptions([]);
      } catch (e) {
        toastError("Could not create market", e?.response?.data?.message || "");
      }
    } else {
      // val is slug
      form.setFieldsValue({
        header: { ...form.getFieldValue("header"), market: val, seller_id: undefined, seller_name: undefined },
      });
      setSellerOptions([]);
    }
  };

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
          params: { q, market }, // market is slug
        });
        // supports array or { data }
        const list = Array.isArray(data) ? data : data?.data || [];
        const opts = list.map((s) => ({
          label: s.name,
          value: s._id,
          meta: s,
        }));
        setSellerOptions(opts);
      } catch {
        setSellerOptions([]);
      } finally {
        setSellerLoading(false);
      }
    }, 300);
  }, []);

  const sellerOptionsWithCreate = useMemo(() => {
    const q = String(lastSellerQuery.current || "").trim();
    if (!q) return sellerOptions;
    const exact = sellerOptions.some((o) => (o.label || "").toLowerCase() === q.toLowerCase());
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
    const market = form.getFieldValue(["header", "market"]); // slug
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
          market, // slug
        });
        form.setFieldsValue({
          header: {
            ...form.getFieldValue("header"),
            seller_name: data.name,
            seller_id: data._id,
          },
        });
        toastSuccess("Seller added", `${data.name} (${data.marketSlug || data.marketName || market})`);
      } catch (e) {
        toastError("Could not create seller", e?.response?.data?.message || "");
      }
    } else {
      form.setFieldsValue({
        header: {
          ...form.getFieldValue("header"),
          seller_name: option?.label,
          seller_id: val,
        },
      });
    }
  };

  useEffect(() => {
    const market = headerWatch?.market;
    if (!market) return;
    // react to market changes if needed
  }, [headerWatch?.market]); // eslint-disable-line

  /* ------------------- edit mode: load order ------------------- */
  useEffect(() => {
    if (!isEdit || !id) return;
    const load = async () => {
      try {
        setLoadingOrder(true);
        const { data } = await apiClient.get(`/api/v1/sourcing/${id}`);

        form.setFieldsValue({
          header: {
            listing_link: data?.listing_link || "",
            seller_name: data?.seller?.name || data?.seller_name || "",
            seller_id: data?.seller?._id || undefined,
            // normalize to slug
            market: getMarketSlug(data?.seller?.market || data?.market || "ebay"),
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

        const orderTargetTotal = toNum(data?.target_total_cost);
        const derivedTargetPerUnit =
          totalUnits > 0 && orderTargetTotal > 0 ? orderTargetTotal / totalUnits : 0;

        items.forEach((it) => {
          cart.add({
            id: it._id,
            product_name: it.name || it.product_name || "Untitled",
            sku: it.sku || "",
            product_type: it.product_type || "Game",
            category: it.category || "",
            target_cost: derivedTargetPerUnit,
            quantity_needed: toNum(it.quantity_needed || 1),
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

    const itemsPayload = cart.rawItems.map((i) => {
      const qty = toNum(i.quantity_needed) || 1;
      const targetUnit = toNum(i.target_cost);
      const perUnitActual = round2((totalActualCost / Math.max(targetTotalCost, 1)) * targetUnit);
      const lineActual = round2(perUnitActual * qty);

      return {
        product_name: i.product_name,
        sku: i.sku,
        quantity_needed: qty,
        sourced_price: lineActual,
        product_type: i.product_type,
        category: i.category,
        tested: false,
        product_condition: null,
      };
    });

    return {
      sourcer_id: user?.id,
      seller: values.header?.seller_id || undefined,
      seller_name: values.header?.seller_name,
      market: values.header?.market ?? "", // slug
      listing_link,
      origin: values.header?.origin ?? "",

      sellers_price: toNum(values.totals?.sellers_price),
      shipping_charges: toNum(values.totals?.shipping_charges ?? values.totals?.shipping_price),
      taxes: toNum(values.totals?.taxes ?? values.totals?.tax),

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
      navigate("/");
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
      // {
      //   title: "Sourcer",
      //   dataIndex: "sourcer_id",
      //   width: 90,
      //   render: () => (
      //     <Tooltip title="Person who created this sourcing order">
      //       <span>{user?.name || "Unknown"}</span>
      //     </Tooltip>
      //   ),
      // },
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
        width: 180,
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
    [cart, user?.name, actualAllocationFactor]
  );

  /* ------------------- render ------------------- */
  return (
    <div style={{ padding: "1.5rem", borderRadius: 10, position: "relative" }}>


      <AppBreadcrumbs fromLocation hide={['orders']} />


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
          header: { market: "ebay" }, // store slug
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
                  value={form.getFieldValue(["header", "seller_name"]) || undefined}
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
                  showSearch
                  size="large"
                  placeholder="Search or create a marketplace"
                  onSearch={debouncedMarketSearch}
                  filterOption={false}
                  options={marketOptionsWithCreate}
                  loading={marketLoading}
                  onSelect={onMarketSelect}
                  allowClear
                  onClear={() => {
                    form.setFieldsValue({
                      header: { ...form.getFieldValue("header"), market: undefined, seller_id: undefined, seller_name: undefined },
                    });
                    setSellerOptions([]);
                  }}
                  value={form.getFieldValue(["header", "market"]) || undefined}
                  notFoundContent={marketLoading ? "Loading..." : null}
                />
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
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <div className="relative" ref={dropdownRef} style={{ position: "relative" }}>
                <Input
                  size="large"
                  placeholder="Search products…"
                  value={searchText}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    setShowProductDropdown(true);
                    if (!products?.length) fetchInitialProducts();
                  }}
                />

                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { code: "ACC", label: "Accessories" },
                    { code: "CON", label: "Consoles" },
                    { code: "HAN", label: "Handhelds" },
                    { code: "GAM", label: "Games" },
                  ].map((t) => {
                    const active = typeCode === t.code;
                    return (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => {
                          const next = active ? "" : t.code;
                          debouncedSearch.cancel?.();
                          setTypeCode(next);
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid",
                          borderColor: active ? "#2563eb" : "#e5e7eb",
                          background: active ? "#eff6ff" : "#fff",
                          color: active ? "#1d4ed8" : "#111827",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {showProductDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      zIndex: 20,
                      width: "100%",
                      marginTop: 6,
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 8,
                      boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                      maxHeight: 280,
                      overflowY: "auto",
                    }}
                  >
                    {loading ? (
                      <div style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>
                        Loading products…
                      </div>
                    ) : Array.isArray(products) && products.length ? (
                      products.map((p) => {
                        const id = p._id || p.id;
                        const title = p.pro_title || p.product_name || "Untitled";
                        const sku = p.sku || "";
                        return (
                          <div
                            key={id}
                            onClick={() => onPickProduct(p)}
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #f3f4f6",
                              cursor: "pointer",
                            }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{sku}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>
                        No products found
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Col>

            <Col xs={24} md={8}>
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

        <Card style={gradientStyle}>
          <Table
            size="middle"
            columns={columns}
            dataSource={cart.items}
            rowKey="id"
            pagination={false}
            tableLayout="auto"
            scroll={{ x: "max-content" }}
            bordered={false}
            sticky
          />

          <Row justify="end" style={{ marginTop: 12 }}>
            <Col xs={24} md="auto" style={{ textAlign: "right" }}>
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

