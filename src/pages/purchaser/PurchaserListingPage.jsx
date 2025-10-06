// // // src/pages/purchaser/PurchaserListingsPage.jsx
// // // Identical to Assigned page, except:
// // // - endpoint is /api/v1/sourcing/all-sourcing
// // // - statusFilter IS applied
// // // - admins see everyone (remove mine)
// // import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
// // import { Table, message, Tag, Select, Typography, Input, DatePicker, Grid, Space, Empty } from "antd";
// // import { motion } from "framer-motion";
// // import dayjs from "dayjs";
// // import { useNavigate } from "react-router-dom";
// // import { useAuth } from "../../contexts/AuthContext";
// // import apiClient from "../../api/client";
// // import SleekPagination from "./components/SleekPagination";
// // import { normalizeRequests, statusColor, num as safeNum, ExpandedItemsTable } from "./utils/PurchaseTableUtils";
// // // import PurchaserHeaderCard from "./components/PurchaserHeaderCard";
// // import PurchaserFilters from "./components/PurchaserFilters";

// // const { Option } = Select;
// // const { useBreakpoint } = Grid;
// // const { Search } = Input;

// // const pickRows = (body) =>
// //   Array.isArray(body) ? body : body?.docs || body?.data || body?.results || body?.items || [];

// // function usePurchaserSearch() {
// //   const [options, setOptions] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const t = useRef(null);

// //   const mapUser = (u) => ({
// //     value: String(u.value),
// //     label: (
// //       <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
// //         <span style={{ fontWeight: 600 }}>{u.label || u.email || "Unnamed"}</span>
// //         {u.email ? <span style={{ color: "#999" }}>· {u.email}</span> : null}
// //       </div>
// //     ),
// //     raw: u,
// //   });

// //   const fetchUsers = async (q = "", page = 1, limit = 20) => {
// //     setLoading(true);
// //     try {
// //       const res = await apiClient.get("/api/v1/sourcing/purchasers/search", { params: { q, page, limit } });
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

// // export default function PurchaserListingsPage() {
// //   const { user: authUser } = useAuth();
// //   const isAdmin = (() => {
// //     const r = authUser?.roles;
// //     if (Array.isArray(r)) {
// //       return r
// //         .map((x) => (typeof x === "string" ? x.toLowerCase() : String(x?.role || "").toLowerCase()))
// //         .includes("admin");
// //     }
// //     return String(r?.role || r || "").toLowerCase() === "admin";
// //   })();

// //   const [requests, setRequests] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [isRefreshing, setIsRefreshing] = useState(false);

// //   const [page, setPage] = useState(1);
// //   const [limit, setLimit] = useState(10);
// //   const [total, setTotal] = useState(0);

// //   const [statusFilter, setStatusFilter] = useState("");  // APPLIED on this page
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [dateRange, setDateRange] = useState([]);
// //   const [selectedPurchaser, setSelectedPurchaser] = useState(null);

// //   const { options: purchaserOptions, loading: purchaserLoading, debouncedSearch: purchaserSearch, fetchInitial: fetchInitialPurchasers } = usePurchaserSearch();

// //   const screens = useBreakpoint();
// //   const navigate = useNavigate();

// //   const serverParams = useMemo(() => {
// //     const params = {};
// //     if (isAdmin) {
// //       if (selectedPurchaser?.value) params.purchaser_id = selectedPurchaser.value;
// //       // admins: show everyone; do NOT set mine
// //     } else {
// //       params.mine = true; // non-admins limited to themselves
// //     }
// //     if (statusFilter) params.status = statusFilter;

// //     if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
// //       params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
// //       params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
// //     }
// //     if (searchTerm?.trim()) params.q = searchTerm.trim();
// //     return params;
// //   }, [isAdmin, selectedPurchaser, statusFilter, dateRange, searchTerm]);

// //   useEffect(() => setPage(1), [statusFilter, searchTerm, dateRange, selectedPurchaser]);

// //   const fetchListings = useCallback(async () => {
// //     setLoading(true);
// //     try {
// //       const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
// //         params: { ...serverParams, page, limit, sort: "-createdAt" },
// //       });
// //       const rows = pickRows(data);
// //       setRequests(normalizeRequests(rows));
// //       setTotal(Number(data?.total ?? rows.length ?? 0));
// //     } catch (err) {
// //       console.error("Failed to fetch data:", err?.response?.data || err?.message);
// //       message.error(err?.response?.data?.message || "Failed to fetch data.");
// //       setRequests([]);
// //       setTotal(0);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [serverParams, page, limit]);

