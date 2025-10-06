
// // // src/pages/sourcer/utils/sourcingColumns.jsx
// // import React, { useEffect, useState } from "react";
// // import { Table, Tag, Space, Typography, Tooltip, Button, Popconfirm } from "antd";
// // import { Pencil, Trash2 } from "lucide-react";
// // import dayjs from "dayjs";
// // import apiClient from "../../../api/client"; // note the relative path

// // const { Text } = Typography;

// // /* ---------- helpers ---------- */
// // const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
// // const fmtMoney = (v) =>
// //   typeof v === "number" && !Number.isNaN(v) ? `$${v.toFixed(2)}` : "$0.00";
// // const fmtDateTime = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "N/A");

// // // NEW: local helpers for item table money/totals
// // const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
// // const round2 = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;
// // const money = (v) => fmtMoney(safeNum(v));

// // const formatOid = (id) =>
// //   id ? String(id).slice(0, 6) + "…" + String(id).slice(-4) : "—";

// // const idNum = (rec) => {
// //   const raw = rec?.sourcing_id;
// //   if (raw == null) return Number.NEGATIVE_INFINITY;
// //   const n = Number(raw);
// //   if (Number.isFinite(n)) return n;
// //   const m = String(raw).match(/\d+/);
// //   return m ? Number(m[0]) : Number.NEGATIVE_INFINITY;
// // };

// // const getSellerName = (rec) => {
// //   if (rec?.seller && typeof rec.seller === "object") {
// //     return rec.seller.name || `Seller ${formatOid(rec.seller._id)}`;
// //   }
// //   return (
// //     rec?.seller_name || (rec?.seller ? `Seller ${formatOid(rec.seller)}` : "—")
// //   );
// // };

// // /* ---------- MarketName (cached resolver) ---------- */
// // const _marketCache = new Map();
// // const isObjectIdLike = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

// // function MarketName({ market }) {
// //   const [name, setName] = useState("—");

// //   useEffect(() => {
// //     let cancelled = false;

// //     const resolve = async () => {
// //       if (!market) return setName("—");

// //       // populated object
// //       if (typeof market === "object") {
// //         if (market.name) return setName(market.name);
// //         if (market.slug && _marketCache.has(market.slug)) {
// //           return setName(_marketCache.get(market.slug).name);
// //         }
// //         if (market._id && _marketCache.has(market._id)) {
// //           return setName(_marketCache.get(market._id).name);
// //         }
// //       }

// //       // string key: ObjectId or slug
// //       const key =
// //         typeof market === "string" ? market : market._id || market.slug || "";
// //       if (!key) return setName("—");

// //       if (_marketCache.has(key)) {
// //         return setName(_marketCache.get(key).name);
// //       }

// //       try {
// //         let rec = null;
// //         if (isObjectIdLike(key)) {
// //           const { data } = await apiClient.get(`/api/v1/markets/${key}`);
// //           rec = data;
// //         } else {
// //           const { data } = await apiClient.get(`/api/v1/markets`, {
// //             params: { q: key },
// //           });
// //           const list = Array.isArray(data) ? data : [];
// //           rec =
// //             list.find(
// //               (m) => (m.slug || "").toLowerCase() === key.toLowerCase()
// //             ) || list[0] || null;
// //         }

// //         if (!cancelled) {
// //           if (rec?.name) {
// //             _marketCache.set(key, rec);
// //             if (rec.slug) _marketCache.set(rec.slug, rec);
// //             if (rec._id) _marketCache.set(rec._id, rec);
// //             setName(rec.name);
// //           } else setName("—");
// //         }
// //       } catch {
// //         if (!cancelled) setName("—");
// //       }
// //     };

// //     resolve();
// //     return () => (cancelled = true);
// //   }, [market]);

// //   return <span>{name}</span>;
// // }



// // const STATUS_BADGE_CLASS = {
// //   Pending:        "bg-gray-100 text-gray-800",
// //   Assigned:       "bg-amber-100 text-amber-800",
// //   Offer:          "bg-blue-100 text-blue-800",
// //   Purchased:      "bg-green-100 text-green-800",
// //   Disapproved:    "bg-red-100 text-red-800",
// //   Sold:           "bg-purple-100 text-purple-800",
// //   Hold:           "bg-orange-100 text-orange-800",
// //   "Seller Rejected": "bg-rose-100 text-rose-800",
// //   Dropshipped:    "bg-cyan-100 text-cyan-800",
// //   Returned:       "bg-rose-100 text-rose-800",
// // };

// // function StatusBadge({ status }) {
// //   const s = String(status || "Pending");
// //   const cls = STATUS_BADGE_CLASS[s] || STATUS_BADGE_CLASS.Pending;
// //   return (
// //     <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>
// //       {s}
// //     </span>
// //   );
// // }

