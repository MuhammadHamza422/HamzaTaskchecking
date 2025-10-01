
// import React, { useMemo } from "react";
// import { Card, Table, Empty } from "antd";
// import {
//   buildTop5PurchasedDetailedRows,
//   createTop5PurchasedDetailedColumns,
//   ExpandedItemsTable,
// } from "../utils/PurchaseTableUtils.jsx";

// export default function PurchasedTop5Table({
//   data = [],
//   loading = false,
//   title = "Latest 5 Purchased Orders",
//   currency = "USD",
//   requirePurchased = false, // set true to restrict strictly to purchased
// }) {
//   const rows = useMemo(
//     () => buildTop5PurchasedDetailedRows(data, { limit: 5, requirePurchased }),
//     [data, requirePurchased]
//   );

//   const columns = useMemo(
//     () => createTop5PurchasedDetailedColumns(currency),
//     [currency]
//   );

//   return (
//     <Card
//       size="small"
//       bordered
//       title={title}
//       style={{ borderRadius: 12 }}
//       bodyStyle={{ padding: 12 }}
//     >
//       <Table
//         size="small"
//         pagination={false}
//         loading={loading}
//         dataSource={rows}
//         columns={columns}
//         rowKey="key"
//         tableLayout="fixed"
//         scroll={{ x: "max-content" }}
//         expandable={{
//           expandedRowRender: (row) =>
//             row?._original ? (
//               <ExpandedItemsTable order={row._original} />
//             ) : (
//               <Empty description="No products on this request" />
//             ),
//           rowExpandable: (row) =>
//             Array.isArray(row?._original?.items) &&
//             row._original.items.length > 0,
//         }}
//         locale={{ emptyText: <Empty description="No purchased orders" /> }}
//       />
//     </Card>
//   );
// }



import React, { useMemo } from "react";
import { Card, Table, Empty } from "antd";
import {
  buildTop5PurchasedDetailedRows,
  createTop5PurchasedDetailedColumns,
  ExpandedItemsTable,
} from "../utils/PurchaseTableUtils.jsx";

// Safely pick the best id from the row (we'll use the original order object)
const getDocId = (row = {}) => {
  const r = row?._original || row;
  return r?._id || r?.id || r?.sourcing_id || r?.sourcingId || null;
};

export default function PurchasedTop5Table({
  data = [],
  loading = false,
  title = "Latest 5 Purchased Orders",
  currency = "USD",
  requirePurchased = false,      // set true to restrict strictly to purchased
  onOpen,                        // OPTIONAL: (orderRow) => void — custom open handler
}) {
  const rows = useMemo(
    () => buildTop5PurchasedDetailedRows(data, { limit: 5, requirePurchased }),
    [data, requirePurchased]
  );

  const columns = useMemo(
    () => createTop5PurchasedDetailedColumns(currency),
    [currency]
  );

  return (
    <Card
      size="small"
      bordered
      title={title}
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 12 }}
    >
      <Table
        size="small"
        pagination={false}
        loading={loading}
        dataSource={rows}
        columns={columns}
        rowKey={(row) => getDocId(row) || row.key}
        tableLayout="fixed"
        scroll={{ x: "max-content" }}
        onRow={(row) => {
          const docId = getDocId(row);
          const clickable = Boolean(docId || onOpen);
          return {
            onClick: () => {
              if (onOpen) return onOpen(row._original || row);
              if (docId) window.location.assign(`/requests/${String(docId)}`);
            },
            style: clickable ? { cursor: "pointer" } : undefined,
          };
        }}
        expandable={{
          expandedRowRender: (row) =>
            row?._original ? (
              <ExpandedItemsTable order={row._original} />
            ) : (
              <Empty description="No products on this request" />
            ),
          rowExpandable: (row) =>
            Array.isArray(row?._original?.items) &&
            row._original.items.length > 0,
        }}
        locale={{ emptyText: <Empty description="No purchased orders" /> }}
      />
    </Card>
  );
}
