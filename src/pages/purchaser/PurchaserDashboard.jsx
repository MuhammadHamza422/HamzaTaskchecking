
// // // // /src/pages/purchaser/PurchaserDashboard.jsx
// // // import React, {
// // //   useMemo,
// // //   useState,
// // //   useEffect,
// // //   useCallback,
// // //   useRef,
// // // } from "react";
// // // import {
// // //   Row,
// // //   Col,
// // //   Space,
// // //   Typography,
// // //   Button,
// // //   Statistic,
// // //   Empty,
// // //   Skeleton,
// // //   Card,
// // //   Spin,
// // //   Select,
// // //   message,
// // // } from "antd";
// // // import { ReloadOutlined } from "@ant-design/icons";
// // // import { motion } from "framer-motion";
// // // import dayjs from "dayjs";
// // // import { useNavigate, useLocation } from "react-router-dom";
// // // import { useQuery, keepPreviousData } from "@tanstack/react-query";

// // // import PurchasedTop5Table from "./components/PurchasedTop5Table";
// // // import PurchaserFilters from "./components/PurchaserFilters";
// // // import {
// // //   labelFromMarket,
// // //   normalizeRequests,
// // //   statusColor,
// // // } from "./utils/PurchaseTableUtils";

// // // import { useAuth } from "../../contexts/AuthContext";
// // // import apiClient from "../../api/client";
// // // import AdminOpsOverview from "./components/AdminOpsOverview";
// // // import StatPanels from "./components/StatsPanel";
// // // import { useCan, usePermissions } from "../../hooks/usePermissions";

// // // const { Title, Text } = Typography;

// // // /* ---------- tiny helpers ---------- */
// // // const lower = (v) => String(v ?? "").trim().toLowerCase();
// // // const pickRows = (body) =>
// // //   Array.isArray(body)
// // //     ? body
// // //     : body?.docs || body?.data || body?.results || body?.items || [];

// // // const toDate = (v) => {
// // //   const d = v ? new Date(v) : null;
// // //   return d && !isNaN(d.getTime()) ? d : null;
// // // };
// // // const formatDuration = (ms) => {
// // //   if (!Number.isFinite(ms) || ms < 0) return "—";
// // //   const s = Math.floor(ms / 1000);
// // //   const d = Math.floor(s / 86400);
// // //   const h = Math.floor((s % 86400) / 3600);
// // //   const m = Math.floor((s % 3600) / 60);
// // //   if (d > 0) return `${d}d ${h}h ${m}m`;
// // //   if (h > 0) return `${h}h ${m}m`;
// // //   return `${m}m`;
// // // };

// // // // NEW: helpers for money formatting and numeric coercion
// // // const num = (v) => (Number.isFinite(+v) ? +v : 0);
// // // const fmtMoneySigned = (n) => {
// // //   const v = num(n);
// // //   const s = Math.abs(v).toLocaleString(undefined, {
// // //     minimumFractionDigits: 2,
// // //     maximumFractionDigits: 2,
// // //   });
// // //   return `${v < 0 ? "\u2212\u00A0" : ""}$${s}`;
// // // };

// // // /* ------------------- purchaser search control for admins ------------------- */
// // // function usePurchaserSearch() {
// // //   const [options, setOptions] = useState([]);
// // //   const [loading, setLoading] = useState(false);
// // //   const t = useRef(null);

// // //   const mapUser = (u) => ({
// // //     value: String(u.value),
// // //     label: (
// // //       <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
// // //         <span style={{ fontWeight: 600 }}>
// // //           {u.label || u.email || "Unnamed"}
// // //         </span>
// // //         {u.email ? <span style={{ color: "#999" }}>· {u.email}</span> : null}
// // //       </div>
// // //     ),
// // //     raw: u,
// // //   });

// // //   const fetchUsers = async (q = "", page = 1, limit = 20) => {
// // //     setLoading(true);
// // //     try {
// // //       const res = await apiClient.get("/api/v1/sourcing/purchasers/search", {
// // //         params: { q, page, limit },
// // //       });
// // //       const list = res.data?.results || [];
// // //       setOptions(list.map(mapUser));
// // //     } catch (e) {
// // //       const status = e?.response?.status;
// // //       if (status === 403) message.warning("Only admins can search purchasers.");
// // //       else message.error(e?.response?.data?.message || "Failed to search purchasers.");
// // //       setOptions([]);
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   };

// // //   const debouncedSearch = (q) => {
// // //     clearTimeout(t.current);
// // //     t.current = setTimeout(() => fetchUsers(q), 300);
// // //   };

// // //   const fetchInitial = () => !options.length && fetchUsers("");

// // //   return { options, loading, debouncedSearch, fetchInitial };
// // // }

// // // /* ========================================================================== */
// // // export default function PurchaserDashboard() {
// // //   const navigate = useNavigate();
// // //   const { pathname } = useLocation();
// // //   const base = pathname.startsWith("/purchasing") ? "/purchasing" : "/purchaser";

// // //   const { user: authUser } = useAuth();
// // //   const roleName = lower(authUser?.roles?.role || authUser?.role || "");
// // //   const isAdmin = useMemo(() => {
// // //     const r = authUser?.roles;
// // //     if (Array.isArray(r)) {
// // //       return r
// // //         .map((x) =>
// // //           typeof x === "string"
// // //             ? x.toLowerCase()
// // //             : String(x?.role || "").toLowerCase()
// // //         )
// // //         .includes("admin");
// // //     }
// // //     return String(r?.role || r || "").toLowerCase() === "admin";
// // //   }, [authUser]);

// // //   /* ---------- permissions via hook (no manual /role/all) ---------- */
// // //   const { isLoading: permsLoading } = usePermissions();
// // //   const canSeeAssignedMine = useCan("purchaser", "assigned to me");
// // //   const canSeeAllAssigned = useCan("purchaser", "all assigned");

// // //   /* -------------------------- filters & scope -------------------------- */
// // //   const [statusFilter, setStatusFilter] = useState("");
// // //   const [searchTerm, setSearchTerm] = useState("");
// // //   // default to current month
// // //   const [dateRange, setDateRange] = useState(() => [
// // //     dayjs().startOf("month"),
// // //     dayjs().endOf("month"),
// // //   ]);
// // //   const [selectedPurchaser, setSelectedPurchaser] = useState(null);

// // //   const {
// // //     options: purchaserOptions,
// // //     loading: purchaserLoading,
// // //     debouncedSearch: purchaserSearch,
// // //     fetchInitial: fetchInitialPurchasers,
// // //   } = usePurchaserSearch();

// // //   /* ------------------------ server query params ------------------------ */
// // //   const serverParams = useMemo(() => {
// // //     if (permsLoading || canSeeAssignedMine === null || canSeeAllAssigned === null) {
// // //       return null;
// // //     }

// // //     const params = {};
// // //     if (isAdmin) {
// // //       if (!canSeeAllAssigned) return null;
// // //       if (selectedPurchaser?.value) params.purchaser_id = selectedPurchaser.value;
// // //     } else {
// // //       if (!canSeeAssignedMine) return null;
// // //       params.mine = true;
// // //     }

// // //     if (statusFilter) params.status = statusFilter;

// // //     if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
// // //       params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
// // //       params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
// // //     }

// // //     if (searchTerm?.trim()) params.q = searchTerm.trim();
// // //     return params;
// // //   }, [
// // //     permsLoading,
// // //     canSeeAssignedMine,
// // //     canSeeAllAssigned,
// // //     isAdmin,
// // //     selectedPurchaser,
// // //     statusFilter,
// // //     dateRange,
// // //     searchTerm,
// // //   ]);

// // //   /* --------------------------- fetch with v5 --------------------------- */
// // //   const {
// // //     data: rowsData,
// // //     isLoading: listLoading,
// // //     isFetching: listFetching,
// // //     refetch,
// // //   } = useQuery({
// // //     queryKey: ["purchaserDashboard", serverParams],
// // //     queryFn: async () => {
// // //       const LIMIT = 500; // plenty for dashboard metrics
// // //       const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
// // //         params: { ...serverParams, page: 1, limit: LIMIT, sort: "-createdAt" },
// // //       });
// // //       // enrich: average response time needs assignedAt + purchaserActionTime fallback
// // //       const normalized = normalizeRequests(pickRows(data));
// // //       return normalized.map((r) => {
// // //         const rtMs = Number(r?.purchaserResponseTime);
// // //         if (!Number.isFinite(rtMs) || rtMs < 0) return r;
// // //         const assignedBase =
// // //           toDate(r?.assignedAt) ||
// // //           toDate(r?.assigned_at) ||
// // //           toDate(r?.createdAt) ||
// // //           toDate(r?.created_at) ||
// // //           new Date(Date.now() - rtMs);
// // //         const purchaserActionDate = new Date(assignedBase.getTime() + rtMs);
// // //         return {
// // //           ...r,
// // //           assignedAt: assignedBase.toISOString(),
// // //           purchaserActionTime: purchaserActionDate.toISOString(),
// // //         };
// // //       });
// // //     },
// // //     enabled: !!serverParams,
// // //     placeholderData: keepPreviousData,
// // //     refetchOnWindowFocus: true,
// // //   });