// // /* ---------- exported columns factory ---------- */
// // export function getSourcingColumns({
// //   statusPill,
// //   canEdit,
// //   navigate,
// //   handleDeleteOrder,
// // }) {
// //   const cols = [
// //     {
// //       title: "ID",
// //       dataIndex: "sourcing_id",
// //       key: "sourcing_id",
// //       width: 110,
// //       sorter: (a, b) => idNum(a) - idNum(b),
// //       defaultSortOrder: "descend",
// //       sortDirections: ["descend", "ascend"],
// //       render: (sid, rec) => (
// //         <Tooltip title={`MongoID: ${rec._id || rec.id || "N/A"}`}>
// //           <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
// //             {sid != null ? `#${sid}` : "—"}
// //           </span>
// //         </Tooltip>
// //       ),
// //     },
// //     {
// //       title: "Sourcer Name",
// //       dataIndex: "sourcerName",
// //       key: "sourcerName",
// //       width: 230,
// //       render: (val, rec) => {
// //         const fallback =
// //           [rec?.sourcer_id?.firstName, rec?.sourcer_id?.lastName]
// //             .filter(Boolean)
// //             .join(" ") || rec?.sourcer_id?.email || "—";
// //         const display = val || fallback;
// //         return (
// //           <div style={{ lineHeight: 1.2 }}>
// //             <div style={{ fontWeight: 600 }}>{display}</div>
// //             {rec?.sourcer_id?.email && (
// //               <Text type="secondary" style={{ fontSize: 12 }}>
// //                 {rec.sourcer_id.email}
// //               </Text>
// //             )}
// //           </div>
// //         );
// //       },
// //     },
// //     {
// //       title: "Purchaser",
// //       dataIndex: "purchaserName",
// //       key: "purchaserName",
// //       width: 230,
// //       render: (val, rec) => {
// //         const full = [rec?.purchaser_id?.firstName, rec?.purchaser_id?.lastName]
// //           .filter(Boolean)
// //           .join(" ");
// //         const fallback = full || rec?.purchaser_id?.email || "—";
// //         const display = val || fallback || "—";
// //         return (
// //           <div style={{ lineHeight: 1.2 }}>
// //             <div style={{ fontWeight: 600 }}>{display}</div>
// //             {rec?.purchaser_id?.email && (
// //               <Text type="secondary" style={{ fontSize: 12 }}>
// //                 {rec.purchaser_id.email}
// //               </Text>
// //             )}
// //           </div>
// //         );
// //       },
// //     },
// //         {
// //       title: "Efficiency $",
// //       key: "purchase_efficiency",
// //       width: 150,
// //       render: (_, rec) => {
// //         // const n =
// //         //   num(rec.target_total_cost) -
// //         //   num(rec.sellers_price) -
// //         //   num(rec.shipping_charges ?? rec.shipping_price) -
// //         //   num(rec.taxes ?? rec.tax);
// //         // return (
// //         //   <span style={{ fontWeight: 600, color: n >= 0 ? "green" : "red" }}>
// //         //     {fmtMoney(n)}
// //         //   </span>
// //         // );

// //             const actual =
// //             num(rec.sellers_price) +
// //             num(rec.shipping_charges ?? rec.shipping_price) +
// //             num(rec.taxes ?? rec.tax);
// //           const n = actual - num(rec.target_total_cost);
// //           return (
// //             <span style={{ fontWeight: 600, color: n <= 0 ? "green" : "red" }}>
// //               {fmtMoney(n)}
// //             </span>
// //           );
// //       },
// //     },
// // {
// //   title: "Status",
// //   dataIndex: "status",
// //   key: "status",
// //   width: 130,
// //   align: "center",
// //   render: (s) => <StatusBadge status={s} />,
// // },

// //     {
// //       title: "Seller",
// //       key: "seller",
// //       width: 100,
// //       render: (_, rec) => (
// //         <span style={{ fontWeight: 600 }}>{getSellerName(rec)}</span>
// //       ),
// //     },
// //     {
// //       title: "Market",
// //       key: "market",
// //       width: 100,
// //       render: (_, rec) => {
// //         const marketRef =
// //           rec?.seller && typeof rec.seller === "object"
// //             ? rec.seller.market
// //             : rec.market;
// //         const origin = rec.origin || "—";
// //         return (
// //           <div style={{ lineHeight: 1.2 }}>
// //             <div>
// //               <MarketName market={marketRef} />
// //             </div>
// //             <Text type="secondary" style={{ fontSize: 12 }}>
// //               {origin}
// //             </Text>
// //           </div>
// //         );
// //       },
// //     },
// //     {
// //       title: "Seller $",
// //       dataIndex: "sellers_price",
// //       key: "sellers_price",
// //       width: 110,
// //       render: (v) => <span>{fmtMoney(num(v))}</span>,
// //     },
// //     {
// //       title: "Ship $",
// //       dataIndex: "shipping_charges",
// //       key: "shipping_charges",
// //       width: 110,
// //       render: (_, rec) =>
// //         fmtMoney(num(rec.shipping_charges ?? rec.shipping_price)),
// //     },
// //     {
// //       title: "Tax $",
// //       dataIndex: "taxes",
// //       key: "taxes",
// //       width: 110,
// //       render: (_, rec) => fmtMoney(num(rec.taxes ?? rec.tax)),
// //     },
// // {
// //   title: "Total Target $",
// //   key: "target_total_cost",
// //   width: 150,
// //   render: (_v, rec) => {
// //     const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
// //     const round2  = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;
// //     const money   = (v) => (typeof v === "number" && !Number.isNaN(v) ? `$${v.toFixed(2)}` : "$0.00");

// //     // prefer backend rollup if it exists (support legacy name too)
// //     const backend = safeNum(rec.target_total_cost ?? rec.total_target_cost);

// //     if (backend > 0) return money(backend);

// //     // fallback: sum from items
// //     const sum = Array.isArray(rec.items)
// //       ? rec.items.reduce((acc, it) => {
// //           const qty = Math.max(1, safeNum(it?.quantity_needed));
// //           const per = safeNum(it?.target_cost_per_unit);
// //           // if item already has a precomputed total, trust it; else compute
// //           const line = Number.isFinite(Number(it?.total_target_cost))
// //             ? safeNum(it.total_target_cost)
// //             : round2(qty * per);
// //           return acc + line;
// //         }, 0)
// //       : 0;

