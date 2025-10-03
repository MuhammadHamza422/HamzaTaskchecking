

// // // src/pages/sourcer/components/RecentlyCreatedFive.jsx
// // import React, { useMemo } from "react";
// // import { Card, Table, Empty } from "antd";
// // import { getSourcingColumns } from "../utils/sourcingColumns"; // adjust path if needed
// // import { statusPill as statusPillHelper } from "../utils/helpers"; // adjust path if needed

// // // Consistent created timestamp getter
// // const getCreated = (r) => r.createdAt || r.created_at || r.created_on;

// // export default function RecentlyCreatedFive({
// //   orders = [],
// //   loading = false,
// //   title = "My 5 Most Recent Requests",

// //   // make it look/behave like your main table
// //   canEdit = false,
// //   navigate = () => {},
// //   handleDeleteOrder = () => {},
// //   statusPill = statusPillHelper,

// //   // optional: match main table expansion
// //   itemTable, // (order) => <Table ... />
// // }) {
// //   // Use shared columns EXACTLY (no local Purchaser injection)
// //   const columns = useMemo(
// //     () =>
// //       getSourcingColumns({
// //         statusPill,
// //         canEdit,
// //         navigate,
// //         handleDeleteOrder,
// //       }),
// //     [statusPill, canEdit, navigate, handleDeleteOrder]
// //   );

// //   // Top 5 most recent by created timestamp
// //   const data = useMemo(
// //     () =>
// //       [...orders]
// //         .sort(
// //           (a, b) =>
// //             new Date(getCreated(b)).getTime() -
// //             new Date(getCreated(a)).getTime()
// //         )
// //         .slice(0, 5),
// //     [orders]
// //   );

// //   return (
// //     <Card
// //       title={<span style={{ fontWeight: 700 }}>{title}</span>}
// //       style={{
// //         marginTop: 16,
// //         background: "#fff",
// //         borderRadius: 12,
// //         border: "1px solid #eef2ff",
// //       }}
// //       bodyStyle={{ padding: 0 }}
// //     >
// //       <Table
// //         columns={columns}
// //         dataSource={data}
// //         rowKey={(r) => r._id || r.id || r.sourcing_id}
// //         pagination={false}
// //         size="middle"
// //         loading={loading}
// //         locale={{ emptyText: <Empty description="No requests found" /> }}
// //         className="overflow-x-auto"
// //         {...(itemTable ? { expandable: { expandedRowRender: itemTable } } : {})}
// //       />
// //     </Card>
// //   );
// // }




// // src/pages/sourcer/components/RecentlyCreatedFive.jsx
// import React, { useMemo } from "react";
// import { Card, Table, Empty } from "antd";
// import { getSourcingColumns } from "../utils/sourcingColumns";
// import { statusPill as statusPillHelper } from "../utils/helpers";

// // Consistent created timestamp getter
// const getCreated = (r) => r.createdAt || r.created_at || r.created_on;

// export default function RecentlyCreatedFive({
//   orders = [],
//   loading = false,
//   title = "My 5 Most Recent Requests",

//   // permissions
//   canViewMyRequests = true,     // 🚦 if false -> no rows displayed
//   canEdit = false,              // controls Edit button
//   canCancel = false,            // controls Delete button

//   // navigation & actions
//   navigate = () => {},
//   handleDeleteOrder = () => {},
//   statusPill = statusPillHelper,

//   // optional: match main table expansion
//   itemTable,                    // (order) => <Table ... />

//   // optional: customize edit URL (default matches your current route)
//   buildEditUrl,                 // (id) => string
// }) {
//   // Columns match main table behavior; wire both canEdit & canCancel
//   const columns = useMemo(
//     () =>
//       getSourcingColumns({
//         statusPill,
//         canEdit,
//         canCancel,
//         navigate,
//         handleDeleteOrder,
//         buildEditUrl,     // defaults to /sourcing/edit/:id inside columns if not provided
//       }),
//     [statusPill, canEdit, canCancel, navigate, handleDeleteOrder, buildEditUrl]
//   );

