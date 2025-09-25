// // import React, { useMemo } from "react";
// // import {
// //   Card,
// //   Row,
// //   Col,
// //   Space,
// //   Typography,
// //   Button,
// //   Statistic,
// //   Divider,
// //   Table,
// //   Tag,
// //   Empty,
// //   Skeleton,
// // } from "antd";
// // import {
// //   ReloadOutlined,
// //   ArrowUpOutlined,
// //   ArrowDownOutlined,
// // } from "@ant-design/icons";
// // import { motion } from "framer-motion";
// // import dayjs from "dayjs";

// // const { Title, Text } = Typography;

// // /* --- helpers --- */
// // const n = (v) => (typeof v === "number" ? v : Number(v) || 0);
// // const getCreated = (rec) =>
// //   rec.created_at || rec.createdAt || rec.created_on || null;
// // const money = (x) =>
// //   typeof x === "number"
// //     ? x.toLocaleString(undefined, { style: "currency", currency: "USD" })
// //     : "—";
// // const statusColor = (s) => {
// //   switch (s) {
// //     case "Assigned":
// //       return "gold";
// //     case "Offer":
// //       return "blue";
// //     case "Purchased":
// //       return "green";
// //     case "Disapproved":
// //       return "red";
// //     case "Sold":
// //       return "purple";
// //     case "Hold":
// //       return "orange";
// //     case "Seller Rejected":
// //       return "magenta";
// //     case "Dropshipped":
// //       return "cyan";
// //     case "Returned":
// //       return "volcano";
// //     default:
// //       return "geekblue";
// //   }
// // };

// // export default function PurchaserDashboard({ data = [], loading, onRefresh }) {
// //   const {
// //     count,
// //     byStatus,
// //     totals,
// //     avgActual,
// //     avgEfficiency,
// //     byMarket,
// //     bySeller,
// //     last7Purchased,
// //     purchasedCount,
// //   } = useMemo(() => {
// //     const agg = {
// //       count: data.length,
// //       byStatus: new Map(),
// //       totals: { seller: 0, ship: 0, tax: 0, actual: 0, target: 0, efficiency: 0 },
// //       byMarket: new Map(),
// //       bySeller: new Map(),
// //       last7Purchased: new Map(),
// //       purchasedCount: 0,
// //     };

// //     const today = dayjs().startOf("day");
// //     const last7 = Array.from({ length: 7 }).map((_, i) =>
// //       today.subtract(i, "day").format("YYYY-MM-DD")
// //     );

// //     for (const d of data) {
// //       const s = String(d.status || "Pending");
// //       agg.byStatus.set(s, (agg.byStatus.get(s) || 0) + 1);

// //       const seller = n(d.sellers_price);
// //       const ship = n(d.shipping_charges ?? d.shipping_price);
// //       const tax = n(d.taxes ?? d.tax);
// //       const actual = n(d.total_actual_cost);
// //       const target = n(d.target_total_cost);
// //       const eff =
// //         typeof d.purchase_efficiency === "number"
// //           ? d.purchase_efficiency
// //           : target - actual;

// //       agg.totals.seller += seller;
// //       agg.totals.ship += ship;
// //       agg.totals.tax += tax;
// //       agg.totals.actual += actual;
// //       agg.totals.target += target;
// //       agg.totals.efficiency += eff;

// //       const mkt = d.market || "—";
// //       agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

// //       const sellerName = d.seller_name || "—";
// //       agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

// //       if (s === "Purchased") {
// //         agg.purchasedCount += 1;
// //         const cd = dayjs(getCreated(d));
// //         const key = cd.isValid() ? cd.format("YYYY-MM-DD") : null;
// //         if (key && last7.includes(key)) {
// //           agg.last7Purchased.set(key, (agg.last7Purchased.get(key) || 0) + 1);
// //         }
// //       }
// //     }

// //     const avgActual = agg.count ? agg.totals.actual / agg.count : 0;
// //     const avgEfficiency = agg.count ? agg.totals.efficiency / agg.count : 0;
// //     const top6 = (arr) => arr.sort((a, b) => b[1] - a[1]).slice(0, 6);

// //     return {
// //       count: agg.count,
// //       byStatus: Array.from(agg.byStatus.entries()).sort((a, b) => b[1] - a[1]),
// //       totals: agg.totals,
// //       avgActual,
// //       avgEfficiency,
// //       byMarket: top6(Array.from(agg.byMarket.entries())),
// //       bySeller: top6(Array.from(agg.bySeller.entries())),
// //       last7Purchased: Array.from(agg.last7Purchased.entries()).sort((a, b) =>
// //         a[0] < b[0] ? -1 : 1
// //       ),
// //       purchasedCount: agg.purchasedCount,
// //     };
// //   }, [data]);