// //     return money(round2(sum));
// //   },
// // }
// // ,
// //     {
// //       title: "Actual Cost $",
// //       dataIndex: "total_actual_cost",
// //       key: "total_actual_cost",
// //       width: 150,
// //       render: (v) => fmtMoney(num(v)),
// //     },

// //     {
// //       title: "Created",
// //       dataIndex: "createdAt",
// //       key: "createdAt",
// //       width: 170,
// //       render: (dt, rec) => {
// //         const actual = dt || rec.created_at || rec.created_on;
// //         return fmtDateTime(actual);
// //       },
// //     },
// //   ];

// //   if (canEdit) {
// //     cols.push({
// //       title: "Actions",
// //       key: "actions",
// //       fixed: "right",
// //       width: 120,
// //       render: (_, rec) => (
// //         <Space size={4}>
// //           <Tooltip title="Edit">
// //             <Button
// //               type="text"
// //               icon={<Pencil size={16} />}
// //               aria-label="Edit"
// //               onClick={() => navigate(`/sourcing/edit/${rec._id}`)}
// //             />
// //           </Tooltip>
// //           <Popconfirm
// //             title="Delete this sourcing request?"
// //             description="This action cannot be undone."
// //             okText="Delete"
// //             okButtonProps={{ danger: true }}
// //             onConfirm={() => handleDeleteOrder(rec._id || rec.id)}
// //           >
// //             <Tooltip title="Delete">
// //               <Button type="text" danger icon={<Trash2 size={16} />} aria-label="Delete" />
// //             </Tooltip>
// //           </Popconfirm>
// //         </Space>
// //       ),
// //     });
// //   }

// //   return cols;
// // }


// // export const makeItemsTable = (order) => {
// //   const rows = Array.isArray(order?.items) ? order.items : [];

// //   // tiny helpers (self-contained)
// //   const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
// //   const round2  = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;

// //   // Currency formatter: uses globalThis.fmtMoney if present, else Intl, else $x.xx
// //   const money = (v) => {
// //     const n = safeNum(v);
// //     const globalFmt =
// //       typeof globalThis !== "undefined" && typeof globalThis.fmtMoney === "function"
// //         ? globalThis.fmtMoney
// //         : null;
// //     if (globalFmt) return globalFmt(n);
// //     try {
// //       return new Intl.NumberFormat(undefined, {
// //         style: "currency",
// //         currency: "USD",
// //         minimumFractionDigits: 2,
// //         maximumFractionDigits: 2,
// //       }).format(n);
// //     } catch {
// //       return `$${n.toFixed(2)}`;
// //     }
// //   };

// //   const lineTarget = (r) =>
// //     Number.isFinite(Number(r?.total_target_cost))
// //       ? safeNum(r.total_target_cost)
// //       : round2(safeNum(r?.quantity_needed || 1) * safeNum(r?.target_cost_per_unit));

// //   const lineActual = (r) =>
// //     Number.isFinite(Number(r?.total_actual_cost))
// //       ? safeNum(r.total_actual_cost)
// //       : round2(safeNum(r?.quantity_needed || 1) * safeNum(r?.actual_cost_per_unit));

// //   return (
// //     <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
// //       {/* keep top spacing (no content) */}
// //       {/* <div className="px-4 py-3 bg-gray-50 border-b border-gray-200" /> */}

// //       <Table
// //         rowKey={(r) => r._id || r.id || `${r.sku}-${r.product_name}`}
// //         size="small"
// //         bordered
// //         pagination={false}
// //         dataSource={rows}
// //         onRow={(_, idx) => ({ style: { backgroundColor: idx % 2 ? "#fafcff" : "#fff" } })}
// //         rowClassName="hover:bg-blue-50 transition-colors"
// //         columns={[
// //           {
// //             title: "Product",
// //             key: "product",
// //             width: 280,
// //             render: (_t, r) => (
// //               <div style={{ lineHeight: 1.2 }}>
// //                 <div style={{ fontWeight: 600 }}>
// //                   {r?.name || r?.product_name || "Untitled"}
// //                 </div>
// //                 <span style={{ fontSize: 12, color: "#6b7280" }}>
// //                   SKU: {r?.sku || "—"}
// //                 </span>
// //               </div>
// //             ),
// //           },
// //           {
// //             title: "Qty",
// //             dataIndex: "quantity_needed",
// //             width: 80,
// //             align: "center",
// //             render: (v) => (
// //               <span style={{ fontVariantNumeric: "tabular-nums" }}>{safeNum(v)}</span>
// //             ),
// //           },
// //           {
// //             title: "Target $ / unit",
// //             dataIndex: "target_cost_per_unit",
// //             align: "right",
// //             width: 140,
// //             render: (v) => (
// //               <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
// //             ),
// //           },
// //           {
// //             title: "Total Target",
// //             key: "total_target_cost",
// //             align: "right",
// //             width: 140,
// //             render: (_t, r) => (
// //               <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(lineTarget(r))}</span>
// //             ),
// //           },
// //           {
// //             title: "Actual $ / unit",
// //             dataIndex: "actual_cost_per_unit",
// //             align: "right",
// //             width: 140,
// //             render: (v) => (
// //               <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
// //             ),
// //           },
// //           {
// //             title: "Total Actual Cost",
// //             key: "total_actual_cost",
// //             align: "right",
// //             width: 140,
// //             render: (_t, r) => (
// //               <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(lineActual(r))}</span>
// //             ),
// //           },
// //         ]}
// //       />

