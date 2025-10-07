
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { Table, message, Select, Grid, Empty, Spin, Card, Tabs } from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import PurchaserFilters from "./components/PurchaserFilters";
import { CopyOutlined } from "@ant-design/icons";
import Swal from "sweetalert2"; // <-- needed for toast

const { useBreakpoint } = Grid;

/* --------------------------- helpers --------------------------- */
const lower = (v) => String(v ?? "").trim().toLowerCase();
const pickRows = (body) =>
  Array.isArray(body)
    ? body
    : body?.docs || body?.data || body?.results || body?.items || [];

/** Purchaser permissions from /api/v1/role/all */
const extractPurchaserPerms = (roleObj) => {
  const access = Array.isArray(roleObj?.access) ? roleObj.access : [];
  const purchaser = access.find((a) => lower(a?.app) === "purchaser");
  const menu = Array.isArray(purchaser?.menu) ? purchaser.menu.map(lower) : [];
  return {
    canSeeAssignedMine: menu.includes("assigned to me"),
    canSeeAllAssigned: menu.includes("all assigned"),
  };
};

const ensureHttp = (v = "") => {
  const s = String(v || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
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

/* ---------------------- STATUS (business) ---------------------- */
const STATUS_META = {
  "": { label: "All", color: "bg-slate-400" },
  Assigned: { label: "Assigned", color: "bg-amber-500" },
  Offer: { label: "Offer", color: "bg-blue-500" },
  Purchased: { label: "Purchased", color: "bg-green-600" },
  Disapproved: { label: "Disapproved", color: "bg-red-500" },
  Sold: { label: "Sold", color: "bg-purple-500" },
  Hold: { label: "Hold", color: "bg-orange-500" },
  "Seller Rejected": { label: "Seller Rejected", color: "bg-fuchsia-500" },
  Dropshipped: { label: "Dropshipped", color: "bg-cyan-500" },
  Returned: { label: "Returned", color: "bg-orange-600" },
};
const STATUS_ORDER = [
  "",
  "Assigned",
  "Offer",
  "Purchased",
  "Disapproved",
  "Sold",
  "Hold",
  "Seller Rejected",
  "Dropshipped",
  "Returned",
];
const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({
  key: value || "ALL",
  value,
  label: STATUS_META[value].label,
  color: STATUS_META[value].color,
}));

/* ---------------------- TRACKING (shipping) ---------------------- */
const mapTrackingBucket = (raw) => {
  const v = lower(raw);
  if (v === "intransit" || v === "in transit") return "InTransit";
  if (v === "delivered") return "Delivered";
  return "Pending";
};

const TRACKING_ORDER = ["InTransit", "Delivered", "Pending"];
const TRACKING_META = {
  InTransit: {
    label: "InTransit",
    color: "bg-sky-500",
    text: "text-sky-700",
    bg: "bg-sky-50",
    ring: "ring-sky-200",
  },
  Delivered: {
    label: "Delivered",
    color: "bg-emerald-600",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
  },
  Pending: {
    label: "Pending",
    color: "bg-amber-500",
    text: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
  },
};

/* -------------------- small helpers -------------------- */
const moneyUSD = (x, { min = 2, max = 2 } = {}) => {
  const n = typeof x === "number" ? x : Number(x) || 0;
  const abs = Math.abs(n).toLocaleString(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
  return `${n < 0 ? "-" : ""}$${abs}`;
};

/** Debounced purchaser search for admin scope */
function usePurchaserSearch() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const t = useRef(null);

  const mapUser = (u) => ({
    value: String(u.value),
    label: (
      <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
        <span style={{ fontWeight: 600 }}>
          {u.label || u.email || "Unnamed"}
        </span>
        {u.email ? <span style={{ color: "#999" }}>· {u.email}</span> : null}
      </div>
    ),
    raw: u,
  });

  const fetchUsers = async (q = "", page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await apiClient.get("/api/v1/sourcing/purchasers/search", {
        params: { q, page, limit },
      });
      const list = res.data?.results || [];
      setOptions(list.map(mapUser));
    } catch (e) {
      const status = e?.response?.status;
      if (status === 403) message.warning("Only admins can search purchasers.");
      else
        message.error(
          e?.response?.data?.message || "Failed to search purchasers."
        );
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = (q) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fetchUsers(q), 300);
  };

  const fetchInitial = () => !options.length && fetchUsers("");

  return { options, loading, debouncedSearch, fetchInitial };
}

