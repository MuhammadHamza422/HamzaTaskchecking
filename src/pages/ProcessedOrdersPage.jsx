// src/pages/ProcessedOrdersPage.jsx
import React, { useState, useEffect } from "react";
import { Typography, notification, Button, message } from "antd";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "../api/client";

// Import components
import OrderFilters from "../components/external-orders/OrderFilters";
import OrderTable from "../components/external-orders/OrderTable";
import ProcessedOrderDetailsDrawer from "../components/external-orders/ProcessedOrderDetailsDrawer";
import OrderEditModal from "../components/external-orders/OrderEditModal";
import PlatformTabs, {
  PLATFORM_CONFIG,
} from "../components/external-orders/PlatformTabs";
import Swal from "sweetalert2";
import { getPlatformConfig } from "../config/platforms";

const { Text, Title } = Typography;

const showRefreshSuccessToast = () => {
  Swal.fire({
    icon: "success",
    title: "Orders Refreshed",
    text: "Latest processed orders have been fetched successfully.",
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

export default function ProcessedOrdersPage() {
  // Get initial active tab from localStorage or default to woocommerce
  const getInitialActiveTab = () => {
    const savedTab = localStorage.getItem("processedOrdersActiveTab");
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
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    dateRange: null,
    wc_status: null,
    status: "processed", // Always filter for processed orders
  });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("processedOrdersActiveTab", activeTab);
  }, [activeTab]);

  // Auto-refetch processed orders when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refetch processed orders
        refetch();
      }
    };

    const handleFocus = () => {
      // Window gained focus, refetch processed orders
      refetch();
    };

    // Listen for visibility change
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Listen for window focus
    window.addEventListener("focus", handleFocus);

    // Also refetch when component mounts
    refetch();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [activeTab]); // Re-run when activeTab changes

  const fetchProcessedOrders = async ({ queryKey }) => {
    const [_, tab, page, limit, search, dateRange, wcStatus] = queryKey;
    const config = getPlatformConfig(tab);

    if (tab === "woocommerce") {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
        status: "processed", // Always fetch processed orders
      });

      // Add all filters to API
      if (search) {
        params.append("search", search);
      }
      if (wcStatus) {
        params.append("wc_status", wcStatus);
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
        status: "processed", // Always fetch processed orders
      });

      // Add all filters to API for Walmart
      if (search) {
        params.append("search", search);
      }
      if (wcStatus) {
        params.append("wm_status", wcStatus); // Use wm_status for Walmart
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
        message: `${config.label} processed orders will be available soon`,
      };
    }
  };

  // Fetch latest orders (refresh functionality)
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

  // Fetch order details
  const fetchOrderDetails = async (orderId) => {
    if (!orderId) return null;
    const config = getPlatformConfig(activeTab);
    const response = await apiClient.get(`${config.detailsApi}/${orderId}`);
    return response.data;
  };

  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "processedOrders",
      activeTab,
      currentPage,
      pageSize,
      filters.search,
      filters.dateRange,
      filters.wc_status,
    ],
    queryFn: fetchProcessedOrders,
    keepPreviousData: true,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
    staleTime: 10 * 1000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Order details query
  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
    error: orderDetailsError,
    refetch: refetchOrderDetails,
  } = useQuery({
    queryKey: ["processedOrderDetails", selectedOrder?.orderId],
    queryFn: () => fetchOrderDetails(selectedOrder?.orderId),
    enabled: !!selectedOrder?.orderId && open,
  });

  // Handle tab change
  const handleTabChange = (key) => {
    setActiveTab(key);
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  };

  // Handle pagination change
  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
    setSelectedOrders([]);
    setSelectAll(false);
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
  };

  // Handle bulk selection
  const handleSelectAll = (checked) => {
    setSelectAll(checked);
    if (checked) {
      const allOrderIds = filteredOrders.map((order) => order._id);
      setSelectedOrders(allOrderIds);
    } else {
      setSelectedOrders([]);
    }
  };

  // Handle individual order selection
  const handleOrderSelect = (orderId, checked) => {
    if (checked) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  // Handle filters change
  const handleFiltersChange = (newFilters, resetPagination = false) => {
    setFilters(newFilters);
    if (resetPagination) {
      setCurrentPage(1);
    }
    setSelectedOrders([]);
    setSelectAll(false);
  };

  // Handle filters reset
  const handleFiltersReset = () => {
    setFilters({
      search: "",
      dateRange: null,
      wc_status: null,
      status: "processed",
    });
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  };

  const getFilteredOrders = () => {
    if (!ordersData?.orders) return [];

    let filteredOrders = [...ordersData.orders];

    // Filter by search (order ID)
    if (filters.search) {
      filteredOrders = filteredOrders.filter((order) =>
        order.orderId
          ?.toString()
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      );
    }

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

  // Update select all state when orders change
  useEffect(() => {
    if (
      filteredOrders.length > 0 &&
      selectedOrders.length === filteredOrders.length
    ) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedOrders, filteredOrders]);

  // Error handling
  useEffect(() => {
    if (error) {
      notification.error({
        message: "Failed to load processed orders",
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
        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-800">
                  {selectedOrders.length} order(s) selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="small"
                  className="bg-green-600 hover:bg-green-700 border-green-600 text-white"
                >
                  Move to shipStation
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Order Table */}
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
          showCheckboxes={true}
          selectedOrders={selectedOrders}
          onOrderSelect={handleOrderSelect}
          selectAll={selectAll}
          onSelectAll={handleSelectAll}
        />
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
                Processed Orders
              </h1>
              <p className="text-gray-600">
                View and manage processed orders from different e-commerce
                platforms
              </p>
            </div>
            <button
              onClick={fetchLatestOrders}
              disabled={isLoading || isRefreshing}
              className="sm:w-auto w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
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
          </div>
        </div>
        {/* Filters */}
        <OrderFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleFiltersReset}
        />

        {/* Platform Tabs */}
        <div>
          <PlatformTabs activeTab={activeTab} onTabChange={handleTabChange}>
            {renderTabContent()}
          </PlatformTabs>
        </div>

        {/* Order Details Drawer */}
        <ProcessedOrderDetailsDrawer
          open={open}
          onClose={handleDrawerClose}
          selectedOrder={selectedOrder}
          orderDetails={orderDetails}
          orderDetailsLoading={orderDetailsLoading}
          activeTab={activeTab}
          tabConfig={getPlatformConfig(activeTab)}
          refetch={refetch}
          refetchOrderDetails={refetchOrderDetails}
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
