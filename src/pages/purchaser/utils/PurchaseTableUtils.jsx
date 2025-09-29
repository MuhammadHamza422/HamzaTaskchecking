
import React from "react";
import { Table, Empty, Tag } from "antd";
import dayjs from "dayjs";

/* ---------------- core helpers (exported) ---------------- */
export const num = (v) => (typeof v === "number" ? v : Number(v) || 0);

export const getCreated = (rec) =>
  rec?.created_at || rec?.createdAt || rec?.created_on || rec?.createdOn || null;

export const money = (x, currency = "USD") =>
  typeof x === "number"
    ? x.toLocaleString(undefined, { style: "currency", currency })
    : "—";

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
      target_total_cost: doc.target_total_cost ?? 0,
      total_actual_cost: doc.total_actual_cost ?? 0,
      purchase_efficiency:
        typeof doc.purchase_efficiency === "number"
          ? doc.purchase_efficiency
          : (Number(doc.target_total_cost) || 0) - (Number(doc.total_actual_cost) || 0),
      status: doc.status ?? "Pending",
      listing_link: doc.listing_link ?? doc.listingLink ?? doc.url ?? null,
      listing_id: doc.listing_id ?? doc.listingId ?? null,
      assignedAt: doc.assigned_at ?? doc.assignedAt ?? null,
      purchaser_id: doc.purchaser_id ?? doc.purchaserId ?? null,
    };
  });
};

/* ---------------- expandable items table (exported) ---------------- */
export function ExpandedItemsTable({ order, onOpen }) {
  const rows = Array.isArray(order?.items) ? order.items : [];
  if (!rows.length) return <Empty description="No products on this request" />;

  // tiny helpers (self-contained; uses global fmtMoney if present)
  const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
  const round2  = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;
  const money   = (v) =>
    typeof fmtMoney === "function" ? fmtMoney(safeNum(v)) : `$${safeNum(v).toFixed(2)}`;

  const lineTarget = (r) =>
    Number.isFinite(Number(r?.total_target_cost))
      ? safeNum(r.total_target_cost)
      : round2(safeNum(r?.quantity_needed || 1) * safeNum(r?.target_cost_per_unit));

  const lineActual = (r) =>
    Number.isFinite(Number(r?.total_actual_cost))
      ? safeNum(r.total_actual_cost)
      : round2(safeNum(r?.quantity_needed || 1) * safeNum(r?.actual_cost_per_unit));

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* top spacer (kept minimal, no metrics) */}
      <div className="px-4 py-3 bg-gray-50" />

      <Table
        rowKey={(r) => r._id || r.id || `${r.sku}-${r.product_name || r.name || "item"}`}
        size="small"
        bordered
        pagination={false}
        dataSource={rows}
        onRow={(_, idx) => ({ style: { backgroundColor: idx % 2 ? "#fafcff" : "#fff" } })}
        rowClassName="hover:bg-blue-50 transition-colors"
        columns={[
          {
            title: "Product",
            key: "product",
            width: 320,
            render: (_t, r) => {
              const label = r?.product_name || r?.name || "Untitled";
              const reqId = order?._id || order?.id;
              return (
                <div style={{ lineHeight: 1.2 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (reqId && onOpen) onOpen(`/requests/${reqId}?item=${r._id || r.id}`);
                    }}
                    style={{
                      padding: 0,
                      border: "none",
                      background: "none",
                      color: "#1677ff",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {label}
                  </button>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    SKU: {r?.sku || "—"}
                  </div>
                </div>
              );
            },
          },
          {
            title: "Qty",
            dataIndex: "quantity_needed",
            width: 80,
            align: "center",
            render: (v) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{safeNum(v)}</span>
            ),
          },
          {
            title: "Target $ / unit",
            dataIndex: "target_cost_per_unit",
            align: "right",
            width: 140,
            render: (v) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
            ),
          },
            {
            title: "Total Target",
            key: "total_target_cost",
            align: "right",
            width: 140,
            render: (_t, r) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(lineTarget(r))}</span>
            ),
          },
          {
            title: "Actual $ / unit",
            dataIndex: "actual_cost_per_unit",
            align: "right",
            width: 140,
            render: (v) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
            ),
          },
          {
            title: "Total Actual",
            key: "total_actual_cost",
            align: "right",
            width: 140,
            render: (_t, r) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(lineActual(r))}</span>
            ),
          },
        ]}
      />

      {/* bottom spacer (kept minimal, no totals row) */}
      <div className="px-4 py-3 bg-gray-50" />
    </div>
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
    const efficiency =
      typeof r?.purchase_efficiency === "number"
        ? r.purchase_efficiency
        : (Number(r?.target_total_cost) || 0) - (Number(r?.total_actual_cost) || 0);

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
      TargetCost: r.target_total_cost,
      ActualCost: r.total_actual_cost,
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
    width: 120,
    render: (v) => {
      const n = typeof v === "number" ? v : Number(v) || 0;
      const color = n >= 0 ? "#16a34a" : "#ef4444";
      return (
        <span style={{ color, fontWeight: 600 }}>
          {money(Math.abs(n), currency)}
        </span>
      );
    },
  },
  {
    title: "Status",
    dataIndex: "Status",
    width: 120,
    render: (s) => (
      <Tag color={statusColor(s)} style={{ borderRadius: 6}}>
        {s}
      </Tag>
    ),
  },
  { title: "Seller", dataIndex: "Seller", width: 180, ellipsis: true },
  { title: "Market", dataIndex: "Market", width: 120, ellipsis: true },
  {
    title: "Seller Price",
    dataIndex: "SellerPrice",
    align: "right",
    width: 130,
    render: (v) => money(typeof v === "number" ? v : Number(v) || 0, currency),
  },
  {
    title: "Shipping charges",
    dataIndex: "ShipCharges",
    align: "right",
    width: 150,
    render: (v) => money(typeof v === "number" ? v : Number(v) || 0, currency),
  },
  {
    title: "Tax",
    dataIndex: "Tax",
    align: "right",
    width: 110,
    render: (v) => money(typeof v === "number" ? v : Number(v) || 0, currency),
  },
  {
    title: "Target Cost",
    dataIndex: "TargetCost",
    align: "right",
    width: 130,
    render: (v) => money(typeof v === "number" ? v : Number(v) || 0, currency),
  },
  {
    title: "Actual Cost",
    dataIndex: "ActualCost",
    align: "right",
    width: 130,
    render: (v) => money(typeof v === "number" ? v : Number(v) || 0, currency),
  },

  {
    title: "Created At",
    dataIndex: "CreatedAt",
    width: 180,
    render: (d) => (d ? dayjs(d).format("YYYY-MM-DD hh:mm A") : "—"),
  },
];
