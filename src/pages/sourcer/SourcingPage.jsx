
// // // // // import React, { useEffect, useState, useCallback, useMemo } from "react";
// // // // // import {
// // // // //   Card,
// // // // //   Table,
// // // // //   Space,
// // // // //   message,
// // // // //   Spin,
// // // // //   Input,
// // // // //   Select,
// // // // //   DatePicker,
// // // // //   Empty,
// // // // //   Row,
// // // // //   Col,
// // // // // } from "antd";
// // // // // import { motion } from "framer-motion";
// // // // // import { useNavigate, useLocation } from "react-router-dom";
// // // // // import dayjs from "dayjs";

// // // // // import apiClient from "../../api/client";
// // // // // import SourcingImportModal from "./SourcingImportModal";
// // // // // import { RefreshCcw, Plus } from "lucide-react";
// // // // // import { useAuth } from "../../contexts/AuthContext";
// // // // // import { statusPill } from "./utils/helpers";
// // // // // import { getSourcingColumns, makeItemsTable } from "./utils/sourcingColumns";
// // // // // import SleekPagination from "./components/Sleekpagination";

// // // // // const { Option } = Select;
// // // // // const { RangePicker } = DatePicker;

// // // // // /* ---------- UI ---------- */
// // // // // const gradientCardStyle = {
// // // // //   borderRadius: 16,
// // // // //   background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
// // // // //   boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
// // // // //   border: "1px solid #e6edff",
// // // // // };
// // // // // const tableCardStyle = {
// // // // //   background: "#fff",
// // // // //   borderRadius: 12,
// // // // //   border: "1px solid #eef2ff",
// // // // //   overflow: "hidden",
// // // // // };

// // // // // /* ---------- normalize possible API shapes safely ---------- */
// // // // // const normalizeArray = (data) =>
// // // // //   Array.isArray(data)
// // // // //     ? data
// // // // //     : data?.all_requests ||
// // // // //       data?.recent_requests ||
// // // // //       data?.results ||
// // // // //       data?.items ||
// // // // //       data?.data ||
// // // // //       [];

// // // // // /* ---------- Component ---------- */
// // // // // export default function SourcingOrdersPage() {
// // // // //   const { user } = useAuth();
// // // // //   const role = user?.roles?.role || user?.role || "";
// // // // //   const isAdmin = role === "admin";
// // // // //   const isSourcer = role === "sourcer";
// // // // //   const isPurchaser = role === "purchaser";
// // // // //   const canEdit = isAdmin || isSourcer;

// // // // //   const [orders, setOrders] = useState([]);
// // // // //   const [loading, setLoading] = useState(true);
// // // // //   const [importOpen, setImportOpen] = useState(false);

// // // // //   // pagination
// // // // //   const [page, setPage] = useState(1);
// // // // //   const [limit, setLimit] = useState(20);

// // // // //   const navigate = useNavigate();
// // // // //   const location = useLocation();
// // // // //   const params = new URLSearchParams(location.search);
// // // // //   const sourcerQueryId = params.get("sourcer_id"); // from /sourcing/orders?sourcer_id=...

// // // // //   // show the New Sourcing button ONLY on exact /sourcing/orders
// // // // //   const isOrdersRoute = location.pathname === "/sourcing/orders";

// // // // //   const [filters, setFilters] = useState({
// // // // //     product: "",
// // // // //     sku: "",
// // // // //     status: "",
// // // // //     dateRange: null,
// // // // //     sourcingId: "",
// // // // //   });

// // // // //   /* ---------- Endpoint by role ---------- */
// // // // //   const endpoint = useMemo(() => {
// // // // //     if (isAdmin) return "/api/v1/sourcing/all-sourcing";
// // // // //     if (isPurchaser) return "/api/v1/sourcing/assigned";
// // // // //     return "/api/v1/sourcing/mine";
// // // // //   }, [isAdmin, isPurchaser]);

// // // // //   /* ---------- Load Orders ---------- */
// // // // //   const fetchOrders = useCallback(async () => {
// // // // //     if (!endpoint) return;
// // // // //     setLoading(true);
// // // // //     try {
// // // // //       const config = {};
// // // // //       if (
// // // // //         isAdmin &&
// // // // //         sourcerQueryId &&
// // // // //         endpoint === "/api/v1/sourcing/all-sourcing"
// // // // //       ) {
// // // // //         config.params = { sourcer_id: sourcerQueryId };
// // // // //       }
// // // // //       const { data } = await apiClient.get(endpoint, config);
// // // // //       setOrders(normalizeArray(data));
// // // // //     } catch (err) {
// // // // //       console.error(err);
// // // // //       message.error("Failed to load sourcing orders.");
// // // // //     } finally {
// // // // //       setLoading(false);
// // // // //     }
// // // // //   }, [endpoint, isAdmin, sourcerQueryId]);

// // // // //   useEffect(() => {
// // // // //     fetchOrders();
// // // // //   }, [fetchOrders]);


// // // // //   // under other useState hooks
// // // // // const [canCreateOrder, setCanCreateOrder] = useState(false);

// // // // // // helper: does this role include app "sourcer" with menu item "create order"?
// // // // // const hasCreateOrderPermission = (roleObj) => {
// // // // //   if (!roleObj || !Array.isArray(roleObj.access)) return false;
// // // // //   return roleObj.access.some((acc) => {
// // // // //     const app = String(acc?.app || "").toLowerCase();
// // // // //     if (app !== "sourcer") return false;
// // // // //     const menu = Array.isArray(acc?.menu) ? acc.menu : [];
// // // // //     return menu.some((m) => String(m).toLowerCase() === "create order");
// // // // //   });
// // // // // };

// // // // //   useEffect(() => {
// // // // //   let cancelled = false;

// // // // //   (async () => {
// // // // //     try {
// // // // //       const { data } = await apiClient.get("/api/v1/role/all");
// // // // //       console.log("Roles (/api/v1/role/all):", data);

// // // // //       // figure out the user's role string (normalize casing)
// // // // //       const userRoleName =
// // // // //         String(user?.roles?.role || user?.role || "").trim().toLowerCase();

// // // // //       // find matching role object from API (case-insensitive match on role name)
// // // // //       const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
// // // // //       const matchedRole =
// // // // //         rolesArr.find(
// // // // //           (r) => String(r?.role || "").trim().toLowerCase() === userRoleName
// // // // //         ) || null;

// // // // //       const allowed = hasCreateOrderPermission(matchedRole);

// // // // //       if (!cancelled) setCanCreateOrder(!!allowed);
// // // // //     } catch (err) {
// // // // //       // If the roles API fails, we default to *no* permission to be safe.
// // // // //       console.error(
// // // // //         "Failed to fetch roles (/api/v1/role/all):",
// // // // //         err?.response?.data || err?.message || err
// // // // //       );
// // // // //       if (!cancelled) setCanCreateOrder(false);
// // // // //     }
// // // // //   })();

// // // // //   return () => {
// // // // //     cancelled = true;
// // // // //   };
// // // // // }, [user]);

// // // // //   /* ---------- Delete Order ---------- */
// // // // //   const handleDeleteOrder = useCallback(
// // // // //     async (orderId) => {
// // // // //       if (!orderId) return;
// // // // //       try {
// // // // //         await apiClient.delete(`/api/v1/sourcing/${orderId}`);
// // // // //         message.success("Sourcing request deleted");
// // // // //         fetchOrders();
// // // // //       } catch (err) {
// // // // //         console.error(err);
// // // // //         message.error(
// // // // //           err?.response?.data?.message ||
// // // // //             err?.response?.data?.detail ||
// // // // //             "Delete failed"
// // // // //         );
// // // // //       }
// // // // //     },
// // // // //     [fetchOrders]
// // // // //   );

// // // // //   /* ---------- Filters ---------- */
// // // // //   const filteredOrders = useMemo(() => {
// // // // //     return orders.filter((order) => {
// // // // //       const items = order.items || [];

// // // // //       const matchesProduct =
// // // // //         !filters.product ||
// // // // //         items.some((i) =>
// // // // //           (i.name || i.product_name || "")
// // // // //             .toLowerCase()
// // // // //             .includes((filters.product || "").toLowerCase())
// // // // //         );

// // // // //       const matchesSku =
// // // // //         !filters.sku ||
// // // // //         items.some((i) =>
// // // // //           (i.sku || "")
// // // // //             .toLowerCase()
// // // // //             .includes((filters.sku || "").toLowerCase())
// // // // //         );

// // // // //       const matchesStatus = !filters.status || order.status === filters.status;

// // // // //       const created = order.createdAt || order.created_at || order.created_on;
// // // // //       const matchesDate =
// // // // //         !filters.dateRange ||
// // // // //         (created &&
// // // // //           dayjs(created).isAfter(filters.dateRange[0].startOf("day")) &&
// // // // //           dayjs(created).isBefore(filters.dateRange[1].endOf("day")));

// // // // //       const idForFilter = String(
// // // // //         order.sourcing_id ?? order._id ?? order.id ?? ""
// // // // //       );
// // // // //       const matchesSourcingId =
// // // // //         !filters.sourcingId || idForFilter.includes(String(filters.sourcingId));

// // // // //       return (
// // // // //         matchesProduct &&
// // // // //         matchesSku &&
// // // // //         matchesStatus &&
// // // // //         matchesDate &&
// // // // //         matchesSourcingId
// // // // //       );
// // // // //     });
// // // // //   }, [orders, filters]);

// // // // //   /* ---------- Pagination reactions ---------- */
// // // // //   useEffect(() => {
// // // // //     setPage(1);
// // // // //   }, [filters]);

// // // // //   useEffect(() => {
// // // // //     const totalPages = Math.max(
// // // // //       1,
// // // // //       Math.ceil((filteredOrders.length || 0) / (limit || 1))
// // // // //     );
// // // // //     if (page > totalPages) setPage(totalPages);
// // // // //     // eslint-disable-next-line react-hooks/exhaustive-deps
// // // // //   }, [filteredOrders.length, limit]);

// // // // //   const total = filteredOrders.length;
// // // // //   const paginatedOrders = useMemo(() => {
// // // // //     const start = (page - 1) * limit;
// // // // //     const end = start + limit;
// // // // //     return filteredOrders.slice(start, end);
// // // // //   }, [filteredOrders, page, limit]);

// // // // //   /* ---------- Columns (shared) ---------- */
// // // // //   const columns = useMemo(
// // // // //     () =>
// // // // //       getSourcingColumns({
// // // // //         statusPill,
// // // // //         canEdit,
// // // // //         navigate,
// // // // //         handleDeleteOrder,
// // // // //       }),
// // // // //     [canEdit, navigate, handleDeleteOrder]
// // // // //   );

// // // // //   const pageTitle = isAdmin
// // // // //     ? sourcerQueryId
// // // // //       ? "All Sourcing Orders (Selected Sourcer)"
// // // // //       : "All Sourcing Orders"
// // // // //     : isPurchaser
// // // // //     ? "Assigned Requests"
// // // // //     : "My Sourcing Orders";

// // // // //   if (loading) {
// // // // //     return (
// // // // //       <div
// // // // //         style={{
// // // // //           display: "flex",
// // // // //           justifyContent: "center",
// // // // //           paddingTop: "4rem",
// // // // //         }}
// // // // //       >
// // // // //         <Spin />
// // // // //       </div>
// // // // //     );
// // // // //   }

// // // // //   return (
// // // // //     <>
// // // // //       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
// // // // //         <Card
// // // // //           title={<span style={{ fontWeight: 700, letterSpacing: 0.2 }}>{pageTitle}</span>}
// // // // //           extra={
// // // // //             <Space>
// // // // //               <button
// // // // //                 type="button"
// // // // //                 onClick={fetchOrders}
// // // // //                 className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700
// // // // //                            border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-md
// // // // //                            w-full md:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
// // // // //               >
// // // // //                 <RefreshCcw className="h-4 w-4" />
// // // // //                 Refresh
// // // // //               </button>

// // // // //               {canEdit && (
// // // // //                 <button
// // // // //                   onClick={() => setImportOpen(true)}
// // // // //                   className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
// // // // //                 >
// // // // //                   Import CSV
// // // // //                 </button>
// // // // //               )}

