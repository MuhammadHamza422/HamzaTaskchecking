

// /src/pages/purchaser/PurchaserPendingPage.jsx
import React, { useCallback, useMemo, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Empty,
  message,
  Select,
  Tooltip,
  Spin,
  Popover,
  Divider,
  Typography,
} from "antd";
import {
  ReloadOutlined,
  LoadingOutlined,
  UserAddOutlined,       // Assign to Me
  UserSwitchOutlined,    // Assign to Purchaser
  CopyOutlined,          // Copy listing link
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

import {
  normalizeRequests,
  statusColor,
  num as safeNum,
  ExpandedItemsTable,
} from "./utils/PurchaseTableUtils.jsx";

const { Text } = Typography;
const { Option } = Select;
const MAX_FETCH = 200;

/* --------------------------- helpers --------------------------- */
const lower = (v) => String(v ?? "").trim().toLowerCase();

const toListingUrl = (url) =>
  !url ? "#" : /^https?:\/\//i.test(url) ? url : `https://${url}`;

const pickRows = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  const maybe =
    payload.results ??
    payload.data ??
    payload.docs ??
    payload.items ??
    payload.rows ??
    payload.list ??
    null;
  return Array.isArray(maybe) ? maybe : [];
};

const hasRows = (arr) => Array.isArray(arr) && arr.length > 0;

/* permissions from /api/v1/role/all → Purchaser app menu */
const extractPurchaserPerms = (roleObj) => {
  const access = Array.isArray(roleObj?.access) ? roleObj.access : [];
  const purchaser = access.find((a) => lower(a?.app) === "purchaser");
  const menu = Array.isArray(purchaser?.menu) ? purchaser.menu.map(lower) : [];
  return {
    canViewPendingQueue: menu.includes("pending queue"),
    canAssignToMe: menu.includes("assign to me"),
  };
};