// //       {/* keep bottom spacing (no content) */}
// //       <div className="px-4 py-3 bg-gray-50 " />
// //     </div>
// //   );
// // };


// // src/pages/sourcer/utils/sourcingColumns.jsx
// import React, { useEffect, useState } from "react";
// import { Table, Space, Typography, Tooltip, Button, Popconfirm } from "antd";
// import { Pencil, Trash2 } from "lucide-react";
// import dayjs from "dayjs";
// import apiClient from "../../../api/client";

// const { Text } = Typography;

// /* ---------- helpers ---------- */
// const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
// const fmtMoney = (v) =>
//   typeof v === "number" && !Number.isNaN(v) ? `$${v.toFixed(2)}` : "$0.00";
// const fmtDateTime = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "N/A");

// const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
// const round2 = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;
// const money = (v) => fmtMoney(safeNum(v));

// const formatOid = (id) =>
//   id ? String(id).slice(0, 6) + "…" + String(id).slice(-4) : "—";

// const idNum = (rec) => {
//   const raw = rec?.sourcing_id;
//   if (raw == null) return Number.NEGATIVE_INFINITY;
//   const n = Number(raw);
//   if (Number.isFinite(n)) return n;
//   const m = String(raw).match(/\d+/);
//   return m ? Number(m[0]) : Number.NEGATIVE_INFINITY;
// };

// const getSellerName = (rec) => {
//   if (rec?.seller && typeof rec.seller === "object") {
//     return rec.seller.name || `Seller ${formatOid(rec.seller._id)}`;
//   }
//   return rec?.seller_name || (rec?.seller ? `Seller ${formatOid(rec.seller)}` : "—");
// };

// /* ---------- MarketName (cached resolver) ---------- */
// const _marketCache = new Map();
// const isObjectIdLike = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

// function MarketName({ market }) {
//   const [name, setName] = useState("—");

//   useEffect(() => {
//     let cancelled = false;

//     const resolve = async () => {
//       if (!market) return setName("—");

//       // populated object
//       if (typeof market === "object") {
//         if (market.name) return setName(market.name);
//         if (market.slug && _marketCache.has(market.slug)) {
//           return setName(_marketCache.get(market.slug).name);
//         }
//         if (market._id && _marketCache.has(market._id)) {
//           return setName(_marketCache.get(market._id).name);
//         }
//       }

//       // string key: ObjectId or slug
//       const key =
//         typeof market === "string" ? market : market._id || market.slug || "";
//       if (!key) return setName("—");

//       if (_marketCache.has(key)) {
//         return setName(_marketCache.get(key).name);
//       }

//       try {
//         let rec = null;
//         if (isObjectIdLike(key)) {
//           const { data } = await apiClient.get(`/api/v1/markets/${key}`);
//           rec = data;
//         } else {
//           const { data } = await apiClient.get(`/api/v1/markets`, {
//             params: { q: key },
//           });
//           const list = Array.isArray(data) ? data : [];
//           rec =
//             list.find(
//               (m) => (m.slug || "").toLowerCase() === key.toLowerCase()
//             ) || list[0] || null;
//         }

//         if (!cancelled) {
//           if (rec?.name) {
//             _marketCache.set(key, rec);
//             if (rec.slug) _marketCache.set(rec.slug, rec);
//             if (rec._id) _marketCache.set(rec._id, rec);
//             setName(rec.name);
//           } else setName("—");
//         }
//       } catch {
//         if (!cancelled) setName("—");
//       }
//     };

//     resolve();
//     return () => (cancelled = true);
//   }, [market]);

//   return <span>{name}</span>;
// }

// const STATUS_BADGE_CLASS = {
//   Pending: "bg-gray-100 text-gray-800",
//   Assigned: "bg-amber-100 text-amber-800",
//   Offer: "bg-blue-100 text-blue-800",
//   Purchased: "bg-green-100 text-green-800",
//   Disapproved: "bg-red-100 text-red-800",
//   Sold: "bg-purple-100 text-purple-800",
//   Hold: "bg-orange-100 text-orange-800",
//   "Seller Rejected": "bg-rose-100 text-rose-800",
//   Dropshipped: "bg-cyan-100 text-cyan-800",
//   Returned: "bg-rose-100 text-rose-800",
// };

// function StatusBadge({ status }) {
//   const s = String(status || "Pending");
//   const cls = STATUS_BADGE_CLASS[s] || STATUS_BADGE_CLASS.Pending;
//   return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{s}</span>;
// }

