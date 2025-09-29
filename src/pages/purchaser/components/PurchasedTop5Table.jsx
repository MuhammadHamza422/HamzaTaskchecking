
import React, { useMemo } from "react";
import { Card, Table, Empty } from "antd";
import {
  buildTop5PurchasedDetailedRows,
  createTop5PurchasedDetailedColumns,
  ExpandedItemsTable,
} from "../utils/PurchaseTableUtils.jsx";

export default function PurchasedTop5Table({
  data = [],
  loading = false,
  title = "Latest 5 Purchased Orders",
  currency = "USD",
  requirePurchased = false, // set true to restrict strictly to purchased
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
        rowKey="key"
        tableLayout="fixed"
        scroll={{ x: "max-content" }}
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