//   // Top 5 most recent (or none if permission is off)
//   const data = useMemo(() => {
//     if (!canViewMyRequests) return [];
//     const arr = Array.isArray(orders) ? orders : [];
//     return [...arr]
//       .sort(
//         (a, b) =>
//           new Date(getCreated(b)).getTime() - new Date(getCreated(a)).getTime()
//       )
//       .slice(0, 5);
//   }, [orders, canViewMyRequests]);

//   // Empty-state message respects permission
//   const emptyNode = canViewMyRequests ? (
//     <Empty description="No requests found" />
//   ) : (
//     <Empty description='No permission to view "My Requests"' />
//   );

//   return (
//     <Card
//       title={<span style={{ fontWeight: 700 }}>{title}</span>}
//       style={{
//         marginTop: 16,
//         background: "#fff",
//         borderRadius: 12,
//         border: "1px solid #eef2ff",
//       }}
//       bodyStyle={{ padding: 0 }}
//     >
//       <Table
//         columns={columns}
//         dataSource={data}
//         rowKey={(r) => r._id || r.id || r.sourcing_id}
//         pagination={false}
//         size="middle"
//         loading={loading}
//         locale={{ emptyText: emptyNode }}
//         className="overflow-x-auto"
//         {...(itemTable ? { expandable: { expandedRowRender: itemTable } } : {})}
//       />
//     </Card>
//   );
// }





// src/pages/sourcer/components/RecentlyCreatedFive.jsx
import React, { useMemo } from "react";
import { Card, Table, Empty } from "antd";
import { getSourcingColumns } from "../utils/sourcingColumns";
import { statusPill as statusPillHelper } from "../utils/helpers";

// Consistent created timestamp getter
const getCreated = (r) => r.createdAt || r.created_at || r.created_on;

export default function RecentlyCreatedFive({
  // data
  orders = [],
  loading = false,

  // UI
  title = "My 5 Most Recent Requests",

  // permissions (derive these from /api/v1/role/all in the parent)
  canViewMyRequests = true,   // if false: show no rows + permission empty state
  canEdit = false,            // controls Edit button visibility
  canCancel = false,          // controls Delete button visibility

  // navigation & actions (from parent)
  navigate = () => {},
  handleDeleteOrder = () => {},
  statusPill = statusPillHelper,

  // optional: expanded row like the main table
  itemTable,                  // (order) => <Table ... />

  // optional: customize edit URL; otherwise your columns default applies
  buildEditUrl,               // (id) => string
}) {
  // Use the shared columns (already contain stopPropagation + Popconfirm fixes)
  const columns = useMemo(
    () =>
      getSourcingColumns({
        statusPill,
        canEdit,
        canCancel,           // IMPORTANT: pass canCancel so the Delete button shows
        navigate,
        handleDeleteOrder,
        buildEditUrl,        // optional override; columns default to /sourcing/edit/:id
      }),
    [statusPill, canEdit, canCancel, navigate, handleDeleteOrder, buildEditUrl]
  );

  // Prepare top 5 most recent (or none if permission is off)
  const data = useMemo(() => {
    if (!canViewMyRequests) return [];
    const arr = Array.isArray(orders) ? orders : [];
    return [...arr]
      .sort(
        (a, b) =>
          new Date(getCreated(b)).getTime() - new Date(getCreated(a)).getTime()
      )
      .slice(0, 5);
  }, [orders, canViewMyRequests]);

  // Empty-state text matches permission
  const emptyNode = canViewMyRequests ? (
    <Empty description="No requests found" />
  ) : (
    <Empty description='No permission to view "My Requests"' />
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
        locale={{ emptyText: emptyNode }}
        className="overflow-x-auto"
        {...(itemTable ? { expandable: { expandedRowRender: itemTable } } : {})}
      />
    </Card>
  );
}