// /* ---------- exported columns factory ---------- */
// export function getSourcingColumns({
//   statusPill,             // kept for backward compatibility (unused here)
//   canEdit = false,        // SHOW Edit when true
//   canCancel = false,      // SHOW Delete when true
//   navigate,
//   handleDeleteOrder,
// }) {
//   const cols = [
//     {
//       title: "ID",
//       dataIndex: "sourcing_id",
//       key: "sourcing_id",
//       width: 110,
//       sorter: (a, b) => idNum(a) - idNum(b),
//       defaultSortOrder: "descend",
//       sortDirections: ["descend", "ascend"],
//       render: (sid, rec) => (
//         <Tooltip title={`MongoID: ${rec._id || rec.id || "N/A"}`}>
//           <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
//             {sid != null ? `#${sid}` : "—"}
//           </span>
//         </Tooltip>
//       ),
//     },
//     {
//       title: "Sourcer Name",
//       dataIndex: "sourcerName",
//       key: "sourcerName",
//       width: 230,
//       render: (val, rec) => {
//         const fallback =
//           [rec?.sourcer_id?.firstName, rec?.sourcer_id?.lastName]
//             .filter(Boolean)
//             .join(" ") || rec?.sourcer_id?.email || "—";
//         const display = val || fallback;
//         return (
//           <div style={{ lineHeight: 1.2 }}>
//             <div style={{ fontWeight: 600 }}>{display}</div>
//             {rec?.sourcer_id?.email && (
//               <Text type="secondary" style={{ fontSize: 12 }}>
//                 {rec.sourcer_id.email}
//               </Text>
//             )}
//           </div>
//         );
//       },
//     },
//     {
//       title: "Purchaser",
//       dataIndex: "purchaserName",
//       key: "purchaserName",
//       width: 230,
//       render: (val, rec) => {
//         const full = [rec?.purchaser_id?.firstName, rec?.purchaser_id?.lastName]
//           .filter(Boolean)
//           .join(" ");
//         const fallback = full || rec?.purchaser_id?.email || "—";
//         const display = val || fallback || "—";
//         return (
//           <div style={{ lineHeight: 1.2 }}>
//             <div style={{ fontWeight: 600 }}>{display}</div>
//             {rec?.purchaser_id?.email && (
//               <Text type="secondary" style={{ fontSize: 12 }}>
//                 {rec.purchaser_id.email}
//               </Text>
//             )}
//           </div>
//         );
//       },
//     },
//     {
//       title: "Efficiency $",
//       key: "purchase_efficiency",
//       width: 150,
//       render: (_, rec) => {
//         const actual =
//           num(rec.sellers_price) +
//           num(rec.shipping_charges ?? rec.shipping_price) +
//           num(rec.taxes ?? rec.tax);
//         const n = actual - num(rec.target_total_cost);
//         return (
//           <span style={{ fontWeight: 600, color: n <= 0 ? "green" : "red" }}>
//             {fmtMoney(n)}
//           </span>
//         );
//       },
//     },
//     {
//       title: "Status",
//       dataIndex: "status",
//       key: "status",
//       width: 130,
//       align: "center",
//       render: (s) => <StatusBadge status={s} />,
//     },
//     {
//       title: "Seller",
//       key: "seller",
//       width: 100,
//       render: (_, rec) => (
//         <span style={{ fontWeight: 600 }}>{getSellerName(rec)}</span>
//       ),
//     },
//     {
//       title: "Market",
//       key: "market",
//       width: 100,
//       render: (_, rec) => {
//         const marketRef =
//           rec?.seller && typeof rec.seller === "object"
//             ? rec.seller.market
//             : rec.market;
//         const origin = rec.origin || "—";
//         return (
//           <div style={{ lineHeight: 1.2 }}>
//             <div>
//               <MarketName market={marketRef} />
//             </div>
//             <Text type="secondary" style={{ fontSize: 12 }}>
//               {origin}
//             </Text>
//           </div>
//         );
//       },
//     },
//     {
//       title: "Seller $",
//       dataIndex: "sellers_price",
//       key: "sellers_price",
//       width: 110,
//       render: (v) => <span>{fmtMoney(num(v))}</span>,
//     },
//     {
//       title: "Ship $",
//       dataIndex: "shipping_charges",
//       key: "shipping_charges",
//       width: 110,
//       render: (_, rec) =>
//         fmtMoney(num(rec.shipping_charges ?? rec.shipping_price)),
//     },
//     {
//       title: "Tax $",
//       dataIndex: "taxes",
//       key: "taxes",
//       width: 110,
//       render: (_, rec) => fmtMoney(num(rec.taxes ?? rec.tax)),
//     },
//     {
//       title: "Total Target $",
//       key: "target_total_cost",
//       width: 150,
//       render: (_v, rec) => {
//         const backend = safeNum(rec.target_total_cost ?? rec.total_target_cost);
//         if (backend > 0) return money(backend);
//         const sum = Array.isArray(rec.items)
//           ? rec.items.reduce((acc, it) => {
//               const qty = Math.max(1, safeNum(it?.quantity_needed));
//               const per = safeNum(it?.target_cost_per_unit);
//               const line = Number.isFinite(Number(it?.total_target_cost))
//                 ? safeNum(it.total_target_cost)
//                 : round2(qty * per);
//               return acc + line;
//             }, 0)
//           : 0;
//         return money(round2(sum));
//       },
//     },
//     {
//       title: "Actual Cost $",
//       dataIndex: "total_actual_cost",
//       key: "total_actual_cost",
//       width: 150,
//       render: (v) => fmtMoney(num(v)),
//     },
//     {
//       title: "Created",
//       dataIndex: "createdAt",
//       key: "createdAt",
//       width: 170,
//       render: (dt, rec) => {
//         const actual = dt || rec.created_at || rec.created_on;
//         return fmtDateTime(actual);
//       },
//     },

//     // 🔒 Always present. Its content respects canEdit / canCancel.
//     {
//       title: "Actions",
//       key: "actions",
//       fixed: "right",
//       width: 140,
//       render: (_, rec) => {
//         const id = rec._id || rec.id;
//         // Debug once if needed:
//         // console.debug("[Actions flags]", { id, canEdit, canCancel });

//         const parts = [];

//         if (canEdit) {
//           parts.push(
//             <Tooltip key="edit" title="Edit">
//               <Button
//                 data-testid="edit-btn"
//                 type="text"
//                 icon={<Pencil size={16} />}
//                 aria-label="Edit"
//                 onClick={() => navigate(`/sourcing/orders/${id}/edit`)}
//               />
//             </Tooltip>
//           );
//         }

