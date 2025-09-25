// // RecentlyCreatedFive.jsx (or place this above your export in the same file)
// import React, { useMemo } from "react";
// import { Card, Table, Tag, Space, Typography, Empty, Tooltip } from "antd";
// import dayjs from "dayjs";
// const { Text } = Typography;

// const fmtDateTime = (v) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "N/A");
// const num = (v) => (typeof v === "number" ? v : Number(v) || 0);

// // optional: reuse your color map if you have it; otherwise a simple one:
// const statusColor = (s) =>
//   s === "Pending" ? "gold"
//   : s === "Purchased" ? "green"
//   : s === "Assigned" ? "purple"
//   : s === "Completed" ? "geekblue"
//   : s === "Disapproved" ? "volcano"
//   : s === "Returned" ? "red"
//   : s === "Offer" ? "cyan"
//   : s === "Hold" ? "orange"
//   : s === "Seller Rejected" ? "magenta"
//   : s === "Dropshipped" ? "blue"
//   : "default";

// export default function RecentlyCreatedFive({ orders = [], loading = false, title = "My 5 Most Recent Requests" }) {
//   const getCreated = (r) => r.createdAt || r.created_at || r.created_on;

//   const data = useMemo(
//     () => [...orders].sort((a, b) => new Date(getCreated(b)) - new Date(getCreated(a))).slice(0, 5),
//     [orders]
//   );

//   const columns = [
//     {
//       title: "ID",
//       dataIndex: "sourcing_id",
//       key: "sourcing_id",
//       width: 90,
//       render: (v, rec) => (
//         <Tooltip title={`MongoID: ${rec._id || rec.id || "N/A"}`}>
//           <span>{v != null ? `#${v}` : "—"}</span>
//         </Tooltip>
//       ),
//     },
//     {
//       title: "Status",
//       dataIndex: "status",
//       key: "status",
//       render: (s) => <Tag color={statusColor(s)}>{s || "Pending"}</Tag>,
//       width: 130,
//     },
//     {
//       title: "Product(s)",
//       dataIndex: "items",
//       key: "items",
//       render: (items) => (
//         <Space direction="vertical" size="small">
//           {(items || []).map((item, i) => (
//             <Text key={i}>{item.product_name || item.name || "Unnamed Product"}</Text>
//           ))}
//         </Space>
//       ),
//     },
//     {
//       title: "Baseline $",
//       dataIndex: "target_total",
//       key: "target_total",
//       render: (v) => <Tag color="purple">${num(v).toFixed(2)}</Tag>,
//       width: 130,
//     },
//     {
//       title: "Efficiency $",
//       dataIndex: "savings_dollar",
//       key: "savings_dollar",
//       render: (v) => <Tag color={num(v) >= 0 ? "green" : "red"}>${num(v).toFixed(2)}</Tag>,
//       width: 140,
//     },
//     {
//       title: "Efficiency %",
//       dataIndex: "efficiency_pct",
//       key: "efficiency_pct",
//       render: (v) => <Tag color={num(v) >= 0 ? "geekblue" : "volcano"}>{num(v).toFixed(1)}%</Tag>,
//       width: 130,
//     },
//     {
//       title: "Created On",
//       dataIndex: "createdAt",
//       key: "createdAt",
//       width: 170,
//       render: (_dt, rec) => fmtDateTime(getCreated(rec)),
//     },
//   ];

//   return (
//     <Card
//       title={<span style={{ fontWeight: 700 }}>{title}</span>}
//       style={{ marginTop: 16, background: "#fff", borderRadius: 12, border: "1px solid #eef2ff" }}
//       bodyStyle={{ padding: 0 }}
//     >
//       <Table
//         dataSource={data}
//         columns={columns}
//         rowKey={(r) => r._id || r.sourcing_id || r.id}
//         pagination={false}
//         size="middle"
//         loading={loading}
//         locale={{ emptyText: <Empty description="No requests found" /> }}
//         className="overflow-x-auto"
//       />
//     </Card>
//   );
// }



// RecentlyCreatedFive.jsx
import React, { useMemo } from "react";
import { Card, Table, Empty } from "antd";
import dayjs from "dayjs";
import { getSourcingColumns } from "../utils/sourcingColumns"; // ← adjust path
import { statusPill as statusPillHelper } from "../utils/helpers"; // ← adjust path

// pick created timestamp in the same way everywhere
const getCreated = (r) => r.createdAt || r.created_at || r.created_on;

export default function RecentlyCreatedFive({
  orders = [],
  loading = false,
  title = "My 5 Most Recent Requests",

  // keep it looking exactly like the main table:
  // pass the same values you use there
  canEdit = false,
  navigate = () => {},
  handleDeleteOrder = () => {},
  statusPill = statusPillHelper,

  // optional: pass your expanded row renderer if you want the same expansion UI
  itemTable, // (order) => <Table ... />
}) {
  // same columns as the main table (Actions only if canEdit is true)
  const columns = useMemo(
    () =>
      getSourcingColumns({
        statusPill,
        canEdit,
        navigate,
        handleDeleteOrder,
      }),
    [statusPill, canEdit, navigate, handleDeleteOrder]
  );

  // top 5 most recently created
  const data = useMemo(
    () =>
      [...orders]
        .sort((a, b) => new Date(getCreated(b)) - new Date(getCreated(a)))
        .slice(0, 5),
    [orders]
  );

  return (
    <Card
      title={<span style={{ fontWeight: 700 }}>{title}</span>}
      style={{
        marginTop: 16,
        background: "#fff",
        borderRadius: 12,
        border: "1px solid #eef2ff",
      }}
      bodyStyle={{ padding: 0 }}
    >
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(r) => r._id || r.id || r.sourcing_id}
        pagination={false}
        size="middle"
        loading={loading}
        locale={{ emptyText: <Empty description="No requests found" /> }}
        className="overflow-x-auto"
        // make expansion match the main table if you pass itemTable
        {...(itemTable
          ? { expandable: { expandedRowRender: itemTable } }
          : {})}
      />
    </Card>
  );
}
