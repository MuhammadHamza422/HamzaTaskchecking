
// src/pages/sourcer/components/SourcingExportButton.jsx
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import apiClient from "../../../api/client";
import ExportCsvButton from "./export/ExportCsvButton";

/** EXACT HEADERS (no extras) */
const CSV_HEADERS = [
  "Sourcing ID",
  "Product Name",
  "SKU",
  "Product Type",
  "Category",
  "Supplier",
  "Market",
  "Origin",
  "Target Cost Per Unit",
  "Qty",
  "Target CostTotal",
  "Seller's Price",
  "Seller's Price\nPer Unit",
  "Shipping Charges",
  "Taxes",
  "Actual Cost\nPer Unit",
  "Total \nActual Cost",
  "SKU Efficiency",
  "Purchase Efficiency",
  "Listing Link",
  "Sourcing Time",
  "Sourcer Remarks",
  "Status",
  "Tested or Untested",
  "Product Condition",
  "Purchaser",
  "Purchaser Action Time",
  "Purchaser Response Time",
  "Purchaser Remarks",
  "Market Order #",
  "Purchase Link",
  "Destination Warehouse",
  "Tracking Status",
  "Carrier",
  "Tracking ID",
  "Tracking Link",
];

/* ---------- helpers ---------- */
const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
const valOrBlank = (v) => (v === null || v === undefined ? "" : v);
const isLikelyObjectId = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s);

const getMarketDisplay = (m) => {
  if (!m) return "";
  if (typeof m === "object") return m.name || m.title || m.market || "";
  // raw id → leave blank (no leaking ObjectId)
  return "";
};

const getSellerName = (seller) => {
  if (!seller) return "";
  return typeof seller === "object"
    ? seller.name || seller.seller_name || seller.title || ""
    : "";
};

const targetFromItems = (items = []) =>
  items.reduce(
    (s, it) =>
      s +
      num(it.target_cost_per_unit ?? it.target_cost ?? 0) *
        num(it.quantity_needed ?? it.qty ?? 0),
    0
  );

const actualFromOrder = (r) =>
  num(r.sellers_price) +
  num(r.shipping_charges ?? r.shipping_price) +
  num(r.taxes ?? r.tax);

const getCreatedDT = (r) => {
  const created = r.createdAt || r.created_at || r.created_on || null;
  return created ? dayjs(created).format("YYYY-MM-DD HH:mm:ss") : "";
};

const getTestedLabel = (it) =>
  it?.tested === true ? "Tested" : it?.tested === false ? "Untested" : "";

/* ---------- robust purchaser name extraction ---------- */
const extractNameFromUserLike = (obj) => {
  if (!obj || typeof obj !== "object") return "";
  const direct =
    [obj.firstName, obj.lastName].filter(Boolean).join(" ") ||
    obj.name ||
    obj.email ||
    obj.username ||
    "";
  if (direct) return direct;
  // nested user (sometimes data is shaped like { purchaser_id: { user: {...} } })
  if (obj.user && typeof obj.user === "object") {
    return (
      [obj.user.firstName, obj.user.lastName].filter(Boolean).join(" ") ||
      obj.user.name ||
      obj.user.email ||
      obj.user.username ||
      ""
    );
  }
  return "";
};

const getPurchaserName = (r) => {
  // check common fields in priority order
  const candidates = [
    r?.purchaser_name,
    extractNameFromUserLike(r?.purchaser),
    extractNameFromUserLike(r?.purchaser_id),
    extractNameFromUserLike(r?.purchaserId),
    extractNameFromUserLike(r?.assignee),
    extractNameFromUserLike(r?.assigned_to),
    extractNameFromUserLike(r?.assignedTo),
  ].filter((x) => typeof x === "string" && x.trim().length > 0);

  return candidates[0] || "";
};

/* ---------- carrier lookup ---------- */
const gatherCarrierIds = (orders = []) => {
  const set = new Set();
  for (const r of orders) {
    const c = r?.carrier;
    if (!c) continue;
    if (typeof c === "object") {
      if (c._id) set.add(String(c._id));
      else if (c.id) set.add(String(c.id));
    } else if (typeof c === "string" && isLikelyObjectId(c)) {
      set.add(c);
    }
  }
  return Array.from(set);
};

const useCarrierNameMap = (orders) => {
  const [map, setMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids = gatherCarrierIds(orders);
    if (!ids.length) {
      setMap({});
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/carriers/lookup", {
          params: { ids: ids.join(",") },
        });
        if (!alive) return;
        const m = {};
        (Array.isArray(data) ? data : []).forEach((d) => {
          if (d?._id) m[String(d._id)] = d.name || "";
        });
        setMap(m);
      } catch (e) {
        console.error("carrier lookup failed", e);
        setMap({});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [orders]);

  return { map, loading };
};