// // //   const loading = permsLoading || listLoading;
// // //   const isRefreshing = listFetching && !listLoading;
// // //   const rows = rowsData || [];

// // //   const onRefresh = useCallback(async () => {
// // //     await refetch();
// // //   }, [refetch]);

// // //   const clearAll = () => {
// // //     setStatusFilter("");
// // //     setSearchTerm("");
// // //     setDateRange([dayjs().startOf("month"), dayjs().endOf("month")]);
// // //     setSelectedPurchaser(null);
// // //     refetch();
// // //   };

// // //   /* ------------------------------ metrics ------------------------------ */
// // //   const {
// // //     count,
// // //     byStatus,
// // //     byMarket,
// // //     bySellerAllCount,
// // //     bySellerTop5,
// // //     purchasedCount,
// // //     avgResponseMs,
// // //     responseCount,
// // //     totalSavings, // NEW
// // //   } = useMemo(() => {
// // //     const agg = {
// // //       count: rows.length,
// // //       byStatus: new Map(),
// // //       byMarket: new Map(),
// // //       bySeller: new Map(),
// // //       purchasedCount: 0,
// // //       responseSumMs: 0,
// // //       responseCount: 0,
// // //       savings: 0, // NEW
// // //     };

// // //     for (const d of rows) {
// // //       const s = String(d?.status ?? "Pending");
// // //       agg.byStatus.set(s, (agg.byStatus.get(s) || 0) + 1);

// // //       const mkt = labelFromMarket(d?.market ?? d?.sellerMarket);
// // //       agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

// // //       const sellerName = d?.seller_name ?? d?.sellerName ?? "—";
// // //       agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

// // //       if (s === "Purchased") agg.purchasedCount += 1;

// // //       // NEW: accumulate savings per row
// // //       const direct = d?.purchase_efficiency;
// // //       const target = num(d?.target_total_cost);
// // //       const actual =
// // //         num(d?.total_actual_cost) ||
// // //         (num(d?.sellers_price) + num(d?.shipping_charges) + num(d?.taxes));
// // //       const savings = Number.isFinite(+direct) ? +direct : target - actual;
// // //       if (Number.isFinite(savings)) agg.savings += savings;

// // //       const assignedAt = toDate(d?.assignedAt);
// // //       const actionAt =
// // //         toDate(d?.purchaserActionTime) || toDate(d?.purchaserResponseTime);
// // //       if (assignedAt && actionAt) {
// // //         const delta = actionAt.getTime() - assignedAt.getTime();
// // //         if (Number.isFinite(delta) && delta >= 0) {
// // //           agg.responseSumMs += delta;
// // //           agg.responseCount += 1;
// // //         }
// // //       }
// // //     }

// // //     const sortDesc = (arr) => arr.sort((a, b) => b[1] - a[1]);
// // //     const byMarketArr = sortDesc(Array.from(agg.byMarket.entries())).slice(0, 6);
// // //     const bySellerArr = sortDesc(Array.from(agg.bySeller.entries()));
// // //     const bySellerTop5 = bySellerArr.slice(0, 5);

// // //     return {
// // //       count: agg.count,
// // //       byStatus: Array.from(agg.byStatus.entries()).sort((a, b) => b[1] - a[1]),
// // //       byMarket: byMarketArr,
// // //       bySellerAllCount: bySellerArr.length,
// // //       bySellerTop5,
// // //       purchasedCount: agg.purchasedCount,
// // //       avgResponseMs: agg.responseCount
// // //         ? Math.round(agg.responseSumMs / agg.responseCount)
// // //         : null,
// // //       responseCount: agg.responseCount,
// // //       totalSavings: Number(agg.savings.toFixed(2)), // NEW
// // //     };
// // //   }, [rows]);

// // //   /* ------------------------------ gating ------------------------------ */
// // //   if (permsLoading || canSeeAssignedMine === null || canSeeAllAssigned === null) {
// // //     return (
// // //       <div style={{ display: "grid", placeItems: "center", height: 240 }}>
// // //         <Spin />
// // //       </div>
// // //     );
// // //   }

// // //   if (isAdmin && !canSeeAllAssigned) {
// // //     return (
// // //       <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
// // //         <Empty
// // //           description={
// // //             <div className="text-center">
// // //               <div className="font-semibold">No permission to view “All Assigned”</div>
// // //               <div className="text-gray-500">
// // //                 Ask an admin to enable Purchaser → “all assigned”.
// // //               </div>
// // //             </div>
// // //           }
// // //         />
// // //       </Card>
// // //     );
// // //   }

// // //   if (!isAdmin && !canSeeAssignedMine) {
// // //     return (
// // //       <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
// // //         <Empty
// // //           description={
// // //             <div className="text-center">
// // //               <div className="font-semibold">No permission to view “Assigned to Me”</div>
// // //               <div className="text-gray-500">
// // //                 Ask an admin to enable Purchaser → “assigned to me”.
// // //               </div>
// // //             </div>
// // //           }
// // //         />
// // //       </Card>
// // //     );
// // //   }

// // //   const showAdminScopeControl = isAdmin && canSeeAllAssigned;
// // //   const AdminScopeControl = showAdminScopeControl ? (
// // //     <Select
// // //       allowClear
// // //       showSearch
// // //       placeholder="View purchaser…"
// // //       style={{ minWidth: 260 }}
// // //       options={purchaserOptions}
// // //       loading={purchaserLoading}
// // //       value={selectedPurchaser?.value}
// // //       onSearch={purchaserSearch}
// // //       onDropdownVisibleChange={(open) => open && fetchInitialPurchasers()}
// // //       onChange={(_, option) => setSelectedPurchaser(option || null)}
// // //       filterOption={false}
// // //       size="large"
// // //     />
// // //   ) : null;

// // //   /* ------------------------------ render ------------------------------ */
// // //   return (
// // //     <motion.div
// // //       initial={{ scale: 0.99, opacity: 0 }}
// // //       animate={{ scale: 1, opacity: 1 }}
// // //       transition={{ duration: 0.25 }}
// // //       className="rounded-xl p-4 bg-white border border-slate-200 shadow-sm"
// // //     >
// // //       {/* Header */}
// // //       <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
// // //         <Col>
// // //           <Title level={4} style={{ margin: 0 }}>
// // //             Purchaser Dashboard
// // //           </Title>
// // //           <Text type="secondary">
// // //             {loading
// // //               ? "Loading…"
// // //               : `Showing ${count} records${
// // //                   responseCount ? ` · ${responseCount} with response time` : ""
// // //                 }${isRefreshing ? " · refreshing…" : ""}`}
// // //           </Text>

// // //           {showAdminScopeControl && selectedPurchaser ? (
// // //             <div style={{ marginTop: 6 }}>
// // //               <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 text-slate-700 px-2 py-1 text-xs border border-slate-200">
// // //                 {selectedPurchaser?.label}
// // //                 <button
// // //                   onClick={() => setSelectedPurchaser(null)}
// // //                   className="ml-1 rounded-sm px-1 hover:bg-slate-100"
// // //                   aria-label="Clear purchaser scope"
// // //                 >
// // //                   ✕
// // //                 </button>
// // //               </span>
// // //             </div>
// // //           ) : null}
// // //         </Col>

// // //         <Col>
// // //           <Space wrap>
// // //             {AdminScopeControl}
// // //             <Button icon={<ReloadOutlined />} onClick={onRefresh} disabled={loading}>
// // //               Refresh
// // //             </Button>
// // //           </Space>
// // //         </Col>
// // //       </Row>

// // //       {/* Filters */}
// // //       <PurchaserFilters
// // //         screens={{}}
// // //         statusFilter={statusFilter}
// // //         setStatusFilter={setStatusFilter}
// // //         searchTerm={searchTerm}
// // //         setSearchTerm={setSearchTerm}
// // //         dateRange={dateRange}
// // //         setDateRange={setDateRange}
// // //         AdminScopeControl={null}
// // //         onClear={clearAll}
// // //         showStatusNote="Filters apply to dashboard metrics and quick view"
// // //       />

// // //       {/* KPIs */}
// // //       <Row gutter={[12, 12]} align="stretch">
// // //         {[
// // //           { title: "Total Listings", value: count },
// // //           { title: "Purchased", value: purchasedCount },
// // //           { title: "Savings", value: fmtMoneySigned(totalSavings) }, // NEW
// // //           {
// // //             title: "Average Response Time",
// // //             value: avgResponseMs === null ? "—" : formatDuration(avgResponseMs),
// // //           },
// // //         ].map((kpi, i) => {
// // //           // Neutral look for all KPI tiles (no solid bg colors)
// // //           const tone = {
// // //             grad: "from-white via-white to-slate-50",
// // //             ring: "ring-slate-200",
// // //             accent: "bg-slate-300/70",
// // //           };

// // //           return (
// // //             <Col xs={12} md={6} key={i} className="flex">
// // //               <div
// // //                 className={[
// // //                   "relative flex-1 overflow-hidden rounded-xl p-4",
// // //                   "bg-gradient-to-b",
// // //                   tone.grad,
// // //                   tone.ring,
// // //                   "ring-1 shadow-sm",
// // //                   "transition-all duration-150 hover:shadow-md hover:scale-[1.01]",
// // //                 ].join(" ")}
// // //               >
// // //                 {/* accents */}
// // //                 <div className={`absolute inset-x-0 top-0 h-0.5 ${tone.accent}`} />
// // //                 <div className={`absolute inset-x-0 bottom-0 h-[0.5px] ${tone.accent}`} />

