
// src/pages/purchaser/utils/PurchaseTableUtils.jsx
import React from "react";
import { Table, Empty, Tooltip } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

/* ---------------- core helpers (exported) ---------------- */
export const num = (v) => (typeof v === "number" ? v : Number(v) || 0);

export const getCreated = (rec) =>
  rec?.created_at || rec?.createdAt || rec?.created_on || rec?.createdOn || null;

/** Money formatter with MINUS before the $ sign, e.g. "- $123.45" */
export const money = (x, _currency = "USD") => {
  const n = typeof x === "number" ? x : Number(x) || 0;
  const neg = n < 0;
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${neg ? "-" : ""}$${abs}`;
};

/* --- Kept for legacy callers, but we won't use <Tag/> colors anymore --- */
export const statusColor = (s) => {
  switch (s) {
    case "Assigned": return "gold";
    case "Offer": return "blue";
    case "Purchased": return "green";
    case "Disapproved": return "red";
    case "Sold": return "purple";
    case "Hold": return "orange";
    case "Seller Rejected": return "magenta";
    case "Dropshipped": return "cyan";
    case "Returned": return "volcano";
    default: return "geekblue";
  }
};

/* --------- Simple badge styling --------- */
const STATUS_BADGE_CLASS = {
  Pending: "bg-gray-100 text-gray-800",
  Assigned: "bg-amber-100 text-amber-800",
  Offer: "bg-blue-100 text-blue-800",
  Purchased: "bg-green-100 text-green-800",
  Disapproved: "bg-red-100 text-red-800",
  Sold: "bg-purple-100 text-purple-800",
  Hold: "bg-orange-100 text-orange-800",
  "Seller Rejected": "bg-rose-100 text-rose-800",
  Dropshipped: "bg-cyan-100 text-cyan-800",
  Returned: "bg-rose-100 text-rose-800",
};

export function StatusBadge({ status }) {
  const s = String(status || "Pending");
  const cls = STATUS_BADGE_CLASS[s] || STATUS_BADGE_CLASS.Pending;
  return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{s}</span>;
}

/* ----------------------------------------------------------------------- */

export const labelFromMarket = (m) => {
  if (!m) return "—";
  if (typeof m === "string") return m;
  if (typeof m === "object") return m.name || m.label || m.title || m.slug || "—";
  return "—";
};

const prettyMarket = (m) => {
  if (!m) return "";
  if (typeof m === "object") return m.name || m.label || m.title || "";
  if (/^[0-9a-f]{24}$/i.test(m) || /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(m)) return "";
  return String(m).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
};

/* ---------------- normalizer (exported for pages) ---------------- */
export const normalizeRequests = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.data || payload?.results || [];
  return (Array.isArray(list) ? list : []).map((doc) => {
    const id = doc._id ?? doc.id ?? String(doc._id || "");
    const created_at = getCreated(doc);
    const items = Array.isArray(doc.items) ? doc.items : [];

    const sourcer_name =
      doc.sourcer?.name ??
      doc.sourcer_name ??
      doc.sourcerName ??
      (typeof doc.sourcer === "string" ? doc.sourcer : undefined) ?? "";

    const seller_name =
      doc.seller?.name ??
      doc.seller_name ??
      doc.sellerName ??
      (typeof doc.seller === "string" ? doc.seller : undefined) ?? "";

    const market = prettyMarket(
      doc.seller?.market_name ??
        doc.seller?.marketName ??
        doc.market_name ??
        doc.marketName ??
        doc.seller?.market ??
        doc.market ??
        ""
    );

    // Resolve totals safely
    const target = num(doc.target_total_cost);
    const actual = num(
      doc.total_actual_cost ||
        (num(doc.sellers_price) +
          num(doc.shipping_charges ?? doc.shipping_price) +
          num(doc.taxes ?? doc.tax))
    );

    // Efficiency placeholder = Target − Actual (positive = savings)
    const purchase_efficiency =
      typeof doc.purchase_efficiency === "number"
        ? doc.purchase_efficiency
        : target - actual;

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
      target_total_cost: target,
      total_actual_cost: actual,
      purchase_efficiency,
      status: doc.status ?? "Pending",
      listing_link: doc.listing_link ?? doc.listingLink ?? doc.url ?? null,
      listing_id: doc.listing_id ?? doc.listingId ?? null,
      assignedAt: doc.assigned_at ?? doc.assignedAt ?? null,
      purchaser_id: doc.purchaser_id ?? doc.purchaserId ?? null,
    };
  });
};

/* ---------------- Tooltip helpers ---------------- */
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

/* ---------------- expandable items table (exported) ---------------- */
/** Keep horizontal scroll; hide vertical scroll. No link in product cell. */
export function ExpandedItemsTable({ order /*, onOpen intentionally unused */ }) {
  const rows = Array.isArray(order?.items) ? order.items : [];
  if (!rows.length) return <Empty description="No products on this request" />;

  // tiny helpers
  const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
  const round2  = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;
  const fmt     = (v) => money(safeNum(v));

  // order-level rollups
  const orderTarget =
    Number.isFinite(Number(order?.target_total_cost))
      ? safeNum(order.target_total_cost)
      : rows.reduce(
          (s, it) => s + safeNum(it.quantity_needed || 1) * safeNum(it.target_cost_per_unit),
          0
        );

  const orderActual =
    Number.isFinite(Number(order?.total_actual_cost))
      ? safeNum(order.total_actual_cost)
      : safeNum(order?.sellers_price) +
        safeNum(order?.shipping_charges ?? order?.shipping_price) +
        safeNum(order?.taxes ?? order?.tax);

  const sellerAllocFactor = orderTarget > 0 ? safeNum(order?.sellers_price) / orderTarget : 0;
  const actualAllocFactor = orderTarget > 0 ? orderActual / orderTarget : 0;

  // per-item helpers
  const qtyOf   = (r) => Math.max(1, safeNum(r?.quantity_needed));
  const tpu     = (r) => safeNum(r?.target_cost_per_unit);

  const totalTarget = (r) =>
    Number.isFinite(Number(r?.total_target_cost))
      ? safeNum(r.total_target_cost)
      : round2(qtyOf(r) * tpu(r));

  const sellerPerUnit = (r) =>
    r?.sellers_price_per_unit != null
      ? safeNum(r.sellers_price_per_unit)
      : round2(sellerAllocFactor * tpu(r));

  const actualPerUnit = (r) =>
    r?.actual_cost_per_unit != null
      ? safeNum(r.actual_cost_per_unit)
      : round2(actualAllocFactor * tpu(r));

  const totalActual = (r) =>
    Number.isFinite(Number(r?.total_actual_cost))
      ? safeNum(r.total_actual_cost)
      : round2(qtyOf(r) * actualPerUnit(r));

  return (
    <>
      <Table
        rowKey={(r) => r._id || r.id || `${r.sku}-${r.product_name || r.name || "item"}`}
        size="small"
        bordered={false}
        pagination={false}
        dataSource={rows}
        tableLayout="fixed"
        scroll={{ x: "max-content" }}          
        style={{ margin: 0, width: "100%" }}
        className="expanded-subtable !m-0"
        onRow={(_, idx) => ({ style: { backgroundColor: idx % 2 ? "#fafcff" : "#fff" } })}
        rowClassName="hover:bg-blue-50 transition-colors"
        columns={[
          {
            title: "Product",
            key: "product",
            width: 300,
            render: (_t, r) => {
              const label = r?.product_name || r?.name || "Untitled";
              return (
                <div className="leading-tight">
                  <div className="text-slate-800 font-semibold">{label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">SKU: {r?.sku || "—"}</div>
                </div>
              );
            },
          },
          {
            title: colTitle("Qty", "Quantity needed for this line item."),
            dataIndex: "quantity_needed",
            width: 72,
            align: "center",
            render: (v) => <span className="tabular-nums">{safeNum(v)}</span>,
          },
          {
            title: colTitle("Type", "Product type/category."),
            dataIndex: "product_type",
            width: 96,
            align: "center",
            render: (v) => v || "—",
          },
          {
            title: colTitle("Target price / unit", "Target cost per unit set for this item."),
            dataIndex: "target_cost_per_unit",
            align: "right",
            width: 150,
            render: (v) => <span className="tabular-nums">{fmt(v)}</span>,
          },
          {
            title: colTitle(
              "Total Target",
              "Qty × Target price / unit (or provided total_target_cost)."
            ),
            key: "total_target_cost",
            align: "right",
            width: 150,
            render: (_t, r) => <span className="tabular-nums">{fmt(totalTarget(r))}</span>,
          },
          {
            title: colTitle(
              "Seller price / unit",
              "If missing, uses (Seller Price ÷ Target Total) × Target/unit."
            ),
            key: "sellers_price_per_unit",
            align: "right",
            width: 170,
            render: (_t, r) => <span className="tabular-nums">{fmt(sellerPerUnit(r))}</span>,
          },
          {
            title: colTitle(
              "Actual cost / unit",
              "If missing, uses (Total Actual ÷ Target Total) × Target/unit."
            ),
            key: "actual_cost_per_unit",
            align: "right",
            width: 170,
            render: (_t, r) => <span className="tabular-nums">{fmt(actualPerUnit(r))}</span>,
          },
          {
            title: colTitle(
              "Saving / Unit",
              "Target/unit − Actual/unit. Positive = under target."
            ),
            key: "saving_per_unit",
            align: "right",
            width: 150,
            render: (_t, r) => {
              const val = round2(tpu(r) - actualPerUnit(r));
              const cls = val >= 0 ? "text-green-600" : "text-red-600";
              return <span className={`font-semibold tabular-nums ${cls}`}>{fmt(val)}</span>;
            },
          },
          {
            title: colTitle(
              "Saving / SKU",
              "Qty × (Target/unit − Actual/unit). Positive = under target."
            ),
            key: "saving_per_sku",
            align: "right",
            width: 160,
            render: (_t, r) => {
              const val = round2(qtyOf(r) * (tpu(r) - actualPerUnit(r)));
              const cls = val >= 0 ? "text-green-600" : "text-red-600";
              return <span className={`font-semibold tabular-nums ${cls}`}>{fmt(val)}</span>;
            },
          },
          {
            title: colTitle(
              "Total Actual Cost",
              "If missing, uses Qty × Actual cost / unit."
            ),
            key: "total_actual_cost",
            align: "right",
            width: 170,
            render: (_t, r) => <span className="tabular-nums">{fmt(totalActual(r))}</span>,
          },
        ]}
      />

      {/* Keep horizontal scroll, hide vertical scroll ONLY for the subtable */}
      <style>{`
        .expanded-subtable .ant-table-content,
        .expanded-subtable .ant-table-body {
          overflow-x: auto !important;
          overflow-y: hidden !important;
          max-height: none !important;
        }
      `}</style>
    </>
  );
}

/* ---------------- Top-5 helpers ---------------- */
export const isPurchased = (r) => {
  const s = String(r?.status ?? "").trim().toLowerCase();
  return (
    ["purchased", "purchase completed", "completed", "bought"].includes(s) ||
    r?.is_purchased === true
  );
};

export const sortByCreatedDesc = (a, b) => {
  const ad = dayjs(getCreated(a));
  const bd = dayjs(getCreated(b));
  const ai = ad.isValid();
  const bi = bd.isValid();
  if (ai && bi) return bd.valueOf() - ad.valueOf();
  if (ai && !bi) return -1;
  if (!ai && bi) return 1;
  return 0;
};

/* Build rows for the exact-columns Top-5 table */
export const buildTop5PurchasedDetailedRows = (
  data,
  { limit = 5, requirePurchased = false } = {}
) => {
  const rows = Array.isArray(data) ? data : [];
  const pool = requirePurchased ? rows.filter(isPurchased) : rows.slice();
  const take = pool.sort(sortByCreatedDesc).slice(0, limit);

  return take.map((r, i) => {
    const target = num(r?.target_total_cost);
    const actual =
      num(r?.total_actual_cost) ||
      (num(r?.sellers_price) +
        num(r?.shipping_charges ?? r?.shipping_price) +
        num(r?.taxes ?? r?.tax));

    const efficiency =
      typeof r?.purchase_efficiency === "number"
        ? r.purchase_efficiency
        : target - actual; // Target − Actual

    return {
      key: r._id || r.id || i,
      ID: r.sourcing_id ?? r.id ?? r._id ?? "—",
      Sourcer: r.sourcer_name ?? r.sourcerName ?? "—",
      Status: r.status || "—",
      Seller: r.seller_name ?? r.sellerName ?? "—",
      Market: labelFromMarket(r.market ?? r.sellerMarket),
      SellerPrice: r.sellers_price,
      ShipCharges: r.shipping_charges ?? r.shipping_price,
      Tax: r.taxes ?? r.tax,
      TargetCost: target,
      ActualCost: actual,
      Efficiency: efficiency,
      CreatedAt: getCreated(r),
      _original: r, // keep original for expandable rows
    };
  });
};

/* Columns in the exact order requested */
export const createTop5PurchasedDetailedColumns = (currency = "USD") => [
  {
    title: "ID",
    dataIndex: "ID",
    width: 120,
    render: (v) => <strong>#{String(v).slice(-6)}</strong>,
  },
  { title: "Sourcer", dataIndex: "Sourcer", width: 160 },
  {
    title: "Efficiency",
    dataIndex: "Efficiency",
    align: "right",
    width: 130,
    render: (v) => {
      const n = typeof v === "number" ? v : Number(v) || 0;
      const color = n >= 0 ? "#16a34a" : "#ef4444";
      return (
        <span style={{ color, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {money(n, currency)}
        </span>
      );
    },
  },
  {
    title: "Status",
    dataIndex: "Status",
    width: 130,
    render: (s) => <StatusBadge status={s} />,
  },
  { title: "Seller", dataIndex: "Seller", width: 180, ellipsis: true },
  { title: "Market", dataIndex: "Market", width: 120, ellipsis: true },
  {
    title: "Seller Price",
    dataIndex: "SellerPrice",
    align: "right",
    width: 130,
    render: (v) => money(v, currency),
  },
  {
    title: "Shipping charges",
    dataIndex: "ShipCharges",
    align: "right",
    width: 150,
    render: (v) => money(v, currency),
  },
  {
    title: "Tax",
    dataIndex: "Tax",
    align: "right",
    width: 110,
    render: (v) => money(v, currency),
  },
  {
    title: "Target Cost",
    dataIndex: "TargetCost",
    align: "right",
    width: 130,
    render: (v) => money(v, currency),
  },
  {
    title: "Actual Cost",
    dataIndex: "ActualCost",
    align: "right",
    width: 130,
    render: (v) => money(v, currency),
  },
  {
    title: "Created At",
    dataIndex: "CreatedAt",
    width: 180,
    render: (d) => (d ? dayjs(d).format("YYYY-MM-DD hh:mm A") : "—"),
  },
];
