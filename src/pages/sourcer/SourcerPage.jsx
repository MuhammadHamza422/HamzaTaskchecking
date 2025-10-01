
// /src/pages/sourcer/SourcerPage.jsx
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
  Spin,
  Alert,
} from "antd";
import { motion } from "framer-motion";
import { ArrowLeftOutlined, DeleteOutlined } from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import useProductSearch from "./hooks/useProductSearch";
import useCart from "./hooks/useCart";
import Swal from "sweetalert2";
import AppBreadcrumbs from "../../components/AppBreadCrumbs";
import SourcingLogsTimeline from "../SourcingLogsTimeline";

const { Option } = Select;
const { Title, Text } = Typography;

/* ------------------------ helpers & constants ------------------------ */

const gradientStyle = {
  background: "linear-gradient(to right, #f8fbff, #e0f2fe)",
  borderRadius: "12px",
  padding: "1rem",
  marginBottom: "1rem",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.06)",
};

const toNum = (v) => (typeof v === "number" ? v : Number(v) || 0);

// clamp to ≤ N decimals but keep a Number (not string)
const toFixedN = (n, digits = 4) => Number((toNum(n)).toFixed(digits));

// UI: always show 2 decimals
const fmt2 = (n) => toNum(n).toFixed(2);

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
      if (!/^https?:$/.test(url.protocol)) return Promise.reject(new Error("Link must start with http or https"));
      if (!url.hostname.includes(".")) return Promise.reject(new Error("URL must contain a valid domain (e.g. example.com)"));
      return Promise.resolve();
    } catch {
      return Promise.reject(new Error("Please enter a valid URL"));
    }
  },
});

const MAIN_COUNTRIES = [
  "United States","United Kingdom","Canada","Australia","Germany","France","Italy","Spain",
  "Netherlands","Sweden","Norway","Denmark","Switzerland","Belgium","Austria","Ireland",
  "Poland","Portugal","Czechia","Japan","South Korea","China","India","Pakistan",
  "United Arab Emirates","Saudi Arabia","Turkey","Mexico","Brazil","Argentina",
];
const COUNTRY_OPTIONS = MAIN_COUNTRIES.map((c) => ({ label: c, value: c }));

const baseToast = { toast: true, position: "top-end", showConfirmButton: false, timer: 4000, timerProgressBar: true, customClass: { popup: "rounded-lg" } };
const toastSuccess = (title = "Success!", text = "") => Swal.fire({ ...baseToast, icon: "success", title, text, background: "#10b981", color: "#fff" });
const toastError   = (title = "Something went wrong", text = "") => Swal.fire({ ...baseToast, icon: "error",   title, text, background: "#ef4444", color: "#fff" });

const TYPE_CODE_TO_NAME = { CON: "Console", HAN: "Handheld", ACC: "Accessory", GAM: "Game" };
const ProductType = { Accessory: "Accessory", Console: "Console", Game: "Game", Handheld: "Handheld" };

const getMarketSlug = (m) => {
  if (!m) return "";
  if (typeof m === "string") return m.toLowerCase();
  if (typeof m === "object") return (m.slug || m.name || "").toLowerCase();
  return String(m).toLowerCase();
};

const isMongoId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

/* ----------------------------- data hooks ---------------------------- */