// //   useEffect(() => {
// //     fetchListings();
// //   }, [fetchListings]);

// //   const handleRefreshClick = useCallback(async () => {
// //     try {
// //       setIsRefreshing(true);
// //       await fetchListings();
// //     } finally {
// //       setIsRefreshing(false);
// //     }
// //   }, [fetchListings]);

// //   const columns = [
// //     // same columns as Assigned page…
// //     {
// //       title: "ID",
// //       dataIndex: "sourcing_id",
// //       width: 120,
// //       sorter: (a, b) =>
// //         String(a?.sourcing_id ?? a?.id ?? a?._id ?? "").localeCompare(
// //           String(b?.sourcing_id ?? b?.id ?? b?._id ?? "")
// //         ),
// //       render: (_, rec) => (
// //         <strong style={{ color: "#2c2c2c" }}>
// //           #{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}
// //         </strong>
// //       ),
// //       responsive: ["sm"],
// //     },
// //     { title: "Sourcer", dataIndex: "sourcer_name", width: 160, render: (v) => (v ? <p className="m-0">{v}</p> : "—") },

// //      {
// //       title: "Efficiency",
// //       key: "efficiency",
// //       width: 140,
// //       align: "right",
// //       render: (_, rec) => {
// //         const eff =
// //           typeof rec.purchase_efficiency === "number"
// //             ? rec.purchase_efficiency
// //             : safeNum(rec.target_total_cost) - safeNum(rec.total_actual_cost);
// //         const color = eff >= 0 ? "#16a34a" : "#ef4444";
// //         return <p className="m-0" style={{ color }}>${eff ? parseFloat(eff).toFixed(2) : "0.00"}</p>;
// //       },
// //     },
// //     { title: "Status", dataIndex: "status", width: 140, align: "center", render: (s) => <Tag color={statusColor(s)}>{s}</Tag> },
// //     { title: "Seller", dataIndex: "seller_name", width: 180, ellipsis: true, render: (v) => (v ? <p className="m-0">{v}</p> : "—") },
// //     { title: "Market", dataIndex: "market", width: 100, ellipsis: true, render: (v) => (v ? <p className="m-0">{v}</p> : "—") },
// //     { title: "Seller Price", dataIndex: "sellers_price", width: 200, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
// //     { title: "Shipping charges", dataIndex: "shipping_charges", width: 200, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
// //     { title: "Tax", dataIndex: "taxes", width: 100, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
// //     { title: "Target Cost", dataIndex: "target_total_cost", width: 130, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
// //     { title: "Actual Cost", dataIndex: "total_actual_cost", width: 130, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },

// //   ];

// //   const AdminScopeControl = isAdmin ? (
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
// //       size={screens.xs ? "middle" : "large"}
// //     />
// //   ) : null;

// //   const clearAll = () => {
// //     setStatusFilter("");
// //     setSearchTerm("");
// //     setDateRange([]);
// //     setSelectedPurchaser(null);
// //     setPage(1);
// //     fetchListings();
// //   };

// //   return (
// //     <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
// //       {/* <PurchaserHeaderCard total={total} onRefresh={handleRefreshClick} isRefreshing={isRefreshing} screens={screens} /> */}

// //       <PurchaserFilters
// //         screens={screens}
// //         statusFilter={statusFilter}
// //         setStatusFilter={setStatusFilter}
// //         searchTerm={searchTerm}
// //         setSearchTerm={setSearchTerm}
// //         dateRange={dateRange}
// //         setDateRange={setDateRange}
// //         AdminScopeControl={AdminScopeControl}
// //         onClear={clearAll}
// //         showStatusNote="Status filter applies on Listings page"
// //       />

