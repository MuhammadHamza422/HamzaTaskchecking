import React, { useState, useEffect } from "react";
import { Typography, notification } from "antd";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../../api/client";
import { Loader2 } from "lucide-react";

import OrderFilters from "../../components/external-orders/OrderFilters";
import OrderTable from "../../components/external-orders/OrderTable";
import ShopifyOrderTable from "../../components/external-orders/ShopifyOrderTable";
import OrderDetailsDrawer from "../../components/external-orders/OrderDetailsDrawer";
import OrderEditModal from "../../components/external-orders/OrderEditModal";
import PlatformTabs, {
  PLATFORM_CONFIG,
} from "../../components/external-orders/PlatformTabs";
import Swal from "sweetalert2";
import { getPlatformConfig } from "../../config/platforms";

const { Text, Title } = Typography;

const showRefreshSuccessToast = () => {
  Swal.fire({
    icon: "success",
    title: "Orders Refreshed",
    text: "Latest orders have been fetched successfully.",
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: "#10b981",
    color: "#fff",
    customClass: {
      popup: "rounded-lg",
    },
  });
};

const showErrorToast = (message) => {
  Swal.fire({
    icon: "error",
    title: "Failed to refresh orders",
    text: message,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    background: "#ef4444",
    color: "#fff",
    customClass: {
      popup: "rounded-lg",
    },
  });
};

// in that orders i added api for shopify orders so we can fetch shopify orders from api

