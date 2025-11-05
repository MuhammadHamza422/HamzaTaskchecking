import React from "react";
import { Table } from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader for Packing List Tab - Table format
 */
const PackingListTabSkeleton = () => {
  const columns = [
    { title: "Box ID", key: "boxId", width: 150 },
    { title: "Name", key: "name", width: 200 },
    { title: "Items", key: "items", width: 200 },
    { title: "QR Code", key: "qr", width: 100 },
    { title: "Actions", key: "actions", width: 150 },
  ];

  const dataSource = Array.from({ length: 6 }, (_, index) => ({ key: index }));

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <Skeleton height={32} width={200} />
        <Skeleton height={32} width={120} />
      </div>
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
    </div>
  );
};

export default PackingListTabSkeleton;