// // // // //               {/* Show "New Sourcing" only on /sourcing/orders */}
// // // // //               {canEdit && isOrdersRoute &&  canCreateOrder && (
// // // // //                 <button
// // // // //                   onClick={() => navigate("/sourcing/orders/new")}
// // // // //                   className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
// // // // //                 >
// // // // //                   <Plus className="h-4 w-4" aria-hidden="true" />
// // // // //                   New Sourcing
// // // // //                 </button>
// // // // //               )}
// // // // //             </Space>
// // // // //           }
// // // // //           style={gradientCardStyle}
// // // // //           bodyStyle={{ padding: 18 }}
// // // // //         >
// // // // //           <Row gutter={[16, 16]} className="mb-2">
// // // // //             <Col xs={24} sm={12} md={8} lg={6}>
// // // // //               <div>
// // // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // // //                   Product Name
// // // // //                 </label>
// // // // //                 <Input
// // // // //                   placeholder="Filter by Product Name"
// // // // //                   allowClear
// // // // //                   onChange={(e) =>
// // // // //                     setFilters((f) => ({ ...f, product: e.target.value }))
// // // // //                   }
// // // // //                   size="large"
// // // // //                   className="w-full rounded-lg"
// // // // //                 />
// // // // //               </div>
// // // // //             </Col>

// // // // //             <Col xs={24} sm={12} md={8} lg={5}>
// // // // //               <div>
// // // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // // //                   SKU
// // // // //                 </label>
// // // // //                 <Input
// // // // //                   placeholder="Filter by SKU"
// // // // //                   allowClear
// // // // //                   onChange={(e) =>
// // // // //                     setFilters((f) => ({ ...f, sku: e.target.value }))
// // // // //                   }
// // // // //                   size="large"
// // // // //                   className="w-full rounded-lg"
// // // // //                 />
// // // // //               </div>
// // // // //             </Col>

// // // // //             <Col xs={24} sm={12} md={8} lg={5}>
// // // // //               <div>
// // // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // // //                   Status
// // // // //                 </label>
// // // // //                 <Select
// // // // //                   placeholder="Filter by Status"
// // // // //                   allowClear
// // // // //                   className="w-full rounded-lg"
// // // // //                   onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
// // // // //                   dropdownStyle={{ borderRadius: 10 }}
// // // // //                   size="large"
// // // // //                 >
// // // // //                   <Option value="Pending">Pending</Option>
// // // // //                   <Option value="Assigned">Assigned</Option>
// // // // //                   <Option value="Offer">Offer</Option>
// // // // //                   <Option value="Purchased">Purchased</Option>
// // // // //                   <Option value="Disapproved">Disapproved</Option>
// // // // //                   <Option value="Sold">Sold</Option>
// // // // //                   <Option value="Hold">Hold</Option>
// // // // //                   <Option value="Seller Rejected">Seller Rejected</Option>
// // // // //                   <Option value="Dropshipped">Dropshipped</Option>
// // // // //                   <Option value="Returned">Returned</Option>
// // // // //                   <Option value="Completed">Completed</Option>
// // // // //                 </Select>
// // // // //               </div>
// // // // //             </Col>

// // // // //             <Col xs={24} sm={12} md={12} lg={5}>
// // // // //               <div>
// // // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // // //                   Date Range
// // // // //                 </label>
// // // // //                 <RangePicker
// // // // //                   className="w-full rounded-lg"
// // // // //                   size="large"
// // // // //                   onChange={(range) =>
// // // // //                     setFilters((f) => ({ ...f, dateRange: range }))
// // // // //                   }
// // // // //                 />
// // // // //               </div>
// // // // //             </Col>

// // // // //             <Col xs={24} sm={12} md={12} lg={3}>
// // // // //               <div>
// // // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // // //                   Sourcing ID
// // // // //                 </label>
// // // // //                 <Input
// // // // //                   placeholder="Sourcing ID (#)"
// // // // //                   allowClear
// // // // //                   onChange={(e) =>
// // // // //                     setFilters((f) => ({ ...f, sourcingId: e.target.value }))
// // // // //                   }
// // // // //                   size="large"
// // // // //                   className="w-full rounded-lg"
// // // // //                 />
// // // // //               </div>
// // // // //             </Col>
// // // // //           </Row>

// // // // //           <div style={tableCardStyle}>
// // // // //             <Table
// // // // //               dataSource={paginatedOrders}
// // // // //               columns={columns}
// // // // //               rowKey={(rec) => rec._id || rec.id}
// // // // //               expandable={{ expandedRowRender: makeItemsTable }}
// // // // //               pagination={false}
// // // // //               size="middle"
// // // // //               bordered={false}
// // // // //               sticky
// // // // //               scroll={{ x: 1350, y: 520 }}
// // // // //               onRow={() => ({
// // // // //                 style: { transition: "background 0.2s" },
// // // // //                 onMouseEnter: (e) =>
// // // // //                   (e.currentTarget.style.background = "#fafbff"),
// // // // //                 onMouseLeave: (e) =>
// // // // //                   (e.currentTarget.style.background = "unset"),
// // // // //               })}
// // // // //               locale={{
// // // // //                 emptyText: (
// // // // //                   <Empty
// // // // //                     image={Empty.PRESENTED_IMAGE_SIMPLE}
// // // // //                     description="No sourcing orders found"
// // // // //                   />
// // // // //                 ),
// // // // //               }}
// // // // //             />

// // // // //             <SleekPagination
// // // // //               page={page}
// // // // //               setPage={setPage}
// // // // //               limit={limit}
// // // // //               setLimit={setLimit}
// // // // //               total={total}
// // // // //             />
// // // // //           </div>
// // // // //         </Card>
// // // // //       </motion.div>

// // // // //       <SourcingImportModal
// // // // //         open={importOpen}
// // // // //         onClose={() => setImportOpen(false)}
// // // // //         orders={orders}
// // // // //         onImported={fetchOrders}
// // // // //       />
// // // // //     </>
// // // // //   );
// // // // // }



// // // // // /src/pages/sourcer/SourcingOrdersPage.jsx
// // // // import React, { useEffect, useState, useCallback, useMemo } from "react";
// // // // import {
// // // //   Card,
// // // //   Table,
// // // //   Space,
// // // //   message,
// // // //   Spin,
// // // //   Input,
// // // //   Select,
// // // //   DatePicker,
// // // //   Empty,
// // // //   Row,
// // // //   Col,
// // // // } from "antd";
// // // // import { motion } from "framer-motion";
// // // // import { useNavigate, useLocation } from "react-router-dom";
// // // // import dayjs from "dayjs";

// // // // import apiClient from "../../api/client";
// // // // import SourcingImportModal from "./SourcingImportModal";
// // // // import { RefreshCcw, Plus } from "lucide-react";
// // // // import { useAuth } from "../../contexts/AuthContext";
// // // // import { statusPill } from "./utils/helpers";
// // // // import { getSourcingColumns, makeItemsTable } from "./utils/sourcingColumns";
// // // // import SleekPagination from "./components/Sleekpagination";

// // // // const { Option } = Select;
// // // // const { RangePicker } = DatePicker;

// // // // /* ---------- UI ---------- */
// // // // const gradientCardStyle = {
// // // //   borderRadius: 16,
// // // //   background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
// // // //   boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
// // // //   border: "1px solid #e6edff",
// // // // };
// // // // const tableCardStyle = {
// // // //   background: "#fff",
// // // //   borderRadius: 12,
// // // //   border: "1px solid #eef2ff",
// // // //   overflow: "hidden",
// // // // };

// // // // /* ---------- normalize possible API shapes safely ---------- */
// // // // const normalizeArray = (data) =>
// // // //   Array.isArray(data)
// // // //     ? data
// // // //     : data?.all_requests ||
// // // //       data?.recent_requests ||
// // // //       data?.results ||
// // // //       data?.items ||
// // // //       data?.data ||
// // // //       [];

// // // // /* ---------- permission helpers ---------- */
// // // // const lower = (v) => String(v || "").trim().toLowerCase();

// // // // const sourcerPermsFromRole = (roleObj) => {
// // // //   const acc = (roleObj?.access || []).find((a) => lower(a?.app) === "sourcer");
// // // //   const menu = Array.isArray(acc?.menu) ? acc.menu.map(lower) : [];
// // // //   return {
// // // //     createOrder: menu.includes("create order"),
// // // //     myRequests: menu.includes("my requests"),
// // // //     editMyRequests: menu.includes("edit my requests"),
// // // //     cancelMyRequests: menu.includes("cancel my requests"),
// // // //   };
// // // // };

// // // // export default function SourcingOrdersPage() {
// // // //   const { user } = useAuth();

// // // //   // Basic role tags for non-sourcer endpoints
// // // //   const roleName = lower(user?.roles?.role || user?.role || "");
// // // //   const isAdmin = roleName === "admin";
// // // //   const isPurchaser = roleName === "purchaser";

// // // //   // Fine-grained sourcer permissions (from /api/v1/role/all)
// // // //   const [canCreateOrder, setCanCreateOrder] = useState(false);
// // // //   const [canViewMyRequests, setCanViewMyRequests] = useState(false);
// // // //   const [canEditMyRequests, setCanEditMyRequests] = useState(false);
// // // //   const [canCancelMyRequests, setCanCancelMyRequests] = useState(false);

// // // //   // Data + UI
// // // //   const [orders, setOrders] = useState([]);
// // // //   const [loading, setLoading] = useState(true);
// // // //   const [importOpen, setImportOpen] = useState(false);

// // // //   // pagination
// // // //   const [page, setPage] = useState(1);
// // // //   const [limit, setLimit] = useState(20);

// // // //   const navigate = useNavigate();
// // // //   const location = useLocation();
// // // //   const params = new URLSearchParams(location.search);
// // // //   const sourcerQueryId = params.get("sourcer_id"); // from /sourcing/orders?sourcer_id=...

// // // //   // show the New Sourcing button ONLY on exact /sourcing/orders
// // // //   const isOrdersRoute = location.pathname === "/sourcing/orders";

// // // //   const [filters, setFilters] = useState({
// // // //     product: "",
// // // //     sku: "",
// // // //     status: "",
// // // //     dateRange: null,
// // // //     sourcingId: "",
// // // //   });

// // // //   /* ---------- Fetch roles → set permissions ---------- */
// // // //   useEffect(() => {
// // // //     let cancelled = false;

// // // //     (async () => {
// // // //       try {
// // // //         const { data } = await apiClient.get("/api/v1/role/all");
// // // //         console.log("Roles (/api/v1/role/all):", data);

// // // //         const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
// // // //         const matchedRole =
// // // //           rolesArr.find((r) => lower(r?.role) === roleName) || null;

// // // //         const {
// // // //           createOrder,
// // // //           myRequests,
// // // //           editMyRequests,
// // // //           cancelMyRequests,
// // // //         } = sourcerPermsFromRole(matchedRole);

// // // //         if (!cancelled) {
// // // //           setCanCreateOrder(!!createOrder);
// // // //           setCanViewMyRequests(!!myRequests);
// // // //           setCanEditMyRequests(!!editMyRequests);
// // // //           setCanCancelMyRequests(!!cancelMyRequests);
// // // //         }
// // // //       } catch (err) {
// // // //         console.error(
// // // //           "Failed to fetch roles (/api/v1/role/all):",
// // // //           err?.response?.data || err?.message || err
// // // //         );
// // // //         if (!cancelled) {
// // // //           // Secure defaults
// // // //           setCanCreateOrder(false);
// // // //           setCanViewMyRequests(false);
// // // //           setCanEditMyRequests(false);
// // // //           setCanCancelMyRequests(false);
// // // //         }
// // // //       }
// // // //     })();

// // // //     return () => {
// // // //       cancelled = true;
// // // //     };
// // // //   }, [roleName]);

// // // //   /* ---------- Choose endpoint by role/permission ---------- */
// // // //   const endpoint = useMemo(() => {
// // // //     if (isAdmin) return "/api/v1/sourcing/all-sourcing";
// // // //     if (isPurchaser) return "/api/v1/sourcing/assigned";
// // // //     // Non-admin/non-purchaser:
// // // //     if (canViewMyRequests) return "/api/v1/sourcing/mine";
// // // //     // No permission to view "my requests" → skip fetching
// // // //     return "";
// // // //   }, [isAdmin, isPurchaser, canViewMyRequests]);

// // // //   /* ---------- Load Orders ---------- */
// // // //   const fetchOrders = useCallback(async () => {
// // // //     if (!endpoint) {
// // // //       setOrders([]);
// // // //       setLoading(false);
// // // //       return;
// // // //     }
// // // //     setLoading(true);
// // // //     try {
// // // //       const config = {};
// // // //       if (
// // // //         isAdmin &&
// // // //         sourcerQueryId &&
// // // //         endpoint === "/api/v1/sourcing/all-sourcing"
// // // //       ) {
// // // //         config.params = { sourcer_id: sourcerQueryId };
// // // //       }
// // // //       const { data } = await apiClient.get(endpoint, config);
// // // //       setOrders(normalizeArray(data));
// // // //     } catch (err) {
// // // //       console.error(err);
// // // //       message.error("Failed to load sourcing orders.");
// // // //     } finally {
// // // //       setLoading(false);
// // // //     }
// // // //   }, [endpoint, isAdmin, sourcerQueryId]);