export default function ExternalOrdersPage() {
  // Get initial active tab from localStorage or default to woocommerce
  const getInitialActiveTab = () => {
    const savedTab = localStorage.getItem("externalOrdersActiveTab");
    return savedTab && PLATFORM_CONFIG[savedTab] ? savedTab : "woocommerce";
  };

  // Get query client for cache invalidation
  const queryClient = useQueryClient();

  // State management
  const [activeTab, setActiveTab] = useState(getInitialActiveTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [updateOrderStatusLoading, setUpdateOrderStatusLoading] =
    useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    dateRange: null,
    wc_status: null,
    wm_status: null,
    status: null,
  });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("externalOrdersActiveTab", activeTab);
  }, [activeTab]);

  // Fetch orders from API based on the active tab and filters
  const fetchOrders = async ({ queryKey }) => {
    const [_, tab, page, limit, search, dateRange, wcStatus, wmStatus, status] =
      queryKey;
    const config = getPlatformConfig(tab);

    if (tab === "woocommerce") {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      // Add all filters to API
      if (search) {
        params.append("search", search);
      }
      if (wcStatus) {
        params.append("wc_status", wcStatus);
      }
      if (status) {
        params.append("status", status);
      }
      if (dateRange && dateRange.length === 2) {
        params.append("start_date", dateRange[0].format("YYYY-MM-DD"));
        params.append("end_date", dateRange[1].format("YYYY-MM-DD"));
      }
      const response = await apiClient.get(`${config.api}?${params}`);
      return response.data;
    } else if (tab === "walmart") {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      // Add all filters to API for Walmart
      if (search) {
        params.append("search", search);
      }
      if (wmStatus) {
        params.append("wm_status", wmStatus); // Use wm_status for Walmart
      }
      if (status) {
        params.append("status", status);
      }
      if (dateRange && dateRange.length === 2) {
        params.append("start_date", dateRange[0].format("YYYY-MM-DD"));
        params.append("end_date", dateRange[1].format("YYYY-MM-DD"));
      }
      const response = await apiClient.get(`${config.api}?${params}`);
      return response.data;
    } else if (tab === "shopify") {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      // Add all filters to API for Shopify
      if (search) {
        params.append("search", search);
      }
      if (wcStatus) {
        params.append("wc_status", wcStatus); // Use wc_status for Shopify
      }
      if (status) {
        params.append("status", status);
      }
      if (dateRange && dateRange.length === 2) {
        params.append("start_date", dateRange[0].format("YYYY-MM-DD"));
        params.append("end_date", dateRange[1].format("YYYY-MM-DD"));
      }
      const response = await apiClient.get(`${config.api}?${params}`);
      return response.data;
    } else {
      return {
        success: true,
        totalOrders: 0,
        page: page,
        perPage: limit,
        orders: [],
        message: `${config.label} orders will be available soon`,
      };
    }
  };

  // Fetch latest orders (refresh functionality) from API
  const fetchLatestOrders = async () => {
    const config = getPlatformConfig(activeTab);

    try {
      setIsRefreshing(true);
      const response = await apiClient.get(config.refreshApi);
      showRefreshSuccessToast();
      refetch();
    } catch (error) {
      console.error("Error fetching latest orders:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to refresh orders"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update WC Order Status - Received from Shipstation

  const handleUpdateOrderStatus = async () => {
    setUpdateOrderStatusLoading(true);
    try {
      const { data } = await apiClient.patch(
        "/api/v1/shipstation/update/wc/status"
      );
      if (data) {
        Swal.fire({
          icon: "success",
          title: "Order Status Updated",
          text: "Order status updated successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });
        refetch();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to update order status"
      );
    } finally {
      setUpdateOrderStatusLoading(false);
    }
  };

  // Update WM Order Status - Received from Shipstation
  const handleWMUpdateOrderStatus = async () => {
    setUpdateOrderStatusLoading(true);
    try {
      const { data } = await apiClient.patch(
        "/api/v1/shipstation/update/wm/status"
      );
      if (data) {
        Swal.fire({
          icon: "success",
          title: "Order Status Updated",
          text: "Order status updated successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });
        refetch();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to update order status"
      );
    } finally {
      setUpdateOrderStatusLoading(false);
    }
  };

  // Update Shopify Order Status - Received from Shipstation
  const handleShopifyUpdateOrderStatus = async () => {
    setUpdateOrderStatusLoading(true);
    try {
      const { data } = await apiClient.patch(
        "/api/v1/shipstation/update/sf/status"
      );
      if (data) {
        Swal.fire({
          icon: "success",
          title: "Order Status Updated",
          text: "Order status updated successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });
        refetch();
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      showErrorToast(
        error.response?.data?.message || "Failed to update order status"
      );
    } finally {
      setUpdateOrderStatusLoading(false);
    }
  };

  // Fetch order details
  const fetchOrderDetails = async (orderId) => {
    if (!orderId) return null;
    const config = getPlatformConfig(activeTab);

    // Handle different API parameter formats for different platforms
    if (activeTab === "shopify") {
      // Shopify uses query parameter: /api/v1/orders/shopify/order?orderId=gid://shopify/Order/6163651690800
      const response = await apiClient.get(
        `${config.detailsApi}?orderId=${orderId}`
      );
      return response.data;
    } else {
      // WooCommerce and Walmart use path parameter: /api/v1/orders/wc/order/{orderId}
      const response = await apiClient.get(`${config.detailsApi}/${orderId}`);
      return response.data;
    }
  };

  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "externalOrders",
      activeTab,
      currentPage,
      pageSize,
      filters.search,
      filters.dateRange,
      filters.wc_status,
      filters.wm_status,
      filters.status,
    ],
    queryFn: fetchOrders,
    keepPreviousData: true,
    refetchInterval: getPlatformConfig(activeTab).refetchInterval,
    refetchIntervalInBackground: true,
    staleTime: getPlatformConfig(activeTab).staleTime,
  });

  // Order details query
  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
    error: orderDetailsError,
    refetch: refetchOrderDetails,
  } = useQuery({
    queryKey: ["orderDetails", selectedOrder?.orderId],
    queryFn: () => fetchOrderDetails(selectedOrder?.orderId),
    enabled: !!selectedOrder?.orderId && open,
  });

  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  // Handle pagination change
  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  // Handle drawer open
  const handleDrawerOpen = (order) => {
    setSelectedOrder(order);
    setOpen(true);
  };

  // Handle drawer close
  const handleDrawerClose = () => {
    setOpen(false);
    setSelectedOrder(null);
  };

  // Handle edit modal open
  const handleEditClick = (order) => {
    setEditingOrder(order);
    setEditModalVisible(true);
  };

  // Handle edit modal close
  const handleEditModalClose = () => {
    setEditModalVisible(false);
    setEditingOrder(null);
  };

  // Handle edit success
  const handleEditSuccess = () => {
    refetch();

    // Invalidate processed orders cache to ensure it updates immediately
    queryClient.invalidateQueries({
      queryKey: ["processedOrders"],
    });
  };

  // Handle product mapping success
  const handleProductMappingSuccess = (newMappedId) => {
    // Refetch both orders and order details
    refetch();
    refetchOrderDetails();

    // Update the selectedOrder state with the new kit_products immediately
    if (selectedOrder && newMappedId) {
      setSelectedOrder((prevOrder) => {
        if (!prevOrder) return prevOrder;
        const kit_products = prevOrder.kit_products || [];
        if (!kit_products.includes(newMappedId.toString())) {
          return {
            ...prevOrder,
            kit_products: [...kit_products, newMappedId.toString()],
          };
        }
        return prevOrder;
      });
    }

    // Invalidate processed orders cache to ensure it updates immediately
    queryClient.invalidateQueries({
      queryKey: ["processedOrders"],
    });
  };

  // Handle filters change
  const handleFiltersChange = (newFilters, resetPagination = false) => {
    setFilters(newFilters);
    if (resetPagination) {
      setCurrentPage(1);
    }
  };

  // Handle filters reset
  const handleFiltersReset = () => {
    setFilters({
      search: "",
      dateRange: null,
      wc_status: null,
      wm_status: null,
      status: null,
    });
    setCurrentPage(1);
  };

  const getFilteredOrders = () => {
    if (!ordersData?.orders) return [];

    let filteredOrders = [...ordersData.orders];

    // Filter by search (order ID)
    // if (filters.search) {
    //   filteredOrders = filteredOrders.filter((order) => {
    //     let orderIdToSearch = order.orderId?.toString() || "";

    //     // For Shopify, also search in the numeric part of the GID
    //     if (activeTab === "shopify") {
    //       const numericId = orderIdToSearch.replace('gid://shopify/Order/', '');
    //       return orderIdToSearch.toLowerCase().includes(filters.search.toLowerCase()) ||
    //              numericId.toLowerCase().includes(filters.search.toLowerCase());
    //     }

    //     return orderIdToSearch.toLowerCase().includes(filters.search.toLowerCase());
    //   });
    // }

    // Filter by date range
    if (filters.dateRange && filters.dateRange.length === 2) {
      const startDate = new Date(filters.dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.dateRange[1]);
      endDate.setHours(23, 59, 59, 999);

      filteredOrders = filteredOrders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    return filteredOrders;
  };

  const filteredOrders = getFilteredOrders();
  const totalFilteredOrders = filteredOrders.length;

  // Error handling
  useEffect(() => {
    if (error) {
      notification.error({
        message: "Failed to load orders",
        description: error.message,
      });
    }
  }, [error]);

  useEffect(() => {
    if (orderDetailsError) {
      notification.error({
        message: "Failed to load order details",
        description: orderDetailsError.message,
      });
    }
  }, [orderDetailsError]);

  const renderTabContent = () => {
    return (
      <div className="mt-2 md:mt-6">
        {/* Order Table */}
        {activeTab === "shopify" ? (
          <ShopifyOrderTable
            orders={filteredOrders}
            loading={isLoading}
            currentPage={currentPage}
            pageSize={pageSize}
            totalOrders={ordersData?.totalOrders || totalFilteredOrders}
            onPageChange={handlePageChange}
            onRowClick={handleDrawerOpen}
            showPagination={true}
            onEditClick={handleEditClick}
          />
        ) : (
          <OrderTable
            orders={filteredOrders}
            loading={isLoading}
            currentPage={currentPage}
            pageSize={pageSize}
            totalOrders={ordersData?.totalOrders || totalFilteredOrders}
            onPageChange={handlePageChange}
            onRowClick={handleDrawerOpen}
            showPagination={true}
            onEditClick={handleEditClick}
            activeTab={activeTab}
          />
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-50 min-h-screen"
    >
      <div className="max-w-[1550px] mx-auto relative">
        {/* overlay */}
        {isRefreshing && (
          <div className="absolute inset-0 bg-white bg-opacity-50 z-50 pointer-events-auto cursor-not-allowed" />
        )}
        {/* Header */}
        <div className="mb-8">
          <div className="flex sm:flex-row flex-col justify-between items-start max-md:gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-black mb-2">
                Pending Orders
              </h1>
              <p className="text-gray-600">
                Manage pending orders from different e-commerce platforms
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchLatestOrders}
                disabled={isLoading || isRefreshing}
                className="sm:w-auto w-full flex  min-w-fit text-[14px] sm:text-[15px] items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                <svg
                  className={`w-4 h-4 ${
                    isLoading || isRefreshing ? "animate-spin" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {isLoading || isRefreshing ? "Refreshing..." : "Refresh Orders"}
              </button>
              {/* <button
                onClick={
                  activeTab === "woocommerce"
                    ? handleUpdateOrderStatus
                    : activeTab === "walmart"
                    ? handleWMUpdateOrderStatus
                    : activeTab === "shopify"
                    ? handleShopifyUpdateOrderStatus
                    : ""
                }
                disabled={updateOrderStatusLoading}
                className="sm:w-auto w-full flex items-center justify-center min-w-fit text-[14px] sm:text-[15px] gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                {updateOrderStatusLoading && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {updateOrderStatusLoading ? "Updating..." : "Update Status"}
              </button> */}
            </div>
          </div>
        </div>

        {/* Platform Tabs */}
        <div>
          <PlatformTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
          ></PlatformTabs>
        </div>

        <div className=" mt-5">
          {/* Filters */}
          <OrderFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleFiltersReset}
            activeTab={activeTab}
          />
          {/* Table */}
          {renderTabContent()}
        </div>

        {/* Order Details Drawer */}
        <OrderDetailsDrawer
          open={open}
          onClose={handleDrawerClose}
          selectedOrder={selectedOrder}
          orderDetails={orderDetails}
          orderDetailsLoading={orderDetailsLoading}
          activeTab={activeTab}
          tabConfig={getPlatformConfig(activeTab)}
          refetch={refetch}
          refetchOrderDetails={refetchOrderDetails}
          onProductMappingSuccess={handleProductMappingSuccess}
        />

        {/* Order Edit Modal */}
        <OrderEditModal
          visible={editModalVisible}
          onCancel={handleEditModalClose}
          order={editingOrder}
          activeTab={activeTab}
          onSuccess={handleEditSuccess}
        />
      </div>
    </motion.div>
  );
}
