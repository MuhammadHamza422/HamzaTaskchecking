

// // // /src/pages/purchaser/PurchaserPage.jsx
// // import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
// // import {
// //   Table, message, Tag, Select, Typography, Input, Tabs, DatePicker,
// //   Button, Card, Grid, Row, Col, Space, Empty,
// // } from "antd";
// // import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";
// // import apiClient from "../../api/client";
// // import { motion } from "framer-motion";
// // import dayjs from "dayjs";
// // import { useNavigate, useLocation } from "react-router-dom";
// // import { useAuth } from "../../contexts/AuthContext"; 
// // import useProductSearch from "../sourcer/hooks/useProductSearch";
// // import PurchaserDashboard from "./PurchaserDashboardPage";

// // import {
// //   normalizeRequests,
// //   getCreated,
// //   statusColor,
// //   num as safeNum,
// //   ExpandedItemsTable,
// // } from "./utils/PurchaseTableUtils";
// // import PurchaserPendingPage from "./PurchaserPendingPage";

// // const { Option } = Select;
// // const { Title, Text } = Typography;
// // const { TabPane } = Tabs;
// // const { Search } = Input;
// // const { useBreakpoint } = Grid;

// // /** ───────────────── Admin Purchaser search (debounced, matches your backend shape) ───────────────── */
// // function usePurchaserSearch() {
// //   const [options, setOptions] = useState([]);
// //   const [loading, setLoading] = useState(false);
// //   const t = useRef(null);

// //   // API returns items shaped like { value, label, email }
// //   const mapUser = (u) => ({
// //     value: String(u.value), // backend sends the User _id in "value"
// //     label: (
// //       <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
// //         <span style={{ fontWeight: 600 }}>
// //           {u.label || u.email || "Unnamed"}
// //         </span>
// //         {u.email ? <span style={{ color: "#999" }}>· {u.email}</span> : null}
// //       </div>
// //     ),
// //     raw: u, // preserve raw for later (dashboard header, etc.)
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
// //       if (status === 403) {
// //         message.warning("Only admins can search purchasers.");
// //       } else {
// //         message.error(e?.response?.data?.message || "Failed to search purchasers.");
// //       }
// //       console.error("purchaser search failed", e?.response?.data || e?.message);
// //       setOptions([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const debouncedSearch = (q) => {
// //     clearTimeout(t.current);
// //     t.current = setTimeout(() => fetchUsers(q), 300);
// //   };

// //   // Load once on first open
// //   const fetchInitial = () => !options.length && fetchUsers("");

// //   return { options, loading, debouncedSearch, fetchInitial };
// // }

// // export default function PurchaserPage() {
// //   const { user: authUser } = useAuth();
// //   const isAdmin = (authUser?.roles?.role || "").toLowerCase() === "admin";

// //   const [requests, setRequests] = useState([]);
// //   const [loading, setLoading] = useState(true);
// //   const [isRefreshing, setIsRefreshing] = useState(false);

// //   // filters
// //   const [statusFilter, setStatusFilter] = useState("");
// //   const [searchTerm, setSearchTerm] = useState("");
// //   const [dateRange, setDateRange] = useState([]);
// //   const [selectedProductIds, setSelectedProductIds] = useState([]);

// //   // admin purchaser scope
// //   const [selectedPurchaser, setSelectedPurchaser] = useState(null);
// //   const {
// //     options: purchaserOptions,
// //     loading: purchaserLoading,
// //     debouncedSearch: purchaserSearch,
// //     fetchInitial: fetchInitialPurchasers,
// //   } = usePurchaserSearch();

// //   const screens = useBreakpoint();
// //   const navigate = useNavigate();
// //   const location = useLocation();

// //   // Tabs persistence
// //   const getInitialActiveTab = () => {
// //     const urlParams = new URLSearchParams(location.search);
// //     const urlTab = urlParams.get("tab");
// //     if (urlTab && ["dashboard", "all", "returned", "pending"].includes(urlTab)) return urlTab;
// //     const savedTab = localStorage.getItem("purchaserActiveTab");
// //     if (savedTab && ["dashboard", "all", "returned", "pending"].includes(savedTab)) return savedTab;
// //     return "dashboard";
// //   };
// //   const [activeTab, setActiveTab] = useState(getInitialActiveTab);
// //   const handleTabChange = useCallback((key) => {
// //     setActiveTab(key);
// //     localStorage.setItem("purchaserActiveTab", key);
// //     const url = new URL(window.location);
// //     url.searchParams.set("tab", key);
// //     window.history.replaceState({}, "", url);
// //   }, []);

// //   // Product async search
// //   const {
// //     products,
// //     loading: productLoading,
// //     debouncedSearch,
// //     fetchInitialProducts,
// //   } = useProductSearch();

// //   const productOptions = useMemo(
// //     () =>
// //       products.map((p) => ({
// //         value: String(p.id),
// //         label: (
// //           <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
// //             <code style={{ fontSize: 12, color: "#555" }}>{p.sku || "NO-SKU"}</code>
// //             <span style={{ color: "#999" }}>—</span>
// //             <span style={{ fontSize: 13 }}>{p.product_name || "Untitled"}</span>
// //           </div>
// //         ),
// //         raw: p,
// //       })),
// //     [products]
// //   );

// //   const pageSize =
// //     screens.xxl ? 14 : screens.xl ? 12 : screens.lg ? 10 : screens.md ? 8 : 6;

// //   /* ----------- server params ----------- */
// //   const serverParams = useMemo(() => {
// //     const params = {};
// //     if (isAdmin) {
// //       if (selectedPurchaser?.value) params.purchaser_id = selectedPurchaser.value;
// //     } else {
// //       params.mine = true; // non-admin only sees own orders
// //     }

// //     if (activeTab === "returned") params.status = "Returned";
// //     else if (statusFilter) params.status = statusFilter;

// //     if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
// //       params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
// //       params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
// //     }
// //     if (selectedProductIds?.length) params.product_ids = selectedProductIds.join(",");
// //     if (searchTerm?.trim()) params.q = searchTerm.trim();
// //     return params;
// //   }, [
// //     isAdmin,
// //     selectedPurchaser,
// //     statusFilter,
// //     activeTab,
// //     dateRange,
// //     selectedProductIds,
// //     searchTerm,
// //   ]);