// // //                 {loading ? (
// // //                   <Skeleton active paragraph={false} />
// // //                 ) : (
// // //                   <Statistic
// // //                     title={<span className="text-sm font-medium text-slate-700">{kpi.title}</span>}
// // //                     value={kpi.value}
// // //                     valueStyle={{
// // //                       fontWeight: 700,
// // //                       color: "#0f172a",
// // //                       fontSize: "1.25rem",
// // //                     }}
// // //                   />
// // //                 )}
// // //               </div>
// // //             </Col>
// // //           );
// // //         })}
// // //       </Row>

// // //       {/* Breakdowns */}
// // //       <StatPanels
// // //         loading={loading}
// // //         byStatus={byStatus}
// // //         byMarket={byMarket}
// // //         bySellerTop5={bySellerTop5}
// // //         bySellerAllCount={bySellerAllCount}
// // //         statusColor={statusColor}
// // //       />

// // //       {isAdmin && <AdminOpsOverview isAdmin={isAdmin} data={rows} loading={loading} />}

// // //       {/* Latest Purchased (quick view only) */}
// // //       <div className="mt-4 rounded-lg p-3 bg-gradient-to-b from-white via-white to-slate-50 ring-1 ring-slate-200">
// // //         <PurchasedTop5Table
// // //           data={rows}
// // //           loading={loading}
// // //           title="Latest 5 Purchased Orders"
// // //           currency="USD"
// // //           requirePurchased={false}
// // //           onOpen={(rec) => {
// // //             const id = rec?._id || rec?.id || rec?.sourcing_id || "";
// // //             if (!id) return;
// // //             navigate(`/requests/${String(id)}`);
// // //           }}
// // //         />
// // //       </div>

// // //       <style>{`
// // //         .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
// // //         .ant-statistic-title { color: #64748b; }
// // //       `}</style>
// // //     </motion.div>
// // //   );
// // // }





// // // /src/pages/purchaser/PurchaserDashboard.jsx
// // import React, {
// //   useMemo,
// //   useState,
// //   useEffect,
// //   useCallback,
// //   useRef,
// // } from "react";
// // import {
// //   Row,
// //   Col,
// //   Space,
// //   Typography,
// //   Button,
// //   Statistic,
// //   Empty,
// //   Skeleton,
// //   Card,
// //   Spin,
// //   Select,
// //   message,
// // } from "antd";
// // import { ReloadOutlined } from "@ant-design/icons";
// // import { motion } from "framer-motion";
// // import dayjs from "dayjs";
// // import { useNavigate, useLocation } from "react-router-dom";
// // import { useQuery, keepPreviousData } from "@tanstack/react-query";

// // import PurchasedTop5Table from "./components/PurchasedTop5Table";
// // import PurchaserFilters from "./components/PurchaserFilters";
// // import {
// //   labelFromMarket,
// //   normalizeRequests,
// //   statusColor,
// // } from "./utils/PurchaseTableUtils";

// // import { useAuth } from "../../contexts/AuthContext";
// // import apiClient from "../../api/client";
// // import AdminOpsOverview from "./components/AdminOpsOverview";
// // import StatPanels from "./components/StatsPanel";
// // import { useCan, usePermissions } from "../../hooks/usePermissions";

// // const { Title, Text } = Typography;

// // /* ---------- tiny helpers ---------- */
// // const lower = (v) => String(v ?? "").trim().toLowerCase();
// // const pickRows = (body) =>
// //   Array.isArray(body)
// //     ? body
// //     : body?.docs || body?.data || body?.results || body?.items || [];

// // const toDate = (v) => {
// //   const d = v ? new Date(v) : null;
// //   return d && !isNaN(d.getTime()) ? d : null;
// // };
// // const formatDuration = (ms) => {
// //   if (!Number.isFinite(ms) || ms < 0) return "—";
// //   const s = Math.floor(ms / 1000);
// //   const d = Math.floor(s / 86400);
// //   const h = Math.floor((s % 86400) / 3600);
// //   const m = Math.floor((s % 3600) / 60);
// //   if (d > 0) return `${d}d ${h}h ${m}m`;
// //   if (h > 0) return `${h}h ${m}m`;
// //   return `${m}m`;
// // };

// // // NEW: helpers for money formatting and numeric coercion
// // const num = (v) => (Number.isFinite(+v) ? +v : 0);
// // const fmtMoneySigned = (n) => {
// //   const v = num(n);
// //   const s = Math.abs(v).toLocaleString(undefined, {
// //     minimumFractionDigits: 2,
// //     maximumFractionDigits: 2,
// //   });
// //   return `${v < 0 ? "\u2212\u00A0" : ""}$${s}`;
// // };

// // /* ------------------- purchaser search control for admins ------------------- */
// // function usePurchaserSearch() {
// //   const [options, setOptions] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const t = useRef(null);

// //   const mapUser = (u) => ({
// //     value: String(u.value),
// //     label: (
// //       <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
// //         <span style={{ fontWeight: 600 }}>
// //           {u.label || u.email || "Unnamed"}
// //         </span>
// //         {u.email ? <span style={{ color: "#999" }}>· {u.email}</span> : null}
// //       </div>
// //     ),
// //     raw: u,
// //   });

// //   const fetchUsers = async (q = "", page = 1, limit = 20) => {
// //     setLoading(true);
// //     try {
// //       const res = await apiClient.get("/api/v1/sourcing/purchasers/search", {
// //         params: { q, page, limit },
// //       });
// //       const list = res.data?.results || [];
// //       setOptions(list.map(mapUser));
// //     } catch (e) {
// //       const status = e?.response?.status;
// //       if (status === 403) message.warning("Only admins can search purchasers.");
// //       else message.error(e?.response?.data?.message || "Failed to search purchasers.");
// //       setOptions([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const debouncedSearch = (q) => {
// //     clearTimeout(t.current);
// //     t.current = setTimeout(() => fetchUsers(q), 300);
// //   };

// //   const fetchInitial = () => !options.length && fetchUsers("");

// //   return { options, loading, debouncedSearch, fetchInitial };
// // }

// // /* ========================================================================== */
// // export default function PurchaserDashboard() {
// //   const navigate = useNavigate();
// //   const { pathname } = useLocation();
// //   const base = pathname.startsWith("/purchasing") ? "/purchasing" : "/purchaser";

// //   const { user: authUser } = useAuth();
// //   const roleName = lower(authUser?.roles?.role || authUser?.role || "");
// //   const isAdmin = useMemo(() => {
// //     const r = authUser?.roles;
// //     if (Array.isArray(r)) {
// //       return r
// //         .map((x) =>
// //           typeof x === "string"
// //             ? x.toLowerCase()
// //             : String(x?.role || "").toLowerCase()
// //         )
// //         .includes("admin");
// //     }
// //     return String(r?.role || r || "").toLowerCase() === "admin";
// //   }, [authUser]);

// //   /* ---------- permissions via hook (no manual /role/all) ---------- */
// //   const { isLoading: permsLoading } = usePermissions();
// //   const canSeeAssignedMine = useCan("purchaser", "assigned to me");
// //   const canSeeAllAssigned = useCan("purchaser", "all assigned");

// //   /* -------------------------- filters & scope -------------------------- */
// //   const [statusFilter, setStatusFilter] = useState("");
// //   const [searchTerm, setSearchTerm] = useState("");
// //   // default to current month
// //   const [dateRange, setDateRange] = useState(() => [
// //     dayjs().startOf("month"),
// //     dayjs().endOf("month"),
// //   ]);
// //   const [selectedPurchaser, setSelectedPurchaser] = useState(null);

// //   const {
// //     options: purchaserOptions,
// //     loading: purchaserLoading,
// //     debouncedSearch: purchaserSearch,
// //     fetchInitial: fetchInitialPurchasers,
// //   } = usePurchaserSearch();

// //   /* ------------------------ server query params ------------------------ */
// //   const serverParams = useMemo(() => {
// //     if (permsLoading || canSeeAssignedMine === null || canSeeAllAssigned === null) {
// //       return null;
// //     }

// //     const params = {};
// //     if (isAdmin) {
// //       if (!canSeeAllAssigned) return null;
// //       if (selectedPurchaser?.value) params.purchaser_id = selectedPurchaser.value;
// //     } else {
// //       if (!canSeeAssignedMine) return null;
// //       params.mine = true;
// //     }

// //     if (statusFilter) params.status = statusFilter;

// //     if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
// //       params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
// //       params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
// //     }

// //     if (searchTerm?.trim()) params.q = searchTerm.trim();
// //     return params;
// //   }, [
// //     permsLoading,
// //     canSeeAssignedMine,
// //     canSeeAllAssigned,
// //     isAdmin,
// //     selectedPurchaser,
// //     statusFilter,
// //     dateRange,
// //     searchTerm,
// //   ]);

