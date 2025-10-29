
// src/pages/admin/AdminOpsOverview.jsx
import React, { useMemo, useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  LayoutGrid,
  ClipboardList,
  ShoppingCart,
  Truck,
  PackageCheck,
  PauseCircle,
  PackageX,
  Sparkles,
  BarChart3,
  Users,
  Store,
  Info,
} from "lucide-react";
import { Spin, message } from "antd";
import apiClient from "../../../api/client";

/* -------------------------------- THEME --------------------------------- */
const PALETTES = {
  slate: {
    card: "bg-white ring-1 ring-slate-200 shadow-xs",
    topbar: "bg-slate-300/80",
    chip: "bg-slate-600 text-white",
    icon: "text-slate-600",
    headerBg: "bg-slate-50",
    headerText: "text-slate-800",
    grad: "bg-gradient-to-br from-slate-50 to-slate-100",
  },
  blue: {
    card: "bg-white ring-1 ring-sky-200 shadow-xs",
    topbar: "bg-sky-300/80",
    chip: "bg-sky-600 text-white",
    icon: "text-sky-600",
    headerBg: "bg-sky-50",
    headerText: "text-sky-800",
    grad: "bg-gradient-to-br from-sky-50 to-sky-100",
  },
  green: {
    card: "bg-white ring-1 ring-emerald-200 shadow-xs",
    topbar: "bg-emerald-300/80",
    chip: "bg-emerald-600 text-white",
    icon: "text-emerald-600",
    headerBg: "bg-emerald-50",
    headerText: "text-emerald-800",
    grad: "bg-gradient-to-br from-emerald-50 to-emerald-100",
  },
  purple: {
    card: "bg-white ring-1 ring-indigo-200 shadow-xs",
    topbar: "bg-indigo-300/80",
    chip: "bg-indigo-600 text-white",
    icon: "text-indigo-600",
    headerBg: "bg-indigo-50",
    headerText: "text-indigo-800",
    grad: "bg-gradient-to-br from-indigo-50 to-indigo-100",
  },
  amber: {
    card: "bg-white ring-1 ring-amber-200 shadow-xs",
    topbar: "bg-amber-300/80",
    chip: "bg-amber-600 text-white",
    icon: "text-amber-600",
    headerBg: "bg-amber-50",
    headerText: "text-amber-800",
    grad: "bg-gradient-to-br from-amber-50 to-amber-100",
  },
};

/* 🎨 Background + topbar colors for Listing Overview ONLY */
const TONE_BG = {
  blue: "bg-gradient-to-br from-sky-50 to-sky-100 ring-1 ring-sky-200 shadow-xs",
  green: "bg-gradient-to-br from-emerald-50 to-emerald-100 ring-1 ring-emerald-200 shadow-xs",
  purple: "bg-gradient-to-br from-indigo-50 to-indigo-100 ring-1 ring-indigo-200 shadow-xs",
  amber: "bg-gradient-to-br from-amber-50 to-amber-100 ring-1 ring-amber-200 shadow-xs",
};
const TONE_TOPBAR = {
  blue: "bg-sky-300/80",
  green: "bg-emerald-300/80",
  purple: "bg-indigo-300/80",
  amber: "bg-amber-300/80",
};

// ✅ Sourcer card visual style (for all sections EXCEPT "Listing Overview")
const SOURCER_CARD_STYLE = {
  borderRadius: 14,
  background: "linear-gradient(135deg, #ffffff, #f6f9ff)",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  border: "1px solid #eef2ff",
};

const theme = {
  title: "text-sm font-semibold text-slate-800 tracking-tight",
  label: "text-[11px] font-medium text-slate-500",
  value: "text-base md:text-lg font-semibold text-slate-900 tabular-nums leading-tight",
  // ⬇️ add transform + transition base so all cards scale smoothly
  cardBase:
    "relative overflow-hidden rounded-xl transition-transform duration-200 ease-out transform-gpu will-change-transform hover:scale-[1.02]",
  chipWrap: "grid h-8 w-8 place-items-center rounded-md",
};

