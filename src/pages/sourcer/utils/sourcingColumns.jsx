
// src/pages/sourcer/utils/sourcingColumns.jsx
import React, { useEffect, useState } from "react";
import { Table, Space, Typography, Tooltip, Button, Popconfirm } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import { Pencil, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import apiClient from "../../../api/client";

const { Text } = Typography;

/* ---------- helpers ---------- */
const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
const fmtDateTime = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "N/A");

const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
const round2 = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;

/** Money with minus BEFORE the dollar sign, e.g. "- $123.45" */
const fmtMoneySignFirst = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "$0.00";
  const neg = n < 0;
  const abs = Math.abs(n).toFixed(2);
  return `${neg ? "- " : ""}$${abs}`;
};

const formatOid = (id) =>
  id ? String(id).slice(0, 6) + "…" + String(id).slice(-4) : "—";

const idNum = (rec) => {
  const raw = rec?.sourcing_id;
  if (raw == null) return Number.NEGATIVE_INFINITY;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  const m = String(raw).match(/\d+/);
  return m ? Number(m[0]) : Number.NEGATIVE_INFINITY;
};

const getSellerName = (rec) => {
  if (rec?.seller && typeof rec.seller === "object") {
    return rec.seller.name || `Seller ${formatOid(rec.seller._id)}`;
  }
  return (
    rec?.seller_name || (rec?.seller ? `Seller ${formatOid(rec.seller)}` : "—")
  );
};

/* ---------- MarketName (cached resolver) ---------- */
const _marketCache = new Map();
const isObjectIdLike = (v) =>
  typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

function MarketName({ market }) {
  const [name, setName] = useState("—");

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

      // string key: ObjectId or slug
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
          } else setName("—");
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

function StatusBadge({ status }) {
  const s = String(status || "Pending");
  const cls = STATUS_BADGE_CLASS[s] || STATUS_BADGE_CLASS.Pending;
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{s}</span>
  );
}

/* ---------- rollup resolvers used by multiple columns ---------- */

/** Resolve Target Total: prefer backend rollup, else sum items (qty * target_per_unit or item total) */
const resolveTargetTotal = (rec) => {
  const backend = safeNum(rec.target_total_cost ?? rec.total_target_cost);
  if (backend > 0) return backend;

  const sum = Array.isArray(rec.items)
    ? rec.items.reduce((acc, it) => {
        const qty = Math.max(1, safeNum(it?.quantity_needed));
        const per = safeNum(it?.target_cost_per_unit);
        const line = Number.isFinite(Number(it?.total_target_cost))
          ? safeNum(it.total_target_cost)
          : round2(qty * per);
        return acc + line;
      }, 0)
    : 0;

  return round2(sum);
};

/** Resolve Actual Total: prefer backend rollup, else seller + shipping + tax */
const resolveActualTotal = (rec) => {
  const backend = safeNum(rec.total_actual_cost);
  if (backend > 0) return backend;
  return round2(
    safeNum(rec.sellers_price) +
      safeNum(rec.shipping_charges ?? rec.shipping_price) +
      safeNum(rec.taxes ?? rec.tax)
  );
};

/* ---------- column title helper (like Form.Item tooltip) ---------- */
/* Wrap the ENTIRE header in a Tooltip, render to body, bump z-index. */
const colTitle = (label, tip) => (
  <Tooltip
    title={tip}
    placement="top"
    getPopupContainer={() => document.body}
    overlayStyle={{ zIndex: 1090 }}
  >
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "help" }}>
      {label}
      <InfoCircleOutlined style={{ fontSize: 14, color: "#64748b" }} />
    </span>
  </Tooltip>
);