// //   /* ----------- fetch ----------- */
// //   const fetchAssigned = useCallback(async () => {
// //     if (activeTab === "pending") return;
// //     setLoading(true);
// //     try {
// //       const res = await apiClient.get("/api/v1/sourcing/assigned", { params: serverParams });
// //       setRequests(normalizeRequests(res.data));
// //     } catch (err) {
// //       console.error("Failed to fetch assigned:", err?.response?.data || err?.message);
// //       message.error(err?.response?.data?.message || "Failed to fetch assigned requests.");
// //       setRequests([]);
// //     } finally {
// //       setLoading(false);
// //     }
// //   }, [activeTab, serverParams]);

// //   useEffect(() => {
// //     fetchAssigned();
// //   }, [fetchAssigned]);

// //   const handleRefreshClick = useCallback(async () => {
// //     try {
// //       setIsRefreshing(true);
// //       await fetchAssigned();
// //     } finally {
// //       setIsRefreshing(false);
// //     }
// //   }, [fetchAssigned]);

// //   /* ----------- client-side filters ----------- */
// //   const filteredRequests = useMemo(() => {
// //     const term = (searchTerm || "").toLowerCase().trim();
// //     const hasDate = dateRange?.length === 2 && dateRange[0] && dateRange[1];
// //     const start = hasDate ? dayjs(dateRange[0]).startOf("day") : null;
// //     const end = hasDate ? dayjs(dateRange[1]).endOf("day") : null;

// //     return requests.filter((req) => {
// //       const items = Array.isArray(req.items) ? req.items : [];
// //       const haystacks = [
// //         req.seller_name || "",
// //         req.sourcer_name || "",
// //         req.market || "",
// //         req.listing_id || "",
// //         req.sourcing_id || req.id || req._id || "",
// //         ...items.map((it) => it.product_name || ""),
// //         ...items.map((it) => it.sku || ""),
// //       ]
// //         .join(" ")
// //         .toLowerCase();

// //       const matchesSearch = !term || haystacks.includes(term);
// //       const matchesProduct =
// //         !selectedProductIds.length ||
// //         items.some((it) => {
// //           const pid = String(it.id || it._id || it.product_id || "");
// //           return selectedProductIds.includes(pid);
// //         });

// //       const created = getCreated(req);
// //       const matchesDate =
// //         !hasDate || (!!created && dayjs(created).isAfter(start) && dayjs(created).isBefore(end));

// //       const inReturnedTab = activeTab === "returned" ? req.status === "Returned" : true;
// //       const matchesStatus = !statusFilter || req.status === statusFilter;

// //       return matchesSearch && matchesProduct && matchesDate && inReturnedTab && matchesStatus;
// //     });
// //   }, [requests, searchTerm, activeTab, selectedProductIds, dateRange, statusFilter]);

// //   /* ---------- columns ---------- */
// //   const columns = [
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
// //     {
// //       title: "Sourcer",
// //       dataIndex: "sourcer_name",
// //       width: 160,
// //       sorter: (a, b) => (a?.sourcer_name || "").localeCompare(b?.sourcer_name || ""),
// //       render: (v) => (v ? <p className="m-0 font-medium">{v}</p> : "—"),
// //     },
// //     {
// //       title: "Status",
// //       dataIndex: "status",
// //       width: 140,
// //       align: "center",
// //       sorter: (a, b) => (a?.status || "").localeCompare(b?.status || ""),
// //       render: (s) => (
// //         <Tag color={statusColor(s)} style={{ fontWeight: 400, fontSize: 13, borderRadius: 6 }}>
// //           {s}
// //         </Tag>
// //       ),
// //     },
// //     {
// //       title: "Seller",
// //       dataIndex: "seller_name",
// //       width: 180,
// //       ellipsis: true,
// //       onCell: () => ({
// //         style: { maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
// //       }),
// //       render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
// //     },
// //     {
// //       title: "Market",
// //       dataIndex: "market",
// //       width: 100,
// //       ellipsis: true,
// //       onCell: () => ({
// //         style: { maxWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
// //       }),
// //       render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
// //     },
// //     {
// //       title: "Seller Price",
// //       dataIndex: "sellers_price",
// //       width: 200,
// //       align: "right",
// //       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
// //     },
// //     {
// //       title: "Shipping charges",
// //       dataIndex: "shipping_charges",
// //       width: 200,
// //       align: "right",
// //       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
// //     },
// //     {
// //       title: "Tax",
// //       dataIndex: "taxes",
// //       width: 100,
// //       align: "right",
// //       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
// //     },
// //     {
// //       title: "Target Cost",
// //       dataIndex: "target_total_cost",
// //       width: 130,
// //       align: "right",
// //       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
// //       responsive: ["md"],
// //     },
// //     {
// //       title: "Actual Cost",
// //       dataIndex: "total_actual_cost",
// //       width: 130,
// //       align: "right",
// //       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
// //       responsive: ["md"],
// //     },
// //     {
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
// //       responsive: ["lg"],
// //     },
// //     {
// //       title: "Created At",
// //       dataIndex: "created_at",
// //       width: 190,
// //       render: (date, rec) => {
// //         const d = new Date(date || rec.createdAt || rec.created_on || 0);
// //         return (
// //           <span >
// //             {d.toLocaleString("en-US", {
// //               year: "numeric",
// //               month: "2-digit",
// //               day: "2-digit",
// //               hour: "numeric",
// //               minute: "2-digit",
// //               hour12: true,
// //             })}
// //           </span>
// //         );
// //       },
// //     },
// //   ];

// //   const ProductsSelect = (
// //     <Select
// //       mode="multiple"
// //       showSearch
// //       allowClear
// //       maxTagCount="responsive"
// //       placeholder="Products"
// //       style={{ width: "100%" }}
// //       size={screens.xs ? "middle" : "large"}
// //       onSearch={debouncedSearch}
// //       onDropdownVisibleChange={(open) => open && fetchInitialProducts()}
// //       options={productOptions}
// //       filterOption={false}
// //       loading={productLoading}
// //       value={selectedProductIds}
// //       onChange={(vals) => setSelectedProductIds(vals)}
// //     />
// //   );

// //   const clearAll = () => {
// //     setStatusFilter("");
// //     setSearchTerm("");
// //     setDateRange([]);
// //     setSelectedProductIds([]);
// //     // keep selectedPurchaser as-is so admin scope stays applied
// //     fetchAssigned();
// //   };

// //   // Admin scope control (Select value tied to option.value; store full option in state)
// //   const AdminScopeControl = isAdmin ? (
// //     <Select
// //       allowClear
// //       showSearch
// //       placeholder="View purchaser…"
// //       style={{ minWidth: 260 }}
// //       options={purchaserOptions}
// //       loading={purchaserLoading}
// //       value={selectedPurchaser?.value} // control by option.value
// //       onSearch={purchaserSearch}
// //       onDropdownVisibleChange={(open) => open && fetchInitialPurchasers()}
// //       onChange={(_, option) => setSelectedPurchaser(option || null)} // store full option (with .raw)
// //       filterOption={false}
// //       size={screens.xs ? "middle" : "large"}
// //     />
// //   ) : null;

