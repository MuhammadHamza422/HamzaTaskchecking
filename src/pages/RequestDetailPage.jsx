
// src/pages/RequestDetailPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CopyOutlined } from "@ant-design/icons";
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

/* ---------- helpers ---------- */
const lower = (v) => String(v ?? "").trim().toLowerCase();
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

/** Normalize server payload into what the form expects */
const normalizeRequest = (raw = {}) => {
  const sourcing_id = raw.sourcing_id ?? raw.sourcingId ?? undefined;
  const seller_name =
    raw.seller?.name ??
    raw.seller_name ??
    (typeof raw.seller === "string" ? raw.seller : "") ??
    "";

  const market =
    raw.seller?.market?.name ||
    raw.seller?.market?.slug ||
    raw.market?.name ||
    raw.market?.slug ||
    raw.market ||
    "";

  const sellers_price = Number(raw.sellers_price ?? raw.seller_price ?? 0);
  const shipping_price = Number(
    raw.shipping_price ?? raw.shipping_charges ?? 0
  );
  const tax = Number(raw.tax ?? raw.taxes ?? 0);

  const id = raw._id ?? raw.id ?? "";
  const createdAt =
    raw.created_at ?? raw.createdAt ?? raw.created_on ?? undefined;

  // carrier can be ref or string
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

  const items = (Array.isArray(raw.items) ? raw.items : []).map((it, idx) => ({
    _id: it._id ?? it.id ?? `${id}-item-${idx}`,
    product_name: it.product_name ?? it.name ?? "Unnamed",
    sku: it.sku ?? "",
    quantity_needed: Number(it.quantity_needed ?? 1),
    product_condition: it.product_condition ?? null,
    tested: !!it.tested,

    // financials (read-only here)
    target_cost_per_unit: Number(it.target_cost_per_unit ?? 0),
    total_target_cost:
      it.total_target_cost != null
        ? Number(it.total_target_cost)
        : Number(it.quantity_needed ?? 1) *
          Number(it.target_cost_per_unit ?? 0),
    sellers_price_per_unit: Number(it.sellers_price_per_unit ?? 0),
    actual_cost_per_unit: Number(it.actual_cost_per_unit ?? 0),
  }));

  return {
    sourcing_id,
    _id: id,
    id,
    seller_name,
    market,
    listing_link: raw.listing_link ?? raw.listingLink ?? raw.url ?? "",
    sellers_price,
    shipping_price,
    tax,
    status: raw.status ?? "Pending",

    market_order_num: raw.market_order_num ?? "",
    purchase_link: raw.purchase_link ?? "",

    destination_warehouse: raw.destination_warehouse ?? "",
    tracking_status: raw.tracking_status ?? "Pending",
    carrierId,
    carrierName,
    tracking_id: raw.tracking_id ?? "",
    tracking_link: raw.tracking_link ?? "",

    // Accept both, prefer offer_price (schema)
    offer_price: Number(
      raw.offer_price != null ? raw.offer_price : raw.offered_price ?? 0
    ),

    createdAt,
    items,
  };
};

const STATUS_NEEDS_PURCHASE_DETAILS = ["Purchased", "Dropshipped"];
const TRACKING_STATUSES = [
  "Pending",
  "LabelCreated",
  "InTransit",
  "Delivered",
  "QC",
  "Inventory",
];

/** Resolve a carrier {value,label} by id; falls back to id as label */
const resolveCarrierLabel = async (idMaybe) => {
  if (!idMaybe) return null;
  try {
    const direct = await apiClient.get(`/api/v1/carriers/${idMaybe}`);
    if (direct?.data?._id) {
      return { value: direct.data._id, label: direct.data.name };
    }
  } catch (_) {}
  try {
    const { data } = await apiClient.get("/api/v1/carriers", { params: { q: "" } });
    const list = Array.isArray(data) ? data : data?.data || [];
    const hit = list.find((c) => c._id === idMaybe);
    if (hit) return { value: hit._id, label: hit.name };
  } catch (_) {}
  return { value: idMaybe, label: idMaybe };
};