// //       <Table
// //         locale={{ emptyText: <Empty description="No listings found for your filters" /> }}
// //         dataSource={requests}
// //         columns={columns}
// //         rowKey={(rec) => rec._id}
// //         loading={loading}
// //         size={screens.md ? "middle" : "small"}
// //         pagination={false}
// //         onRow={(record) => ({
// //           onClick: () => {
// //             const id = record._id || record.id;
// //             if (id) navigate(`/requests/${id}`);
// //           },
// //           style: { cursor: "pointer" },
// //         })}
// //         rowClassName={() => "row-clickable"}
// //         scroll={{ x: "max-content" }}
// //         tableLayout="fixed"
// //         sticky
// //         expandable={{
// //           expandedRowRender: (record) => <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />,
// //           rowExpandable: (record) => Array.isArray(record.items) && record.items.length > 0,
// //         }}
// //       />
// //       <SleekPagination page={page} setPage={(p) => setPage(typeof p === "number" ? p : 1)} limit={limit} setLimit={setLimit} total={total} />

// //       <style>{`.row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }`}</style>
// //     </motion.div>
// //   );
// // }

// // src/pages/purchaser/PurchaserListingsPage.jsx
// // Identical to Assigned page, except:
// // - endpoint is /api/v1/sourcing/all-sourcing
// // - statusFilter IS applied
// // - admins see everyone (remove mine) — BUT gated by "all assigned" permission

// import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
// import {
//   Table,
//   message,
//   Tag,
//   Select,
//   Typography,
//   Input,
//   DatePicker,
//   Grid,
//   Space,
//   Empty,
//   Spin,
//   Card,
// } from "antd";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../../contexts/AuthContext";
// import apiClient from "../../api/client";
// import SleekPagination from "./components/SleekPagination";
// import {
//   normalizeRequests,
//   statusColor,
//   num as safeNum,
//   ExpandedItemsTable,
// } from "./utils/PurchaseTableUtils";
// // import PurchaserHeaderCard from "./components/PurchaserHeaderCard";
// import PurchaserFilters from "./components/PurchaserFilters";

// const { Option } = Select;
// const { useBreakpoint } = Grid;
// const { Search } = Input;

// /* --------------------------- helpers --------------------------- */
// const lower = (v) => String(v ?? "").trim().toLowerCase();

// const pickRows = (body) =>
//   Array.isArray(body) ? body : body?.docs || body?.data || body?.results || body?.items || [];

// /** Parse Purchaser permissions from /api/v1/role/all */
// const extractPurchaserPerms = (roleObj) => {
//   const access = Array.isArray(roleObj?.access) ? roleObj.access : [];
//   const purchaser = access.find((a) => lower(a?.app) === "purchaser");
//   const menu = Array.isArray(purchaser?.menu) ? purchaser.menu.map(lower) : [];
//   return {
//     canSeeAssignedMine: menu.includes("assigned to me"),
//     canSeeAllAssigned: menu.includes("all assigned"),
//   };
// };

// function usePurchaserSearch() {
//   const [options, setOptions] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const t = useRef(null);

//   const mapUser = (u) => ({
//     value: String(u.value),
//     label: (
//       <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
//         <span style={{ fontWeight: 600 }}>{u.label || u.email || "Unnamed"}</span>
//         {u.email ? <span style={{ color: "#999" }}>· {u.email}</span> : null}
//       </div>
//     ),
//     raw: u,
//   });

//   const fetchUsers = async (q = "", page = 1, limit = 20) => {
//     setLoading(true);
//     try {
//       const res = await apiClient.get("/api/v1/sourcing/purchasers/search", { params: { q, page, limit } });
//       const list = res.data?.results || [];
//       setOptions(list.map(mapUser));
//     } catch (e) {
//       const status = e?.response?.status;
//       if (status === 403) message.warning("Only admins can search purchasers.");
//       else message.error(e?.response?.data?.message || "Failed to search purchasers.");
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

// export default function PurchaserListingsPage() {
//   const { user: authUser } = useAuth();

//   // Robust admin check
//   const isAdmin = useMemo(() => {
//     const r = authUser?.roles;
//     if (Array.isArray(r)) {
//       return r
//         .map((x) => (typeof x === "string" ? x.toLowerCase() : String(x?.role || "").toLowerCase()))
//         .includes("admin");
//     }
//     return String(r?.role || r || "").toLowerCase() === "admin";
//   }, [authUser]);

//   const roleName = useMemo(() => lower(authUser?.roles?.role || authUser?.role || ""), [authUser]);

//   // Permission gating
//   const [rolesLoaded, setRolesLoaded] = useState(false);
//   const [canSeeAssignedMine, setCanSeeAssignedMine] = useState(false);
//   const [canSeeAllAssigned, setCanSeeAllAssigned] = useState(false);