/* ---- money / url helpers ---- */
const money = (v) => (Number.isFinite(+v) ? `$${(+v).toFixed(2)}` : "—");
const moneyUSD = (v) => (Number.isFinite(+v) ? `$${(+v).toFixed(2)}` : "$0.00");
const ensureHttp = (v = "") => {
  const s = String(v || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
};

/* ---- tracking helpers ---- */
const mapTrackingBucket = (v) => {
  const s = String(v || "").toLowerCase();
  if (s.includes("transit")) return "In Transit";
  if (s.includes("deliver")) return "Delivered";
  if (s.includes("pending") || !s) return "Pending";
  return "Unknown";
};

/* ---- simple badges ---- */
const StatusBadge = ({ status }) => (
  <Tag
    color={statusColor(status)}
    style={{ fontWeight: 500, fontSize: 12, borderRadius: 8, padding: "2px 8px" }}
  >
    {status}
  </Tag>
);

const TrackingBadge = ({ value }) => {
  const v = mapTrackingBucket(value);
  const color =
    v === "Delivered" ? "green" :
    v === "In Transit" ? "blue" :
    v === "Pending" ? "default" : "orange";
  return (
    <Tag color={color} style={{ borderRadius: 8, padding: "2px 8px" }}>
      {v}
    </Tag>
  );
};

/* ========================= React Query fetchers ========================= */
async function fetchRoles() {
  const { data } = await apiClient.get("/api/v1/role/all");
  return data?.roles ?? [];
}

function selectPerms(roles, roleName) {
  const matched = Array.isArray(roles)
    ? roles.find((r) => lower(r?.role) === roleName)
    : null;
  return extractPurchaserPerms(matched || {});
}

async function fetchPending() {
  // Prefer dedicated endpoint, fallback to generic if needed
  const res =
    (await apiClient.get("/api/v1/sourcing/pending")) ||
    (await apiClient.get("/api/v1/sourcing", { params: { status: "Pending" } }));
  const rows = normalizeRequests(pickRows(res?.data));
  return hasRows(rows) ? rows : [];
}

async function fetchAllPurchasers() {
  const { data } = await apiClient.get("/api/v1/sourcing/purchasers/search", {
    params: { q: "", page: 1, limit: MAX_FETCH },
  });
  const list = pickRows(data);
  return list
    .map((u) => {
      const id = String(u.value || u._id || u.id || "");
      const name =
        u.label ||
        [u.firstName, u.lastName].filter(Boolean).join(" ") ||
        u.name ||
        u.email ||
        "Unnamed";
      const email = u.email || "";
      const search = `${name} ${email}`.toLowerCase();
      return id
        ? {
            value: id,
            label: (
              <div className="flex items-baseline gap-2">
                <span className="font-semibold">{name}</span>
                {email ? <span className="text-gray-500">· {email}</span> : null}
              </div>
            ),
            search,
            email,
            raw: u,
          }
        : null;
    })
    .filter(Boolean);
}

/* =============================================================== */
export default function PurchaserPendingPage({ onAssigned }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Robust admin check
  const isAdmin = useMemo(() => {
    const r = user?.roles;
    if (Array.isArray(r)) {
      return r
        .map((x) =>
          typeof x === "string"
            ? x.toLowerCase()
            : String(x?.role || "").toLowerCase()
        )
        .includes("admin");
    }
    return String(r?.role || r || "").toLowerCase() === "admin";
  }, [user]);

  const roleName = useMemo(
    () => lower(user?.roles?.role || user?.role || ""),
    [user]
  );

  /* ----------------------- roles → permissions (RQ) ----------------------- */
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const perms = useMemo(
    () => (rolesQuery.data ? selectPerms(rolesQuery.data, roleName) : { canViewPendingQueue: false, canAssignToMe: false }),
    [rolesQuery.data, roleName]
  );
  const rolesLoaded = rolesQuery.isSuccess || rolesQuery.isError;
  const { canViewPendingQueue, canAssignToMe } = perms;

  /* ----------------------- pending queue (RQ) ----------------------- */
  const pendingQuery = useQuery({
    queryKey: ["pendingQueue"],
    queryFn: fetchPending,
    enabled: rolesLoaded && !!canViewPendingQueue,
    staleTime: 30 * 1000,     // 30s: quick revisits are instant
    gcTime: 5 * 60 * 1000,    // keep a little while
    retry: 1,
  });

  const requests = pendingQuery.data || [];
  const loading = pendingQuery.isLoading;

  /* ----------------------- purchasers list (RQ, on-demand) ----------------------- */
  const purchasersQuery = useQuery({
    queryKey: ["purchasers", "all"],
    queryFn: fetchAllPurchasers,
    enabled: false,              // load only when needed
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  const purchaserOptions = purchasersQuery.data || [];
  const purchaserLoading = purchasersQuery.isFetching || purchasersQuery.isLoading;

  const prefetchAllPurchasers = useCallback(async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ["purchasers", "all"],
        queryFn: fetchAllPurchasers,
        staleTime: 5 * 60 * 1000,
      });
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) message.warning("Only admins can search purchasers.");
      else message.error(e?.response?.data?.message || "Failed to load purchasers.");
    }
  }, [queryClient]);

  /* -------------------- optimistic mutations -------------------- */
  const assignToMeMutation = useMutation({
    mutationFn: async ({ docId }) => {
      await apiClient.post(`/api/v1/sourcing/${docId}/assign`);
      return { docId };
    },
    onMutate: async ({ docId }) => {
      await queryClient.cancelQueries({ queryKey: ["pendingQueue"] });
      const prev = queryClient.getQueryData(["pendingQueue"]);
      queryClient.setQueryData(["pendingQueue"], (old = []) =>
        old.filter((r) => String(r._id) !== String(docId))
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["pendingQueue"], ctx.prev);
      message.error(err?.response?.data?.message || "Failed to assign request.");
    },
    onSuccess: (_data, { humanId }) => {
      message.success(`Assigned #${humanId ?? ""}`.trim());
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingQueue"], exact: true });
    },
  });

  const assignToPurchaserMutation = useMutation({
    mutationFn: async ({ docId, purchaserId }) => {
      await apiClient.post(`/api/v1/sourcing/${docId}/assign-to`, { purchaserId });
      return { docId };
    },
    onMutate: async ({ docId }) => {
      await queryClient.cancelQueries({ queryKey: ["pendingQueue"] });
      const prev = queryClient.getQueryData(["pendingQueue"]);
      queryClient.setQueryData(["pendingQueue"], (old = []) =>
        old.filter((r) => String(r._id) !== String(docId))
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["pendingQueue"], ctx.prev);
      message.error(err?.response?.data?.message || "Assign failed.");
    },
    onSuccess: () => {
      message.success("Assigned to purchaser.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingQueue"], exact: true });
    },
  });

  const handleAssignToMe = async (docId, humanId) => {
    if (!docId) return;
    assignToMeMutation.mutate({ docId, humanId });
    // pass to parent after server confirms via onSuccess, or do it now if you prefer optimistic parent updates
    onAssigned?.({ _id: docId, sourcing_id: humanId });
  };

  const handleAssignToPurchaser = async (docId, purchaserId) => {
    if (!docId || !purchaserId) return;
    assignToPurchaserMutation.mutate({ docId, purchaserId });
    onAssigned?.({ _id: docId });
  };

  /* -------------------- bulk assign helpers (use API + cache prune) -------------------- */
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const clearSelection = () => {
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const bulkAssignToMe = async () => {
    if (!selectedRowKeys.length) {
      message.info("Select at least one listing.");
      return;
    }
    setBulkBusy(true);
    try {
      const ops = selectedRowKeys.map((id) =>
        apiClient.post(`/api/v1/sourcing/${id}/assign`)
      );
      const results = await Promise.allSettled(ops);
      const succeeded = [];
      const failed = [];

      results.forEach((r, idx) => {
        const id = selectedRowKeys[idx];
        if (r.status === "fulfilled") succeeded.push(id);
        else failed.push(id);
      });

      if (succeeded.length) {
        queryClient.setQueryData(["pendingQueue"], (old = []) =>
          old.filter((r) => !succeeded.includes(String(r._id)))
        );
      }

      message.success(
        `Assigned ${succeeded.length} listing(s)${
          failed.length ? `, ${failed.length} failed` : ""
        }`
      );
    } catch (e) {
      message.error("Bulk assign failed. Please try again.");
    } finally {
      setBulkBusy(false);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["pendingQueue"] });
    }
  };

  const bulkAssignToPurchaser = async (purchaserId) => {
    if (!purchaserId) return;
    if (!selectedRowKeys.length) {
      message.info("Select at least one listing.");
      return;
    }
    setBulkBusy(true);
    try {
      const ops = selectedRowKeys.map((id) =>
        apiClient.post(`/api/v1/sourcing/${id}/assign-to`, { purchaserId })
      );
      const results = await Promise.allSettled(ops);
      const succeeded = [];
      const failed = [];

      results.forEach((r, idx) => {
        const id = selectedRowKeys[idx];
        if (r.status === "fulfilled") succeeded.push(id);
        else failed.push(id);
      });

      if (succeeded.length) {
        queryClient.setQueryData(["pendingQueue"], (old = []) =>
          old.filter((r) => !succeeded.includes(String(r._id)))
        );
      }

      message.success(
        `Assigned ${succeeded.length} listing(s) to purchaser${
          failed.length ? `, ${failed.length} failed` : ""
        }`
      );
    } catch (e) {
      message.error("Bulk assign failed. Please try again.");
    } finally {
      setBulkBusy(false);
      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["pendingQueue"] });
    }
  };

  /* --------------------------- columns --------------------------- */
  const actionsColNeeded = canAssignToMe || isAdmin;
  const assigningId =
    assignToMeMutation.variables?.docId ?? assignToPurchaserMutation.variables?.docId ?? null;
  const anyAssignBusy = assignToMeMutation.isPending || assignToPurchaserMutation.isPending;

  const columns = useMemo(() => {
    const base = [
      {
        title: "ID",
        dataIndex: "sourcing_id",
        width: 60,
        onCell: () => ({
          style: {
            maxWidth: 60,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        sorter: (a, b) =>
          String(a?.sourcing_id ?? a?.id ?? a?._id ?? "").localeCompare(
            String(b?.sourcing_id ?? b?.id ?? b?._id ?? "")
          ),
        render: (_, rec) => (
          <strong className="text-[#2c2c2c]">
            #{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}
          </strong>
        ),
        responsive: ["sm"],
        fixed: "left",
        className: "px-2",
        onHeaderCell: () => ({ className: "px-2" }),
      },
      {
        title: "Sourcer",
        dataIndex: "sourcer_name",
        width: 150,
        onCell: () => ({
          style: {
            maxWidth: 150,
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
        className: "px-2",
        onHeaderCell: () => ({ className: "px-2" }),
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
          const target = safeNum(rec.target_total_cost);
          const actual = safeNum(rec.total_actual_cost);
          if (!target) return "—";
          const pct = (1 - actual / target) * 100;
          const color = pct >= 0 ? "#16a34a" : "#ef4444";
          return <span style={{ color, fontWeight: 600 }}>{pct.toFixed(1)}%</span>;
        },
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      {
        title: "Savings",
        key: "savings",
        width: 120,
        onCell: () => ({
          style: {
            maxWidth: 120,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        align: "center",
        render: (_, rec) => {
          let savings = 0;

          if (Array.isArray(rec.items) && rec.items.length) {
            savings = rec.items.reduce((acc, it) => {
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
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      {
        title: "Status",
        dataIndex: "status",
        width: 120,
        onCell: () => ({
          style: {
            maxWidth: 120,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
        }),
        align: "center",
        render: (s) => <StatusBadge status={s} />,
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      {
        title: "Tracking",
        dataIndex: "tracking_status",
        width: 140,
        align: "center",
        render: (v) => <TrackingBadge value={mapTrackingBucket(v)} />,
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      {
        title: "Seller",
        dataIndex: "seller_name",
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
        render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
        className: "px-2",
        onHeaderCell: () => ({ className: "px-2" }),
      },
      {
        title: "Market",
        dataIndex: "market",
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
        render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
        className: "px-2",
        onHeaderCell: () => ({ className: "px-2" }),
      },
      {
        title: "Seller Price",
        dataIndex: "sellers_price",
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
        render: (p) => money(p),
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      {
        title: "Shipping Charges",
        dataIndex: "shipping_charges",
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
        render: (p, rec) => money(p ?? rec?.shipping_price ?? 0),
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      {
        title: "Tax",
        dataIndex: "taxes",
        width: 120,
        align: "right",
        render: (p, rec) => money(p ?? rec?.tax ?? 0),
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      {
        title: "Target Cost",
        dataIndex: "target_total_cost",
        width: 150,
        align: "right",
        render: (p) => money(p),
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      {
        title: "Total Actual Cost",
        dataIndex: "total_actual_cost",
        width: 150,
        align: "right",
        render: (p) => money(p),
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
      },
      // ===== Copy listing link action (fixed right) =====
      {
        title: "",
        key: "copy_listing_link",
        width: 64,
        align: "center",
        fixed: "right",
        render: (_, rec) => {
          const raw = rec?.listing_link ?? rec?.listingLink ?? "";
          const url = ensureHttp(raw);
          const disabled = !url;

          const handleCopy = async (e) => {
            e.stopPropagation(); // don't trigger row navigation
            if (!url) {
              message.warning("This row has no listing link.");
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
              message.success("Listing link copied to clipboard.");
            } catch {
              message.error("Could not copy the listing link.");
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
    ];

    if (actionsColNeeded) {
      base.push({
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: isAdmin && canAssignToMe ? 90 : 60,
        align: "right",
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
        render: (_, record) => {
          const docId = record?._id;
          const humanId = record?.sourcing_id;
          const busy = String(assigningId || "") === String(docId);

          const popContent = (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              style={{ width: 360, maxWidth: "90vw" }}
              aria-label={`Assign sourcing #${humanId ?? ""} to purchaser`}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <Text strong>Assign to purchaser</Text>
                {busy && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <LoadingOutlined /> <Text type="secondary">Assigning…</Text>
                  </span>
                )}
              </div>
              <Divider style={{ margin: "8px 0 12px" }} />
              <Select
                autoFocus
                showSearch
                placeholder={purchaserLoading ? "Loading purchasers…" : "Search or select purchaser"}
                style={{ width: "100%" }}
                size="large"
                loading={purchaserLoading || busy}
                options={purchaserOptions}
                filterOption={(input, option) => {
                  const term = (input || "").toLowerCase().trim();
                  if (!term) return true;
                  return (option?.search || "").includes(term);
                }}
                optionFilterProp="search"
                dropdownMatchSelectWidth
                dropdownStyle={{ maxHeight: 320, overflow: "auto" }}
                getPopupContainer={() => document.body}
                onSelect={(purchaserId) => handleAssignToPurchaser(docId, purchaserId)}
                value={undefined}
                notFoundContent={
                  purchaserLoading ? <Spin size="small" /> : <Text type="secondary">No matches</Text>
                }
              />
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                <Button size="small" type="text">
                  Close
                </Button>
              </div>
            </div>
          );

          return (
            <div className="inline-flex items-center gap-2">
              {canAssignToMe && (
                <Tooltip title="Assign to Me">
                  <Button
                    type="primary"
                    size="middle"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssignToMe(docId, humanId);
                    }}
                    loading={busy}
                    disabled={anyAssignBusy && !busy}
                    className="
                      !p-0 !w-9 !h-9
                      !rounded-md
                      !inline-flex !items-center !justify-center
                      shadow-sm hover:shadow
                    "
                    aria-label="Assign to me"
                  >
                    <UserAddOutlined className="text-[16px] leading-none" />
                  </Button>
                </Tooltip>
              )}

              {isAdmin && (
                <Popover
                  title={null}
                  trigger="click"
                  placement="bottomRight"
                  destroyTooltipOnHide
                  overlayStyle={{ minWidth: 360, zIndex: 1090 }}
                  content={popContent}
                  onOpenChange={(open) => {
                    if (open) prefetchAllPurchasers();
                  }}
                >
                  <Tooltip title="Assign to Purchaser">
                    <Button
                      size="middle"
                      onClick={(e) => e.stopPropagation()}
                      className="
                        !p-0 !w-9 !h-9
                        !rounded-md
                        !inline-flex !items-center !justify-center
                        bg-white hover:!bg-gray-50
                        border border-gray-200
                        shadow-sm hover:shadow
                      "
                      aria-label="Assign to purchaser"
                      disabled={anyAssignBusy && !busy}
                    >
                      <UserSwitchOutlined className="text-[16px] leading-none" />
                    </Button>
                  </Tooltip>
                </Popover>
              )}
            </div>
          );
        },
      });
    }

    return base;
  }, [
    actionsColNeeded,
    isAdmin,
    canAssignToMe,
    assigningId,
    anyAssignBusy,
    purchaserLoading,
    purchaserOptions,
    prefetchAllPurchasers,
    handleAssignToMe,
    handleAssignToPurchaser,
  ]);

  /* --------------------------- render --------------------------- */
  if (!rolesLoaded) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 240 }}>
        <Spin />
      </div>
    );
  }

  if (!canViewPendingQueue) {
    return (
      <Card
        style={{
          borderRadius: 16,
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 20 }}
      >
        <Empty
          description={
            <div className="text-center">
              <div className="font-semibold">No permission to view Pending Queue</div>
              <div className="text-gray-500">Ask an admin to enable Purchaser → “pending queue”.</div>
            </div>
          }
        />
      </Card>
    );
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      setSelectedRows(rows);
    },
    preserveSelectedRowKeys: true,
  };

  const canBulkAssignToMe = isAdmin || canAssignToMe;

  return (
    <>
      <Card
        style={{
          borderRadius: 16,
          background: "rgba(255,255,255,0.95)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
        }}
        bodyStyle={{ padding: 16 }}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => pendingQuery.refetch()}
            aria-label="Refresh pending"
            className="
              !rounded-full !p-0 !w-10 !h-10
              grid place-items-center
              bg-white hover:!bg-gray-50
              border border-gray-200
              shadow-sm hover:shadow
            "
          />
        }
      >
        {selectedRowKeys.length > 0 && (
          <div
            className="
              mb-3 rounded-xl border border-blue-100
              bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50
              px-3 py-2
              flex flex-wrap items-center gap-2 justify-between
            "
          >
            <div className="text-[12px] font-semibold text-slate-700">
              {selectedRowKeys.length} selected
            </div>

            <div className="flex items-center gap-8 flex-wrap">
              {canBulkAssignToMe && (
                <Tooltip title="Assign all selected to me">
                  <Button
                    type="primary"
                    loading={bulkBusy}
                    onClick={bulkAssignToMe}
                    className="!bg-emerald-600 hover:!bg-emerald-700"
                    icon={<UserAddOutlined />}
                  >
                    Assign to me
                  </Button>
                </Tooltip>
              )}

              {isAdmin && (
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-slate-600">or assign to</span>
                  <Select
                    showSearch
                    placeholder={purchaserLoading ? "Loading purchasers…" : "Select purchaser"}
                    loading={purchaserLoading}
                    onDropdownVisibleChange={(open) => {
                      if (open) prefetchAllPurchasers();
                    }}
                    onChange={(val) => val && bulkAssignToPurchaser(val)}
                    style={{ width: 260 }}
                    allowClear
                    optionFilterProp="search"
                    filterOption={(input, option) =>
                      (option?.search || "").includes((input || "").toLowerCase().trim())
                    }
                    value={undefined}
                    dropdownRender={(menu) => (
                      <div>
                        <div style={{ padding: 8, paddingBottom: 0 }}>
                          <Button
                            size="small"
                            onClick={() => prefetchAllPurchasers()}
                            loading={purchaserLoading}
                          >
                            {purchaserLoading ? "Loading…" : "Reload list"}
                          </Button>
                        </div>
                        <Divider style={{ margin: "8px 0" }} />
                        {menu}
                      </div>
                    )}
                  >
                    {purchaserOptions.map((opt) => (
                      <Option key={opt.value} value={opt.value} search={opt.search}>
                        {opt.label}
                      </Option>
                    ))}
                  </Select>
                </div>
              )}

              <Button onClick={clearSelection} disabled={bulkBusy}>
                Clear selection
              </Button>
            </div>
          </div>
        )}

        <Table
          className="pending-table"
          locale={{ emptyText: <Empty description="No pending requests" /> }}
          dataSource={requests}
          columns={columns}
          rowKey={(rec) => String(rec?._id ?? rec?.id ?? rec?.sourcing_id)}
          loading={{
            spinning: loading || pendingQuery.isFetching,
            indicator: <LoadingOutlined style={{ fontSize: 24 }} spin />,
          }}
          pagination={{ pageSize: 10, responsive: true }}
          tableLayout="fixed"
          scroll={{ x: "max-content" }}
          sticky
          rowSelection={rowSelection}
          onRow={(record) => ({
            onClick: (e) => {
              const cell = e.target.closest("td");
              if (cell && cell.classList.contains("ant-table-selection-column")) return;
              const url = toListingUrl(record?.listing_link);
              if (url !== "#") window.open(url, "_blank", "noopener,noreferrer");
            },
            style: { cursor: record?.listing_link ? "pointer" : "default" },
          })}
          expandable={{
            expandedRowRender: (record) => (
              <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
            ),
            rowExpandable: (record) =>
              Array.isArray(record?.items) && record.items.length > 0,
          }}
        />

        <style>{`
          .pending-table .ant-table-thead > tr > th { white-space: nowrap; }
          .pending-table .ant-table-cell { padding-top: 8px; padding-bottom: 8px; }
          .ant-popover { z-index: 1090; }
        `}</style>
      </Card>
    </>
  );
}
