

// src/pages/sourcer/components/PurchasedTop5Table.jsx
import React, { useMemo } from "react";
import { Card, Table, Empty } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import {
  buildTop5PurchasedDetailedRows,
  ExpandedItemsTable,
  // pull shared formatters/components from your utils
  money,
  StatusBadge,
} from "../utils/PurchaseTableUtils.jsx";

// ===== Helpers (local) =====
const safeNum = (v) => (v == null || v === "" ? 0 : Number(v) || 0);

const ensureHttp = (v = "") => {
  const s = String(v || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

const mapTrackingBucket = (raw) => {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "intransit" || v === "in transit") return "InTransit";
  if (v === "delivered") return "Delivered";
  return "Pending";
};

// minimal tracking badge to match your other table’s look
const TrackingBadge = ({ value }) => {
  const styles =
    {
      InTransit: {
        bg: "bg-sky-50",
        text: "text-sky-700",
        ring: "ring-sky-200",
      },
      Delivered: {
        bg: "bg-emerald-50",
        text: "text-emerald-700",
        ring: "ring-emerald-200",
      },
      Pending: {
        bg: "bg-amber-50",
        text: "text-amber-700",
        ring: "ring-amber-200",
      },
    }[value] ||
    { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200" };

  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        "border ring-1 ring-inset",
        styles.bg,
        styles.text,
        styles.ring,
      ].join(" ")}
    >
      {value}
    </span>
  );
};

// SweetAlert2 toast
const toast = Swal.mixin({
  toast: true,
  position: "bottom-end",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  customClass: { popup: "rounded-lg" },
});

// Safely pick the best id from the row (supports _original wrapper)
const getDocId = (row = {}) => {
  const r = row?._original || row;
  return r?._id || r?.id || r?.sourcing_id || r?.sourcingId || null;
};

