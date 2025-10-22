
// /src/pages/sourcer/SourcerPage.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  Tooltip,
} from "antd";
import { motion } from "framer-motion";
import {
  ArrowLeftOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  CarOutlined,
  ShopOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import {
  useQuery,
  useQueryClient,
  useMutation,
} from "@tanstack/react-query";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import useProductSearch from "./hooks/useProductSearch";
import useCart from "./hooks/useCart";
import Swal from "sweetalert2";
import AppBreadcrumbs from "../../components/AppBreadCrumbs";
import SourcingLogsTimeline from "../SourcingLogsTimeline";

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
const toFixedN = (n, digits = 4) => Number(toNum(n).toFixed(digits));

const fmtMoneySigned = (n) => {
  const v = toNum(n);
  const neg = v < 0;
  const abs = Math.abs(v);
  const s = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${neg ? "- " : ""}$${s}`;
};

const fmtPercentSigned = (pct) => {
  const v = toNum(pct);
  const neg = v < 0;
  const s = Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${neg ? "-" : ""}${s}%`;
};

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
      if (!/^https?:$/.test(url.protocol))
        return Promise.reject(new Error("Link must start with http or https"));
      if (!url.hostname.includes("."))
        return Promise.reject(
          new Error("URL must contain a valid domain (e.g. example.com)")
        );
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

const baseToast = {
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 4000,
  timerProgressBar: true,
  customClass: { popup: "rounded-lg" },
};
const toastSuccess = (title = "Success!", text = "") =>
  Swal.fire({
    ...baseToast,
    icon: "success",
    title,
    text,
    background: "#10b981",
    color: "#fff",
  });
const toastError = (title = "Something went wrong", text = "") =>
  Swal.fire({
    ...baseToast,
    icon: "error",
    title,
    text,
    background: "#ef4444",
    color: "#fff",
  });

const TYPE_CODE_TO_NAME = { CON: "Console", HAN: "Handheld", ACC: "Accessory", GAM: "Game" };
const ProductType = { Accessory: "Accessory", Console: "Console", Game: "Game", Handheld: "Handheld" };

const getMarketSlug = (m) => {
  if (!m) return "";
  if (typeof m === "string") return m.toLowerCase();
  if (typeof m === "object") return (m.slug || m.name || "").toLowerCase();
  return String(m).toLowerCase();
};

const isMongoId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

/* ---------- Tooltip helpers ---------- */
const tipCommon = {
  getPopupContainer: () => document.body,
  overlayStyle: { zIndex: 1090 },
  placement: "top",
};

const TitleWithTip = ({ label, tip }) => (
  <Tooltip title={tip} {...tipCommon}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "help" }}>
      {label}
      <InfoCircleOutlined style={{ fontSize: 14, color: "#64748b" }} />
    </span>
  </Tooltip>
);
const colTitle = (label, tip) => <TitleWithTip label={label} tip={tip} />;
const statTitle = (label, tip) => <TitleWithTip label={label} tip={tip} />;

/* -------- Minimal Shipping Mode radio pills (Tailwind) -------- */

function ShippingModeRadio({ value = "supplier", onChange }) {
  const opts = [
    { key: "supplier", label: "Shipping by supplier", Icon: ShopOutlined },
    { key: "self", label: "Self managed", Icon: CarOutlined },
  ];

  return (
    <div className="inline-flex gap-2">
      {opts.map(({ key, label, Icon }) => {
        const active = value === key;
        return (
          <label
            key={key}
            className={[
              "cursor-pointer inline-flex items-center rounded-md border text-[12px] leading-none",
              "px-3 py-1 transition whitespace-nowrap select-none",
              active
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
            ].join(" ")}
          >
            <input
              type="radio"
              name="shipping_mode"
              className="sr-only"
              checked={active}
              onChange={() => onChange?.(key)}
            />
            <Icon style={{ fontSize: 12 }} className="mr-1" />
            {label}
          </label>
        );
      })}
    </div>
  );
}

