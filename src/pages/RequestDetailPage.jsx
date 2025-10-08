
// src/pages/RequestDetailPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CopyOutlined, DeleteOutlined } from "@ant-design/icons";
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Checkbox,
  Typography,
  Table,
  Spin,
  Space,
  InputNumber,
  Row,
  Col,
  Grid,
  AutoComplete,
} from "antd";
import Swal from "sweetalert2";
import apiClient from "../api/client";
import SourcingLogsTimeline from "./SourcingLogsTimeline";
import { useAuth } from "../contexts/AuthContext";

const { Title } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

/* ---------- Toast helpers ---------- */
const toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  customClass: { popup: "rounded-lg" },
});
const toastWarn = (title, text, background = "#f59e0b") =>
  toast.fire({ icon: "warning", title, text, background, color: "#fff" });
const toastErr = (title, text, background = "#ef4444") =>
  toast.fire({ icon: "error", title, text, background, color: "#fff" });
const toastOk = (title, text, background = "#10b981") =>
  toast.fire({ icon: "success", title, text, background, color: "#fff" });
const toastErrSticky = (title, text) =>
  Swal.fire({
    icon: "error",
    title,
    text,
    toast: true,
    position: "top-end",
    showConfirmButton: true,
    confirmButtonText: "Close",
    timer: undefined,
    customClass: { popup: "rounded-lg" },
  });

/* ---------- helpers ---------- */
const lower = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const deslug = (slug) => {
  if (!slug) return "";
  try {
    const s = decodeURIComponent(slug);
    return s.replace(/[-+]/g, " ").trim();
  } catch {
    return String(slug).replace(/[-+]/g, " ").trim();
  }
};

const currency2 = (n) => (typeof n === "number" ? n.toFixed(2) : "0.00");

const ensureHttp = (v = "") => {
  const s = String(v).trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const isLikelyFqdn = (hostname = "") =>
  /^[^.\/\s][^\s]*\.[^\s]+$/.test(hostname);

const isObjectId = (v) => typeof v === "string" && /^[0-9a-fA-F]{24}$/.test(v);

// ✅ define before use
const safeNum = (v) => (v == null || v === "" ? 0 : Number(v) || 0);

// format efficiency like "9%" (or "9.5%" if not whole)
const formatPct = (n) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  const num = Number(n);
  return Number.isInteger(num) ? `${num}%` : `${num.toFixed(1)}%`;
};

/** Normalize server payload into what the form expects */
const normalizeRequest = (raw = {}) => {
  const sourcing_id = raw.sourcing_id ?? raw.sourcingId ?? undefined;

  // SELLER: can be ref, populated object, or string
  const sellerId =
    (raw.seller && typeof raw.seller === "object" && raw.seller._id) ||
    (typeof raw.seller === "string" && isObjectId(raw.seller)
      ? raw.seller
      : undefined);
  const sellerName =
    (raw.seller &&
      typeof raw.seller === "object" &&
      (raw.seller.name || raw.seller.slug)) ||
    (typeof raw.seller === "string" && !isObjectId(raw.seller)
      ? raw.seller
      : "") ||
    raw.seller_name ||
    "";

  // MARKET: ref, populated object, or string
  const marketId =
    (raw.market && typeof raw.market === "object" && raw.market._id) ||
    (typeof raw.market === "string" && isObjectId(raw.market)
      ? raw.market
      : undefined);
  const marketName =
    (raw.market &&
      typeof raw.market === "object" &&
      (raw.market.name || raw.market.slug)) ||
    (typeof raw.market === "string" && !isObjectId(raw.market)
      ? raw.market
      : "") ||
    raw.seller?.market?.name ||
    raw.seller?.market?.slug ||
    "";

  const sellers_price = Number(raw.sellers_price ?? raw.seller_price ?? 0);
  const shipping_price = Number(
    raw.shipping_price ?? raw.shipping_charges ?? 0
  );
  const tax = Number(raw.tax ?? raw.taxes ?? 0);

  // totals & efficiencies from backend
  const target_total_cost = Number(
    raw.target_total_cost ?? raw.targetTotalCost ?? NaN
  );
  const total_actual_cost = Number(
    raw.total_actual_cost ?? raw.totalActualCost ?? NaN
  );
  const purchase_efficiency =
    raw.purchase_efficiency ?? raw.purchaseEfficiency ?? null;
  const sku_efficiency = raw.sku_efficiency ?? raw.skuEfficiency ?? null;

  const id = raw._id ?? raw.id ?? "";
  const createdAt =
    raw.created_at ?? raw.createdAt ?? raw.created_on ?? undefined;

  // CARRIER
  const carrierId =
    (raw.carrier && typeof raw.carrier === "object" && raw.carrier._id) ||
    (typeof raw.carrier === "string" && isObjectId(raw.carrier)
      ? raw.carrier
      : undefined);
  const carrierName =
    (raw.carrier && typeof raw.carrier === "object" && raw.carrier.name) ||
    (typeof raw.carrier === "string" && !isObjectId(raw.carrier)
      ? raw.carrier
      : "") ||
    "";

  const items = (Array.isArray(raw.items) ? raw.items : []).map(
    (it, idx) => (
      [
        "_id",
        "id",
        "product_name",
        "name",
        "sku",
        "quantity_needed",
        "product_type",
        "category",
        "tested",
        "product_condition",
        "target_cost_per_unit",
        "total_target_cost",
        "sellers_price_per_unit",
        "actual_cost_per_unit",
      ],
      {
        _id: it._id ?? it.id ?? `${id}-item-${idx}`,
        product_name: it.product_name ?? it.name ?? "Unnamed",
        sku: it.sku ?? "",
        quantity_needed: Number(it.quantity_needed ?? 1),
        product_type: it.product_type ?? undefined,
        category: it.category ?? "",
        tested: !!it.tested,
        product_condition: it.product_condition ?? null,
        target_cost_per_unit: Number(it.target_cost_per_unit ?? 0),
        total_target_cost:
          it.total_target_cost != null
            ? Number(it.total_target_cost)
            : Number(it.quantity_needed ?? 1) *
              Number(it.target_cost_per_unit ?? 0),
        sellers_price_per_unit: Number(it.sellers_price_per_unit ?? 0),
        actual_cost_per_unit: Number(it.actual_cost_per_unit ?? 0),
      }
    )
  );

  return {
    sourcing_id,
    _id: id,
    id,

    sellerId,
    sellerName,

    marketId,
    marketName,

    listing_link: raw.listing_link ?? raw.listingLink ?? raw.url ?? "",
    sellers_price,
    shipping_price,
    tax,
    status: raw.status ?? "Pending",

    // totals/efficiencies from backend
    target_total_cost: isNaN(target_total_cost) ? null : target_total_cost,
    total_actual_cost: isNaN(total_actual_cost) ? null : total_actual_cost,
    purchase_efficiency,
    sku_efficiency,

    market_order_num: raw.market_order_num ?? "",
    purchase_link: raw.purchase_link ?? "",

    destination_warehouse: raw.destination_warehouse ?? "",
    tracking_status: raw.tracking_status ?? "Pending",
    carrierId,
    carrierName,
    tracking_id: raw.tracking_id ?? "",
    tracking_link: raw.tracking_link ?? "",

    offer_price: Number(
      raw.offer_price != null ? raw.offer_price : raw.offered_price ?? 0
    ),

    createdAt,
    items,
  };
};