// // // //   useEffect(() => {
// // // //     fetchOrders();
// // // //   }, [fetchOrders]);

// // // //   /* ---------- Delete Order ---------- */
// // // //   const handleDeleteOrder = useCallback(
// // // //     async (orderId) => {
// // // //       if (!orderId) return;
// // // //       try {
// // // //         await apiClient.delete(`/api/v1/sourcing/${orderId}`);
// // // //         message.success("Sourcing request deleted");
// // // //         fetchOrders();
// // // //       } catch (err) {
// // // //         console.error(err);
// // // //         message.error(
// // // //           err?.response?.data?.message ||
// // // //             err?.response?.data?.detail ||
// // // //             "Delete failed"
// // // //         );
// // // //       }
// // // //     },
// // // //     [fetchOrders]
// // // //   );

// // // //   /* ---------- Filters ---------- */
// // // //   const filteredOrders = useMemo(() => {
// // // //     return orders.filter((order) => {
// // // //       const items = order.items || [];

// // // //       const matchesProduct =
// // // //         !filters.product ||
// // // //         items.some((i) =>
// // // //           (i.name || i.product_name || "")
// // // //             .toLowerCase()
// // // //             .includes((filters.product || "").toLowerCase())
// // // //         );

// // // //       const matchesSku =
// // // //         !filters.sku ||
// // // //         items.some((i) =>
// // // //           (i.sku || "")
// // // //             .toLowerCase()
// // // //             .includes((filters.sku || "").toLowerCase())
// // // //         );

// // // //       const matchesStatus = !filters.status || order.status === filters.status;

// // // //       const created = order.createdAt || order.created_at || order.created_on;
// // // //       const matchesDate =
// // // //         !filters.dateRange ||
// // // //         (created &&
// // // //           dayjs(created).isAfter(filters.dateRange[0].startOf("day")) &&
// // // //           dayjs(created).isBefore(filters.dateRange[1].endOf("day")));

// // // //       const idForFilter = String(
// // // //         order.sourcing_id ?? order._id ?? order.id ?? ""
// // // //       );
// // // //       const matchesSourcingId =
// // // //         !filters.sourcingId || idForFilter.includes(String(filters.sourcingId));

// // // //       return (
// // // //         matchesProduct &&
// // // //         matchesSku &&
// // // //         matchesStatus &&
// // // //         matchesDate &&
// // // //         matchesSourcingId
// // // //       );
// // // //     });
// // // //   }, [orders, filters]);

// // // //   /* ---------- Pagination reactions ---------- */
// // // //   useEffect(() => {
// // // //     setPage(1);
// // // //   }, [filters]);

// // // //   useEffect(() => {
// // // //     const totalPages = Math.max(
// // // //       1,
// // // //       Math.ceil((filteredOrders.length || 0) / (limit || 1))
// // // //     );
// // // //     if (page > totalPages) setPage(totalPages);
// // // //     // eslint-disable-next-line react-hooks/exhaustive-deps
// // // //   }, [filteredOrders.length, limit]);

// // // //   const total = filteredOrders.length;
// // // //   const paginatedOrders = useMemo(() => {
// // // //     const start = (page - 1) * limit;
// // // //     const end = start + limit;
// // // //     return filteredOrders.slice(start, end);
// // // //   }, [filteredOrders, page, limit]);

// // // //   /* ---------- Columns (respect edit permission) ---------- */
// // // //   const columns = useMemo(
// // // //     () =>
// // // //       getSourcingColumns({
// // // //         statusPill,
// // // //         // Only allow editing if admin or explicitly allowed by role permissions
// // // //         canEdit: isAdmin || canEditMyRequests,
// // // //         navigate,
// // // //         handleDeleteOrder,
// // // //       }),
// // // //     [isAdmin, canEditMyRequests, navigate, handleDeleteOrder]
// // // //   );

// // // //   /* ---------- Loading ---------- */
// // // //   if (loading) {
// // // //     return (
// // // //       <div
// // // //         style={{
// // // //           display: "flex",
// // // //           justifyContent: "center",
// // // //           paddingTop: "4rem",
// // // //         }}
// // // //       >
// // // //         <Spin />
// // // //       </div>
// // // //     );
// // // //   }

// // // //   /* ---------- No "my requests" permission UX ---------- */
// // // //   if (!isAdmin && !isPurchaser && !canViewMyRequests) {
// // // //     return (
// // // //       <Card style={gradientCardStyle} bodyStyle={{ padding: 24 }}>
// // // //         <div className="text-center">
// // // //           <h3 className="text-lg font-semibold mb-1">
// // // //             No permission to view “My Requests”
// // // //           </h3>
// // // //           <p className="text-gray-600">
// // // //             Your role doesn’t include the <b>Sourcer → “my requests”</b>{" "}
// // // //             permission.
// // // //           </p>
// // // //           {canCreateOrder ? (
// // // //             <div className="mt-4">
// // // //               <button
// // // //                 onClick={() => navigate("/sourcing/orders/new")}
// // // //                 className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
// // // //               >
// // // //                 <Plus className="h-4 w-4" aria-hidden="true" />
// // // //                 Create a New Sourcing Order
// // // //               </button>
// // // //             </div>
// // // //           ) : null}
// // // //         </div>
// // // //       </Card>
// // // //     );
// // // //   }

// // // //   /* ---------- Page title ---------- */
// // // //   const pageTitle = isAdmin
// // // //     ? sourcerQueryId
// // // //       ? "All Sourcing Orders (Selected Sourcer)"
// // // //       : "All Sourcing Orders"
// // // //     : isPurchaser
// // // //     ? "Assigned Requests"
// // // //     : "My Sourcing Orders";

// // // //   /* ---------- Render ---------- */
// // // //   return (
// // // //     <>
// // // //       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
// // // //         <Card
// // // //           title={
// // // //             <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
// // // //               {pageTitle}
// // // //             </span>
// // // //           }
// // // //           extra={
// // // //             <Space>
// // // //               <button
// // // //                 type="button"
// // // //                 onClick={fetchOrders}
// // // //                 className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700
// // // //                            border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-md
// // // //                            w-full md:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
// // // //               >
// // // //                 <RefreshCcw className="h-4 w-4" />
// // // //                 Refresh
// // // //               </button>

// // // //               {(isAdmin || isPurchaser) && (
// // // //                 <button
// // // //                   onClick={() => setImportOpen(true)}
// // // //                   className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
// // // //                 >
// // // //                   Import CSV
// // // //                 </button>
// // // //               )}

// // // //               {/* Show "New Sourcing" only on /sourcing/orders AND if role grants 'create order' */}
// // // //               {isOrdersRoute && canCreateOrder && (
// // // //                 <button
// // // //                   onClick={() => navigate("/sourcing/orders/new")}
// // // //                   className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
// // // //                 >
// // // //                   <Plus className="h-4 w-4" aria-hidden="true" />
// // // //                   New Sourcing
// // // //                 </button>
// // // //               )}
// // // //             </Space>
// // // //           }
// // // //           style={gradientCardStyle}
// // // //           bodyStyle={{ padding: 18 }}
// // // //         >
// // // //           <Row gutter={[16, 16]} className="mb-2">
// // // //             <Col xs={24} sm={12} md={8} lg={6}>
// // // //               <div>
// // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // //                   Product Name
// // // //                 </label>
// // // //                 <Input
// // // //                   placeholder="Filter by Product Name"
// // // //                   allowClear
// // // //                   onChange={(e) =>
// // // //                     setFilters((f) => ({ ...f, product: e.target.value }))
// // // //                   }
// // // //                   size="large"
// // // //                   className="w-full rounded-lg"
// // // //                 />
// // // //               </div>
// // // //             </Col>

// // // //             <Col xs={24} sm={12} md={8} lg={5}>
// // // //               <div>
// // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // //                   SKU
// // // //                 </label>
// // // //                 <Input
// // // //                   placeholder="Filter by SKU"
// // // //                   allowClear
// // // //                   onChange={(e) =>
// // // //                     setFilters((f) => ({ ...f, sku: e.target.value }))
// // // //                   }
// // // //                   size="large"
// // // //                   className="w-full rounded-lg"
// // // //                 />
// // // //               </div>
// // // //             </Col>

// // // //             <Col xs={24} sm={12} md={8} lg={5}>
// // // //               <div>
// // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // //                   Status
// // // //                 </label>
// // // //                 <Select
// // // //                   placeholder="Filter by Status"
// // // //                   allowClear
// // // //                   className="w-full rounded-lg"
// // // //                   onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
// // // //                   dropdownStyle={{ borderRadius: 10 }}
// // // //                   size="large"
// // // //                 >
// // // //                   <Option value="Pending">Pending</Option>
// // // //                   <Option value="Assigned">Assigned</Option>
// // // //                   <Option value="Offer">Offer</Option>
// // // //                   <Option value="Purchased">Purchased</Option>
// // // //                   <Option value="Disapproved">Disapproved</Option>
// // // //                   <Option value="Sold">Sold</Option>
// // // //                   <Option value="Hold">Hold</Option>
// // // //                   <Option value="Seller Rejected">Seller Rejected</Option>
// // // //                   <Option value="Dropshipped">Dropshipped</Option>
// // // //                   <Option value="Returned">Returned</Option>
// // // //                   <Option value="Completed">Completed</Option>
// // // //                 </Select>
// // // //               </div>
// // // //             </Col>

// // // //             <Col xs={24} sm={12} md={12} lg={5}>
// // // //               <div>
// // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // //                   Date Range
// // // //                 </label>
// // // //                 <RangePicker
// // // //                   className="w-full rounded-lg"
// // // //                   size="large"
// // // //                   onChange={(range) =>
// // // //                     setFilters((f) => ({ ...f, dateRange: range }))
// // // //                   }
// // // //                 />
// // // //               </div>
// // // //             </Col>

// // // //             <Col xs={24} sm={12} md={12} lg={3}>
// // // //               <div>
// // // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // // //                   Sourcing ID
// // // //                 </label>
// // // //                 <Input
// // // //                   placeholder="Sourcing ID (#)"
// // // //                   allowClear
// // // //                   onChange={(e) =>
// // // //                     setFilters((f) => ({ ...f, sourcingId: e.target.value }))
// // // //                   }
// // // //                   size="large"
// // // //                   className="w-full rounded-lg"
// // // //                 />
// // // //               </div>
// // // //             </Col>
// // // //           </Row>

// // // //           <div style={tableCardStyle}>
// // // //             <Table
// // // //               dataSource={paginatedOrders}
// // // //               columns={columns}
// // // //               rowKey={(rec) => rec._id || rec.id}
// // // //               expandable={{ expandedRowRender: makeItemsTable }}
// // // //               pagination={false}
// // // //               size="middle"
// // // //               bordered={false}
// // // //               sticky
// // // //               scroll={{ x: 1350, y: 520 }}
// // // //               onRow={() => ({
// // // //                 style: { transition: "background 0.2s" },
// // // //                 onMouseEnter: (e) => (e.currentTarget.style.background = "#fafbff"),
// // // //                 onMouseLeave: (e) => (e.currentTarget.style.background = "unset"),
// // // //               })}
// // // //               locale={{
// // // //                 emptyText: (
// // // //                   <Empty
// // // //                     image={Empty.PRESENTED_IMAGE_SIMPLE}
// // // //                     description="No sourcing orders found"
// // // //                   />
// // // //                 ),
// // // //               }}
// // // //             />

// // // //             <SleekPagination
// // // //               page={page}
// // // //               setPage={setPage}
// // // //               limit={limit}
// // // //               setLimit={setLimit}
// // // //               total={total}
// // // //             />
// // // //           </div>
// // // //         </Card>
// // // //       </motion.div>

// // // //       <SourcingImportModal
// // // //         open={importOpen}
// // // //         onClose={() => setImportOpen(false)}
// // // //         orders={orders}
// // // //         onImported={fetchOrders}
// // // //       />
// // // //     </>
// // // //   );
// // // // }





