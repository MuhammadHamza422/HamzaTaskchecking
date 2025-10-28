// /src/pages/purchaser/PurchaserReturnedListingsPage.jsx
import React, { useMemo, useEffect, useState } from "react";
import { Table, message, Empty, Spin, Card } from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../api/client";
import SleekPagination from "./components/SleekPagination";
import {
  normalizeRequests,
  num as safeNum,
  ExpandedItemsTable,
  StatusBadge,
  money,
} from "./utils/PurchaseTableUtils";
import { InfoCircleOutlined } from "@ant-design/icons";
import { useCan, usePermissions } from "../../hooks/usePermissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/* --------------------------- small helpers --------------------------- */
const pickRows = (body) =>
  Array.isArray(body)
    ? body
    : body?.docs || body?.data || body?.results || body?.items || [];

const TitleWithTip = ({ label, tip }) => (
  <span
    title={tip}
    style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "help" }}
  >
    {label}
    <InfoCircleOutlined style={{ fontSize: 14, color: "#64748b" }} />
  </span>
);
const colTitle = (label, tip) => <TitleWithTip label={label} tip={tip} />;

const moneyUSD = (x, { min = 2, max = 2 } = {}) => {
  const n = typeof x === "number" ? x : Number(x) || 0;
  const abs = Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: min, maximumFractionDigits: max });
  return `${n < 0 ? "-" : ""}$${abs}`;
};

/* =================================================================== */