const STATUS_NEEDS_PURCHASE_DETAILS = ["Purchased", "Dropshipped"];
const TRACKING_STATUSES = ["Pending", "InTransit", "Delivered"];

/* ---------- label resolvers ---------- */
const resolveCarrierLabel = async (idMaybe) => {
  if (!idMaybe) return null;
  try {
    const direct = await apiClient.get(`/api/v1/carriers/${idMaybe}`);
    if (direct?.data?._id) {
      return { value: direct.data._id, label: direct.data.name };
    }
  } catch (_) {}
  try {
    const { data } = await apiClient.get("/api/v1/carriers", {
      params: { q: "" },
    });
    const list = Array.isArray(data) ? data : data?.data || [];
    const hit = list.find((c) => c._id === idMaybe);
    if (hit) return { value: hit._id, label: hit.name };
  } catch (_) {}
  return { value: idMaybe, label: idMaybe };
};

const resolveMarketLabel = async (idMaybe) => {
  if (!idMaybe) return null;
  try {
    const direct = await apiClient.get(`/api/v1/markets/${idMaybe}`);
    if (direct?.data?._id) {
      return {
        value: direct.data._id,
        label: direct.data.name || direct.data.slug,
      };
    }
  } catch (_) {}
  try {
    const { data } = await apiClient.get("/api/v1/markets", {
      params: { q: "" },
    });
    const list = Array.isArray(data) ? data : data?.data || [];
    const hit = list.find((m) => m._id === idMaybe);
    if (hit) return { value: hit._id, label: hit.name || hit.slug };
  } catch (_) {}
  return { value: idMaybe, label: idMaybe };
};

/* ---------- permissions ---------- */
const extractPerms = (roleObj) => {
  const access = Array.isArray(roleObj?.access) ? roleObj.access : [];
  const sourcer = access.find((a) => lower(a?.app) === "sourcer");
  const purchaser = access.find((a) => lower(a?.app) === "purchaser");
  const sourcerMenu = Array.isArray(sourcer?.menu)
    ? sourcer.menu.map(lower)
    : [];
  const purchaserMenu = Array.isArray(purchaser?.menu)
    ? purchaser.menu.map(lower)
    : [];
  return {
    canEditMyRequests: sourcerMenu.includes("edit my requests"),
    canMarkPurchased: purchaserMenu.includes("mark purchased"),
    canUpdateTracking: purchaserMenu.includes("update tracking"),
  };
};

