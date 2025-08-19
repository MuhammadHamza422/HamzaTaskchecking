import React from "react";
import {
  Table,
  Tag,
  Pagination,
  Spin,
  Empty,
  Button,
  Tooltip,
  Popover,
} from "antd";
import { useMediaQuery } from "react-responsive";
import { EyeOutlined, EditOutlined } from "@ant-design/icons";

export default function ManualOrderTable({
  orders,
  loading,
  currentPage,
  pageSize,
  totalOrders,
  onPageChange,
  onRowClick,
  onEditClick,
  showPagination = true,
}) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });

  // Helper function to format date
  const formatDate = (createdAt) => {
    if (!createdAt) {
      return <span className="text-sm whitespace-nowrap text-gray-400">—</span>;
    }

    const date = new Date(createdAt);
    const pad = (n) => String(n).padStart(2, "0");

    const formatted =
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())} ` +
      `${pad(date.getHours())}:` +
      `${pad(date.getMinutes())}:` +
      `${pad(date.getSeconds())}`;

    return <span className="text-sm text-gray-600 whitespace-nowrap">{formatted}</span>;
  };

  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) {
      return <span className="text-sm text-gray-400">—</span>;
    }
    return (
      <span className="text-sm font-medium text-gray-900">
        ${Number(amount).toFixed(2)}
      </span>
    );
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "processing":
        return "blue";
      case "completed":
        return "green";
      case "cancelled":
        return "red";
      case "pending":
        return "orange";
      default:
        return "default";
    }
  };

  // Get platform name
  const getPlatformName = (platformId) => {
    // This would typically come from a platforms list
    const platformMap = {
      "6890cc6719f58a04b3f95a47": "WooCommerce",
      "6890cc6719f58a04b3f95a48": "Walmart",
      "6890cc6719f58a04b3f95a49": "Amazon",
    };
    return platformMap[platformId] || "Unknown Platform";
  };

  const columns = [
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: isMobile ? 120 : 150,
      render: (text, record) => (
        <div className="cursor-pointer hover:text-blue-600" onClick={() => onRowClick(record)}>
          <div className="font-medium text-gray-900">{text}</div>
          <div className="text-xs text-gray-500">ID: {record.customerId}</div>
        </div>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerUsername",
      key: "customerUsername",
      width: isMobile ? 120 : 150,
      render: (text, record) => (
        <div>
          <div className="font-medium text-gray-900">{text}</div>
          <div className="text-xs text-gray-500">{record.customerEmail}</div>
        </div>
      ),
    },
    {
      title: "Platform",
      dataIndex: "plateform",
      key: "plateform",
      width: isMobile ? 100 : 120,
      render: (platformId) => (
        <Tag color="blue" className="text-xs">
          {getPlatformName(platformId)}
        </Tag>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: isMobile ? 100 : 120,
      render: (status) => (
        <Tag color={getStatusColor(status)} className="text-xs">
          {status}
        </Tag>
      ),
    },
    {
      title: "Order Total",
      dataIndex: "order_total",
      key: "order_total",
      width: isMobile ? 100 : 120,
      render: (amount) => formatCurrency(amount),
    },
    {
      title: "Items",
      dataIndex: "items",
      key: "items",
      width: isMobile ? 80 : 100,
      render: (items) => (
        <span className="text-sm text-gray-600">
          {Array.isArray(items) ? items.length : 0} items
        </span>
      ),
    },
    {
      title: "Created",
      dataIndex: "orderDate",
      key: "orderDate",
      width: isMobile ? 120 : 150,
      render: (date) => formatDate(date),
    },
    {
      title: "Actions",
      key: "actions",
      width: isMobile ? 80 : 100,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onRowClick(record);
              }}
              className="text-blue-600 hover:text-blue-800"
            />
          </Tooltip>
          <Tooltip title="Edit Order">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(record);
              }}
              className="text-green-600 hover:text-green-800"
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  // Mobile responsive columns
  const mobileColumns = [
    {
      title: "Order Info",
      key: "orderInfo",
      render: (_, record) => (
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-gray-900">{record.orderNumber}</div>
              <div className="text-xs text-gray-500">ID: {record.customerId}</div>
            </div>
            <Tag color={getStatusColor(record.status)} className="text-xs">
              {record.status}
            </Tag>
          </div>
          <div className="text-sm text-gray-600">
            <div>{record.customerUsername}</div>
            <div className="text-xs">{record.customerEmail}</div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>{getPlatformName(record.plateform)}</span>
            <span className="font-medium">{formatCurrency(record.order_total)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{Array.isArray(record.items) ? record.items.length : 0} items</span>
            <span>{formatDate(record.orderDate)}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(record);
            }}
            className="text-blue-600 hover:text-blue-800"
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(record);
            }}
            className="text-green-600 hover:text-green-800"
          />
        </div>
      ),
    },
  ];

  const tableColumns = isMobile ? mobileColumns : columns;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <Table
        columns={tableColumns}
        dataSource={orders}
        loading={loading}
        pagination={false}
        rowKey="_id"
        size={isMobile ? "small" : "middle"}
        className="manual-order-table"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No manual orders found"
            />
          ),
        }}
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          className: "cursor-pointer hover:bg-gray-50 transition-colors duration-150",
        })}
      />

      {/* Pagination */}
      {showPagination && (
        <div className="flex justify-between items-center p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to{" "}
            {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders} orders
          </div>
          <Pagination
            current={currentPage}
            pageSize={pageSize}
            total={totalOrders}
            onChange={onPageChange}
            showSizeChanger={false}
            showQuickJumper={false}
            showTotal={false}
            size={isMobile ? "small" : "default"}
          />
        </div>
      )}
    </div>
  );
}