/* ------------------------------- helpers -------------------------------- */
const num = (v) => (Number.isFinite(+v) ? +v : 0);
const lower = (v) => String(v ?? "").trim().toLowerCase();
const safeStr = (v) => (v == null ? "" : String(v).trim());
const fmtMoneySigned = (n) => {
  const v = num(n);
  const s = Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${v < 0 ? "\u2212\u00A0" : ""}$${s}`;
};

const getSavings = (r) => {
  const direct = r?.purchase_efficiency;
  if (Number.isFinite(+direct)) return +direct;
  const t = num(r?.target_total_cost);
  const a = num(r?.total_actual_cost) || (num(r?.sellers_price) + num(r?.shipping_charges) + num(r?.taxes));
  return t - a;
};
const getTracking = (r) => safeStr(r?.tracking_status);
const getStatus = (r) => safeStr(r?.status);

const getSourcer = (r) =>
  safeStr(r?.sourcerName) ||
  [r?.sourcer_id?.firstName, r?.sourcer_id?.lastName].filter(Boolean).join(" ") ||
  r?.sourcer_id?.email ||
  "—";
const getPurchaser = (r) =>
  safeStr(r?.purchaserName) ||
  [r?.purchaser_id?.firstName, r?.purchaser_id?.lastName].filter(Boolean).join(" ") ||
  r?.purchaser_id?.email ||
  "—";
const getSeller = (r) => safeStr(r?.sellerName) || r?.seller?.name || r?.seller_name || "—";
const getMarketSlug = (r) => lower(r?.market?.slug || r?.market || r?.seller?.market?.slug || r?.seller?.market || "");
// Friendly market display (for Top Sellers • By Market)
const getMarket = (r) =>
  safeStr(r?.market?.name) ||
  safeStr(r?.market) ||
  safeStr(r?.seller?.market?.name) ||
  safeStr(r?.seller?.market) ||
  "—";

const getOrderValue = (r) =>
  num(r?.total_actual_cost || (num(r?.sellers_price) + num(r?.shipping_charges) + num(r?.taxes)) || 0);
const getQty = (r) => (Array.isArray(r?.items) ? r.items.reduce((s, it) => s + num(it?.quantity_needed), 0) : 0);

const groupSum = (rows, keyFn, valFn) => {
  const m = new Map();
  rows.forEach((r) => {
    const k = keyFn(r) || "—";
    const v = num(valFn ? valFn(r) : 1);
    m.set(k, (m.get(k) || 0) + v);
  });
  return Array.from(m.entries())
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total);
};

/* -------------------------- Portal Tooltip (lists only) ------------------ */
const Tip = ({ text, anchorRef }) => {
  const tipRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });

  const compute = useCallback(() => {
    const el = anchorRef?.current;
    const tip = tipRef.current;
    if (!el || !tip) return;

    const P = 8;
    const r = el.getBoundingClientRect();

    const tipW = tip.offsetWidth || 260;
    const tipH = tip.offsetHeight || 40;

    let left = r.right + P;
    if (left + tipW + P > window.innerWidth) {
      left = r.left - tipW - P;
    }
    left = Math.max(P, Math.min(left, window.innerWidth - tipW - P));

    let top = r.top + r.height / 2 - tipH / 2;
    top = Math.max(P, Math.min(top, window.innerHeight - tipH - P));

    setPos({ top, left, ready: true });
  }, [anchorRef]);

  useLayoutEffect(() => {
    compute();
  }, [compute, text]);

  useEffect(() => {
    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [compute]);

  if (!pos.ready) {
    return createPortal(
      <div ref={tipRef} className="fixed max-w-[260px] opacity-0 pointer-events-none" style={{ top: 0, left: 0 }}>
        {text}
      </div>,
      document.body
    );
  }

  return createPortal(
    <div
      ref={tipRef}
      className="fixed z-[100000] max-w-[260px] rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 shadow-lg"
      style={{ top: pos.top, left: pos.left }}
      role="tooltip"
    >
      {text}
    </div>,
    document.body
  );
};

const TipAnchor = ({ text }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  return (
    <span
      ref={ref}
      className="relative inline-flex items-center ml-1 cursor-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      <Info className="h-3.5 w-3.5 text-slate-400" />
      {open ? <Tip text={text} anchorRef={ref} /> : null}
    </span>
  );
};

/* --------------------------------- UI ------------------------------------ */
const Section = ({ icon: Icon, title, children }) => {
  return (
    <section className="mt-5">
      <header className="mb-2 flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-slate-600" /> : null}
        <h3 className={theme.title}>{title}</h3>
      </header>
      {children}
    </section>
  );
};

// Card supports two variants:
// - 'palette'  : colored gradient (used ONLY in Listing Overview)
// - 'sourcer'  : Sourcer gradient card look (everywhere else)
const CardWrap = ({ variant = "sourcer", tone = "blue", children, className = "" }) => {
  if (variant === "sourcer") {
    return (
      <div className={[theme.cardBase, className].join(" ")} style={SOURCER_CARD_STYLE}>
        {children}
      </div>
    );
  }
  // 🎨 Listing Overview colored cards
  const bg = TONE_BG[tone] || "bg-gradient-to-br from-slate-50 to-slate-100 ring-1 ring-slate-200 shadow-xs";
  const topbar = TONE_TOPBAR[tone] || "bg-slate-300/80";
  return (
    <div className={["relative overflow-hidden rounded-xl transition-transform duration-200 ease-out transform-gpu will-change-transform hover:scale-[1.02]", bg, className].join(" ")}>
      <div className={`absolute inset-x-0 top-0 h-0.5 ${topbar}`} />
      {children}
    </div>
  );
};

const KPI = ({
  icon: Icon,
  label,
  value,
  tone = "blue",
  money = false,
  colorBySign = false,
  valueClassName = "",
  variant = "sourcer",
}) => {
  const display = money ? fmtMoneySigned(value) : value;
  const vClass = money && colorBySign ? (num(value) < 0 ? "text-red-600" : "text-emerald-600") : "";

  // Palette chip for Listing Overview only
  const toneChip =
    tone === "blue"
      ? "bg-sky-600 text-white"
      : tone === "green"
      ? "bg-emerald-600 text-white"
      : tone === "purple"
      ? "bg-indigo-600 text-white"
      : tone === "amber"
      ? "bg-amber-600 text-white"
      : "bg-slate-600 text-white";

  return (
    <CardWrap variant={variant} tone={tone} className="hover:shadow-md">
      <div className="p-3 h-full flex items-center gap-3">
        <span className={`${theme.chipWrap} ${variant === "palette" ? toneChip : "bg-slate-600 text-white"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div className={theme.label}>{label}</div>
          <div className={`${theme.value} ${vClass} whitespace-nowrap ${valueClassName}`} title={String(display ?? "")}>
            {display}
          </div>
        </div>
      </div>
    </CardWrap>
  );
};