//         if (canCancel) {
//           parts.push(
//             <Popconfirm
//               key="delete"
//               title="Delete this sourcing request?"
//               description="This action cannot be undone."
//               okText="Delete"
//               okButtonProps={{ danger: true }}
//               onConfirm={() => handleDeleteOrder(id)}
//             >
//               <Tooltip title="Delete">
//                 <Button
//                   data-testid="delete-btn"
//                   type="text"
//                   danger
//                   icon={<Trash2 size={16} />}
//                   aria-label="Delete"
//                 />
//               </Tooltip>
//             </Popconfirm>
//           );
//         }

//         if (!parts.length) {
//           return <span style={{ color: "#9ca3af" }}>—</span>;
//         }
//         return <Space size={4}>{parts}</Space>;
//       },
//     },
//   ];

//   return cols;
// }

// export const makeItemsTable = (order) => {
//   const rows = Array.isArray(order?.items) ? order.items : [];

//   const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
//   const round2 = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;

//   const money = (v) => {
//     const n = safeNum(v);
//     const globalFmt =
//       typeof globalThis !== "undefined" && typeof globalThis.fmtMoney === "function"
//         ? globalThis.fmtMoney
//         : null;
//     if (globalFmt) return globalFmt(n);
//     try {
//       return new Intl.NumberFormat(undefined, {
//         style: "currency",
//         currency: "USD",
//         minimumFractionDigits: 2,
//         maximumFractionDigits: 2,
//       }).format(n);
//     } catch {
//       return `$${n.toFixed(2)}`;
//     }
//   };

//   const lineTarget = (r) =>
//     Number.isFinite(Number(r?.total_target_cost))
//       ? safeNum(r.total_target_cost)
//       : round2(safeNum(r?.quantity_needed || 1) * safeNum(r?.target_cost_per_unit));

//   const lineActual = (r) =>
//     Number.isFinite(Number(r?.total_actual_cost))
//       ? safeNum(r.total_actual_cost)
//       : round2(safeNum(r?.quantity_needed || 1) * safeNum(r?.actual_cost_per_unit));

//   return (
//     <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
//       <Table
//         rowKey={(r) => r._id || r.id || `${r.sku}-${r.product_name}`}
//         size="small"
//         bordered
//         pagination={false}
//         dataSource={rows}
//         onRow={(_, idx) => ({ style: { backgroundColor: idx % 2 ? "#fafcff" : "#fff" } })}
//         rowClassName="hover:bg-blue-50 transition-colors"
//         columns={[
//           {
//             title: "Product",
//             key: "product",
//             width: 280,
//             render: (_t, r) => (
//               <div style={{ lineHeight: 1.2 }}>
//                 <div style={{ fontWeight: 600 }}>
//                   {r?.name || r?.product_name || "Untitled"}
//                 </div>
//                 <span style={{ fontSize: 12, color: "#6b7280" }}>
//                   SKU: {r?.sku || "—"}
//                 </span>
//               </div>
//             ),
//           },
//           {
//             title: "Qty",
//             dataIndex: "quantity_needed",
//             width: 80,
//             align: "center",
//             render: (v) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>{safeNum(v)}</span>
//             ),
//           },
//           {
//             title: "Target $ / unit",
//             dataIndex: "target_cost_per_unit",
//             align: "right",
//             width: 140,
//             render: (v) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
//             ),
//           },
//           {
//             title: "Total Target",
//             key: "total_target_cost",
//             align: "right",
//             width: 140,
//             render: (_t, r) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(lineTarget(r))}</span>
//             ),
//           },
//           {
//             title: "Actual $ / unit",
//             dataIndex: "actual_cost_per_unit",
//             align: "right",
//             width: 140,
//             render: (v) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
//             ),
//           },
//           {
//             title: "Total Actual Cost",
//             key: "total_actual_cost",
//             align: "right",
//             width: 140,
//             render: (_t, r) => (
//               <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(lineActual(r))}</span>
//             ),
//           },
//         ]}
//       />
//       <div className="px-4 py-3 bg-gray-50 " />
//     </div>
//   );
// };



// src/pages/sourcer/utils/sourcingColumns.jsx
import React, { useEffect, useState } from "react";
import { Table, Space, Typography, Tooltip, Button, Popconfirm } from "antd";
import { Pencil, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import apiClient from "../../../api/client";

const { Text } = Typography;

/* ---------- helpers ---------- */
const num = (v) => (typeof v === "number" ? v : Number(v) || 0);
const fmtMoney = (v) =>
  typeof v === "number" && !Number.isNaN(v) ? `$${v.toFixed(2)}` : "$0.00";
const fmtDateTime = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "N/A");

const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
const round2 = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;
const money = (v) => fmtMoney(safeNum(v));

const formatOid = (id) =>
  id ? String(id).slice(0, 6) + "…" + String(id).slice(-4) : "—";

const idNum = (rec) => {
  const raw = rec?.sourcing_id;
  if (raw == null) return Number.NEGATIVE_INFINITY;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  const m = String(raw).match(/\d+/);
  return m ? Number(m[0]) : Number.NEGATIVE_INFINITY;
};

const getSellerName = (rec) => {
  if (rec?.seller && typeof rec.seller === "object") {
    return rec.seller.name || `Seller ${formatOid(rec.seller._id)}`;
  }
  return rec?.seller_name || (rec?.seller ? `Seller ${formatOid(rec.seller)}` : "—");
};

/* ---------- MarketName (cached resolver) ---------- */
const _marketCache = new Map();
const isObjectIdLike = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