// //   /* --------------------------- fetch with v5 --------------------------- */
// //   const {
// //     data: rowsPayload,
// //     isLoading: listLoading,
// //     isFetching: listFetching,
// //     refetch,
// //   } = useQuery({
// //     queryKey: ["purchaserDashboard", serverParams],
// //     queryFn: async () => {
// //       const LIMIT = 500; // plenty for dashboard metrics
// //       const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
// //         params: { ...serverParams, page: 1, limit: LIMIT, sort: "-createdAt" },
// //       });
// //       const normalized = normalizeRequests(pickRows(data));
// //       const rows = normalized.map((r) => {
// //         const rtMs = Number(r?.purchaserResponseTime);
// //         if (!Number.isFinite(rtMs) || rtMs < 0) return r;
// //         const assignedBase =
// //           toDate(r?.assignedAt) ||
// //           toDate(r?.assigned_at) ||
// //           toDate(r?.createdAt) ||
// //           toDate(r?.created_at) ||
// //           new Date(Date.now() - rtMs);
// //         const purchaserActionDate = new Date(assignedBase.getTime() + rtMs);
// //         return {
// //           ...r,
// //           assignedAt: assignedBase.toISOString(),
// //           purchaserActionTime: purchaserActionDate.toISOString(),
// //         };
// //       });
// //       // ✅ return both rows and the server-wide total for the current filters
// //       return {
// //         rows,
// //         total: Number(data?.total ?? rows.length),
// //       };
// //     },
// //     enabled: !!serverParams,
// //     placeholderData: keepPreviousData,
// //     refetchOnWindowFocus: true,
// //   });

// //   const loading = permsLoading || listLoading;
// //   const isRefreshing = listFetching && !listLoading;

// //   // ✅ use server total for "Total Listings" KPI; keep rows for all breakdowns
// //   const rows = rowsPayload?.rows || [];
// //   const totalCount = rowsPayload?.total ?? rows.length;

// //   const onRefresh = useCallback(async () => {
// //     await refetch();
// //   }, [refetch]);

// //   const clearAll = () => {
// //     setStatusFilter("");
// //     setSearchTerm("");
// //     setDateRange([dayjs().startOf("month"), dayjs().endOf("month")]);
// //     setSelectedPurchaser(null);
// //     refetch();
// //   };

// //   /* ------------------------------ metrics ------------------------------ */
// //   const {
// //     count,
// //     byStatus,
// //     byMarket,
// //     bySellerAllCount,
// //     bySellerTop5,
// //     purchasedCount,
// //     avgResponseMs,
// //     responseCount,
// //     totalSavings, // NEW
// //   } = useMemo(() => {
// //     const agg = {
// //       count: rows.length,
// //       byStatus: new Map(),
// //       byMarket: new Map(),
// //       bySeller: new Map(),
// //       purchasedCount: 0,
// //       responseSumMs: 0,
// //       responseCount: 0,
// //       savings: 0, // NEW
// //     };

// //     for (const d of rows) {
// //       const s = String(d?.status ?? "Pending");
// //       agg.byStatus.set(s, (agg.byStatus.get(s) || 0) + 1);

// //       const mkt = labelFromMarket(d?.market ?? d?.sellerMarket);
// //       agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

// //       const sellerName = d?.seller_name ?? d?.sellerName ?? "—";
// //       agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

// //       if (s === "Purchased") agg.purchasedCount += 1;

// //       // NEW: accumulate savings per row
// //       const direct = d?.purchase_efficiency;
// //       const target = num(d?.target_total_cost);
// //       const actual =
// //         num(d?.total_actual_cost) ||
// //         (num(d?.sellers_price) + num(d?.shipping_charges) + num(d?.taxes));
// //       const savings = Number.isFinite(+direct) ? +direct : target - actual;
// //       if (Number.isFinite(savings)) agg.savings += savings;

// //       const assignedAt = toDate(d?.assignedAt);
// //       const actionAt =
// //         toDate(d?.purchaserActionTime) || toDate(d?.purchaserResponseTime);
// //       if (assignedAt && actionAt) {
// //         const delta = actionAt.getTime() - assignedAt.getTime();
// //         if (Number.isFinite(delta) && delta >= 0) {
// //           agg.responseSumMs += delta;
// //           agg.responseCount += 1;
// //         }
// //       }
// //     }

// //     const sortDesc = (arr) => arr.sort((a, b) => b[1] - a[1]);
// //     const byMarketArr = sortDesc(Array.from(agg.byMarket.entries())).slice(0, 6);
// //     const bySellerArr = sortDesc(Array.from(agg.bySeller.entries()));
// //     const bySellerTop5 = bySellerArr.slice(0, 5);

// //     return {
// //       count: agg.count,
// //       byStatus: Array.from(agg.byStatus.entries()).sort((a, b) => b[1] - a[1]),
// //       byMarket: byMarketArr,
// //       bySellerAllCount: bySellerArr.length,
// //       bySellerTop5,
// //       purchasedCount: agg.purchasedCount,
// //       avgResponseMs: agg.responseCount
// //         ? Math.round(agg.responseSumMs / agg.responseCount)
// //         : null,
// //       responseCount: agg.responseCount,
// //       totalSavings: Number(agg.savings.toFixed(2)), // NEW
// //     };
// //   }, [rows]);

// //   /* ------------------------------ gating ------------------------------ */
// //   if (permsLoading || canSeeAssignedMine === null || canSeeAllAssigned === null) {
// //     return (
// //       <div style={{ display: "grid", placeItems: "center", height: 240 }}>
// //         <Spin />
// //       </div>
// //     );
// //   }

// //   if (isAdmin && !canSeeAllAssigned) {
// //     return (
// //       <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
// //         <Empty
// //           description={
// //             <div className="text-center">
// //               <div className="font-semibold">No permission to view “All Assigned”</div>
// //               <div className="text-gray-500">
// //                 Ask an admin to enable Purchaser → “all assigned”.
// //               </div>
// //             </div>
// //           }
// //         />
// //       </Card>
// //     );
// //   }

// //   if (!isAdmin && !canSeeAssignedMine) {
// //     return (
// //       <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
// //         <Empty
// //           description={
// //             <div className="text-center">
// //               <div className="font-semibold">No permission to view “Assigned to Me”</div>
// //               <div className="text-gray-500">
// //                 Ask an admin to enable Purchaser → “assigned to me”.
// //               </div>
// //             </div>
// //           }
// //         />
// //       </Card>
// //     );
// //   }

// //   const showAdminScopeControl = isAdmin && canSeeAllAssigned;
// //   const AdminScopeControl = showAdminScopeControl ? (
// //     <Select
// //       allowClear
// //       showSearch
// //       placeholder="View purchaser…"
// //       style={{ minWidth: 260 }}
// //       options={purchaserOptions}
// //       loading={purchaserLoading}
// //       value={selectedPurchaser?.value}
// //       onSearch={purchaserSearch}
// //       onDropdownVisibleChange={(open) => open && fetchInitialPurchasers()}
// //       onChange={(_, option) => setSelectedPurchaser(option || null)}
// //       filterOption={false}
// //       size="large"
// //     />
// //   ) : null;

// //   /* ------------------------------ render ------------------------------ */
// //   return (
// //     <motion.div
// //       initial={{ scale: 0.99, opacity: 0 }}
// //       animate={{ scale: 1, opacity: 1 }}
// //       transition={{ duration: 0.25 }}
// //       className="rounded-xl p-4 bg-white border border-slate-200 shadow-sm"
// //     >
// //       {/* Header */}
// //       <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
// //         <Col>
// //           <Title level={4} style={{ margin: 0 }}>
// //             Purchaser Dashboard
// //           </Title>
// //           <Text type="secondary">
// //             {loading
// //               ? "Loading…"
// //               : `Showing ${count} records${
// //                   responseCount ? ` · ${responseCount} with response time` : ""
// //                 }${isRefreshing ? " · refreshing…" : ""}`}
// //           </Text>

// //           {showAdminScopeControl && selectedPurchaser ? (
// //             <div style={{ marginTop: 6 }}>
// //               <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 text-slate-700 px-2 py-1 text-xs border border-slate-200">
// //                 {selectedPurchaser?.label}
// //                 <button
// //                   onClick={() => setSelectedPurchaser(null)}
// //                   className="ml-1 rounded-sm px-1 hover:bg-slate-100"
// //                   aria-label="Clear purchaser scope"
// //                 >
// //                   ✕
// //                 </button>
// //               </span>
// //             </div>
// //           ) : null}
// //         </Col>

// //         <Col>
// //           <Space wrap>
// //             {AdminScopeControl}
// //             <Button icon={<ReloadOutlined />} onClick={onRefresh} disabled={loading}>
// //               Refresh
// //             </Button>
// //           </Space>
// //         </Col>
// //       </Row>

// //       {/* Filters */}
// //       <PurchaserFilters
// //         screens={{}}
// //         statusFilter={statusFilter}
// //         setStatusFilter={setStatusFilter}
// //         searchTerm={searchTerm}
// //         setSearchTerm={setSearchTerm}
// //         dateRange={dateRange}
// //         setDateRange={setDateRange}
// //         AdminScopeControl={null}
// //         onClear={clearAll}
// //         showStatusNote="Filters apply to dashboard metrics and quick view"
// //       />