const SimpleList = ({ items, valueTitle = "Total", headerTip, money = false, colorBySign = false, variant = "sourcer" }) => {
  return (
    <CardWrap variant={variant} className="hover:shadow-md">
      <div className="px-3 py-2 flex items-center rounded-t-xl bg-gradient-to-b from-white via-white to-slate-50 text-slate-800 text-[11px] font-semibold">
        <div className="flex-1">Name</div>
        <div className="w-24 text-right inline-flex items-center justify-end">
          <span>{valueTitle}</span>
          {headerTip ? <TipAnchor text={headerTip} /> : null}
        </div>
      </div>

      <div className="divide-y divide-transparent">
        {items.map((row) => {
          const raw = row.total;
          const display = money ? fmtMoneySigned(raw) : raw;
          const vClass = money && colorBySign ? (num(raw) < 0 ? "text-red-600" : "text-emerald-600") : "text-slate-900";
          return (
            <div key={row.key} className="px-3 py-2 flex items-center rounded-lg hover:bg-slate-50 transition-colors">
              <div className="flex-1 truncate text-[13px] text-slate-800">{row.key}</div>
              <div className={`w-24 text-right text-[13px] tabular-nums whitespace-nowrap ${vClass}`}>{display}</div>
            </div>
          );
        })}
        {items.length === 0 && <div className="px-2 py-6 text-center text-xs text-slate-500">No data</div>}
      </div>
    </CardWrap>
  );
};

