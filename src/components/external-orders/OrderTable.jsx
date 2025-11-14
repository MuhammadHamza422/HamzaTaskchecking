import React, { memo, useState } from "react";
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
  Badge,
} from "antd";
import { useMediaQuery } from "react-responsive";
import {
  CloseCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { FaCheckCircle } from "react-icons/fa";
import AddLabelModal from "./AddLabel";
import apiClient from "../../api/client";
import Swal from "sweetalert2";

function OrderTable({
  orders,
  loading,
  currentPage,
  pageSize,
  totalOrders,
  onPageChange,
  onRowClick,
  onEditClick,
  showPagination = true,
  activeTab = "woocommerce",
  showCheckboxes = false,
  selectedOrders = [],
  onOrderSelect = null,
  selectAll = false,
  onSelectAll = null,
  fetchProcessedOrders = () => {},
  onDeleteSuccess = () => {},
}) {
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const [isDeleting, setIsDeleting] = useState(false);
  const orderStatus = orders[0]?.status;

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
      const endpoint =
        activeTab === "woocommerce"
          ? "/api/v1/orders/wc/orders"
          : activeTab === "walmart"
          ? "/api/v1/orders/wm/orders"
          : "/api/v1/orders/shopify/orders";

      const { data } = await apiClient.delete(endpoint, {
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
        title: "Order",
        dataIndex: "orderId",
        key: "orderId",
        width: 90,
        render: (text) => (
          <span className="text-xs font-semibold text-gray-900">{text}</span>
        ),
      },
      {
        title: "Date ↓",
        dataIndex: "orderCreatedAt",
        key: "orderCreatedAt",
        width: 85,
        render: (orderCreatedAt, record) => formatDate(orderCreatedAt || record.createdAt),
        sorter: (a, b) => new Date(a.orderCreatedAt || a.createdAt) - new Date(b.orderCreatedAt || b.createdAt),
      },
      {
        title: "Customer",
        dataIndex: "user_name",
        key: "customerName",
        width: 110,
        render: (name) => (
          <span className="text-xs text-gray-700 truncate block" title={name}>
            {name || "—"}
          </span>
        ),
      },
      {
        title: "Actions",
        dataIndex: "actions",
        key: "actions",
        width: 180,
        fixed: "right",
        render: (_, record) => (
          <div className="flex items-center gap-0.5">
            <AddLabelModal
              order={record}
              activeTab={activeTab}
              fetchProcessedOrders={fetchProcessedOrders}
            />
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick(record);
              }}
              className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
            >
              Edit
            </Button>
            <Button
              type="link"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onRowClick(record);
              }}
              className="text-green-600 hover:text-green-800 p-0 h-auto text-xs"
            >
              View
            </Button>
          </div>
        ),
      },
    ];

    // WooCommerce specific columns
    if (activeTab === "woocommerce") {
      return [
        ...checkboxColumn,
        {
          title: "Order",
          dataIndex: "orderId",
          key: "orderId",
          width: 80,
          render: (text) => (
            <span className="text-xs font-semibold text-gray-900">{text}</span>
          ),
        },
        {
          title: "WC Status",
          dataIndex: "wc_status",
          key: "wc_status",
          width: 95,
          render: (status) => {
            const statusColors = {
              processing: "bg-blue-100 text-blue-700 border-blue-200",
              completed: "bg-green-100 text-green-700 border-green-200",
              pending: "bg-orange-100 text-orange-700 border-orange-200",
              failed: "bg-red-100 text-red-700 border-red-200",
              cancelled: "bg-red-100 text-red-700 border-red-200",
              refunded: "bg-purple-100 text-purple-700 border-purple-200",
              "on-hold": "bg-yellow-100 text-yellow-700 border-yellow-200",
            };
            const colorClass = statusColors[status] || "bg-gray-100 text-gray-600 border-gray-200";
            return (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${colorClass}`}
              >
                {status || "—"}
              </span>
            );
          },
        },
        {
          title: "FFM Status",
          dataIndex: "status",
          key: "status",
          width: 95,
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
        ...(orderStatus === "processed"
          ? [
              {
                title: "SS Status",
                dataIndex: "shipStation_order_status",
                key: "shipStation_order_status",
                width: 90,
                render: (status, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200 capitalize">
                      {status || "—"}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  ),
              },
              {
                title: "SS ID",
                dataIndex: "shipStation_OrderId",
                key: "shipStation_OrderId",
                width: 70,
                render: (id, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-xs text-gray-700 font-mono">{id}</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  ),
              },
            ]
          : []),
        {
          title: "Tracking",
          dataIndex: "tracking_number",
          key: "tracking_number",
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
        {
          title: "App ID",
          dataIndex: "app_id",
          key: "app_id",
          width: 75,
          render: (app_id) => (
            <span
              className={`text-xs truncate block ${
                app_id ? "text-green-600 font-medium" : "text-gray-400"
              }`}
              title={app_id}
            >
              {app_id || "—"}
            </span>
          ),
        },
        {
          title: "Date ↓",
          dataIndex: "orderCreatedAt",
          key: "orderCreatedAt",
          width: 75,
          render: (orderCreatedAt, record) => formatDate(orderCreatedAt || record.createdAt),
          sorter: (a, b) => new Date(a.orderCreatedAt || a.createdAt) - new Date(b.orderCreatedAt || b.createdAt),
        },
        // {
        //   title: "Customer",
        //   dataIndex: "user_name",
        //   key: "customerName",
        //   width: 100,
        //   render: (name) => (
        //     <span className="text-xs text-gray-700 truncate block" title={name}>
        //       {name || "—"}
        //     </span>
        //   ),
        // },
        {
          title: "Actions",
          dataIndex: "actions",
          key: "actions",
          width: 90,
          fixed: "right",
          render: (_, record) => (
            <div className="flex items-center gap-0.5">
              <AddLabelModal
                order={record}
                activeTab={activeTab}
                fetchProcessedOrders={fetchProcessedOrders}
              />
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick(record);
                }}
                className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
              >
                Edit
              </Button>
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowClick(record);
                }}
                className="text-green-600 hover:text-green-800 p-0 h-auto text-xs"
              >
                View
              </Button>
            </div>
          ),
        },
      ];
    }

    // Walmart specific columns
    if (activeTab === "walmart") {
      return [
        ...checkboxColumn,
        {
          title: "Order",
          dataIndex: "orderId",
          key: "orderId",
          width: 80,
          render: (text) => (
            <span className="text-xs font-semibold text-gray-900">{text}</span>
          ),
        },
        {
          title: "Cust Order ID",
          dataIndex: "customerOrderId",
          key: "customerOrderId",
          width: 100,
          render: (text) => (
            <span className="text-xs text-gray-600 font-mono truncate block" title={text}>
              {text || "—"}
            </span>
          ),
        },
        {
          title: "WM Status",
          dataIndex: "wm_status",
          key: "wm_status",
          width: 95,
          render: (status) => {
            const statusColors = {
              Acknowledged: "bg-blue-100 text-blue-700 border-blue-200",
              Shipped: "bg-green-100 text-green-700 border-green-200",
              Pending: "bg-orange-100 text-orange-700 border-orange-200",
              Cancelled: "bg-red-100 text-red-700 border-red-200",
              Delivered: "bg-green-100 text-green-700 border-green-200",
            };
            const colorClass = statusColors[status] || "bg-gray-100 text-gray-600 border-gray-200";
            return (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded border capitalize font-medium ${colorClass}`}
              >
                {status || "—"}
              </span>
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
          title: "FFM Status",
          dataIndex: "status",
          key: "status",
          width: 95,
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
        ...(orderStatus === "processed"
          ? [
              {
                title: "SS Status",
                dataIndex: "shipStation_order_status",
                key: "shipStation_order_status",
                width: 90,
                render: (status, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200 capitalize">
                      {status || "—"}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  ),
              },
              {
                title: "SS ID",
                dataIndex: "shipStation_OrderId",
                key: "shipStation_OrderId",
                width: 70,
                render: (id, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-xs text-gray-700 font-mono">{id}</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  ),
              },
            ]
          : []),
        {
          title: "Tracking",
          dataIndex: "tracking_number",
          key: "tracking_number",
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
        //   title: "App ID",
        //   dataIndex: "app_id",
        //   key: "app_id",
        //   width: 75,
        //   render: (app_id) => (
        //     <span
        //       className={`text-xs truncate block ${
        //         app_id ? "text-green-600 font-medium" : "text-gray-400"
        //       }`}
        //       title={app_id}
        //     >
        //       {app_id || "—"}
        //     </span>
        //   ),
        // },
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
          title: "Date ↓",
          dataIndex: "orderCreatedAt",
          key: "orderCreatedAt",
          width: 75,
          render: (orderCreatedAt, record) => formatDate(orderCreatedAt || record.createdAt),
          sorter: (a, b) => new Date(a.orderCreatedAt || a.createdAt) - new Date(b.orderCreatedAt || b.createdAt),
        },
        {
          title: "Actions",
          dataIndex: "actions",
          key: "actions",
          width: 170,
          fixed: "right",
          render: (_, record) => (
            <div className="flex items-center gap-0.5">
              <AddLabelModal
                order={record}
                activeTab={activeTab}
                fetchProcessedOrders={fetchProcessedOrders}
              />
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick(record);
                }}
                className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
              >
                Edit
              </Button>
              {/* <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowClick(record);
                }}
                className="text-green-600 hover:text-green-800 p-0 h-auto text-xs"
              >
                View
              </Button> */}
            </div>
          ),
        },
      ];
    }

    // Shopify specific columns
    if (activeTab === "shopify") {
      return [
        ...checkboxColumn,
        {
          title: "Order",
          dataIndex: "orderId",
          key: "orderId",
          width: 80,
          render: (text, record) => {
            const numericId = text?.replace("gid://shopify/Order/", "") || text;
            const orderKey = record?.order_key || record?.shopifyDetails?.name;
            return (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-gray-900">{numericId}</span>
                {orderKey && (
                  <span className="text-[10px] text-gray-500 font-mono">{orderKey}</span>
                )}
              </div>
            );
          },
        },
        {
          title: "SF Status",
          dataIndex: "sf_status",
          key: "sf_status",
          width: 85,
          render: (status) => (
            <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-200 capitalize">
              {status || "—"}
            </span>
          ),
        },
        {
          title: "FFM Status",
          dataIndex: "status",
          key: "status",
          width: 95,
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
        ...(orderStatus === "processed"
          ? [
              {
                title: "SS Status",
                dataIndex: "shipStation_order_status",
                key: "shipStation_order_status",
                width: 90,
                render: (status, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded border border-blue-200 capitalize">
                      {status || "—"}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  ),
              },
              {
                title: "SS ID",
                dataIndex: "shipStation_OrderId",
                key: "shipStation_OrderId",
                width: 70,
                render: (id, record) =>
                  record?.shipStation_OrderId ? (
                    <span className="text-xs text-gray-700 font-mono">{id}</span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  ),
              },
            ]
          : []),
        {
          title: "Tracking",
          dataIndex: "tracking_number",
          key: "tracking_number",
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
        {
          title: "App ID",
          dataIndex: "app_id",
          key: "app_id",
          width: 75,
          render: (app_id) => (
            <span
              className={`text-xs truncate block ${
                app_id ? "text-green-600 font-medium" : "text-gray-400"
              }`}
              title={app_id}
            >
              {app_id || "—"}
            </span>
          ),
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
          title: "Date ↓",
          dataIndex: "orderCreatedAt",
          key: "orderCreatedAt",
          width: 75,
          render: (orderCreatedAt, record) => formatDate(orderCreatedAt || record.createdAt),
          sorter: (a, b) => new Date(a.orderCreatedAt || a.createdAt) - new Date(b.orderCreatedAt || b.createdAt),
        },
        {
          title: "Actions",
          dataIndex: "actions",
          key: "actions",
          width: 90,
          fixed: "right",
          render: (_, record) => (
            <div className="flex items-center gap-0.5">
              <AddLabelModal
                order={record}
                activeTab={activeTab}
                fetchProcessedOrders={fetchProcessedOrders}
              />
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick(record);
                }}
                className="text-blue-600 hover:text-blue-800 p-0 h-auto text-xs"
              >
                Edit
              </Button>
              <Button
                type="link"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onRowClick(record);
                }}
                className="text-green-600 hover:text-green-800 p-0 h-auto text-xs"
              >
                View
              </Button>
            </div>
          ),
        },
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
              {formatDate(order?.orderCreatedAt || order?.createdAt)}
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
          className="bg-white rounded-lg shadow-sm [&_.ant-table-thead>tr>th]:bg-gray-50 [&_.ant-table-thead>tr>th]:text-xs [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:text-gray-700 [&_.ant-table-thead>tr>th]:py-2 [&_.ant-table-thead>tr>th]:px-2 [&_.ant-table-tbody>tr>td]:py-2 [&_.ant-table-tbody>tr>td]:px-2 [&_.ant-table-tbody>tr>td]:text-xs"
          scroll={{ x: "max-content" }}
          rowClassName={(record) => {
            const classes = ["hover:bg-blue-50/50 transition-colors"];
            if (record?.shipStation_OrderId) {
              classes.push("opacity-60 bg-gray-50/50");
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

export default memo(OrderTable, (prevProps, nextProps) => {
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
