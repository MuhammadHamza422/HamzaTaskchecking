import React from "react";
import { Table } from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader for Products Tab - Table format
 */
const ProductsTabSkeleton = () => {
  const columns = [
    { title: "Product", key: "product", width: 200 },
    { title: "SKU", key: "sku", width: 120 },
    { title: "Quantity", key: "quantity", width: 100 },
    { title: "UOM", key: "uom", width: 80 },
    { title: "Unit Price", key: "price", width: 120 },
    { title: "Total", key: "total", width: 120 },
    { title: "Actions", key: "actions", width: 100 },
  ];

  const dataSource = Array.from({ length: 8 }, (_, index) => ({ key: index }));

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

export default ProductsTabSkeleton;