// //   return (
// //     <motion.div
// //       initial={{ opacity: 0, y: 30 }}
// //       animate={{ opacity: 1, y: 0 }}
// //       transition={{ duration: 0.6, ease: "easeOut" }}
// //     >
// //       {/* Header */}
// //       <Card
// //         style={{
// //           borderRadius: 18,
// //           marginBottom: 16,
// //           background:
// //             "radial-gradient( circle at 10% 10%, rgba(92,51,200,0.08), transparent 60%), radial-gradient( circle at 90% 10%, rgba(0,242,254,0.08), transparent 50%)",
// //         }}
// //         bodyStyle={{ padding: screens.xs ? 12 : 20 }}
// //       >
// //         <Row justify="space-between" align="middle" gutter={[12, 12]}>
// //           <Col xs={24} md={8}>
// //             <Space direction="vertical" size={2}>
// //               <Title level={3} style={{ margin: 0, color: "#1f2937", fontWeight: 500 }}>
// //                 Total Orders: {filteredRequests.length}
// //               </Title>
// //               <Text type="secondary">Click a row to open request</Text>
// //             </Space>
// //           </Col>

// //           <Col xs={24} md={16}>
// //             <Row gutter={[8, 8]} justify="end">
// //               {/* Keep refresh */}
// //               <Button
// //                 icon={<ReloadOutlined />}
// //                 onClick={handleRefreshClick}
// //                 loading={isRefreshing}
// //                 type="primary"
// //               >
// //                 {isRefreshing ? "Refreshing..." : "Refresh"}
// //               </Button>
// //             </Row>
// //           </Col>
// //         </Row>
// //       </Card>

// //       {/* Filters */}
// //       <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
// //         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
// //           <Title level={4} style={{ margin: 0 }} className="text-gray-700">
// //             Filters
// //           </Title>

// //           <div className="flex gap-2 items-center">
// //             {/* Admin purchaser scope appears here too if you want it visible on all tabs */}
// //             {AdminScopeControl}
// //             <button
// //               onClick={clearAll}
// //               className="sm:w-auto w-full flex min-w-fit text-sm sm:text-base items-center justify-center gap-2 px-4 py-1 bg-red-500 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm"
// //             >
// //               Clear
// //             </button>
// //           </div>
// //         </div>

// //         <Row gutter={[8, 8]}>
// //           <Col xs={24} sm={12} md={6} lg={5}>
// //             <Select
// //               placeholder="Status"
// //               style={{ width: "100%" }}
// //               onChange={(value) => setStatusFilter(value || "")}
// //               allowClear
// //               value={statusFilter || undefined}
// //               size={screens.xs ? "middle" : "large"}
// //             >
// //               {[
// //                 "Assigned",
// //                 "Offer",
// //                 "Purchased",
// //                 "Disapproved",
// //                 "Sold",
// //                 "Hold",
// //                 "Seller Rejected",
// //                 "Dropshipped",
// //                 "Returned",
// //               ].map((status) => (
// //                 <Option key={status} value={status}>
// //                   {status}
// //                 </Option>
// //               ))}
// //             </Select>
// //           </Col>

// //           <Col xs={24} sm={12} md={8} lg={7}>
// //             <Search
// //               placeholder="Search product/SKU/seller/sourcer/id"
// //               allowClear
// //               value={searchTerm}
// //               onChange={(e) => setSearchTerm(e.target.value)}
// //               onSearch={(v) => setSearchTerm(v)}
// //               style={{ width: "100%" }}
// //               size={screens.xs ? "middle" : "large"}
// //               enterButton={<FilterOutlined />}
// //             />
// //           </Col>

// //           <Col xs={24} sm={24} md={10} lg={8}>
// //             <DatePicker.RangePicker
// //               style={{ width: "100%" }}
// //               onChange={(dates) => setDateRange(dates ?? [])}
// //               value={dateRange}
// //               size={screens.xs ? "middle" : "large"}
// //             />
// //           </Col>
// //         </Row>
// //       </div>

// //       <Tabs
// //         activeKey={activeTab}
// //         onChange={handleTabChange}
// //         type="card"
// //         style={{ marginBottom: 16, fontWeight: 500 }}
// //         tabBarStyle={{ fontSize: 16 }}
// //       >
// //         <TabPane tab="Dashboard" key="dashboard">
// //           <PurchaserDashboard
// //             data={filteredRequests}
// //             loading={loading}
// //             onRefresh={fetchAssigned}
// //             /* new props for header area */
// //             isAdmin={isAdmin}
// //             scopedPurchaser={selectedPurchaser?.raw || null}
// //             onClearScope={() => setSelectedPurchaser(null)}
// //             adminScopeSlot={AdminScopeControl}
// //           />
// //         </TabPane>

// //         <TabPane tab="All Assigned" key="all">
// //           <motion.div
// //             initial={{ scale: 0.97, opacity: 0 }}
// //             animate={{ scale: 1, opacity: 1 }}
// //             transition={{ duration: 0.4 }}
// //           >
// //             <Table
// //               locale={{ emptyText: <Empty description="No assigned requests match your filters" /> }}
// //               dataSource={filteredRequests}
// //               columns={columns}
// //               rowKey={(rec) => rec._id}
// //               loading={loading}
// //               size={screens.md ? "middle" : "small"}
// //               pagination={{ pageSize, showSizeChanger: false, responsive: true }}
// //               onRow={(record) => ({
// //                 onClick: () => {
// //                   const id = record._id || record.id;
// //                   if (id) navigate(`/requests/${id}`);
// //                 },
// //                 style: { cursor: "pointer" },
// //               })}
// //               rowClassName={() => "row-clickable"}
// //               scroll={{ x: "max-content" }}
// //               tableLayout="fixed"
// //               sticky
// //               expandable={{
// //                 expandedRowRender: (record) => (
// //                   <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
// //                 ),
// //                 rowExpandable: (record) =>
// //                   Array.isArray(record.items) && record.items.length > 0,
// //               }}
// //             />
// //           </motion.div>
// //         </TabPane>