//   useEffect(() => {
//     let cancelled = false;
//     (async () => {
//       try {
//         const { data } = await apiClient.get("/api/v1/role/all");
//         const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
//         const matched = rolesArr.find((r) => lower(r?.role) === roleName) || null;
//         const { canSeeAssignedMine, canSeeAllAssigned } = extractPurchaserPerms(matched || {});
//         if (!cancelled) {
//           setCanSeeAssignedMine(!!canSeeAssignedMine);
//           setCanSeeAllAssigned(!!canSeeAllAssigned);
//           setRolesLoaded(true);
//         }
//       } catch (e) {
//         console.error("Failed to load /api/v1/role/all", e);
//         if (!cancelled) {
//           setCanSeeAssignedMine(false);
//           setCanSeeAllAssigned(false);
//           setRolesLoaded(true);
//         }
//       }
//     })();
//     return () => {
//       cancelled = true;
//     };
//   }, [roleName]);

//   // Data
//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(10);
//   const [total, setTotal] = useState(0);

//   const [statusFilter, setStatusFilter] = useState(""); // APPLIED on this page
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dateRange, setDateRange] = useState([]);
//   const [selectedPurchaser, setSelectedPurchaser] = useState(null);

//   const {
//     options: purchaserOptions,
//     loading: purchaserLoading,
//     debouncedSearch: purchaserSearch,
//     fetchInitial: fetchInitialPurchasers,
//   } = usePurchaserSearch();

//   const screens = useBreakpoint();
//   const navigate = useNavigate();

//   // Build params only when the viewer has permission
//   const serverParams = useMemo(() => {
//     const params = {};
//     if (isAdmin) {
//       if (!canSeeAllAssigned) return null; // admin but no permission
//       if (selectedPurchaser?.value) params.purchaser_id = selectedPurchaser.value;
//       // admins: show everyone; do NOT set mine
//     } else {
//       if (!canSeeAssignedMine) return null; // non-admin but no permission
//       params.mine = true; // non-admins limited to themselves
//     }
//     if (statusFilter) params.status = statusFilter;

//     if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
//       params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
//       params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
//     }
//     if (searchTerm?.trim()) params.q = searchTerm.trim();
//     return params;
//   }, [isAdmin, canSeeAllAssigned, canSeeAssignedMine, selectedPurchaser, statusFilter, dateRange, searchTerm]);

//   useEffect(() => setPage(1), [statusFilter, searchTerm, dateRange, selectedPurchaser]);

//   const fetchListings = useCallback(async () => {
//     // Guard by permissions
//     if (!serverParams) {
//       setRequests([]);
//       setTotal(0);
//       setLoading(false);
//       return;
//     }
//     setLoading(true);
//     try {
//       const { data } = await apiClient.get("/api/v1/sourcing/all-sourcing", {
//         params: { ...serverParams, page, limit, sort: "-createdAt" },
//       });
//       const rows = pickRows(data);
//       setRequests(normalizeRequests(rows));
//       setTotal(Number(data?.total ?? rows.length ?? 0));
//     } catch (err) {
//       console.error("Failed to fetch data:", err?.response?.data || err?.message);
//       message.error(err?.response?.data?.message || "Failed to fetch data.");
//       setRequests([]);
//       setTotal(0);
//     } finally {
//       setLoading(false);
//     }
//   }, [serverParams, page, limit]);

//   useEffect(() => {
//     if (!rolesLoaded) return;
//     fetchListings();
//   }, [rolesLoaded, fetchListings]);

//   const handleRefreshClick = useCallback(async () => {
//     try {
//       setIsRefreshing(true);
//       await fetchListings();
//     } finally {
//       setIsRefreshing(false);
//     }
//   }, [fetchListings]);

//   const columns = [
//     {
//       title: "ID",
//       dataIndex: "sourcing_id",
//       width: 120,
//       sorter: (a, b) =>
//         String(a?.sourcing_id ?? a?.id ?? a?._id ?? "").localeCompare(
//           String(b?.sourcing_id ?? b?.id ?? b?._id ?? "")
//         ),
//       render: (_, rec) => (
//         <strong style={{ color: "#2c2c2c" }}>
//           #{String(rec.sourcing_id ?? rec.id ?? rec._id).slice(-6)}
//         </strong>
//       ),
//       responsive: ["sm"],
//     },
//     { title: "Sourcer", dataIndex: "sourcer_name", width: 160, render: (v) => (v ? <p className="m-0">{v}</p> : "—") },

