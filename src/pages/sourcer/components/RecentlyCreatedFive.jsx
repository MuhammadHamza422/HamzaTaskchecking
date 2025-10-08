
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
  canViewMyRequests = true, // if false: show no rows + permission empty state
  canEdit = false, // controls Edit button visibility
  canCancel = false, // controls Delete button visibility

  // navigation & actions (from parent)
  navigate = () => {},
  handleDeleteOrder = () => {},
  statusPill = statusPillHelper,

  // optional: expanded row like the main table
  itemTable, // (order) => <Table ... />

  // optional: customize edit URL; otherwise columns default applies
  buildEditUrl, // (id) => string
}) {
  // Columns with same styling/logic as your main table
  const columns = useMemo(
    () =>
      getSourcingColumns({
        statusPill,
        canEdit,
        canCancel,
        navigate,
        handleDeleteOrder,
        buildEditUrl,
      }),
    [statusPill, canEdit, canCancel, navigate, handleDeleteOrder, buildEditUrl]
  );

  // Top 5 most recent (or none if permission is off)
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
        size="small"
        scroll={{ x: 1350, y: 520 }}
        loading={loading}
        locale={{ emptyText: emptyNode }}
        className="overflow-x-auto"
        {...(itemTable ? { expandable: { expandedRowRender: itemTable } } : {})}

        
      />
    </Card>
  );
}