// // // // /src/pages/sourcer/SourcingOrdersPage.jsx
// // // import React, { useEffect, useState, useCallback, useMemo } from "react";
// // // import {
// // //   Card,
// // //   Table,
// // //   Space,
// // //   message,
// // //   Spin,
// // //   Input,
// // //   Select,
// // //   DatePicker,
// // //   Empty,
// // //   Row,
// // //   Col,
// // // } from "antd";
// // // import { motion } from "framer-motion";
// // // import { useNavigate, useLocation } from "react-router-dom";
// // // import dayjs from "dayjs";

// // // import apiClient from "../../api/client";
// // // import SourcingImportModal from "./SourcingImportModal";
// // // import { RefreshCcw, Plus } from "lucide-react";
// // // import { useAuth } from "../../contexts/AuthContext";
// // // import { statusPill } from "./utils/helpers";
// // // import { getSourcingColumns, makeItemsTable } from "./utils/sourcingColumns";
// // // import SleekPagination from "./components/Sleekpagination";

// // // const { Option } = Select;
// // // const { RangePicker } = DatePicker;

// // // /* ---------- UI ---------- */
// // // const gradientCardStyle = {
// // //   borderRadius: 16,
// // //   background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
// // //   boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
// // //   border: "1px solid #e6edff",
// // // };
// // // const tableCardStyle = {
// // //   background: "#fff",
// // //   borderRadius: 12,
// // //   border: "1px solid #eef2ff",
// // //   overflow: "hidden",
// // // };

// // // /* ---------- normalize possible API shapes safely ---------- */
// // // const normalizeArray = (data) =>
// // //   Array.isArray(data)
// // //     ? data
// // //     : data?.all_requests ||
// // //       data?.recent_requests ||
// // //       data?.results ||
// // //       data?.items ||
// // //       data?.data ||
// // //       [];

// // // /* ---------- permission helpers ---------- */
// // // const lower = (v) => String(v ?? "").trim().toLowerCase();

// // // const sourcerPermsFromRole = (roleObj) => {
// // //   const acc = (roleObj?.access || []).find((a) => lower(a?.app) === "sourcer");
// // //   const menu = Array.isArray(acc?.menu) ? acc.menu.map(lower) : [];
// // //   return {
// // //     createOrder: menu.includes("create order"),
// // //     myRequests: menu.includes("my requests"),
// // //     editMyRequests: menu.includes("edit my requests"),
// // //     cancelMyRequests: menu.includes("cancel my requests"),
// // //   };
// // // };

// // // export default function SourcingOrdersPage() {
// // //   const { user } = useAuth();

// // //   // Coarse role flags (legacy behavior)
// // //   const roleName = lower(user?.roles?.role || user?.role || "");
// // //   const isAdmin = roleName === "admin";
// // //   const isPurchaser = roleName === "purchaser";
// // //   const isSourcerCoarse = roleName === "sourcer";

// // //   // Fine-grained (from roles API)
// // //   const [rolesLoaded, setRolesLoaded] = useState(false);
// // //   const [canCreateOrder, setCanCreateOrder] = useState(false);
// // //   const [canViewMyRequests, setCanViewMyRequests] = useState(false);
// // //   const [canEditMyRequests, setCanEditMyRequests] = useState(false);
// // //   const [canCancelMyRequests, setCanCancelMyRequests] = useState(false);

// // //   // Data + UI
// // //   const [orders, setOrders] = useState([]);
// // //   const [loading, setLoading] = useState(true);
// // //   const [importOpen, setImportOpen] = useState(false);

// // //   // pagination
// // //   const [page, setPage] = useState(1);
// // //   const [limit, setLimit] = useState(20);

// // //   const navigate = useNavigate();
// // //   const location = useLocation();
// // //   const params = new URLSearchParams(location.search);
// // //   const sourcerQueryId = params.get("sourcer_id"); // from /sourcing/orders?sourcer_id=...

// // //   // show the New Sourcing button ONLY on exact /sourcing/orders
// // //   const isOrdersRoute = location.pathname === "/sourcing/orders";

// // //   const [filters, setFilters] = useState({
// // //     product: "",
// // //     sku: "",
// // //     status: "",
// // //     dateRange: null,
// // //     sourcingId: "",
// // //   });

// // //   /* ---------- Fetch roles → set permissions ---------- */
// // //   useEffect(() => {
// // //     let cancelled = false;

// // //     (async () => {
// // //       try {
// // //         const { data } = await apiClient.get("/api/v1/role/all");
// // //         console.log("Roles (/api/v1/role/all):", data);

// // //         const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
// // //         // Find by case-insensitive name; tolerate roles stored as "Sourcer", "sourcer", etc.
// // //         const matchedRole =
// // //           rolesArr.find((r) => lower(r?.role) === roleName) ||
// // //           null;

// // //         const {
// // //           createOrder,
// // //           myRequests,
// // //           editMyRequests,
// // //           cancelMyRequests,
// // //         } = sourcerPermsFromRole(matchedRole);

// // //         if (!cancelled) {
// // //           setCanCreateOrder(!!createOrder);
// // //           setCanViewMyRequests(!!myRequests);
// // //           setCanEditMyRequests(!!editMyRequests);
// // //           setCanCancelMyRequests(!!cancelMyRequests);
// // //           setRolesLoaded(true);
// // //         }
// // //       } catch (err) {
// // //         console.error(
// // //           "Failed to fetch roles (/api/v1/role/all):",
// // //           err?.response?.data || err?.message || err
// // //         );
// // //         if (!cancelled) {
// // //           // Secure defaults + mark loaded so we can fall back to legacy behavior
// // //           setCanCreateOrder(false);
// // //           setCanViewMyRequests(false);
// // //           setCanEditMyRequests(false);
// // //           setCanCancelMyRequests(false);
// // //           setRolesLoaded(true);
// // //         }
// // //       }
// // //     })();

// // //     return () => {
// // //       cancelled = true;
// // //     };
// // //   }, [roleName]);

// // //   /* ---------- Choose endpoint (robust) ---------- */
// // //   // Until roles are loaded, fall back to your original behavior so we don't end up with a blank endpoint.
// // //   const endpoint = useMemo(() => {
// // //     let chosen = "";

// // //     if (isAdmin) {
// // //       chosen = "/api/v1/sourcing/all-sourcing";
// // //     } else if (isPurchaser) {
// // //       chosen = "/api/v1/sourcing/assigned";
// // //     } else {
// // //       if (!rolesLoaded) {
// // //         // roles not ready yet → legacy default
// // //         chosen = isSourcerCoarse ? "/api/v1/sourcing/mine" : "";
// // //       } else {
// // //         // roles loaded → respect fine-grained permission
// // //         chosen = canViewMyRequests ? "/api/v1/sourcing/mine" : "";
// // //       }
// // //     }

// // //     console.log("[SourcingOrdersPage] endpoint:", chosen, {
// // //       roleName,
// // //       rolesLoaded,
// // //       canViewMyRequests,
// // //     });
// // //     return chosen;
// // //   }, [isAdmin, isPurchaser, isSourcerCoarse, rolesLoaded, canViewMyRequests, roleName]);

// // //   /* ---------- Load Orders ---------- */
// // //   const fetchOrders = useCallback(async () => {
// // //     if (!endpoint) {
// // //       setOrders([]);
// // //       setLoading(false);
// // //       return;
// // //     }
// // //     setLoading(true);
// // //     try {
// // //       const config = {};
// // //       if (
// // //         isAdmin &&
// // //         sourcerQueryId &&
// // //         endpoint === "/api/v1/sourcing/all-sourcing"
// // //       ) {
// // //         config.params = { sourcer_id: sourcerQueryId };
// // //       }
// // //       const { data } = await apiClient.get(endpoint, config);
// // //       const list = normalizeArray(data);
// // //       console.log("[SourcingOrdersPage] fetched", list.length, "orders");
// // //       setOrders(list);
// // //     } catch (err) {
// // //       console.error(err);
// // //       message.error("Failed to load sourcing orders.");
// // //     } finally {
// // //       setLoading(false);
// // //     }
// // //   }, [endpoint, isAdmin, sourcerQueryId]);

// // //   // refetch whenever endpoint changes (including after rolesLoaded flips true)
// // //   useEffect(() => {
// // //     fetchOrders();
// // //   }, [fetchOrders]);

// // //   /* ---------- Delete Order ---------- */
// // //   const handleDeleteOrder = useCallback(
// // //     async (orderId) => {
// // //       if (!orderId) return;
// // //       try {
// // //         await apiClient.delete(`/api/v1/sourcing/${orderId}`);
// // //         message.success("Sourcing request deleted");
// // //         fetchOrders();
// // //       } catch (err) {
// // //         console.error(err);
// // //         message.error(
// // //           err?.response?.data?.message ||
// // //             err?.response?.data?.detail ||
// // //             "Delete failed"
// // //         );
// // //       }
// // //     },
// // //     [fetchOrders]
// // //   );

// // //   /* ---------- Filters ---------- */
// // //   const filteredOrders = useMemo(() => {
// // //     return orders.filter((order) => {
// // //       const items = order.items || [];

// // //       const matchesProduct =
// // //         !filters.product ||
// // //         items.some((i) =>
// // //           (i.name || i.product_name || "")
// // //             .toLowerCase()
// // //             .includes((filters.product || "").toLowerCase())
// // //         );

// // //       const matchesSku =
// // //         !filters.sku ||
// // //         items.some((i) =>
// // //           (i.sku || "")
// // //             .toLowerCase()
// // //             .includes((filters.sku || "").toLowerCase())
// // //         );

// // //       const matchesStatus = !filters.status || order.status === filters.status;

// // //       const created = order.createdAt || order.created_at || order.created_on;
// // //       const matchesDate =
// // //         !filters.dateRange ||
// // //         (created &&
// // //           dayjs(created).isAfter(filters.dateRange[0].startOf("day")) &&
// // //           dayjs(created).isBefore(filters.dateRange[1].endOf("day")));

// // //       const idForFilter = String(
// // //         order.sourcing_id ?? order._id ?? order.id ?? ""
// // //       );
// // //       const matchesSourcingId =
// // //         !filters.sourcingId || idForFilter.includes(String(filters.sourcingId));

// // //       return (
// // //         matchesProduct &&
// // //         matchesSku &&
// // //         matchesStatus &&
// // //         matchesDate &&
// // //         matchesSourcingId
// // //       );
// // //     });
// // //   }, [orders, filters]);

// // //   /* ---------- Pagination reactions ---------- */
// // //   useEffect(() => {
// // //     setPage(1);
// // //   }, [filters]);

// // //   useEffect(() => {
// // //     const totalPages = Math.max(
// // //       1,
// // //       Math.ceil((filteredOrders.length || 0) / (limit || 1))
// // //     );
// // //     if (page > totalPages) setPage(totalPages);
// // //     // eslint-disable-next-line react-hooks/exhaustive-deps
// // //   }, [filteredOrders.length, limit]);

// // //   const total = filteredOrders.length;
// // //   const paginatedOrders = useMemo(() => {
// // //     const start = (page - 1) * limit;
// // //     const end = start + limit;
// // //     return filteredOrders.slice(start, end);
// // //   }, [filteredOrders, page, limit]);

// // //   /* ---------- Columns (respect edit permission) ---------- */
// // //   const columns = useMemo(
// // //     () =>
// // //       getSourcingColumns({
// // //         statusPill,
// // //         // Only allow editing if admin or explicitly allowed by role permissions
// // //         canEdit: isAdmin || canEditMyRequests,
// // //         navigate,
// // //         handleDeleteOrder,
// // //       }),
// // //     [isAdmin, canEditMyRequests, navigate, handleDeleteOrder]
// // //   );

// // //   /* ---------- Loading ---------- */
// // //   if (loading) {
// // //     return (
// // //       <div
// // //         style={{
// // //           display: "flex",
// // //           justifyContent: "center",
// // //           paddingTop: "4rem",
// // //         }}
// // //       >
// // //         <Spin />
// // //       </div>
// // //     );
// // //   }

// // //   /* ---------- No "my requests" permission UX ---------- */
// // //   if (!isAdmin && !isPurchaser && rolesLoaded && !canViewMyRequests) {
// // //     return (
// // //       <Card style={gradientCardStyle} bodyStyle={{ padding: 24 }}>
// // //         <div className="text-center">
// // //           <h3 className="text-lg font-semibold mb-1">
// // //             No permission to view “My Requests”
// // //           </h3>
// // //           <p className="text-gray-600">
// // //             Your role doesn’t include the <b>Sourcer → “my requests”</b>{" "}
// // //             permission.
// // //           </p>
// // //           {canCreateOrder ? (
// // //             <div className="mt-4">
// // //               <button
// // //                 onClick={() => navigate("/sourcing/orders/new")}
// // //                 className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
// // //               >
// // //                 <Plus className="h-4 w-4" aria-hidden="true" />
// // //                 Create a New Sourcing Order
// // //               </button>
// // //             </div>
// // //           ) : null}
// // //         </div>
// // //       </Card>
// // //     );
// // //   }