//     {
//       title: "Efficiency",
//       key: "efficiency",
//       width: 140,
//       align: "right",
//       render: (_, rec) => {
//         const eff =
//           typeof rec.purchase_efficiency === "number"
//             ? rec.purchase_efficiency
//             : safeNum(rec.target_total_cost) - safeNum(rec.total_actual_cost);
//         const color = eff >= 0 ? "#16a34a" : "#ef4444";
//         return <p className="m-0" style={{ color }}>${eff ? parseFloat(eff).toFixed(2) : "0.00"}</p>;
//       },
//     },
//     { title: "Status", dataIndex: "status", width: 140, align: "center", render: (s) => <Tag color={statusColor(s)}>{s}</Tag> },
//     { title: "Seller", dataIndex: "seller_name", width: 180, ellipsis: true, render: (v) => (v ? <p className="m-0">{v}</p> : "—") },
//     { title: "Market", dataIndex: "market", width: 100, ellipsis: true, render: (v) => (v ? <p className="m-0">{v}</p> : "—") },
//     { title: "Seller Price", dataIndex: "sellers_price", width: 200, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
//     { title: "Shipping charges", dataIndex: "shipping_charges", width: 200, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
//     { title: "Tax", dataIndex: "taxes", width: 100, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
//     { title: "Target Cost", dataIndex: "target_total_cost", width: 130, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
//     { title: "Actual Cost", dataIndex: "total_actual_cost", width: 130, align: "right", render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—") },
//   ];

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
//       size={screens.xs ? "middle" : "large"}
//     />
//   ) : null;

//   const clearAll = () => {
//     setStatusFilter("");
//     setSearchTerm("");
//     setDateRange([]);
//     setSelectedPurchaser(null);
//     setPage(1);
//     fetchListings();
//   };

//   /* --------------------------- render --------------------------- */
//   if (!rolesLoaded) {
//     return (
//       <div style={{ display: "grid", placeItems: "center", height: 240 }}>
//         <Spin />
//       </div>
//     );
//   }

//   // Permission notices
//   if (isAdmin && !canSeeAllAssigned) {
//     return (
//       <Card bodyStyle={{ padding: 20 }} style={{ borderRadius: 16 }}>
//         <Empty
//           description={
//             <div className="text-center">
//               <div className="font-semibold">No permission to view “All Assigned”</div>
//               <div className="text-gray-500">Ask an admin to enable Purchaser → “all assigned”.</div>
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
//               <div className="font-semibold">No permission to view “Assigned to Me”</div>
//               <div className="text-gray-500">Ask an admin to enable Purchaser → “assigned to me”.</div>
//             </div>
//           }
//         />
//       </Card>
//     );
//   }

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 30 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.6, ease: "easeOut" }}
//     >
//       {/* <PurchaserHeaderCard total={total} onRefresh={handleRefreshClick} isRefreshing={isRefreshing} screens={screens} /> */}

//       <PurchaserFilters
//         screens={screens}
//         statusFilter={statusFilter}
//         setStatusFilter={setStatusFilter}
//         searchTerm={searchTerm}
//         setSearchTerm={setSearchTerm}
//         dateRange={dateRange}
//         setDateRange={setDateRange}
//         AdminScopeControl={AdminScopeControl}
//         onClear={clearAll}
//         showStatusNote="Status filter applies on Listings page"
//       />

//       <Table
//         locale={{ emptyText: <Empty description="No listings found for your filters" /> }}
//         dataSource={requests}
//         columns={columns}
//         rowKey={(rec) => rec._id}
//         loading={loading}
//         size={screens.md ? "middle" : "small"}
//         pagination={false}
//         onRow={(record) => ({
//           onClick: () => {
//             const id = record._id || record.id;
//             if (id) navigate(`/requests/${id}`);
//           },
//           style: { cursor: "pointer" },
//         })}
//         rowClassName={() => "row-clickable"}
//         scroll={{ x: "max-content" }}
//         tableLayout="fixed"
//         sticky
//         expandable={{
//           expandedRowRender: (record) => (
//             <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
//           ),
//           rowExpandable: (record) => Array.isArray(record.items) && record.items.length > 0,
//         }}
//       />
//       <SleekPagination
//         page={page}
//         setPage={(p) => setPage(typeof p === "number" ? p : 1)}
//         limit={limit}
//         setLimit={setLimit}
//         total={total}
//       />