// //         <TabPane tab="Returned" key="returned">
// //           <Table
// //             locale={{ emptyText: <Empty description="No returned requests match your filters" /> }}
// //             dataSource={filteredRequests}
// //             columns={columns}
// //             rowKey={(rec) => rec._id}
// //             loading={loading}
// //             size={screens.md ? "middle" : "small"}
// //             pagination={{ pageSize, showSizeChanger: false, responsive: true }}
// //             onRow={(record) => ({
// //               onClick: () => {
// //                 const id = record._id || record.id;
// //                 if (id) navigate(`/requests/${id}`);
// //               },
// //               style: { cursor: "pointer" },
// //             })}
// //             rowClassName={() => "row-clickable"}
// //             scroll={{ x: "max-content" }}
// //             tableLayout="fixed"
// //             sticky
// //             expandable={{
// //               expandedRowRender: (record) => (
// //                 <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
// //               ),
// //               rowExpandable: (record) =>
// //                 Array.isArray(record.items) && record.items.length > 0,
// //             }}
// //           />
// //         </TabPane>

// //         <TabPane tab="Pending" key="pending">
// //           <PurchaserPendingPage  isAdmin={currentUser?.roles?.includes('admin')}  onAssigned={() => fetchAssigned()} />
// //         </TabPane>
// //       </Tabs>

// //       <style>{`
// //         .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
// //         .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab { background: #f5f5f5 !important; border: 1px solid #d9d9d9 !important; color: #666 !important; font-weight: 500 !important; transition: all 0.3s ease !important; }
// //         .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:hover { background: #e6f7ff !important; border-color: #91d5ff !important; color: #1890ff !important; }
// //         .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active { background: #1890ff !important; border-color: #1890ff !important; color: #fff !important; font-weight: 600 !important; }
// //         .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
// //       `}</style>
// //     </motion.div>
// //   );
// // }



// // /src/pages/purchaser/PurchaserPage.jsx
// import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
// import {
//   Table, message, Tag, Select, Typography, Input, Tabs, DatePicker,
//   Button, Card, Grid, Row, Col, Space, Empty,
// } from "antd";
// import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";
// import apiClient from "../../api/client";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useAuth } from "../../contexts/AuthContext"; 
// import useProductSearch from "../sourcer/hooks/useProductSearch";
// import PurchaserDashboard from "./PurchaserDashboardPage";

// import {
//   normalizeRequests,
//   getCreated,
//   statusColor,
//   num as safeNum,
//   ExpandedItemsTable,
// } from "./utils/PurchaseTableUtils";
// import PurchaserPendingPage from "./PurchaserPendingPage";

// const { Option } = Select;
// const { Title, Text } = Typography;
// const { TabPane } = Tabs;
// const { Search } = Input;
// const { useBreakpoint } = Grid;

// /** ───────────────── Admin Purchaser search ───────────────── */
// function usePurchaserSearch() {
//   const [options, setOptions] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const t = useRef(null);

//   const mapUser = (u) => ({
//     value: String(u.value), // backend returns user _id in value
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
//       if (status === 403) {
//         message.warning("Only admins can search purchasers.");
//       } else {
//         message.error(e?.response?.data?.message || "Failed to search purchasers.");
//       }
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

// export default function PurchaserPage() {
//   const { user: authUser } = useAuth();
//   // Robust admin check: supports roles as array, object {role}, or string
//   const isAdmin = (() => {
//     const r = authUser?.roles;
//     if (Array.isArray(r)) {
//       return r
//         .map((x) =>
//           typeof x === "string" ? x.toLowerCase() : String(x?.role || "").toLowerCase()
//         )
//         .includes("admin");
//     }
//     return String(r?.role || r || "").toLowerCase() === "admin";
//   })();

//   const [requests, setRequests] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [isRefreshing, setIsRefreshing] = useState(false);

//   // filters
//   const [statusFilter, setStatusFilter] = useState("");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [dateRange, setDateRange] = useState([]);
//   const [selectedProductIds, setSelectedProductIds] = useState([]);

//   // admin purchaser scope
//   const [selectedPurchaser, setSelectedPurchaser] = useState(null);
//   const {
//     options: purchaserOptions,
//     loading: purchaserLoading,
//     debouncedSearch: purchaserSearch,
//     fetchInitial: fetchInitialPurchasers,
//   } = usePurchaserSearch();

//   const screens = useBreakpoint();
//   const navigate = useNavigate();
//   const location = useLocation();

//   // Tabs persistence
//   const getInitialActiveTab = () => {
//     const urlParams = new URLSearchParams(location.search);
//     const urlTab = urlParams.get("tab");
//     if (urlTab && ["dashboard", "all", "returned", "pending"].includes(urlTab)) return urlTab;
//     const savedTab = localStorage.getItem("purchaserActiveTab");
//     if (savedTab && ["dashboard", "all", "returned", "pending"].includes(savedTab)) return savedTab;
//     return "dashboard";
//   };
//   const [activeTab, setActiveTab] = useState(getInitialActiveTab);
//   const handleTabChange = useCallback((key) => {
//     setActiveTab(key);
//     localStorage.setItem("purchaserActiveTab", key);
//     const url = new URL(window.location);
//     url.searchParams.set("tab", key);
//     window.history.replaceState({}, "", url);
//   }, []);

//   // Product async search
//   const {
//     products,
//     loading: productLoading,
//     debouncedSearch,
//     fetchInitialProducts,
//   } = useProductSearch();

//   const productOptions = useMemo(
//     () =>
//       products.map((p) => ({
//         value: String(p.id),
//         label: (
//           <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
//             <code style={{ fontSize: 12, color: "#555" }}>{p.sku || "NO-SKU"}</code>
//             <span style={{ color: "#999" }}>—</span>
//             <span style={{ fontSize: 13 }}>{p.product_name || "Untitled"}</span>
//           </div>
//         ),
//         raw: p,
//       })),
//     [products]
//   );

//   const pageSize =
//     screens.xxl ? 14 : screens.xl ? 12 : screens.lg ? 10 : screens.md ? 8 : 6;

//   /* ----------- server params ----------- */
//   const serverParams = useMemo(() => {
//     const params = {};
//     if (isAdmin) {
//       if (selectedPurchaser?.value) params.purchaser_id = selectedPurchaser.value;
//     } else {
//       // Non-admin should only see assignments to themselves
//       params.mine = true;
//     }

//     if (activeTab === "returned") params.status = "Returned";
//     else if (statusFilter) params.status = statusFilter;

//     if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
//       params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
//       params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
//     }
//     if (selectedProductIds?.length) params.product_ids = selectedProductIds.join(",");
//     if (searchTerm?.trim()) params.q = searchTerm.trim();
//     return params;
//   }, [
//     isAdmin,
//     selectedPurchaser,
//     statusFilter,
//     activeTab,
//     dateRange,
//     selectedProductIds,
//     searchTerm,
//   ]);