/* ============================ React Query fns ============================ */
const fetchOrder = async (id) => {
  const { data } = await apiClient.get(`/api/v1/sourcing/${id}`);
  return data;
};
const searchMarkets = async (q) => {
  const { data } = await apiClient.get("/api/v1/markets", { params: { q } });
  const list = Array.isArray(data) ? data : data?.data || [];
  return list.map((m) => {
    const slug = (m.slug || m.name || "").toLowerCase();
    return { label: slug, value: slug, meta: { ...m, slug } };
  });
};
const searchSellers = async ({ q, market }) => {
  if (!market) return [];
  const { data } = await apiClient.get("/api/v1/sellers", { params: { q, market } });
  const list = Array.isArray(data) ? data : data?.data || [];
  return list.map((s) => ({ label: s.name, value: s._id, meta: s }));
};

/* ----------------------------- component ----------------------------- */

export default function SourcerPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logsTick, setLogsTick] = useState(0);

  const [typeCode, setTypeCode] = useState("");
  const [searchText, setSearchText] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const {
    products,
    loading,
    debouncedSearch,
    fetchInitialProducts,
    fetchProducts,
    setTerm,
  } = useProductSearch(typeCode);

  const totals = Form.useWatch("totals", form);
  const marketWatch = Form.useWatch(["header", "market"], form);

  const cart = useCart(totals);
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // click outside to close product dropdown
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  /* ---------------- market/seller lookups with caching ---------------- */
  const [marketQuery, setMarketQuery] = useState("");
  const marketsQ = useQuery({
    queryKey: ["markets", marketQuery.trim().toLowerCase()],
    queryFn: () => searchMarkets(marketQuery),
    enabled: marketQuery.trim().length > 0,
    staleTime: 300_000,
    gcTime: 600_000,
    keepPreviousData: true,
    select: (rows) =>
      rows.map((m) => {
        const slug = (m.meta?.slug || m.value || "").toLowerCase();
        return { label: slug, value: slug, meta: { ...m.meta, slug } };
      }),
  });
  const marketOpts = marketsQ.data || [];
  const marketLoading = marketsQ.isFetching;

  const debouncedMarketSearch = useMemo(() => {
    let t;
    const fn = (q) => {
      clearTimeout(t);
      t = setTimeout(() => setMarketQuery(q || ""), 300);
    };
    fn.cancel = () => clearTimeout(t);
    return fn;
  }, []);

  const marketOptionsWithCreate = useMemo(() => {
    const q = String(marketQuery || "").trim().toLowerCase();
    if (!q) return marketOpts;
    const exists = marketOpts.some(
      (o) =>
        (o.meta?.slug || "").toLowerCase() === q ||
        (o.meta?.name || "").toLowerCase() === q
    );
    return exists
      ? marketOpts
      : [...marketOpts, { label: `Create “${q}”`, value: "__CREATE__", meta: { createName: q } }];
  }, [marketOpts, marketQuery]);

  const [sellerQuery, setSellerQuery] = useState("");
  const sellersQ = useQuery({
    queryKey: ["sellers", String(marketWatch || ""), sellerQuery.trim()],
    queryFn: () => searchSellers({ q: sellerQuery, market: marketWatch }),
    enabled: !!marketWatch,
    staleTime: 300_000,
    gcTime: 600_000,
    keepPreviousData: true,
    select: (rows) => rows.map((s) => ({ label: s.label, value: s.value, meta: s.meta })),
  });
  const sellerOptions = sellersQ.data || [];
  const sellerLoading = sellersQ.isFetching;

  const debouncedSellerSearch = useMemo(() => {
    let t;
    const fn = (q) => {
      clearTimeout(t);
      t = setTimeout(() => setSellerQuery(q || ""), 300);
    };
    fn.cancel = () => clearTimeout(t);
    return fn;
  }, []);

  const sellerOptionsWithCreate = useMemo(() => {
    const q = String(sellerQuery || "").trim();
    if (!q) return sellerOptions;
    const exact = sellerOptions.some((o) => (o.label || "").toLowerCase() === q.toLowerCase());
    return exact ? sellerOptions : [...sellerOptions, { label: `Create “${q}”`, value: "__CREATE__", meta: { createName: q } }];
  }, [sellerOptions, sellerQuery]);

  /* ---------------- logs + market change tracking ---------------- */
  const prevMarketRef = useRef(null);

  const logDiff = useCallback(
    async (diffArr) => {
      try {
        if (!isEdit || !id || !Array.isArray(diffArr) || !diffArr.length) return;
        await apiClient.post("/api/v1/userlogs", {
          targetId: id,
          action: "UPDATE",
          diff: diffArr.map((d) => ({ field: d.field, from: d.from, to: d.to })),
        });
        setLogsTick((n) => n + 1);
      } catch {
        // ignore log failures
      }
    },
    [isEdit, id]
  );

  /* ------------------------ product search UX ------------------------ */
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    setShowProductDropdown(true);
    debouncedSearch(val);
  };

  const addToCartLocal = useCallback((p) => {
    const name = p.pro_title || p.product_name || "Untitled";
    const code = p.type_code || p.product_type_code || "";
    const resolvedType = p.product_type || TYPE_CODE_TO_NAME[code] || ProductType.Game;

    cart.add({
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      product_id: p._id || p.id || null,
      product_uid: p.uid || null,
      product_name: name,
      sku: p.sku || "",
      product_type: resolvedType,
      category: p.category || "",
      target_cost_per_unit: Number(p.target_cost_per_unit ?? p.target_cost) || 0,
      quantity_needed: 1,
      sourced_price: 0,
    });
  }, [cart]);

  const onPickProduct = useCallback((p) => {
    addToCartLocal(p);
    setSearchText("");
    setTerm("");
    fetchInitialProducts();
    inputRef.current?.focus();
  }, [addToCartLocal, setTerm, fetchInitialProducts]);

  /* --------------------------- totals derived --------------------------- */
  const sellersPrice = toNum(totals?.sellers_price);
  const shippingCharges = toNum(totals?.shipping_charges);
  const taxes = toNum(totals?.taxes);

  const targetTotalCost = useMemo(
    () =>
      cart.rawItems.reduce(
        (sum, i) => sum + toNum(i.target_cost_per_unit) * toNum(i.quantity_needed),
        0
      ),
    [cart.rawItems]
  );

  const totalActualCost = useMemo(
    () => sellersPrice + shippingCharges + taxes,
    [sellersPrice, shippingCharges, taxes]
  );

  const totalSavings = useMemo(
    () => targetTotalCost - totalActualCost,
    [targetTotalCost, totalActualCost]
  );

  const efficiencyPct = useMemo(
    () => (targetTotalCost > 0 ? (totalSavings / targetTotalCost) * 100 : null),
    [totalSavings, targetTotalCost]
  );

  const sellerAllocFactor = useMemo(
    () => (targetTotalCost > 0 ? sellersPrice / targetTotalCost : 0),
    [sellersPrice, targetTotalCost]
  );

  const actualAllocFactor = useMemo(
    () => (targetTotalCost > 0 ? totalActualCost / targetTotalCost : 0),
    [totalActualCost, targetTotalCost]
  );

  const invalidTargetsCount = useMemo(
    () => cart.rawItems.reduce((n, it) => n + (toNum(it.target_cost_per_unit) > 0 ? 0 : 1), 0),
    [cart.rawItems]
  );

  /* -------------------------- load order (edit) -------------------------- */
  const orderQ = useQuery({
    queryKey: ["sourcing", String(id || "")],
    queryFn: () => fetchOrder(id),
    enabled: isEdit && !!id,
    staleTime: 60_000,
    gcTime: 600_000,
    refetchOnWindowFocus: "always",
    keepPreviousData: true,
    retry: 1,
    select: (data) => {
      const marketSlug = getMarketSlug(data?.seller?.market || data?.market || "");
      const items = Array.isArray(data?.items) ? data.items : [];
      const totalUnits = items.reduce((s, it) => s + toNum(it.quantity_needed || 1), 0);
      const orderTargetTotal = toNum(data?.target_total_cost);
      const derivedTargetPerUnit =
        totalUnits > 0 && orderTargetTotal > 0 ? orderTargetTotal / totalUnits : 0;

      return {
        formHeader: {
          listing_link: data?.listing_link || "",
          seller_name: data?.seller?.name || "",
          seller_id: data?.seller?._id || undefined,
          market: marketSlug,
          origin: data?.origin || undefined,
        },
        formTotals: {
          sellers_price: toNum(data?.sellers_price),
          shipping_charges: toNum(data?.shipping_charges),
          taxes: toNum(data?.taxes),
          shipping_mode: data?.shipping_mode || "supplier",
        },
        cartItems: items.map((it) => ({
          id: it._id,
          product_id: it.product || null,
          product_name: it.name || it.product_name || "Untitled",
          sku: it.sku || "",
          product_type: it.product_type || "Game",
          category: it.category || "",
          target_cost_per_unit: toNum(it.target_cost_per_unit) || derivedTargetPerUnit,
          quantity_needed: toNum(it.quantity_needed || 1),
          sourced_price: 0,
        })),
        marketSlug,
      };
    },
  });

  useEffect(() => {
    if (!orderQ.data) return;
    const { formHeader, formTotals, cartItems, marketSlug } = orderQ.data;

    prevMarketRef.current = marketSlug;
    form.setFieldsValue({ header: formHeader, totals: formTotals });

    cartRef.current.reset();
    cartItems.forEach(cartRef.current.add);
    setLogsTick((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderQ.data]);

  /* --------- log market changes on edit --------- */
  useEffect(() => {
    if (!isEdit || !id) return;
    const current = (marketWatch || "")?.toLowerCase() || "";
    if (prevMarketRef.current === null) {
      prevMarketRef.current = current;
      return;
    }
    const prev = prevMarketRef.current || "";
    if (current && prev && current !== prev) {
      logDiff([{ field: "market", from: prev, to: current }]);
      prevMarketRef.current = current;
    }
  }, [marketWatch, isEdit, id, logDiff]);

  /* ---------------- market/seller select handlers (create inline) ---------------- */
  const onMarketSelect = async (val, option) => {
    try {
      const hPrev = form.getFieldValue("header") || {};
      let slug = "";

      if (val === "__CREATE__") {
        const createName = (option?.meta?.createName || "").toLowerCase();
        const { data } = await apiClient.post("/api/v1/markets/find-or-create", { name: createName });
        slug = (data.slug || data.name || createName).toLowerCase();
        form.setFieldsValue({ header: { ...hPrev, market: slug } });
        toastSuccess("Market added", slug);
      } else {
        slug = String(val).toLowerCase();
        form.setFieldsValue({ header: { ...hPrev, market: slug } });
      }

      // sellers cache is keyed by market—refresh it
      queryClient.invalidateQueries({ queryKey: ["sellers"] });

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
          toastSuccess("Seller ready", `${s.name} on ${slug}`);
        } catch (e) {
          const h2 = form.getFieldValue("header") || {};
          form.setFieldsValue({ header: { ...h2, market: slug, seller_id: undefined } });
          toastError("Could not ensure seller", e?.response?.data?.message || "");
        }
      } else {
        const h2 = form.getFieldValue("header") || {};
        form.setFieldsValue({ header: { ...h2, market: slug, seller_id: undefined } });
      }
    } catch (e) {
      toastError("Market selection failed", e?.response?.data?.message || "");
    }
  };

  const handleSellerSearch = (val) => {
    debouncedSellerSearch(val);
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

  /* ------------------ build items with per-unit fields ------------------ */
  const buildItemsForSave = (cartItems, sellersPriceNum, totalActualCostNum, targetTotalCostNum) => {
    const sellerAlloc = targetTotalCostNum > 0 ? sellersPriceNum / targetTotalCostNum : 0;
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

        target_cost_per_unit: toFixedN(tpu, 4),
        total_target_cost: toFixedN(qty * tpu, 4),
        sellers_price_per_unit: toFixedN(sellerAlloc * tpu, 4),
        actual_cost_per_unit: toFixedN(actualAlloc * tpu, 4),
      };
    });
  };

  /* --------------------------- mutations (writes) --------------------------- */
  const saveTargetCostsM = useMutation({
    mutationFn: async (items) => {
      const ops = items
        .filter((i) => i.sku && toNum(i.target_cost_per_unit) > 0)
        .map((i) => {
          const cost = toNum(i.target_cost_per_unit);
          const sku = encodeURIComponent(i.sku);
          return apiClient.put(`/api/v1/products/sku/${sku}/target-cost`, { target_cost: cost });
        });
      const settled = await Promise.allSettled(ops);
      const failed = settled.filter((r) => r.status === "rejected").length;
      return { total: settled.length, failed };
    },
  });

  const upsertSourcingM = useMutation({
    mutationFn: async ({ isEdit, id, payload }) => {
      if (isEdit) {
        await apiClient.patch(`/api/v1/sourcing/${id}`, payload, {
          headers: { "Content-Type": "application/json" },
        });
        return { mode: "update" };
      }
      await apiClient.post("/api/v1/sourcing", payload, {
        headers: { "Content-Type": "application/json" },
      });
      return { mode: "create" };
    },
    onSuccess: (_, { isEdit, id }) => {
      // Invalidate lists and detail pages that might reference this order
      queryClient.invalidateQueries({ queryKey: ["pendingRequests"] });
      queryClient.invalidateQueries({ queryKey: ["sourcing"] });
      if (isEdit && id) {
        queryClient.invalidateQueries({ queryKey: ["sourcing", String(id)] });
      }
    },
  });

  /* ------------------------------ submit ------------------------------ */
  const onSubmit = async () => {
    if (!cartRef.current.rawItems.length) {
      Swal.fire({
        ...baseToast,
        icon: "info",
        title: "Cart is empty",
        text: "Add at least one product to proceed.",
      });
      return;
    }
    if (cartRef.current.rawItems.some((it) => !(toNum(it.target_cost_per_unit) > 0))) {
      Swal.fire({
        ...baseToast,
        icon: "error",
        title: "Missing Target Cost per unit",
        text: "Please enter a positive Target Cost per unit for every item.",
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

      // 1) Save target costs
      const { failed, total } = await saveTargetCostsM.mutateAsync(itemsLive);
      if (failed > 0) {
        toastError(
          "Some products were not updated",
          `${failed}/${total} target costs failed to save to product.`
        );
      }

      // 2) Validate and compute payload
      const values = await form.validateFields();

      const sellersPriceNum = toNum(values?.totals?.sellers_price);
      const shippingNum = toNum(values?.totals?.shipping_charges);
      const taxesNum = toNum(values?.totals?.taxes);
      const shippingMode = values?.totals?.shipping_mode || "supplier";

      const liveTargetTotal = itemsLive.reduce(
        (sum, i) => sum + toNum(i.target_cost_per_unit) * toNum(i.quantity_needed),
        0
      );
      const liveActualTotal = sellersPriceNum + shippingNum + taxesNum;

      const itemsPayload = buildItemsForSave(
        itemsLive, sellersPriceNum, liveActualTotal, liveTargetTotal
      );

      const payload = {
        sourcer_id: user?.id,
        seller: values.header?.seller_id || undefined,
        listing_link: normalizeListingLink(values.header?.listing_link),
        origin: values.header?.origin ?? "",

        sellers_price: toFixedN(sellersPriceNum, 4),
        shipping_charges: toFixedN(shippingNum, 4),
        taxes: toFixedN(taxesNum, 4),

        target_total_cost: toFixedN(liveTargetTotal, 4),
        total_actual_cost: toFixedN(liveActualTotal, 4),
        purchase_efficiency: toFixedN(liveTargetTotal - liveActualTotal, 4),

        items: itemsPayload,
        shipping_mode: shippingMode,
      };

      const res = await upsertSourcingM.mutateAsync({ isEdit, id, payload });
      if (res?.mode === "update") {
        toastSuccess("Record Updated!", "Your sourcing order has been updated.");
      } else {
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
            <Text type="secondary" style={{ fontSize: 12 }}>
              {rec.sku}
            </Text>
          </div>
        ),
        fixed: "left",
        width: 260,
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
        title: colTitle("Type", "Product type/category for this item."),
        dataIndex: "product_type",
        width: 140,
        render: (val, rec) => (
          <Select
            value={val}
            style={{ width: "100%" }}
            onChange={(newType) => {
              cart.update(rec.id, { product_type: newType });
            }}
            options={Object.values(ProductType).map((type) => ({ value: type, label: type }))}
          />
        ),
      },
      {
        title: colTitle("Target Cost / unit", "Per-unit target cost for this item."),
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
        title: colTitle("Target Cost", "Qty × Target Cost / unit"),
        key: "total_target_cost_line",
        width: 160,
        align: "center",
        render: (_v, rec) => {
          const qty = toNum(rec.quantity_needed);
          const tpu = toNum(rec.target_cost_per_unit);
          return <span style={{ fontWeight: 700 }}>{fmtMoneySigned(qty * tpu)}</span>;
        },
      },
      {
        title: colTitle(
          "Seller price / unit",
          "Order-level Seller Price allocated to this item per unit: (Seller Price ÷ Total Target Cost) × Target Cost / unit."
        ),
        key: "sellers_price_per_unit",
        width: 190,
        align: "center",
        render: (_v, rec) => {
          const tpu = toNum(rec.target_cost_per_unit);
          const perUnit = sellerAllocFactor * tpu;
          return <span>{fmtMoneySigned(perUnit)}</span>;
        },
      },
      {
        title: colTitle(
          "Actual cost / unit",
          "Order-level Total Actual Cost allocated to this item per unit: (Total Actual Cost ÷ Total Target Cost) × Target Cost / unit."
        ),
        key: "actual_cost_per_unit",
        width: 190,
        align: "center",
        render: (_v, rec) => {
          const tpu = toNum(rec.target_cost_per_unit);
          const perUnit = actualAllocFactor * tpu;
          return <span>{fmtMoneySigned(perUnit)}</span>;
        },
      },
      {
        title: colTitle(
          "Saving / Unit",
          "Target Cost / unit − Actual cost / unit. Positive = under target; negative = over."
        ),
        key: "saving_per_unit",
        width: 170,
        align: "center",
        render: (_v, rec) => {
          const tpu = toNum(rec.target_cost_per_unit);
          const actualPerUnit = actualAllocFactor * tpu;
          const savingPerUnit = tpu - actualPerUnit;
          const color = savingPerUnit >= 0 ? "#16a34a" : "#ef4444";
          return <span style={{ color, fontWeight: 700 }}>{fmtMoneySigned(savingPerUnit)}</span>;
        },
      },
      {
        title: colTitle(
          "Saving / SKU",
          "(Qty × Target Cost / unit) − (Qty × Actual cost / unit). Positive = under; negative = over."
        ),
        key: "saving_per_sku",
        width: 180,
        align: "center",
        render: (_v, rec) => {
          const qty = toNum(rec.quantity_needed);
          const tpu = toNum(rec.target_cost_per_unit);
          const actualPerUnit = actualAllocFactor * tpu;
          const savingPerSku = qty * (tpu - actualPerUnit);
          const color = savingPerSku >= 0 ? "#16a34a" : "#ef4444";
          return <span style={{ color, fontWeight: 700 }}>{fmtMoneySigned(savingPerSku)}</span>;
        },
      },
      {
        title: "",
        width: 64,
        fixed: "right",
        render: (_v, rec) => (
          <Button
            size="large"
            icon={<DeleteOutlined />}
            danger
            onClick={async () => {
              cart.remove(rec.id);
              try {
                if (isEdit && id) {
                  await apiClient.post("/api/v1/userlogs", {
                    targetId: id,
                    action: "UPDATE",
                    meta: { itemsOps: [{ op: "REMOVE", name: rec.product_name || "Item", sku: rec.sku || undefined, qty: rec.quantity_needed ?? undefined }] },
                  });
                  setLogsTick((n) => n + 1);
                }
              } catch { /* ignore */ }
            }}
          />
        ),
      },
    ],
    [cart, sellerAllocFactor, actualAllocFactor, isEdit, id]
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
          className="!rounded-md !h-9 !px-3 bg-white hover:!bg-gray-50 border border-gray-300 shadow-sm hover:shadow text-gray-700"
        >
          Back
        </Button>
      </div>

      <AppBreadcrumbs fromLocation hide={["orders"]} />

      {isEdit && orderQ.isFetching && (
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
          header: {},
          totals: {
            sellers_price: 0,
            shipping_charges: 0,
            taxes: 0,
            shipping_mode: "supplier",
          },
        }}
      >
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Title level={3}>{isEdit ? "Edit Sourcing Order" : "New Sourcing Order"}</Title>
        </motion.div>

        {/* Header card */}
        <Card style={gradientStyle}>
          <Row gutter={[12, 12]} align="top">
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={["header", "listing_link"]}
                label="Listing Link"
                tooltip={{ title: "URL to the product listing (http/https).", ...tipCommon }}
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
                tooltip={{ title: "Pick an existing marketplace or create one (slug, e.g. 'ebay').", ...tipCommon }}
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
                    form.setFieldsValue({ header: { ...h, market: undefined, seller_id: undefined } });
                    setSellerQuery("");
                    queryClient.removeQueries({ queryKey: ["sellers"] });
                  }}
                  value={form.getFieldValue(["header", "market"]) || undefined}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={["header", "seller_name"]}
                label="Seller"
                tooltip={{ title: "Choose an existing seller for the selected marketplace or create a new one.", ...tipCommon }}
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
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name={["header", "origin"]}
                label="Origin"
                tooltip={{ title: "Select the shipping origin country for this order.", ...tipCommon }}
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

        {/* Product search + efficiency */}
        <Card style={gradientStyle}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={16}>
              <div className="relative" ref={dropdownRef} style={{ position: "relative" }}>
                <Input
                  ref={inputRef}
                  size="large"
                  placeholder="Search products…"
                  value={searchText}
                  onChange={handleSearchChange}
                  onFocus={async () => {
                    setShowProductDropdown(true);
                    if (searchText.trim()) await fetchProducts(searchText.trim());
                    else await fetchInitialProducts();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && products?.length) {
                      e.preventDefault();
                      onPickProduct(products[0]);
                    }
                    if (e.key === "Escape") setShowProductDropdown(false);
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
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={async () => {
                          const next = active ? "" : t.code;
                          debouncedSearch.cancel?.();
                          setTypeCode(next);
                          setShowProductDropdown(true);
                          if (searchText.trim()) await fetchProducts(searchText.trim());
                          else await fetchInitialProducts();
                          inputRef.current?.focus();
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
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {loading ? (
                      <div style={{ padding: "10px 12px", color: "#6b7280", fontSize: 13 }}>
                        Loading products…
                      </div>
                    ) : Array.isArray(products) && products.length ? (
                      products.map((p, idx) => {
                        const idp = p._id || p.id || idx;
                        const title = p.pro_title || p.product_name || "Untitled";
                        const sku = p.sku || "";
                        return (
                          <div
                            key={idp}
                            onClick={() => onPickProduct(p)}
                            style={{
                              padding: "10px 12px",
                              borderBottom: "1px solid #f3f4f6",
                              cursor: "pointer",
                            }}
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
                title={statTitle(
                  "Efficiency %",
                  "Percentage alternative of Savings. Formula: (Savings ÷ Total Target Cost) × 100 = (1 − Actual ÷ Target) × 100. Positive = under budget (saved); negative = over budget."
                )}
                value={efficiencyPct ?? 0}
                formatter={() => fmtPercentSigned(efficiencyPct ?? 0)}
                valueStyle={{
                  color: (efficiencyPct ?? 0) >= 0 ? "#16a34a" : "#ef4444",
                  fontWeight: 700,
                }}
              />
            </Col>
          </Row>
        </Card>

        {/* Cart table */}
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

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 24,
              justifyContent: "flex-end",
              alignItems: "flex-start",
              flexWrap: "nowrap",
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            <Statistic
              title={statTitle("Total Target Cost", "Σ (Qty × Target cost / unit) for all items")}
              value={targetTotalCost}
              formatter={() => fmtMoneySigned(targetTotalCost)}
              valueStyle={{ fontWeight: 700 }}
            />

            <Statistic
              title={statTitle(
                "Total Savings",
                <>
                  Total Target Cost − Total Actual Cost.
                  <br />
                  Positive = under target (you saved); negative = over target.
                </>
              )}
              value={totalSavings}
              formatter={() => fmtMoneySigned(totalSavings)}
              valueStyle={{
                color: totalSavings >= 0 ? "#16a34a" : "#ef4444",
                fontWeight: 700,
              }}
            />
          </div>
        </Card>

        {/* Totals (inputs) */}
        <Card style={gradientStyle}>
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name={["totals", "sellers_price"]}
                label="Seller Price ($)"
                tooltip={{ title: "Order-level amount paid to the seller.", ...tipCommon }}
              >
                <InputNumber step={0.01} style={{ width: "100%" }} size="large" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name={["totals", "shipping_charges"]}
                label="Shipping ($)"
                tooltip={{
                  title: "Order-level shipping charges (not per-unit). Included in Total Actual Cost.",
                  ...tipCommon,
                }}
              >
                <InputNumber step={0.01} style={{ width: "100%" }} size="large" />
              </Form.Item>

              <Form.Item
                name={["totals", "shipping_mode"]}
                label="Shipping Mode"
                tooltip={{ title: "Choose who manages shipping for this order.", ...tipCommon }}
                rules={[{ required: true, message: "Please select a shipping mode" }]}
                valuePropName="value"
              >
                <ShippingModeRadio />
              </Form.Item>

              <div className="text-[12px] text-slate-500 -mt-1 mb-2">
                {(form.getFieldValue(["totals", "shipping_mode"]) || "supplier") === "self"
                  ? "You manage shipping (in-house/3PL)."
                  : "Seller handles shipping to you."}
              </div>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name={["totals", "taxes"]}
                label="Taxes ($)"
                tooltip={{ title: "Order-level taxes for this purchase. Included in Total Actual Cost.", ...tipCommon }}
              >
                <InputNumber step={0.01} style={{ width: "100%" }} size="large" />
              </Form.Item>
            </Col>
          </Row>

          <Row justify="end" gutter={[16, 16]}>
            <Col>
              <Statistic
                title={statTitle("Total Actual Cost", "Seller Price + Shipping + Taxes")}
                value={totalActualCost}
                formatter={() => fmtMoneySigned(totalActualCost)}
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
            disabled={!cart.rawItems.length || invalidTargetsCount > 0 || isSubmitting}
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

      {isEdit && (
        <div style={{ marginTop: 16 }}>
          <SourcingLogsTimeline targetId={id} refreshKey={logsTick} title="Activity Log" />
        </div>
      )}
    </div>
  );
}