// // //   /* ---------- Page title ---------- */
// // //   const pageTitle = isAdmin
// // //     ? sourcerQueryId
// // //       ? "All Sourcing Orders (Selected Sourcer)"
// // //       : "All Sourcing Orders"
// // //     : isPurchaser
// // //     ? "Assigned Requests"
// // //     : "My Sourcing Orders";

// // //   /* ---------- Render ---------- */
// // //   return (
// // //     <>
// // //       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
// // //         <Card
// // //           title={
// // //             <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
// // //               {pageTitle}
// // //             </span>
// // //           }
// // //           extra={
// // //             <Space>
// // //               <button
// // //                 type="button"
// // //                 onClick={fetchOrders}
// // //                 className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700
// // //                            border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-md
// // //                            w-full md:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
// // //               >
// // //                 <RefreshCcw className="h-4 w-4" />
// // //                 Refresh
// // //               </button>

// // //               {(isAdmin || isPurchaser) && (
// // //                 <button
// // //                   onClick={() => setImportOpen(true)}
// // //                   className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
// // //                 >
// // //                   Import CSV
// // //                 </button>
// // //               )}

// // //               {/* Show "New Sourcing" only on /sourcing/orders AND if role grants 'create order' */}
// // //               {isOrdersRoute && canCreateOrder && (
// // //                 <button
// // //                   onClick={() => navigate("/sourcing/orders/new")}
// // //                   className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
// // //                 >
// // //                   <Plus className="h-4 w-4" aria-hidden="true" />
// // //                   New Sourcing
// // //                 </button>
// // //               )}
// // //             </Space>
// // //           }
// // //           style={gradientCardStyle}
// // //           bodyStyle={{ padding: 18 }}
// // //         >
// // //           <Row gutter={[16, 16]} className="mb-2">
// // //             <Col xs={24} sm={12} md={8} lg={6}>
// // //               <div>
// // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // //                   Product Name
// // //                 </label>
// // //                 <Input
// // //                   placeholder="Filter by Product Name"
// // //                   allowClear
// // //                   onChange={(e) =>
// // //                     setFilters((f) => ({ ...f, product: e.target.value }))
// // //                   }
// // //                   size="large"
// // //                   className="w-full rounded-lg"
// // //                 />
// // //               </div>
// // //             </Col>

// // //             <Col xs={24} sm={12} md={8} lg={5}>
// // //               <div>
// // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // //                   SKU
// // //                 </label>
// // //                 <Input
// // //                   placeholder="Filter by SKU"
// // //                   allowClear
// // //                   onChange={(e) =>
// // //                     setFilters((f) => ({ ...f, sku: e.target.value }))
// // //                   }
// // //                   size="large"
// // //                   className="w-full rounded-lg"
// // //                 />
// // //               </div>
// // //             </Col>

// // //             <Col xs={24} sm={12} md={8} lg={5}>
// // //               <div>
// // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // //                   Status
// // //                 </label>
// // //                 <Select
// // //                   placeholder="Filter by Status"
// // //                   allowClear
// // //                   className="w-full rounded-lg"
// // //                   onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
// // //                   dropdownStyle={{ borderRadius: 10 }}
// // //                   size="large"
// // //                 >
// // //                   <Option value="Pending">Pending</Option>
// // //                   <Option value="Assigned">Assigned</Option>
// // //                   <Option value="Offer">Offer</Option>
// // //                   <Option value="Purchased">Purchased</Option>
// // //                   <Option value="Disapproved">Disapproved</Option>
// // //                   <Option value="Sold">Sold</Option>
// // //                   <Option value="Hold">Hold</Option>
// // //                   <Option value="Seller Rejected">Seller Rejected</Option>
// // //                   <Option value="Dropshipped">Dropshipped</Option>
// // //                   <Option value="Returned">Returned</Option>
// // //                   <Option value="Completed">Completed</Option>
// // //                 </Select>
// // //               </div>
// // //             </Col>

// // //             <Col xs={24} sm={12} md={12} lg={5}>
// // //               <div>
// // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // //                   Date Range
// // //                 </label>
// // //                 <RangePicker
// // //                   className="w-full rounded-lg"
// // //                   size="large"
// // //                   onChange={(range) =>
// // //                     setFilters((f) => ({ ...f, dateRange: range }))
// // //                   }
// // //                 />
// // //               </div>
// // //             </Col>

// // //             <Col xs={24} sm={12} md={12} lg={3}>
// // //               <div>
// // //                 <label className="block text-sm font-medium text-gray-700 mb-2">
// // //                   Sourcing ID
// // //                 </label>
// // //                 <Input
// // //                   placeholder="Sourcing ID (#)"
// // //                   allowClear
// // //                   onChange={(e) =>
// // //                     setFilters((f) => ({ ...f, sourcingId: e.target.value }))
// // //                   }
// // //                   size="large"
// // //                   className="w-full rounded-lg"
// // //                 />
// // //               </div>
// // //             </Col>
// // //           </Row>

// // //           <div style={tableCardStyle}>
// // //             <Table
// // //               dataSource={paginatedOrders}
// // //               columns={columns}
// // //               rowKey={(rec) => rec._id || rec.id}
// // //               expandable={{ expandedRowRender: makeItemsTable }}
// // //               pagination={false}
// // //               size="middle"
// // //               bordered={false}
// // //               sticky
// // //               scroll={{ x: 1350, y: 520 }}
// // //               onRow={() => ({
// // //                 style: { transition: "background 0.2s" },
// // //                 onMouseEnter: (e) => (e.currentTarget.style.background = "#fafbff"),
// // //                 onMouseLeave: (e) => (e.currentTarget.style.background = "unset"),
// // //               })}
// // //               locale={{
// // //                 emptyText: (
// // //                   <Empty
// // //                     image={Empty.PRESENTED_IMAGE_SIMPLE}
// // //                     description="No sourcing orders found"
// // //                   />
// // //                 ),
// // //               }}
// // //             />

// // //             <SleekPagination
// // //               page={page}
// // //               setPage={setPage}
// // //               limit={limit}
// // //               setLimit={setLimit}
// // //               total={total}
// // //             />
// // //           </div>
// // //         </Card>
// // //       </motion.div>

// // //       <SourcingImportModal
// // //         open={importOpen}
// // //         onClose={() => setImportOpen(false)}
// // //         orders={orders}
// // //         onImported={fetchOrders}
// // //       />
// // //     </>
// // //   );
// // // }




// // // /src/pages/sourcer/SourcingOrdersPage.jsx
// // import React, { useEffect, useState, useCallback, useMemo } from "react";
// // import {
// //   Card,
// //   Table,
// //   Space,
// //   message,
// //   Spin,
// //   Input,
// //   Select,
// //   DatePicker,
// //   Empty,
// //   Row,
// //   Col,
// // } from "antd";
// // import { motion } from "framer-motion";
// // import { useNavigate, useLocation } from "react-router-dom";
// // import dayjs from "dayjs";

// // import apiClient from "../../api/client";
// // import SourcingImportModal from "./SourcingImportModal";
// // import { RefreshCcw, Plus } from "lucide-react";
// // import { useAuth } from "../../contexts/AuthContext";
// // import { statusPill } from "./utils/helpers";
// // import { getSourcingColumns, makeItemsTable } from "./utils/sourcingColumns";
// // import SleekPagination from "./components/Sleekpagination";

// // const { Option } = Select;
// // const { RangePicker } = DatePicker;

// // /* ---------- UI ---------- */
// // const gradientCardStyle = {
// //   borderRadius: 16,
// //   background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
// //   boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
// //   border: "1px solid #e6edff",
// // };
// // const tableCardStyle = {
// //   background: "#fff",
// //   borderRadius: 12,
// //   border: "1px solid #eef2ff",
// //   overflow: "hidden",
// // };

// // /* ---------- normalize possible API shapes safely ---------- */
// // const normalizeArray = (data) =>
// //   Array.isArray(data)
// //     ? data
// //     : data?.all_requests ||
// //       data?.recent_requests ||
// //       data?.results ||
// //       data?.items ||
// //       data?.data ||
// //       [];

// // /* ---------- permission helpers ---------- */
// // const lower = (v) => String(v ?? "").trim().toLowerCase();

// // const sourcerPermsFromRole = (roleObj) => {
// //   const acc = (roleObj?.access || []).find((a) => lower(a?.app) === "sourcer");
// //   const menu = Array.isArray(acc?.menu) ? acc.menu.map(lower) : [];
// //   return {
// //     createOrder: menu.includes("create order"),
// //     myRequests: menu.includes("my requests"),
// //     editMyRequests: menu.includes("edit my requests"),
// //     cancelMyRequests: menu.includes("cancel my requests"),
// //   };
// // };

// // export default function SourcingOrdersPage() {
// //   const { user } = useAuth();

// //   // Coarse role flags (legacy)
// //   const roleName = lower(user?.roles?.role || user?.role || "");
// //   const isAdmin = roleName === "admin";
// //   const isPurchaser = roleName === "purchaser";
// //   const isSourcerCoarse = roleName === "sourcer";

// //   // Fine-grained permissions via /api/v1/role/all
// //   const [rolesLoaded, setRolesLoaded] = useState(false);
// //   const [canCreateOrder, setCanCreateOrder] = useState(false);
// //   const [canViewMyRequests, setCanViewMyRequests] = useState(false);
// //   const [canEditMyRequests, setCanEditMyRequests] = useState(false);
// //   const [canCancelMyRequests, setCanCancelMyRequests] = useState(false);

// //   // Data + UI
// //   const [orders, setOrders] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [importOpen, setImportOpen] = useState(false);

// //   // pagination
// //   const [page, setPage] = useState(1);
// //   const [limit, setLimit] = useState(20);

// //   const navigate = useNavigate();
// //   const location = useLocation();
// //   const params = new URLSearchParams(location.search);
// //   const sourcerQueryId = params.get("sourcer_id");

// //   const isOrdersRoute = location.pathname === "/sourcing/orders";

// //   const [filters, setFilters] = useState({
// //     product: "",
// //     sku: "",
// //     status: "",
// //     dateRange: null,
// //     sourcingId: "",
// //   });

// //   /* ---------- Fetch roles → set permissions ---------- */
// //   useEffect(() => {
// //     let cancelled = false;

// //     (async () => {
// //       try {
// //         const { data } = await apiClient.get("/api/v1/role/all");
// //         console.log("Roles (/api/v1/role/all):", data);

// //         const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
// //         const matchedRole =
// //           rolesArr.find((r) => lower(r?.role) === roleName) || null;

// //         const {
// //           createOrder,
// //           myRequests,
// //           editMyRequests,
// //           cancelMyRequests,
// //         } = sourcerPermsFromRole(matchedRole);

// //         if (!cancelled) {
// //           setCanCreateOrder(!!createOrder);
// //           setCanViewMyRequests(!!myRequests);
// //           setCanEditMyRequests(!!editMyRequests);
// //           setCanCancelMyRequests(!!cancelMyRequests);
// //           setRolesLoaded(true);
// //         }
// //       } catch (err) {
// //         console.error(
// //           "Failed to fetch roles (/api/v1/role/all):",
// //           err?.response?.data || err?.message || err
// //         );
// //         if (!cancelled) {
// //           // secure defaults
// //           setCanCreateOrder(false);
// //           setCanViewMyRequests(false);
// //           setCanEditMyRequests(false);
// //           setCanCancelMyRequests(false);
// //           setRolesLoaded(true);
// //         }
// //       }
// //     })();

// //     return () => {
// //       cancelled = true;
// //     };
// //   }, [roleName]);

// //   /* ---------- Choose endpoint strictly by permission ---------- */
// //   // Behavior:
// //   // - Admin → all-sourcing
// //   // - Purchaser → assigned
// //   // - Others:
// //   //     * Before rolesLoaded: fall back to legacy for sourcer to avoid blank start.
// //   //     * After rolesLoaded: ONLY call /mine if canViewMyRequests === true.
// //   const endpoint = useMemo(() => {
// //     if (isAdmin) return "/api/v1/sourcing/all-sourcing";
// //     if (isPurchaser) return "/api/v1/sourcing/assigned";
// //     if (!rolesLoaded) return isSourcerCoarse ? "/api/v1/sourcing/mine" : "";
// //     return canViewMyRequests ? "/api/v1/sourcing/mine" : "";
// //   }, [isAdmin, isPurchaser, isSourcerCoarse, rolesLoaded, canViewMyRequests]);