//       <style>{`.row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }`}</style>
//     </motion.div>
//   );
// }

// src/pages/purchaser/PurchaserListingsPage.jsx
// Identical to Assigned page, except:
// - endpoint is /api/v1/sourcing/all-sourcing
// - statusFilter IS applied
// - admins see everyone (remove mine) — BUT gated by "all assigned" permission

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Table,
  message,
  Tag,
  Select,
  Grid,
  Empty,
  Spin,
  Card,
  Tabs,
} from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import apiClient from "../../api/client";
import SleekPagination from "./components/SleekPagination";
import {
  normalizeRequests,
  statusColor,
  num as safeNum,
  ExpandedItemsTable,
} from "./utils/PurchaseTableUtils";
// import PurchaserHeaderCard from "./components/PurchaserHeaderCard";
import PurchaserFilters from "./components/PurchaserFilters";

const { useBreakpoint } = Grid;

/* --------------------------- helpers --------------------------- */
const lower = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase();

const pickRows = (body) =>
  Array.isArray(body)
    ? body
    : body?.docs || body?.data || body?.results || body?.items || [];

/** Parse Purchaser permissions from /api/v1/role/all */
const extractPurchaserPerms = (roleObj) => {
  const access = Array.isArray(roleObj?.access) ? roleObj.access : [];
  const purchaser = access.find((a) => lower(a?.app) === "purchaser");
  const menu = Array.isArray(purchaser?.menu) ? purchaser.menu.map(lower) : [];
  return {
    canSeeAssignedMine: menu.includes("assigned to me"),
    canSeeAllAssigned: menu.includes("all assigned"),
  };
};

/** Debounced purchaser search for the admin scope control */
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

/* ------------------------ Status Tabs Config ----------------------- */
/** Keys are tab keys; values are the status strings sent to the server.
 * Use "" (empty) for 'All' so the API doesn't filter by status.
 */
const TAB_KEY_TO_STATUS = {
  ALL: "",
  Pending: "Pending",
  Approved: "Approved",
  Purchased: "Purchased",
  Received: "Received",
  Completed: "Completed",
  Rejected: "Rejected",
  Cancelled: "Cancelled",
};
// Build Tab items once (labels = keys; keys are stable)
const STATUS_TABS = Object.keys(TAB_KEY_TO_STATUS).map((k) => ({
  key: k,
  label: k === "ALL" ? "All" : k,
}));