//   /* ----------- fetch ----------- */
//   const fetchAssigned = useCallback(async () => {
//     if (activeTab === "pending") return;
//     setLoading(true);
//     try {
//       // backend should respect ?mine=true for purchasers; admins see all
//       const res = await apiClient.get("/api/v1/sourcing/assigned", { params: serverParams });
//       setRequests(normalizeRequests(res.data));
//     } catch (err) {
//       console.error("Failed to fetch assigned:", err?.response?.data || err?.message);
//       message.error(err?.response?.data?.message || "Failed to fetch assigned requests.");
//       setRequests([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [activeTab, serverParams]);

//   useEffect(() => {
//     fetchAssigned();
//   }, [fetchAssigned]);

//   const handleRefreshClick = useCallback(async () => {
//     try {
//       setIsRefreshing(true);
//       await fetchAssigned();
//     } finally {
//       setIsRefreshing(false);
//     }
//   }, [fetchAssigned]);

//   /* ----------- client-side filters ----------- */
//   const filteredRequests = useMemo(() => {
//     const term = (searchTerm || "").toLowerCase().trim();
//     const hasDate = dateRange?.length === 2 && dateRange[0] && dateRange[1];
//     const start = hasDate ? dayjs(dateRange[0]).startOf("day") : null;
//     const end = hasDate ? dayjs(dateRange[1]).endOf("day") : null;

//     return requests.filter((req) => {
//       const items = Array.isArray(req.items) ? req.items : [];
//       const haystacks = [
//         req.seller_name || "",
//         req.sourcer_name || "",
//         req.market || "",
//         req.listing_id || "",
//         req.sourcing_id || req.id || req._id || "",
//         ...items.map((it) => it.product_name || ""),
//         ...items.map((it) => it.sku || ""),
//       ]
//         .join(" ")
//         .toLowerCase();

//       const matchesSearch = !term || haystacks.includes(term);
//       const matchesProduct =
//         !selectedProductIds.length ||
//         items.some((it) => {
//           const pid = String(it.id || it._id || it.product_id || "");
//           return selectedProductIds.includes(pid);
//         });

//       const created = getCreated(req);
//       const matchesDate =
//         !hasDate || (!!created && dayjs(created).isAfter(start) && dayjs(created).isBefore(end));

//       const inReturnedTab = activeTab === "returned" ? req.status === "Returned" : true;
//       const matchesStatus = !statusFilter || req.status === statusFilter;

//       return matchesSearch && matchesProduct && matchesDate && inReturnedTab && matchesStatus;
//     });
//   }, [requests, searchTerm, activeTab, selectedProductIds, dateRange, statusFilter]);

//   /* ---------- columns ---------- */
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
//     {
//       title: "Sourcer",
//       dataIndex: "sourcer_name",
//       width: 160,
//       sorter: (a, b) => (a?.sourcer_name || "").localeCompare(b?.sourcer_name || ""),
//       render: (v) => (v ? <p className="m-0 font-medium">{v}</p> : "—"),
//     },
//     {
//       title: "Status",
//       dataIndex: "status",
//       width: 140,
//       align: "center",
//       sorter: (a, b) => (a?.status || "").localeCompare(b?.status || ""),
//       render: (s) => (
//         <Tag color={statusColor(s)} style={{ fontWeight: 400, fontSize: 13, borderRadius: 6 }}>
//           {s}
//         </Tag>
//       ),
//     },
//     {
//       title: "Seller",
//       dataIndex: "seller_name",
//       width: 180,
//       ellipsis: true,
//       onCell: () => ({
//         style: { maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
//       }),
//       render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
//     },
//     {
//       title: "Market",
//       dataIndex: "market",
//       width: 100,
//       ellipsis: true,
//       onCell: () => ({
//         style: { maxWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
//       }),
//       render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
//     },
//     {
//       title: "Seller Price",
//       dataIndex: "sellers_price",
//       width: 200,
//       align: "right",
//       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
//     },
//     {
//       title: "Shipping charges",
//       dataIndex: "shipping_charges",
//       width: 200,
//       align: "right",
//       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
//     },
//     {
//       title: "Tax",
//       dataIndex: "taxes",
//       width: 100,
//       align: "right",
//       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
//     },
//     {
//       title: "Target Cost",
//       dataIndex: "target_total_cost",
//       width: 130,
//       align: "right",
//       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
//       responsive: ["md"],
//     },
//     {
//       title: "Actual Cost",
//       dataIndex: "total_actual_cost",
//       width: 130,
//       align: "right",
//       render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
//       responsive: ["md"],
//     },
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
//       responsive: ["lg"],
//     },
//     {
//       title: "Created At",
//       dataIndex: "created_at",
//       width: 190,
//       render: (date, rec) => {
//         const d = new Date(date || rec.createdAt || rec.created_on || 0);
//         return (
//           <span>
//             {d.toLocaleString("en-US", {
//               year: "numeric",
//               month: "2-digit",
//               day: "2-digit",
//               hour: "numeric",
//               minute: "2-digit",
//               hour12: true,
//             })}
//           </span>
//         );
//       },
//     },
//   ];

//   const ProductsSelect = (
//     <Select
//       mode="multiple"
//       showSearch
//       allowClear
//       maxTagCount="responsive"
//       placeholder="Products"
//       style={{ width: "100%" }}
//       size={screens.xs ? "middle" : "large"}
//       onSearch={debouncedSearch}
//       onDropdownVisibleChange={(open) => open && fetchInitialProducts()}
//       options={productOptions}
//       filterOption={false}
//       loading={productLoading}
//       value={selectedProductIds}
//       onChange={(vals) => setSelectedProductIds(vals)}
//     />
//   );

//   const clearAll = () => {
//     setStatusFilter("");
//     setSearchTerm("");
//     setDateRange([]);
//     setSelectedProductIds([]);
//     fetchAssigned();
//   };

//   const AdminScopeControl = isAdmin ? (
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

//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 30 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.6, ease: "easeOut" }}
//     >
//       {/* Header */}
//       <Card
//         style={{
//           borderRadius: 18,
//           marginBottom: 16,
//           background:
//             "radial-gradient( circle at 10% 10%, rgba(92,51,200,0.08), transparent 60%), radial-gradient( circle at 90% 10%, rgba(0,242,254,0.08), transparent 50%)",
//         }}
//         bodyStyle={{ padding: screens.xs ? 12 : 20 }}
//       >
//         <Row justify="space-between" align="middle" gutter={[12, 12]}>
//           <Col xs={24} md={8}>
//             <Space direction="vertical" size={2}>
//               <Title level={3} style={{ margin: 0, color: "#1f2937", fontWeight: 500 }}>
//                 Total Orders: {filteredRequests.length}
//               </Title>
//               <Text type="secondary">Click a row to open request</Text>
//             </Space>
//           </Col>

