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
}) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });

  // Helper function to format date
  const formatDate = (createdAt) => {
    if (!createdAt) {
      return <span className="text-sm text-gray-400">—</span>;
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

    return <span className="text-sm text-gray-600">{formatted}</span>;
  };

  // Component to render all kits in tooltip/popover
  const AllKitsContent = ({ kits }) => (
    <div className="max-w-xs h-full overflow-y-auto hide-scrollbar">
      <div className="space-y-3">
        {kits?.map((kit, kitIndex) => {
          const skus = kit?.skus || [];
          return (
            <div
              key={`all-kit-${kitIndex}`}
              className="border-b border-gray-100 pb-2 last:border-b-0"
            >
              <div className="text-xs text-gray-600 mb-1 font-medium">
                Kit {kitIndex + 1}: {kit?.kit_id || "N/A"}
              </div>
              <div className="flex flex-wrap gap-1">
                {skus.length > 0 ? (
                  skus.map((sku, skuIndex) => (
                    <Tag
                      key={`all-sku-${kitIndex}-${skuIndex}`}
                      size="small"
                      className="text-xs bg-blue-50 border-blue-200"
                    >
                      {sku}
                    </Tag>
                  ))
                ) : (
                  <span className="text-gray-400 text-xs">No SKUs</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const columns = [
    {
      title: "Order ID",
      dataIndex: "orderId",
      key: "orderId",
      render: (text) => (
        <span className="font-semibold text-gray-900">{text}</span>
      ),
    },
    {
      title: "Order Key",
      dataIndex: "order_key",
      key: "order_key",
      render: (text, record) => (
        <span className="text-sm text-gray-600 font-mono">
          {text || record?.customerOrderId || "N/A"}
        </span>
      ),
    },
    {
      title: "WC Status",
      dataIndex: "wc_status",
      key: "wc_status",
      render: (status, record) => {
        // Handle both wc_status and wm_status
        const actualStatus = status || record?.wm_status;
        let color = "default";
        if (actualStatus === "processing" || actualStatus === "Acknowledged")
          color = "blue";
        else if (actualStatus === "completed" || actualStatus === "Shipped")
          color = "green";
        else if (actualStatus === "pending") color = "orange";
        else if (actualStatus === "failed" || actualStatus === "Cancelled")
          color = "red";
        else if (actualStatus === "cancelled") color = "red";
        else if (actualStatus === "refunded") color = "purple";
        else if (actualStatus === "on-hold") color = "orange";

        return (
          <Tag color={color} className="capitalize">
            {actualStatus || "N/A"}
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
    // {
    //   title: "Kits",
    //   dataIndex: "maped_status",
    //   key: "maped_status",
    //   render: (maped_status) => {
    //     let displayText = "N/A";
    //     if (maped_status === true) displayText = "Mapped";
    //     else if (maped_status === false) displayText = "Unmapped";

    //     return (
    //       <span className="text-sm text-gray-600 font-mono">{displayText}</span>
    //     );
    //   },
    // },
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
        <span className={app_id ? "text-green-600" : "text-gray-400"}>
          {app_id || "No app ID"}
        </span>
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
    },
  ];

  // Mobile card component
  const MobileOrderCard = ({ order }) => {
    return (
      <div
        className="relative cursor-pointer hover:shadow-md transition-shadow rounded-lg text-sm text-black p-0 bg-white mb-4 border border-[#f0f0f0]"
        onClick={() => onRowClick(order)}
      >
        <div className="space-y-3 p-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold text-lg text-gray-900">
                Order #{order?.orderId}
              </div>
              <div className="text-sm text-gray-500 font-mono">
                {order?.order_key}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Tag
                color={
                  order?.wc_status === "processing" ||
                  order?.wm_status === "Acknowledged"
                    ? "blue"
                    : order?.wc_status === "completed" ||
                      order?.wm_status === "Shipped"
                    ? "green"
                    : order?.wc_status === "pending"
                    ? "orange"
                    : order?.wc_status === "failed" ||
                      order?.wm_status === "Cancelled"
                    ? "red"
                    : order?.wc_status === "cancelled"
                    ? "red"
                    : order?.wc_status === "refunded"
                    ? "purple"
                    : order?.wc_status === "on-hold"
                    ? "orange"
                    : "default"
                }
                className="capitalize text-xs"
              >
                {order?.wc_status
                  ? `WC: ${order.wc_status}`
                  : order?.wm_status
                  ? `WM: ${order.wm_status}`
                  : "Status: N/A"}
              </Tag>
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

          {/* Kits Section */}
          {/* <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Kits</div>
            {!Array.isArray(order?.kits) || order.kits.length === 0 ? (
              <span className="text-gray-400 text-sm">No kits</span>
            ) : (
              <div className="space-y-2">
                {order.kits.slice(0, 2).map((kit, kitIndex) => {
                  return (
                    <div
                      key={`kit-${kitIndex}`}
                      className="bg-gray-50 p-2 rounded"
                    >
                      <div className="text-xs text-gray-600 mb-1">
                        Kit ID: {kit?.kit_id || "N/A"}
                      </div>
                    </div>
                  );
                })}
                {order.kits.length > 2 && (
                  <Popover
                    content={<AllKitsContent kits={order.kits} />}
                    title={`All ${order.kits.length} Kits`}
                    trigger="click"
                    placement="top"
                    overlayClassName="kits-popover"
                  >
                    <div
                      className="text-xs text-blue-600 text-center py-1 px-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={(e) => e.stopPropagation()} // Prevent card click
                    >
                      +{order.kits.length - 2} more kits (tap to view)
                    </div>
                  </Popover>
                )}
                {order.kits.length <= 2 && order.kits.length > 0 && (
                  <Popover
                    content={<AllKitsContent kits={order.kits} />}
                    title={`All ${order.kits.length} Kits`}
                    trigger="click"
                    placement="top"
                    overlayClassName="kits-popover"
                  >
                    <div
                      className="text-xs text-blue-600 text-center py-1 px-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                      onClick={(e) => e.stopPropagation()} // Prevent card click
                    >
                      View all SKUs (tap to view)
                    </div>
                  </Popover>
                )}
              </div>
            )}
          </div> */}

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="text-sm text-gray-600">
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
        className="bg-white rounded-lg shadow-sm"
        scroll={{ x: isTablet ? 800 : undefined }}
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