// //   const Trend = ({ value }) => (
// //     <Space>
// //       {value >= 0 ? (
// //         <ArrowUpOutlined style={{ color: "#16a34a" }} />
// //       ) : (
// //         <ArrowDownOutlined style={{ color: "#ef4444" }} />
// //       )}
// //       <Text strong style={{ color: value >= 0 ? "#16a34a" : "#ef4444" }}>
// //         {money(Math.abs(value))}
// //       </Text>
// //     </Space>
// //   );

// //   return (
// //     <motion.div
// //       initial={{ scale: 0.97, opacity: 0 }}
// //       animate={{ scale: 1, opacity: 1 }}
// //       transition={{ duration: 0.35 }}
// //       style={{
// //         borderRadius: 16,
// //         padding: 16,
// //         background:
// //           "linear-gradient(180deg, rgba(248,250,252,0.9), rgba(255,255,255,0.95))",
// //         boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
// //       }}
// //     >
// //       <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
// //         <Col>
// //           <Title level={4} style={{ margin: 0 }}>
// //             Purchaser Dashboard
// //           </Title>
// //           <Text type="secondary">Snapshot of current (filtered) data</Text>
// //         </Col>
// //         <Col>
// //           <Button icon={<ReloadOutlined />} onClick={onRefresh} disabled={loading}>
// //             Refresh
// //           </Button>
// //         </Col>
// //       </Row>

// //       {/* KPI row — SAME HEIGHT CARDS */}
// //       <Row gutter={[12, 12]} align="stretch">
// //         {[
// //           {
// //             title: "Total Orders",
// //             value: count,
// //             extra: null,
// //           },
// //           {
// //             title: "Purchased",
// //             value: purchasedCount,
// //             extra: null,
// //           },
// //           {
// //             title: "Spend (Actual)",
// //             value: totals.actual,
// //             precision: 2,
// //             prefix: "$",
// //           },
// //           {
// //             title: "Avg Efficiency",
// //             value: avgEfficiency,
// //             precision: 2,
// //             extra: <Trend value={avgEfficiency} />,
// //             prefix: avgEfficiency >= 0 ? "+" : "-",
// //           },
// //         ].map((kpi, i) => (
// //           <Col xs={12} md={6} key={i} style={{ display: "flex" }}>
// //             <Card
// //               bordered
// //               className="kpi-card"
// //               style={{ borderRadius: 14, flex: 1 }}
// //               bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", height: "100%" }}
// //             >
// //               {loading ? (
// //                 <Skeleton active paragraph={false} />
// //               ) : (
// //                 <>
// //                   <Statistic
// //                     title={kpi.title}
// //                     value={kpi.value}
// //                     precision={kpi.precision}
// //                     prefix={kpi.prefix}
// //                   />
// //                   {kpi.extra ? (
// //                     <div style={{ marginTop: 8 }}>{kpi.extra}</div>
// //                   ) : null}
// //                 </>
// //               )}
// //             </Card>
// //           </Col>
// //         ))}
// //       </Row>

// //       <Divider style={{ margin: "16px 0" }} />

// //       <Row gutter={[12, 12]} align="stretch">
// //         {/* By Status */}
// //         <Col xs={24} md={8} style={{ display: "flex" }}>
// //           <Card
// //             title={
// //               <Space>
// //                 By Status <Text type="secondary">({byStatus.length})</Text>
// //               </Space>
// //             }
// //             size="small"
// //             bordered
// //             style={{ borderRadius: 12, flex: 1 }}
// //             bodyStyle={{ padding: 12, height: "100%" }}
// //           >
// //             {loading ? (
// //               <Skeleton active />
// //             ) : (
// //               <Table
// //                 size="small"
// //                 pagination={false}
// //                 rowKey="status"
// //                 dataSource={byStatus.map(([status, cnt]) => ({
// //                   status,
// //                   cnt,
// //                 }))}
// //                 columns={[
// //                   {
// //                     title: "Status",
// //                     dataIndex: "status",
// //                     render: (s) => (
// //                       <Tag color={statusColor(s)} style={{ borderRadius: 6 }}>
// //                         {s}
// //                       </Tag>
// //                     ),
// //                   },
// //                   { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
// //                 ]}
// //                 locale={{ emptyText: <Empty description="No data" /> }}
// //               />
// //             )}
// //           </Card>
// //         </Col>