export default function RequestDetailPage() {
  const { user: authUser } = useAuth();
  const roleName = lower(authUser?.roles?.role || authUser?.role || "");

  const { seller, sourcingId, id } = useParams();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const controlSize = screens.xs ? "middle" : "large";
  const cardPad = screens.xs ? 12 : 16;
  const gutter = screens.xs ? [12, 10] : [16, 12];

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const [canEditMyRequests, setCanEditMyRequests] = useState(false);
  const [canMarkPurchased, setCanMarkPurchased] = useState(false);
  const [canUpdateTracking, setCanUpdateTracking] = useState(false);

  // Carrier search
  const [carrierOpts, setCarrierOpts] = useState([]);
  const [carrierLoading, setCarrierLoading] = useState(false);
  const carrierTimer = useRef(null);
  const lastCarrierQuery = useRef("");

  // Market search
  const [marketOpts, setMarketOpts] = useState([]);
  const [marketLoading, setMarketLoading] = useState(false);
  const marketTimer = useRef(null);
  const lastMarketQuery = useRef("");

  // Seller search
  const [sellerOpts, setSellerOpts] = useState([]);
  const [sellerLoading, setSellerLoading] = useState(false);
  const sellerTimer = useRef(null);
  const lastSellerQuery = useRef("");

  const [logsTick, setLogsTick] = useState(0);

  const WAREHOUSE_TAGS = useMemo(
    () => ["Fleetwood", "Lahore", "Osaka", "Quebec", "Sharjah", "Customer"],
    []
  );
  const WAREHOUSE_OPTIONS = useMemo(
    () => WAREHOUSE_TAGS.map((v) => ({ value: v })),
    [WAREHOUSE_TAGS]
  );

  // Load role map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/role/all");
        const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
        const matched =
          rolesArr.find((r) => lower(r?.role) === roleName) || null;
        const { canEditMyRequests, canMarkPurchased, canUpdateTracking } =
          extractPerms(matched || {});
        if (!cancelled) {
          setCanEditMyRequests(!!canEditMyRequests);
          setCanMarkPurchased(!!canMarkPurchased);
          setCanUpdateTracking(!!canUpdateTracking);
          setRolesLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setCanEditMyRequests(false);
          setCanMarkPurchased(false);
          setCanUpdateTracking(false);
          setRolesLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleName]);

  /* ---------- searches ---------- */
  const debouncedCarrierSearch = useCallback((q) => {
    lastCarrierQuery.current = q;
    if (carrierTimer.current) clearTimeout(carrierTimer.current);
    carrierTimer.current = setTimeout(async () => {
      try {
        setCarrierLoading(true);
        const { data } = await apiClient.get("/api/v1/carriers", {
          params: { q },
        });
        const list = Array.isArray(data) ? data : data?.data || [];
        setCarrierOpts(
          list.map((c) => ({ label: c.name, value: c._id, meta: c }))
        );
      } catch {
        setCarrierOpts([]);
      } finally {
        setCarrierLoading(false);
      }
    }, 300);
  }, []);

  const carrierOptionsWithCreate = useMemo(() => {
    const q = String(lastCarrierQuery.current || "").trim();
    if (!q) return carrierOpts;
    const exists = carrierOpts.some(
      (o) => (o.label || "").toLowerCase() === q.toLowerCase()
    );
    return exists
      ? carrierOpts
      : [
          ...carrierOpts,
          {
            label: `Create “${q}”`,
            value: "__CREATE__",
            meta: { createName: q },
          },
        ];
  }, [carrierOpts]);

  const debouncedMarketSearch = useCallback((q) => {
    lastMarketQuery.current = q;
    if (marketTimer.current) clearTimeout(marketTimer.current);
    marketTimer.current = setTimeout(async () => {
      try {
        setMarketLoading(true);
        const { data } = await apiClient.get("/api/v1/markets", {
          params: { q },
        });
        const list = Array.isArray(data) ? data : data?.data || [];
        setMarketOpts(
          list.map((m) => ({ label: m.name || m.slug, value: m._id, meta: m }))
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
      (o) => (o.label || "").toLowerCase() === q.toLowerCase()
    );
    return exists
      ? marketOpts
      : [
          ...marketOpts,
          {
            label: `Create “${q}”`,
            value: "__CREATE__",
            meta: { createName: q },
          },
        ];
  }, [marketOpts]);

  const debouncedSellerSearch = useCallback((q) => {
    lastSellerQuery.current = q;
    if (sellerTimer.current) clearTimeout(sellerTimer.current);
    sellerTimer.current = setTimeout(async () => {
      try {
        setSellerLoading(true);
        const { data } = await apiClient.get("/api/v1/sellers", {
          params: { q },
        });
        const list = Array.isArray(data) ? data : data?.data || [];
        setSellerOpts(
          list.map((s) => ({ label: s.name, value: s._id, meta: s }))
        );
      } catch {
        setSellerOpts([]);
      } finally {
        setSellerLoading(false);
      }
    }, 300);
  }, []);

  const sellerOptionsWithCreate = useMemo(() => {
    const q = String(lastSellerQuery.current || "").trim();
    if (!q) return sellerOpts;
    const exists = sellerOpts.some(
      (o) => (o.label || "").toLowerCase() === q.toLowerCase()
    );
    return exists
      ? sellerOpts
      : [
          ...sellerOpts,
          {
            label: `Create “${q}”`,
            value: "__CREATE__",
            meta: { createName: q },
          },
        ];
  }, [sellerOpts]);

  const [form] = Form.useForm();

  const handleCopyListing = useCallback(async () => {
    try {
      const raw = (
        form.getFieldValue("listing_link") ||
        request?.listing_link ||
        ""
      ).trim();
      if (!raw) {
        toastWarn("No link", "Listing link is empty.");
        return;
      }
      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      toastOk("Copied", "Listing link copied to clipboard.");
    } catch {
      toastWarn("Copy failed", "Could not copy the listing link.");
    }
  }, [form, request]);

  const isBlank = (v) =>
    v === undefined || v === null || String(v).trim() === "";

  // watched inputs (live calc)
  const watchedSellers = Form.useWatch("sellers_price", form);
  const watchedShipping = Form.useWatch("shipping_price", form);
  const watchedTax = Form.useWatch("tax", form);

  const sellers_price = Number(watchedSellers ?? request?.sellers_price ?? 0);
  const shipping_price = Number(
    watchedShipping ?? request?.shipping_price ?? 0
  );
  const tax = Number(watchedTax ?? request?.tax ?? 0);
  const total = sellers_price + shipping_price + tax;

  // server totals / fallbacks
  const itemsSumTarget = useMemo(() => {
    const items = request?.items || [];
    return items.reduce(
      (acc, it) =>
        acc +
        Number(
          it.total_target_cost != null
            ? it.total_target_cost
            : Number(it.quantity_needed || 0) *
                Number(it.target_cost_per_unit || 0)
        ),
      0
    );
  }, [request]);

  const itemsSumActual = useMemo(() => {
    const items = request?.items || [];
    return items.reduce(
      (acc, it) =>
        acc +
        Number(
          Number(it.quantity_needed || 0) * Number(it.actual_cost_per_unit || 0)
        ),
      0
    );
  }, [request]);

  const backendTargetTotal =
    request?.target_total_cost ?? (itemsSumTarget || null);
  const backendActualTotal =
    request?.total_actual_cost ?? (itemsSumActual || null);

  const totalSavings = useMemo(() => {
    const t = Number(backendTargetTotal || 0);
    const a = Number(backendActualTotal || 0);
    return t - a; // Total Savings = Target − Actual
  }, [backendTargetTotal, backendActualTotal]);

  // ✅ compute efficiency & colors here (after totals exist)
  const target = safeNum(request?.target_total_cost ?? backendTargetTotal);
  const actual = safeNum(request?.total_actual_cost ?? backendActualTotal);
  const effPct = target ? (1 - actual / target) * 100 : null;
  const effColor = effPct >= 0 ? "#16a34a" : "#ef4444";
  const savingsColor = (totalSavings ?? 0) >= 0 ? "#16a34a" : "#ef4444";

  // API helpers
  const fetchBySeller = (sellerName) =>
    apiClient.get(
      `/api/v1/sourcing/by-seller/${encodeURIComponent(sellerName)}`
    );
  const fetchById = (docId) => apiClient.get(`/api/v1/sourcing/${docId}`);

  const fetchRequest = useCallback(async () => {
    const sellerParam = seller || null;
    const idParam = sourcingId || id || null;
    if (!sellerParam && !idParam) {
      setRequest(null);
      setLoading(false);
      toastWarn(
        "Missing parameter",
        "No seller or id was provided in the route."
      );
      return;
    }

    setLoading(true);
    try {
      let res;
      if (idParam && /^[0-9a-fA-F]{24}$/.test(String(idParam))) {
        res = await fetchById(String(idParam));
      } else if (sellerParam) {
        const sellerName = deslug(sellerParam);
        try {
          res = await fetchBySeller(sellerName);
        } catch {
          res = await apiClient.get("/api/v1/sourcing", {
            params: { seller: sellerName },
          });
        }
      } else {
        res = await fetchById(String(idParam));
      }

      const raw = Array.isArray(res.data) ? res.data[0] : res.data;
      if (!raw) {
        toastWarn("Not found", "No sourcing request matched your link.");
        throw new Error("Not found");
      }

      const normalized = normalizeRequest(raw);
      setRequest(normalized);

      // Carrier field
      let carrierField;
      if (normalized.carrierId) {
        const resolved = await resolveCarrierLabel(normalized.carrierId);
        carrierField = resolved;
        setCarrierOpts((prev) =>
          prev.some((o) => o.value === resolved.value)
            ? prev
            : [{ label: resolved.label, value: resolved.value }, ...prev]
        );
      } else if (normalized.carrierName) {
        carrierField = {
          value: normalized.carrierName,
          label: normalized.carrierName,
        };
      }

      // Market field
      let marketField;
      if (normalized.marketId) {
        const resolved = await resolveMarketLabel(normalized.marketId);
        marketField = resolved;
        setMarketOpts((prev) =>
          prev.some((o) => o.value === resolved.value)
            ? prev
            : [{ label: resolved.label, value: resolved.value }, ...prev]
        );
      } else if (normalized.marketName) {
        marketField = {
          value: normalized.marketName,
          label: normalized.marketName,
        };
      }

      // Seller field
      let sellerField;
      if (normalized.sellerId) {
        sellerField = {
          value: normalized.sellerId,
          label: normalized.sellerName || normalized.sellerId,
        };
        setSellerOpts((prev) =>
          prev.some((o) => o.value === normalized.sellerId)
            ? prev
            : [
                { label: sellerField.label, value: normalized.sellerId },
                ...prev,
              ]
        );
      } else if (normalized.sellerName) {
        sellerField = {
          value: normalized.sellerName,
          label: normalized.sellerName,
        };
      }

      // Fill form
      form.setFieldsValue({
        seller: sellerField || undefined,
        market: marketField || undefined,
        listing_link: normalized.listing_link,
        sellers_price: normalized.sellers_price,
        shipping_price: normalized.shipping_price,
        tax: normalized.tax,
        status: normalized.status,
        offer_price: normalized.offer_price || undefined,
        market_order_num:
          normalized.market_order_num !== "" &&
          normalized.market_order_num != null
            ? normalized.market_order_num
            : undefined,
        purchase_link: normalized.purchase_link,
        destination_warehouse: normalized.destination_warehouse,
        tracking_status: normalized.tracking_status || "Pending",
        carrier: carrierField || undefined,
        tracking_id: normalized.tracking_id,
        tracking_link: normalized.tracking_link,
      });
      setLogsTick((n) => n + 1);
    } catch (err) {
      const serverMsg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to fetch request details.";
      toastErrSticky("Load failed", serverMsg);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [seller, sourcingId, id, form]);

  useEffect(() => {
    if (!rolesLoaded) return;
    fetchRequest();
  }, [rolesLoaded, fetchRequest]);

  const allowedStatusValues = useMemo(() => {
    const base = [
      "Pending",
      "Assigned",
      "Offer",
      "Disapproved",
      "Sold",
      "Hold",
      "Seller Rejected",
      "Returned",
    ];
    const purch = ["Purchased", "Dropshipped"];
    const out = [...base];
    if (canMarkPurchased) out.push(...purch);
    return out;
  }, [canMarkPurchased]);

  /* ---------- Select handlers that CREATE inline ---------- */
  const handleMarketSelect = async (val, option) => {
    const id = val?.value ?? val;
    if (id === "__CREATE__") {
      const name =
        option?.meta?.createName || lastMarketQuery.current || "Marketplace";
      try {
        const { data } = await apiClient.post(
          "/api/v1/markets/find-or-create",
          { name }
        );
        const created = {
          label: data.name || data.slug,
          value: data._id,
          meta: data,
        };
        setMarketOpts((prev) =>
          prev.some((o) => o.value === created.value)
            ? prev
            : [created, ...prev]
        );
        form.setFieldsValue({
          market: { value: created.value, label: created.label },
        });
        toastOk("Marketplace created", `${created.label}`);
      } catch (e) {
        toastErrSticky(
          "Marketplace create failed",
          e?.response?.data?.message || e.message || ""
        );
      }
    }
  };

  const handleSellerSelect = async (val, option) => {
    const id = val?.value ?? val;
    if (id === "__CREATE__") {
      const name =
        option?.meta?.createName || lastSellerQuery.current || "Seller";
      // if a market is already chosen, pass it to seller create
      const marketVal = form.getFieldValue("market");
      let marketId =
        marketVal &&
        typeof marketVal === "object" &&
        marketVal.value &&
        isObjectId(String(marketVal.value))
          ? String(marketVal.value)
          : undefined;
      try {
        if (
          !marketId &&
          marketVal &&
          typeof marketVal === "object" &&
          marketVal.value &&
          marketVal.value !== "__CREATE__"
        ) {
          marketId = isObjectId(String(marketVal.value))
            ? String(marketVal.value)
            : undefined;
        }
      } catch {}
      try {
        const { data } = await apiClient.post(
          "/api/v1/sellers/find-or-create",
          { name, market: marketId }
        );
        const created = { label: data.name, value: data._id, meta: data };
        setSellerOpts((prev) =>
          prev.some((o) => o.value === created.value)
            ? prev
            : [created, ...prev]
        );
        form.setFieldsValue({
          seller: { value: created.value, label: created.label },
        });
        toastOk("Seller created", `${created.label}`);
      } catch (e) {
        toastErrSticky(
          "Seller create failed",
          e?.response?.data?.message || e.message || ""
        );
      }
    }
  };

  // create a carrier on the fly (like market/seller)
  const handleCarrierSelect = async (val, option) => {
    const id = val?.value ?? val;
    if (id === "__CREATE__") {
      const name =
        option?.meta?.createName || lastCarrierQuery.current || "Carrier";
      try {
        const { data } = await apiClient.post(
          "/api/v1/carriers/find-or-create",
          { name }
        );
        const created = { label: data.name, value: data._id, meta: data };

        setCarrierOpts((prev) =>
          prev.some((o) => o.value === created.value)
            ? prev
            : [created, ...prev]
        );

        form.setFieldsValue({
          carrier: { value: created.value, label: created.label },
        });

        toastOk("Carrier created", `${created.label}`);
      } catch (e) {
        toastErrSticky(
          "Carrier create failed",
          e?.response?.data?.message || e.message || ""
        );
      }
    }
  };

  /* ---------- Order submit ---------- */
  const handleOrderUpdate = async (values) => {
    try {
      const original = request || {};
      const docId = original?._id || original?.id;
      if (!docId) {
        toastWarn("No ID", "Cannot update because sourcing id is missing.");
        return;
      }

      // clear potential stale field error before submit
      form.setFields([{ name: "tracking_link", errors: [] }]);

      const desiredStatus = String(
        values?.status ?? original.status ?? ""
      ).trim();
      const wantsPurchased = ["Purchased", "Dropshipped"].includes(
        desiredStatus
      );

      // --- Validate Offer ---
      if (desiredStatus === "Offer" && !(Number(values?.offer_price) > 0)) {
        toastWarn(
          "Missing Offer price",
          'Enter "Offer price" when status is "Offer".'
        );
        return;
      }

      // --- Normalize/validate purchase fields ---
      const purchaseRaw = (values?.purchase_link || "").trim();
      const normalizedPurchase = purchaseRaw ? ensureHttp(purchaseRaw) : "";
      const monRaw = values?.market_order_num;
      const monStr = monRaw === 0 || monRaw ? String(monRaw).trim() : "";

      if (wantsPurchased) {
        if (!normalizedPurchase) {
          toastWarn(
            "Missing purchase link",
            'Required when status is "Purchased" or "Dropshipped".'
          );
          return;
        }
        try {
          const u = new URL(normalizedPurchase);
          if (!isLikelyFqdn(u.hostname)) {
            toastWarn(
              "Invalid URL",
              "Enter a full domain, e.g. https://example.com"
            );
            return;
          }
        } catch {
          toastWarn("Invalid URL", "Purchase link looks malformed.");
          return;
        }
        if (!monStr) {
          toastWarn(
            "Missing Market Order #",
            'Required when status is "Purchased" or "Dropshipped".'
          );
          return;
        }
      }

      // --- Tracking checks (respect explicit clearing) ---
      const trackingStatusProvided = Object.prototype.hasOwnProperty.call(
        values,
        "tracking_status"
      );
      const tStatus = trackingStatusProvided
        ? values.tracking_status || "Pending"
        : original.tracking_status || "Pending";

      const carrierField = values?.carrier;
      const carrierProvided = Object.prototype.hasOwnProperty.call(
        values,
        "carrier"
      );
      const carrierId =
        carrierField && typeof carrierField === "object"
          ? carrierField.value
          : carrierField || undefined;
      const carrierCleared =
        carrierProvided &&
        (carrierField == null ||
          (typeof carrierField === "object" && !carrierField?.value));

      const trackingLinkProvided = Object.prototype.hasOwnProperty.call(
        values,
        "tracking_link"
      );
      const trackingLinkRaw = (values?.tracking_link || "").trim();
      const trackingLinkNorm = trackingLinkRaw
        ? ensureHttp(trackingLinkRaw)
        : "";
      const trackingLinkCleared =
        trackingLinkProvided && isBlank(values.tracking_link);

      if (tStatus && tStatus !== "Pending") {
        if (!carrierId) {
          toastWarn(
            "Carrier required",
            "Select a carrier when tracking status is not Pending."
          );
          return;
        }
        if (!trackingLinkNorm) {
          toastWarn(
            "Tracking link required",
            "Enter a tracking link when tracking status is not Pending."
          );
          return;
        }
        try {
          const u = new URL(trackingLinkNorm);
          if (!isLikelyFqdn(u.hostname)) {
            toastWarn(
              "Invalid tracking URL",
              "Enter a full domain, e.g., https://example.com/track/123"
            );
            return;
          }
        } catch {
          toastWarn("Invalid tracking URL", "Tracking link looks malformed.");
          return;
        }
      }

      // --- Build payload (SEND NULLS when user clears fields) ---
      const payload = {};

      // SELLER (ObjectId only)
      const sellerVal = values?.seller;
      if (Object.prototype.hasOwnProperty.call(values, "seller")) {
        if (
          sellerVal &&
          typeof sellerVal === "object" &&
          sellerVal.value &&
          sellerVal.value !== "__CREATE__" &&
          isObjectId(String(sellerVal.value))
        ) {
          payload.seller = String(sellerVal.value);
        } else if (typeof sellerVal === "string" && isObjectId(sellerVal)) {
          payload.seller = sellerVal;
        }
      }

      // MARKET (ObjectId only)
      const marketVal = values?.market;
      if (Object.prototype.hasOwnProperty.call(values, "market")) {
        if (
          marketVal &&
          typeof marketVal === "object" &&
          marketVal.value &&
          marketVal.value !== "__CREATE__" &&
          isObjectId(String(marketVal.value))
        ) {
          payload.market = String(marketVal.value);
        } else if (typeof marketVal === "string" && isObjectId(marketVal)) {
          payload.market = marketVal;
        }
      }

      // Finances & link
      const listingLinkNorm = values?.listing_link
        ? ensureHttp(values.listing_link)
        : values?.listing_link;
      if (Object.prototype.hasOwnProperty.call(values, "listing_link")) {
        payload.listing_link = isBlank(listingLinkNorm)
          ? null
          : listingLinkNorm;
      }
      if (Object.prototype.hasOwnProperty.call(values, "sellers_price")) {
        payload.sellers_price = Number(values.sellers_price || 0);
      }
      if (Object.prototype.hasOwnProperty.call(values, "shipping_price")) {
        payload.shipping_charges = Number(values.shipping_price || 0);
      }
      if (Object.prototype.hasOwnProperty.call(values, "tax")) {
        payload.taxes = Number(values.tax || 0);
      }

      if (desiredStatus) payload.status = desiredStatus;
      if (Object.prototype.hasOwnProperty.call(values, "offer_price")) {
        payload.offer_price = Number(values.offer_price || 0);
      }

      // Market Order #
      if (Object.prototype.hasOwnProperty.call(values, "market_order_num")) {
        payload.market_order_num = ["Purchased", "Dropshipped"].includes(
          desiredStatus
        )
          ? monStr
          : isBlank(values.market_order_num)
          ? null
          : String(values.market_order_num).trim();
      }

      // Purchase Link
      if (Object.prototype.hasOwnProperty.call(values, "purchase_link")) {
        payload.purchase_link = ["Purchased", "Dropshipped"].includes(
          desiredStatus
        )
          ? normalizedPurchase
          : isBlank(values.purchase_link)
          ? null
          : ensureHttp(values.purchase_link);
      }

      // Destination
      if (
        Object.prototype.hasOwnProperty.call(values, "destination_warehouse")
      ) {
        payload.destination_warehouse = isBlank(values.destination_warehouse)
          ? null
          : values.destination_warehouse;
      }

      // Tracking
      if (trackingStatusProvided) {
        payload.tracking_status = tStatus;
      }
      if (carrierProvided) {
        if (tStatus === "Pending") {
          payload.carrier = carrierCleared ? null : carrierId || null;
        } else {
          payload.carrier = carrierId;
        }
      }
      if (Object.prototype.hasOwnProperty.call(values, "tracking_id")) {
        payload.tracking_id = isBlank(values.tracking_id)
          ? null
          : values.tracking_id;
      }
      if (trackingLinkProvided) {
        if (tStatus === "Pending") {
          payload.tracking_link = trackingLinkCleared
            ? null
            : trackingLinkNorm || null;
        } else {
          payload.tracking_link = trackingLinkNorm;
        }
      }

      if (Object.keys(payload).length === 0) {
        toastWarn("No changes", "Nothing to save.");
        return;
      }

      await apiClient.patch(`/api/v1/sourcing/${docId}`, payload);

      toastOk("Saved", "Details updated successfully!");
      fetchRequest();
      setLogsTick((n) => n + 1);
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update details.";

      if (status === 409) {
        form.setFields([
          { name: "tracking_link", errors: ["Tracking link already exists."] },
        ]);
        toastErrSticky("Update failed", "Tracking link already exists.");
        return;
      }

      toastErrSticky("Update failed", serverMsg);
    }
  };

  const moneyProps = {
    min: 0,
    step: 0.01,
    formatter: (val) => (val === undefined || val === null ? "" : `$ ${val}`),
    parser: (val) => (val ? val.replace(/\$\s?|(,*)/g, "") : ""),
    style: { width: "100%" },
    size: controlSize,
  };

  const updateItemLocal = useCallback((itemId, patch) => {
    setRequest((prev) => {
      if (!prev) return prev;
      const items = (prev.items || []).map((it) =>
        (it._id || it.id) === itemId ? { ...it, ...patch } : it
      );
      return { ...prev, items };
    });
  }, []);

  /* ---------- item logs helper ---------- */
  const logItemsOps = useCallback(
    async (ops = []) => {
      try {
        const docId = request?._id || request?.id;
        if (!docId || !ops.length) return;
        await apiClient.post("/api/v1/userlogs", {
          targetId: docId,
          action: "UPDATE",
          meta: { itemsOps: ops },
        });
      } catch (e) {
        console.warn("log itemsOps failed:", e?.response?.data || e.message);
      }
    },
    [request]
  );

  /* ---------- delete item ---------- */
  const handleDeleteItem = useCallback(
    async (record) => {
      const itemId = record._id || record.id;
      if (!itemId) return;

      const res = await Swal.fire({
        icon: "warning",
        title: "Remove item?",
        text: `${record.product_name || "Item"}${
          record.sku ? ` (${record.sku})` : ""
        }`,
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
        confirmButtonColor: "#ef4444",
      });
      if (!res.isConfirmed) return;

      try {
        await apiClient.delete(`/api/v1/sourcing/items/${itemId}`);
        // local remove
        setRequest((prev) => {
          if (!prev) return prev;
          const items = (prev.items || []).filter(
            (it) => (it._id || it.id) !== itemId
          );
          return { ...prev, items };
        });
        toastOk("Item removed", `#${itemId} deleted`);
        // log
        await logItemsOps([
          {
            op: "REMOVE",
            name: record.product_name || "Item",
            sku: record.sku || undefined,
            qty: record.quantity_needed ?? undefined,
          },
        ]);
        setLogsTick((n) => n + 1);
      } catch (err) {
        toastErrSticky(
          "Delete failed",
          err?.response?.data?.message ||
            err?.message ||
            "Could not delete item."
        );
      }
    },
    [logItemsOps]
  );

  if (loading || !rolesLoaded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 280,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }
  if (!request) return <p>No request found.</p>;

  const itemColumns = [
    { title: "Product Name", dataIndex: "product_name", key: "product_name" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    {
      title: "Qty",
      dataIndex: "quantity_needed",
      key: "quantity_needed",
      width: 90,
    },
    {
      title: "Condition",
      dataIndex: "product_condition",
      key: "product_condition",
      render: (val, record) => (
        <Select
          value={val || undefined}
          style={{ width: 160 }}
          onChange={(value) => {
            const itemId = record._id || record.id;
            updateItemLocal(itemId, { product_condition: value });
            apiClient
              .patch(`/api/v1/sourcing/items/${itemId}`, {
                product_condition: value,
              })
              .then(async () => {
                toastOk("Item updated", `#${itemId} saved`);
                // log item change
                await logItemsOps([
                  {
                    op: "UPDATE",
                    name: record.product_name || "Item",
                    sku: record.sku || undefined,
                    field: "product_condition",
                    from: val ?? null,
                    to: value ?? null,
                  },
                ]);
                setLogsTick((n) => n + 1);
              })
              .catch((err) => {
                updateItemLocal(itemId, { product_condition: val });
                toastErrSticky(
                  "Item update failed",
                  err?.response?.data?.message || err.message || ""
                );
              });
          }}
          size={controlSize}
        >
          <Option value="Excellent">Excellent</Option>
          <Option value="Refurbished">Refurbished</Option>
          <Option value="Acceptable">Acceptable</Option>
          <Option value="Scratched">Scratched</Option>
          <Option value="Unacceptable">Unacceptable</Option>
        </Select>
      ),
    },
    {
      title: "Tested",
      dataIndex: "tested",
      key: "tested",
      render: (val, record) => {
        const itemId = record._id || record.id;
        return (
          <Checkbox
            checked={!!val}
            onChange={(e) => {
              const next = e.target.checked;
              updateItemLocal(itemId, { tested: next });
              apiClient
                .patch(`/api/v1/sourcing/items/${itemId}`, { tested: next })
                .then(async () => {
                  toastOk("Item updated", `#${itemId} saved`);
                  // log item change
                  await logItemsOps([
                    {
                      op: "UPDATE",
                      name: record.product_name || "Item",
                      sku: record.sku || undefined,
                      field: "tested",
                      from: !!val,
                      to: !!next,
                    },
                  ]);
                  setLogsTick((n) => n + 1);
                })
                .catch((err) => {
                  updateItemLocal(itemId, { tested: val });
                  toastErrSticky(
                    "Item update failed",
                    err?.response?.data?.message || err.message || ""
                  );
                });
            }}
          />
        );
      },
      width: 110,
    },
    {
      title: "Target price / unit",
      key: "target_cost_per_unit",
      dataIndex: "target_cost_per_unit",
      align: "center",
      width: 140,
      render: (v) => `$${currency2(Number(v || 0))}`,
    },
    {
      title: "Target Cost",
      key: "total_target_cost",
      align: "center",
      width: 160,
      render: (_, rec) =>
        `$${currency2(
          Number(rec.quantity_needed || 0) *
            Number(rec.target_cost_per_unit || 0)
        )}`,
    },
    {
      title: "Savings",
      key: "savings",
      align: "center",
      width: 140,
      render: (_, rec) => {
        const qty = Number(rec.quantity_needed || 0);
        const tpu = Number(rec.target_cost_per_unit || 0);
        const apu =
          rec.actual_cost_per_unit !== undefined &&
          rec.actual_cost_per_unit !== null
            ? Number(rec.actual_cost_per_unit)
            : Number(rec.sellers_price_per_unit || 0); // fallback if actual not set
        const perUnit = tpu - apu;
        const lineSavings = perUnit * qty;

        return (
          <span style={{ color: lineSavings >= 0 ? "#059669" : "#dc2626" }}>
            ${currency2(lineSavings)}
          </span>
        );
      },
    },

    {
      title: "Seller price / unit",
      key: "sellers_price_per_unit",
      align: "center",
      width: 140,
      render: (_, rec) => `$${currency2(rec.sellers_price_per_unit || 0)}`,
    },
    {
      title: "Actual cost / unit",
      key: "actual_cost_per_unit",
     align: "center",
      width: 140,
      render: (_, rec) => `$${currency2(rec.actual_cost_per_unit || 0)}`,
    },
    {
      title: "Actions",
      key: "actions",
      className: "tw-col-actions",
      fixed: screens.xs ? undefined : "right",
      width: 64,
      align: "center",
      render: (_, record) => (
        <Button
          type="default"
          size="small"
          aria-label="Delete item"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteItem(record)}
          className="
        !p-0 !h-8 !w-8 !min-w-0
        !bg-white
        !border !border-rose-500
        !text-rose-600
        rounded-md
        hover:!bg-rose-50 hover:!border-rose-600 hover:!text-rose-700
        focus:!bg-rose-50
      "
        />
      ),
    },
  ];

  // simple stat tile
  const StatTile = ({ label, value, sub }) => (
    <div
      className="rounded-xl border border-slate-200 bg-white h-full"
      style={{ padding: 12 }}
    >
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-xl font-semibold text-slate-800">{value}</div>
      {sub ? (
        <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
      ) : null}
    </div>
  );

  return (
    <div className="page-container" style={{ padding: screens.xs ? 12 : 16 }}>
      {/* Header */}
      <Space
        align="baseline"
        style={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Title level={screens.xs ? 4 : 2} style={{ margin: 0 }}>
          {`Sourcing ID: ${request.sourcing_id || request._id || "—"}`}
        </Title>

        <Space wrap>
          <Button size={controlSize} onClick={() => navigate(-1)}>
            Back
          </Button>
        </Space>
      </Space>

      {/* ======= Key Totals & Efficiency ======= */}
      <div className="mb-3">
        <Row gutter={gutter}>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <StatTile
              label="Target Total Cost"
              value={`$${currency2(backendTargetTotal ?? 0)}`}
              sub={
                request?.target_total_cost == null
                  ? "summed from items"
                  : undefined
              }
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <StatTile
              label="Total Actual Cost"
              value={`$${currency2(backendActualTotal ?? 0)}`}
              sub={
                request?.total_actual_cost == null
                  ? "summed from items"
                  : undefined
              }
            />
          </Col>
          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <StatTile
              label="Purchase Efficiency"
              value={
                effPct == null ? (
                  "—"
                ) : (
                  <span style={{ color: effColor, fontWeight: 600 }}>
                    {effPct.toFixed(1)}%
                  </span>
                )
              }
            />
          </Col>

          <Col xs={24} sm={12} md={6} lg={6} xl={6}>
            <StatTile
              label="Total Savings"
              value={
                <span style={{ color: savingsColor, fontWeight: 600 }}>
                  ${currency2(totalSavings)}
                </span>
              }
              sub="Target − Actual"
            />
          </Col>
        </Row>
      </div>

      {/* ======= FORM START ======= */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleOrderUpdate}
        initialValues={{ status: request?.status }}
      >
        {/* SOURCER DETAILS — EDITABLE */}
        <Card
          className="bg-sky-50/30"
          title={<span className="font-semibold">Sourcer Details</span>}
          bodyStyle={{ padding: cardPad }}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={gutter}>
            {/* Seller */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="seller" label="Seller Name">
                <Select
                  showSearch
                  allowClear
                  labelInValue
                  size={controlSize}
                  placeholder="Search or create a seller…"
                  onSearch={debouncedSellerSearch}
                  filterOption={false}
                  options={sellerOptionsWithCreate}
                  loading={sellerLoading}
                  onSelect={handleSellerSelect}
                  onChange={(val) =>
                    form.setFieldsValue({ seller: val || undefined })
                  }
                  notFoundContent={sellerLoading ? "Loading..." : null}
                />
              </Form.Item>
            </Col>

            {/* Market */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="market" label="Marketplace">
                <Select
                  showSearch
                  allowClear
                  labelInValue
                  size={controlSize}
                  placeholder="Search or create a marketplace…"
                  onSearch={debouncedMarketSearch}
                  filterOption={false}
                  options={marketOptionsWithCreate}
                  loading={marketLoading}
                  onSelect={handleMarketSelect}
                  onChange={(val) =>
                    form.setFieldsValue({ market: val || undefined })
                  }
                  notFoundContent={marketLoading ? "Loading..." : null}
                />
              </Form.Item>
            </Col>

            <Col xs={24} lg={8}>
              <Form.Item
                name="listing_link"
                label="Listing Link"
                rules={[
                  {
                    validator: (_, v) => {
                      const raw = (v || "").trim();
                      if (!raw) return Promise.resolve();
                      try {
                        const u = new URL(ensureHttp(raw));
                        const ok =
                          (u.protocol === "http:" || u.protocol === "https:") &&
                          isLikelyFqdn(u.hostname);
                        return ok
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error(
                                "Enter a valid URL, e.g., https://example.com"
                              )
                            );
                      } catch {
                        return Promise.reject(
                          new Error(
                            "Enter a valid URL, e.g., https://example.com"
                          )
                        );
                      }
                    },
                  },
                ]}
              >
                <Input size={controlSize} placeholder="https://…" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="sellers_price"
                label="Seller’s Price"
                rules={[{ type: "number", transform: Number, min: 0 }]}
              >
                <InputNumber {...moneyProps} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="shipping_price"
                label="Shipping"
                rules={[{ type: "number", transform: Number, min: 0 }]}
              >
                <InputNumber {...moneyProps} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="tax"
                label="Tax"
                rules={[{ type: "number", transform: Number, min: 0 }]}
              >
                <InputNumber {...moneyProps} />
              </Form.Item>
            </Col>
          </Row>

          {/* Copy Listing button */}
          <Row justify="end">
            <Col>
              {form.getFieldValue("listing_link") || request?.listing_link ? (
                <Button
                  icon={<CopyOutlined />}
                  size={controlSize}
                  onClick={handleCopyListing}
                  className="
                    !bg-emerald-600 !border-emerald-600 !text-white
                    hover:!bg-emerald-700 hover:!border-emerald-700
                    focus:!bg-emerald-700
                    mt-2
                  "
                >
                  Copy Listing
                </Button>
              ) : null}
            </Col>
          </Row>
        </Card>

        {/* ======= ITEMS IN THIS REQUEST ======= */}
        <div className="mt-0 mb-4 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6 border-b bg-sky-50/40">
            <h3 className="text-base font-semibold text-slate-800">
              Items in this Request
            </h3>
            <span className="text-xs font-medium text-slate-600">
              {request.items?.length || 0} items
            </span>
          </div>

          <div className="p-0">
            <Table
              columns={itemColumns}
              dataSource={request.items || []}
              rowKey={(r) =>
                r._id || r.id || `${request._id}-row-${r.sku}-${r.product_name}`
              }
              pagination={false}
              sticky
              scroll={{ x: "max-content" }}
              size={screens.xs ? "small" : "middle"}
              rowClassName={() => "bg-sky-50/5 hover:bg-sky-100/10"}
              className="
                [&_.ant-table-thead>tr>th]:bg-sky-50/40
                [&_.ant-table-thead>tr>th]:text-slate-700
                [&_.ant-table-thead>tr>th]:font-medium
                [&_.ant-table-thead>tr>th]:border-slate-100
                [&_.ant-table-tbody>tr>td]:border-slate-100
                [&_.ant-table-thead>tr>th.tw-col-actions]:!bg-white
                [&_.ant-table-tbody>tr>td.tw-col-actions]:!bg-white
                [&_.ant-table-tbody>tr:hover>td.tw-col-actions]:!bg-white
              "
              locale={{
                emptyText: (
                  <div className="py-10 text-center text-slate-500">
                    No items yet
                  </div>
                ),
              }}
            />
          </div>
        </div>

        {/* ======= UPDATE PURCHASE & TRACKING ======= */}
        <Card
          className=" bg-sky-50/30"
          title={
            <span className="font-semibold">
              Update Purchase & Tracking Details
            </span>
          }
          bodyStyle={{ padding: cardPad }}
        >
          <Row gutter={gutter}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="status"
                label="Order Status"
                rules={[{ required: true }]}
              >
                <Select allowClear size={controlSize}>
                  {[
                    ...(canMarkPurchased ? ["Purchased", "Dropshipped"] : []),
                    "Pending",
                    "Assigned",
                    "Offer",
                    "Disapproved",
                    "Sold",
                    "Hold",
                    "Seller Rejected",
                    "Returned",
                  ].map((s) => (
                    <Option key={s} value={s}>
                      {s}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Market Order #: NOW ALPHANUMERIC */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="market_order_num"
                label="Market Order #"
                dependencies={["status"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const st = getFieldValue("status");
                      const required =
                        STATUS_NEEDS_PURCHASE_DETAILS.includes(st);
                      const raw = (value ?? "").toString().trim();
                      if (!required && raw === "") return Promise.resolve();
                      if (required && raw === "") {
                        return Promise.reject(
                          new Error(
                            'Market Order # is required when status is "Purchased" or "Dropshipped".'
                          )
                        );
                      }
                      // allow common order formats: letters, digits, space, - _ . # /
                      const ok = /^[A-Za-z0-9][A-Za-z0-9\-_.#\/\s]*$/.test(raw);
                      return ok
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(
                              "Use letters/numbers/spaces and - _ . # / only."
                            )
                          );
                    },
                  }),
                ]}
                validateTrigger={["onBlur", "onChange"]}
                hasFeedback
              >
                <Input
                  size={controlSize}
                  placeholder='e.g. EBAY-1234-A (required when "Purchased" or "Dropshipped")'
                  maxLength={64}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="purchase_link"
                label="Purchase Link"
                dependencies={["status"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const st = getFieldValue("status");
                      const required =
                        STATUS_NEEDS_PURCHASE_DETAILS.includes(st);
                      const raw = (value || "").trim();
                      if (!required && !raw) return Promise.resolve();
                      if (required && !raw) {
                        return Promise.reject(
                          new Error(
                            'Purchase Link is required when status is "Purchased" or "Dropshipped".'
                          )
                        );
                      }
                      try {
                        const u = new URL(ensureHttp(raw));
                        const ok =
                          (u.protocol === "http:" || u.protocol === "https:") &&
                          isLikelyFqdn(u.hostname);
                        return ok
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error(
                                "Enter a full domain, e.g., https://example.com"
                              )
                            );
                      } catch {
                        return Promise.reject(
                          new Error(
                            "Enter a valid URL, e.g., https://example.com"
                          )
                        );
                      }
                    },
                  }),
                ]}
                validateTrigger={["onBlur", "onChange"]}
                hasFeedback
              >
                <Input
                  placeholder='Required when "Purchased" or "Dropshipped"'
                  size={controlSize}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="destination_warehouse"
                label="Destination"
                tooltip="Choose a preset or type your own"
              >
                <AutoComplete
                  options={WAREHOUSE_OPTIONS}
                  placeholder="Select or type destination…"
                  allowClear
                  size={controlSize}
                  filterOption={(inputValue, option) =>
                    (option?.value || "")
                      .toLowerCase()
                      .includes((inputValue || "").toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="tracking_status" label="Tracking Status">
                <Select
                  allowClear
                  size={controlSize}
                  placeholder="Select status"
                >
                  {TRACKING_STATUSES.map((s) => (
                    <Option key={s} value={s}>
                      {s}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="carrier"
                label="Carrier"
                dependencies={["tracking_status"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const st = getFieldValue("tracking_status");
                      if (!st || st === "Pending") return Promise.resolve();
                      return value?.value
                        ? Promise.resolve()
                        : Promise.reject(new Error("Carrier is required."));
                    },
                  }),
                ]}
                validateTrigger={["onBlur", "onChange"]}
                hasFeedback
              >
                <Select
                  showSearch
                  allowClear
                  labelInValue
                  size={controlSize}
                  placeholder="Search or create a carrier…"
                  onSearch={debouncedCarrierSearch}
                  filterOption={false}
                  options={carrierOptionsWithCreate}
                  loading={carrierLoading}
                  onSelect={handleCarrierSelect}
                  onChange={(val) =>
                    form.setFieldsValue({ carrier: val || undefined })
                  }
                  notFoundContent={carrierLoading ? "Loading..." : null}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="tracking_link"
                label="Tracking Link"
                dependencies={["tracking_status"]}
                rules={[
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const st = getFieldValue("tracking_status");
                      const raw = (value || "").trim();
                      if (!st || st === "Pending") return Promise.resolve();
                      if (!raw)
                        return Promise.reject(
                          new Error("Tracking link is required.")
                        );
                      try {
                        const u = new URL(ensureHttp(raw));
                        const ok =
                          (u.protocol === "http:" || u.protocol === "https:") &&
                          isLikelyFqdn(u.hostname);
                        return ok
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error(
                                "Enter a full domain, e.g., https://example.com/track/123"
                              )
                            );
                      } catch {
                        return Promise.reject(
                          new Error(
                            "Enter a valid URL, e.g., https://example.com/track/123"
                          )
                        );
                      }
                    },
                  }),
                ]}
              >
                <Input size={controlSize} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item
                shouldUpdate={(prev, cur) => prev.status !== cur.status}
                noStyle
              >
                {({ getFieldValue }) =>
                  getFieldValue("status") === "Offer" ? (
                    <Form.Item
                      name="offer_price"
                      label="Offer Price"
                      rules={[
                        {
                          validator: (_, v) =>
                            Number(v) > 0
                              ? Promise.resolve()
                              : Promise.reject(
                                  new Error("Enter a positive offer price.")
                                ),
                        },
                      ]}
                    >
                      <InputNumber {...moneyProps} />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            style={{ marginTop: 12 }}
            size={controlSize}
          >
            Save All Changes
          </Button>
        </Card>
      </Form>
      {/* ======= FORM END ======= */}

      <div style={{ marginTop: 16 }}>
        <SourcingLogsTimeline
          targetId={request?._id || request?.id}
          refreshKey={logsTick}
          title="Activity Log"
        />
      </div>
    </div>
  );
}
