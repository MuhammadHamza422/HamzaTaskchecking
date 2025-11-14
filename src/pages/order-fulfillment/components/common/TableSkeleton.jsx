import { Table } from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export default function TableSkeleton({ columns, rows = 5 }) {
  const dataSource = Array.from({ length: rows }, (_, index) => ({ key: index }));

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
}