//           <Col xs={24} md={16}>
//             <Row gutter={[8, 8]} justify="end">
//               <Button
//                 icon={<ReloadOutlined />}
//                 onClick={handleRefreshClick}
//                 loading={isRefreshing}
//                 type="primary"
//               >
//                 {isRefreshing ? "Refreshing..." : "Refresh"}
//               </Button>
//             </Row>
//           </Col>
//         </Row>
//       </Card>

//       {/* Filters */}
//       <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
//           <Title level={4} style={{ margin: 0 }} className="text-gray-700">
//             Filters
//           </Title>

//           <div className="flex gap-2 items-center">
//             {AdminScopeControl}
//             <button
//               onClick={clearAll}
//               className="sm:w-auto w-full flex min-w-fit text-sm sm:text-base items-center justify-center gap-2 px-4 py-1 bg-red-500 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm"
//             >
//               Clear
//             </button>
//           </div>
//         </div>

//         <Row gutter={[8, 8]}>
//           <Col xs={24} sm={12} md={6} lg={5}>
//             <Select
//               placeholder="Status"
//               style={{ width: "100%" }}
//               onChange={(value) => setStatusFilter(value || "")}
//               allowClear
//               value={statusFilter || undefined}
//               size={screens.xs ? "middle" : "large"}
//             >
//               {[
//                 "Assigned",
//                 "Offer",
//                 "Purchased",
//                 "Disapproved",
//                 "Sold",
//                 "Hold",
//                 "Seller Rejected",
//                 "Dropshipped",
//                 "Returned",
//               ].map((status) => (
//                 <Option key={status} value={status}>
//                   {status}
//                 </Option>
//               ))}
//             </Select>
//           </Col>

//           <Col xs={24} sm={12} md={8} lg={7}>
//             <Search
//               placeholder="Search product/SKU/seller/sourcer/id"
//               allowClear
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               onSearch={(v) => setSearchTerm(v)}
//               style={{ width: "100%" }}
//               size={screens.xs ? "middle" : "large"}
//               enterButton={<FilterOutlined />}
//             />
//           </Col>

//           <Col xs={24} sm={24} md={10} lg={8}>
//             <DatePicker.RangePicker
//               style={{ width: "100%" }}
//               onChange={(dates) => setDateRange(dates ?? [])}
//               value={dateRange}
//               size={screens.xs ? "middle" : "large"}
//             />
//           </Col>
//         </Row>
//       </div>

//       <Tabs
//         activeKey={activeTab}
//         onChange={handleTabChange}
//         type="card"
//         style={{ marginBottom: 16, fontWeight: 500 }}
//         tabBarStyle={{ fontSize: 16 }}
//       >
//         <TabPane tab="Dashboard" key="dashboard">
//           <PurchaserDashboard
//             data={filteredRequests}
//             loading={loading}
//             onRefresh={fetchAssigned}
//             isAdmin={isAdmin}
//             scopedPurchaser={selectedPurchaser?.raw || null}
//             onClearScope={() => setSelectedPurchaser(null)}
//             adminScopeSlot={AdminScopeControl}
//           />
//         </TabPane>

//         <TabPane tab="All Assigned" key="all">
//           <motion.div
//             initial={{ scale: 0.97, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//             transition={{ duration: 0.4 }}
//           >
//             <Table
//               locale={{ emptyText: <Empty description="No assigned requests match your filters" /> }}
//               dataSource={filteredRequests}
//               columns={columns}
//               rowKey={(rec) => rec._id}
//               loading={loading}
//               size={screens.md ? "middle" : "small"}
//               pagination={{ pageSize, showSizeChanger: false, responsive: true }}
//               onRow={(record) => ({
//                 onClick: () => {
//                   const id = record._id || record.id;
//                   if (id) navigate(`/requests/${id}`);
//                 },
//                 style: { cursor: "pointer" },
//               })}
//               rowClassName={() => "row-clickable"}
//               scroll={{ x: "max-content" }}
//               tableLayout="fixed"
//               sticky
//               expandable={{
//                 expandedRowRender: (record) => (
//                   <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
//                 ),
//                 rowExpandable: (record) =>
//                   Array.isArray(record.items) && record.items.length > 0,
//               }}
//             />
//           </motion.div>
//         </TabPane>

//         <TabPane tab="Returned" key="returned">
//           <Table
//             locale={{ emptyText: <Empty description="No returned requests match your filters" /> }}
//             dataSource={filteredRequests}
//             columns={columns}
//             rowKey={(rec) => rec._id}
//             loading={loading}
//             size={screens.md ? "middle" : "small"}
//             pagination={{ pageSize, showSizeChanger: false, responsive: true }}
//             onRow={(record) => ({
//               onClick: () => {
//                 const id = record._id || record.id;
//                 if (id) navigate(`/requests/${id}`);
//               },
//               style: { cursor: "pointer" },
//             })}
//             rowClassName={() => "row-clickable"}
//             scroll={{ x: "max-content" }}
//             tableLayout="fixed"
//             sticky
//             expandable={{
//               expandedRowRender: (record) => (
//                 <ExpandedItemsTable order={record} onOpen={(to) => navigate(to)} />
//               ),
//               rowExpandable: (record) =>
//                 Array.isArray(record.items) && record.items.length > 0,
//             }}
//           />
//         </TabPane>

//         <TabPane tab="Pending" key="pending">
//           {/* FIX: use isAdmin we computed above, not currentUser */}
//           <PurchaserPendingPage
//             isAdmin={isAdmin}
//             onAssigned={fetchAssigned}
//           />
//         </TabPane>
//       </Tabs>

//       <style>{`
//         .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
//         .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab { background: #f5f5f5 !important; border: 1px solid #d9d9d9 !important; color: #666 !important; font-weight: 500 !important; transition: all 0.3s ease !important; }
//         .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:hover { background: #e6f7ff !important; border-color: #91d5ff !important; color: #1890ff !important; }
//         .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active { background: #1890ff !important; border-color: #1890ff !important; color: #fff !important; font-weight: 600 !important; }
//         .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
//       `}</style>
//     </motion.div>
//   );
// }