// //         {/* Top Markets */}
// //         <Col xs={24} md={8} style={{ display: "flex" }}>
// //           <Card
// //             title={
// //               <Space>
// //                 Top Markets <Text type="secondary">({byMarket.length})</Text>
// //               </Space>
// //             }
// //             size="small"
// //             bordered
// //             style={{ borderRadius: 12, flex: 1 }}
// //             bodyStyle={{ padding: 12, height: "100%" }}
// //           >
// //             {loading ? (
// //               <Skeleton active />
// //             ) : (
// //               <Table
// //                 size="small"
// //                 pagination={false}
// //                 rowKey="market"
// //                 dataSource={byMarket.map(([market, cnt]) => ({
// //                   market: market || "—",
// //                   cnt,
// //                 }))}
// //                 columns={[
// //                   { title: "Market", dataIndex: "market" },
// //                   { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
// //                 ]}
// //                 locale={{ emptyText: <Empty description="No data" /> }}
// //               />
// //             )}
// //           </Card>
// //         </Col>

// //         {/* Top Sellers */}
// //         <Col xs={24} md={8} style={{ display: "flex" }}>
// //           <Card
// //             title={
// //               <Space>
// //                 Top Sellers <Text type="secondary">({bySeller.length})</Text>
// //               </Space>
// //             }
// //             size="small"
// //             bordered
// //             style={{ borderRadius: 12, flex: 1 }}
// //             bodyStyle={{ padding: 12, height: "100%" }}
// //           >
// //             {loading ? (
// //               <Skeleton active />
// //             ) : (
// //               <Table
// //                 size="small"
// //                 pagination={false}
// //                 rowKey="seller"
// //                 dataSource={bySeller.map(([seller, cnt]) => ({
// //                   seller: seller || "—",
// //                   cnt,
// //                 }))}
// //                 columns={[
// //                   { title: "Seller", dataIndex: "seller" },
// //                   { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
// //                 ]}
// //                 locale={{ emptyText: <Empty description="No data" /> }}
// //               />
// //             )}
// //           </Card>
// //         </Col>
// //       </Row>

// //       <Divider style={{ margin: "16px 0" }} />

// //       {/* Last 7 days purchased */}
// //       <Card
// //         title={
// //           <Space>
// //             Purchased in Last 7 Days{" "}
// //             <Text type="secondary">({last7Purchased.length})</Text>
// //           </Space>
// //         }
// //         size="small"
// //         bordered
// //         style={{ borderRadius: 12 }}
// //         bodyStyle={{ padding: 12 }}
// //       >
// //         {loading ? (
// //           <Skeleton active />
// //         ) : (
// //           <Table
// //             size="small"
// //             pagination={false}
// //             rowKey="day"
// //             dataSource={
// //               last7Purchased.length
// //                 ? last7Purchased.map(([day, cnt]) => ({ day, cnt }))
// //                 : []
// //             }
// //             locale={{
// //               emptyText: (
// //                 <Empty description="No purchased orders in the last 7 days" />
// //               ),
// //             }}
// //             columns={[
// //               {
// //                 title: "Day",
// //                 dataIndex: "day",
// //                 width: 160,
// //                 render: (d) => dayjs(d).format("ddd, MMM D"),
// //               },
// //               { title: "Purchased", dataIndex: "cnt", align: "right" },
// //             ]}
// //           />
// //         )}
// //       </Card>

// //       {/* style tweaks */}
// //       <style>{`
// //         .ant-card-head-title { font-weight: 600; }
// //         .kpi-card .ant-statistic-title { color: #64748b; }
// //       `}</style>
// //     </motion.div>
// //   );
// // }




// import React, { useMemo } from "react";
// import {
//   Card,
//   Row,
//   Col,
//   Space,
//   Typography,
//   Button,
//   Statistic,
//   Divider,
//   Table,
//   Tag,
//   Empty,
//   Skeleton,
//   Switch,
// } from "antd";
// import {
//   ReloadOutlined,
//   ArrowUpOutlined,
//   ArrowDownOutlined,
// } from "@ant-design/icons";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";

// const { Title, Text } = Typography;

