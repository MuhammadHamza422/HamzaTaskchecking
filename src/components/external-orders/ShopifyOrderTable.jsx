import React, { memo } from "react";
import {
  Table,
  Tag,
  Pagination,
  Spin,
  Empty,
  Button,
  Checkbox,
  Tooltip,
  Badge,
} from "antd";
import { useMediaQuery } from "react-responsive";
import {
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { FaCheckCircle } from "react-icons/fa";
import AddLabelModal from "./AddLabel";

function ShopifyOrderTable({
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
  onOrderSelect = null,
  selectAll = false,
  onSelectAll = null,
  activeTab,
  fetchProcessedOrders,
}) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const isTablet = useMediaQuery({ minWidth: 769, maxWidth: 1024 });

  console.log("Orders:", orders);

  // Helper function to format date
  const formatDate = (createdAt) => {
    if (!createdAt) {
      return <span className="text-sm text-gray-400">—</span>;
    }

    const date = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return (
        <div className="text-sm">
          <div className="text-gray-900">Today</div>
          <div className="text-gray-500">
            {date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      );
    } else if (diffDays === 2) {
      return (
        <div className="text-sm">
          <div className="text-gray-900">Yesterday</div>
          <div className="text-gray-500">
            {date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      );
    } else {
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      return (
        <div className="text-sm">
          <div className="text-gray-900">{dayName}</div>
          <div className="text-gray-500">
            {date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      );
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount, currency = "USD") => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(amount));
  };

  // Get payment status dot
  const getPaymentStatusDot = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case "processed":
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case "unprocessed":
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      case "refunded":
        return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-300 rounded-full"></div>;
    }
  };

  // Get fulfillment status
  const getFulfillmentStatus = (status) => {
    // Handle null/undefined as unfulfilled
    if (!status || status === null) {
      return (
        <div className="flex items-center justify-center gap-2 bg-yellow-400 rounded-full text-black p-0.5">
          <div className="w-2 h-2 bg-white rounded-full"></div>
          <span className="text-sm font-medium">Unfulfilled</span>
        </div>
      );
    }

    switch (status?.toLowerCase()) {
      case "fulfilled":
        return (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700 font-medium">
              Fulfilled
            </span>
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center gap-2 bg-yellow-400 rounded-full text-black p-1">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="text-sm font-medium">Unfulfilled</span>
          </div>
        );
    }
  };

  // Get delivery status
  const getDeliveryStatus = (status) => {
    if (!status) {
      return <span className="text-sm text-gray-400">—</span>;
    }

    switch (status?.toLowerCase()) {
      case "awaiting_shipment":
        return (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-sm text-yellow-700 font-medium">
              Awaiting Shipment
            </span>
          </div>
        );
      case "in_transit":
        return (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-blue-700 font-medium">
              In Transit
            </span>
          </div>
        );
      case "delivered":
        return (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-green-700 font-medium">
              Delivered
            </span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm text-gray-600">{status}</span>
          </div>
        );
    }
  };

  // Get delivery method
  const getDeliveryMethod = (method) => {
    if (!method) return <span className="text-sm text-gray-400">—</span>;
    return <span className="text-sm text-gray-600">{method}</span>;
  };

  // Get cancel reason badge
  const getCancelReasonBadge = (cancelReason) => {
    if (!cancelReason || cancelReason === "null") return null;

    const reasonConfig = {
      customer: { color: "bg-blue-100 text-blue-800", text: "Customer" },
      inventory: { color: "bg-orange-100 text-orange-800", text: "Inventory" },
      fraud: { color: "bg-red-100 text-red-800", text: "Fraud" },
      staff: { color: "bg-purple-100 text-purple-800", text: "Staff" },
      cancel: { color: "bg-gray-100 text-gray-800", text: "Cancelled" },
    };

    const config = reasonConfig[cancelReason] || {
      color: "bg-gray-100 text-gray-800",
      text: cancelReason,
    };

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.text}
      </span>
    );
  };

  // Check if order has fraud/cancel issues
  const getOrderWarning = (order) => {
    const shopifyDetails = order?.shopifyDetails;
    if (!shopifyDetails) return null;

    // Check for fraud
    if (shopifyDetails.cancel_reason === "fraud") {
      return {
        type: "fraud",
        icon: <ExclamationCircleOutlined className="text-red-500" />,
        tooltip: "This order has a high risk of fraud.",
        reason: "Fraud",
      };
    }

    // Check for cancelled orders
    if (shopifyDetails.cancelled_at) {
      const cancelReason = shopifyDetails.cancel_reason;
      // Apply strikethrough only for customer and staff cancellations
      const shouldStrikeThrough =
        cancelReason && ["customer", "staff"].includes(cancelReason);

      return {
        type: shouldStrikeThrough ? "cancel" : "cancelled",
        icon: <WarningOutlined className="text-orange-500" />,
        tooltip: `Order cancelled: ${cancelReason || "Unknown reason"}`,
        reason: cancelReason || "Cancel",
      };
    }

    // Check for refunded orders
    // if (shopifyDetails.financial_status === "refunded") {
    //   return {
    //     type: "refunded",
    //     icon: <WarningOutlined className="text-blue-500" />,
    //     tooltip: "This order has been refunded.",
    //     reason: "Refunded"
    //   };
    // }

    return null;
  };

  // Get tags
  const getTags = (tags) => {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return <span className="text-sm text-gray-400">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {tags.slice(0, 2).map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
          >
            {tag}
          </span>
        ))}
        {tags.length > 2 && (
          <span className="text-xs text-gray-500">+{tags.length - 2} more</span>
        )}
      </div>
    );
  };

  // Checkbox column
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

  // Main columns matching Shopify admin design
  const columns = [
    ...checkboxColumn,
    {
      title: "Order",
      dataIndex: "order_key",
      key: "order_key",
      width: 120,
      render: (orderkey, record) => {
        const numericId = orderkey;
        const warning = getOrderWarning(record);
        const cancelReason = record?.shopifyDetails?.cancel_reason;

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {warning && (
                <Tooltip title={warning.tooltip} placement="top">
                  {warning.icon}
                </Tooltip>
              )}
              <span className="font-semibold text-gray-900">
                {record?.shopifyDetails?.name || `${numericId}` || "RF"}
              </span>
            </div>
            {getCancelReasonBadge(cancelReason)}
          </div>
        );
      },
    },
    {
      title: "Date ↓",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: formatDate,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: "Customer",
      dataIndex: "user_name",
      key: "customerName",
      width: 120,
      render: (name) => (
        <span className="text-sm text-gray-900">{name || "Customer"}</span>
      ),
    },
    {
      title: "FFM Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status) => (
        <div className="flex items-center gap-2">
          <span
            className={`text-sm text-white px-2 py-[2px] rounded-full ${
              status === "processed" ? "bg-green-700" : "bg-red-500"
            } capitalize`}
          >
            {status || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      title: "SF Status",
      dataIndex: "sf_status",
      key: "sf_status",
      width: 120,
      render: (sfstatus) => (
        <span className="text-sm text-gray-600 capitalize">
          {sfstatus || "Unknown"}
        </span>
      ),
    },
    {
      title: "Channel",
      dataIndex: "shopifyDetails",
      key: "channel",
      width: 120,
      render: (shopifyDetails) => (
        <span className="text-sm text-gray-600">
          {shopifyDetails?.source_name === "web"
            ? "Online Store"
            : shopifyDetails?.source_name || "Online Store"}
        </span>
      ),
    },
    {
      title: "Total",
      dataIndex: "shopifyDetails",
      key: "total",
      width: 100,
      render: (shopifyDetails) => (
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(
            shopifyDetails?.total_price,
            shopifyDetails?.currency
          )}
        </span>
      ),
    },
    {
      title: "Payment status",
      dataIndex: "shopifyDetails",
      key: "paymentStatus",
      width: 120,
      render: (shopifyDetails) => (
        <div className="flex items-center gap-2">
          {getPaymentStatusDot(shopifyDetails?.financial_status)}
          <span
            className={`text-sm ${
              shopifyDetails?.financial_status === "paid"
                ? "text-green-700"
                : "text-red-500"
            } capitalize`}
          >
            {shopifyDetails?.financial_status || "Unknown"}
          </span>
        </div>
      ),
    },
    {
      title: "Fulfillment status",
      dataIndex: "shopifyDetails",
      key: "fulfillmentStatus",
      width: 140,
      render: (shopifyDetails) =>
        getFulfillmentStatus(shopifyDetails?.fulfillment_status),
    },
    {
      title: "Items",
      dataIndex: "shopifyDetails",
      key: "items",
      width: 80,
      render: (shopifyDetails) => (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {shopifyDetails?.line_items?.length || 0}
          </div>
          <div className="text-xs text-gray-500">Items</div>
        </div>
      ),
    },
    {
      title: "Delivery status",
      dataIndex: "shipStation_order_status",
      key: "deliveryStatus",
      width: 120,
      render: getDeliveryStatus,
    },
    {
      title: "Delivery method",
      dataIndex: "shopifyDetails",
      key: "deliveryMethod",
      width: 140,
      render: (shopifyDetails) =>
        getDeliveryMethod(shopifyDetails?.shipping_lines?.[0]?.title),
    },
    {
      title: "Tracking",
      dataIndex: "tracking_number",
      key: "trackingNumber",
      width: 120,
      render: (trackingNumber) => {
        if (!trackingNumber || trackingNumber.trim() === "") {
          return <span className="text-sm text-gray-400">—</span>;
        }
        return (
          <span className="text-sm text-blue-600 font-medium">
            {trackingNumber}
          </span>
        );
      },
    },
    {
      title: "Tags",
      dataIndex: "shopifyDetails",
      key: "tags",
      width: 200,
      render: (shopifyDetails) =>
        getTags(
          shopifyDetails?.tags
            ? shopifyDetails.tags
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean)
            : []
        ),
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      width: 150,
      fixed: "right",
      render: (_, record) => (
        <div className="flex items-center gap-1">
          <AddLabelModal
            order={record}
            activeTab={activeTab}
            fetchProcessedOrders={fetchProcessedOrders}
          />
          {/* <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEditClick(record);
            }}
            className="text-blue-600 hover:text-blue-800 p-1"
          >
            Edit
          </Button> */}
          {/* <Button
            type="link"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRowClick(record);
            }}
            className="text-green-600 hover:text-green-800 p-1"
          >
            View
          </Button> */}
        </div>
      ),
    },
  ];

  // Mobile card component
  const MobileOrderCard = ({ order }) => {
    const numericId =
      order?.orderId?.replace("gid://shopify/Order/", "") || order?.orderId;
    const warning = getOrderWarning(order);

    return (
      <div
        className={`relative cursor-pointer hover:shadow-md transition-shadow rounded-lg text-sm text-black p-0 bg-white mb-4 border border-gray-200 ${
          warning && warning.type === "cancel"
            ? "line-through text-gray-500"
            : ""
        }`}
        onClick={() => onRowClick(order)}
      >
        <div className="space-y-3 p-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1">
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
                <div className="flex items-center gap-2">
                  {warning && (
                    <Tooltip title={warning.tooltip} placement="top">
                      {warning.icon}
                    </Tooltip>
                  )}
                  <div className="font-semibold text-lg text-gray-900">
                    {order?.shopifyDetails?.name || `RF${numericId}`}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(order?.createdAt)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {getCancelReasonBadge(order?.shopifyDetails?.cancel_reason)}
                  {warning && (
                    <div className="text-xs text-red-600">{warning.reason}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {getPaymentStatusDot(order?.shopifyDetails?.financial_status)}
                <span className="text-sm text-gray-600 capitalize">
                  {order?.shopifyDetails?.financial_status || "Unknown"}
                </span>
              </div>
              {getFulfillmentStatus(order?.shopifyDetails?.fulfillment_status)}
            </div>
          </div>

          {/* Customer */}
          <div className="text-sm">
            <span className="text-gray-500">Customer:</span>
            <div className="font-semibold text-gray-900">
              {order?.user_name || "Customer"}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Total:</span>
              <div className="font-semibold text-gray-900">
                {formatCurrency(
                  order?.shopifyDetails?.total_price,
                  order?.shopifyDetails?.currency
                )}
              </div>
            </div>
            <div>
              <span className="text-gray-500">Items:</span>
              <div className="font-semibold text-gray-900">
                {order?.shopifyDetails?.line_items?.length || 0}
              </div>
            </div>
          </div>

          {/* Tracking Number */}
          {order?.tracking_number && order.tracking_number.trim() !== "" && (
            <div className="text-sm">
              <span className="text-gray-500">Tracking:</span>
              <div className="font-semibold text-blue-600">
                {order.tracking_number}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="flex gap-2">
              <AddLabelModal
                order={order}
                activeTab={activeTab}
                fetchProcessedOrders={fetchProcessedOrders}
              />
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
            {getDeliveryStatus(order?.shipStation_order_status)}
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

  // Desktop layout
  return (
    <div className="space-y-4 transition-opacity duration-300">
      {/* Main Table */}
      <div className="overflow-x-auto hide-scrollbar">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          pagination={false}
          size="middle"
          className="bg-white rounded-lg shadow-sm"
          scroll={{ x: 1400 }}
          rowClassName={(record) => {
            const warning = getOrderWarning(record);
            const classes = [];

            if (record?.shipStation_OrderId) {
              classes.push("opacity-60");
            }

            if (warning && warning.type === "cancel") {
              classes.push("line-through text-gray-500");
            }

            return classes.join(" ");
          }}
          onRow={(record) => ({
            onClick: () => onRowClick(record),
            className: "cursor-pointer hover:bg-gray-50 transition-colors",
          })}
        />
      </div>

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

export default memo(ShopifyOrderTable, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.orders === nextProps.orders &&
    prevProps.loading === nextProps.loading &&
    prevProps.currentPage === nextProps.currentPage &&
    prevProps.pageSize === nextProps.pageSize &&
    prevProps.totalOrders === nextProps.totalOrders &&
    prevProps.selectedOrders?.length === nextProps.selectedOrders?.length &&
    prevProps.selectAll === nextProps.selectAll
  );
});