// //   /* ---------- Load Orders ---------- */
// //   const fetchOrders = useCallback(async () => {
// //     if (!endpoint) {
// //       // Permission says: show nothing
// //       setOrders([]);
// //       setLoading(false);
// //       return;
// //     }
// //     setLoading(true);
// //     try {
// //       const config = {};
// //       if (
// //         isAdmin &&
// //         sourcerQueryId &&
// //         endpoint === "/api/v1/sourcing/all-sourcing"
// //       ) {
// //         config.params = { sourcer_id: sourcerQueryId };
// //       }
// //       const { data } = await apiClient.get(endpoint, config);
// //       setOrders(normalizeArray(data));
// //     } catch (err) {
// //       console.error(err);
// //       message.error("Failed to load sourcing orders.");
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [endpoint, isAdmin, sourcerQueryId]);

// //   useEffect(() => {
// //     fetchOrders();
// //   }, [fetchOrders]);

// //   /* ---------- Delete Order ---------- */
// //   const handleDeleteOrder = useCallback(
// //     async (orderId) => {
// //       if (!orderId) return;
// //       try {
// //         await apiClient.delete(`/api/v1/sourcing/${orderId}`);
// //         message.success("Sourcing request deleted");
// //         fetchOrders();
// //       } catch (err) {
// //         console.error(err);
// //         message.error(
// //           err?.response?.data?.message ||
// //             err?.response?.data?.detail ||
// //             "Delete failed"
// //         );
// //       }
// //     },
// //     [fetchOrders]
// //   );

// //   /* ---------- Filters ---------- */
// //   const filteredOrders = useMemo(() => {
// //     return orders.filter((order) => {
// //       const items = order.items || [];

// //       const matchesProduct =
// //         !filters.product ||
// //         items.some((i) =>
// //           (i.name || i.product_name || "")
// //             .toLowerCase()
// //             .includes((filters.product || "").toLowerCase())
// //         );

// //       const matchesSku =
// //         !filters.sku ||
// //         items.some((i) =>
// //           (i.sku || "")
// //             .toLowerCase()
// //             .includes((filters.sku || "").toLowerCase())
// //         );

// //       const matchesStatus = !filters.status || order.status === filters.status;

// //       const created = order.createdAt || order.created_at || order.created_on;
// //       const matchesDate =
// //         !filters.dateRange ||
// //         (created &&
// //           dayjs(created).isAfter(filters.dateRange[0].startOf("day")) &&
// //           dayjs(created).isBefore(filters.dateRange[1].endOf("day")));

// //       const idForFilter = String(
// //         order.sourcing_id ?? order._id ?? order.id ?? ""
// //       );
// //       const matchesSourcingId =
// //         !filters.sourcingId || idForFilter.includes(String(filters.sourcingId));

// //       return (
// //         matchesProduct &&
// //         matchesSku &&
// //         matchesStatus &&
// //         matchesDate &&
// //         matchesSourcingId
// //       );
// //     });
// //   }, [orders, filters]);

// //   /* ---------- Pagination reactions ---------- */
// //   useEffect(() => {
// //     setPage(1);
// //   }, [filters]);

// //   useEffect(() => {
// //     const totalPages = Math.max(
// //       1,
// //       Math.ceil((filteredOrders.length || 0) / (limit || 1))
// //     );
// //     if (page > totalPages) setPage(totalPages);
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [filteredOrders.length, limit]);

// //   const total = filteredOrders.length;
// //   const paginatedOrders = useMemo(() => {
// //     const start = (page - 1) * limit;
// //     const end = start + limit;
// //     return filteredOrders.slice(start, end);
// //   }, [filteredOrders, page, limit]);

// //   /* ---------- Columns (strictly respect edit/delete permissions) ---------- */
// //   // const columns = useMemo(
// //   //   () =>
// //   //     getSourcingColumns({
// //   //       statusPill,
// //   //       canEdit: isAdmin || canEditMyRequests,          // Hides EDIT if false
// //   //       canCancel: isAdmin || canCancelMyRequests,      // Hides DELETE if false
// //   //       navigate,
// //   //       handleDeleteOrder,
// //   //     }),
// //   //   [isAdmin, canEditMyRequests, canCancelMyRequests, navigate, handleDeleteOrder]
// //   // );


// //   const columns = useMemo(
// //   () =>
// //     getSourcingColumns({
// //       statusPill,
// //       canEdit:   canEditMyRequests,       // controls Edit
// //       canCancel: canCancelMyRequests,    // controls Delete
// //       navigate,
// //       handleDeleteOrder,
// //     }),
// //   [isAdmin, canEditMyRequests, canCancelMyRequests, navigate, handleDeleteOrder]
// // );

// //   /* ---------- Loading ---------- */
// //   if (loading) {
// //     return (
// //       <div style={{ display: "flex", justifyContent: "center", paddingTop: "4rem" }}>
// //         <Spin />
// //       </div>
// //     );
// //   }

// //   /* ---------- If 'my requests' is OFF for non-admin/purchaser: empty table ---------- */
// //   // By design we don't fetch and we keep orders = [], so the table will be empty.
// //   // We can still show a friendly note above the table if you want:
// //   const showNoMyRequestsBanner =
// //     !isAdmin && !isPurchaser && rolesLoaded && !canViewMyRequests;

// //   const pageTitle = isAdmin
// //     ? sourcerQueryId
// //       ? "All Sourcing Orders (Selected Sourcer)"
// //       : "All Sourcing Orders"
// //     : isPurchaser
// //     ? "Assigned Requests"
// //     : "My Sourcing Orders";

// //   return (
// //     <>
// //       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
// //         <Card
// //           title={<span style={{ fontWeight: 700, letterSpacing: 0.2 }}>{pageTitle}</span>}
// //           extra={
// //             <Space>
// //               <button
// //                 type="button"
// //                 onClick={fetchOrders}
// //                 className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700
// //                            border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-md
// //                            w-full md:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
// //               >
// //                 <RefreshCcw className="h-4 w-4" />
// //                 Refresh
// //               </button>

// //               {(isAdmin || isPurchaser) && (
// //                 <button
// //                   onClick={() => setImportOpen(true)}
// //                   className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
// //                 >
// //                   Import CSV
// //                 </button>
// //               )}

// //               {/* Show "New Sourcing" only on /sourcing/orders AND if role grants 'create order' */}
// //               {isOrdersRoute && canCreateOrder && (
// //                 <button
// //                   onClick={() => navigate("/sourcing/orders/new")}
// //                   className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
// //                 >
// //                   <Plus className="h-4 w-4" aria-hidden="true" />
// //                   New Sourcing
// //                 </button>
// //               )}
// //             </Space>
// //           }
// //           style={gradientCardStyle}
// //           bodyStyle={{ padding: 18 }}
// //         >
// //           {showNoMyRequestsBanner && (
// //             <div className="mb-3 text-sm text-gray-600">
// //               Your role does not include <b>Sourcer → “my requests”</b>. The table below is intentionally empty.
// //             </div>
// //           )}

// //           {/* Filters remain visible; they won’t show results if orders = [] */}
// //           <Row gutter={[16, 16]} className="mb-2">
// //             <Col xs={24} sm={12} md={8} lg={6}>
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
// //                 <Input
// //                   placeholder="Filter by Product Name"
// //                   allowClear
// //                   onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))}
// //                   size="large"
// //                   className="w-full rounded-lg"
// //                 />
// //               </div>
// //             </Col>

// //             <Col xs={24} sm={12} md={8} lg={5}>
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
// //                 <Input
// //                   placeholder="Filter by SKU"
// //                   allowClear
// //                   onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))}
// //                   size="large"
// //                   className="w-full rounded-lg"
// //                 />
// //               </div>
// //             </Col>

// //             <Col xs={24} sm={12} md={8} lg={5}>
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
// //                 <Select
// //                   placeholder="Filter by Status"
// //                   allowClear
// //                   className="w-full rounded-lg"
// //                   onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
// //                   dropdownStyle={{ borderRadius: 10 }}
// //                   size="large"
// //                 >
// //                   <Option value="Pending">Pending</Option>
// //                   <Option value="Assigned">Assigned</Option>
// //                   <Option value="Offer">Offer</Option>
// //                   <Option value="Purchased">Purchased</Option>
// //                   <Option value="Disapproved">Disapproved</Option>
// //                   <Option value="Sold">Sold</Option>
// //                   <Option value="Hold">Hold</Option>
// //                   <Option value="Seller Rejected">Seller Rejected</Option>
// //                   <Option value="Dropshipped">Dropshipped</Option>
// //                   <Option value="Returned">Returned</Option>
// //                   <Option value="Completed">Completed</Option>
// //                 </Select>
// //               </div>
// //             </Col>

// //             <Col xs={24} sm={12} md={12} lg={5}>
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
// //                 <RangePicker
// //                   className="w-full rounded-lg"
// //                   size="large"
// //                   onChange={(range) => setFilters((f) => ({ ...f, dateRange: range }))}
// //                 />
// //               </div>
// //             </Col>

// //             <Col xs={24} sm={12} md={12} lg={3}>
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-2">Sourcing ID</label>
// //                 <Input
// //                   placeholder="Sourcing ID (#)"
// //                   allowClear
// //                   onChange={(e) => setFilters((f) => ({ ...f, sourcingId: e.target.value }))}
// //                   size="large"
// //                   className="w-full rounded-lg"
// //                 />
// //               </div>
// //             </Col>
// //           </Row>

// //           <div style={tableCardStyle}>
// //             <Table
// //               dataSource={paginatedOrders}
// //               columns={columns}
// //               rowKey={(rec) => rec._id || rec.id}
// //               expandable={{ expandedRowRender: makeItemsTable }}
// //               pagination={false}
// //               size="middle"
// //               bordered={false}
// //               sticky
// //               scroll={{ x: 1350, y: 520 }}
// //               onRow={() => ({
// //                 style: { transition: "background 0.2s" },
// //                 onMouseEnter: (e) => (e.currentTarget.style.background = "#fafbff"),
// //                 onMouseLeave: (e) => (e.currentTarget.style.background = "unset"),
// //               })}
// //               locale={{
// //                 emptyText: (
// //                   <Empty
// //                     image={Empty.PRESENTED_IMAGE_SIMPLE}
// //                     description="No sourcing orders found"
// //                   />
// //                 ),
// //               }}
// //             />

// //             <SleekPagination
// //               page={page}
// //               setPage={setPage}
// //               limit={limit}
// //               setLimit={setLimit}
// //               total={total}
// //             />
// //           </div>
// //         </Card>
// //       </motion.div>

// //       <SourcingImportModal
// //         open={importOpen}
// //         onClose={() => setImportOpen(false)}
// //         orders={orders}
// //         onImported={fetchOrders}
// //       />
// //     </>
// //   );
// // }




// // /src/pages/sourcer/SourcingOrdersPage.jsx
// import React, { useEffect, useState, useCallback, useMemo } from "react";
// import {
//   Card,
//   Table,
//   Space,
//   message,
//   Spin,
//   Input,
//   Select,
//   DatePicker,
//   Empty,
//   Row,
//   Col,
// } from "antd";
// import { motion } from "framer-motion";
// import { useNavigate, useLocation } from "react-router-dom";
// import dayjs from "dayjs";

// import apiClient from "../../api/client";
// import SourcingImportModal from "./SourcingImportModal";
// import { RefreshCcw, Plus } from "lucide-react";
// import { useAuth } from "../../contexts/AuthContext";
// import { statusPill } from "./utils/helpers";
// import { getSourcingColumns, makeItemsTable } from "./utils/sourcingColumns";
// import SleekPagination from "./components/Sleekpagination";

// const { Option } = Select;
// const { RangePicker } = DatePicker;

// /* ---------- UI ---------- */
// const gradientCardStyle = {
//   borderRadius: 16,
//   background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
//   boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
//   border: "1px solid #e6edff",
// };
// const tableCardStyle = {
//   background: "#fff",
//   borderRadius: 12,
//   border: "1px solid #eef2ff",
//   overflow: "hidden",
// };

// /* ---------- normalize possible API shapes safely ---------- */
// const normalizeArray = (data) =>
//   Array.isArray(data)
//     ? data
//     : data?.all_requests ||
//       data?.recent_requests ||
//       data?.results ||
//       data?.items ||
//       data?.data ||
//       [];