// /* --- helpers --- */
// const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
// const getCreated = (rec) =>
//   rec.created_at || rec.createdAt || rec.created_on || null;
// const money = (x) =>
//   typeof x === "number"
//     ? x.toLocaleString(undefined, { style: "currency", currency: "USD" })
//     : "—";
// const statusColor = (s) => {
//   switch (s) {
//     case "Assigned": return "gold";
//     case "Offer": return "blue";
//     case "Purchased": return "green";
//     case "Disapproved": return "red";
//     case "Sold": return "purple";
//     case "Hold": return "orange";
//     case "Seller Rejected": return "magenta";
//     case "Dropshipped": return "cyan";
//     case "Returned": return "volcano";
//     default: return "geekblue";
//   }
// };
// const labelFromMarket = (m) => {
//   if (!m) return "—";
//   if (typeof m === "string") return m;
//   if (typeof m === "object") return m.name || m.label || m.title || m.slug || "—";
//   return "—";
// };

// export default function PurchaserDashboard({
//   data = [],
//   loading,
//   onRefresh,
//   showDebug = true, // set false to hide preview
// }) {
//   const {
//     count,
//     byStatus,
//     totals,
//     avgEfficiency,
//     byMarket,
//     bySeller,
//     last7Purchased,
//     purchasedCount,
//   } = useMemo(() => {
//     const agg = {
//       count: Array.isArray(data) ? data.length : 0,
//       byStatus: new Map(),
//       totals: { seller: 0, ship: 0, tax: 0, actual: 0, target: 0, efficiency: 0 },
//       byMarket: new Map(),
//       bySeller: new Map(),
//       last7Purchased: new Map(),
//       purchasedCount: 0,
//     };

//     const today = dayjs().startOf("day");
//     const last7 = Array.from({ length: 7 }, (_, i) =>
//       today.subtract(i, "day").format("YYYY-MM-DD")
//     );

//     for (const d of data || []) {
//       const s = String(d.status ?? "Pending");
//       agg.byStatus.set(s, (agg.byStatus.get(s) || 0) + 1);

//       const seller = num(d.sellers_price);
//       const ship = num(d.shipping_charges ?? d.shipping_price);
//       const tax = num(d.taxes ?? d.tax);
//       const actual = num(d.total_actual_cost);
//       const target = num(d.target_total_cost);
//       const eff = typeof d.purchase_efficiency === "number" ? d.purchase_efficiency : target - actual;

//       agg.totals.seller += seller;
//       agg.totals.ship += ship;
//       agg.totals.tax += tax;
//       agg.totals.actual += actual;
//       agg.totals.target += target;
//       agg.totals.efficiency += eff;

//       const mkt = labelFromMarket(d.market);
//       agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

//       const sellerName = d.seller_name || "—";
//       agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

//       if (s === "Purchased") {
//         agg.purchasedCount += 1;
//         const cd = dayjs(getCreated(d));
//         const key = cd.isValid() ? cd.format("YYYY-MM-DD") : null;
//         if (key && last7.includes(key)) {
//           agg.last7Purchased.set(key, (agg.last7Purchased.get(key) || 0) + 1);
//         }
//       }
//     }

//     const avgEfficiency = agg.count ? agg.totals.efficiency / agg.count : 0;
//     const top6 = (arr) => arr.sort((a, b) => b[1] - a[1]).slice(0, 6);

//     return {
//       count: agg.count,
//       byStatus: Array.from(agg.byStatus.entries()).sort((a, b) => b[1] - a[1]),
//       totals: agg.totals,
//       avgEfficiency,
//       byMarket: top6(Array.from(agg.byMarket.entries())),
//       bySeller: top6(Array.from(agg.bySeller.entries())),
//       last7Purchased: Array.from(agg.last7Purchased.entries()).sort((a, b) =>
//         a[0] < b[0] ? -1 : 1
//       ),
//       purchasedCount: agg.purchasedCount,
//     };
//   }, [data]);

//   const Trend = ({ value }) => (
//     <Space>
//       {value >= 0 ? (
//         <ArrowUpOutlined style={{ color: "#16a34a" }} />
//       ) : (
//         <ArrowDownOutlined style={{ color: "#ef4444" }} />
//       )}
//       <Text strong style={{ color: value >= 0 ? "#16a34a" : "#ef4444" }}>
//         {money(Math.abs(value))}
//       </Text>
//     </Space>
//   );

