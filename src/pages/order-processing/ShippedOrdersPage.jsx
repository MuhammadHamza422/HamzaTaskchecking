import React, { useState, useEffect, useMemo, useCallback } from "react";
import { notification } from "antd";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

import Swal from "sweetalert2";
import { getPlatformConfig } from "../../config/platforms";
import apiClient from "../../api/client";
import OrderFilters from "../../components/external-orders/OrderFilters";
import OrderTable from "../../components/external-orders/OrderTable";
import ShopifyOrderTable from "../../components/external-orders/ShopifyOrderTable";
import ProcessedOrderDetailsDrawer from "../../components/external-orders/ProcessedOrderDetailsDrawer";
import OrderEditModal from "../../components/external-orders/OrderEditModal";
import PlatformTabs, {
  PLATFORM_CONFIG,
} from "../../components/external-orders/PlatformTabs";
import OrderStepper from "../../components/external-orders/OrderStepper";


export default function ShippedOrdersPage() {
  // Get initial active tab from localStorage or default to woocommerce
  const getInitialActiveTab = () => {
    const savedTab = localStorage.getItem("shippedOrdersActiveTab");
    return savedTab && PLATFORM_CONFIG[savedTab] ? savedTab : "woocommerce";
  };

  // State management
  const [activeTab, setActiveTab] = useState(getInitialActiveTab);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [updateOrderStatusLoading, setUpdateOrderStatusLoading] = useState(false);

  // Filter state - Filter for shipped orders
  const [filters, setFilters] = useState({
    search: "",
    dateRange: null,
    wc_status: null,
    wm_status: null,
    sf_status: null,
    shipStation_status: "shipped", // Filter for shipped orders
  });

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("shippedOrdersActiveTab", activeTab);
  }, [activeTab]);

  // Fetch shipped orders
  const fetchShippedOrders = async ({ queryKey }) => {
    const [
      _,
      tab,
      page,
      limit,
      search,
      dateRange,
      wcStatus,
      sfStatus,
      wmStatus,
      shipStationStatus,
    ] = queryKey;
    const config = getPlatformConfig(tab);

    if (tab === "woocommerce") {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
        status: "processed", // Only processed orders can be shipped
      });
      
      // Filter for shipped orders - include both "shipped" and "sent_to_shipstation"
      // We'll handle this on the backend by passing a special value
      if (shipStationStatus && shipStationStatus !== "shipped") {
        params.append("shipStation_status", shipStationStatus);
      } else {
        // For shipped orders, we want both "shipped" and "sent_to_shipstation"
        // Pass a special value that backend will interpret
        params.append("shipStation_status", "shipped_or_sent");
      }

      if (search) {
        params.append("search", search);
      }
      if (wcStatus) {
        params.append("wc_status", wcStatus);
      }
      if (dateRange && dateRange.length === 2) {
        const startDate = dayjs.isDayjs(dateRange[0]) 
          ? dateRange[0].format("YYYY-MM-DD")
          : dayjs(dateRange[0]).format("YYYY-MM-DD");
        const endDate = dayjs.isDayjs(dateRange[1])
          ? dateRange[1].format("YYYY-MM-DD")
          : dayjs(dateRange[1]).format("YYYY-MM-DD");
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      }
      const response = await apiClient.get(`${config.api}?${params}`);
      return response.data;
    } else if (tab === "walmart") {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
        status: "processed",
      });
      
      // Filter for shipped orders - include both "shipped" and "sent_to_shipstation"
      // We'll handle this on the backend by passing a special value
      if (shipStationStatus && shipStationStatus !== "shipped") {
        params.append("shipStation_status", shipStationStatus);
      } else {
        // For shipped orders, we want both "shipped" and "sent_to_shipstation"
        // Pass a special value that backend will interpret
        params.append("shipStation_status", "shipped_or_sent");
      }

      if (search) {
        params.append("search", search);
      }
      if (wmStatus) {
        params.append("wm_status", wmStatus);
      }
      if (dateRange && dateRange.length === 2) {
        const startDate = dayjs.isDayjs(dateRange[0]) 
          ? dateRange[0].format("YYYY-MM-DD")
          : dayjs(dateRange[0]).format("YYYY-MM-DD");
        const endDate = dayjs.isDayjs(dateRange[1])
          ? dateRange[1].format("YYYY-MM-DD")
          : dayjs(dateRange[1]).format("YYYY-MM-DD");
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      }
      const response = await apiClient.get(`${config.api}?${params}`);
      return response.data;
    } else if (tab === "shopify") {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
        status: "processed",
      });
      
      // Filter for shipped orders - include both "shipped" and "sent_to_shipstation"
      // We'll handle this on the backend by passing a special value
      if (shipStationStatus && shipStationStatus !== "shipped") {
        params.append("shipStation_status", shipStationStatus);
      } else {
        // For shipped orders, we want both "shipped" and "sent_to_shipstation"
        // Pass a special value that backend will interpret
        params.append("shipStation_status", "shipped_or_sent");
      }

      if (search) {
        params.append("search", search);
      }
      if (sfStatus) {
        params.append("sf_status", sfStatus);
      }
      if (dateRange && dateRange.length === 2) {
        const startDate = dayjs.isDayjs(dateRange[0]) 
          ? dateRange[0].format("YYYY-MM-DD")
          : dayjs(dateRange[0]).format("YYYY-MM-DD");
        const endDate = dayjs.isDayjs(dateRange[1])
          ? dateRange[1].format("YYYY-MM-DD")
          : dayjs(dateRange[1]).format("YYYY-MM-DD");
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      }
      const response = await apiClient.get(`${config.api}?${params}`);
      return response.data;
    }

    return { success: false, orders: [], totalOrders: 0 };
  };

  const {
    data: ordersData,
    isLoading,
    error: ordersError,
    refetch,
  } = useQuery({
    queryKey: [
      "shippedOrders",
      activeTab,
      currentPage,
      pageSize,
      filters.search,
      filters.dateRange,
      filters.wc_status,
      filters.sf_status,
      filters.wm_status,
      filters.shipStation_status,
    ],
    queryFn: fetchShippedOrders,
    refetchInterval: 60000, // Refetch every 60 seconds
    refetchIntervalInBackground: false,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: false,
  });

  // Filter orders client-side (if needed)
  const filteredOrders = useMemo(() => {
    if (!ordersData?.orders) return [];
    return ordersData.orders;
  }, [ordersData]);

  const totalFilteredOrders = ordersData?.totalOrders || 0;

  // Handle page change
  const handlePageChange = useCallback((page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  // Handle drawer open
  const handleDrawerOpen = useCallback((order) => {
    setSelectedOrder(order);
    setOpen(true);
  }, []);

  // Handle drawer close
  const handleDrawerClose = useCallback(() => {
    setOpen(false);
    setSelectedOrder(null);
  }, []);

  // Handle edit click
  const handleEditClick = useCallback((order) => {
    setEditingOrder(order);
    setEditModalVisible(true);
  }, []);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  // Handle filter reset
  const handleFiltersReset = useCallback(() => {
    setFilters({
      search: "",
      dateRange: null,
      wc_status: null,
      wm_status: null,
      sf_status: null,
      shipStation_status: "shipped",
    });
    setCurrentPage(1);
  }, []);

  // Handle tab change
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  // Handle update order status (similar to ProcessedOrdersPage)
  const handleUpdateOrderStatus = useCallback(async () => {
    setUpdateOrderStatusLoading(true);
    try {
      let endpoint = "";
      if (activeTab === "woocommerce") {
        endpoint = "/api/v1/shipstation/update/wc/status";
      } else if (activeTab === "walmart") {
        endpoint = "/api/v1/shipstation/update/wm/status";
      } else if (activeTab === "shopify") {
        endpoint = "/api/v1/shipstation/update/sf/status";
      } else {
        return;
      }

      const response = await apiClient.patch(endpoint);
      
      if (response.data?.success) {
        Swal.fire({
          icon: "success",
          title: "Status Updated!",
          text: `Successfully updated ${response.data.updatedCount || 0} order(s)`,
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
        await refetch();
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error?.response?.data?.message || error.message || "Failed to update order status",
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
    } finally {
      setUpdateOrderStatusLoading(false);
    }
  }, [activeTab, refetch]);

  // Error handling
  useEffect(() => {
    if (ordersError) {
      notification.error({
        message: "Failed to load shipped orders",
        description: ordersError.message,
      });
    }
  }, [ordersError]);

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
            showCheckboxes={false}
            fetchProcessedOrders={refetch}
            onDeleteSuccess={() => {
              refetch();
            }}
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
            platform={activeTab}
            onEditClick={handleEditClick}
            showCheckboxes={false}
            fetchProcessedOrders={refetch}
            onDeleteSuccess={() => {
              refetch();
            }}
          />
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gray-50 p-4 md:p-6"
    >
      <div className="max-w-[1800px] mx-auto">
        {/* Stepper - Moved to top */}
        <OrderStepper />

        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Shipped Orders
              </h1>
              <p className="text-sm text-gray-500">
                View and manage orders that have been shipped with tracking numbers
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdateOrderStatus}
                disabled={updateOrderStatusLoading}
                className="sm:w-auto w-full flex items-center justify-center min-w-fit text-[14px] sm:text-[15px] gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                {updateOrderStatusLoading ? (
                  <svg
                    className="w-4 h-4 animate-spin"
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
                ) : null}
                {updateOrderStatusLoading ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>

        {/* Platform Tabs */}
        <div>
          <PlatformTabs
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        <div className="mt-5">
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
        <ProcessedOrderDetailsDrawer
          open={open}
          onClose={handleDrawerClose}
          order={selectedOrder}
          platform={activeTab}
          onEditClick={handleEditClick}
        />

        {/* Edit Modal */}
        <OrderEditModal
          visible={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false);
            setEditingOrder(null);
          }}
          onSuccess={() => {
            setEditModalVisible(false);
            setEditingOrder(null);
            refetch();
          }}
          order={editingOrder}
          platform={activeTab}
        />
      </div>
    </motion.div>
  );
}

