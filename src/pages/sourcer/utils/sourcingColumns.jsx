
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
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${neg ? "- " : ""}$${abs}`;
};

const formatOid = (id) => (id ? String(id).slice(0, 6) + "…" + String(id).slice(-4) : "—");

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
  return rec?.seller_name || (rec?.seller ? `Seller ${formatOid(rec.seller)}` : "—");
};

/* ---------- MarketName (cached resolver) ---------- */
const _marketCache = new Map();
const isObjectIdLike = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

function MarketName({ market }) {
  const [name, setName] = useState("—");

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!market) return setName("—");

      // populated object
      if (typeof market === "object") {
        if (market.name) return setName(market.name);
        if (market.slug && _marketCache.has(market.slug)) return setName(_marketCache.get(market.slug).name);
        if (market._id && _marketCache.has(market._id)) return setName(_marketCache.get(market._id).name);
      }

      // string key: ObjectId or slug
      const key = typeof market === "string" ? market : market._id || market.slug || "";
      if (!key) return setName("—");

      if (_marketCache.has(key)) return setName(_marketCache.get(key).name);

      try {
        let rec = null;
        if (isObjectIdLike(key)) {
          const { data } = await apiClient.get(`/api/v1/markets/${key}`);
          rec = data;
        } else {
          const { data } = await apiClient.get(`/api/v1/markets`, { params: { q: key } });
          const list = Array.isArray(data) ? data : [];
          rec = list.find((m) => (m.slug || "").toLowerCase() === key.toLowerCase()) || list[0] || null;
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
  return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{s}</span>;
}

/* ---------- rollup resolvers ---------- */
const resolveTargetTotal = (rec) => {
  const backend = safeNum(rec.target_total_cost ?? rec.total_target_cost);
  if (backend > 0) return backend;

  const sum = Array.isArray(rec.items)
    ? rec.items.reduce((acc, it) => {
        const qty = Math.max(1, safeNum(it?.quantity_needed));
        const per = safeNum(it?.target_cost_per_unit);
        const line = Number.isFinite(Number(it?.total_target_cost)) ? safeNum(it.total_target_cost) : round2(qty * per);
        return acc + line;
      }, 0)
    : 0;

  return round2(sum);
};

const resolveActualTotal = (rec) => {
  const backend = safeNum(rec.total_actual_cost);
  if (backend > 0) return backend;
  return round2(safeNum(rec.sellers_price) + safeNum(rec.shipping_charges ?? rec.shipping_price) + safeNum(rec.taxes ?? rec.tax));
};

/* ---------- column title w/ tooltip ---------- */
const tipCommon = { getPopupContainer: () => document.body, overlayStyle: { zIndex: 1090 }, placement: "top" };
const TitleWithTip = ({ label, tip }) => (
  <Tooltip title={tip} {...tipCommon}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "help" }}>
      {label}
      <InfoCircleOutlined style={{ fontSize: 14, color: "#64748b" }} />
    </span>
  </Tooltip>
);
const colTitle = (label, tip) => <TitleWithTip label={label} tip={tip} />;

/* ---------- exported columns factory ---------- */
export function getSourcingColumns({
  statusPill, // kept for compatibility
  canEdit = false,
  canCancel = false,
  navigate,
  handleDeleteOrder,
  buildEditUrl,
}) {
  const mkEditUrl = buildEditUrl || ((id) => `/sourcing/edit/${id}`);

  const cols = [
    {
      title: colTitle("ID", "Internal sourcing ID (shown as #xxxx)."),
      dataIndex: "sourcing_id",
      key: "sourcing_id",
      width: 85,
      onCell: () => ({ style: { maxWidth: 70, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }),
      sorter: (a, b) => idNum(a) - idNum(b),
      defaultSortOrder: "descend",
      sortDirections: ["descend", "ascend"],
      render: (sid, rec) => (
        <Tooltip title={`MongoID: ${rec._id || rec.id || "N/A"}`} getPopupContainer={() => document.body} overlayStyle={{ zIndex: 1090 }}>
          <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>{sid != null ? `#${sid}` : "—"}</span>
        </Tooltip>
      ),
    },
    {
      title: colTitle("Sourcer Name", "Creator of the request."),
      dataIndex: "sourcerName",
      key: "sourcerName",
      width: 170,
      onCell: () => ({ style: { whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" } }),
      render: (val, rec) => {
        const fallback = [rec?.sourcer_id?.firstName, rec?.sourcer_id?.lastName].filter(Boolean).join(" ") || rec?.sourcer_id?.email || "—";
        return <div style={{ fontWeight: 600 }}>{val || fallback}</div>;
      },
    },
    {
      title: colTitle("Purchaser", "Assigned purchaser."),
      dataIndex: "purchaserName",
      key: "purchaserName",
      width: 170,
      onCell: () => ({ style: { whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" } }),
      render: (val, rec) => {
        const full = [rec?.purchaser_id?.firstName, rec?.purchaser_id?.lastName].filter(Boolean).join(" ");
        return <div style={{ fontWeight: 600 }}>{val || full || rec?.purchaser_id?.email || "—"}</div>;
      },
    },
    {
      title: colTitle("Efficiency", "(1 − Actual / Target) × 100"),
      key: "purchase_efficiency",
      width: 100,
      align: "center",
      render: (_v, rec) => {
        const target = Number(resolveTargetTotal(rec));
        const actual = Number(resolveActualTotal(rec));
        if (!target) return "—";
        const pct = (1 - (actual || 0) / target) * 100;
        const color = pct >= 0 ? "#16a34a" : "#ef4444";
        return <span style={{ fontWeight: 600, color, fontVariantNumeric: "tabular-nums" }}>{pct.toFixed(1)}%</span>;
      },
    },
    {
      title: colTitle("Savings", "Σ item savings or Target − Actual"),
      key: "savings",
      width: 120,
      align: "center",
      onCell: () => ({ style: { maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }),
      render: (_v, rec) => {
        let savings = 0;
        if (Array.isArray(rec.items) && rec.items.length) {
          savings = rec.items.reduce((acc, it) => {
            const qty = safeNum(it?.quantity_needed || 0);
            const tpu = safeNum(it?.target_cost_per_unit);
            const apu = (it?.actual_cost_per_unit ?? it?.sellers_price_per_unit) != null
              ? safeNum(it?.actual_cost_per_unit ?? it?.sellers_price_per_unit)
              : 0;
            return acc + round2((tpu - apu) * qty);
          }, 0);
        } else {
          const target = safeNum(resolveTargetTotal(rec));
          const actual = safeNum(resolveActualTotal(rec));
          savings = round2(target - actual);
        }
        const color = savings >= 0 ? "#16a34a" : "#ef4444";
        return <span style={{ color, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtMoneySignFirst(savings)}</span>;
      },
    },
    {
      title: colTitle("Status", "Current state of the request."),
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: colTitle("Seller", "Seller name"),
      key: "seller",
      width: 100,
      align: "center",
      render: (_, rec) => <span style={{ fontWeight: 600 }}>{getSellerName(rec)}</span>,
    },
    {
      title: colTitle("Market", "Resolved by id/slug (cached)"),
      key: "market",
      width: 100,
      align: "center",
      render: (_, rec) => {
        const marketRef = rec?.seller && typeof rec.seller === "object" ? rec.seller.market : rec.market;
        const origin = rec.origin || "—";
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div><MarketName market={marketRef} /></div>
            <Text type="secondary" style={{ fontSize: 12 }}>{origin}</Text>
          </div>
        );
      },
    },
    {
      title: colTitle("Seller Price", "Order-level seller price"),
      dataIndex: "sellers_price",
      key: "sellers_price",
      width: 110,
      align: "center",
      render: (v) => <span>{fmtMoneySignFirst(num(v))}</span>,
    },
    {
      title: colTitle("Shipping Charges", "Order-level shipping"),
      dataIndex: "shipping_charges",
      key: "shipping_charges",
      align: "center",
      width: 130,
      render: (_v, rec) => fmtMoneySignFirst(num(rec.shipping_charges ?? rec.shipping_price)),
    },
    {
      title: colTitle("Tax", "Order-level tax"),
      dataIndex: "taxes",
      key: "taxes",
      width: 110,
      align: "center",
      render: (_v, rec) => fmtMoneySignFirst(num(rec.taxes ?? rec.tax)),
    },
    {
      title: colTitle("Total Target Cost", "Backend or Σ(item)"),
      key: "target_total_cost",
      width: 150,
      align: "center",
      render: (_v, rec) => fmtMoneySignFirst(resolveTargetTotal(rec)),
    },
    {
      title: colTitle("Total Actual Cost", "Backend or SP + SH + TX"),
      dataIndex: "total_actual_cost",
      key: "total_actual_cost",
      width: 150,
      align: "center",
      render: (_v, rec) => fmtMoneySignFirst(resolveActualTotal(rec)),
    },
    {
      title: colTitle("Created", "YYYY-MM-DD HH:mm"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      align: "center",
      render: (dt, rec) => fmtDateTime(dt || rec.created_at || rec.created_on),
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
            <Tooltip key="edit" title="Edit" getPopupContainer={() => document.body} overlayStyle={{ zIndex: 1090 }}>
              <Button
                data-testid="edit-btn"
                type="text"
                icon={<Pencil size={16} />}
                aria-label="Edit"
                onClick={(e) => { e.stopPropagation(); navigate(mkEditUrl(id)); }}
                className="!inline-flex !items-center !justify-center !w-8 !h-8 !p-0 !bg-white !border !border-slate-200 !rounded-md hover:!bg-slate-50 hover:!border-slate-300"
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
                className="!inline-flex !items-center !justify-center !w-8 !h-8 !p-0 !bg-white !border !border-red-500 !text-red-600 !rounded-md hover:!bg-rose-50 hover:!border-red-600 hover:!text-red-700"
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

/* ---------------------- Expanded Items Table (Purchaser-style single H scroll) ---------------------- */
/** Keep horizontal scroll; hide vertical scroll. No link in product cell. */
export function ExpandedItemsTable({ order }) {
  const rows = Array.isArray(order?.items) ? order.items : [];
  if (!rows.length) return <span className="text-slate-500 text-sm">No products on this request</span>;

  // local money (minus before $)
  const money = (x) => {
    const n = typeof x === "number" ? x : Number(x) || 0;
    const neg = n < 0;
    const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${neg ? "-" : ""}$${abs}`;
  };
  const fmt = (v) => money(safeNum(v));

  // order-level rollups
  const orderTarget = Number.isFinite(Number(order?.target_total_cost))
    ? safeNum(order.target_total_cost)
    : rows.reduce((s, it) => s + safeNum(it.quantity_needed || 1) * safeNum(it.target_cost_per_unit), 0);

  const orderActual = Number.isFinite(Number(order?.total_actual_cost))
    ? safeNum(order.total_actual_cost)
    : safeNum(order?.sellers_price) +
      safeNum(order?.shipping_charges ?? order?.shipping_price) +
      safeNum(order?.taxes ?? order?.tax);

  const sellerAllocFactor = orderTarget > 0 ? safeNum(order?.sellers_price) / orderTarget : 0;
  const actualAllocFactor = orderTarget > 0 ? orderActual / orderTarget : 0;

  // per-item helpers
  const qtyOf = (r) => Math.max(1, safeNum(r?.quantity_needed));
  const tpu = (r) => safeNum(r?.target_cost_per_unit);

  const totalTarget = (r) =>
    Number.isFinite(Number(r?.total_target_cost)) ? safeNum(r.total_target_cost) : round2(qtyOf(r) * tpu(r));

  const sellerPerUnit = (r) =>
    r?.sellers_price_per_unit != null ? safeNum(r.sellers_price_per_unit) : round2(sellerAllocFactor * tpu(r));

  const actualPerUnit = (r) =>
    r?.actual_cost_per_unit != null ? safeNum(r.actual_cost_per_unit) : round2(actualAllocFactor * tpu(r));

  const totalActual = (r) =>
    Number.isFinite(Number(r?.total_actual_cost)) ? safeNum(r.total_actual_cost) : round2(qtyOf(r) * actualPerUnit(r));

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
            title: colTitle("Total Target", "Qty × Target price / unit (or provided total_target_cost)."),
            key: "total_target_cost",
            align: "right",
            width: 150,
            render: (_t, r) => <span className="tabular-nums">{fmt(totalTarget(r))}</span>,
          },
          {
            title: colTitle("Seller price / unit", "If missing, uses (Seller Price ÷ Target Total) × Target/unit."),
            key: "sellers_price_per_unit",
            align: "right",
            width: 170,
            render: (_t, r) => <span className="tabular-nums">{fmt(sellerPerUnit(r))}</span>,
          },
          {
            title: colTitle("Actual cost / unit", "If missing, uses (Total Actual ÷ Target Total) × Target/unit."),
            key: "actual_cost_per_unit",
            align: "right",
            width: 170,
            render: (_t, r) => <span className="tabular-nums">{fmt(actualPerUnit(r))}</span>,
          },
          {
            title: colTitle("Saving / Unit", "Target/unit − Actual/unit. Positive = under target."),
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
            title: colTitle("Saving / SKU", "Qty × (Target/unit − Actual/unit). Positive = under target."),
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
            title: colTitle("Total Actual Cost", "If missing, uses Qty × Actual cost / unit."),
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

/* Back-compat for callers expecting makeItemsTable(order) */
export const makeItemsTable = (order) => <ExpandedItemsTable order={order} />;