/* ---------- exported columns factory ---------- */
export function getSourcingColumns({
  statusPill, // kept for backward compatibility (unused here)
  canEdit = false, // SHOW Edit when true
  canCancel = false, // SHOW Delete when true
  navigate,
  handleDeleteOrder,
  buildEditUrl, // optional: custom route builder
}) {
  const mkEditUrl = buildEditUrl || ((id) => `/sourcing/edit/${id}`);

  const cols = [
    {
      title: colTitle(
        "ID",
        "Internal sourcing ID (shown as #xxxx). Full Mongo ObjectId is available on row hover."
      ),
      dataIndex: "sourcing_id",
      key: "sourcing_id",
      width: 85,
      onCell: () => ({
        style: {
          maxWidth: 70,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }),
      sorter: (a, b) => idNum(a) - idNum(b),
      defaultSortOrder: "descend",
      sortDirections: ["descend", "ascend"],
      render: (sid, rec) => (
        <Tooltip
          title={`MongoID: ${rec._id || rec.id || "N/A"}`}
          getPopupContainer={() => document.body}
          overlayStyle={{ zIndex: 1090 }}
        >
          <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
            {sid != null ? `#${sid}` : "—"}
          </span>
        </Tooltip>
      ),
    },
    {
      title: colTitle(
        "Sourcer Name",
        "Person who created the sourcing request. Falls back to the sourcer’s profile."
      ),
      dataIndex: "sourcerName",
      key: "sourcerName",
      width: 170,
      onCell: () => ({
        style: {
          whiteSpace: "normal",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        },
      }),
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
              <span
                style={{ fontSize: 12, color: "#6b7280", display: "block" }}
              >
                {rec.sourcer_id.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: colTitle("Purchaser", "Assigned purchaser (name or email)."),
      dataIndex: "purchaserName",
      key: "purchaserName",
      width: 170,
      onCell: () => ({
        style: {
          whiteSpace: "normal",
          wordBreak: "break-word",
          overflowWrap: "anywhere",
        },
      }),
      render: (val, rec) => {
        const full = [rec?.purchaser_id?.firstName, rec?.purchaser_id?.lastName]
          .filter(Boolean)
          .join(" ");
        const fallback = full || rec?.purchaser_id?.email || "—";
        const display = val || fallback || "—";
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 600 }}>{display}</div>
            {rec?.purchaser_id?.email && (
              <span
                style={{ fontSize: 12, color: "#6b7280", display: "block" }}
              >
                {rec.purchaser_id.email}
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: colTitle(
        "Efficiency",
        "Formula: (1 − Actual / Target) × 100. Positive = under target (good), negative = over target."
      ),
      key: "purchase_efficiency",
      width: 100,
      align: "center",
      render: (_v, rec) => {
        const target = Number(resolveTargetTotal(rec));
        const actual = Number(resolveActualTotal(rec));

        if (!target) return "—"; // avoid ÷0 / missing data

        const pct = (1 - (actual || 0) / target) * 100; // 1 - a/c (as percent)
        const color = pct >= 0 ? "#16a34a" : "#ef4444";

        return (
          <span
            style={{
              fontWeight: 600,
              color,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {pct.toFixed(1)}%
          </span>
        );
      },
    },
    {
      title: colTitle(
        "Savings",
        "If items exist: Σ[(Target/Unit − Actual(or Seller)/Unit) × Qty]. Else: Target Total − Actual Total. Positive = savings."
      ),
      key: "savings",
      width: 120,
      align: "center",
      onCell: () => ({
        style: {
          maxWidth: 120,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }),
      render: (_v, rec) => {
        let savings = 0;

        if (Array.isArray(rec.items) && rec.items.length) {
          // Sum item-level savings: (target/unit − actual(or seller)/unit) × qty
          savings = rec.items.reduce((acc, it) => {
            const qty = safeNum(it?.quantity_needed || 0);
            const tpu = safeNum(it?.target_cost_per_unit);
            const apu =
              (it?.actual_cost_per_unit ?? it?.sellers_price_per_unit) != null
                ? safeNum(it?.actual_cost_per_unit ?? it?.sellers_price_per_unit)
                : 0;
            return acc + round2((tpu - apu) * qty);
          }, 0);
        } else {
          // Fallback to rollups: target total − actual total
          const target = safeNum(resolveTargetTotal(rec));
          const actual = safeNum(resolveActualTotal(rec));
          savings = round2(target - actual);
        }

        const color = savings >= 0 ? "#16a34a" : "#ef4444";
        return (
          <span
            style={{
              color,
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtMoneySignFirst(savings)}
          </span>
        );
      },
    },
    {
      title: colTitle(
        "Status",
        "Current state of the request (e.g., Pending, Purchased, etc.)."
      ),
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: colTitle(
        "Seller",
        "Seller name from the record; falls back to ID if not present."
      ),
      key: "seller",
      width: 100,
      align: "center",
      render: (_, rec) => (
        <span style={{ fontWeight: 600 }}>{getSellerName(rec)}</span>
      ),
    },
    {
      title: colTitle(
        "Market",
        "Resolved from seller.market or record.market (cached lookup by id/slug). ‘Origin’ shown below."
      ),
      key: "market",
      width: 100,
      align: "center",
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
      title: colTitle(
        "Seller Price",
        "Total seller price at order level."
      ),
      dataIndex: "sellers_price",
      key: "sellers_price",
      width: 110,
      align: "center",
      render: (v) => <span>{fmtMoneySignFirst(num(v))}</span>,
    },
    {
      title: colTitle(
        "Shipping Charges",
        "Shipping cost at order level (uses shipping_charges or shipping_price)."
      ),
      dataIndex: "shipping_charges",
      key: "shipping_charges",
      align: "center",
      width: 130,
      render: (_v, rec) =>
        fmtMoneySignFirst(num(rec.shipping_charges ?? rec.shipping_price)),
    },
    {
      title: colTitle(
        "Tax",
        "Tax at order level (uses taxes or tax)."
      ),
      dataIndex: "taxes",
      key: "taxes",
      width: 110,
      align: "center",
      render: (_v, rec) => fmtMoneySignFirst(num(rec.taxes ?? rec.tax)),
    },
    {
      title: colTitle(
        "Total Target Cost",
        "Resolver: backend rollup if present; else Σ(item qty × target/unit) or item total_target_cost."
      ),
      key: "target_total_cost",
      width: 150,
      align: "center",
      render: (_v, rec) => fmtMoneySignFirst(resolveTargetTotal(rec)),
    },
    {
      title: colTitle(
        "Total Actual Cost",
        "Resolver: backend rollup if present; else Seller Price + Shipping + Tax."
      ),
      dataIndex: "total_actual_cost",
      key: "total_actual_cost",
      width: 150,
      align: "center",
      render: (_v, rec) => fmtMoneySignFirst(resolveActualTotal(rec)),
    },
    {
      title: colTitle(
        "Created",
        "Creation timestamp, formatted as YYYY-MM-DD HH:mm."
      ),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      align: "center",
      render: (dt, rec) => {
        const actual = dt || rec.created_at || rec.created_on;
        return fmtDateTime(actual);
      },
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 110,
      render: (_, rec) => {
        const id = rec._id || rec.id;
        const parts = [];

        if (canEdit && id) {
          parts.push(
            <Tooltip
              key="edit"
              title="Edit"
              getPopupContainer={() => document.body}
              overlayStyle={{ zIndex: 1090 }}
            >
              <Button
                data-testid="edit-btn"
                type="text"
                icon={<Pencil size={16} />}
                aria-label="Edit"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(mkEditUrl(id));
                }}
                className="
              !inline-flex !items-center !justify-center
              !w-8 !h-8 !p-0
              !bg-white !border !border-slate-200
              !rounded-md
              hover:!bg-slate-50 hover:!border-slate-300
            "
              />
            </Tooltip>
          );
        }

        if (canCancel && id) {
          parts.push(
            <Popconfirm
              key="delete"
              title="Delete this sourcing request?"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteOrder(id)}
              getPopupContainer={() => document.body}
            >
              <Button
                data-testid="delete-btn"
                type="text"
                icon={<Trash2 size={16} />}
                aria-label="Delete"
                onClick={(e) => e.stopPropagation()}
                className="
              !inline-flex !items-center !justify-center
              !w-8 !h-8 !p-0
              !bg-white !border !border-red-500
              !text-red-600
              !rounded-md
              hover:!bg-rose-50 hover:!border-red-600 hover:!text-red-700
            "
              />
            </Popconfirm>
          );
        }

        if (!parts.length) return <span className="text-slate-400">—</span>;
        return <Space size={4}>{parts}</Space>;
      },
    },
  ];

  return cols;
}

/* ---------------------- Expandable Items Table (with tooltips) ---------------------- */
// export const makeItemsTable = (order) => {
//   const rows = Array.isArray(order?.items) ? order.items : [];

//   const money = (v) => {
//     const n = safeNum(v);
//     try {
//       return new Intl.NumberFormat(undefined, {
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//       }).format(n); // e.g., 1,234.56
//     } catch {
//       return `${n.toFixed(2)}`;
//     }
//   };

//   const lineTarget = (r) =>
//     Number.isFinite(Number(r?.total_target_cost))
//       ? safeNum(r.total_target_cost)
//       : round2(
//           safeNum(r?.quantity_needed || 1) * safeNum(r?.target_cost_per_unit)
//         );

//   const lineActual = (r) =>
//     Number.isFinite(Number(r?.total_actual_cost))
//       ? safeNum(r.total_actual_cost)
//       : round2(
//           safeNum(r?.quantity_needed || 1) * safeNum(r?.actual_cost_per_unit)
//         );

//   return (
//     <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
//       <Table
//         rowKey={(r) => r._id || r.id || `${r.sku}-${r.product_name}`}
//         size="small"
//         bordered
//         pagination={false}
//         dataSource={rows}
//         onRow={(_, idx) => ({
//           style: { backgroundColor: idx % 2 ? "#fafcff" : "#fff" },
//         })}
//         rowClassName="hover:bg-blue-50 transition-colors"
//         columns={[
//           {
//             title: colTitle("Product", "Item name and SKU."),
//             key: "product",
//             width: 280,
//             render: (_t, r) => (
//               <div style={{ lineHeight: 1.2 }}>
//                 <div style={{ fontWeight: 600 }}>
//                   {r?.name || r?.product_name || "Untitled"}
//                 </div>
//                 <span style={{ fontSize: 12, color: "#6b7280" }}>
//                   SKU: {r?.sku || "—"}
//                 </span>
//               </div>
//             ),
//           },
//           {
//             title: colTitle("Qty", "Quantity needed for this line item."),
//             dataIndex: "quantity_needed",
//             width: 80,
//             align: "center",
//             render: (v) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>
//                 {safeNum(v)}
//               </span>
//             ),
//           },
//           {
//             title: colTitle(
//               "Target price / unit",
//               "Target cost per unit set for this item."
//             ),
//             dataIndex: "target_cost_per_unit",
//             align: "right",
//             width: 160,
//             render: (v) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>
//                 {money(v)}
//               </span>
//             ),
//           },
//           {
//             title: colTitle(
//               "Total Target",
//               "If item.total_target_cost present, use it; else Qty × Target/unit."
//             ),
//             key: "total_target_cost",
//             align: "right",
//             width: 160,
//             render: (_t, r) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>
//                 {money(lineTarget(r))}
//               </span>
//             ),
//           },
//           {
//             title: colTitle(
//               "Actual Cost / unit",
//               "Actual per-unit cost (or seller per-unit if actual missing)."
//             ),
//             dataIndex: "actual_cost_per_unit",
//             align: "right",
//             width: 160,
//             render: (v) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>
//                 {money(v)}
//               </span>
//             ),
//           },
//           {
//             title: colTitle(
//               "Total Actual Cost",
//               "If item.total_actual_cost present, use it; else Qty × Actual/unit."
//             ),
//             key: "total_actual_cost",
//             align: "right",
//             width: 160,
//             render: (_t, r) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>
//                 {money(lineActual(r))}
//               </span>
//             ),
//           },
//         ]}
//       />
//       <div className="px-4 py-3 bg-gray-50 " />
//     </div>
//   );
// };



/* ---------------------- Compact Expandable Items Table (no left gutter) ---------------------- */
export const makeItemsTable = (order) => {
  const rows = Array.isArray(order?.items) ? order.items : [];

  const money = (v) => {
    const n = safeNum(v);
    try {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `${n.toFixed(2)}`;
    }
  };

  const qtyOf = (r) => Math.max(1, safeNum(r?.quantity_needed));
  const targetPerUnit = (r) => safeNum(r?.target_cost_per_unit);
  const totalTarget = (r) =>
    Number.isFinite(Number(r?.total_target_cost))
      ? safeNum(r.total_target_cost)
      : round2(qtyOf(r) * targetPerUnit(r));
  const actualPerUnit = (r) =>
    (r?.actual_cost_per_unit ?? r?.sellers_price_per_unit) != null
      ? safeNum(r?.actual_cost_per_unit ?? r?.sellers_price_per_unit)
      : 0;
  const savingPerUnit = (r) => round2(targetPerUnit(r) - actualPerUnit(r));
  const savingPerSku = (r) => round2(qtyOf(r) * savingPerUnit(r));

  return (
    <div className="overflow-x-auto"> {/* no border/padding to avoid extra space */}
      <Table
        rowKey={(r) => r._id || r.id || `${r.sku}-${r.product_name}`}
        size="small"
        bordered={false}
        pagination={false}
        dataSource={rows}
        scroll={{ x: "max-content" }}
        style={{ margin: 0 }}                /* kill default wrapper margin */
        className="!m-0"               /* safety: remove margin via Tailwind override */

        expandable={{                        /* << remove expand icon column (the gutter) */
          showExpandColumn: false,
          expandIcon: () => null,
        }}
        
        onRow={(_, idx) => ({
          style: { backgroundColor: idx % 2 ? "#fafcff" : "#fff" },
        })}
        rowClassName="hover:bg-blue-50 transition-colors"
        columns={[
          {
            title: colTitle("Product", "Item name and SKU."),
            key: "product",
            width: 360,                       /* give Product more room */
            render: (_t, r) => (
              <div className="leading-tight">
                <div className="font-semibold text-gray-900">
                  {r?.name || r?.product_name || "Untitled"}
                </div>
                <span className="text-xs text-gray-500">
                  SKU: {r?.sku || "—"}
                </span>
              </div>
            ),
          },
          {
            title: colTitle("Qty", "Quantity needed for this line item."),
            dataIndex: "quantity_needed",
            width: 64,
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
            title: colTitle("Target Cost / unit", "Set target per unit for this item."),
            dataIndex: "target_cost_per_unit",
            align: "right",
            width: 140,
            render: (v) => <span className="tabular-nums">{money(v)}</span>,
          },
          {
            title: colTitle("Target Cost", "Qty × Target Cost / unit (or total_target_cost if present)."),
            key: "total_target_cost",
            align: "right",
            width: 140,
            render: (_t, r) => <span className="tabular-nums">{money(totalTarget(r))}</span>,
          },
          {
            title: colTitle("Seller price / unit", "Derived seller-per-unit or provided value."),
            dataIndex: "sellers_price_per_unit",
            align: "right",
            width: 150,
            render: (v) => <span className="tabular-nums">{money(v)}</span>,
          },
          {
            title: colTitle("Actual cost / unit", "Actual per-unit cost (fallback to seller per unit if missing)."),
            dataIndex: "actual_cost_per_unit",
            align: "right",
            width: 150,
            render: (v) => <span className="tabular-nums">{money(v)}</span>,
          },
          {
            title: colTitle("Saving / Unit", "Target/unit − Actual/unit. Positive = under target."),
            key: "saving_per_unit",
            align: "right",
            width: 140,
            render: (_t, r) => {
              const val = savingPerUnit(r);
              return (
                <span className={`font-semibold tabular-nums ${val >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {money(val)}
                </span>
              );
            },
          },
          {
            title: colTitle("Saving / SKU", "Qty × (Target/unit − Actual/unit). Positive = under target."),
            key: "saving_per_sku",
            align: "right",
            width: 150,
            render: (_t, r) => {
              const val = savingPerSku(r);
              return (
                <span className={`font-semibold tabular-nums ${val >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {money(val)}
                </span>
              );
            },
          },
        ]}
      />
    </div>
  );
};
