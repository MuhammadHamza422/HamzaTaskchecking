import React from "react";
import { Table, Skeleton } from "antd";

/**
 * Skeleton loader for Purchase Orders Table
 */
const ProcurementTableSkeleton = () => {
  const columns = [
    { title: "Date Created", key: "date", width: 120 },
    { title: "Reference", key: "ref", width: 100 },
    { title: "Vendor", key: "vendor", width: 150 },
    { title: "Company", key: "company", width: 150 },
    { title: "Buyer", key: "buyer", width: 150 },
    { title: "Deadline", key: "deadline", width: 130 },
    { title: "Total", key: "total", width: 120 },
    { title: "Status", key: "status", width: 130 },
    { title: "Receipt", key: "receipt", width: 130 },
  ];

  const dataSource = Array.from({ length: 10 }, (_, index) => ({ key: index }));

  return (
    <Table
      columns={columns.map((col) => ({
        ...col,
        render: () => <Skeleton.Button active size="small" style={{ width: "100%" }} />,
      }))}
      dataSource={dataSource}
      pagination={false}
      size="middle"
    />
  );
};

export default ProcurementTableSkeleton;

