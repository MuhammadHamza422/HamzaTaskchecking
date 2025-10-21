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
  Checkbox,
} from "antd";
import { useMediaQuery } from "react-responsive";
import { CloseCircleOutlined } from "@ant-design/icons";
import { FaCheckCircle } from "react-icons/fa";

export default function OrderTable({
  orders,
  loading,
  currentPage,
  pageSize,
  totalOrders,
  onPageChange,
  onRowClick,
  onEditClick,
  showPagination = true,
  activeTab = "woocommerce", // Add activeTab prop
  showCheckboxes = false, // Add checkbox support
  selectedOrders = [], // Selected order IDs
  onOrderSelect = null, // Handle individual order selection
  selectAll = false, // Select all state
  onSelectAll = null, // Handle select all
}) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });
  const orderStatus = orders[0]?.status;

  console.log("orders", orders);

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

  // Platform-specific column configurations
  const getColumns = () => {
    // Add checkbox column if enabled
    const checkboxColumn = showCheckboxes
      ? [
          {
            title: (
              <Checkbox
                checked={selectAll}
                onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
                disabled={!orders || orders.length === 0}
              />
            ),
            dataIndex: "checkbox",
            key: "checkbox",
            width: 50,
            render: (_, record) => {
              const isDisabled = !!record?.shipStation_OrderId;
              return (
                <div className="flex items-center justify-center">
                  {isDisabled ? (
                    <FaCheckCircle className="text-green-500 size-4" />
                  ) : (
                    <Checkbox
                      checked={selectedOrders.includes(record?._id)}
                      disabled={isDisabled}
                      onChange={(e) =>
                        onOrderSelect &&
                        onOrderSelect(record?._id, e.target.checked)
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              );
            },
          },
        ]
      : [];

    const baseColumns = [
      {
        title: "Order ID",
        dataIndex: "orderId",
        key: "orderId",
        render: (text) => (
          <span className="font-semibold text-gray-900">{text}</span>
        ),
      },
      {
        title: "Created At",
        dataIndex: "createdAt",
        key: "createdAt",
        render: formatDate,
      },
      {
        title: "Actions",
        dataIndex: "actions",
        key: "actions",
        render: (_, record) => (
          <div className="flex items-center gap-2">
            <Button
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(record);
              }}
              className="text-blue-600 hover:text-blue-800"
            >
              Edit
            </Button>
            <Button
              type="link"
              onClick={() => onRowClick(record)}
              className="text-green-600 hover:text-green-800"
            >
              View
            </Button>
          </div>
        ),
        fixed: "right",
      },
    ];

    // WooCommerce specific columns
    if (activeTab === "woocommerce") {
      return [
        ...checkboxColumn,
        ...baseColumns.slice(0, 1), // Order ID
        {
          title: "WC Status",
          dataIndex: "wc_status",
          key: "wc_status",
          render: (status) => {
            let color = "default";
            if (status === "processing") color = "blue";
            else if (status === "completed") color = "green";
            else if (status === "pending") color = "orange";
            else if (status === "failed") color = "red";
            else if (status === "cancelled") color = "red";
            else if (status === "refunded") color = "purple";
            else if (status === "on-hold") color = "orange";
            return (
              <Tag color={color} className="capitalize">
                {status || "N/A"}
              </Tag>
            );
          },
        },
        {
          title: "Status",
          dataIndex: "status",
          key: "status",
          render: (status) => {
            let color = "default";
            if (status === "processed") color = "green";
            else if (status === "unprocessed") color = "orange";
            return (
              <Tag color={color} className="capitalize">
                {status || "N/A"}
              </Tag>
            );
          },
        },
        ...(orderStatus === "processed"
          ? [
              {
                title: "SS Status",
                dataIndex: "shipStation_order_status",
                key: "shipStation_order_status",
                width: 150,
                render: (status, record) =>
                  record?.shipStation_OrderId ? (
                    <Tag
                      color={status ? "blue" : "default"}
                      className="capitalize"
                    >
                      {status || "N/A"}
                    </Tag>
                  ) : (
                    <span className="text-gray-400">—</span>
                  ),
              },
              {
                title: "SS Order ID",
                dataIndex: "shipStation_OrderId",
                key: "shipStation_OrderId",
                width: 80,
                render: (id, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-gray-900">{id}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  ),
              },
            ]
          : []),
        {
          title: "Tracking",
          dataIndex: "tracking_number",
          key: "tracking_number",
          render: (tracking) => (
            <span
              className={`whitespace-nowrap ${
                tracking ? "text-green-600" : "text-gray-400"
              } `}
            >
              {tracking || "No tracking"}
            </span>
          ),
        },
        {
          title: "App ID",
          dataIndex: "app_id",
          key: "app_id",
          render: (app_id) => (
            <span
              className={`whitespace-nowrap ${
                app_id ? "text-green-600" : "text-gray-400"
              }`}
            >
              {app_id || "No app ID"}
            </span>
          ),
        },
        ...baseColumns.slice(1), // Created At and Actions
      ];
    }

    // Walmart specific columns
    if (activeTab === "walmart") {
      return [
        ...checkboxColumn,
        ...baseColumns.slice(0, 1), // Order ID
        {
          title: "Customer Order ID",
          dataIndex: "customerOrderId",
          key: "customerOrderId",
          render: (text) => (
            <span className="text-sm text-gray-600 font-mono">
              {text || "N/A"}
            </span>
          ),
        },
        {
          title: "WM Status",
          dataIndex: "wm_status",
          key: "wm_status",
          render: (status) => {
            let color = "default";
            if (status === "Acknowledged") color = "blue";
            else if (status === "Shipped") color = "green";
            else if (status === "Pending") color = "orange";
            else if (status === "Cancelled") color = "red";
            else if (status === "Delivered") color = "green";

            return (
              <Tag color={color} className="capitalize">
                {status || "N/A"}
              </Tag>
            );
          },
        },
        ...(orderStatus === "processed"
          ? [
              {
                title: "SS Status",
                dataIndex: "shipStation_order_status",
                key: "shipStation_order_status",
                width: 150,
                render: (status, record) =>
                  record?.shipStation_OrderId ? (
                    <Tag
                      color={status ? "blue" : "default"}
                      className="capitalize"
                    >
                      {status || "N/A"}
                    </Tag>
                  ) : (
                    <span className="text-gray-400">—</span>
                  ),
              },
              {
                title: "SS Order ID",
                dataIndex: "shipStation_OrderId",
                key: "shipStation_OrderId",
                width: 80,
                render: (id, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-gray-900">{id}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  ),
              },
            ]
          : []),
        {
          title: "Status",
          dataIndex: "status",
          key: "status",
          render: (status) => {
            let color = "default";
            if (status === "processed") color = "green";
            else if (status === "unprocessed") color = "orange";

            return (
              <Tag color={color} className="capitalize">
                {status || "N/A"}
              </Tag>
            );
          },
        },
        {
          title: "Tracking",
          dataIndex: "tracking_number",
          key: "tracking_number",
          render: (tracking) => (
            <span
              className={`whitespace-nowrap ${
                tracking ? "text-green-600" : "text-gray-400"
              } `}
            >
              {tracking || "No tracking"}
            </span>
          ),
        },
        {
          title: "App ID",
          dataIndex: "app_id",
          key: "app_id",
          render: (app_id) => (
            <span
              className={`whitespace-nowrap ${
                app_id ? "text-green-600" : "text-gray-400"
              }`}
            >
              {app_id || "No app ID"}
            </span>
          ),
        },
        ...baseColumns.slice(1), // Created At and Actions
      ];
    }

    // Shopify specific columns
    if (activeTab === "shopify") {
      return [
        ...checkboxColumn,
        {
          title: "Order ID",
          dataIndex: "orderId",
          key: "orderId",
          render: (text) => {
            // Extract numeric ID from gid://shopify/Order/6163651690800 format
            const numericId = text?.replace("gid://shopify/Order/", "") || text;
            return (
              <span className="font-semibold text-gray-900">{numericId}</span>
            );
          },
        },
        {
          title: "Order Key",
          dataIndex: "order_key",
          key: "order_key",
          render: (text) => (
            <span className="text-sm text-gray-600 font-mono">
              {text || "N/A"}
            </span>
          ),
        },
        // sf_status will only in processing
        {
          title: "SF Status",
          dataIndex: "sf_status", // Shopify uses wc_status field
          key: "sf_status",
          render: (status) => {
            let color = "default";
            return (
              <Tag color={color} className="capitalize">
                {status || "N/A"}
              </Tag>
            );
          },
        },
        {
          title: "Status",
          dataIndex: "status",
          key: "status",
          render: (status) => {
            let color = "default";
            if (status === "processed") color = "green";
            else if (status === "unprocessed") color = "orange";

            return (
              <Tag color={color} className="capitalize">
                {status || "N/A"}
              </Tag>
            );
          },
        },
        ...(orderStatus === "processed"
          ? [
              {
                title: "SS Status",
                dataIndex: "shipStation_order_status",
                key: "shipStation_order_status",
                width: 150,
                render: (status, record) =>
                  record?.shipStation_OrderId ? (
                    <Tag
                      color={status ? "blue" : "default"}
                      className="capitalize"
                    >
                      {status || "N/A"}
                    </Tag>
                  ) : (
                    <span className="text-gray-400">—</span>
                  ),
              },
              {
                title: "SS Order ID",
                dataIndex: "shipStation_OrderId",
                key: "shipStation_OrderId",
                width: 80,
                render: (id, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-gray-900">{id}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  ),
              },
            ]
          : []),
        {
          title: "Tracking",
          dataIndex: "tracking_number",
          key: "tracking_number",
          render: (tracking) => (
            <span
              className={`whitespace-nowrap ${
                tracking ? "text-green-600" : "text-gray-400"
              } `}
            >
              {tracking || "No tracking"}
            </span>
          ),
        },
        {
          title: "App ID",
          dataIndex: "app_id",
          key: "app_id",
          render: (app_id) => (
            <span
              className={`whitespace-nowrap ${
                app_id ? "text-green-600" : "text-gray-400"
              }`}
            >
              {app_id || "No app ID"}
            </span>
          ),
        },
        ...baseColumns.slice(1), // Created At and Actions
      ];
    }

    // Amazon specific columns (placeholder for future)
    if (activeTab === "amazon") {
      return [
        ...checkboxColumn,
        ...baseColumns.slice(0, 1), // Order ID
        {
          title: "Amazon Order ID",
          dataIndex: "amazonOrderId",
          key: "amazonOrderId",
          render: (text) => (
            <span className="text-sm text-gray-600 font-mono">
              {text || "N/A"}
            </span>
          ),
        },
        {
          title: "AM Status",
          dataIndex: "am_status",
          key: "am_status",
          render: (status) => {
            let color = "default";
            if (status === "Pending") color = "orange";
            else if (status === "Shipped") color = "green";
            else if (status === "Delivered") color = "green";
            else if (status === "Cancelled") color = "red";

            return (
              <Tag color={color} className="capitalize">
                {status || "N/A"}
              </Tag>
            );
          },
        },
        {
          title: "Status",
          dataIndex: "status",
          key: "status",
          render: (status) => {
            let color = "default";
            if (status === "processed") color = "green";
            else if (status === "unprocessed") color = "orange";

            return (
              <Tag color={color} className="capitalize">
                {status || "N/A"}
              </Tag>
            );
          },
        },
        {
          title: "Tracking",
          dataIndex: "tracking_number",
          key: "tracking_number",
          render: (tracking) => (
            <span className={tracking ? "text-green-600" : "text-gray-400"}>
              {tracking || "No tracking"}
            </span>
          ),
        },
        {
          title: "App ID",
          dataIndex: "app_id",
          key: "app_id",
          render: (app_id) => (
            <span
              className={`whitespace-nowrap ${
                app_id ? "text-green-600" : "text-gray-400"
              }`}
            >
              {app_id || "No app ID"}
            </span>
          ),
        },
        ...baseColumns.slice(1), // Created At and Actions
      ];
    }

    // Default fallback
    return [...checkboxColumn, ...baseColumns];
  };

  // Platform-specific mobile card component
  const MobileOrderCard = ({ order }) => {
    const getStatusTag = () => {
      if (activeTab === "woocommerce") {
        const status = order?.wc_status;
        let color = "default";
        if (status === "processing") color = "blue";
        else if (status === "completed") color = "green";
        else if (status === "pending") color = "orange";
        else if (status === "failed") color = "red";
        else if (status === "cancelled") color = "red";
        else if (status === "refunded") color = "purple";
        else if (status === "on-hold") color = "orange";

        return (
          <Tag color={color} className="capitalize text-xs">
            WC: {status || "N/A"}
          </Tag>
        );
      }

      if (activeTab === "walmart") {
        const status = order?.wm_status;
        let color = "default";
        if (status === "Acknowledged") color = "blue";
        else if (status === "Shipped") color = "green";
        else if (status === "Pending") color = "orange";
        else if (status === "Cancelled") color = "red";
        else if (status === "Delivered") color = "green";

        return (
          <Tag color={color} className="capitalize text-xs">
            WM: {status || "N/A"}
          </Tag>
        );
      }

      if (activeTab === "shopify") {
        const status = order?.wc_status; // Shopify uses wc_status field
        let color = "default";
        if (status === "processing") color = "blue";
        else if (status === "completed") color = "green";
        else if (status === "pending") color = "orange";
        else if (status === "failed") color = "red";
        else if (status === "cancelled") color = "red";
        else if (status === "refunded") color = "purple";
        else if (status === "on-hold") color = "orange";

        return (
          <Tag color={color} className="capitalize text-xs">
            SF: {status || "N/A"}
          </Tag>
        );
      }

      if (activeTab === "amazon") {
        const status = order?.am_status;
        let color = "default";
        if (status === "Pending") color = "orange";
        else if (status === "Shipped") color = "green";
        else if (status === "Delivered") color = "green";
        else if (status === "Cancelled") color = "red";

        return (
          <Tag color={color} className="capitalize text-xs">
            AM: {status || "N/A"}
          </Tag>
        );
      }

      return null;
    };

    const getOrderKey = () => {
      if (activeTab === "woocommerce") {
        return order?.order_key || "N/A";
      }
      if (activeTab === "walmart") {
        return order?.customerOrderId || "N/A";
      }
      if (activeTab === "shopify") {
        return order?.order_key || "N/A";
      }
      if (activeTab === "amazon") {
        return order?.amazonOrderId || "N/A";
      }
      return "N/A";
    };

    return (
      <div
        className="relative cursor-pointer hover:shadow-md transition-shadow rounded-lg text-sm text-black p-0 bg-white mb-4 border border-[#f0f0f0]"
        onClick={() => onRowClick(order)}
      >
        <div className="space-y-3 p-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1 overflow-y-auto shidden">
              {/* Checkbox for mobile */}
              {showCheckboxes && (
                <div className="mt-1">
                  {order?.shipStation_OrderId ? (
                    <CloseCircleOutlined className="text-red-400" />
                  ) : (
                    <Checkbox
                      checked={selectedOrders.includes(order._id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onOrderSelect &&
                          onOrderSelect(order._id, e.target.checked);
                      }}
                    />
                  )}
                </div>
              )}
              <div>
                <div className="font-semibold text-lg text-gray-900">
                  Order #
                  {activeTab === "shopify"
                    ? order?.orderId?.replace("gid://shopify/Order/", "") ||
                      order?.orderId
                    : order?.orderId}
                </div>
                <div className="text-sm text-gray-500 font-mono">
                  {getOrderKey()}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {getStatusTag()}
              <Tag
                color={
                  order?.status === "processed"
                    ? "green"
                    : order?.status === "unprocessed"
                    ? "orange"
                    : "default"
                }
                className="capitalize text-xs"
              >
                Status: {order?.status || "N/A"}
              </Tag>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="text-sm text-gray-600 whitespace-nowrap">
              {formatDate(order?.createdAt)}
            </div>
            <div className="flex gap-2">
              <div className="text-sm">
                <span
                  className={
                    order?.tracking_number ? "text-green-600" : "text-gray-400"
                  }
                >
                  {order?.tracking_number || "No tracking"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <Button
              size="small"
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(order);
              }}
              className="text-blue-600 hover:text-blue-800 p-0 h-auto"
            >
              Edit
            </Button>
            <Button
              size="small"
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                onRowClick(order);
              }}
              className="text-green-600 hover:text-green-800 p-0 h-auto"
            >
              View
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Empty
        description="No orders found"
        className="py-12 text-xl font-semibold text-gray-500"
      />
    );
  }

  const columns = getColumns();

  // Mobile layout
  if (isMobile) {
    return (
      <div className="space-y-4 transition-opacity duration-300">
        <div className="space-y-2">
          {orders.map((order) => (
            <MobileOrderCard key={order?._id} order={order} />
          ))}
        </div>

        {showPagination && (
          <div className="flex justify-center">
            <Pagination
              current={currentPage}
              total={totalOrders}
              pageSize={pageSize}
              showSizeChanger={false}
              showQuickJumper={false}
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} of ${total}`
              }
              onChange={onPageChange}
              onShowSizeChange={onPageChange}
              size="small"
            />
          </div>
        )}
      </div>
    );
  }

  // Desktop/Tablet layout
  return (
    <div className="space-y-4 overflow-x-auto hide-scrollbar transition-opacity duration-300">
      <Table
        columns={columns}
        dataSource={orders}
        rowKey="_id"
        pagination={false}
        size={isTablet ? "small" : "middle"}
        className="bg-white rounded-lg shadow-sm overflow-x-auto overflow-y-auto"
        scroll={{ x: isTablet ? 800 : undefined }}
        rowClassName={(record) =>
          record?.shipStation_OrderId ? "opacity-60" : ""
        }
        onRow={(record) => ({
          onClick: () => onRowClick(record),
          className: "cursor-pointer hover:bg-gray-50 transition-colors",
        })}
      />

      {showPagination && (
        <div className="flex justify-center">
          <Pagination
            current={currentPage}
            total={totalOrders}
            pageSize={pageSize}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) =>
              `${range[0]}-${range[1]} of ${total} orders`
            }
            onChange={onPageChange}
            onShowSizeChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