export default function PurchaserListingsPage() {
  const { user: authUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Robust admin check
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

  // ---- status synced with URL (?status=Pending) via Tabs
  const initialStatusFromUrl = useMemo(
    () => searchParams.get("status") || "",
    [searchParams]
  );
  const [statusFilter, setStatusFilter] = useState(initialStatusFromUrl);

  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [selectedPurchaser, setSelectedPurchaser] = useState(null);

  const {
    options: purchaserOptions,
    loading: purchaserLoading,
    debouncedSearch: purchaserSearch,
    fetchInitial: fetchInitialPurchasers,
  } = usePurchaserSearch();

  const screens = useBreakpoint();
  const navigate = useNavigate();

  // Keep URL in sync when statusFilter changes
  useEffect(() => {
    const current = searchParams.get("status") || "";
    if (statusFilter !== current) {
      const next = new URLSearchParams(searchParams);
      if (statusFilter) next.set("status", statusFilter);
      else next.delete("status");
      setSearchParams(next, { replace: true });
    }
  }, [statusFilter, searchParams, setSearchParams]);

  // Reset page when filters change
  useEffect(
    () => setPage(1),
    [statusFilter, searchTerm, dateRange, selectedPurchaser]
  );

  // Build params only when the viewer has permission
  const serverParams = useMemo(() => {
    const params = {};
    if (isAdmin) {
      if (!canSeeAllAssigned) return null; // admin but no permission
      if (selectedPurchaser?.value)
        params.purchaser_id = selectedPurchaser.value;
      // admins: show everyone; do NOT set mine
    } else {
      if (!canSeeAssignedMine) return null; // non-admin but no permission
      params.mine = true; // non-admins limited to themselves
    }
    if (statusFilter) params.status = statusFilter;

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
    statusFilter,
    dateRange,
    searchTerm,
  ]);

  const fetchListings = useCallback(async () => {
    // Guard by permissions
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
      const rows = pickRows(data);
      setRequests(normalizeRequests(rows));
      setTotal(Number(data?.total ?? rows.length ?? 0));
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
  }, [serverParams, page, limit]);

  useEffect(() => {
    if (!rolesLoaded) return;
    fetchListings();
  }, [rolesLoaded, fetchListings]);

  const handleRefreshClick = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchListings();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchListings]);

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
        <strong style={{ color: "#2c2c2c" }}>
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
      width: 140,
      align: "right",
      render: (_, rec) => {
        const eff =
          typeof rec.purchase_efficiency === "number"
            ? rec.purchase_efficiency
            : safeNum(rec.target_total_cost) - safeNum(rec.total_actual_cost);
        const color = eff >= 0 ? "#16a34a" : "#ef4444";
        return (
          <p className="m-0" style={{ color }}>
            ${eff ? parseFloat(eff).toFixed(2) : "0.00"}
          </p>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
      align: "center",
      render: (s) => <Tag color={statusColor(s)}>{s}</Tag>,
    },
    {
      title: "Seller",
      dataIndex: "seller_name",
      width: 180,
      ellipsis: true,
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: "Market",
      dataIndex: "market",
      width: 100,
      ellipsis: true,
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: "Seller Price",
      dataIndex: "sellers_price",
      width: 200,
      align: "right",
      render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—"),
    },
    {
      title: "Shipping charges",
      dataIndex: "shipping_charges",
      width: 200,
      align: "right",
      render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—"),
    },
    {
      title: "Tax",
      dataIndex: "taxes",
      width: 100,
      align: "right",
      render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—"),
    },
    {
      title: "Target Cost",
      dataIndex: "target_total_cost",
      width: 130,
      align: "right",
      render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—"),
    },
    {
      title: "Actual Cost",
      dataIndex: "total_actual_cost",
      width: 130,
      align: "right",
      render: (p) => (p ? <>${parseFloat(p).toFixed(2)}</> : "—"),
    },
  ];

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
      size={screens.xs ? "middle" : "large"}
    />
  ) : null;

  const clearAll = () => {
    setStatusFilter("");
    setSearchTerm("");
    setDateRange([]);
    setSelectedPurchaser(null);
    setPage(1);
    fetchListings();
  };

  /* --------------------------- Tabs wiring --------------------------- */
  // Active tab key is derived from statusFilter
  const activeTabKey = useMemo(() => {
    // Find the tab whose mapped status equals our statusFilter
    const entry = Object.entries(TAB_KEY_TO_STATUS).find(
      ([, status]) => status === statusFilter
    );
    return entry ? entry[0] : "ALL";
  }, [statusFilter]);

  const onTabChange = (key) => {
    const nextStatus = TAB_KEY_TO_STATUS[key] ?? "";
    setStatusFilter(nextStatus); // triggers list reload via effects
  };

  /* --------------------------- render --------------------------- */
  if (!rolesLoaded) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: 240 }}>
        <Spin />
      </div>
    );
  }

  // Permission notices
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Top Tabs (filter by status) */}
      {/* <Tabs
        items={STATUS_TABS}
        activeKey={activeTabKey}
        onChange={onTabChange}
        destroyInactiveTabPane={false}
        style={{ marginBottom: 8 }}
      /> */}
      <Tabs
        items={STATUS_TABS}
        activeKey={activeTabKey}
        onChange={onTabChange}
        destroyInactiveTabPane={false}
        type="card"
        style={{ marginBottom: 16, fontWeight: 400 }}
        tabBarStyle={{ fontSize: 16 }}
      />

      {/* <PurchaserHeaderCard total={total} onRefresh={handleRefreshClick} isRefreshing={isRefreshing} screens={screens} /> */}

      <PurchaserFilters
        screens={screens}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        dateRange={dateRange}
        setDateRange={setDateRange}
        AdminScopeControl={AdminScopeControl}
        onClear={clearAll}
        showStatusNote="Status tabs & filter apply on Listings page"
      />

      <Table
        locale={{
          emptyText: <Empty description="No listings found for your filters" />,
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
            <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
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

      <style>{`.row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }`}</style>
    </motion.div>
  );
}