function MarketName({ market }) {
  const [name, setName] = useState("—");

  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      if (!market) return setName("—");

      // populated object
      if (typeof market === "object") {
        if (market.name) return setName(market.name);
        if (market.slug && _marketCache.has(market.slug)) {
          return setName(_marketCache.get(market.slug).name);
        }
        if (market._id && _marketCache.has(market._id)) {
          return setName(_marketCache.get(market._id).name);
        }
      }

      // string key: ObjectId or slug
      const key =
        typeof market === "string" ? market : market._id || market.slug || "";
      if (!key) return setName("—");

      if (_marketCache.has(key)) {
        return setName(_marketCache.get(key).name);
      }

      try {
        let rec = null;
        if (isObjectIdLike(key)) {
          const { data } = await apiClient.get(`/api/v1/markets/${key}`);
          rec = data;
        } else {
          const { data } = await apiClient.get(`/api/v1/markets`, {
            params: { q: key },
          });
          const list = Array.isArray(data) ? data : [];
          rec =
            list.find(
              (m) => (m.slug || "").toLowerCase() === key.toLowerCase()
            ) || list[0] || null;
        }

        if (!cancelled) {
          if (rec?.name) {
            _marketCache.set(key, rec);
            if (rec.slug) _marketCache.set(rec.slug, rec);
            if (rec._id) _marketCache.set(rec._id, rec);
            setName(rec.name);
          } else setName("—");
        }
      } catch {
        if (!cancelled) setName("—");
      }
    };

    resolve();
    return () => (cancelled = true);
  }, [market]);

  return <span>{name}</span>;
}

const STATUS_BADGE_CLASS = {
  Pending: "bg-gray-100 text-gray-800",
  Assigned: "bg-amber-100 text-amber-800",
  Offer: "bg-blue-100 text-blue-800",
  Purchased: "bg-green-100 text-green-800",
  Disapproved: "bg-red-100 text-red-800",
  Sold: "bg-purple-100 text-purple-800",
  Hold: "bg-orange-100 text-orange-800",
  "Seller Rejected": "bg-rose-100 text-rose-800",
  Dropshipped: "bg-cyan-100 text-cyan-800",
  Returned: "bg-rose-100 text-rose-800",
};

function StatusBadge({ status }) {
  const s = String(status || "Pending");
  const cls = STATUS_BADGE_CLASS[s] || STATUS_BADGE_CLASS.Pending;
  return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{s}</span>;
}