export default function PurchasedTop5Table({
  data = [],
  loading = false,
  title = "Latest 5 Purchased Orders",
  requirePurchased = false, // set true to restrict strictly to purchased
  onOpen, // OPTIONAL: (orderRow) => void — custom open handler
}) {
  // Build rows via your existing util (keeps compatibility with other parts)
  const rows = useMemo(
    () => buildTop5PurchasedDetailedRows(data, { limit: 5, requirePurchased }),
    [data, requirePurchased]
  );

  // ===== Columns: same set you shared, adapted to read from row._original || row =====
  const columns = useMemo(
    () => [
      {
        title: "ID",
        width: 60,
        onCell: () => ({
          style: {
            maxWidth: 60,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        sorter: (a, b) => {
          const A = String(getDocId(a) || "");
          const B = String(getDocId(b) || "");
          return A.localeCompare(B);
        },
        render: (_, rec) => {
          const r = rec?._original || rec;
          const idPart = String(r.sourcing_id ?? r.id ?? r._id ?? "").slice(-6);
          return <strong className="text-[#2c2c2c]">#{idPart || "—"}</strong>;
        },
        responsive: ["sm"],
      },
      {
        title: "Sourcer",
        width: 150,
        onCell: () => ({
          style: {
            maxWidth: 150,
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        render: (_, rec) => {
          const r = rec?._original || rec;
          const v = r.sourcer_name;
          return v ? <p className="m-0">{v}</p> : "—";
        },
      },
      {
        title: "Efficiency",
        key: "efficiency",
        align: "center",
        width: 120,
        onCell: () => ({
          style: {
            maxWidth: 120,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        render: (_, rec) => {
          const r = rec?._original || rec;
          const target = safeNum(r.target_total_cost);
          const actual = safeNum(r.total_actual_cost);
          if (!target) return "—";
          const pct = (1 - actual / target) * 100; // 1 - a/c
          const color = pct >= 0 ? "#16a34a" : "#ef4444";
          return (
            <span style={{ color, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
          );
        },
      },
      {
        title: "Savings",
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
        render: (_, rec) => {
          const r = rec?._original || rec;
          let savings = 0;

          if (Array.isArray(r.items) && r.items.length) {
            savings = r.items.reduce((acc, it) => {
              const qty = Number(it.quantity_needed || 0);
              const tpu = Number(it.target_cost_per_unit || 0);
              const apu =
                it.actual_cost_per_unit !== undefined &&
                it.actual_cost_per_unit !== null
                  ? Number(it.actual_cost_per_unit)
                  : Number(it.sellers_price_per_unit || 0);
              return acc + (tpu - apu) * qty;
            }, 0);
          } else if (
            r.target_total_cost !== undefined &&
            r.target_total_cost !== null &&
            r.total_actual_cost !== undefined &&
            r.total_actual_cost !== null
          ) {
            savings = Number(r.target_total_cost) - Number(r.total_actual_cost);
          }

          const color = savings >= 0 ? "#16a34a" : "#ef4444";
          return <span style={{ color, fontWeight: 600 }}>{money(savings)}</span>;
        },
      },
      {
        title: "Status",
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
        render: (_, rec) => {
          const r = rec?._original || rec;
          return <StatusBadge status={r.status} />;
        },
      },
      {
        title: "Tracking",
        width: 140,
        align: "center",
        render: (_, rec) => {
          const r = rec?._original || rec;
          return <TrackingBadge value={mapTrackingBucket(r.tracking_status)} />;
        },
      },
      {
        title: "Seller",
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
        ellipsis: true,
        render: (_, rec) => {
          const r = rec?._original || rec;
          const v = r.seller_name;
          return v ? <p className="m-0">{v}</p> : "—";
        },
      },
      {
        title: "Market",
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
        ellipsis: true,
        render: (_, rec) => {
          const r = rec?._original || rec;
          const v = r.market;
          return v ? <p className="m-0">{v}</p> : "—";
        },
      },
      {
        title: "Seller Price",
        align: "center",
        width: 120,
        onCell: () => ({
          style: {
            maxWidth: 120,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        render: (_, rec) => {
          const r = rec?._original || rec;
          return money(r.sellers_price);
        },
      },
      {
        title: "Shipping Charges",
        width: 130,
        align: "center",
        onCell: () => ({
          style: {
            maxWidth: 130,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        render: (_, rec) => {
          const r = rec?._original || rec;
          return money(r.shipping_charges ?? r.shipping_price ?? 0);
        },
      },
      {
        title: "Tax",
        width: 120,
        align: "right",
        render: (_, rec) => {
          const r = rec?._original || rec;
          return money(r.taxes ?? r.tax ?? 0);
        },
      },
      {
        title: "Target Cost",
        width: 150,
        align: "right",
        render: (_, rec) => {
          const r = rec?._original || rec;
          return money(r.target_total_cost);
        },
      },
      {
        title: "Total Actual Cost",
        width: 150,
        align: "right",
        render: (_, rec) => {
          const r = rec?._original || rec;
          return money(r.total_actual_cost);
        },
      },
      // ===== Copy listing link =====
      {
        title: "",
        key: "copy_listing_link",
        width: 64,
        align: "center",
        fixed: "right",
        render: (_, rec) => {
          const r = rec?._original || rec;
          const raw = r?.listing_link ?? r?.listingLink ?? "";
          const url = ensureHttp(raw);
          const disabled = !url;

          const handleCopy = async (e) => {
            e.stopPropagation();
            if (!url) {
              await toast.fire({
                icon: "warning",
                title: "No link",
                text: "This row has no listing link.",
              });
              return;
            }
            try {
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
              await toast.fire({
                icon: "success",
                title: "Copied",
                text: "Listing link copied to clipboard.",
              });
            } catch {
              await toast.fire({
                icon: "error",
                title: "Copy failed",
                text: "Could not copy the listing link.",
              });
            }
          };

          return (
            <button
              type="button"
              onClick={handleCopy}
              disabled={disabled}
              title="Copy listing link"
              className={[
                "inline-flex items-center justify-center h-8 w-8 rounded-md border",
                disabled
                  ? "opacity-40 cursor-not-allowed border-slate-200 bg-white"
                  : "cursor-pointer border-emerald-500 bg-white hover:bg-emerald-50",
              ].join(" ")}
            >
              <CopyOutlined
                style={{ fontSize: 16, color: disabled ? "#9ca3af" : "#059669" }}
              />
            </button>
          );
        },
      },
    ],
    []
  );

  return (
    <Card
      size="small"
      bordered
      title={title}
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 12 }}
    >
      <Table
        size="small"
        pagination={false}
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey={(row) => getDocId(row) || row.key}
        tableLayout="fixed"
        scroll={{ x: "max-content" }}
        onRow={(row) => {
          const docId = getDocId(row);
          const clickable = Boolean(docId || onOpen);
          return {
            onClick: () => {
              if (onOpen) return onOpen(row._original || row);
              if (docId) window.location.assign(`/requests/${String(docId)}`);
            },
            style: clickable ? { cursor: "pointer" } : undefined,
          };
        }}
        expandable={{
          expandedRowRender: (row) =>
            (row?._original && Array.isArray(row._original.items) && row._original.items.length) ? (
              <ExpandedItemsTable order={row._original} />
            ) : (
              <Empty description="No products on this request" />
            ),
          rowExpandable: (row) =>
            Array.isArray(row?._original?.items) &&
            row._original.items.length > 0,
        }}
        locale={{ emptyText: <Empty description="No purchased orders" /> }}
      />
    </Card>
  );
}

