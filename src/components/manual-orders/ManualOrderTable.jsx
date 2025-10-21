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
import { EyeOutlined, EditOutlined, CloseOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { FaCheckCircle } from "react-icons/fa";

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
  showCheckboxes = false,
  selectedOrders = [],
  onOrderSelect,
  selectAll = false,
  onSelectAll,
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

    return (
      <span className="text-sm text-gray-600 whitespace-nowrap">
        {formatted}
      </span>
    );
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
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Fetch platforms from API
  const { data: platformsData } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/plateforms/all");
      return response.data;
    },
  });

  // Get platform name
  const getPlatformName = (platformId) => {
    if (!platformsData?.platforms) return "Unknown Platform";

    const platform = platformsData.platforms.find((p) => p._id === platformId);
    return platform?.plt_name || "Unknown Platform";
  };

  const columns = [
    ...(showCheckboxes
      ? [
          {
            title: (
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => onSelectAll?.(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            ),
            key: "selection",
            width: 50,
            render: (_, record) => {
              const isShipStationSent =
                record?.shipstation_status === true ||
                record?.shipStation_OrderId;
              const isSelected = selectedOrders.includes(record._id);

              if (isShipStationSent) {
                return (
                  <Tooltip title="Already sent to ShipStation">
                    <FaCheckCircle className="text-green-500 size-4" />
                  </Tooltip>
                );
              }

              return (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onOrderSelect?.(record._id, e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              );
            },
          },
        ]
      : []),
    {
      title: "Order Number",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: isMobile ? 120 : 150,
      render: (text, record) => (
        <div
          className="cursor-pointer hover:text-blue-600"
          onClick={() => onRowClick(record)}
        >
          <div className="font-medium text-gray-900">{text}</div>
          <div className="text-xs text-gray-500">ID: {record.customerId}</div>
        </div>
      ),
    },
    {
      title: "Platform",
      dataIndex: "plateform",
      key: "plateform",
      width: isMobile ? 100 : 120,
      render: (platform) => {
        const platformId = platform?._id || platform;
        return (
          <Tag color="blue" className="text-xs">
            {getPlatformName(platformId)}
          </Tag>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: isMobile ? 100 : 120,
      render: (status, record) => {
        const isShipStation =
          record?.shipstation_status === true || record?.shipStation_OrderId;
        return (
          <div className="flex flex-col gap-1">
            <p
              className={`text-xs capitalize flex items-center justify-center px-2 py-1 rounded-md ${getStatusColor(
                status
              )}`}
            >
              {status}
            </p>

            {/* {isShipStation && (
              <Tag color="green" className="text-xs">
                ShipStation
              </Tag>
            )} */}
          </div>
        );
      },
    },
    {
      title: "Order Total",
      dataIndex: "order_total",
      key: "order_total",
      width: isMobile ? 100 : 120,
      render: (amount) => formatCurrency(amount),
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
          {/* <Tooltip title="Edit Order">
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
          </Tooltip> */}
        </div>
      ),
    },
  ];

  // Mobile responsive columns
  const mobileColumns = [
    ...(showCheckboxes
      ? [
          {
            title: (
              <input
                type="checkbox"
                checked={selectAll}
                onChange={(e) => onSelectAll?.(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            ),
            key: "selection",
            width: 50,
            render: (_, record) => {
              const isShipStationSent =
                record?.shipstation_status === true ||
                record?.shipStation_OrderId;
              const isSelected = selectedOrders.includes(record._id);

              if (isShipStationSent) {
                return (
                  <Tooltip title="Already sent to ShipStation">
                    <CloseOutlined className="text-red-500 text-sm" />
                  </Tooltip>
                );
              }

              return (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) =>
                    onOrderSelect?.(record._id, e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              );
            },
          },
        ]
      : []),
    {
      title: "Order Info",
      key: "orderInfo",
      render: (_, record) => (
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-medium text-gray-900">
                {record.orderNumber}
              </div>
              <div className="text-xs text-gray-500">
                ID: {record.customerId}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Tag color={getStatusColor(record.status)} className="text-xs">
                {record.status}
              </Tag>
              {(record?.shipstation_status === true ||
                record?.shipStation_OrderId) && (
                <Tag color="green" className="text-xs">
                  ShipStation
                </Tag>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <div>{record.customerUsername}</div>
            <div className="text-xs">{record.customerEmail}</div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>
              {getPlatformName(record.plateform?._id || record.plateform)}
            </span>
            <span className="font-medium">
              {formatCurrency(record.order_total)}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>
              {Array.isArray(record.items) ? record.items.length : 0} items
            </span>
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
          {/* <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(record);
            }}
            className="text-green-600 hover:text-green-800"
          /> */}
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
        onRow={(record) => {
          const isShipStationSent =
            record?.shipstation_status === true || record?.shipStation_OrderId;
          return {
            onClick: () => onRowClick(record), // Always allow opening details drawer
            className: `transition-colors duration-150 ${
              isShipStationSent
                ? "opacity-75 cursor-pointer hover:bg-gray-50 bg-gray-50"
                : "cursor-pointer hover:bg-gray-50"
            }`,
          };
        }}
      />

      {/* Pagination */}
      {showPagination && (
        <div className="flex justify-between items-center p-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalOrders)} of {totalOrders}{" "}
            orders
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