// /* ---------- helpers ---------- */
// const lower = (v) => String(v ?? "").trim().toLowerCase();

// const sourcerPermsFromRole = (roleObj) => {
//   const acc = (roleObj?.access || []).find((a) => lower(a?.app) === "sourcer");
//   const menu = Array.isArray(acc?.menu) ? acc.menu.map(lower) : [];
//   return {
//     createOrder: menu.includes("create order"),
//     myRequests: menu.includes("my requests"),
//     editMyRequests: menu.includes("edit my requests"),
//     cancelMyRequests: menu.includes("cancel my requests"),
//   };
// };

// export default function SourcingOrdersPage() {
//   const { user } = useAuth();

//   // Route helpers
//   const navigate = useNavigate();
//   const location = useLocation();
//   const isOrdersRoute = location.pathname === "/sourcing/orders";
//   const params = new URLSearchParams(location.search);
//   const sourcerQueryId = params.get("sourcer_id"); // (unused by design now, see strict rule)

//   // ROLE NAME IS IGNORED for visibility. Admin/purchaser no longer bypass.
//   const roleName = lower(user?.roles?.role || user?.role || "");

//   // Fine-grained permissions via /api/v1/role/all
//   const [rolesLoaded, setRolesLoaded] = useState(false);
//   const [canCreateOrder, setCanCreateOrder] = useState(false);
//   const [canViewMyRequests, setCanViewMyRequests] = useState(false);
//   const [canEditMyRequests, setCanEditMyRequests] = useState(false);
//   const [canCancelMyRequests, setCanCancelMyRequests] = useState(false);

//   // Data + UI
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [importOpen, setImportOpen] = useState(false);

//   // filters + pagination
//   const [filters, setFilters] = useState({
//     product: "",
//     sku: "",
//     status: "",
//     dateRange: null,
//     sourcingId: "",
//   });
//   const [page, setPage] = useState(1);
//   const [limit, setLimit] = useState(20);

//   /* ---------- Fetch roles → set permissions (STRICT) ---------- */
//   useEffect(() => {
//     let cancelled = false;

//     (async () => {
//       try {
//         const { data } = await apiClient.get("/api/v1/role/all");
//         const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
//         const matched =
//           rolesArr.find((r) => lower(r?.role) === roleName) || null;

//         const {
//           createOrder,
//           myRequests,
//           editMyRequests,
//           cancelMyRequests,
//         } = sourcerPermsFromRole(matched);

//         if (!cancelled) {
//           setCanCreateOrder(!!createOrder);
//           setCanViewMyRequests(!!myRequests);
//           setCanEditMyRequests(!!editMyRequests);
//           setCanCancelMyRequests(!!cancelMyRequests);
//           setRolesLoaded(true);
//         }
//       } catch (err) {
//         console.error("Failed to fetch roles (/api/v1/role/all):", err?.response?.data || err?.message || err);
//         if (!cancelled) {
//           // Secure defaults: everything off
//           setCanCreateOrder(false);
//           setCanViewMyRequests(false);
//           setCanEditMyRequests(false);
//           setCanCancelMyRequests(false);
//           setRolesLoaded(true);
//         }
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//   }, [roleName]);

//   /* ---------- STRICT visibility rule ---------- */
//   // If "my requests" is OFF, no one sees data (admin/purchaser included).
//   const canSeeAnyList = canViewMyRequests === true;

//   /* ---------- Endpoint (STRICT) ---------- */
//   // We will only ever hit the "/mine" endpoint when canSeeAnyList === true.
//   // No other endpoints (all-sourcing/assigned) are allowed in strict mode.
//   const endpoint = useMemo(() => {
//     if (!canSeeAnyList) return "";
//     return "/api/v1/sourcing/mine";
//   }, [canSeeAnyList]);

//   /* ---------- Load Orders (respects strict endpoint) ---------- */
//   const fetchOrders = useCallback(async () => {
//     if (!endpoint) {
//       setOrders([]);
//       setLoading(false);
//       return;
//     }
//     setLoading(true);
//     try {
//       const { data } = await apiClient.get(endpoint);
//       setOrders(normalizeArray(data));
//     } catch (err) {
//       console.error(err);
//       message.error("Failed to load sourcing orders.");
//     } finally {
//       setLoading(false);
//     }
//   }, [endpoint]);

//   useEffect(() => {
//     // Wait until roles are known to avoid flashing data
//     if (!rolesLoaded) return;
//     fetchOrders();
//   }, [rolesLoaded, fetchOrders]);

//   /* ---------- Delete Order ---------- */
//   const handleDeleteOrder = useCallback(
//     async (orderId) => {
//       if (!orderId) return;
//       try {
//         await apiClient.delete(`/api/v1/sourcing/${orderId}`);
//         message.success("Sourcing request deleted");
//         fetchOrders();
//       } catch (err) {
//         console.error(err);
//         message.error(
//           err?.response?.data?.message ||
//             err?.response?.data?.detail ||
//             "Delete failed"
//         );
//       }
//     },
//     [fetchOrders]
//   );

//   /* ---------- Client-side Filters ---------- */
//   const filteredOrders = useMemo(() => {
//     return orders.filter((order) => {
//       const items = order.items || [];

//       const matchesProduct =
//         !filters.product ||
//         items.some((i) =>
//           (i.name || i.product_name || "")
//             .toLowerCase()
//             .includes((filters.product || "").toLowerCase())
//         );

//       const matchesSku =
//         !filters.sku ||
//         items.some((i) =>
//           (i.sku || "")
//             .toLowerCase()
//             .includes((filters.sku || "").toLowerCase())
//         );

//       const matchesStatus = !filters.status || order.status === filters.status;

//       const created = order.createdAt || order.created_at || order.created_on;
//       const matchesDate =
//         !filters.dateRange ||
//         (created &&
//           dayjs(created).isAfter(filters.dateRange[0].startOf("day")) &&
//           dayjs(created).isBefore(filters.dateRange[1].endOf("day")));

//       const idForFilter = String(
//         order.sourcing_id ?? order._id ?? order.id ?? ""
//       );
//       const matchesSourcingId =
//         !filters.sourcingId || idForFilter.includes(String(filters.sourcingId));

//       return (
//         matchesProduct &&
//         matchesSku &&
//         matchesStatus &&
//         matchesDate &&
//         matchesSourcingId
//       );
//     });
//   }, [orders, filters]);

//   /* ---------- Pagination reactions ---------- */
//   useEffect(() => {
//     setPage(1);
//   }, [filters]);

//   useEffect(() => {
//     const totalPages = Math.max(
//       1,
//       Math.ceil((filteredOrders.length || 0) / (limit || 1))
//     );
//     if (page > totalPages) setPage(totalPages);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [filteredOrders.length, limit]);

//   const total = filteredOrders.length;
//   const paginatedOrders = useMemo(() => {
//     const start = (page - 1) * limit;
//     const end = start + limit;
//     return filteredOrders.slice(start, end);
//   }, [filteredOrders, page, limit]);

//   /* ---------- Columns (NO admin override) ---------- */
//   const columns = useMemo(
//     () =>
//       getSourcingColumns({
//         statusPill,
//         canEdit: canEditMyRequests,         // Edit button
//         canCancel: canCancelMyRequests,     // Delete button
//         navigate,
//         handleDeleteOrder,
//       }),
//     [canEditMyRequests, canCancelMyRequests, navigate, handleDeleteOrder]
//   );

//   /* ---------- Strict: wait for roles to load before any UI ---------- */
//   if (!rolesLoaded) {
//     return (
//       <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
//         <Spin />
//       </div>
//     );
//   }

//   /* ---------- If my requests is OFF: show nothing (banner only) ---------- */
//   if (!canSeeAnyList) {
//     return (
//       <Card style={gradientCardStyle} bodyStyle={{ padding: 24 }}>
//         <div className="text-center">
//           <h3 className="text-lg font-semibold mb-1">
//             No permission to view “My Requests”
//           </h3>
//           <p className="text-gray-600">
//             Access to <b>Sourcer → “my requests”</b> is required to view this page.
//           </p>

//           {/* You can still allow creation if they have that permission */}
//           {isOrdersRoute && canCreateOrder && (
//             <div className="mt-4">
//               <button
//                 onClick={() => navigate("/sourcing/orders/new")}
//                 className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
//               >
//                 <Plus className="h-4 w-4" aria-hidden="true" />
//                 New Sourcing
//               </button>
//             </div>
//           )}
//         </div>
//       </Card>
//     );
//   }

//   /* ---------- Page title ---------- */
//   const pageTitle = "My Sourcing Orders"; // strict mode: always "mine" when visible

//   /* ---------- Render ---------- */
//   return (
//     <>
//       <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
//         <Card
//           title={<span style={{ fontWeight: 700, letterSpacing: 0.2 }}>{pageTitle}</span>}
//           extra={
//             <Space>
//               <button
//                 type="button"
//                 onClick={fetchOrders}
//                 className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700
//                            border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-md
//                            w-full md:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
//               >
//                 <RefreshCcw className="h-4 w-4" />
//                 Refresh
//               </button>

//               {/* Import CSV left as-is; remove if you want to lock it behind a different permission */}
//               {/* {canImport && ( ... )} */}

//               {isOrdersRoute && canCreateOrder && (
//                 <button
//                   onClick={() => navigate("/sourcing/orders/new")}
//                   className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
//                 >
//                   <Plus className="h-4 w-4" aria-hidden="true" />
//                   New Sourcing
//                 </button>
//               )}
//             </Space>
//           }
//           style={gradientCardStyle}
//           bodyStyle={{ padding: 18 }}
//         >
//           {/* Filters */}
//           <Row gutter={[16, 16]} className="mb-2">
//             <Col xs={24} sm={12} md={8} lg={6}>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
//                 <Input
//                   placeholder="Filter by Product Name"
//                   allowClear
//                   onChange={(e) => setFilters((f) => ({ ...f, product: e.target.value }))}
//                   size="large"
//                   className="w-full rounded-lg"
//                 />
//               </div>
//             </Col>

//             <Col xs={24} sm={12} md={8} lg={5}>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
//                 <Input
//                   placeholder="Filter by SKU"
//                   allowClear
//                   onChange={(e) => setFilters((f) => ({ ...f, sku: e.target.value }))}
//                   size="large"
//                   className="w-full rounded-lg"
//                 />
//               </div>
//             </Col>

//             <Col xs={24} sm={12} md={8} lg={5}>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
//                 <Select
//                   placeholder="Filter by Status"
//                   allowClear
//                   className="w-full rounded-lg"
//                   onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
//                   dropdownStyle={{ borderRadius: 10 }}
//                   size="large"
//                 >
//                   <Option value="Pending">Pending</Option>
//                   <Option value="Assigned">Assigned</Option>
//                   <Option value="Offer">Offer</Option>
//                   <Option value="Purchased">Purchased</Option>
//                   <Option value="Disapproved">Disapproved</Option>
//                   <Option value="Sold">Sold</Option>
//                   <Option value="Hold">Hold</Option>
//                   <Option value="Seller Rejected">Seller Rejected</Option>
//                   <Option value="Dropshipped">Dropshipped</Option>
//                   <Option value="Returned">Returned</Option>
//                   <Option value="Completed">Completed</Option>
//                 </Select>
//               </div>
//             </Col>

//             <Col xs={24} sm={12} md={12} lg={5}>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
//                 <RangePicker
//                   className="w-full rounded-lg"
//                   size="large"
//                   onChange={(range) => setFilters((f) => ({ ...f, dateRange: range }))}
//                 />
//               </div>
//             </Col>

//             <Col xs={24} sm={12} md={12} lg={3}>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Sourcing ID</label>
//                 <Input
//                   placeholder="Sourcing ID (#)"
//                   allowClear
//                   onChange={(e) => setFilters((f) => ({ ...f, sourcingId: e.target.value }))}
//                   size="large"
//                   className="w-full rounded-lg"
//                 />
//               </div>
//             </Col>
//           </Row>

//           <div style={tableCardStyle}>
//             <Table
//               dataSource={paginatedOrders}
//               columns={columns}
//               rowKey={(rec) => rec._id || rec.id}
//               expandable={{ expandedRowRender: makeItemsTable }}
//               pagination={false}
//               size="middle"
//               bordered={false}
//               sticky
//               scroll={{ x: 1350, y: 520 }}
//               onRow={() => ({
//                 style: { transition: "background 0.2s" },
//                 onMouseEnter: (e) => (e.currentTarget.style.background = "#fafbff"),
//                 onMouseLeave: (e) => (e.currentTarget.style.background = "unset"),
//               })}
//               locale={{
//                 emptyText: (
//                   <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No sourcing orders found" />
//                 ),
//               }}
//             />

