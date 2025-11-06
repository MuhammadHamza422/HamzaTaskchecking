import React from "react";
import { Table } from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader for Purchase Orders Table
 * Uses react-loading-skeleton for better visual design
 */
const ProcurementTableSkeleton = () => {
  const columns = [
    { title: "Date Created", key: "date", width: 120 },
    { title: "PO #", key: "ref", width: 100 },
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
        render: () => (
          <Skeleton
            height={20}
            borderRadius={4}
            style={{ margin: "4px 0" }}
          />
        ),
      }))}
      dataSource={dataSource}
      pagination={false}
      size="middle"
    />
  );
};

export default ProcurementTableSkeleton;
