
// /src/pages/purchaser/PurchaserPendingPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  Table,
  Tag,
  Button,
  Empty,
  message,
  Modal,
  Select,
  Tooltip,
  Spin,
} from "antd";
import {
  ReloadOutlined,
  LoadingOutlined,
  UserAddOutlined,       // Assign to Me
  UserSwitchOutlined,    // Assign to Purchaser
  CopyOutlined,          // Copy listing link
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import apiClient from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";

import {
  normalizeRequests,
  statusColor,
  num as safeNum,
  ExpandedItemsTable,
} from "./utils/PurchaseTableUtils.jsx";

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

/* ---- simple badges (match your style) ---- */
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

/* =============================================================== */
export default function PurchaserPendingPage({ onAssigned }) {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // ── Role/permission state
  const roleName = useMemo(
    () => lower(user?.roles?.role || user?.role || ""),
    [user]
  );
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [canViewPendingQueue, setCanViewPendingQueue] = useState(false);
  const [canAssignToMe, setCanAssignToMe] = useState(false);

  // ── Data/UI state
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null); // holds the _id of the row being assigned

  // admin modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState(null); // holds the _id for admin-assign
  const [purchaserOptions, setPurchaserOptions] = useState([]);
  const [purchaserLoading, setPurchaserLoading] = useState(false);
  const [selectedPurchaserId, setSelectedPurchaserId] = useState(null);
  const [hasPrefetched, setHasPrefetched] = useState(false);

  /* ----------------------- load roles → permissions ----------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/role/all");
        const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
        const matched = rolesArr.find((r) => lower(r?.role) === roleName) || null;
        const { canViewPendingQueue, canAssignToMe } =
          extractPurchaserPerms(matched || {});
        if (!cancelled) {
          setCanViewPendingQueue(!!canViewPendingQueue);
          setCanAssignToMe(!!canAssignToMe);
          setRolesLoaded(true);
        }
      } catch (e) {
        console.error("Failed to load /api/v1/role/all", e);
        if (!cancelled) {
          // secure defaults
          setCanViewPendingQueue(false);
          setCanAssignToMe(false);
          setRolesLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleName]);

  /* ----------------------- fetch pending (fixed endpoints) ----------------------- */
  const fetchPending = useCallback(async () => {
    // respect permission: if no pending queue, do not fetch
    if (!canViewPendingQueue) {
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res =
        (await apiClient.get("/api/v1/sourcing/pending")) ||
        (await apiClient.get("/api/v1/sourcing", { params: { status: "Pending" } }));

      const rows = normalizeRequests(pickRows(res?.data));
      setRequests(hasRows(rows) ? rows : []);
    } catch (err) {
      console.error(err);
      message.error(err?.response?.data?.message || "Failed to fetch pending requests.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [canViewPendingQueue]);

  // Wait for roles before first fetch to avoid flash
  useEffect(() => {
    if (!rolesLoaded) return;
    fetchPending();
  }, [rolesLoaded, fetchPending]);

  /* -------------------- assign to me (must use Mongo _id) -------------------- */
  const handleAssignToMe = async (docId, humanId) => {
    if (!docId) return;
    setAssigningId(docId);
    try {
      const res = await apiClient.post(`/api/v1/sourcing/${docId}/assign`);
      setRequests((prev) => prev.filter((r) => String(r._id) !== String(docId)));
      onAssigned?.({ ...(res?.data || {}), _id: docId, sourcing_id: humanId });
      message.success(`Assigned #${humanId ?? ""}`.trim());
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Failed to assign request.");
    } finally {
      setAssigningId(null);
    }
  };

  /* -------------------- assign to purchaser (admin) -------------------- */
  const openAssignModal = (docId) => {
    setAssignTargetId(docId);
    setSelectedPurchaserId(null);
    setAssignModalOpen(true);
    if (!hasPrefetched) prefetchAllPurchasers();
  };

  const normalizePurchaserList = (payload) => {
    const list = pickRows(payload);
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
  };

  const prefetchAllPurchasers = async () => {
    setPurchaserLoading(true);
    try {
      const { data } = await apiClient.get(
        "/api/v1/sourcing/purchasers/search",
        { params: { q: "", page: 1, limit: MAX_FETCH } }
      );
      setPurchaserOptions(normalizePurchaserList(data));
      setHasPrefetched(true);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) message.warning("Only admins can search purchasers.");
      else message.error(e?.response?.data?.message || "Failed to load purchasers.");
      setPurchaserOptions([]);
    } finally {
      setPurchaserLoading(false);
    }
  };

  const submitAssignTo = async () => {
    if (!assignTargetId || !selectedPurchaserId) return;
    try {
      const res = await apiClient.post(
        `/api/v1/sourcing/${assignTargetId}/assign-to`,
        { purchaserId: selectedPurchaserId }
      );
      setRequests((prev) => prev.filter((r) => String(r._id) !== String(assignTargetId)));
      setAssignModalOpen(false);
      onAssigned?.({ ...(res?.data || {}), _id: assignTargetId });
      message.success("Assigned to purchaser.");
    } catch (e) {
      console.error(e);
      message.error(e?.response?.data?.message || "Assign failed.");
    }
  };

  /* --------------------------- columns --------------------------- */
  const actionsColNeeded = canAssignToMe || isAdmin;

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
          if (!target) return "—"; // avoid divide-by-zero / undefined
          const pct = (1 - actual / target) * 100; // 1 - a/c (as percent)
          const color = pct >= 0 ? "#16a34a" : "#ef4444";
          return (
            <span style={{ color, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
          );
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
            savings =
              Number(rec.target_total_cost) - Number(rec.total_actual_cost);
          }

          const color = savings >= 0 ? "#16a34a" : "#ef4444";
          return (
            <span style={{ color, fontWeight: 600 }}>{moneyUSD(savings)}</span>
          );
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

    // Append Actions (assign) if needed
    if (actionsColNeeded) {
      base.push({
        title: "Actions",
        key: "actions",
        fixed: "right",
        width: isAdmin && canAssignToMe ? 92 : 60,
        align: "right",
        className: "px-1",
        onHeaderCell: () => ({ className: "px-1" }),
        render: (_, record) => {
          const docId = record?._id;            // Mongo ObjectId for API
          const humanId = record?.sourcing_id;  // numeric for UI
          const busy = assigningId === docId;

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
                    disabled={assigningId !== null && !busy}
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
                <Tooltip title="Assign to Purchaser">
                  <Button
                    size="middle"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAssignModal(docId);
                    }}
                    className="
                      !p-0 !w-9 !h-9
                      !rounded-md
                      !inline-flex !items-center !justify-center
                      bg-white hover:!bg-gray-50
                      border border-gray-200
                      shadow-sm hover:shadow
                    "
                    aria-label="Assign to purchaser"
                  >
                    <UserSwitchOutlined className="text-[16px] leading-none" />
                  </Button>
                </Tooltip>
              )}
            </div>
          );
        },
      });
    }

    return base;
  }, [assigningId, isAdmin, canAssignToMe, actionsColNeeded]);

  /* --------------------------- render --------------------------- */
  if (!rolesLoaded) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 240 }}>
        <Spin />
      </div>
    );
  }

  // If “pending queue” is OFF: show a gentle notice and no data
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
            onClick={fetchPending}
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
        <Table
          className="pending-table"
          locale={{ emptyText: <Empty description="No pending requests" /> }}
          dataSource={requests}
          columns={columns}
          rowKey={(rec) => String(rec?._id ?? rec?.id ?? rec?.sourcing_id)}
          loading={{
            spinning: loading,
            indicator: <LoadingOutlined style={{ fontSize: 24 }} spin />,
          }}
          pagination={{ pageSize: 10, responsive: true }}
          onRow={(record) => ({
            onClick: () => {
              const url = toListingUrl(record?.listing_link);
              if (url !== "#") window.open(url, "_blank", "noopener,noreferrer");
            },
            style: { cursor: record?.listing_link ? "pointer" : "default" },
          })}
          tableLayout="fixed"
          scroll={{ x: "max-content" }}
          sticky
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
        `}</style>
      </Card>

      {/* Assign-to-purchaser (admin only) */}
      <Modal
        title="Assign to a purchaser"
        open={assignModalOpen}
        okText="Assign"
        onOk={submitAssignTo}
        onCancel={() => setAssignModalOpen(false)}
        okButtonProps={{ disabled: !selectedPurchaserId, type: "primary" }}
        destroyOnClose
      >
        <Select
          showSearch
          placeholder={purchaserLoading ? "Loading purchasers…" : "Select / search purchaser"}
          style={{ width: "100%" }}
          size="large"
          value={selectedPurchaserId || undefined}
          loading={purchaserLoading}
          onChange={(val) => setSelectedPurchaserId(val)}
          onDropdownVisibleChange={(open) => {
            if (open && !hasPrefetched) prefetchAllPurchasers();
          }}
          options={purchaserOptions}
          filterOption={(input, option) => {
            const term = (input || "").toLowerCase().trim();
            if (!term) return true;
            return (option?.search || "").includes(term);
          }}
          optionFilterProp="search"
          dropdownMatchSelectWidth
          getPopupContainer={() => document.body}
        />
      </Modal>
    </>
  );
}