//   return (
//     <motion.div
//       initial={{ scale: 0.98, opacity: 0 }}
//       animate={{ scale: 1, opacity: 1 }}
//       transition={{ duration: 0.35 }}
//       style={{
//         borderRadius: 16,
//         padding: 16,
//         background:
//           "radial-gradient(circle at 0% 0%, rgba(99,102,241,0.06), transparent 40%), radial-gradient(circle at 100% 0%, rgba(34,211,238,0.06), transparent 40%), #fff",
//         boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
//       }}
//     >
//       <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
//         <Col>
//           <Title level={4} style={{ margin: 0 }}>Purchaser Dashboard</Title>
//           <Text type="secondary">
//             {loading ? "Loading…" : `Showing ${count} records`}
//           </Text>
//         </Col>
//         <Col>
//           <Space>
//             {showDebug && (
//               <Text type="secondary" style={{ fontSize: 12 }}>
//                 raw:{Array.isArray(data) ? data.length : 0}
//               </Text>
//             )}
//             <Button icon={<ReloadOutlined />} onClick={onRefresh} disabled={loading}>
//               Refresh
//             </Button>
//           </Space>
//         </Col>
//       </Row>

//       {/* KPI row — SAME HEIGHT CARDS */}
//       <Row gutter={[12, 12]} align="stretch">
//         {[
//           { title: "Total Orders", value: count },
//           { title: "Purchased", value: purchasedCount },
//           { title: "Spend (Actual)", value: totals.actual, precision: 2, prefix: "$" },
//           { title: "Avg Efficiency", value: avgEfficiency, precision: 2, prefix: avgEfficiency >= 0 ? "+" : "-", extra: <Trend value={avgEfficiency} /> },
//         ].map((kpi, i) => (
//           <Col xs={12} md={6} key={i} style={{ display: "flex" }}>
//             <Card
//               bordered
//               style={{ borderRadius: 14, flex: 1 }}
//               bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", height: "100%" }}
//             >
//               {loading ? (
//                 <Skeleton active paragraph={false} />
//               ) : (
//                 <>
//                   <Statistic title={kpi.title} value={kpi.value} precision={kpi.precision} prefix={kpi.prefix} />
//                   {kpi.extra ? <div style={{ marginTop: 8 }}>{kpi.extra}</div> : null}
//                 </>
//               )}
//             </Card>
//           </Col>
//         ))}
//       </Row>

//       <Divider style={{ margin: "16px 0" }} />

//       <Row gutter={[12, 12]} align="stretch">
//         {/* By Status */}
//         <Col xs={24} md={8} style={{ display: "flex" }}>
//           <Card
//             title={<Space>By Status <Text type="secondary">({byStatus.length})</Text></Space>}
//             size="small"
//             bordered
//             style={{ borderRadius: 12, flex: 1 }}
//             bodyStyle={{ padding: 12, height: "100%" }}
//           >
//             {loading ? <Skeleton active /> : (
//               <Table
//                 size="small"
//                 pagination={false}
//                 rowKey="status"
//                 dataSource={byStatus.map(([status, cnt]) => ({ status, cnt }))}
//                 columns={[
//                   { title: "Status", dataIndex: "status", render: (s) => <Tag color={statusColor(s)} style={{ borderRadius: 6 }}>{s}</Tag> },
//                   { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
//                 ]}
//                 locale={{ emptyText: <Empty description="No data" /> }}
//               />
//             )}
//           </Card>
//         </Col>

//         {/* Top Markets */}
//         <Col xs={24} md={8} style={{ display: "flex" }}>
//           <Card
//             title={<Space>Top Markets <Text type="secondary">({byMarket.length})</Text></Space>}
//             size="small"
//             bordered
//             style={{ borderRadius: 12, flex: 1 }}
//             bodyStyle={{ padding: 12, height: "100%" }}
//           >
//             {loading ? <Skeleton active /> : (
//               <Table
//                 size="small"
//                 pagination={false}
//                 rowKey="market"
//                 dataSource={byMarket.map(([market, cnt]) => ({ market: market || "—", cnt }))}
//                 columns={[
//                   { title: "Market", dataIndex: "market" },
//                   { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
//                 ]}
//                 locale={{ emptyText: <Empty description="No data" /> }}
//               />
//             )}
//           </Card>
//         </Col>