export default function PurchaserReturnedListingsPage() {
  const queryClient = useQueryClient();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();

  // Admin check
  const isAdmin = useMemo(() => {
    const r = authUser?.roles;
    if (Array.isArray(r)) {
      return r
        .map((x) => (typeof x === "string" ? x.toLowerCase() : String(x?.role || "").toLowerCase()))
        .includes("admin");
    }
    return String(r?.role || r || "").toLowerCase() === "admin";
  }, [authUser]);

  // Permissions
  const { isLoading: permsLoading } = usePermissions();
  const canSeeAssignedMine = useCan("purchaser", "assigned to me");
  const canSeeAllAssigned = useCan("purchaser", "all assigned");

  // Paging only (no filters)
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Base params: permission-gated
  const baseParams = useMemo(() => {
    if (permsLoading || canSeeAssignedMine === null || canSeeAllAssigned === null) return null;

    const params = {};
    if (isAdmin) {
      if (!canSeeAllAssigned) return null;
      // No purchaser scope selector here (filters removed)
    } else {
      if (!canSeeAssignedMine) return null;
      params.mine = true;
    }
    return params;
  }, [permsLoading, canSeeAllAssigned, canSeeAssignedMine, isAdmin]);

  // Server params: always enforce Returned
  const serverParams = useMemo(() => {
    if (!baseParams) return null;
    return { ...baseParams, status: "Returned" };
  }, [baseParams]);

  /* ===================== React Query: Returned Listings ===================== */
  const {
    data: listPayload,
    isFetching: listFetching,
    isLoading: listLoading,
    refetch,
  } = useQuery({
    queryKey: ["purchaser", "returned-list", serverParams, page, limit],
    enabled: !!serverParams,
    queryFn: async () => {
      const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
        params: { ...serverParams, page, limit, sort: "-createdAt" },
      });
      return data;
    },
    keepPreviousData: true,
    staleTime: 30_000,
    onError: (err) => {
      const msg = err?.response?.data?.message || "Failed to fetch data.";
      message.error(msg);
    },
  });

  const requests = useMemo(() => {
    return normalizeRequests(pickRows(listPayload || {}));
  }, [listPayload]);

  const total = useMemo(() => {
    const raw = listPayload?.total;
    return typeof raw === "number" ? raw : requests.length || 0;
  }, [listPayload, requests.length]);

  const loading = listLoading || listFetching;

  const handleRefreshClick = async () => {
    await queryClient.invalidateQueries({ queryKey: ["purchaser", "returned-list"] });
  };

  /* --------------------------- columns --------------------------- */
  const columns = [
    {
      title: colTitle("ID", "Sourcing request ID (table shows last 6 digits)."),
      dataIndex: "sourcing_id",
      width: 80,
      onCell: () => ({
        style: { maxWidth: 60, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      sorter: (a, b) =>
        String(a?.sourcing_id ?? a?.id ?? a?._id ?? "").localeCompare(
          String(b?.sourcing_id ?? b?.id ?? b?._id ?? "")
        ),
      render: (_, rec) => (
        <strong className="text-[#2c2c2c]">#{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}</strong>
      ),
      responsive: ["sm"],
    },
    {
      title: colTitle("Sourcer", "Person who created the sourcing request."),
      dataIndex: "sourcer_name",
      width: 150,
      onCell: () => ({
        style: { maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" },
      }),
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: colTitle(
        "Efficiency",
        "Percent version of Savings: (1 − Total Actual Cost ÷ Target Cost) × 100. Positive = under target."
      ),
      key: "efficiency",
      align: "center",
      width: 120,
      onCell: () => ({
        style: { maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      render: (_, rec) => {
        const target = safeNum(rec.target_total_cost);
        const actual = safeNum(rec.total_actual_cost);
        if (!target) return "—";
        const pct = (1 - actual / target) * 100;
        const color = pct >= 0 ? "#16a34a" : "#ef4444";
        return <span style={{ color, fontWeight: 600 }}>{pct.toFixed(1)}%</span>;
      },
    },
    {
      title: colTitle(
        "Savings",
        "Dollar savings: Target Cost − Total Actual Cost. Positive = you saved; negative = over target."
      ),
      key: "savings",
      width: 120,
      onCell: () => ({
        style: { maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      align: "center",
      render: (_, rec) => {
        let savings = 0;

        if (Array.isArray(rec.items) && rec.items.length) {
          savings = rec.items.reduce((acc, it) => {
            const qty = Number(it.quantity_needed || 0);
            const tpu = Number(it.target_cost_per_unit || 0);
            const apu =
              it.actual_cost_per_unit !== undefined && it.actual_cost_per_unit !== null
                ? Number(it.actual_cost_per_unit)
                : Number(it.sellers_price_per_unit || 0);
            return acc + (tpu - apu) * qty;
          }, 0);
        } else if (
          rec.target_total_cost !== undefined &&
          rec.target_total_cost !== null &&
          rec.total_actual_cost !== undefined &&
          rec.total_actual_cost !== null
        ) {
          savings = Number(rec.target_total_cost) - Number(rec.total_actual_cost);
        }

        const color = savings >= 0 ? "#16a34a" : "#ef4444";
        return <span style={{ color, fontWeight: 600 }}>{moneyUSD(savings)}</span>;
      },
    },
    {
      title: colTitle(
        "Status",
        "Current state of the request (e.g., Returned)."
      ),
      dataIndex: "status",
      width: 120,
      align: "center",
      onCell: () => ({
        style: { maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: colTitle("Seller", "Seller name from the record."),
      dataIndex: "seller_name",
      width: 120,
      align: "center",
      onCell: () => ({
        style: { maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      ellipsis: true,
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: colTitle("Market", "Marketplace (e.g., ebay, amazon)."),
      dataIndex: "market",
      width: 120,
      align: "center",
      onCell: () => ({
        style: { maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      ellipsis: true,
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: colTitle("Seller Price", "Amount paid to the seller (before shipping/taxes)."),
      dataIndex: "sellers_price",
      align: "center",
      width: 120,
      onCell: () => ({
        style: { maxWidth: 120, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      render: (p) => money(p),
    },
    {
      title: colTitle("Shipping Charges", "Order-level shipping charges."),
      dataIndex: "shipping_charges",
      width: 150,
      align: "center",
      onCell: () => ({
        style: { maxWidth: 150, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      render: (p, rec) => money(p ?? rec?.shipping_price ?? 0),
    },
    {
      title: colTitle("Tax", "Order-level taxes."),
      dataIndex: "taxes",
      width: 120,
      align: "center",
      render: (p, rec) => money(p ?? rec?.tax ?? 0),
    },
    {
      title: colTitle("Target Cost", "Σ (Qty × Target cost per unit) for all items."),
      dataIndex: "target_total_cost",
      width: 150,
      align: "center",
      render: (p) => money(p),
    },
    {
      title: colTitle("Total Actual Cost", "Seller Price + Shipping + Tax."),
      dataIndex: "total_actual_cost",
      width: 150,
      align: "center",
      render: (p) => money(p),
    },
  ];

  /* --------------------------- gating --------------------------- */
  if (permsLoading || canSeeAssignedMine === null || canSeeAllAssigned === null) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 200 }}>
        <Spin />
      </div>
    );
  }

  if (isAdmin && !canSeeAllAssigned) {
    return (
      <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 14 }}>
        <Empty
          description={
            <div className="text-center">
              <div className="font-semibold">No permission to view “All Assigned”</div>
              <div className="text-gray-500">Ask an admin to enable Purchaser → “all assigned”.</div>
            </div>
          }
        />
      </Card>
    );
  }
  if (!isAdmin && !canSeeAssignedMine) {
    return (
      <Card bodyStyle={{ padding: 16 }} style={{ borderRadius: 14 }}>
        <Empty
          description={
            <div className="text-center">
              <div className="font-semibold">No permission to view “Assigned to Me”</div>
              <div className="text-gray-500">Ask an admin to enable Purchaser → “assigned to me”.</div>
            </div>
          }
        />
      </Card>
    );
  }

  /* --------------------------- render --------------------------- */
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
      {/* Minimal header (no filters/tabs) */}
      <div className="mb-2 rounded-lg border border-slate-200 bg-white/95 shadow-sm">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 rounded-t-xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50">
          <div className="text-slate-800 font-semibold text-xs tracking-wide">Returned Listings</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshClick}
              className="text-[11px] px-2.5 py-1 rounded-md border border-slate-300 bg-white/60 hover:bg-white/80"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table only */}
      <div className="rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <Table
          locale={{ emptyText: <Empty description="No returned listings found" /> }}
          dataSource={requests}
          columns={columns}
          rowKey={(rec) => rec._id}
          loading={loading}
          size="middle"
          pagination={false}
          onRow={(record) => ({
            onClick: () => {
              const id = record._id || record.id;
              if (id) navigate(`/requests/${id}`);
            },
            style: { cursor: "pointer" },
          })}
          rowClassName={(_, idx) => `row-clickable ${idx % 2 ? "row-odd" : "row-even"}`}
          scroll={{ x: "max-content" }}
          tableLayout="fixed"
          sticky
          expandable={{
            expandedRowRender: (record) => <ExpandedItemsTable order={record} />,
            rowExpandable: (record) => Array.isArray(record.items) && record.items.length > 0,
          }}
        />

        <SleekPagination
          page={page}
          setPage={(p) => setPage(typeof p === "number" ? p : 1)}
          limit={limit}
          setLimit={setLimit}
          total={total}
        />
      </div>

      <style>{`
        .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
        .ant-table-tbody > tr.row-even > td { background: #fafafa; }
        .ant-table-tbody > tr.row-odd  > td { background: #ffffff; }
      `}</style>
    </motion.div>
  );
}