// //       {/* KPIs */}
// //       <Row gutter={[12, 12]} align="stretch">
// //         {[
// //           // ✅ use server-wide total (with current filters) for "Total Listings"
// //           { title: "Total Listings", value: totalCount },
// //           { title: "Purchased", value: purchasedCount },
// //           { title: "Savings", value: fmtMoneySigned(totalSavings) }, // NEW
// //           {
// //             title: "Average Response Time",
// //             value: avgResponseMs === null ? "—" : formatDuration(avgResponseMs),
// //           },
// //         ].map((kpi, i) => {
// //           // Neutral look for all KPI tiles (no solid bg colors)
// //           const tone = {
// //             grad: "from-white via-white to-slate-50",
// //             ring: "ring-slate-200",
// //             accent: "bg-slate-300/70",
// //           };

// //           return (
// //             <Col xs={12} md={6} key={i} className="flex">
// //               <div
// //                 className={[
// //                   "relative flex-1 overflow-hidden rounded-xl p-4",
// //                   "bg-gradient-to-b",
// //                   tone.grad,
// //                   tone.ring,
// //                   "ring-1 shadow-sm",
// //                   "transition-all duration-150 hover:shadow-md hover:scale-[1.01]",
// //                 ].join(" ")}
// //               >
// //                 {/* accents */}
// //                 <div className={`absolute inset-x-0 top-0 h-0.5 ${tone.accent}`} />
// //                 <div className={`absolute inset-x-0 bottom-0 h-[0.5px] ${tone.accent}`} />

// //                 {loading ? (
// //                   <Skeleton active paragraph={false} />
// //                 ) : (
// //                   <Statistic
// //                     title={<span className="text-sm font-medium text-slate-700">{kpi.title}</span>}
// //                     value={kpi.value}
// //                     valueStyle={{
// //                       fontWeight: 700,
// //                       color: "#0f172a",
// //                       fontSize: "1.25rem",
// //                     }}
// //                   />
// //                 )}
// //               </div>
// //             </Col>
// //           );
// //         })}
// //       </Row>

// //       {/* Breakdowns */}
// //       <StatPanels
// //         loading={loading}
// //         byStatus={byStatus}
// //         byMarket={byMarket}
// //         bySellerTop5={bySellerTop5}
// //         bySellerAllCount={bySellerAllCount}
// //         statusColor={statusColor}
// //       />

// //       {isAdmin && <AdminOpsOverview isAdmin={isAdmin} data={rows} loading={loading} />}

// //       {/* Latest Purchased (quick view only) */}
// //       <div className="mt-4 rounded-lg p-3 bg-gradient-to-b from-white via-white to-slate-50 ring-1 ring-slate-200">
// //         <PurchasedTop5Table
// //           data={rows}
// //           loading={loading}
// //           title="Latest 5 Purchased Orders"
// //           currency="USD"
// //           requirePurchased={false}
// //           onOpen={(rec) => {
// //             const id = rec?._id || rec?.id || rec?.sourcing_id || "";
// //             if (!id) return;
// //             navigate(`/requests/${String(id)}`);
// //           }}
// //         />
// //       </div>

// //       <style>{`
// //         .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
// //         .ant-statistic-title { color: #64748b; }
// //       `}</style>
// //     </motion.div>
// //   );
// // }



// // /src/pages/purchaser/PurchaserDashboard.jsx
// import React, {
//   useMemo,
//   useState,
//   useEffect,
//   useCallback,
//   useRef,
// } from "react";
// import {
//   Row,
//   Col,
//   Space,
//   Typography,
//   Button,
//   Statistic,
//   Empty,
//   Skeleton,
//   Card,
//   Spin,
//   Select,
//   message,
// } from "antd";
// import { ReloadOutlined } from "@ant-design/icons";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useQuery, keepPreviousData } from "@tanstack/react-query";

// import PurchasedTop5Table from "./components/PurchasedTop5Table";
// import PurchaserFilters from "./components/PurchaserFilters";
// import {
//   labelFromMarket,
//   normalizeRequests,
//   statusColor,
// } from "./utils/PurchaseTableUtils";

// import { useAuth } from "../../contexts/AuthContext";
// import apiClient from "../../api/client";
// import AdminOpsOverview from "./components/AdminOpsOverview";
// import StatPanels from "./components/StatsPanel";
// import { useCan, usePermissions } from "../../hooks/usePermissions";

// const { Title, Text } = Typography;

// /* ---------- constants & tiny helpers ---------- */
// const STATUS_LIST = [
//   "Assigned",
//   "Offer",
//   "Purchased",
//   "Disapproved",
//   "Sold",
//   "Hold",
//   "Seller Rejected",
//   "Dropshipped",
//   "Returned",
// ];
// const lower = (v) => String(v ?? "").trim().toLowerCase();
// const pickRows = (body) =>
//   Array.isArray(body)
//     ? body
//     : body?.docs || body?.data || body?.results || body?.items || [];

// const toDate = (v) => {
//   const d = v ? new Date(v) : null;
//   return d && !isNaN(d.getTime()) ? d : null;
// };
// const formatDuration = (ms) => {
//   if (!Number.isFinite(ms) || ms < 0) return "—";
//   const s = Math.floor(ms / 1000);
//   const d = Math.floor(s / 86400);
//   const h = Math.floor((s % 86400) / 3600);
//   const m = Math.floor((s % 3600) / 60);
//   if (d > 0) return `${d}d ${h}h ${m}m`;
//   if (h > 0) return `${h}h ${m}m`;
//   return `${m}m`;
// };

// // helpers for money formatting and numeric coercion
// const num = (v) => (Number.isFinite(+v) ? +v : 0);
// const fmtMoneySigned = (n) => {
//   const v = num(n);
//   const s = Math.abs(v).toLocaleString(undefined, {
//     minimumFractionDigits: 2,
//     maximumFractionDigits: 2,
//   });
//   return `${v < 0 ? "\u2212\u00A0" : ""}$${s}`;
// };

// /* ------------------- purchaser search control for admins ------------------- */
// function usePurchaserSearch() {
//   const [options, setOptions] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const t = useRef(null);

//   const mapUser = (u) => ({
//     value: String(u.value),
//     label: (
//       <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
//         <span style={{ fontWeight: 600 }}>
//           {u.label || u.email || "Unnamed"}
//         </span>
//         {u.email ? <span style={{ color: "#999" }}>· {u.email}</span> : null}
//       </div>
//     ),
//     raw: u,
//   });

//   const fetchUsers = async (q = "", page = 1, limit = 20) => {
//     setLoading(true);
//     try {
//       const res = await apiClient.get("/api/v1/sourcing/purchasers/search", {
//         params: { q, page, limit },
//       });
//       const list = res.data?.results || [];
//       setOptions(list.map(mapUser));
//     } catch (e) {
//       const status = e?.response?.status;
//       if (status === 403) message.warning("Only admins can search purchasers.");
//       else
//         message.error(
//           e?.response?.data?.message || "Failed to search purchasers."
//         );
//       setOptions([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const debouncedSearch = (q) => {
//     clearTimeout(t.current);
//     t.current = setTimeout(() => fetchUsers(q), 300);
//   };

//   const fetchInitial = () => !options.length && fetchUsers("");

//   return { options, loading, debouncedSearch, fetchInitial };
// }

// /* ========================================================================== */
// export default function PurchaserDashboard() {
//   const navigate = useNavigate();
//   const { pathname } = useLocation();
//   const base = pathname.startsWith("/purchasing") ? "/purchasing" : "/purchaser";

//   const { user: authUser } = useAuth();
//   const isAdmin = useMemo(() => {
//     const r = authUser?.roles;
//     if (Array.isArray(r)) {
//       return r
//         .map((x) =>
//           typeof x === "string"
//             ? x.toLowerCase()
//             : String(x?.role || "").toLowerCase()
//         )
//         .includes("admin");
//     }
//     return String(r?.role || r || "").toLowerCase() === "admin";
//   }, [authUser]);

//   /* ---------- permissions via hook ---------- */
//   const { isLoading: permsLoading } = usePermissions();
//   const canSeeAssignedMine = useCan("purchaser", "assigned to me");
//   const canSeeAllAssigned = useCan("purchaser", "all assigned");

//   /* -------------------------- filters & scope -------------------------- */
//   const [statusFilter, setStatusFilter] = useState("");
//   const [searchTerm, setSearchTerm] = useState("");
//   // default to current month
//   const [dateRange, setDateRange] = useState(() => [
//     dayjs().startOf("month"),
//     dayjs().endOf("month"),
//   ]);
//   const [selectedPurchaser, setSelectedPurchaser] = useState(null);

//   const {
//     options: purchaserOptions,
//     loading: purchaserLoading,
//     debouncedSearch: purchaserSearch,
//     fetchInitial: fetchInitialPurchasers,
//   } = usePurchaserSearch();

//   /* ------------------------ server query params ------------------------ */
//   const serverParams = useMemo(() => {
//     if (
//       permsLoading ||
//       canSeeAssignedMine === null ||
//       canSeeAllAssigned === null
//     ) {
//       return null;
//     }