//         {/* Top Sellers */}
//         <Col xs={24} md={8} style={{ display: "flex" }}>
//           <Card
//             title={<Space>Top Sellers <Text type="secondary">({bySeller.length})</Text></Space>}
//             size="small"
//             bordered
//             style={{ borderRadius: 12, flex: 1 }}
//             bodyStyle={{ padding: 12, height: "100%" }}
//           >
//             {loading ? <Skeleton active /> : (
//               <Table
//                 size="small"
//                 pagination={false}
//                 rowKey="seller"
//                 dataSource={bySeller.map(([seller, cnt]) => ({ seller: seller || "—", cnt }))}
//                 columns={[
//                   { title: "Seller", dataIndex: "seller" },
//                   { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
//                 ]}
//                 locale={{ emptyText: <Empty description="No data" /> }}
//               />
//             )}
//           </Card>
//         </Col>
//       </Row>

//       <Divider style={{ margin: "16px 0" }} />

//       {/* Last 7 days purchased */}
//       <Card
//         title={<Space>Purchased in Last 7 Days <Text type="secondary">({last7Purchased.length})</Text></Space>}
//         size="small"
//         bordered
//         style={{ borderRadius: 12 }}
//         bodyStyle={{ padding: 12 }}
//       >
//         {loading ? <Skeleton active /> : (
//           <Table
//             size="small"
//             pagination={false}
//             rowKey="day"
//             dataSource={last7Purchased.map(([day, cnt]) => ({ day, cnt }))}
//             locale={{ emptyText: <Empty description="No purchased orders in the last 7 days" /> }}
//             columns={[
//               { title: "Day", dataIndex: "day", width: 160, render: (d) => dayjs(d).format("ddd, MMM D") },
//               { title: "Purchased", dataIndex: "cnt", align: "right" },
//             ]}
//           />
//         )}
//       </Card>

//       {/* DEBUG: show a raw preview of incoming data */}
//       {showDebug && (
//         <>
//           <Divider />
//           <Card size="small" title="Debug Preview (first 5 rows)">
//             <Table
//               size="small"
//               pagination={false}
//               rowKey={(r, i) => r._id || r.id || i}
//               dataSource={Array.isArray(data) ? data.slice(0, 5) : []}
//               columns={[
//                 { title: "id", dataIndex: "_id", render: (v, r) => v || r.id || "—" },
//                 { title: "status", dataIndex: "status", render: (v) => String(v || "—") },
//                 { title: "seller_name", dataIndex: "seller_name" },
//                 { title: "market", dataIndex: "market", render: (v) => labelFromMarket(v) },
//                 { title: "created_at", dataIndex: "created_at", render: (v, r) => (getCreated(r) ? dayjs(getCreated(r)).format("YYYY-MM-DD") : "—") },
//               ]}
//               locale={{ emptyText: <Empty description="No rows passed into dashboard" /> }}
//             />
//           </Card>
//         </>
//       )}

//       <style>{`
//         .ant-card-head-title { font-weight: 600; }
//         .ant-statistic-title { color: #64748b; }
//       `}</style>
//     </motion.div>
//   );
// }