const carrierDisplay = (carrier, nameMap) => {
  if (!carrier) return "";
  if (typeof carrier === "object") {
    if (carrier.name) return carrier.name;
    const key = String(carrier._id || carrier.id || "");
    if (key && nameMap[key]) return nameMap[key];
    return "";
  }
  if (isLikelyObjectId(carrier)) return nameMap[carrier] || "";
  return carrier; // plain string like "UPS"
};

/* ---------- row mapping (1 row per item) ---------- */
const mapOrderItemToRow = (r, it, carrierMap) => {
  const tOrder = num(r.target_total_cost) || targetFromItems(r.items || []);
  const aOrder = num(r.total_actual_cost) || actualFromOrder(r);

  const tpu = num(it?.target_cost_per_unit ?? it?.target_cost ?? 0);
  const qty = num(it?.quantity_needed ?? it?.qty ?? 0);
  const tTotal = num(it?.total_target_cost) || (tpu && qty ? tpu * qty : 0);

  const apu =
    it?.actual_cost_per_unit != null
      ? num(it.actual_cost_per_unit)
      : it?.sellers_price_per_unit != null
      ? num(it.sellers_price_per_unit)
      : 0;

  const skuEff = tpu && apu && qty ? (tpu - apu) * qty : "";
  const purchaseEff = (tOrder || aOrder) ? tOrder - aOrder : "";

  return [
    valOrBlank(r.sourcing_id ?? r.id ?? r._id ?? ""),
    valOrBlank(it?.product_name || it?.name || r.product_name || r.title || ""),
    valOrBlank(it?.sku || r.sku || ""),
    valOrBlank(it?.product_type || ""),
    valOrBlank(it?.category || ""),
    valOrBlank(getSellerName(r.seller)),
    valOrBlank(getMarketDisplay(r.market)),
    valOrBlank(r.origin || ""),
    tpu || "",
    qty || "",
    tTotal || "",
    num(r.sellers_price) || "",
    (it?.sellers_price_per_unit != null ? num(it.sellers_price_per_unit) : "") || "",
    num(r.shipping_charges ?? r.shipping_price) || "",
    num(r.taxes ?? r.tax) || "",
    apu || "",
    aOrder || "",
    skuEff,
    purchaseEff,
    valOrBlank(r.listing_link || ""),
    getCreatedDT(r),
    valOrBlank(r.sourcer_remarks || r.remarks || r.notes || ""),
    valOrBlank(r.status || ""),
    valOrBlank(getTestedLabel(it)),
    valOrBlank(it?.product_condition || ""),
    valOrBlank(getPurchaserName(r)), // ← robust purchaser extraction
    valOrBlank(r.purchaserActionTime ? dayjs(r.purchaserActionTime).format("YYYY-MM-DD HH:mm:ss") : ""),
    valOrBlank(r.purchaserResponseTime ? dayjs(r.purchaserResponseTime).format("YYYY-MM-DD HH:mm:ss") : ""),
    valOrBlank(r.purchaser_remarks || ""),
    valOrBlank(r.market_order_num || ""),
    valOrBlank(r.purchase_link || ""),
    valOrBlank(r.destination_warehouse || ""),
    valOrBlank(r.tracking_status || ""),
    valOrBlank(carrierDisplay(r.carrier, carrierMap)),
    valOrBlank(r.tracking_id || ""),
    valOrBlank(r.tracking_link || ""),
  ];
};

const mapOrderToRows = (r, carrierMap) => {
  const items = Array.isArray(r.items) && r.items.length ? r.items : [null];
  return items.map((it) => mapOrderItemToRow(r, it || {}, carrierMap));
};

export default function SourcingExportButton({
  orders = [],
  filenameBase = "sourcing_export",
  className = "",
  label = "Export CSV",
}) {
  const { map: carrierNameMap, loading: carriersLoading } = useCarrierNameMap(orders);

  const rows = useMemo(
    () => orders.flatMap((r) => mapOrderToRows(r, carrierNameMap)),
    [orders, carrierNameMap]
  );

  const filename = `${filenameBase}_${dayjs().format("YYYYMMDD_HHmm")}.csv`;

  return (
    <ExportCsvButton
      headers={CSV_HEADERS}
      rows={rows}
      filename={filename}
      disabled={carriersLoading}
      className={[
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md",
        "bg-orange-400 hover:bg-orange-500 disabled:bg-orange-300",
        "text-white shadow-sm hover:shadow",
        className,
      ].join(" ")}
    >
      {carriersLoading ? "Preparing…" : label}
    </ExportCsvButton>
  );
}