/* =================================================================== */

export default function PurchaserListingsPage() {
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Admin check
  const isAdmin = useMemo(() => {
    const r = authUser?.roles;
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
  }, [authUser]);

  const roleName = useMemo(
    () => lower(authUser?.roles?.role || authUser?.role || ""),
    [authUser]
  );

  // Permission gating
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [canSeeAssignedMine, setCanSeeAssignedMine] = useState(false);
  const [canSeeAllAssigned, setCanSeeAllAssigned] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/role/all");
        const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
        const matched =
          rolesArr.find((r) => lower(r?.role) === roleName) || null;
        const perms = extractPurchaserPerms(matched || {});
        if (!cancelled) {
          setCanSeeAssignedMine(!!perms.canSeeAssignedMine);
          setCanSeeAllAssigned(!!perms.canSeeAllAssigned);
          setRolesLoaded(true);
        }
      } catch (e) {
        console.error("Failed to load /api/v1/role/all", e);
        if (!cancelled) {
          setCanSeeAssignedMine(false);
          setCanSeeAllAssigned(false);
          setRolesLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleName]);

  // Data
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Status filter (business) synced with URL
  const initialStatusFromUrl = useMemo(
    () => searchParams.get("status") || "",
    [searchParams]
  );
  const [statusFilter, setStatusFilter] = useState(initialStatusFromUrl);

  // Tracking (no “All” tab; empty = no filter)
  const [trackingFilter, setTrackingFilter] = useState(""); // '', 'InTransit', 'Delivered', 'Pending'

  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [selectedPurchaser, setSelectedPurchaser] = useState(null);

  // Counts
  const [statusCounts, setStatusCounts] = useState({});
  const [trackingCounts, setTrackingCounts] = useState({});

  const {
    options: purchaserOptions,
    loading: purchaserLoading,
    debouncedSearch: purchaserSearch,
    fetchInitial: fetchInitialPurchasers,
  } = usePurchaserSearch();

  const screens = useBreakpoint();
  const navigate = useNavigate();

  // Keep business status in URL
  useEffect(() => {
    const current = searchParams.get("status") || "";
    if (statusFilter !== current) {
      const next = new URLSearchParams(searchParams);
      if (statusFilter) next.set("status", statusFilter);
      else next.delete("status");
      setSearchParams(next, { replace: true });
    }
  }, [statusFilter, searchParams, setSearchParams]);

  // Reset page on filter change
  useEffect(
    () => setPage(1),
    [statusFilter, trackingFilter, searchTerm, dateRange, selectedPurchaser]
  );

  // Base params (permission-gated)
  const baseParams = useMemo(() => {
    const params = {};
    if (isAdmin) {
      if (!canSeeAllAssigned) return null;
      if (selectedPurchaser?.value)
        params.purchaser_id = selectedPurchaser.value;
    } else {
      if (!canSeeAssignedMine) return null;
      params.mine = true;
    }
    if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
      params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
      params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
    }
    if (searchTerm?.trim()) params.q = searchTerm.trim();
    return params;
  }, [
    isAdmin,
    canSeeAllAssigned,
    canSeeAssignedMine,
    selectedPurchaser,
    dateRange,
    searchTerm,
  ]);

  // Business status goes to server
  const serverParams = useMemo(() => {
    if (!baseParams) return null;
    const p = { ...baseParams };
    if (statusFilter) p.status = statusFilter;
    return p;
  }, [baseParams, statusFilter]);

  // Fetch paged list (then apply trackingFilter client-side)
  const fetchListings = useCallback(async () => {
    if (!serverParams) {
      setRequests([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
        params: { ...serverParams, page, limit, sort: "-createdAt" },
      });
      let rows = normalizeRequests(pickRows(data));

      if (trackingFilter) {
        rows = rows.filter(
          (r) => mapTrackingBucket(r.tracking_status) === trackingFilter
        );
      }

      setRequests(rows);
      setTotal(
        trackingFilter ? rows.length : Number(data?.total ?? rows.length ?? 0)
      );
    } catch (err) {
      console.error(
        "Failed to fetch data:",
        err?.response?.data || err?.message
      );
      message.error(err?.response?.data?.message || "Failed to fetch data.");
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [serverParams, page, limit, trackingFilter]);

  useEffect(() => {
    if (!rolesLoaded) return;
    fetchListings();
  }, [rolesLoaded, fetchListings]);

  // Fetch counts for each business status (server-side)
  const fetchStatusCounts = useCallback(async () => {
    if (!baseParams) {
      setStatusCounts({});
      return;
    }
    try {
      const getCount = async (statusVal) => {
        const params = { ...baseParams, page: 1, limit: 1, sort: "-createdAt" };
        if (statusVal) params.status = statusVal;
        const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
          params,
        });
        return Number(data?.total ?? 0);
      };
      const entries = await Promise.all(
        STATUS_OPTIONS.map(async (opt) => [
          opt.value,
          await getCount(opt.value),
        ])
      );
      setStatusCounts(Object.fromEntries(entries));
    } catch (e) {
      console.warn(
        "Failed to fetch status counts",
        e?.response?.data || e?.message
      );
    }
  }, [baseParams]);

  // Compute counts for tracking buckets client-side
  const fetchTrackingCounts = useCallback(async () => {
    if (!baseParams) {
      setTrackingCounts({});
      return;
    }
    try {
      const params = { ...baseParams, page: 1, limit: 500, sort: "-createdAt" };
      const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
        params,
      });
      const rows = normalizeRequests(pickRows(data));
      const counts = rows.reduce((acc, r) => {
        const bucket = mapTrackingBucket(r.tracking_status);
        acc[bucket] = (acc[bucket] || 0) + 1;
        return acc;
      }, {});
      setTrackingCounts({
        InTransit: counts.InTransit || 0,
        Delivered: counts.Delivered || 0,
        Pending: counts.Pending || 0,
      });
    } catch (e) {
      console.warn(
        "Failed to compute tracking counts",
        e?.response?.data || e?.message
      );
      setTrackingCounts({});
    }
  }, [baseParams]);

  useEffect(() => {
    if (!rolesLoaded) return;
    fetchStatusCounts();
    fetchTrackingCounts();
  }, [rolesLoaded, fetchStatusCounts, fetchTrackingCounts]);

  const handleRefreshClick = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([
        fetchListings(),
        fetchStatusCounts(),
        fetchTrackingCounts(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchListings, fetchStatusCounts, fetchTrackingCounts]);

  /* --------------------------- columns --------------------------- */
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
      }[value] || {
        bg: "bg-slate-50",
        text: "text-slate-700",
        ring: "ring-slate-200",
      };

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

  const columns = [
    {
      title: "ID",
      dataIndex: "sourcing_id",
      width: 120,
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
    },
    {
      title: "Sourcer",
      dataIndex: "sourcer_name",
      width: 160,
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: "Efficiency",
      key: "efficiency",
      align: "right",
      render: (_, rec) => {
        const eff =
          typeof rec.purchase_efficiency === "number"
            ? rec.purchase_efficiency
            : safeNum(rec.target_total_cost) - safeNum(rec.total_actual_cost);
        const color = eff >= 0 ? "#16a34a" : "#ef4444";
        return (
          <p className="m-0 font-semibold" style={{ color }}>
            {moneyUSD(eff)}
          </p>
        );
      },
    },

        {
      title: "Savings",
      key: "savings",
      width: 150,
      align: "right",
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
        return (
          <span style={{ color, fontWeight: 600 }}>{moneyUSD(savings)}</span>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 160,
      align: "center",
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: "Tracking",
      dataIndex: "tracking_status",
      width: 140,
      align: "center",
      render: (v) => <TrackingBadge value={mapTrackingBucket(v)} />,
    },
    {
      title: "Seller",
      dataIndex: "seller_name",
      width: 200,
      ellipsis: true,
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: "Market",
      dataIndex: "market",
      width: 140,
      ellipsis: true,
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: "Seller Price",
      dataIndex: "sellers_price",
      width: 160,
      align: "right",
      render: (p) => money(p),
    },
    {
      title: "Shipping",
      dataIndex: "shipping_charges",
      width: 140,
      align: "right",
      render: (p, rec) => money(p ?? rec?.shipping_price ?? 0),
    },
    {
      title: "Tax",
      dataIndex: "taxes",
      width: 120,
      align: "right",
      render: (p, rec) => money(p ?? rec?.tax ?? 0),
    },
    {
      title: "Target Cost",
      dataIndex: "target_total_cost",
      width: 150,
      align: "right",
      render: (p) => money(p),
    },
    // ===== Savings column (item-level calc; fallback to totals) =====

    {
      title: "Actual Cost",
      dataIndex: "total_actual_cost",
      width: 150,
      align: "right",
      render: (p) => money(p),
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
  ];

  /* --------------------------- compact status tabs --------------------------- */
  const PillTab = ({ text, color, count, active }) => (
    <div
      className={[
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-all",
        active
          ? "text-white border-transparent"
          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
      ].join(" ")}
      style={active ? { backgroundColor: "#3B82F6" } : {}}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-white" : color,
        ].join(" ")}
      />
      <span className="font-medium">{text}</span>
      <span
        className={[
          "ml-1 inline-flex items-center justify-center rounded-md text-[10px] leading-none px-1 py-[1px]",
          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700",
        ].join(" ")}
      >
        {count ?? 0}
      </span>
    </div>
  );

  const activeStatusKey = useMemo(() => {
    const found = STATUS_OPTIONS.find((s) => s.value === statusFilter);
    return found?.key || "ALL";
  }, [statusFilter]);

  const statusTabItems = useMemo(
    () =>
      STATUS_OPTIONS.map((s) => ({
        key: s.key,
        label: (
          <PillTab
            text={s.label}
            color={s.color}
            count={statusCounts[s.value] ?? 0}
            active={activeStatusKey === s.key}
          />
        ),
      })),
    [statusCounts, activeStatusKey]
  );

  /* --------------------- compact tracking pills (custom) --------------------- */
  const TrackingPill = ({ id, label, count, active }) => {
    const meta = TRACKING_META[id];
    const isOn = active;
    return (
      <button
        type="button"
        onClick={() => setTrackingFilter(isOn ? "" : id)}
        className={[
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
          isOn
            ? "text-white border-transparent"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
        ].join(" ")}
        style={isOn ? { backgroundColor: "#3B82F6" } : {}}
      >
        <span
          className={`h-2 w-2 rounded-full ${isOn ? "bg-white" : meta.color}`}
        />
        <span className="font-medium">{label}</span>
        <span
          className={`ml-0.5 rounded-full px-1.5 py-[1px] text-[10px] leading-none ${
            isOn ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          {count ?? 0}
        </span>
      </button>
    );
  };

  /* --------------------------- render --------------------------- */
  if (!rolesLoaded) {
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
              <div className="font-semibold">
                No permission to view “All Assigned”
              </div>
              <div className="text-gray-500">
                Ask an admin to enable Purchaser → “all assigned”.
              </div>
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
              <div className="font-semibold">
                No permission to view “Assigned to Me”
              </div>
              <div className="text-gray-500">
                Ask an admin to enable Purchaser → “assigned to me”.
              </div>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      {/* Header + COMPACT Tabs */}
      <div className="mb-3 rounded-xl border border-slate-200 bg-white/90 shadow-sm">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-slate-800 font-semibold text-sm tracking-wide">
            Listings
          </div>
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="text-xs px-3 py-1.5 rounded-md border border-slate-300 hover:bg-slate-50 disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Status Tabs (compact, no bottom line, no overflow '...') */}
        <div className="px-2 pt-1 pb-1 overflow-x-auto no-scrollbar">
          <Tabs
            items={statusTabItems}
            activeKey={activeStatusKey}
            onChange={(key) => {
              const found = STATUS_OPTIONS.find((s) => s.key === key);
              setStatusFilter(found ? found.value : "");
            }}
            destroyInactiveTabPane={false}
            animated
            className="
              [&_.ant-tabs-nav]:mb-0
              [&_.ant-tabs-nav]:min-h-0
              [&_.ant-tabs-nav::before]:hidden
              [&_.ant-tabs-ink-bar]:hidden
              [&_.ant-tabs-tab]:px-0
              [&_.ant-tabs-tab]:py-0
              [&_.ant-tabs-tab]:m-0
              [&_.ant-tabs-tab]:mr-1.5
              [&_.ant-tabs-tab-btn]:leading-none
              [&_.ant-tabs-nav-more]:hidden
            "
            tabBarGutter={2}
            tabBarStyle={{ margin: 0, whiteSpace: "nowrap" }}
            moreIcon={null}
          />
        </div>

        {/* Tracking Pills (no 'All'; compact) */}
        <div className="px-4 pt-2 pb-3 -mt-1 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {TRACKING_ORDER.map((id) => (
            <TrackingPill
              key={id}
              id={id}
              label={TRACKING_META[id].label}
              count={trackingCounts[id] ?? 0}
              active={trackingFilter === id}
            />
          ))}
          {trackingFilter && (
            <button
              type="button"
              onClick={() => setTrackingFilter("")}
              className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <PurchaserFilters
        screens={screens}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateRange={dateRange}
        setDateRange={setDateRange}
        AdminScopeControl={
          isAdmin && canSeeAllAssigned ? (
            <Select
              allowClear
              showSearch
              placeholder="View purchaser…"
              style={{ minWidth: 240 }}
              options={purchaserOptions}
              loading={purchaserLoading}
              value={selectedPurchaser?.value}
              onSearch={purchaserSearch}
              onDropdownVisibleChange={(open) =>
                open && fetchInitialPurchasers()
              }
              onChange={(_, option) => setSelectedPurchaser(option || null)}
              filterOption={false}
              size={screens.xs ? "middle" : "large"}
            />
          ) : null
        }
        onClear={() => {
          setStatusFilter("");
          setTrackingFilter("");
          setSearchTerm("");
          setDateRange([]);
          setSelectedPurchaser(null);
          setPage(1);
          fetchListings();
          fetchStatusCounts();
          fetchTrackingCounts();
        }}
        showStatusNote="Status tabs & filter apply on Listings page"
        statusOptions={STATUS_OPTIONS.filter((s) => s.value)}
      />

      {/* Table */}
      <div className="rounded-lg border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm">
        <Table
          locale={{
            emptyText: (
              <Empty description="No listings found for your filters" />
            ),
          }}
          dataSource={requests}
          columns={columns}
          rowKey={(rec) => rec._id}
          loading={loading}
          size={screens.md ? "middle" : "small"}
          pagination={false}
          onRow={(record) => ({
            onClick: () => {
              const id = record._id || record.id;
              if (id) navigate(`/requests/${id}`);
            },
            style: { cursor: "pointer" },
          })}
          rowClassName={() => "row-clickable"}
          scroll={{ x: "max-content" }}
          tableLayout="fixed"
          sticky
          expandable={{
            expandedRowRender: (record) => (
              <ExpandedItemsTable
                order={record}
                onOpen={(to) => navigate(to)}
              />
            ),
            rowExpandable: (record) =>
              Array.isArray(record.items) && record.items.length > 0,
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
}