//     const params = {};
//     if (isAdmin) {
//       if (!canSeeAllAssigned) return null;
//       if (selectedPurchaser?.value)
//         params.purchaser_id = selectedPurchaser.value;
//     } else {
//       if (!canSeeAssignedMine) return null;
//       params.mine = true;
//     }

//     if (statusFilter) params.status = statusFilter;

//     if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
//       params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
//       params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
//     }

//     if (searchTerm?.trim()) params.q = searchTerm.trim();
//     return params;
//   }, [
//     permsLoading,
//     canSeeAssignedMine,
//     canSeeAllAssigned,
//     isAdmin,
//     selectedPurchaser,
//     statusFilter,
//     dateRange,
//     searchTerm,
//   ]);

//   /* --------------------------- fetch: rows + total --------------------------- */
//   const {
//     data: rowsPayload,
//     isLoading: listLoading,
//     isFetching: listFetching,
//     refetch,
//   } = useQuery({
//     queryKey: ["purchaserDashboard", "rows", serverParams],
//     queryFn: async () => {
//       const LIMIT = 500; // plenty for dashboard metrics
//       const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
//         params: { ...serverParams, page: 1, limit: LIMIT, sort: "-createdAt" },
//       });
//       const normalized = normalizeRequests(pickRows(data));
//       const rows = normalized.map((r) => {
//         const rtMs = Number(r?.purchaserResponseTime);
//         if (!Number.isFinite(rtMs) || rtMs < 0) return r;
//         const assignedBase =
//           toDate(r?.assignedAt) ||
//           toDate(r?.assigned_at) ||
//           toDate(r?.createdAt) ||
//           toDate(r?.created_at) ||
//           new Date(Date.now() - rtMs);
//         const purchaserActionDate = new Date(assignedBase.getTime() + rtMs);
//         return {
//           ...r,
//           assignedAt: assignedBase.toISOString(),
//           purchaserActionTime: purchaserActionDate.toISOString(),
//         };
//       });
//       // return rows plus server-side total for current filters
//       return {
//         rows,
//         total: Number(data?.total ?? rows.length),
//       };
//     },
//     enabled: !!serverParams,
//     placeholderData: keepPreviousData,
//     refetchOnWindowFocus: true,
//     staleTime: 30_000,
//   });

//   // ✅ authoritative status counts from the server (same filters)
//   const { data: statusCountsData } = useQuery({
//     queryKey: ["purchaserDashboard", "statusCounts", serverParams],
//     enabled: !!serverParams,
//     staleTime: 30_000,
//     queryFn: async () => {
//       const getCount = async (statusVal) => {
//         const params = {
//           ...serverParams,
//           status: statusVal,
//           page: 1,
//           limit: 1, // we only need the total
//           sort: "-createdAt",
//         };
//         const { data } = await apiClient.get(
//           "/api/v1/sourcing/all-sourcing",
//           { params }
//         );
//         return Number(data?.total ?? 0);
//       };
//       const entries = await Promise.all(
//         STATUS_LIST.map(async (s) => [s, await getCount(s)])
//       );
//       return Object.fromEntries(entries);
//     },
//   });

//   const loading = permsLoading || listLoading;
//   const isRefreshing = listFetching && !listLoading;

//   const rows = rowsPayload?.rows || [];
//   const totalCount = rowsPayload?.total ?? rows.length;

//   const onRefresh = useCallback(async () => {
//     await refetch();
//   }, [refetch]);

//   const clearAll = () => {
//     setStatusFilter("");
//     setSearchTerm("");
//     setDateRange([dayjs().startOf("month"), dayjs().endOf("month")]);
//     setSelectedPurchaser(null);
//     refetch();
//   };

//   /* ------------------------------ metrics (client) ------------------------------ */
//   const {
//     byStatusLocal,
//     byMarket,
//     bySellerAllCount,
//     bySellerTop5,
//     purchasedCount,
//     avgResponseMs,
//     responseCount,
//     totalSavings,
//   } = useMemo(() => {
//     const agg = {
//       byStatus: new Map(),
//       byMarket: new Map(),
//       bySeller: new Map(),
//       purchasedCount: 0,
//       responseSumMs: 0,
//       responseCount: 0,
//       savings: 0,
//     };

//     for (const d of rows) {
//       // status (do NOT invent "Pending" if empty; skip unknowns)
//       const rawStatus = String(d?.status ?? "").trim();
//       if (rawStatus) {
//         // canonicalize by case (leave original label if it's standard)
//         const l = lower(rawStatus);
//         const canon =
//           STATUS_LIST.find((s) => lower(s) === l) || rawStatus;
//         agg.byStatus.set(canon, (agg.byStatus.get(canon) || 0) + 1);
//         if (canon === "Purchased") agg.purchasedCount += 1;
//       }

//       // market
//       const mkt = labelFromMarket(d?.market ?? d?.sellerMarket);
//       agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

//       // seller
//       const sellerName = d?.seller_name ?? d?.sellerName ?? "—";
//       agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

//       // savings
//       const direct = d?.purchase_efficiency;
//       const target = num(d?.target_total_cost);
//       const actual =
//         num(d?.total_actual_cost) ||
//         (num(d?.sellers_price) + num(d?.shipping_charges) + num(d?.taxes));
//       const savings = Number.isFinite(+direct) ? +direct : target - actual;
//       if (Number.isFinite(savings)) agg.savings += savings;

//       // response time
//       const assignedAt = toDate(d?.assignedAt);
//       const actionAt =
//         toDate(d?.purchaserActionTime) || toDate(d?.purchaserResponseTime);
//       if (assignedAt && actionAt) {
//         const delta = actionAt.getTime() - assignedAt.getTime();
//         if (Number.isFinite(delta) && delta >= 0) {
//           agg.responseSumMs += delta;
//           agg.responseCount += 1;
//         }
//       }
//     }

//     const sortDesc = (arr) => arr.sort((a, b) => b[1] - a[1]);
//     const byMarketArr = sortDesc(Array.from(agg.byMarket.entries())).slice(
//       0,
//       6
//     );
//     const bySellerArr = sortDesc(Array.from(agg.bySeller.entries()));
//     const bySellerTop5 = bySellerArr.slice(0, 5);

//     return {
//       byStatusLocal: Array.from(agg.byStatus.entries()).sort(
//         (a, b) => b[1] - a[1]
//       ),
//       byMarket: byMarketArr,
//       bySellerAllCount: bySellerArr.length,
//       bySellerTop5,
//       purchasedCount: agg.purchasedCount,
//       avgResponseMs: agg.responseCount
//         ? Math.round(agg.responseSumMs / agg.responseCount)
//         : null,
//       responseCount: agg.responseCount,
//       totalSavings: Number(agg.savings.toFixed(2)),
//     };
//   }, [rows]);

//   // ✅ prefer server counts for "By Status"; fall back to local if not available
//   const byStatus = useMemo(() => {
//     if (!statusCountsData) return byStatusLocal;
//     const arr = STATUS_LIST.map((s) => [s, statusCountsData[s] ?? 0]);
//     // hide zeros to match your UI expectation; sort desc
//     return arr
//       .filter(([, v]) => v > 0)
//       .sort((a, b) => b[1] - a[1]);
//   }, [statusCountsData, byStatusLocal]);

//   /* ------------------------------ gating ------------------------------ */
//   if (
//     permsLoading ||
//     canSeeAssignedMine === null ||
//     canSeeAllAssigned === null
//   ) {
//     return (
//       <div style={{ display: "grid", placeItems: "center", height: 240 }}>
//         <Spin />
//       </div>
//     );
//   }

//   if (isAdmin && !canSeeAllAssigned) {
//     return (
//       <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
//         <Empty
//           description={
//             <div className="text-center">
//               <div className="font-semibold">
//                 No permission to view “All Assigned”
//               </div>
//               <div className="text-gray-500">
//                 Ask an admin to enable Purchaser → “all assigned”.
//               </div>
//             </div>
//           }
//         />
//       </Card>
//     );
//   }

//   if (!isAdmin && !canSeeAssignedMine) {
//     return (
//       <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
//         <Empty
//           description={
//             <div className="text-center">
//               <div className="font-semibold">
//                 No permission to view “Assigned to Me”
//               </div>
//               <div className="text-gray-500">
//                 Ask an admin to enable Purchaser → “assigned to me”.
//               </div>
//             </div>
//           }
//         />
//       </Card>
//     );
//   }

//   const showAdminScopeControl = isAdmin && canSeeAllAssigned;
//   const AdminScopeControl = showAdminScopeControl ? (
//     <Select
//       allowClear
//       showSearch
//       placeholder="View purchaser…"
//       style={{ minWidth: 260 }}
//       options={purchaserOptions}
//       loading={purchaserLoading}
//       value={selectedPurchaser?.value}
//       onSearch={purchaserSearch}
//       onDropdownVisibleChange={(open) => open && fetchInitialPurchasers()}
//       onChange={(_, option) => setSelectedPurchaser(option || null)}
//       filterOption={false}
//       size="large"
//     />
//   ) : null;