import React, { useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Space,
  Typography,
  Button,
  Statistic,
  Divider,
  Table,
  Tag,
  Empty,
  Skeleton,
} from "antd";
import {
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import dayjs from "dayjs";

const { Title, Text } = Typography;

/* ---------- helpers ---------- */
const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
const getCreated = (rec) =>
  rec?.created_at || rec?.createdAt || rec?.created_on || null;
const money = (x) =>
  typeof x === "number"
    ? x.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "—";
const statusColor = (s) => {
  switch (s) {
    case "Assigned": return "gold";
    case "Offer": return "blue";
    case "Purchased": return "green";
    case "Disapproved": return "red";
    case "Sold": return "purple";
    case "Hold": return "orange";
    case "Seller Rejected": return "magenta";
    case "Dropshipped": return "cyan";
    case "Returned": return "volcano";
    default: return "geekblue";
  }
};
const labelFromMarket = (m) => {
  if (!m) return "—";
  if (typeof m === "string") return m;
  if (typeof m === "object") return m.name || m.label || m.title || m.slug || "—";
  return "—";
};

export default function PurchaserDashboard({
  data = [],
  loading = false,
  onRefresh,
  showDebug = true, // set false to hide debug preview
}) {
  const {
    count,
    byStatus,
    totals,
    avgEfficiency,
    byMarket,
    bySeller,
    last7Purchased,
    purchasedCount,
  } = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];

    const agg = {
      count: rows.length,
      byStatus: new Map(),
      totals: { seller: 0, ship: 0, tax: 0, actual: 0, target: 0, efficiency: 0 },
      byMarket: new Map(),
      bySeller: new Map(),
      last7Purchased: new Map(),
      purchasedCount: 0,
    };

    const today = dayjs().startOf("day");
    const last7Keys = Array.from({ length: 7 }, (_, i) =>
      today.subtract(i, "day").format("YYYY-MM-DD")
    );

    for (const d of rows) {
      const s = String(d?.status ?? "Pending");
      agg.byStatus.set(s, (agg.byStatus.get(s) || 0) + 1);

      const seller = num(d?.sellers_price);
      const ship = num(d?.shipping_charges ?? d?.shipping_price);
      const tax = num(d?.taxes ?? d?.tax);
      const actual = num(d?.total_actual_cost);
      const target = num(d?.target_total_cost);
      const eff =
        typeof d?.purchase_efficiency === "number"
          ? d.purchase_efficiency
          : target - actual;

      agg.totals.seller += seller;
      agg.totals.ship += ship;
      agg.totals.tax += tax;
      agg.totals.actual += actual;
      agg.totals.target += target;
      agg.totals.efficiency += eff;

      const mkt = labelFromMarket(d?.market ?? d?.sellerMarket);
      agg.byMarket.set(mkt, (agg.byMarket.get(mkt) || 0) + 1);

      const sellerName = d?.seller_name ?? d?.sellerName ?? "—";
      agg.bySeller.set(sellerName, (agg.bySeller.get(sellerName) || 0) + 1);

      if (s === "Purchased") {
        agg.purchasedCount += 1;
        const cd = dayjs(getCreated(d));
        const key = cd.isValid() ? cd.format("YYYY-MM-DD") : null;
        if (key && last7Keys.includes(key)) {
          agg.last7Purchased.set(key, (agg.last7Purchased.get(key) || 0) + 1);
        }
      }
    }

    const avgEfficiency = agg.count ? agg.totals.efficiency / agg.count : 0;
    const top6 = (arr) => arr.sort((a, b) => b[1] - a[1]).slice(0, 6);

    return {
      count: agg.count,
      byStatus: Array.from(agg.byStatus.entries()).sort((a, b) => b[1] - a[1]),
      totals: agg.totals,
      avgEfficiency,
      byMarket: top6(Array.from(agg.byMarket.entries())),
      bySeller: top6(Array.from(agg.bySeller.entries())),
      last7Purchased: Array.from(agg.last7Purchased.entries()).sort((a, b) =>
        a[0] < b[0] ? -1 : 1
      ),
      purchasedCount: agg.purchasedCount,
    };
  }, [data]);

  const Trend = ({ value }) => (
    <Space>
      {value >= 0 ? (
        <ArrowUpOutlined style={{ color: "#16a34a" }} />
      ) : (
        <ArrowDownOutlined style={{ color: "#ef4444" }} />
      )}
      <Text strong style={{ color: value >= 0 ? "#16a34a" : "#ef4444" }}>
        {money(Math.abs(value))}
      </Text>
    </Space>
  );

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35 }}
      style={{
        borderRadius: 16,
        padding: 16,
        background:
          "radial-gradient(circle at 0% 0%, rgba(99,102,241,0.06), transparent 40%), radial-gradient(circle at 100% 0%, rgba(34,211,238,0.06), transparent 40%), #fff",
        boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
      }}
    >
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>Purchaser Dashboard</Title>
          <Text type="secondary">
            {loading ? "Loading…" : `Showing ${count} records`}
          </Text>
        </Col>
        <Col>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={onRefresh} disabled={loading}>
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* KPI — equal height via flex */}
      <Row gutter={[12, 12]} align="stretch">
        {[
          { title: "Total Orders", value: count },
          { title: "Purchased", value: purchasedCount },
          { title: "Spend (Actual)", value: totals.actual, precision: 2, prefix: "$" },
          { title: "Avg Efficiency", value: avgEfficiency, precision: 2, prefix: avgEfficiency >= 0 ? "+" : "-", extra: <Trend value={avgEfficiency} /> },
        ].map((kpi, i) => (
          <Col xs={12} md={6} key={i} style={{ display: "flex" }}>
            <Card
              bordered
              style={{ borderRadius: 14, flex: 1 }}
              bodyStyle={{ padding: 16, display: "flex", flexDirection: "column", height: "100%" }}
            >
              {loading ? (
                <Skeleton active paragraph={false} />
              ) : (
                <>
                  <Statistic
                    title={kpi.title}
                    value={kpi.value}
                    precision={kpi.precision}
                    prefix={kpi.prefix}
                  />
                  {kpi.extra ? <div style={{ marginTop: 8 }}>{kpi.extra}</div> : null}
                </>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Divider style={{ margin: "16px 0" }} />

      {/* Three breakdown cards — same height */}
      <Row gutter={[12, 12]} align="stretch">
        {/* By Status */}
        <Col xs={24} md={8} style={{ display: "flex" }}>
          <Card
            title={<Space>By Status <Text type="secondary">({byStatus.length})</Text></Space>}
            size="small"
            bordered
            style={{ borderRadius: 12, flex: 1 }}
            bodyStyle={{ padding: 12, height: "100%" }}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="status"
              dataSource={byStatus.map(([status, cnt]) => ({ status, cnt }))}
              columns={[
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (s) => <Tag color={statusColor(s)} style={{ borderRadius: 6 }}>{s}</Tag>,
                },
                { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
            />
          </Card>
        </Col>

        {/* Top Markets */}
        <Col xs={24} md={8} style={{ display: "flex" }}>
          <Card
            title={<Space>Top Markets <Text type="secondary">({byMarket.length})</Text></Space>}
            size="small"
            bordered
            style={{ borderRadius: 12, flex: 1 }}
            bodyStyle={{ padding: 12, height: "100%" }}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="market"
              dataSource={byMarket.map(([market, cnt]) => ({ market: market || "—", cnt }))}
              columns={[
                { title: "Market", dataIndex: "market" },
                { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
            />
          </Card>
        </Col>

        {/* Top Sellers */}
        <Col xs={24} md={8} style={{ display: "flex" }}>
          <Card
            title={<Space>Top Sellers <Text type="secondary">({bySeller.length})</Text></Space>}
            size="small"
            bordered
            style={{ borderRadius: 12, flex: 1 }}
            bodyStyle={{ padding: 12, height: "100%" }}
          >
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey="seller"
              dataSource={bySeller.map(([seller, cnt]) => ({ seller: seller || "—", cnt }))}
              columns={[
                { title: "Seller", dataIndex: "seller" },
                { title: "Count", dataIndex: "cnt", align: "right", width: 90 },
              ]}
              locale={{ emptyText: <Empty description="No data" /> }}
            />
          </Card>
        </Col>
      </Row>

      <Divider style={{ margin: "16px 0" }} />

      {/* Last 7 days */}
      <Card
        title={<Space>Purchased in Last 7 Days <Text type="secondary">({last7Purchased.length})</Text></Space>}
        size="small"
        bordered
        style={{ borderRadius: 12 }}
        bodyStyle={{ padding: 12 }}
      >
        <Table
          size="small"
          pagination={false}
          loading={loading}
          rowKey="day"
          dataSource={last7Purchased.map(([day, cnt]) => ({ day, cnt }))}
          locale={{ emptyText: <Empty description="No purchased orders in the last 7 days" /> }}
          columns={[
            { title: "Day", dataIndex: "day", width: 160, render: (d) => dayjs(d).format("ddd, MMM D") },
            { title: "Purchased", dataIndex: "cnt", align: "right" },
          ]}
        />
      </Card>

      {/* Optional: raw preview to confirm rows are coming through */}
      {showDebug && (
        <>
          <Divider />
          <Card size="small" title="Debug Preview (first 5 rows)">
            <Table
              size="small"
              pagination={false}
              loading={loading}
              rowKey={(r, i) => r._id || r.id || i}
              dataSource={Array.isArray(data) ? data.slice(0, 5) : []}
              columns={[
                { title: "id", dataIndex: "_id", render: (v, r) => v || r.id || "—" },
                { title: "status", dataIndex: "status", render: (v) => String(v || "—") },
                { title: "seller_name", dataIndex: "seller_name", render: (v, r) => v ?? r.sellerName ?? "—" },
                { title: "market", dataIndex: "market", render: (v, r) => labelFromMarket(v ?? r.sellerMarket) },
                {
                  title: "created_at",
                  dataIndex: "created_at",
                  render: (_v, r) =>
                    getCreated(r) ? dayjs(getCreated(r)).format("YYYY-MM-DD HH:mm") : "—",
                },
              ]}
              locale={{ emptyText: <Empty description="No rows passed into dashboard" /> }}
            />
          </Card>
        </>
      )}

      <style>{`
        .ant-card-head-title { font-weight: 600; }
        .ant-statistic-title { color: #64748b; }
      `}</style>
    </motion.div>
  );
}