//             <SleekPagination
//               page={page}
//               setPage={setPage}
//               limit={limit}
//               setLimit={setLimit}
//               total={total}
//             />
//           </div>
//         </Card>
//       </motion.div>

//       <SourcingImportModal
//         open={importOpen}
//         onClose={() => setImportOpen(false)}
//         orders={orders}
//         onImported={fetchOrders}
//       />
//     </>
//   );
// }




// /src/pages/sourcer/SourcingOrdersPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Card,
  Table,
  Space,
  message,
  Spin,
  Input,
  Select,
  DatePicker,
  Empty,
  Row,
  Col,
} from "antd";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import dayjs from "dayjs";

import apiClient from "../../api/client";
import SourcingImportModal from "./SourcingImportModal";
import { RefreshCcw, Plus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { statusPill } from "./utils/helpers";
import { getSourcingColumns, makeItemsTable } from "./utils/sourcingColumns";
import SleekPagination from "./components/Sleekpagination";

const { Option } = Select;
const { RangePicker } = DatePicker;

/* ---------- UI ---------- */
const gradientCardStyle = {
  borderRadius: 16,
  background: "linear-gradient(135deg, #f8fbff, #eef4ff)",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
  border: "1px solid #e6edff",
};
const tableCardStyle = {
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #eef2ff",
  overflow: "hidden",
};

/* ---------- normalize possible API shapes safely ---------- */
const normalizeArray = (data) =>
  Array.isArray(data)
    ? data
    : data?.all_requests ||
      data?.recent_requests ||
      data?.results ||
      data?.items ||
      data?.data ||
      [];

/* ---------- helpers ---------- */
const lower = (v) => String(v ?? "").trim().toLowerCase();

const sourcerPermsFromRole = (roleObj) => {
  const acc = (roleObj?.access || []).find((a) => lower(a?.app) === "sourcer");
  const menu = Array.isArray(acc?.menu) ? acc.menu.map(lower) : [];
  return {
    createOrder: menu.includes("create order"),
    myRequests: menu.includes("my requests"),
    editMyRequests: menu.includes("edit my requests"),
    cancelMyRequests: menu.includes("cancel my requests"),
  };
};

export default function SourcingOrdersPage() {
  const { user } = useAuth();

  // Route helpers
  const navigate = useNavigate();
  const location = useLocation();
  const isOrdersRoute = location.pathname === "/sourcing/orders";

  // ROLE NAME (used only to map to role object in /role/all)
  const roleName = lower(user?.roles?.role || user?.role || "");

  // Fine-grained permissions via /api/v1/role/all
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [canCreateOrder, setCanCreateOrder] = useState(false);
  const [canViewMyRequests, setCanViewMyRequests] = useState(false);
  const [canEditMyRequests, setCanEditMyRequests] = useState(false);
  const [canCancelMyRequests, setCanCancelMyRequests] = useState(false);

  // Optional: allow Import when user can create OR edit (tweak if you add a distinct permission later)
  const canImport = canCreateOrder || canEditMyRequests;

  // Data + UI
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);

  // filters + pagination
  const [filters, setFilters] = useState({
    product: "",
    sku: "",
    status: "",
    dateRange: null,
    sourcingId: "",
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  /* ---------- Fetch roles → set permissions (STRICT) ---------- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await apiClient.get("/api/v1/role/all");
        const rolesArr = Array.isArray(data?.roles) ? data.roles : [];
        const matched =
          rolesArr.find((r) => lower(r?.role) === roleName) || null;

        const {
          createOrder,
          myRequests,
          editMyRequests,
          cancelMyRequests,
        } = sourcerPermsFromRole(matched);

        if (!cancelled) {
          setCanCreateOrder(!!createOrder);
          setCanViewMyRequests(!!myRequests);
          setCanEditMyRequests(!!editMyRequests);
          setCanCancelMyRequests(!!cancelMyRequests);
          setRolesLoaded(true);
        }
      } catch (err) {
        console.error(
          "Failed to fetch roles (/api/v1/role/all):",
          err?.response?.data || err?.message || err
        );
        if (!cancelled) {
          // Secure defaults: everything off
          setCanCreateOrder(false);
          setCanViewMyRequests(false);
          setCanEditMyRequests(false);
          setCanCancelMyRequests(false);
          setRolesLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roleName]);

  /* ---------- STRICT visibility rule ---------- */
  // If "my requests" is OFF, no one sees data (admin/purchaser included).
  const canSeeAnyList = canViewMyRequests === true;

  /* ---------- Endpoint (STRICT) ---------- */
  // We will only ever hit the "/mine" endpoint when canSeeAnyList === true.
  const endpoint = useMemo(() => {
    if (!canSeeAnyList) return "";
    return "/api/v1/sourcing/mine";
  }, [canSeeAnyList]);

  /* ---------- Load Orders (respects strict endpoint) ---------- */
  const fetchOrders = useCallback(async () => {
    if (!endpoint) {
      setOrders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await apiClient.get(endpoint);
      setOrders(normalizeArray(data));
    } catch (err) {
      console.error(err);
      message.error("Failed to load sourcing orders.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    // Wait until roles are known to avoid flashing data
    if (!rolesLoaded) return;
    fetchOrders();
  }, [rolesLoaded, fetchOrders]);

  /* ---------- Delete Order ---------- */
  const handleDeleteOrder = useCallback(
    async (orderId) => {
      if (!orderId) return;
      try {
        await apiClient.delete(`/api/v1/sourcing/${orderId}`);
        message.success("Sourcing request deleted");
        fetchOrders();
      } catch (err) {
        console.error(err);
        message.error(
          err?.response?.data?.message ||
            err?.response?.data?.detail ||
            "Delete failed"
        );
      }
    },
    [fetchOrders]
  );

  /* ---------- Client-side Filters ---------- */
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const items = order.items || [];

      const matchesProduct =
        !filters.product ||
        items.some((i) =>
          (i.name || i.product_name || "")
            .toLowerCase()
            .includes((filters.product || "").toLowerCase())
        );

      const matchesSku =
        !filters.sku ||
        items.some((i) =>
          (i.sku || "").toLowerCase().includes((filters.sku || "").toLowerCase())
        );

      const matchesStatus = !filters.status || order.status === filters.status;

      const created = order.createdAt || order.created_at || order.created_on;
      const matchesDate =
        !filters.dateRange ||
        (created &&
          dayjs(created).isAfter(filters.dateRange[0].startOf("day")) &&
          dayjs(created).isBefore(filters.dateRange[1].endOf("day")));

      const idForFilter = String(
        order.sourcing_id ?? order._id ?? order.id ?? ""
      );
      const matchesSourcingId =
        !filters.sourcingId || idForFilter.includes(String(filters.sourcingId));

      return (
        matchesProduct &&
        matchesSku &&
        matchesStatus &&
        matchesDate &&
        matchesSourcingId
      );
    });
  }, [orders, filters]);

  /* ---------- Pagination reactions ---------- */
  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil((filteredOrders.length || 0) / (limit || 1))
    );
    if (page > totalPages) setPage(totalPages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredOrders.length, limit]);

  const total = filteredOrders.length;
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * limit;
    const end = start + limit;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, page, limit]);

  /* ---------- Columns (NO admin override) ---------- */
  const columns = useMemo(
    () =>
      getSourcingColumns({
        statusPill,
        canEdit: canEditMyRequests, // Edit button
        canCancel: canCancelMyRequests, // Delete button
        navigate,
        handleDeleteOrder,
      }),
    [canEditMyRequests, canCancelMyRequests, navigate, handleDeleteOrder]
  );

  /* ---------- Loader: wait for roles OR data ---------- */
  if (!rolesLoaded || (canSeeAnyList && loading)) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 64 }}>
        <Spin size="large" />
      </div>
    );
  }

  /* ---------- If my requests is OFF: show banner (keep New Sourcing) ---------- */
  if (!canSeeAnyList) {
    return (
      <Card style={gradientCardStyle} bodyStyle={{ padding: 24 }}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">
            No permission to view “My Requests”
          </h3>
          <p className="text-gray-600">
            Access to <b>Sourcer → “my requests”</b> is required to view this page.
          </p>

          {isOrdersRoute && canCreateOrder && (
            <div className="mt-4">
              <button
                onClick={() => navigate("/sourcing/orders/new")}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New Sourcing
              </button>
            </div>
          )}
        </div>
      </Card>
    );
  }

  /* ---------- Page title ---------- */
  const pageTitle = "My Sourcing Orders"; // strict mode: always mine

  /* ---------- Render ---------- */
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          title={<span style={{ fontWeight: 700, letterSpacing: 0.2 }}>{pageTitle}</span>}
          extra={
            <Space>
              <button
                type="button"
                onClick={fetchOrders}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700
                           border border-gray-300 hover:border-gray-400 px-4 py-2 rounded-md
                           w-full md:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </button>

              {/* ✅ Import CSV button restored */}
              {canImport && (
                <button
                  onClick={() => setImportOpen(true)}
                  className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
                >
                  Import CSV
                </button>
              )}

              {isOrdersRoute && canCreateOrder && (
                <button
                  onClick={() => navigate("/sourcing/orders/new")}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New Sourcing
                </button>
              )}
            </Space>
          }
          style={gradientCardStyle}
          bodyStyle={{ padding: 18 }}
        >
          {/* Filters */}
          <Row gutter={[16, 16]} className="mb-2">
            <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name
                </label>
                <Input
                  placeholder="Filter by Product Name"
                  allowClear
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, product: e.target.value }))
                  }
                  size="large"
                  className="w-full rounded-lg"
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={5}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SKU
                </label>
                <Input
                  placeholder="Filter by SKU"
                  allowClear
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, sku: e.target.value }))
                  }
                  size="large"
                  className="w-full rounded-lg"
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={8} lg={5}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <Select
                  placeholder="Filter by Status"
                  allowClear
                  className="w-full rounded-lg"
                  onChange={(val) => setFilters((f) => ({ ...f, status: val }))}
                  dropdownStyle={{ borderRadius: 10 }}
                  size="large"
                >
                  <Option value="Pending">Pending</Option>
                  <Option value="Assigned">Assigned</Option>
                  <Option value="Offer">Offer</Option>
                  <Option value="Purchased">Purchased</Option>
                  <Option value="Disapproved">Disapproved</Option>
                  <Option value="Sold">Sold</Option>
                  <Option value="Hold">Hold</Option>
                  <Option value="Seller Rejected">Seller Rejected</Option>
                  <Option value="Dropshipped">Dropshipped</Option>
                  <Option value="Returned">Returned</Option>
                  <Option value="Completed">Completed</Option>
                </Select>
              </div>
            </Col>

            <Col xs={24} sm={12} md={12} lg={5}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <RangePicker
                  className="w-full rounded-lg"
                  size="large"
                  onChange={(range) =>
                    setFilters((f) => ({ ...f, dateRange: range }))
                  }
                />
              </div>
            </Col>

            <Col xs={24} sm={12} md={12} lg={3}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sourcing ID
                </label>
                <Input
                  placeholder="Sourcing ID (#)"
                  allowClear
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, sourcingId: e.target.value }))
                  }
                  size="large"
                  className="w-full rounded-lg"
                />
              </div>
            </Col>
          </Row>

          <div style={tableCardStyle}>
            <Table
              dataSource={paginatedOrders}
              columns={columns}
              rowKey={(rec) => rec._id || rec.id}
              expandable={{ expandedRowRender: makeItemsTable }}
              pagination={false}
              size="middle"
              bordered={false}
              sticky
              scroll={{ x: 1350, y: 520 }}
              loading={loading}      
              onRow={() => ({
                style: { transition: "background 0.2s" },
                onMouseEnter: (e) =>
                  (e.currentTarget.style.background = "#fafbff"),
                onMouseLeave: (e) =>
                  (e.currentTarget.style.background = "unset"),
              })}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No sourcing orders found"
                  />
                ),
              }}
            />

            <SleekPagination
              page={page}
              setPage={setPage}
              limit={limit}
              setLimit={setLimit}
              total={total}
            />
          </div>
        </Card>
      </motion.div>

      {/* ✅ Import modal kept and wired */}
      <SourcingImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        orders={orders}
        onImported={fetchOrders}
      />
    </>
  );
}