//   /* ------------------------------ render ------------------------------ */
//   return (
//     <motion.div
//       initial={{ scale: 0.99, opacity: 0 }}
//       animate={{ scale: 1, opacity: 1 }}
//       transition={{ duration: 0.25 }}
//       className="rounded-xl p-4 bg-white border border-slate-200 shadow-sm"
//     >
//       {/* Header */}
//       <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
//         <Col>
//           <Title level={4} style={{ margin: 0 }}>
//             Purchaser Dashboard
//           </Title>
//           <Text type="secondary">
//             {loading
//               ? "Loading…"
//               : `Showing ${rows.length} records${
//                   // rows length is what's loaded for detail panels; totals use server
//                   rows.length && avgResponseMs !== null
//                     ? ` · ${rows.length} processed`
//                     : ""
//                 }${isRefreshing ? " · refreshing…" : ""}`}
//           </Text>

//           {showAdminScopeControl && selectedPurchaser ? (
//             <div style={{ marginTop: 6 }}>
//               <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 text-slate-700 px-2 py-1 text-xs border border-slate-200">
//                 {selectedPurchaser?.label}
//                 <button
//                   onClick={() => setSelectedPurchaser(null)}
//                   className="ml-1 rounded-sm px-1 hover:bg-slate-100"
//                   aria-label="Clear purchaser scope"
//                 >
//                   ✕
//                 </button>
//               </span>
//             </div>
//           ) : null}
//         </Col>

//         <Col>
//           <Space wrap>
//             {AdminScopeControl}
//             <Button
//               icon={<ReloadOutlined />}
//               onClick={onRefresh}
//               disabled={loading}
//             >
//               Refresh
//             </Button>
//           </Space>
//         </Col>
//       </Row>

//       {/* Filters */}
//       <PurchaserFilters
//         screens={{}}
//         statusFilter={statusFilter}
//         setStatusFilter={setStatusFilter}
//         searchTerm={searchTerm}
//         setSearchTerm={setSearchTerm}
//         dateRange={dateRange}
//         setDateRange={setDateRange}
//         AdminScopeControl={null}
//         onClear={clearAll}
//         showStatusNote="Filters apply to dashboard metrics and quick view"
//       />

//       {/* KPIs */}
//       <Row gutter={[12, 12]} align="stretch">
//         {[
//           // use server-wide total (with current filters)
//           { title: "Total Listings", value: totalCount },
//           { title: "Purchased", value: statusCountsData?.Purchased ?? 0 },
//           { title: "Savings", value: fmtMoneySigned(totalSavings) },
//           {
//             title: "Average Response Time",
//             value:
//               avgResponseMs === null ? "—" : formatDuration(avgResponseMs),
//           },
//         ].map((kpi, i) => {
//           const tone = {
//             grad: "from-white via-white to-slate-50",
//             ring: "ring-slate-200",
//             accent: "bg-slate-300/70",
//           };

//           return (
//             <Col xs={12} md={6} key={i} className="flex">
//               <div
//                 className={[
//                   "relative flex-1 overflow-hidden rounded-xl p-4",
//                   "bg-gradient-to-b",
//                   tone.grad,
//                   tone.ring,
//                   "ring-1 shadow-sm",
//                   "transition-all duration-150 hover:shadow-md hover:scale-[1.01]",
//                 ].join(" ")}
//               >
//                 {/* accents */}
//                 <div className={`absolute inset-x-0 top-0 h-0.5 ${tone.accent}`} />
//                 <div
//                   className={`absolute inset-x-0 bottom-0 h-[0.5px] ${tone.accent}`}
//                 />

//                 {loading ? (
//                   <Skeleton active paragraph={false} />
//                 ) : (
//                   <Statistic
//                     title={
//                       <span className="text-sm font-medium text-slate-700">
//                         {kpi.title}
//                       </span>
//                     }
//                     value={kpi.value}
//                     valueStyle={{
//                       fontWeight: 700,
//                       color: "#0f172a",
//                       fontSize: "1.25rem",
//                     }}
//                   />
//                 )}
//               </div>
//             </Col>
//           );
//         })}
//       </Row>

//       {/* Breakdowns */}
//       <StatPanels
//         loading={loading}
//         byStatus={byStatus}
//         byMarket={byMarket}
//         bySellerTop5={bySellerTop5}
//         bySellerAllCount={bySellerAllCount}
//         statusColor={statusColor}
//       />

//       {isAdmin && (
//         <AdminOpsOverview isAdmin={isAdmin} data={rows} loading={loading} />
//       )}

//       {/* Latest Purchased (quick view only) */}
//       <div className="mt-4 rounded-lg p-3 bg-gradient-to-b from-white via-white to-slate-50 ring-1 ring-slate-200">
//         <PurchasedTop5Table
//           data={rows}
//           loading={loading}
//           title="Latest 5 Purchased Orders"
//           currency="USD"
//           requirePurchased={false}
//           onOpen={(rec) => {
//             const id = rec?._id || rec?.id || rec?.sourcing_id || "";
//             if (!id) return;
//             navigate(`/requests/${String(id)}`);
//           }}
//         />
//       </div>

//       <style>{`
//         .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
//         .ant-statistic-title { color: #64748b; }
//       `}</style>
//     </motion.div>
//   );
// }


// /src/pages/purchaser/PurchaserDashboard.jsx
import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  Row,
  Col,
  Space,
  Typography,
  Button,
  Statistic,
  Empty,
  Skeleton,
  Card,
  Spin,
  Select,
  message,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import PurchasedTop5Table from "./components/PurchasedTop5Table";
import PurchaserFilters from "./components/PurchaserFilters";
import {
  labelFromMarket,
  normalizeRequests,
  statusColor,
} from "./utils/PurchaseTableUtils";

import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../api/client";
import AdminOpsOverview from "./components/AdminOpsOverview";
import StatPanels from "./components/StatsPanel";
import { useCan, usePermissions } from "../../hooks/usePermissions";

const { Title, Text } = Typography;

/* ---------- Sourcer look & feel (cards/background) ---------- */
const statsCardStyle = {
  borderRadius: 14,
  background: "linear-gradient(135deg, #ffffff, #f6f9ff)",
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
  border: "1px solid #eef2ff",
};
const cardHoverEffect = { whileHover: { scale: 1.01 }, whileTap: { scale: 0.99 } };