// /src/pages/purchaser/PurchaserPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Table, message, Tag, Select, Typography, Input, Tabs, DatePicker,
  Button, Card, Grid, Row, Col, Space, Empty,
} from "antd";
import { FilterOutlined, ReloadOutlined } from "@ant-design/icons";
import apiClient from "../../api/client";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import useProductSearch from "../sourcer/hooks/useProductSearch";
import PurchaserDashboard from "./PurchaserDashboardPage";
import SleekPagination from "./components/SleekPagination";

import {
  normalizeRequests,
  getCreated,
  statusColor,
  num as safeNum,
  ExpandedItemsTable,
} from "./utils/PurchaseTableUtils";
import PurchaserPendingPage from "./PurchaserPendingPage";

const { Option } = Select;
const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
const { useBreakpoint } = Grid;

/* safe rows getter for various API shapes */
const pickRows = (body) =>
  Array.isArray(body)
    ? body
    : body?.docs || body?.data || body?.results || body?.items || [];

/** ───────────────── Admin Purchaser search ───────────────── */
function usePurchaserSearch() {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const t = useRef(null);

  const mapUser = (u) => ({
    value: String(u.value), // backend returns user _id in value
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
      if (status === 403) {
        message.warning("Only admins can search purchasers.");
      } else {
        message.error(e?.response?.data?.message || "Failed to search purchasers.");
      }
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

export default function PurchaserPage() {
  const { user: authUser } = useAuth();
  // Robust admin check
  const isAdmin = (() => {
    const r = authUser?.roles;
    if (Array.isArray(r)) {
      return r
        .map((x) =>
          typeof x === "string" ? x.toLowerCase() : String(x?.role || "").toLowerCase()
        )
        .includes("admin");
    }
    return String(r?.role || r || "").toLowerCase() === "admin";
  })();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // admin purchaser scope
  const [selectedPurchaser, setSelectedPurchaser] = useState(null);
  const {
    options: purchaserOptions,
    loading: purchaserLoading,
    debouncedSearch: purchaserSearch,
    fetchInitial: fetchInitialPurchasers,
  } = usePurchaserSearch();

  const screens = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();

  // Tabs persistence
  const getInitialActiveTab = () => {
    const urlParams = new URLSearchParams(location.search);
    const urlTab = urlParams.get("tab");
    if (urlTab && ["dashboard", "all", "returned", "pending"].includes(urlTab)) return urlTab;
    const savedTab = localStorage.getItem("purchaserActiveTab");
    if (savedTab && ["dashboard", "all", "returned", "pending"].includes(savedTab)) return savedTab;
    return "dashboard";
  };
  const [activeTab, setActiveTab] = useState(getInitialActiveTab);
  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    localStorage.setItem("purchaserActiveTab", key);
    const url = new URL(window.location);
    url.searchParams.set("tab", key);
    window.history.replaceState({}, "", url);
  }, []);

  // Product async search
  const {
    products,
    loading: productLoading,
    debouncedSearch,
    fetchInitialProducts,
  } = useProductSearch();

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: String(p.id),
        label: (
          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
            <code style={{ fontSize: 12, color: "#555" }}>{p.sku || "NO-SKU"}</code>
            <span style={{ color: "#999" }}>—</span>
            <span style={{ fontSize: 13 }}>{p.product_name || "Untitled"}</span>
          </div>
        ),
        raw: p,
      })),
    [products]
  );

  /* ----------- server params (filters) ----------- */
  const serverParams = useMemo(() => {
    const params = {};
    if (isAdmin) {
      if (selectedPurchaser?.value) params.purchaser_id = selectedPurchaser.value;
    } else {
      params.mine = true; // non-admin only sees own
    }

    if (activeTab === "returned") params.status = "Returned";
    else if (statusFilter) params.status = statusFilter;

    if (dateRange?.length === 2 && dateRange[0] && dateRange[1]) {
      params.start_date = dayjs(dateRange[0]).startOf("day").toISOString();
      params.end_date = dayjs(dateRange[1]).endOf("day").toISOString();
    }
    if (selectedProductIds?.length) params.product_ids = selectedProductIds.join(",");
    if (searchTerm?.trim()) params.q = searchTerm.trim();
    return params;
  }, [
    isAdmin,
    selectedPurchaser,
    statusFilter,
    activeTab,
    dateRange,
    selectedProductIds,
    searchTerm,
  ]);

  /* Reset to first page when filters/tab/scope change */
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm, dateRange, selectedProductIds, selectedPurchaser, activeTab]);

  /* ----------- fetch (server-side pagination) ----------- */
  const fetchAssigned = useCallback(async () => {
    if (activeTab === "pending") return; // pending tab uses its own component
    setLoading(true);
    try {
      const { data } = await apiClient.get("/api/v1/sourcing/assigned", {
        params: { ...serverParams, page, limit, sort: "-createdAt" },
      });
      const rows = pickRows(data);
      setRequests(normalizeRequests(rows));
      setTotal(Number(data?.total ?? rows.length ?? 0));
    } catch (err) {
      console.error("Failed to fetch assigned:", err?.response?.data || err?.message);
      message.error(err?.response?.data?.message || "Failed to fetch assigned requests.");
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, serverParams, page, limit]);

  useEffect(() => {
    fetchAssigned();
  }, [fetchAssigned]);

  const handleRefreshClick = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await fetchAssigned();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchAssigned]);

  /* ---------- columns ---------- */
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
      sorter: (a, b) => (a?.sourcer_name || "").localeCompare(b?.sourcer_name || ""),
      render: (v) => (v ? <p className="m-0 font-medium">{v}</p> : "—"),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
      align: "center",
      sorter: (a, b) => (a?.status || "").localeCompare(b?.status || ""),
      render: (s) => (
        <Tag color={statusColor(s)} style={{ fontWeight: 400, fontSize: 13, borderRadius: 6 }}>
          {s}
        </Tag>
      ),
    },
    {
      title: "Seller",
      dataIndex: "seller_name",
      width: 180,
      ellipsis: true,
      onCell: () => ({
        style: { maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: "Market",
      dataIndex: "market",
      width: 100,
      ellipsis: true,
      onCell: () => ({
        style: { maxWidth: 100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
      }),
      render: (v) => (v ? <p className="m-0">{v}</p> : "—"),
    },
    {
      title: "Seller Price",
      dataIndex: "sellers_price",
      width: 200,
      align: "right",
      render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
    },
    {
      title: "Shipping charges",
      dataIndex: "shipping_charges",
      width: 200,
      align: "right",
      render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
    },
    {
      title: "Tax",
      dataIndex: "taxes",
      width: 100,
      align: "right",
      render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
    },
    {
      title: "Target Cost",
      dataIndex: "target_total_cost",
      width: 130,
      align: "right",
      render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
      responsive: ["md"],
    },
    {
      title: "Actual Cost",
      dataIndex: "total_actual_cost",
      width: 130,
      align: "right",
      render: (price) => (price ? <p className="m-0">${parseFloat(price).toFixed(2)}</p> : "—"),
      responsive: ["md"],
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
        return <p className="m-0" style={{ color }}>${eff ? parseFloat(eff).toFixed(2) : "0.00"}</p>;
      },
      responsive: ["lg"],
    },
    {
      title: "Created At",
      dataIndex: "created_at",
      width: 190,
      render: (date, rec) => {
        const d = new Date(date || rec.createdAt || rec.created_on || 0);
        return (
          <span>
            {d.toLocaleString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </span>
        );
      },
    },
  ];

  const ProductsSelect = (
    <Select
      mode="multiple"
      showSearch
      allowClear
      maxTagCount="responsive"
      placeholder="Products"
      style={{ width: "100%" }}
      size={screens.xs ? "middle" : "large"}
      onSearch={debouncedSearch}
      onDropdownVisibleChange={(open) => open && fetchInitialProducts()}
      options={productOptions}
      filterOption={false}
      loading={productLoading}
      value={selectedProductIds}
      onChange={(vals) => setSelectedProductIds(vals)}
    />
  );

  const clearAll = () => {
    setStatusFilter("");
    setSearchTerm("");
    setDateRange([]);
    setSelectedProductIds([]);
    setPage(1);
    fetchAssigned();
  };

  const AdminScopeControl = isAdmin ? (
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header */}
      <Card
        style={{
          borderRadius: 18,
          marginBottom: 16,
          background:
            "radial-gradient( circle at 10% 10%, rgba(92,51,200,0.08), transparent 60%), radial-gradient( circle at 90% 10%, rgba(0,242,254,0.08), transparent 50%)",
        }}
        bodyStyle={{ padding: screens.xs ? 12 : 20 }}
      >
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Space direction="vertical" size={2}>
              <Title level={3} style={{ margin: 0, color: "#1f2937", fontWeight: 500 }}>
                Total Orders: {total}
              </Title>
              <Text type="secondary">Click a row to open request</Text>
            </Space>
          </Col>

          <Col xs={24} md={16}>
            <Row gutter={[8, 8]} justify="end">
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefreshClick}
                loading={isRefreshing}
                type="primary"
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <Title level={4} style={{ margin: 0 }} className="text-gray-700">
            Filters
          </Title>

          <div className="flex gap-2 items-center">
            {AdminScopeControl}
            <button
              onClick={clearAll}
              className="sm:w-auto w-full flex min-w-fit text-sm sm:text-base items-center justify-center gap-2 px-4 py-1 bg-red-500 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-sm"
            >
              Clear
            </button>
          </div>
        </div>

        <Row gutter={[8, 8]}>
          <Col xs={24} sm={12} md={6} lg={5}>
            <Select
              placeholder="Status"
              style={{ width: "100%" }}
              onChange={(value) => setStatusFilter(value || "")}
              allowClear
              value={statusFilter || undefined}
              size={screens.xs ? "middle" : "large"}
            >
              {[
                "Assigned",
                "Offer",
                "Purchased",
                "Disapproved",
                "Sold",
                "Hold",
                "Seller Rejected",
                "Dropshipped",
                "Returned",
              ].map((status) => (
                <Option key={status} value={status}>
                  {status}
                </Option>
              ))}
            </Select>
          </Col>

          <Col xs={24} sm={12} md={8} lg={7}>
            <Search
              placeholder="Search product/SKU/seller/sourcer/id"
              allowClear
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={(v) => setSearchTerm(v)}
              style={{ width: "100%" }}
              size={screens.xs ? "middle" : "large"}
              enterButton={<FilterOutlined />}
            />
          </Col>

          <Col xs={24} sm={24} md={10} lg={8}>
            <DatePicker.RangePicker
              style={{ width: "100%" }}
              onChange={(dates) => setDateRange(dates ?? [])}
              value={dateRange}
              size={screens.xs ? "middle" : "large"}
            />
          </Col>
        </Row>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        type="card"
        style={{ marginBottom: 16, fontWeight: 500 }}
        tabBarStyle={{ fontSize: 16 }}
      >
        <TabPane tab="Dashboard" key="dashboard">
          <PurchaserDashboard
            data={requests}
            loading={loading}
            onRefresh={fetchAssigned}
            isAdmin={isAdmin}
            scopedPurchaser={selectedPurchaser?.raw || null}
            onClearScope={() => setSelectedPurchaser(null)}
            adminScopeSlot={AdminScopeControl}
            totalCount={total}
          />
        </TabPane>

        <TabPane tab="All Assigned" key="all">
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <Table
              locale={{ emptyText: <Empty description="No assigned requests match your filters" /> }}
              dataSource={requests}
              columns={columns}
              rowKey={(rec) => rec._id}
              loading={loading}
              size={screens.md ? "middle" : "small"}
              pagination={false} // custom pagination
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

            {/* Sleek Pagination */}
            <SleekPagination
              page={page}
              setPage={(p) => setPage(typeof p === "number" ? p : 1)}
              limit={limit}
              setLimit={setLimit}
              total={total}
            />
          </motion.div>
        </TabPane>

        <TabPane tab="Returned" key="returned">
          <Table
            locale={{ emptyText: <Empty description="No returned requests match your filters" /> }}
            dataSource={requests}
            columns={columns}
            rowKey={(rec) => rec._id}
            loading={loading}
            size={screens.md ? "middle" : "small"}
            pagination={false} // custom pagination
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

          {/* Sleek Pagination */}
          <SleekPagination
            page={page}
            setPage={(p) => setPage(typeof p === "number" ? p : 1)}
            limit={limit}
            setLimit={setLimit}
            total={total}
          />
        </TabPane>

        <TabPane tab="Pending" key="pending">
          <PurchaserPendingPage isAdmin={isAdmin} onAssigned={fetchAssigned} />
        </TabPane>
      </Tabs>

      <style>{`
        .row-clickable:hover { background-color: #f0f9ff !important; transition: background 0.2s ease; }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab { background: #f5f5f5 !important; border: 1px solid #d9d9d9 !important; color: #666 !important; font-weight: 500 !important; transition: all 0.3s ease !important; }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:hover { background: #e6f7ff !important; border-color: #91d5ff !important; color: #1890ff !important; }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active { background: #1890ff !important; border-color: #1890ff !important; color: #fff !important; font-weight: 600 !important; }
        .ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active .ant-tabs-tab-btn { color: #fff !important; }
      `}</style>
    </motion.div>
  );
}