/* ----------------------------- main ---------------------------------- */
export default function AdminOpsOverview({ isAdmin, data }) {
  const [loading, setLoading] = useState(false);
  const [fetchedRows, setFetchedRows] = useState([]);
  const [totalAll, setTotalAll] = useState(0);

  const shouldFetch = isAdmin && data == null;

  const loadAllSourcing = useCallback(async () => {
    try {
      setLoading(true);
      const { data: resp } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
        params: { page: 1, limit: 500, sort: "-createdAt" },
      });
      const rows = Array.isArray(resp?.results) ? resp.results : [];
      setFetchedRows(rows);
      setTotalAll(Number(resp?.total ?? rows.length));
    } catch (e) {
      console.error("loadAllSourcing failed", e?.response?.data || e);
      message.error("Failed to load overview data");
      setFetchedRows([]);
      setTotalAll(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shouldFetch) loadAllSourcing();
  }, [shouldFetch, loadAllSourcing]);

  const {
    counts,
    tracking,
    topSourcersBySavings,
    topSourcersByListings,
    topSourcersByOrderValue,
    topSourcersByQty,
    topPurchasersBySavings,
    topPurchasersByListings,
    topPurchasersByRespTime,
    topPurchasersByOrderValue,
    topSellersBySavings,
    topSellersByOrderValue,
    topSellersByUnits,
    topSellersByMarket, // ⬅️ new
  } = useMemo(() => {
    if (data && !Array.isArray(data) && typeof data === "object") {
      const x = (v) => (Array.isArray(v) ? v : []);
      const counts = data.counts || {
        totalListings: 0,
        purchased: 0,
        dropshipped: 0,
        disapproved: 0,
        sold: 0,
        onHold: 0,
        inAuction: 0,
        savings: 0,
      };
      return {
        counts,
        tracking: x(data.tracking),
        topSourcersBySavings: x(data.topSourcersBySavings),
        topSourcersByListings: x(data.topSourcersByListings),
        topSourcersByOrderValue: x(data.topSourcersByOrderValue),
        topSourcersByQty: x(data.topSourcersByQty),
        topPurchasersBySavings: x(data.topPurchasersBySavings),
        topPurchasersByListings: x(data.topPurchasersByListings),
        topPurchasersByRespTime: x(data.topPurchasersByRespTime),
        topPurchasersByOrderValue: x(data.topPurchasersByOrderValue),
        topSellersBySavings: x(data.topSellersBySavings),
        topSellersByOrderValue: x(data.topSellersByOrderValue),
        topSellersByUnits: x(data.topSellersByUnits),
        // If upstream provides it, map to our new field; else compute below
        topSellersByMarket: x(data.topSellersByMarket),
      };
    }

    const rows = Array.isArray(data) ? data : fetchedRows;
    const totalListings = totalAll || rows.length;

    const purchased = rows.filter((r) => lower(getStatus(r)) === "purchased").length;
    const dropshipped = rows.filter((r) => lower(getStatus(r)).includes("drop")).length;
    const disapproved = rows.filter((r) => /disapproved|rejected/i.test(getStatus(r))).length;
    const sold = rows.filter((r) => /sold|completed/i.test(getStatus(r))).length;
    const onHold = rows.filter((r) => /hold/i.test(getStatus(r))).length;
    const inAuction = rows.filter((r) => /auction/i.test(getStatus(r)) || /auction/i.test(getMarketSlug(r))).length;

    const savings = rows.reduce((acc, r) => acc + num(getSavings(r)), 0);

    const tMap = new Map([
      ["Pending", 0],
      ["In Transit", 0],
      ["Delivered", 0],
      ["Return Requested", 0],
      ["Returned", 0],
    ]);
    rows.forEach((r) => {
      const s = lower(getTracking(r));
      if (!s) return;
      if (s.includes("pending")) tMap.set("Pending", tMap.get("Pending") + 1);
      else if (s.includes("transit") || s.includes("shipped")) tMap.set("In Transit", tMap.get("In Transit") + 1);
      else if (s.includes("delivered")) tMap.set("Delivered", tMap.get("Delivered") + 1);
      else if (s.includes("return") && s.includes("request")) tMap.set("Return Requested", tMap.get("Return Requested") + 1);
      else if (s.includes("returned") || s.includes("refund")) tMap.set("Returned", tMap.get("Returned") + 1);
    });

    const byListings = (keyFn) => groupSum(rows, keyFn, () => 1).slice(0, 5);
    const byOrderValue = (keyFn) => groupSum(rows, keyFn, getOrderValue).slice(0, 5);
    const byQty = (keyFn) => groupSum(rows, keyFn, getQty).slice(0, 5);
    const bySavings = (keyFn) => groupSum(rows, keyFn, getSavings).slice(0, 5);

    const byRespTime = (keyFn) => {
      const mSum = new Map();
      const mCnt = new Map();
      rows.forEach((r) => {
        const k = keyFn(r) || "—";
        const ms = num(r?.purchaserResponseTime);
        if (!Number.isFinite(ms) || ms < 0) return;
        mSum.set(k, (mSum.get(k) || 0) + ms);
        mCnt.set(k, (mCnt.get(k) || 0) + 1);
      });
      return Array.from(mSum.entries())
        .map(([k, sum]) => ({ key: k, total: mCnt.get(k) ? Math.round(sum / mCnt.get(k)) : 0 }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    };

    return {
      counts: {
        totalListings,
        purchased,
        dropshipped,
        disapproved,
        sold,
        onHold,
        inAuction,
        savings: Number(savings.toFixed(2)),
      },
      tracking: Array.from(tMap.entries()).map(([key, total]) => ({ key, total })),
      topSourcersBySavings: bySavings(getSourcer),
      topSourcersByListings: byListings(getSourcer),
      topSourcersByOrderValue: byOrderValue(getSourcer),
      topSourcersByQty: byQty(getSourcer),
      topPurchasersBySavings: bySavings(getPurchaser),
      topPurchasersByListings: byListings(getPurchaser),
      topPurchasersByRespTime: byRespTime(getPurchaser),
      topPurchasersByOrderValue: byOrderValue(getPurchaser),
      topSellersBySavings: bySavings(getSeller),
      topSellersByOrderValue: byOrderValue(getSeller),
      topSellersByUnits: byQty(getSeller),
      // ⬇️ New: counts per market (top 5)
      topSellersByMarket: byListings(getMarket),
    };
  }, [data, fetchedRows, totalAll]);

  if (!isAdmin) return null;
  if (shouldFetch && loading) {
    return (
      <div className="flex justify-center py-16">
        <Spin />
      </div>
    );
  }

  const listingTones = ["blue", "green", "purple", "amber", "green", "amber", "purple"];

  return (
    <div className="mt-4 p-0 md:p-[1.25rem] rounded-[16px] sm:shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:border border-[#e6edff] bg-none md:bg-[linear-gradient(135deg,#f8fbff,#eef4ff)]">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-sky-600" />
          <h2 className="text-base font-semibold text-slate-900">Admin Operations Overview</h2>
        </div>
      </div>

      {/* LISTING OVERVIEW — colored gradient background added */}
      <Section icon={ClipboardList} title="Listing Overview">
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 items-stretch">
          <KPI icon={BarChart3} label="Total Listings" value={counts.totalListings ?? 0} tone={listingTones[0]} variant="palette" />
          <KPI icon={ShoppingCart} label="Purchased" value={counts.purchased ?? 0} tone={listingTones[1]} variant="palette" />
          <KPI icon={Sparkles} label="Dropshipped" value={counts.dropshipped ?? 0} tone={listingTones[2]} variant="palette" />
          <KPI icon={PackageX} label="Disapproved" value={counts.disapproved ?? 0} tone={listingTones[3]} variant="palette" />
          <KPI icon={PackageCheck} label="Sold" value={counts.sold ?? 0} tone={listingTones[4]} variant="palette" />
          <KPI icon={PauseCircle} label="On Hold" value={counts.onHold ?? 0} tone={listingTones[5]} variant="palette" />
          <KPI icon={Store} label="In Auction" value={counts.inAuction ?? 0} tone={listingTones[6]} variant="palette" />
        </div>
      </Section>

      {/* TRACKING OVERVIEW — Sourcer card style */}
      <Section icon={Truck} title="Tracking Overview">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 items-stretch">
          {Array.isArray(tracking) && tracking.length > 0 ? (
            tracking.map((t) => <KPI key={t.key} icon={Truck} label={t.key} value={t.total} variant="sourcer" />)
          ) : (
            <div className="col-span-full text-center text-xs text-slate-500 py-4">No tracking data</div>
          )}
        </div>
      </Section>

      {/* TOP SOURCERS — Sourcer card style */}
      <Section icon={Users} title="Top Sourcers">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
          <SimpleList
            items={topSourcersBySavings}
            valueTitle="By Savings"
            headerTip="Sum of savings per sourcer (purchase_efficiency if present; else Target Total − (Seller Price + Shipping + Taxes)). Top 5."
            money
            colorBySign
            variant="sourcer"
          />
          <SimpleList items={topSourcersByListings} valueTitle="By Listings" headerTip="Number of orders per sourcer. Top 5." variant="sourcer" />
          <SimpleList items={topSourcersByOrderValue} valueTitle="By Order Value" headerTip="Sum of Total Actual Cost per sourcer. Top 5." variant="sourcer" />
          <SimpleList items={topSourcersByQty} valueTitle="By Quantity" headerTip="Total units (Σ item.quantity_needed) per sourcer. Top 5." variant="sourcer" />
        </div>
      </Section>

      {/* TOP PURCHASERS — Sourcer card style */}
      <Section icon={Users} title="Top Purchasers">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
          <SimpleList
            items={topPurchasersBySavings}
            valueTitle="By Savings"
            headerTip="Sum of savings per purchaser. Top 5."
            money
            colorBySign
            variant="sourcer"
          />
          <SimpleList items={topPurchasersByListings} valueTitle="By Listings" headerTip="Number of orders per purchaser. Top 5." variant="sourcer" />
          <SimpleList items={topPurchasersByRespTime} valueTitle="By Response Time" headerTip="Average purchaserResponseTime (ms) per purchaser. Top 5." variant="sourcer" />
          <SimpleList items={topPurchasersByOrderValue} valueTitle="By Order Value" headerTip="Sum of Total Actual Cost per purchaser. Top 5." variant="sourcer" />
        </div>
      </Section>

      {/* TOP SELLERS — Sourcer card style */}
      <Section icon={Store} title="Top Sellers">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-stretch">
          <SimpleList
            items={topSellersBySavings}
            valueTitle="By Savings"
            headerTip="Sum of savings per seller. Top 5."
            money
            colorBySign
            variant="sourcer"
          />
          <SimpleList items={topSellersByOrderValue} valueTitle="By Order Value" headerTip="Sum of Total Actual Cost per seller. Top 5." variant="sourcer" />
          <SimpleList items={topSellersByUnits} valueTitle="By Units" headerTip="Total units (Σ item.quantity_needed) per seller. Top 5." variant="sourcer" />
          {/* ⬇️ Replaced 'By Efficiency' with 'By Market' */}
          <SimpleList
            items={topSellersByMarket}
            valueTitle="By Market"
            headerTip="Number of orders per market (derived from listing/seller market). Top 5."
            variant="sourcer"
          />
        </div>
      </Section>
    </div>
  );
}