/* ---------- exported columns factory ---------- */
export function getSourcingColumns({
  statusPill,             // kept for backward compatibility (unused here)
  canEdit = false,        // SHOW Edit when true
  canCancel = false,      // SHOW Delete when true
  navigate,
  handleDeleteOrder,
  buildEditUrl,           // optional: custom route builder
}) {
  // default to your original route pattern
  const mkEditUrl = buildEditUrl || ((id) => `/sourcing/edit/${id}`);

  const cols = [
    {
      title: "ID",
      dataIndex: "sourcing_id",
      key: "sourcing_id",
      width: 110,
      sorter: (a, b) => idNum(a) - idNum(b),
      defaultSortOrder: "descend",
      sortDirections: ["descend", "ascend"],
      render: (sid, rec) => (
        <Tooltip title={`MongoID: ${rec._id || rec.id || "N/A"}`}>
          <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>
            {sid != null ? `#${sid}` : "—"}
          </span>
        </Tooltip>
      ),
    },
    {
      title: "Sourcer Name",
      dataIndex: "sourcerName",
      key: "sourcerName",
      width: 230,
      render: (val, rec) => {
        const fallback =
          [rec?.sourcer_id?.firstName, rec?.sourcer_id?.lastName]
            .filter(Boolean)
            .join(" ") || rec?.sourcer_id?.email || "—";
        const display = val || fallback;
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 600 }}>{display}</div>
            {rec?.sourcer_id?.email && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {rec.sourcer_id.email}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Purchaser",
      dataIndex: "purchaserName",
      key: "purchaserName",
      width: 230,
      render: (val, rec) => {
        const full = [rec?.purchaser_id?.firstName, rec?.purchaser_id?.lastName]
          .filter(Boolean)
          .join(" ");
        const fallback = full || rec?.purchaser_id?.email || "—";
        const display = val || fallback || "—";
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div style={{ fontWeight: 600 }}>{display}</div>
            {rec?.purchaser_id?.email && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {rec.purchaser_id.email}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: "Efficiency $",
      key: "purchase_efficiency",
      width: 150,
      render: (_, rec) => {
        const actual =
          num(rec.sellers_price) +
          num(rec.shipping_charges ?? rec.shipping_price) +
          num(rec.taxes ?? rec.tax);
        const n = actual - num(rec.target_total_cost);
        return (
          <span style={{ fontWeight: 600, color: n <= 0 ? "green" : "red" }}>
            {fmtMoney(n)}
          </span>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (s) => <StatusBadge status={s} />,
    },
    {
      title: "Seller",
      key: "seller",
      width: 100,
      render: (_, rec) => (
        <span style={{ fontWeight: 600 }}>{getSellerName(rec)}</span>
      ),
    },
    {
      title: "Market",
      key: "market",
      width: 100,
      render: (_, rec) => {
        const marketRef =
          rec?.seller && typeof rec.seller === "object"
            ? rec.seller.market
            : rec.market;
        const origin = rec.origin || "—";
        return (
          <div style={{ lineHeight: 1.2 }}>
            <div>
              <MarketName market={marketRef} />
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {origin}
            </Text>
          </div>
        );
      },
    },
    {
      title: "Seller $",
      dataIndex: "sellers_price",
      key: "sellers_price",
      width: 110,
      render: (v) => <span>{fmtMoney(num(v))}</span>,
    },
    {
      title: "Ship $",
      dataIndex: "shipping_charges",
      key: "shipping_charges",
      width: 110,
      render: (_, rec) =>
        fmtMoney(num(rec.shipping_charges ?? rec.shipping_price)),
    },
    {
      title: "Tax $",
      dataIndex: "taxes",
      key: "taxes",
      width: 110,
      render: (_, rec) => fmtMoney(num(rec.taxes ?? rec.tax)),
    },
    {
      title: "Total Target $",
      key: "target_total_cost",
      width: 150,
      render: (_v, rec) => {
        const backend = safeNum(rec.target_total_cost ?? rec.total_target_cost);
        if (backend > 0) return money(backend);
        const sum = Array.isArray(rec.items)
          ? rec.items.reduce((acc, it) => {
              const qty = Math.max(1, safeNum(it?.quantity_needed));
              const per = safeNum(it?.target_cost_per_unit);
              const line = Number.isFinite(Number(it?.total_target_cost))
                ? safeNum(it.total_target_cost)
                : round2(qty * per);
              return acc + line;
            }, 0)
          : 0;
        return money(round2(sum));
      },
    },
    {
      title: "Actual Cost $",
      dataIndex: "total_actual_cost",
      key: "total_actual_cost",
      width: 150,
      render: (v) => fmtMoney(num(v)),
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (dt, rec) => {
        const actual = dt || rec.created_at || rec.created_on;
        return fmtDateTime(actual);
      },
    },

    // 🔒 Always present. Its content respects canEdit / canCancel.
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      width: 140,
      render: (_, rec) => {
        const id = rec._id || rec.id;
        const parts = [];

        if (canEdit && id) {
          parts.push(
            <Tooltip key="edit" title="Edit">
              <Button
                data-testid="edit-btn"
                type="text"
                icon={<Pencil size={16} />}
                aria-label="Edit"
                onClick={(e) => {
                  e.stopPropagation();                 // prevent row/expand hijack
                  navigate(mkEditUrl(id));
                }}
              />
            </Tooltip>
          );
        }

        if (canCancel && id) {
          parts.push(
            <Popconfirm
              key="delete"
              title="Delete this sourcing request?"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDeleteOrder(id)}
            >
              <Button
                data-testid="delete-btn"
                type="text"
                danger
                icon={<Trash2 size={16} />}
                aria-label="Delete"
                onClick={(e) => e.stopPropagation()}   // keep popconfirm working reliably
              />
            </Popconfirm>
          );
        }

        if (!parts.length) {
          return <span style={{ color: "#9ca3af" }}>—</span>;
        }
        return <Space size={4}>{parts}</Space>;
      },
    },
  ];

  return cols;
}

export const makeItemsTable = (order) => {
  const rows = Array.isArray(order?.items) ? order.items : [];

  const safeNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
  const round2 = (n) => Math.round((safeNum(n) + Number.EPSILON) * 100) / 100;

  const money = (v) => {
    const n = safeNum(v);
    const globalFmt =
      typeof globalThis !== "undefined" && typeof globalThis.fmtMoney === "function"
        ? globalThis.fmtMoney
        : null;
    if (globalFmt) return globalFmt(n);
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `$${n.toFixed(2)}`;
    }
  };

  const lineTarget = (r) =>
    Number.isFinite(Number(r?.total_target_cost))
      ? safeNum(r.total_target_cost)
      : round2(safeNum(r?.quantity_needed || 1) * safeNum(r?.target_cost_per_unit));

  const lineActual = (r) =>
    Number.isFinite(Number(r?.total_actual_cost))
      ? safeNum(r.total_actual_cost)
      : round2(safeNum(r?.quantity_needed || 1) * safeNum(r?.actual_cost_per_unit));

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <Table
        rowKey={(r) => r._id || r.id || `${r.sku}-${r.product_name}`}
        size="small"
        bordered
        pagination={false}
        dataSource={rows}
        onRow={(_, idx) => ({ style: { backgroundColor: idx % 2 ? "#fafcff" : "#fff" } })}
        rowClassName="hover:bg-blue-50 transition-colors"
        columns={[
          {
            title: "Product",
            key: "product",
            width: 280,
            render: (_t, r) => (
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600 }}>
                  {r?.name || r?.product_name || "Untitled"}
                </div>
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  SKU: {r?.sku || "—"}
                </span>
              </div>
            ),
          },
          {
            title: "Qty",
            dataIndex: "quantity_needed",
            width: 80,
            align: "center",
            render: (v) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{safeNum(v)}</span>
            ),
          },
          {
            title: "Target $ / unit",
            dataIndex: "target_cost_per_unit",
            align: "right",
            width: 140,
            render: (v) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
            ),
          },
          {
            title: "Total Target",
            key: "total_target_cost",
            align: "right",
            width: 140,
            render: (_t, r) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(lineTarget(r))}</span>
            ),
          },
          {
            title: "Actual $ / unit",
            dataIndex: "actual_cost_per_unit",
            align: "right",
            width: 140,
            render: (v) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(v)}</span>
            ),
          },
          {
            title: "Total Actual Cost",
            key: "total_actual_cost",
            align: "right",
            width: 140,
            render: (_t, r) => (
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{money(lineActual(r))}</span>
            ),
          },
        ]}
      />
      <div className="px-4 py-3 bg-gray-50 " />
    </div>
  );
};