/* ---------- permissions from /api/v1/role/all ---------- */
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

  // permissions
  const [canEditMyRequests, setCanEditMyRequests] = useState(false);
  const [canMarkPurchased, setCanMarkPurchased] = useState(false);
  const [canUpdateTracking, setCanUpdateTracking] = useState(false);

  const [carrierOpts, setCarrierOpts] = useState([]);
  const [carrierLoading, setCarrierLoading] = useState(false);
  const carrierTimer = useRef(null);
  const lastCarrierQuery = useRef("");
  const [logsTick, setLogsTick] = useState(0);

  // Load role map, derive permissions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/role/all");
        const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
        const matched = rolesArr.find((r) => lower(r?.role) === roleName) || null;
        const { canEditMyRequests, canMarkPurchased, canUpdateTracking } =
          extractPerms(matched || {});
        if (!cancelled) {
          setCanEditMyRequests(!!canEditMyRequests);
          setCanMarkPurchased(!!canMarkPurchased);
          setCanUpdateTracking(!!canUpdateTracking);
          setRolesLoaded(true);
        }
      } catch (e) {
        console.error("Failed to load /api/v1/role/all", e);
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

  const handleCarrierSelect = async (val, option) => {
    const rawVal = val && typeof val === "object" ? val.value : val;
    const rawLabel =
      (val && typeof val === "object" && val.label) || option?.label;

    if (rawVal === "__CREATE__") {
      const name = option?.meta?.createName;
      try {
        const { data } = await apiClient.post(
          "/api/v1/carriers/find-or-create",
          { name }
        );
        const createdOpt = { label: data.name, value: data._id, meta: data };
        setCarrierOpts((prev) => {
          const exists = prev.some((o) => o.value === data._id);
          return exists ? prev : [createdOpt, ...prev];
        });
        form.setFieldsValue({ carrier: { value: data._id, label: data.name } });
        toastOk("Carrier created", `${data.name}`);
      } catch (e) {
        toastErr("Carrier create failed", e?.response?.data?.message || "");
      }
      return;
    }

    form.setFieldsValue({
      carrier: { value: rawVal, label: rawLabel || option?.label || String(rawVal) },
    });
  };

  const [form] = Form.useForm();

  // watch fields for total calc (read-only)
  const watchedSellers = Form.useWatch("sellers_price", form);
  const watchedShipping = Form.useWatch("shipping_price", form);
  const watchedTax = Form.useWatch("tax", form);

  const sellers_price = Number(watchedSellers ?? request?.sellers_price ?? 0);
  const shipping_price = Number(
    watchedShipping ?? request?.shipping_price ?? 0
  );
  const tax = Number(watchedTax ?? request?.tax ?? 0);
  const total = sellers_price + shipping_price + tax;

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

      // Prepare carrier field with label
      let carrierField;
      if (normalized.carrierId || normalized.carrierName) {
        if (normalized.carrierName) {
          carrierField = {
            value: normalized.carrierId || normalized.carrierName,
            label: normalized.carrierName,
          };
          if (normalized.carrierId) {
            setCarrierOpts((prev) => {
              const exists = prev.some((o) => o.value === normalized.carrierId);
              return exists
                ? prev
                : [
                    {
                      label: normalized.carrierName,
                      value: normalized.carrierId,
                    },
                    ...prev,
                  ];
            });
          }
        } else if (normalized.carrierId) {
          const resolved = await resolveCarrierLabel(normalized.carrierId);
          carrierField = resolved;
          setCarrierOpts((prev) => {
            const exists = prev.some((o) => o.value === resolved.value);
            return exists
              ? prev
              : [{ label: resolved.label, value: resolved.value }, ...prev];
          });
        }
      }

      // Fill form
      form.setFieldsValue({
        seller_name: normalized.seller_name,
        market: normalized.market,
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
      console.error(err);
      const serverMsg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to fetch request details.";
      toastErr("Load failed", serverMsg);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [seller, sourcingId, id, form]);

  useEffect(() => {
    if (!rolesLoaded) return; // wait for permissions for correct initial UI
    fetchRequest();
  }, [rolesLoaded, fetchRequest]);

  /** Allowed statuses based on permissions */
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

  const canEditAny =
    canEditMyRequests || canMarkPurchased || canUpdateTracking;

  /** Build a PATCH payload and validate conditional rules with permissions. */
  const handleOrderUpdate = async (values) => {
    try {
      const original = request || {};
      const docId = original?._id || original?.id;
      if (!docId) {
        toastWarn("No ID", "Cannot update because sourcing id is missing.");
        return;
      }

      const desiredStatus = String(values?.status ?? original.status ?? "").trim();

      // Block attempts to set disallowed status
      if (!allowedStatusValues.includes(desiredStatus)) {
        if (["Purchased", "Dropshipped"].includes(desiredStatus) && !canMarkPurchased) {
          toastWarn("Not allowed", "You don't have permission to mark as Purchased/Dropshipped.");
          return;
        }
        if (desiredStatus !== original.status && !canEditMyRequests) {
          toastWarn("Not allowed", "You don't have permission to change the order status.");
          return;
        }
      }

      const wantsPurchasedDetails = STATUS_NEEDS_PURCHASE_DETAILS.includes(desiredStatus);

      // Offer price rules — ALWAYS required when status is Offer (as before)
      if (desiredStatus === "Offer") {
        const offer = Number(values?.offer_price);
        if (!(offer > 0)) {
          toastWarn("Missing Offer price", 'Enter "Offer price" when status is "Offer".');
          return;
        }
      }

      // Purchase fields validation only if marking purchased
      const purchaseRaw = (values?.purchase_link || "").trim();
      const normalizedPurchase = purchaseRaw ? ensureHttp(purchaseRaw) : "";
      const monRaw = values?.market_order_num;
      const monStr = monRaw === 0 || monRaw ? String(monRaw).trim() : "";

      if (wantsPurchasedDetails) {
        if (!canMarkPurchased) {
          toastWarn("Not allowed", "You don't have permission to mark this as Purchased/Dropshipped.");
          return;
        }
        if (!normalizedPurchase) {
          toastWarn("Missing purchase link", 'Required when status is "Purchased" or "Dropshipped".');
          return;
        }
        try {
          const u = new URL(normalizedPurchase);
          if (!isLikelyFqdn(u.hostname)) {
            toastWarn("Invalid URL", "Enter a full domain, e.g. https://example.com");
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

      // Tracking validations (based on current tracking_status value)
      const tStatus = values?.tracking_status || original.tracking_status || "Pending";
      const carrierField = values?.carrier;
      const carrierId =
        carrierField && typeof carrierField === "object"
          ? carrierField.value
          : carrierField || undefined;

      const trackingLinkRaw = (values?.tracking_link || "").trim();
      const trackingLinkNorm = trackingLinkRaw ? ensureHttp(trackingLinkRaw) : "";

      if (tStatus && tStatus !== "Pending") {
        if (!carrierId) {
          toastWarn("Carrier required", "Select a carrier when tracking status is not Pending.");
          return;
        }
        if (!trackingLinkNorm) {
          toastWarn("Tracking link required", "Enter a tracking link when tracking status is not Pending.");
          return;
        }
        try {
          const u = new URL(trackingLinkNorm);
          if (!isLikelyFqdn(u.hostname)) {
            toastWarn("Invalid tracking URL", "Enter a full domain, e.g. https://example.com/track/123");
            return;
          }
        } catch {
          toastWarn("Invalid tracking URL", "Tracking link looks malformed.");
          return;
        }
      }

      // Build payload
      const patch = {};

      // Status + offer price
      if (canEditMyRequests || canMarkPurchased) {
        if (allowedStatusValues.includes(desiredStatus)) {
          patch.status = desiredStatus;
        }
      }
      // Always persist offer_price when provided (matches previous behavior)
      if (values?.offer_price != null) {
        patch.offer_price = Number(values.offer_price);
      }

      // Purchasing details (only when allowed)
      if (canMarkPurchased) {
        if (monStr) patch.market_order_num = monStr;
        if (normalizedPurchase) patch.purchase_link = normalizedPurchase;
      }

      // Tracking fields: Only tracking_status is permission-gated for editing.
      if (canUpdateTracking) {
        patch.tracking_status = tStatus || "Pending";
      }
      patch.carrier = carrierId || undefined;
      if (values?.tracking_id != null && String(values.tracking_id).trim() !== "") {
        patch.tracking_id = values.tracking_id;
      }
      if (trackingLinkNorm) patch.tracking_link = trackingLinkNorm;
      if (values?.destination_warehouse) {
        patch.destination_warehouse = values.destination_warehouse;
      }

      if (Object.keys(patch).length === 0) {
        toastWarn("No changes", "Nothing to save.");
        return;
      }

      // Strip empties (keep numeric 0)
      const cleaned = Object.fromEntries(
        Object.entries(patch).filter(
          ([_, v]) => v !== undefined && v !== "" && !(typeof v === "number" && Number.isNaN(v))
        )
      );

      await apiClient.patch(`/api/v1/sourcing/${docId}`, cleaned);
      toastOk("Saved", "Order details updated successfully!");
      fetchRequest();
      setLogsTick((n) => n + 1);
    } catch (err) {
      console.error(err);
      const serverMsg =
        err?.response?.data?.message ||
        err.message ||
        "Failed to update order details.";
      toastErr("Update failed", serverMsg);
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

  // Table columns for Items (inline edits always allowed for non-financials)
  const itemColumns = [
    { title: "Product Name", dataIndex: "product_name", key: "product_name" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    { title: "Qty", dataIndex: "quantity_needed", key: "quantity_needed", width: 90 },
    {
      title: "Condition",
      dataIndex: "product_condition",
      key: "product_condition",
      render: (val, record) => (
        <Select
          value={val || undefined}
          style={{ width: 160 }}
          onChange={(value) =>
            apiClient
              .patch(`/api/v1/sourcing/items/${record._id || record.id}`, { product_condition: value })
              .then(() => {
                toastOk("Item updated", `#${record._id || record.id} saved`);
                fetchRequest();
                setLogsTick((n) => n + 1);
              })
              .catch((err) =>
                toastErr("Item update failed", err?.response?.data?.message || err.message || "")
              )
          }
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
      render: (val, record) => (
        <Checkbox
          checked={!!val}
          onChange={(e) =>
            apiClient
              .patch(`/api/v1/sourcing/items/${record._id || record.id}`, { tested: e.target.checked })
              .then(() => {
                toastOk("Item updated", `#${record._id || record.id} saved`);
                fetchRequest();
                setLogsTick((n) => n + 1);
              })
              .catch((err) =>
                toastErr("Item update failed", err?.response?.data?.message || err.message || "")
              )
          }
        />
      ),
      width: 110,
    },

    // FINANCIAL COLUMNS (read-only)
    {
      title: "Target $ / unit",
      key: "target_cost_per_unit",
      dataIndex: "target_cost_per_unit",
      align: "right",
      width: 140,
      render: (v) => `$${currency2(Number(v || 0))}`,
    },
    {
      title: "Total Target (line)",
      key: "total_target_cost",
      align: "right",
      width: 160,
      render: (_, rec) =>
        `$${currency2(
          Number(rec.quantity_needed || 0) * Number(rec.target_cost_per_unit || 0)
        )}`,
    },
    {
      title: "Seller $ / unit",
      key: "sellers_price_per_unit",
      align: "right",
      width: 140,
      render: (_, rec) => `$${currency2(rec.sellers_price_per_unit || 0)}`,
    },
    {
      title: "Actual $ / unit",
      key: "actual_cost_per_unit",
      align: "right",
      width: 140,
      render: (_, rec) => `$${currency2(rec.actual_cost_per_unit || 0)}`,
    },
  ];

  // US STATE options (static)
  const US_STATES = [
    { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" }, { abbr: "AZ", name: "Arizona" },
    { abbr: "AR", name: "Arkansas" }, { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
    { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
    { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
    { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
    { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
    { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
    { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
    { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
    { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
    { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
    { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
    { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" }, { abbr: "TX", name: "Texas" },
    { abbr: "RI", name: "Rhode Island" }, { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" },
    { abbr: "TN", name: "Tennessee" }, { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
    { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
    { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" },
  ];
  const US_STATE_OPTIONS = US_STATES.map((s) => ({
    value: `US_${s.abbr}`,
    label: `${s.abbr} — ${s.name}`,
  }));

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
          {!!request.listing_link && (
            <Button
              icon={<CopyOutlined />}
              size={controlSize}
              onClick={async () => {
                try {
                  const raw = (request?.listing_link || "").trim();
                  if (!raw) {
                    toastWarn("No link", "This request has no listing link.");
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
              }}
            >
              Copy Listing
            </Button>
          )}
          <Button size={controlSize} onClick={() => navigate(-1)}>
            Back
          </Button>
        </Space>
      </Space>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleOrderUpdate}
        initialValues={{ status: request?.status }}
      >
        {/* SOURCER DETAILS — READ-ONLY */}
        <Card
          title={<span className="font-semibold">Sourcer Details</span>}
          bodyStyle={{ padding: cardPad }}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={gutter}>
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="seller_name" label="Seller Name">
                <Input readOnly disabled size={controlSize} style={{ background: "#fafafa" }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <Form.Item name="market" label="Marketplace">
                <Input readOnly disabled size={controlSize} style={{ background: "#fafafa" }} />
              </Form.Item>
            </Col>

            <Col xs={24} lg={8}>
              <Form.Item name="listing_link" label="Listing Link">
                <Input readOnly disabled size={controlSize} style={{ background: "#fafafa" }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="sellers_price" label="Seller’s Price">
                <InputNumber {...moneyProps} disabled />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="shipping_price" label="Shipping">
                <InputNumber {...moneyProps} disabled />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item name="tax" label="Tax">
                <InputNumber {...moneyProps} disabled />
              </Form.Item>
            </Col>

            <Col xs={24} md={12} lg={8}>
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  fontWeight: 600,
                }}
              >
                Total Order Value: ${currency2(total)}
              </div>
            </Col>
          </Row>
        </Card>

        {/* UPDATE PURCHASE & TRACKING */}
        <Card
          title={<span className="font-semibold">Update Purchase & Tracking Details</span>}
          bodyStyle={{ padding: cardPad }}
        >
          <Row gutter={gutter}>
            {/* Order Status (options restricted by permissions) */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item
                name="status"
                label="Order Status"
                rules={[{ required: true }]}
              >
                <Select
                  allowClear
                  size={controlSize}
                  disabled={!(canEditMyRequests || canMarkPurchased)}
                >
                  {[
                    "Pending",
                    "Assigned",
                    "Offer",
                    "Disapproved",
                    "Sold",
                    "Hold",
                    "Seller Rejected",
                    "Returned",
                    ...(canMarkPurchased ? ["Purchased", "Dropshipped"] : []),
                  ].map((s) => (
                    <Option key={s} value={s}>
                      {s}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Market Order # — required when Purchased/Dropshipped by allowed users */}
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
                        canMarkPurchased && STATUS_NEEDS_PURCHASE_DETAILS.includes(st);
                      if (!required && (value === undefined || value === null || value === "")) {
                        return Promise.resolve();
                      }
                      if (value === 0 || value) {
                        const n = typeof value === "number" ? value : Number(value);
                        if (Number.isFinite(n)) return Promise.resolve();
                        return Promise.reject(new Error("Please enter a valid number."));
                      }
                      return Promise.reject(
                        new Error(
                          'Market Order # is required when status is "Purchased" or "Dropshipped".'
                        )
                      );
                    },
                  }),
                ]}
                validateTrigger={["onBlur", "onChange"]}
                hasFeedback
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={1}
                  stringMode={false}
                  placeholder='Required when "Purchased" or "Dropshipped"'
                  size={controlSize}
                  disabled={!canMarkPurchased}
                />
              </Form.Item>
            </Col>

            {/* Purchase Link — required when Purchased/Dropshipped by allowed users */}
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
                        canMarkPurchased && STATUS_NEEDS_PURCHASE_DETAILS.includes(st);
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
                              new Error("Enter a full domain, e.g., https://example.com")
                            );
                      } catch {
                        return Promise.reject(
                          new Error("Enter a valid URL, e.g., https://example.com")
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
                  disabled={!canMarkPurchased}
                />
              </Form.Item>
            </Col>

            {/* Destination (always editable) */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="destination_warehouse" label="Destination">
                <Select
                  allowClear
                  showSearch
                  size={controlSize}
                  placeholder="Select a state…"
                  options={US_STATE_OPTIONS}
                  optionFilterProp="label"
                  filterOption={(input, option) =>
                    (option?.label || "").toLowerCase().includes(input.toLowerCase())
                  }
                />
              </Form.Item>
            </Col>

            {/* Tracking Status (only this gets disabled when update-tracking is OFF) */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item name="tracking_status" label="Tracking Status">
                <Select
                  allowClear
                  size={controlSize}
                  placeholder="Select status"
                  disabled={!canUpdateTracking}
                >
                  {TRACKING_STATUSES.map((s) => (
                    <Option key={s} value={s}>
                      {s}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            {/* Carrier (always editable; validation based on tracking_status) */}
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
                  onChange={(val) => form.setFieldsValue({ carrier: val || undefined })}
                  notFoundContent={carrierLoading ? "Loading..." : null}
                />
              </Form.Item>
            </Col>

            {/* Tracking Link (always editable; validation based on tracking_status) */}
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
                        return Promise.reject(new Error("Tracking link is required."));
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
                validateTrigger={["onBlur", "onChange"]}
                hasFeedback
              >
                <Input size={controlSize} />
              </Form.Item>
            </Col>

            {/* Offer price — visible ANY time status === "Offer" (no permission gate) */}
            <Col xs={24} md={12} lg={8}>
              <Form.Item shouldUpdate={(prev, cur) => prev.status !== cur.status} noStyle>
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
                              : Promise.reject(new Error("Enter a positive offer price.")),
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
            disabled={!canEditAny}
          >
            Save All Changes
          </Button>
        </Card>
      </Form>

      <Card
        title="Items in this Request"
        style={{ marginTop: 16 }}
        bodyStyle={{ padding: cardPad }}
      >
        <Table
          columns={itemColumns}
          dataSource={request.items || []}
          rowKey={(r) =>
            r._id || r.id || `${request._id}-row-${r.sku}-${r.product_name}`
          }
          pagination={false}
          scroll={{ x: "max-content" }}
          size={screens.xs ? "small" : "middle"}
        />
      </Card>

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
