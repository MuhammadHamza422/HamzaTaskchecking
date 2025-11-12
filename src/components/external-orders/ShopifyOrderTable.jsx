import React, { memo, useState } from "react";
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
  DeleteOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { FaCheckCircle } from "react-icons/fa";
import AddLabelModal from "./AddLabel";
import apiClient from "../../api/client";
import Swal from "sweetalert2";

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
  onDeleteSuccess = () => {},
}) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [isDeleting, setIsDeleting] = useState(false);

  console.log("Orders:", orders);

  // Helper function to check if label info is complete
  const hasLabelInfo = (record) => {
    return !!(
      record?.warehouseId &&
      record?.packageCode &&
      record?.weight?.value &&
      record?.dimensions?.length &&
      record?.dimensions?.width &&
      record?.dimensions?.height
    );
  };

  // Helper function to format date (compact)
  const formatDate = (createdAt) => {
    if (!createdAt) {
      return <span className="text-xs text-gray-400">—</span>;
    }
    const date = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return (
        <div className="text-xs leading-tight">
          <div className="text-gray-900 font-medium">Today</div>
          <div className="text-gray-500 text-[10px]">
            {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      );
    } else if (diffDays === 2) {
      return (
        <div className="text-xs leading-tight">
          <div className="text-gray-900 font-medium">Yesterday</div>
          <div className="text-gray-500 text-[10px]">
            {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      );
    } else {
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
      return (
        <div className="text-xs leading-tight">
          <div className="text-gray-900 font-medium">{dayName}</div>
          <div className="text-gray-500 text-[10px]">
            {date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      );
    }
  };

  // Helper function to format currency (compact)
  const formatCurrency = (amount, currency = "USD") => {
    if (!amount) return <span className="text-xs text-gray-400">—</span>;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount));
    return <span className="text-xs font-semibold text-gray-900">{formatted}</span>;
  };

  // Get payment status dot (compact)
  const getPaymentStatusDot = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>;
      case "processed":
        return <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>;
      case "unprocessed":
        return <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>;
      case "refunded":
        return <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>;
      default:
        return <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>;
    }
  };

  // Get fulfillment status (compact)
  const getFulfillmentStatus = (status) => {
    if (!status || status === null) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-200 font-medium">
          Unfulfilled
        </span>
      );
    }

    switch (status?.toLowerCase()) {
      case "fulfilled":
        return (
          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded border border-green-200 font-medium">
            Fulfilled
          </span>
        );
      default:
        return (
          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-200 font-medium">
            Unfulfilled
          </span>
        );
    }
  };

  // Get delivery status (compact)
  const getDeliveryStatus = (status) => {
    if (!status) {
      return <span className="text-xs text-gray-400">—</span>;
    }

    const statusConfig = {
      awaiting_shipment: { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-200", label: "Awaiting" },
      in_transit: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", label: "In Transit" },
      delivered: { bg: "bg-green-100", text: "text-green-700", border: "border-green-200", label: "Delivered" },
    };

    const config = statusConfig[status?.toLowerCase()] || { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", label: status };

    return (
      <span className={`text-[10px] px-1.5 py-0.5 ${config.bg} ${config.text} rounded border ${config.border} font-medium capitalize`}>
        {config.label}
      </span>
    );
  };

  // Get delivery method (compact)
  const getDeliveryMethod = (method) => {
    if (!method) return <span className="text-xs text-gray-400">—</span>;
    return <span className="text-xs text-gray-600 truncate block" title={method}>{method}</span>;
  };

  // Get cancel reason badge (compact)
  const getCancelReasonBadge = (cancelReason) => {
    if (!cancelReason || cancelReason === "null") return null;

    const reasonConfig = {
      customer: { color: "bg-blue-100 text-blue-800 border-blue-200", text: "Customer" },
      inventory: { color: "bg-orange-100 text-orange-800 border-orange-200", text: "Inventory" },
      fraud: { color: "bg-red-100 text-red-800 border-red-200", text: "Fraud" },
      staff: { color: "bg-purple-100 text-purple-800 border-purple-200", text: "Staff" },
      cancel: { color: "bg-gray-100 text-gray-800 border-gray-200", text: "Cancelled" },
    };

    const config = reasonConfig[cancelReason] || {
      color: "bg-gray-100 text-gray-800 border-gray-200",
      text: cancelReason,
    };

    return (
      <span
        className={`inline-flex items-center px-1 py-0.5 rounded border text-[10px] font-medium ${config.color}`}
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

  // Get tags (compact)
  const getTags = (tags) => {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return <span className="text-xs text-gray-400">—</span>;
    }

    return (
      <div className="flex flex-wrap gap-0.5">
        {tags.slice(0, 2).map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-700 border border-gray-200"
          >
            {tag}
          </span>
        ))}
        {tags.length > 2 && (
          <span className="text-[10px] text-gray-500">+{tags.length - 2}</span>
        )}
      </div>
    );
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "No Orders Selected",
        text: "Please select at least one order to delete.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#f59e0b",
        color: "#fff",
        customClass: { popup: "rounded-lg" },
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete Orders?",
      text: `Are you sure you want to delete ${selectedOrders.length} order(s)? This action cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    setIsDeleting(true);
    try {
      const { data } = await apiClient.delete("/api/v1/orders/shopify/orders", {
        data: { orderIds: selectedOrders },
      });

      if (data?.success) {
        Swal.fire({
          icon: "success",
          title: "Orders Deleted",
          text: `Successfully deleted ${data.deletedCount || selectedOrders.length} order(s)`,
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: { popup: "rounded-lg" },
        });

        if (onDeleteSuccess) onDeleteSuccess();
        if (fetchProcessedOrders) fetchProcessedOrders();
      }
    } catch (error) {
      console.error("Delete error:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error?.response?.data?.message ||
          error?.message ||
          "Failed to delete orders",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: { popup: "rounded-lg" },
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Checkbox column (compact)
  const checkboxColumn = showCheckboxes
    ? [
        {
          title: (
            <Checkbox
              checked={selectAll}
              onChange={(e) => onSelectAll && onSelectAll(e.target.checked)}
              disabled={!orders || orders.length === 0}
              className="[&_.ant-checkbox-inner]:w-3 [&_.ant-checkbox-inner]:h-3"
            />
          ),
          dataIndex: "checkbox",
          key: "checkbox",
          width: 40,
          render: (_, record) => {
            const isDisabled = !!record?.shipStation_OrderId;
            return (
              <div className="flex items-center justify-center">
                {isDisabled ? (
                  <FaCheckCircle className="text-green-500 text-xs" />
                ) : (
                  <Checkbox
                    checked={selectedOrders.includes(record?._id)}
                    disabled={isDisabled}
                    onChange={(e) =>
                      onOrderSelect &&
                      onOrderSelect(record?._id, e.target.checked)
                    }
                    onClick={(e) => e.stopPropagation()}
                    className="[&_.ant-checkbox-inner]:w-3 [&_.ant-checkbox-inner]:h-3"
                  />
                )}
              </div>
            );
          },
        },
      ]
    : [];

  // Main columns matching Shopify admin design (compact & advanced)
  const columns = [
    ...checkboxColumn,
    {
      title: "Order",
      dataIndex: "order_key",
      key: "order_key",
      width: 85,
      render: (orderkey, record) => {
        const numericId = record?.orderId?.replace("gid://shopify/Order/", "") || orderkey;
        const orderName = record?.shopifyDetails?.name || orderkey;
        const warning = getOrderWarning(record);
        const cancelReason = record?.shopifyDetails?.cancel_reason;

        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              {warning && (
                <Tooltip title={warning.tooltip} placement="top">
                  <span className="text-[10px]">{warning.icon}</span>
                </Tooltip>
              )}
              <span className="text-xs font-semibold text-gray-900">
                {orderName || numericId || "—"}
              </span>
            </div>
            {cancelReason && getCancelReasonBadge(cancelReason)}
          </div>
        );
      },
    },
    {
      title: "Date ↓",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 75,
      render: formatDate,
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: "Customer",
      dataIndex: "user_name",
      key: "customerName",
      width: 100,
      render: (name) => (
        <span className="text-xs text-gray-700 truncate block" title={name}>
          {name || "—"}
        </span>
      ),
    },
    {
      title: "FFM Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status) => (
        <span
          className={`text-[10px] text-white px-2 py-0.5 rounded-full font-medium ${
            status === "processed"
              ? "bg-green-600"
              : status === "partially processed"
              ? "bg-yellow-500"
              : "bg-red-500"
          } capitalize`}
        >
          {status || "—"}
        </span>
      ),
    },
    {
      title: "SF Status",
      dataIndex: "sf_status",
      key: "sf_status",
      width: 80,
      render: (sfstatus) => (
        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200 capitalize">
          {sfstatus || "—"}
        </span>
      ),
    },
    // {
    //   title: "Channel",
    //   dataIndex: "shopifyDetails",
    //   key: "channel",
    //   width: 90,
    //   render: (shopifyDetails) => {
    //     const source = shopifyDetails?.source_name === "web"
    //       ? "Online"
    //       : shopifyDetails?.source_name || "Online";
    //     return (
    //       <span className="text-xs text-gray-600 truncate block" title={source}>
    //         {source}
    //       </span>
    //     );
    //   },
    // },
    {
      title: "Total",
      dataIndex: "shopifyDetails",
      key: "total",
      width: 70,
      render: (shopifyDetails) =>
        formatCurrency(shopifyDetails?.total_price, shopifyDetails?.currency),
    },
    {
      title: "Payment",
      dataIndex: "shopifyDetails",
      key: "paymentStatus",
      width: 75,
      render: (shopifyDetails) => {
        const status = shopifyDetails?.financial_status;
        const isPaid = status === "paid";
        return (
          <div className="flex items-center gap-1">
            {getPaymentStatusDot(status)}
            <span
              className={`text-[10px] capitalize font-medium ${
                isPaid ? "text-green-700" : "text-red-600"
              }`}
            >
              {status || "—"}
            </span>
          </div>
        );
      },
    },
    {
      title: "Fulfillment",
      dataIndex: "shopifyDetails",
      key: "fulfillmentStatus",
      width: 85,
      render: (shopifyDetails) =>
        getFulfillmentStatus(shopifyDetails?.fulfillment_status),
    },
    {
      title: "Items",
      dataIndex: "shopifyDetails",
      key: "items",
      width: 50,
      render: (shopifyDetails) => {
        const count = shopifyDetails?.line_items?.length || 0;
        return (
          <div className="text-center">
            <div className="text-xs font-bold text-gray-900">{count}</div>
          </div>
        );
      },
    },
    {
      title: "Delivery",
      dataIndex: "shipStation_order_status",
      key: "deliveryStatus",
      width: 85,
      render: getDeliveryStatus,
    },
    {
      title: "Label Status",
      dataIndex: "labelStatus",
      key: "labelStatus",
      width: 90,
      render: (_, record) => {
        const hasInfo = hasLabelInfo(record);
        return (
          <div className="flex items-center justify-center">
            {hasInfo ? (
              <Tooltip title="Label info added">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-200">
                  <CheckCircleOutlined className="text-[10px]" />
                  <span className="text-[10px] font-medium">Added</span>
                </span>
              </Tooltip>
            ) : (
              <Tooltip title="Label info missing">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-orange-700 rounded border border-orange-200">
                  <InfoCircleOutlined className="text-[10px]" />
                  <span className="text-[10px] font-medium">Pending</span>
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "Method",
      dataIndex: "shopifyDetails",
      key: "deliveryMethod",
      width: 80,
      render: (shopifyDetails) =>
        getDeliveryMethod(shopifyDetails?.shipping_lines?.[0]?.title),
    },
    {
      title: "Tracking",
      dataIndex: "tracking_number",
      key: "trackingNumber",
      width: 100,
      render: (trackingNumber) => {
        if (!trackingNumber || trackingNumber.trim() === "") {
          return <span className="text-xs text-gray-400">—</span>;
        }
        return (
          <span className="text-xs text-blue-600 font-medium truncate block" title={trackingNumber}>
            {trackingNumber}
          </span>
        );
      },
    },
    // {
    //   title: "Tags",
    //   dataIndex: "shopifyDetails",
    //   key: "tags",
    //   width: 120,
    //   render: (shopifyDetails) =>
    //     getTags(
    //       shopifyDetails?.tags
    //         ? shopifyDetails.tags
    //             .split(",")
    //             .map((tag) => tag.trim())
    //             .filter(Boolean)
    //         : []
    //     ),
    // },
  
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <div className="flex items-center gap-0.5">
          <AddLabelModal
            order={record}
            activeTab={activeTab}
            fetchProcessedOrders={fetchProcessedOrders}
          />
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
      {/* Bulk Actions Bar - Compact */}
      {showCheckboxes && selectedOrders.length > 0 && (
        <div className="mb-2 p-2 bg-red-50 rounded-md border border-red-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-red-800">
              {selectedOrders.length} selected
            </span>
            <Button
              size="small"
              icon={<DeleteOutlined className="text-xs" />}
              loading={isDeleting}
              disabled={isDeleting}
              onClick={handleBulkDelete}
              className="!bg-red-600 hover:!bg-red-700 !border-red-600 text-white text-xs h-6 px-3 font-medium shadow-sm"
              style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto hide-scrollbar">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="_id"
          pagination={false}
          size="small"
          className="bg-white rounded-lg shadow-sm [&_.ant-table-thead>tr>th]:bg-gray-50 [&_.ant-table-thead>tr>th]:text-xs [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:text-gray-700 [&_.ant-table-thead>tr>th]:py-2 [&_.ant-table-thead>tr>th]:px-2 [&_.ant-table-tbody>tr>td]:py-2 [&_.ant-table-tbody>tr>td]:px-2 [&_.ant-table-tbody>tr>td]:text-xs [&_.ant-table]:border-collapse"
          scroll={{ x: "max-content" }}
          rowClassName={(record) => {
            const warning = getOrderWarning(record);
            const classes = ["hover:bg-blue-50/50 transition-colors border-b border-gray-100"];

            if (record?.shipStation_OrderId) {
              classes.push("opacity-60 bg-gray-50/50");
            }

            if (warning && warning.type === "cancel") {
              classes.push("line-through text-gray-500");
            }

            return classes.join(" ");
          }}
          onRow={(record) => ({
            onClick: () => onRowClick(record),
            className: "cursor-pointer",
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