/* ---------- constants & tiny helpers ---------- */
const STATUS_LIST = [
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
const lower = (v) => String(v ?? "").trim().toLowerCase();
const pickRows = (body) =>
  Array.isArray(body)
    ? body
    : body?.docs || body?.data || body?.results || body?.items || [];

const toDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};
const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// helpers for money formatting and numeric coercion
const num = (v) => (Number.isFinite(+v) ? +v : 0);
const fmtMoneySigned = (n) => {
  const v = num(n);
  const s = Math.abs(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${v < 0 ? "\u2212\u00A0" : ""}$${s}`;
};

/* ------------------- purchaser search control for admins ------------------- */
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

/* ========================================================================== */
export default function PurchaserDashboard() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const base = pathname.startsWith("/purchasing") ? "/purchasing" : "/purchaser";

  const { user: authUser } = useAuth();
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

  /* ---------- permissions via hook ---------- */
  const { isLoading: permsLoading } = usePermissions();
  const canSeeAssignedMine = useCan("purchaser", "assigned to me");
  const canSeeAllAssigned = useCan("purchaser", "all assigned");

  /* -------------------------- filters & scope -------------------------- */
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  // ✅ Default to NO date filter to avoid silently restricting totals
  const [dateRange, setDateRange] = useState([]);
  const [selectedPurchaser, setSelectedPurchaser] = useState(null);

  const {
    options: purchaserOptions,
    loading: purchaserLoading,
    debouncedSearch: purchaserSearch,
    fetchInitial: fetchInitialPurchasers,
  } = usePurchaserSearch();

  /* ------------------------ server query params ------------------------ */
  const serverParams = useMemo(() => {
    if (
      permsLoading ||
      canSeeAssignedMine === null ||
      canSeeAllAssigned === null
    ) {
      return null;
    }

    const params = {};
    if (isAdmin) {
      if (!canSeeAllAssigned) return null;
      if (selectedPurchaser?.value)
        params.purchaser_id = selectedPurchaser.value;
    } else {
      if (!canSeeAssignedMine) return null;
      params.mine = true;
    }

    if (statusFilter) params.status = statusFilter;

    if (Array.isArray(dateRange) && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
      params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
    }

    if (searchTerm?.trim()) params.q = searchTerm.trim();
    return params;
  }, [
    permsLoading,
    canSeeAssignedMine,
    canSeeAllAssigned,
    isAdmin,
    selectedPurchaser,
    statusFilter,
    dateRange,
    searchTerm,
  ]);

  /* --------------------------- fetch: rows + total --------------------------- */
  const {
    data: rowsPayload,
    isLoading: listLoading,
    isFetching: listFetching,
    refetch,
  } = useQuery({
    queryKey: ["purchaserDashboard", "rows", serverParams],
    queryFn: async () => {
      const LIMIT = 500; // plenty for dashboard metrics
      const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
        params: { ...serverParams, page: 1, limit: LIMIT, sort: "-createdAt" },
      });
      const normalized = normalizeRequests(pickRows(data));
      const rows = normalized.map((r) => {
        const rtMs = Number(r?.purchaserResponseTime);
        if (!Number.isFinite(rtMs) || rtMs < 0) return r;
        const assignedBase =
          toDate(r?.assignedAt) ||
          toDate(r?.assigned_at) ||
          toDate(r?.createdAt) ||
          toDate(r?.created_at) ||
          new Date(Date.now() - rtMs);
        const purchaserActionDate = new Date(assignedBase.getTime() + rtMs);
        return {
          ...r,
          assignedAt: assignedBase.toISOString(),
          purchaserActionTime: purchaserActionDate.toISOString(),
        };
      });
      return {
        rows,
        total: Number(data?.total ?? rows.length),
      };
    },
    enabled: !!serverParams,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });

  // ✅ authoritative status counts from the server (same filters)
  const { data: statusCountsData } = useQuery({
    queryKey: ["purchaserDashboard", "statusCounts", serverParams],
    enabled: !!serverParams,
    staleTime: 30_000,
    queryFn: async () => {
      const getCount = async (statusVal) => {
        const params = {
          ...serverParams,
          status: statusVal,
          page: 1,
          limit: 1,
          sort: "-createdAt",
        };
        const { data } = await apiClient.get(
          "/api/v1/sourcing/all-sourcing",
          { params }
        );
        return Number(data?.total ?? 0);
      };
      const entries = await Promise.all(
        STATUS_LIST.map(async (s) => [s, await getCount(s)])
      );
      return Object.fromEntries(entries);
    },
  });

  const loading = permsLoading || listLoading;
  const isRefreshing = listFetching && !listLoading;

  const rows = rowsPayload?.rows || [];
  const totalCount = rowsPayload?.total ?? rows.length;

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const clearAll = () => {
    setStatusFilter("");
    setSearchTerm("");
    setDateRange([]);
    setSelectedPurchaser(null);
    refetch();
  };

  /* ------------------------------ metrics (client) ------------------------------ */
  const {
    byStatusLocal,
    byMarket,
    bySellerAllCount,
    bySellerTop5,
    purchasedCount,
    avgResponseMs,
    responseCount,
    totalSavings,
  } = useMemo(() => {
    const agg = {
      byStatus: new Map(),
      byMarket: new Map(),
      bySeller: new Map(),
      purchasedCount: 0,
      responseSumMs: 0,
      responseCount: 0,
      savings: 0,
    };

    for (const d of rows) {
      const rawStatus = String(d?.status ?? "").trim();
      if (rawStatus) {
        const l = lower(rawStatus);
        const canon =
          STATUS_LIST.find((s) => lower(s) === l) || rawStatus;
        agg.byStatus.set(canon, (agg.byStatus.get(canon) || 0) + 1);
        if (canon === "Purchased") agg.purchasedCount += 1;
      }

      const mkt = labelFromMarket(d?.market ?? d?.sellerMarket);
      agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

      const sellerName = d?.seller_name ?? d?.sellerName ?? "—";
      agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

      const direct = d?.purchase_efficiency;
      const target = num(d?.target_total_cost);
      const actual =
        num(d?.total_actual_cost) ||
        (num(d?.sellers_price) + num(d?.shipping_charges) + num(d?.taxes));
      const savings = Number.isFinite(+direct) ? +direct : target - actual;
      if (Number.isFinite(savings)) agg.savings += savings;

      const assignedAt = toDate(d?.assignedAt);
      const actionAt =
        toDate(d?.purchaserActionTime) || toDate(d?.purchaserResponseTime);
      if (assignedAt && actionAt) {
        const delta = actionAt.getTime() - assignedAt.getTime();
        if (Number.isFinite(delta) && delta >= 0) {
          agg.responseSumMs += delta;
          agg.responseCount += 1;
        }
      }
    }

    const sortDesc = (arr) => arr.sort((a, b) => b[1] - a[1]);
    const byMarketArr = sortDesc(Array.from(agg.byMarket.entries())).slice(
      0,
      6
    );
    const bySellerArr = sortDesc(Array.from(agg.bySeller.entries()));
    const bySellerTop5 = bySellerArr.slice(0, 5);

    return {
      byStatusLocal: Array.from(agg.byStatus.entries()).sort(
        (a, b) => b[1] - a[1]
      ),
      byMarket: byMarketArr,
      bySellerAllCount: bySellerArr.length,
      bySellerTop5,
      purchasedCount: agg.purchasedCount,
      avgResponseMs: agg.responseCount
        ? Math.round(agg.responseSumMs / agg.responseCount)
        : null,
      responseCount: agg.responseCount,
      totalSavings: Number(agg.savings.toFixed(2)),
    };
  }, [rows]);

  const byStatus = useMemo(() => {
    if (!statusCountsData) return byStatusLocal;
    const arr = STATUS_LIST.map((s) => [s, statusCountsData[s] ?? 0]);
    return arr
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [statusCountsData, byStatusLocal]);

  /* ------------------------------ gating ------------------------------ */
  if (
    permsLoading ||
    canSeeAssignedMine === null ||
    canSeeAllAssigned === null
  ) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 240 }}>
        <Spin />
      </div>
    );
  }

  if (isAdmin && !canSeeAllAssigned) {
    return (
      <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
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
      <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
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

  const showAdminScopeControl = isAdmin && canSeeAllAssigned;
  const AdminScopeControl = showAdminScopeControl ? (
    <Select
      allowClear
      showSearch
      placeholder="View purchaser…"
      style={{ minWidth: 260 }}
      options={purchaserOptions}
      loading={purchaserLoading}
      value={selectedPurchaser?.value}
      onSearch={purchaserSearch}
      onDropdownVisibleChange={(open) => open && fetchInitialPurchasers()}
      onChange={(_, option) => setSelectedPurchaser(option || null)}
      filterOption={false}
      size="large"
    />
  ) : null;

  /* ------------------------------ render ------------------------------ */
  return (
    <div className="mt-4 p-0 md:p-[1.25rem] rounded-[16px] sm:shadow-[0_12px_28px_rgba(15,23,42,0.06)] sm:border border-[#e6edff] bg-none md:bg-[linear-gradient(135deg,#f8fbff,#eef4ff)]">
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            Purchaser Dashboard
          </Title>
          <Text type="secondary">
            {loading
              ? "Loading…"
              : `Showing ${totalCount} records${isRefreshing ? " · refreshing…" : ""}`}
          </Text>

          {showAdminScopeControl && selectedPurchaser ? (
            <div style={{ marginTop: 6 }}>
              <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 text-slate-700 px-2 py-1 text-xs border border-slate-200">
                {selectedPurchaser?.label}
                <button
                  onClick={() => setSelectedPurchaser(null)}
                  className="ml-1 rounded-sm px-1 hover:bg-slate-100"
                  aria-label="Clear purchaser scope"
                >
                  ✕
                </button>
              </span>
            </div>
          ) : null}
        </Col>

        <Col>
          <Space wrap>
            {AdminScopeControl}
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Filters – wrapped in same white card style used on Sourcer */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200 mt-5">
        <PurchaserFilters
          screens={{}}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          dateRange={dateRange}
          setDateRange={setDateRange}
          AdminScopeControl={null}
          onClear={clearAll}
          showStatusNote="Filters apply to dashboard metrics and quick view"
        />
      </div>

      {/* KPIs – EXACT Sourcer card colors */}
      <Row gutter={[16, 16]}>
        {[
          { title: "Total Listings", value: totalCount },
          { title: "Purchased", value: statusCountsData?.Purchased ?? 0 },
          { title: "Savings", value: fmtMoneySigned(totalSavings) },
          {
            title: "Average Response Time",
            value: avgResponseMs === null ? "—" : formatDuration(avgResponseMs),
          },
        ].map((stat, i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={i}>
            <motion.div {...cardHoverEffect}>
              <Card style={statsCardStyle} bodyStyle={{ padding: 16 }}>
                {loading ? (
                  <Skeleton active paragraph={{ rows: 0 }} />
                ) : (
                  <Statistic
                    title={<span style={{ fontWeight: 600 }}>{stat.title}</span>}
                    value={stat.value}
                    valueStyle={{ fontWeight: 700 }}
                  />
                )}
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Breakdowns */}
      <div className="mt-4">
        <StatPanels
          loading={loading}
          byStatus={byStatus}
          byMarket={byMarket}
          bySellerTop5={bySellerTop5}
          bySellerAllCount={bySellerAllCount}
          statusColor={statusColor}
        />
      </div>

      {isAdmin && (
        <div className="mt-4">
          <AdminOpsOverview isAdmin={isAdmin} data={rows} loading={loading} />
        </div>
      )}

      {/* Latest Purchased */}
      <div className="mt-4 rounded-lg p-3 bg-gradient-to-b from-white via-white to-slate-50 ring-1 ring-slate-200">
        <PurchasedTop5Table
          data={rows}
          loading={loading}
          title="Latest 5 Purchased Orders"
          currency="USD"
          requirePurchased={false}
          onOpen={(rec) => {
            const id = rec?._id || rec?.id || rec?.sourcing_id || "";
            if (!id) return;
            navigate(`/requests/${String(id)}`);
          }}
        />
      </div>
    </div>
  );
}