export default function SourcerPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { user } = useAuth();
  const totals = Form.useWatch("totals", form);
  const headerWatch = Form.useWatch("header", form);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [logsTick, setLogsTick] = useState(0);

  const [typeCode, setTypeCode] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const { products, loading, debouncedSearch, fetchInitialProducts } = useProductSearch(typeCode);

  const cart = useCart(totals);
  const cartRef = useRef(cart);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  

  useEffect(() => {
    const onDocClick = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) setShowProductDropdown(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    debouncedSearch(val);
  };

  /* ----------------------- add to cart (local) ----------------------- */
  const addToCartLocal = (p) => {
    const name = p.pro_title || p.product_name || "Untitled";
    const code = p.type_code || p.product_type_code || "";
    const resolvedType = p.product_type || TYPE_CODE_TO_NAME[code] || ProductType.Game;

    cart.add({
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product_id: p._id || p.id || null, // real Mongo _id if present
      product_uid: p.uid || null,
      product_name: name,
      sku: p.sku || "",
      product_type: resolvedType,
      category: p.category || "",
      target_cost_per_unit: Number(p.target_cost_per_unit ?? p.target_cost) || 0,
      quantity_needed: 1,
      sourced_price: 0,
    });
  };

  const onPickProduct = (p) => {
    addToCartLocal(p);
    setShowProductDropdown(false);
    setSearchText("");
  };

  /* --------------------------- totals (UI) --------------------------- */

  const sellersPrice = toNum(totals?.sellers_price);
  const shippingCharges = toNum(totals?.shipping_charges);
  const taxes = toNum(totals?.taxes);

  // Total Target Cost (order) = Σ qty * target_cost_per_unit
  const targetTotalCost = useMemo(
    () =>
      cart.rawItems.reduce(
        (sum, i) => sum + toNum(i.target_cost_per_unit) * toNum(i.quantity_needed),
        0
      ),
    [cart.rawItems]
  );

  // Total Actual Cost (order header) = sellers_price + shipping + taxes
  const totalActualCost = useMemo(
    () => sellersPrice + shippingCharges + taxes,
    [sellersPrice, shippingCharges, taxes]
  );

  // Purchase Efficiency = target_total_cost − total_actual_cost (for display)
  const purchaseEfficiency = useMemo(
    () => targetTotalCost - totalActualCost,
    [targetTotalCost, totalActualCost]
  );

  // Seller allocation factor: sellers_price / target_total_cost
  const sellerAllocFactor = useMemo(
    () => (targetTotalCost > 0 ? sellersPrice / targetTotalCost : 0),
    [sellersPrice, targetTotalCost]
  );

  // Actual allocation factor: total_actual_cost / target_total_cost
  const actualAllocFactor = useMemo(
    () => (targetTotalCost > 0 ? totalActualCost / targetTotalCost : 0),
    [totalActualCost, targetTotalCost]
  );

  // validation: every row must have target_cost_per_unit > 0
  const invalidTargetsCount = useMemo(
    () => cart.rawItems.reduce((n, it) => n + (toNum(it.target_cost_per_unit) > 0 ? 0 : 1), 0),
    [cart.rawItems]
  );

  /* --------- optional: persist product target cost by SKU ---------- */
  const updateProductsTargetCosts = useCallback(async (items) => {
    const ops = items
      .filter((i) => i.sku && toNum(i.target_cost_per_unit) > 0)
      .map((i) => {
        const cost = toNum(i.target_cost_per_unit);
        const sku  = encodeURIComponent(i.sku);
        return apiClient.put(`/api/v1/products/sku/${sku}/target-cost`, { target_cost: cost });
      });

    if (!ops.length) return { ok: true, failed: 0, total: 0 };

    const results = await Promise.allSettled(ops);
    const failed = results.filter((r) => r.status === "rejected");
    failed.forEach((r) => console.error("target_cost update failed:", r.reason?.response?.data || r.reason));
    return { ok: failed.length === 0, failed: failed.length, total: results.length };
  }, []);

  /* ----------------------- markets / sellers ------------------------ */

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
        setMarketOpts(list.map((m) => ({ label: `${m.name} (${m.slug})`, value: m.slug, meta: m })));
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
    try {
      let slug = "";
      if (val === "__CREATE__") {
        const createName = option?.meta?.createName;
        const { data } = await apiClient.post("/api/v1/markets/find-or-create", { name: createName });
        slug = data.slug;
        const hPrev = form.getFieldValue("header") || {};
        form.setFieldsValue({ header: { ...hPrev, market: slug } });
        toastSuccess("Market added", `${data.name} (${data.slug})`);
      } else {
        slug = val;
        const hPrev = form.getFieldValue("header") || {};
        form.setFieldsValue({ header: { ...hPrev, market: slug } });
      }

      // ensure seller (by name) exists for that market if present
      const h = form.getFieldValue("header") || {};
      const sellerName = (h.seller_name || "").trim();

      if (sellerName) {
        try {
          const { data: s } = await apiClient.post("/api/v1/sellers/find-or-create", {
            name: sellerName,
            market: slug,
          });
          form.setFieldsValue({
            header: { ...h, market: slug, seller_id: s._id, seller_name: s.name },
          });
          setSellerOptions([{ label: s.name, value: s._id, meta: s }]);
          toastSuccess("Seller ready", `${s.name} on ${slug}`);
        } catch (e) {
          const h2 = form.getFieldValue("header") || {};
          form.setFieldsValue({ header: { ...h2, market: slug, seller_id: undefined } });
          toastError("Could not ensure seller", e?.response?.data?.message || "");
        }
      } else {
        const h2 = form.getFieldValue("header") || {};
        form.setFieldsValue({ header: { ...h2, market: slug, seller_id: undefined } });
        setSellerOptions([]);
      }
    } catch (e) {
      toastError("Market selection failed", e?.response?.data?.message || "");
    }
  };

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
        const { data } = await apiClient.get("/api/v1/sellers", { params: { q, market } });
        const list = Array.isArray(data) ? data : data?.data || [];
        setSellerOptions(list.map((s) => ({ label: s.name, value: s._id, meta: s })));
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
      : [...sellerOptions, { label: `Create “${q}”`, value: "__CREATE__", meta: { createName: q } }];
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
        Swal.fire({ ...baseToast, icon: "info", title: "Please select a marketplace first" });
        return;
      }
      try {
        const { data } = await apiClient.post("/api/v1/sellers/find-or-create", { name: createName, market });
        const h = form.getFieldValue("header") || {};
        form.setFieldsValue({ header: { ...h, seller_name: data.name, seller_id: data._id } });
        toastSuccess("Seller added", `${data.name}`);
      } catch (e) {
        toastError("Could not create seller", e?.response?.data?.message || "");
      }
    } else {
      const h = form.getFieldValue("header") || {};
      form.setFieldsValue({ header: { ...h, seller_name: option?.label, seller_id: val } });
    }
  };

  useEffect(() => {
    const market = headerWatch?.market;
    if (!market) return;
  }, [headerWatch?.market]); // eslint-disable-line

  /* -------------------------- load order (edit) -------------------------- */

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoadingOrder(true);
        const { data } = await apiClient.get(`/api/v1/sourcing/${id}`);
        if (cancelled) return;

        form.setFieldsValue({
          header: {
            listing_link: data?.listing_link || "",
            seller_name: data?.seller?.name || "",
            seller_id: data?.seller?._id || undefined,
            market: getMarketSlug(data?.seller?.market || data?.market || "ebay"),
            origin: data?.origin || undefined,
          },
          totals: {
            sellers_price: toNum(data?.sellers_price),
            shipping_charges: toNum(data?.shipping_charges),
            taxes: toNum(data?.taxes),
          },
        });

        // items -> cart
        const items = Array.isArray(data?.items) ? data.items : [];
        const totalUnits = items.reduce((s, it) => s + toNum(it.quantity_needed || 1), 0);
        const orderTargetTotal = toNum(data?.target_total_cost);
        const derivedTargetPerUnit = totalUnits > 0 && orderTargetTotal > 0 ? orderTargetTotal / totalUnits : 0;

        cartRef.current.reset();
        items.forEach((it) => {
          cartRef.current.add({
            id: it._id,
            product_id: it.product || null,
            product_name: it.name || it.product_name || "Untitled",
            sku: it.sku || "",
            product_type: it.product_type || "Game",
            category: it.category || "",
            target_cost_per_unit: toNum(it.target_cost_per_unit) || derivedTargetPerUnit,
            quantity_needed: toNum(it.quantity_needed || 1),
            sourced_price: 0,
          });
        });
        setLogsTick((n) => n + 1);
      } catch (err) {
        if (!cancelled) toastError("Failed to load order", err?.response?.data?.message || err?.message || "");
      } finally {
        if (!cancelled) setLoadingOrder(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEdit, id, form]); // eslint-disable-line

  /* ------------------ build items with per-unit fields ------------------ */

  /**
   * Per-line payload (4 dp to DB, 2 dp in UI):
   * - total_target_cost        = qty * target_cost_per_unit
   * - sellers_price_per_unit   = (sellers_price / target_total_cost)  * target_cost_per_unit
   * - actual_cost_per_unit     = (total_actual_cost / target_total_cost) * target_cost_per_unit
   */
  const buildItemsForSave = (cartItems, sellersPriceNum, totalActualCostNum, targetTotalCostNum) => {
    const sellerAlloc = targetTotalCostNum > 0 ? sellersPriceNum    / targetTotalCostNum : 0;
    const actualAlloc = targetTotalCostNum > 0 ? totalActualCostNum / targetTotalCostNum : 0;

    return cartItems.map((i) => {
      const qty = toNum(i.quantity_needed) || 1;
      const tpu = toNum(i.target_cost_per_unit);

      return {
        ...(isMongoId(i.id) ? { _id: i.id } : {}),
        ...(isMongoId(i.product_id) ? { product: i.product_id } : {}),

        product_name: i.product_name || "Untitled",
        sku: i.sku || "",
        quantity_needed: qty,
        product_type: i.product_type || "Game",
        category: i.category || "",
        tested: !!i.tested,
        product_condition: i.product_condition ?? null,

        // financials to DB (4 dp)
        target_cost_per_unit:     toFixedN(tpu, 4),
        total_target_cost:        toFixedN(qty * tpu, 4),
        sellers_price_per_unit:   toFixedN(sellerAlloc * tpu, 4),
        actual_cost_per_unit:     toFixedN(actualAlloc * tpu, 4),
      };
    });
  };

  /* ------------------------------ submit ------------------------------ */

  const onSubmit = async () => {
    if (!cartRef.current.rawItems.length) {
      Swal.fire({ ...baseToast, icon: "info", title: "Cart is empty", text: "Add at least one product to proceed." });
      return;
    }
    if (cartRef.current.rawItems.some((it) => !(toNum(it.target_cost_per_unit) > 0))) {
      Swal.fire({
        ...baseToast,
        icon: "error",
        title: "Missing Target $ per unit",
        text: "Please enter a positive Target $ per unit for every item.",
        background: "#ef4444",
        color: "#fff",
      });
      return;
    }
    if (!user?.id) {
      Swal.fire({ ...baseToast, icon: "info", title: "Please log in first" });
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsLive = cartRef.current.rawItems;

      // optional: persist product target costs (by SKU)
      const upd = await updateProductsTargetCosts(itemsLive);
      if (upd?.failed > 0) {
        toastError("Some products were not updated", `${upd.failed}/${upd.total} target costs failed to save to product.`);
      }

      const values = await form.validateFields();

      // order header numbers
      const sellersPriceNum = toNum(values?.totals?.sellers_price);
      const shippingNum = toNum(values?.totals?.shipping_charges);
      const taxesNum = toNum(values?.totals?.taxes);

      // rollups (Numbers)
      const liveTargetTotal = itemsLive.reduce(
        (sum, i) => sum + toNum(i.target_cost_per_unit) * toNum(i.quantity_needed),
        0
      );
      const liveActualTotal = sellersPriceNum + shippingNum + taxesNum;

      const itemsPayload = buildItemsForSave(
        itemsLive,
        sellersPriceNum,
        liveActualTotal,
        liveTargetTotal
      );

      const payload = {
        sourcer_id: user?.id,
        seller: values.header?.seller_id || undefined,
        listing_link: normalizeListingLink(values.header?.listing_link),
        origin: values.header?.origin ?? "",

        // header totals (Numbers → 4 dp)
        sellers_price: toFixedN(sellersPriceNum, 4),
        shipping_charges: toFixedN(shippingNum, 4),
        taxes: toFixedN(taxesNum, 4),

        // order rollups (Numbers → 4 dp)
        target_total_cost: toFixedN(liveTargetTotal, 4),                     // ← Total Target Cost
        total_actual_cost: toFixedN(liveActualTotal, 4),
        purchase_efficiency: toFixedN(liveTargetTotal - liveActualTotal, 4),

        items: itemsPayload,
      };

      console.log("Sourcing payload (submit)", payload);

      if (isEdit) {
        await apiClient.patch(`/api/v1/sourcing/${id}`, payload, { headers: { "Content-Type": "application/json" } });
        toastSuccess("Record Updated!", "Your sourcing order has been updated.");
      } else {
        await apiClient.post("/api/v1/sourcing", payload, { headers: { "Content-Type": "application/json" } });
        toastSuccess("Record Created Successfully!", "Your sourcing order has been created.");
      }
      navigate("/sourcing/orders");
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      toastError(isEdit ? "Failed to update order" : "Failed to create order", apiMsg || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ----------------------------- table cols ----------------------------- */

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
        title: "Qty",
        dataIndex: "quantity_needed",
        width: 96,
        render: (val, rec) => (
          <InputNumber
            min={1}
            size="large"
            value={val}
            onChange={(v) => {
              const nextQty = Number(v) || 1;
              cart.update(rec.id, { quantity_needed: nextQty });
            }}
          />
        ),
      },
      {
        title: "Type",
        dataIndex: "product_type",
        width: 140,
        render: (val, rec) => (
          <Select
            value={val}
            style={{ width: "100%" }}
            onChange={(newType) => {
              cart.update(rec.id, { product_type: newType });
            }}
          >
            {Object.values(ProductType).map((type) => (
              <Option key={type} value={type}>{type}</Option>
            ))}
          </Select>
        ),
      },
      {
        title: "Target $ / unit *",
        dataIndex: "target_cost_per_unit",
        width: 180,
        render: (v, rec) => {
          const valNum = toNum(v);
          const isInvalid = !(valNum > 0);
          return (
            <InputNumber
              min={0.0001}
              step={0.01}
              size="large"
              value={Number.isFinite(valNum) && valNum > 0 ? valNum : null}
              onChange={(n) => {
                const next = toNum(n);
                cart.update(rec.id, { target_cost_per_unit: next });
              }}
              formatter={(x) => (x == null ? "" : String(x))}
              style={{
                width: "100%",
                borderColor: isInvalid ? "#ef4444" : undefined,
                boxShadow: isInvalid ? "0 0 0 2px rgba(239,68,68,0.15)" : undefined,
              }}
              placeholder="Enter target per unit"
            />
          );
        },
      },
      {
        title: "Total Target (line)",
        key: "total_target_cost_line",
        width: 150,
        render: (_v, rec) => {
          const qty = toNum(rec.quantity_needed);
          const target = toNum(rec.target_cost_per_unit);
          return `$${fmt2(qty * target)}`;
        },
      },
      {
        title: "Seller $ / unit",
        key: "sellers_price_per_unit",
        width: 150,
        render: (_v, rec) => {
          const tpu = toNum(rec.target_cost_per_unit);
          const perUnit = sellerAllocFactor * tpu; // (sellers_price / target_total_cost) * tpu
          return <InputNumber disabled size="large" value={Number(fmt2(perUnit))} />;
        },
      },
      {
        title: "Actual $ / unit",
        key: "actual_cost_per_unit",
        width: 150,
        render: (_v, rec) => {
          const tpu = toNum(rec.target_cost_per_unit);
          const perUnit = actualAllocFactor * tpu; // (total_actual_cost / target_total_cost) * tpu
          return <InputNumber disabled size="large" value={Number(fmt2(perUnit))} />;
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
            onClick={() => {
              cart.remove(rec.id);
            }}
          />
        ),
      },
    ],
    [cart, sellerAllocFactor, actualAllocFactor]
  );

  /* -------------------------------- render ------------------------------- */

  return (
    <div style={{ padding: "1.5rem", borderRadius: 10, position: "relative" }}>

        <div className="mb-2">
    <Button
      size="middle"
      icon={<ArrowLeftOutlined />}
      onClick={() => {
        if (window.history.length > 1) navigate(-1);
        else navigate("/sourcing/orders");
      }}
      className="
        !rounded-md        /* rectangular corners */
        !h-9 !px-3         /* tidy height & padding */
        bg-white hover:!bg-gray-50
        border border-gray-300
        shadow-sm hover:shadow
        text-gray-700
      "
    >
      Back
    </Button>
  </div>
      <AppBreadcrumbs fromLocation hide={["orders"]} />

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
          header: { market: "ebay" },
          totals: { sellers_price: 0, shipping_charges: 0, taxes: 0 },
        }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Title level={3}>{isEdit ? "Edit Sourcing Order" : "New Sourcing Order"}</Title>
        </motion.div>

        <Card style={gradientStyle}>
          <Row gutter={[12, 12]} align="top">
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={["header", "listing_link"]}
                label="Listing Link"
                hasFeedback
                validateFirst
                validateTrigger={["onChange", "onBlur"]}
                rules={[{ required: true, message: "Listing link is required" }, listingLinkRule()]}
              >
                <Input
                  size="large"
                  placeholder="example.com/item/123"
                  onBlur={(e) => {
                    const fixed = ensureHttp(e.target.value);
                    if (fixed && fixed !== e.target.value) {
                      const current = form.getFieldValue("header") || {};
                      form.setFieldsValue({ header: { ...current, listing_link: fixed } });
                    }
                  }}
                  onPressEnter={(e) => {
                    const fixed = ensureHttp(e.currentTarget.value);
                    if (fixed && fixed !== e.currentTarget.value) {
                      const current = form.getFieldValue("header") || {};
                      form.setFieldsValue({ header: { ...current, listing_link: fixed } });
                    }
                  }}
                />
              </Form.Item>
            </Col>

            <Form.Item name={["header", "seller_id"]} hidden>
              <Input />
            </Form.Item>

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
                    const h = form.getFieldValue("header") || {};
                    form.setFieldsValue({
                      header: { ...h, market: undefined, seller_id: undefined },
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
                  onClear={() => {
                    const h = form.getFieldValue("header") || {};
                    form.setFieldsValue({ header: { ...h, seller_id: undefined, seller_name: undefined } });
                  }}
                  value={form.getFieldValue(["header", "seller_name"]) || undefined}
                  onChange={() => {}}
                  notFoundContent={sellerLoading ? "Loading..." : null}
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
                  filterOption={(input, option) => (option?.label ?? "").toLowerCase().includes(input.toLowerCase())}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

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
                      <div style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>Loading products…</div>
                    ) : Array.isArray(products) && products.length ? (
                      products.map((p) => {
                        const idp = p._id || p.id;
                        const title = p.pro_title || p.product_name || "Untitled";
                        const sku = p.sku || "";
                        return (
                          <div
                            key={idp}
                            onClick={() => onPickProduct(p)}
                            style={{ padding: "10px 12px", borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
                            <div style={{ fontSize: 12, color: "#6b7280" }}>{sku}</div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>No products found</div>
                    )}
                  </div>
                )}
              </div>
            </Col>

            <Col xs={24} md={8}>
              <Statistic
                title="Efficiency (Target − Actual)"
                prefix="$"
                value={Number(fmt2(purchaseEfficiency))}
                precision={2}
                valueStyle={{ color: purchaseEfficiency >= 0 ? "green" : "red" }}
              />
            </Col>
          </Row>
        </Card>

        <Card style={gradientStyle}>
          {invalidTargetsCount > 0 && (
            <Alert
              type="error"
              showIcon
              style={{ marginBottom: 12 }}
              message="Target $ per unit is required"
              description={`Please enter a positive Target $ per unit for all items. (${invalidTargetsCount} missing)`}
            />
          )}

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
                title="Total Target Cost"
                prefix="$"
                value={Number(fmt2(targetTotalCost))}
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
                title="Total Actual Cost"
                prefix="$"
                value={Number(fmt2(totalActualCost))}
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
            disabled={!cart.rawItems.length || invalidTargetsCount > 0 || isSubmitting}
            style={{ padding: "0.75rem 2rem", fontWeight: 600, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}
          >
            {isEdit ? "Save Changes" : "Create Record"}
          </Button>
        </motion.div>
      </Form>

      {isEdit && (
        <div style={{ marginTop: 16 }}>
          <SourcingLogsTimeline targetId={id} refreshKey={logsTick} title="Activity Log" />
        </div>
      )}
    </div>
  );
}
