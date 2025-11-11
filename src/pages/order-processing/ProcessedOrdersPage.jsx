import React, { useState, useEffect, useMemo } from "react";
import { Typography, notification, Button, message } from "antd";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

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
4;

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
  const [isMovingToShipStation, setIsMovingToShipStation] = useState(false);
  const [kitsByOrderId, setKitsByOrderId] = useState({});
  const [updateOrderStatusLoading, setUpdateOrderStatusLoading] =
    useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    dateRange: null,
    wc_status: null,
    wm_status: null,
    sf_status: null,
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

  //  also want to add shopify orders
  const fetchProcessedOrders = async ({ queryKey }) => {
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
      status,
    ] = queryKey;
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
      if (wmStatus) {
        params.append("wm_status", wmStatus); 
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
        status: "processed", 
      });
      if (search) {
        params.append("search", search);
      }
      if (sfStatus) {
        params.append("sf_status", sfStatus); 
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

  // Update Order Status - Received from Shipstation Webhook

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
    if (activeTab === "shopify") {
      // Shopify expects orderId as a query parameter
      const response = await apiClient.get(
        `${config.detailsApi}?orderId=${orderId}`
      );
      return response.data;
    }
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
      filters.sf_status,
      filters.wm_status,
      filters.status,
    ],
    queryFn: fetchProcessedOrders,
    keepPreviousData: true,
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    refetchIntervalInBackground: true,
    staleTime: 10 * 1000, // Consider data stale after 10 seconds
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Load platforms to pull ShipStation tagIds per platform
  const { data: platformsData } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/plateforms/all");
      return response.data;
    },
    staleTime: 0,
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
      const allOrderIds = filteredOrders
        .filter((order) => !order?.shipStation_OrderId)
        .map((order) => order._id);
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
      sf_status: null,
      wm_status: null,
    });
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  };

  // Compute filtered orders with stable identity
  const filteredOrders = useMemo(() => {
    if (!ordersData?.orders) return [];
    let filtered = ordersData.orders;
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      if (q) {
        filtered = filtered.filter((order) => {
          const fields = [
            order.orderId,
            order.order_key,
            order.customerOrderId,
            order.amazonOrderId,
            order.user_name,
            order.tracking_number,
            order.shipStation_OrderId,
            order.status,
            order.wc_status,
            order.wm_status,
            order.sf_status,
            order.app_id,
            order.packageCode,
            order.packageName,
            order.shopifyDetails?.name,
            order.shopifyDetails?.email,
            order.shopifyDetails?.order_number,
            order.shopifyDetails?.order_key,
            order.shopifyDetails?.source_name,
            Array.isArray(order.shopifyDetails?.tags)
              ? order.shopifyDetails.tags.join(", ")
              : order.shopifyDetails?.tags,
          ].filter(Boolean);

          return fields.some((field) =>
            String(field).toLowerCase().includes(q)
          );
        });
      }
    }
    if (filters.dateRange && filters.dateRange.length === 2) {
      const startDate = new Date(filters.dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.dateRange[1]);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }
    return filtered;
  }, [ordersData?.orders, filters.search, filters.dateRange]);
  const totalFilteredOrders = filteredOrders.length;

  // Fetch kits immediately when orders are selected (single or bulk) and log results
  useEffect(() => {
    const fetchKitsForSelection = async () => {
      if (!Array.isArray(selectedOrders) || selectedOrders.length === 0) return;
      for (const id of selectedOrders) {
        try {
          const ord = filteredOrders.find((o) => o._id === id);
          const orderId = ord?.orderId;
          if (!orderId) continue;
          if (kitsByOrderId[orderId]) {
            console.log(
              "Kits already cached for selected order",
              orderId,
              kitsByOrderId[orderId]
            );
            continue;
          }

          // const numericOrderId =
          //   activeTab === "shopify"
          //     ? String(orderId).replace("gid://shopify/Order/", "")
          //     : orderId;
          const res = await apiClient.get(
            `/api/v1/kit/order/kits/${encodeURIComponent(orderId)}`
          );
          // console.log("Kits fetched for selected order", orderId, res?.data);
          setKitsByOrderId((prev) => ({ ...prev, [orderId]: res?.data }));
        } catch (e) {
          console.error("Error fetching kits for selected order", e);
        }
      }
    };
    fetchKitsForSelection();
  }, [selectedOrders, filteredOrders, kitsByOrderId]);

  // Helper to normalize country to 2-letter ISO code for ShipStation
  const normalizeCountryCode = (value) => {
    if (!value) return null;
    const upper = String(value).trim().toUpperCase();
    const map = {
      US: "US",
      USA: "US",
      "UNITED STATES": "US",
      "UNITED STATES OF AMERICA": "US",
      CA: "CA",
      CAN: "CA",
      CANADA: "CA",
      MX: "MX",
      MEX: "MX",
      MEXICO: "MX",
    };
    if (map[upper]) return map[upper];
    if (upper.length === 2) return upper;
    return null;
  };

  // Format date to ISO 8601 acceptable by ShipStation
  const formatDateForShipStation = (value) => {
    try {
      if (!value) return new Date().toISOString();
      let d;
      if (typeof value === "number") {
        d = new Date(value);
      } else if (typeof value === "string") {
        const hasZone = /Z|[+-]\d{2}:\d{2}$/.test(value);
        d = new Date(hasZone ? value : `${value}Z`);
      } else if (value instanceof Date) {
        d = value;
      } else {
        d = new Date(value);
      }
      if (isNaN(d.getTime())) return new Date().toISOString();
      return d.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  // Build ShipStation order payload for WooCommerce
  const buildShipStationOrderFromWoo = ({
    kits,
    details,
    tableOrder,
    tagId,
  }) => {
    const wc = details?.order || details; // safety
    const kitsArray = Array.isArray(kits?.allKits) ? kits.allKits : [];
    const dbInfo = details?.order?.dbInfo || details?.dbInfo || {};
    console.log("wcdata",  dbInfo);

    const items = [];
    const productTitles = [];
    for (const kit of kitsArray) {
      if (kit?.product_title) {
        productTitles.push(kit.product_title);
      }
      for (const sku of kit?.skus || []) {
        console.log(sku);
        items.push({
          // lineItemKey: sku?._id || kit?.kit_id || kit?.productId,
          sku: sku?.pId?.sku,
          name: sku?.pId?.pro_title,
          imageUrl: null,
          quantity: Number(sku?.quantity),
          unitPrice: Number(sku?.price),
          taxAmount: null,
          shippingAmount: null,
          productId: Number(sku?.pId?.uid) || undefined,
        });
      }
    }

    const orderDate = formatDateForShipStation(
      wc?.date_created || tableOrder?.createdAt || new Date()
    );
    const billing = wc?.billing || {};
    const shipping = wc?.shipping || {};
    // Get shipping service from shipping lines
    const shippingService = wc?.shipping_lines?.[0]?.method_id || null;

    const advancedOptions = {};
    if (productTitles[0]) advancedOptions.customField1 = productTitles[0];
    if (productTitles[1]) advancedOptions.customField2 = productTitles[1];
    if (productTitles[2]) advancedOptions.customField3 = productTitles[2];

    if (dbInfo?.packageName ) {
      advancedOptions.customField3 = dbInfo.packageName; 
    }

    // Validation for fulfillment info
    const missingWarehouse = !dbInfo?.warehouseId;
    const hasPkg = Boolean(dbInfo?.packageCode || dbInfo?.packageName);
    const weightValid =
      typeof dbInfo?.weight?.value === "number" &&
      dbInfo?.weight?.value > 0 &&
      ["pounds", "ounces", "grams"].includes(dbInfo?.weight?.units);

      if (missingWarehouse || !hasPkg || !weightValid) {
        Swal.fire({
          icon: "warning",
          title: "Add Fulfillment Info",
          text:
            "Please add warehouse, package, weight, and dimensions before moving to ShipStation.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3500,
          timerProgressBar: true,
          background: "#f59e0b",
          color: "#111827",
          customClass: { popup: "rounded-lg" },
        });
        return null;
      }


    return {
      orderNumber: String(tableOrder?.orderId || wc?.id || wc?.number || ""),
      orderKey: String(tableOrder?._id || wc?.id || wc?.number || ""),
      orderDate: orderDate,
      orderStatus: "awaiting_shipment",
      customerId: Number(wc?.customer_id) || undefined,
      customerUsername: billing?.first_name || billing?.email || undefined,
      customerEmail: billing?.email || undefined,
      tagIds: tagId ? [Number(tagId)] : undefined,
      billTo: {
        name:
          [billing?.first_name, billing?.last_name].filter(Boolean).join(" ") ||  [shipping?.first_name, shipping?.last_name]
          .filter(Boolean)
          .join(" ") ||
          null,
        company: billing?.company || null,
        street1: billing?.address_1 || null,
        street2: billing?.address_2 || null,
        street3: null,
        city: billing?.city || null,
        state: billing?.state || null,
        postalCode: billing?.postcode || null,
        country: normalizeCountryCode(billing?.country) || null,
        phone: billing?.phone || null,
        residential: null,
      },
      shipTo: {
        name:
          [shipping?.first_name, shipping?.last_name]
            .filter(Boolean)
            .join(" ") || null,
        company: shipping?.company || null,
        street1: shipping?.address_1 || null,
        street2: shipping?.address_2 || null,
        street3: null,
        city: shipping?.city || null,
        state: shipping?.state || null,
        postalCode: shipping?.postcode || null,
        country: normalizeCountryCode(shipping?.country) || null,
        phone: shipping?.phone || null,
        residential: true,
      },
      items,
      requestedShippingService: shippingService,
      amountPaid: Number(wc?.total) || undefined,
      taxAmount: Number(wc?.total_tax) || undefined,
      shippingAmount: Number(wc?.shipping_total) || undefined,
      gift: Boolean(wc?.cart_hash) || false,
      paymentMethod:
        wc?.payment_method_title || wc?.payment_method || undefined,
      advancedOptions,
      warehouseId: dbInfo?.warehouseId,
      packageCode: "package",
      
      weight: {
        value:
          typeof dbInfo?.weight?.value === "number" &&
          dbInfo?.weight?.value > 0
            ? dbInfo.weight.value
            : 1, // default to 1 if missing or 0
        units: ["pounds", "ounces", "grams"].includes(dbInfo?.weight?.units)
          ? dbInfo.weight.units
          : "ounces", // default to valid unit
      },

      dimensions: {
        length:
          typeof dbInfo?.dimensions?.length === "number" &&
          dbInfo?.dimensions?.length > 0
            ? dbInfo.dimensions.length
            : 10,
        width:
          typeof dbInfo?.dimensions?.width === "number" &&
          dbInfo?.dimensions?.width > 0
            ? dbInfo.dimensions.width
            : 10,
        height:
          typeof dbInfo?.dimensions?.height === "number" &&
          dbInfo?.dimensions?.height > 0
            ? dbInfo.dimensions.height
            : 5,
        units: ["inches", "centimeters"].includes(dbInfo?.dimensions?.units)
          ? dbInfo.dimensions.units
          : "inches",
      },
    };
  };

  // Build ShipStation order payload for Walmart
  const buildShipStationOrderFromWalmart = ({
    kits,
    details,
    tableOrder,
    tagId,
  }) => {
    const wm = details?.order?.order || details?.order || details || {};
    const dbInfo = details?.order?.dbInfo || details?.dbInfo || {};
    const kitsArray = Array.isArray(kits?.allKits) ? kits.allKits : [];

    // console.log("wmdata",  dbInfo);

    const items = [];
    const productTitles = [];
    for (const kit of kitsArray) {
      if (kit?.product_title) {
        productTitles.push(kit?.product_title);
      }
      for (const sku of kit?.skus || []) {
        items.push({
          // lineItemKey: sku?._id || kit?.kit_id || kit?.productId,
          sku: sku?.pId?.sku || String(sku?.pId?._id || ""),
          name: sku?.pId?.pro_title || "Product",
          imageUrl: null,
          quantity: Number(sku?.quantity || 1),
          unitPrice: Number(sku?.price || sku?.pId?.sale_price || 0),
          taxAmount: null,
          shippingAmount: null,
          productId: Number(sku?.pId?.uid) || undefined,
        });
      }
    }

    const orderDate = formatDateForShipStation(
      typeof wm?.orderDate === "number"
        ? wm.orderDate
        : tableOrder?.createdAt || new Date()
    );
    const addr = wm?.shippingInfo?.postalAddress || {};

    // Get shipping service from shipping lines
    const shippingService = wm?.shippingInfo?.carrierMethodName || null;

    const advancedOptions = {};
    if (productTitles[0]) advancedOptions.customField1 = productTitles[0];
    if (productTitles[1]) advancedOptions.customField2 = productTitles[1];
    if (productTitles[2]) advancedOptions.customField3 = productTitles[2];

    if (dbInfo?.packageName) {
      advancedOptions.customField3 = dbInfo.packageName; 
    }

    // Validation for fulfillment info
    const missingWarehouse = !dbInfo?.warehouseId;
    const hasPkg = Boolean(dbInfo?.packageCode || dbInfo?.packageName);
    const weightValid =
      typeof dbInfo?.weight?.value === "number" &&
      dbInfo?.weight?.value > 0 &&
      ["pounds", "ounces", "grams"].includes(dbInfo?.weight?.units);

 


    if (missingWarehouse || !hasPkg || !weightValid) {
      Swal.fire({
        icon: "warning",
        title: "Add Fulfillment Info",
        text:
          "Please add warehouse, package, weight, and dimensions before moving to ShipStation.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        background: "#f59e0b",
        color: "#111827",
        customClass: { popup: "rounded-lg" },
      });
      return null;
    }

    return {
      orderNumber: String(tableOrder?.orderId),
      orderKey: String(
        tableOrder?._id || wm?.purchaseOrderId || wm?.customerOrderId || ""
      ),
      orderDate: orderDate,
      orderStatus: "awaiting_shipment",
      customerId: wm?.customerOrderId,
      customerUsername: wm?.customerEmailId || undefined,
      customerEmail: wm?.customerEmailId || undefined,
      tagIds: tagId ? [Number(tagId)] : undefined,
      billTo: {
        name: addr?.name || null,
        company: null,
        street1: addr?.address1 || null,
        street2: addr?.address2 || null,
        street3: null,
        city: addr?.city || null,
        state: addr?.state || null,
        postalCode: addr?.postalCode || null,
        country: normalizeCountryCode(addr?.country) || null,
        phone: wm?.shippingInfo?.phone || null,
        residential: null,
      },
      shipTo: {
        name: addr?.name || null,
        company: null,
        street1: addr?.address1 || null,
        street2: addr?.address2 || null,
        street3: null,
        city: addr?.city || null,
        state: addr?.state || null,
        postalCode: addr?.postalCode || null,
        country: normalizeCountryCode(addr?.country) || null,
        phone: wm?.shippingInfo?.phone || null,
        residential: true,
      },
      items,
      requestedShippingService: shippingService,
      amountPaid: undefined,
      taxAmount: undefined,
      shippingAmount: undefined,
      gift: false,
      paymentMethod: undefined,
      advancedOptions,
      warehouseId: dbInfo?.warehouseId,
      packageCode: "package",
      
      weight: {
        value:
          typeof dbInfo?.weight?.value === "number" &&
          dbInfo?.weight?.value > 0
            ? dbInfo.weight.value
            : 1, // default to 1 if missing or 0
        units: ["pounds", "ounces", "grams"].includes(dbInfo?.weight?.units)
          ? dbInfo.weight.units
          : "ounces", // default to valid unit
      },

      dimensions: {
        length:
          typeof dbInfo?.dimensions?.length === "number" &&
          dbInfo?.dimensions?.length > 0
            ? dbInfo.dimensions.length
            : 10,
        width:
          typeof dbInfo?.dimensions?.width === "number" &&
          dbInfo?.dimensions?.width > 0
            ? dbInfo.dimensions.width
            : 10,
        height:
          typeof dbInfo?.dimensions?.height === "number" &&
          dbInfo?.dimensions?.height > 0
            ? dbInfo.dimensions.height
            : 5,
        units: ["inches", "centimeters"].includes(dbInfo?.dimensions?.units)
          ? dbInfo.dimensions.units
          : "inches",
      },
    };
  };

  // Build ShipStation order payload for Shopify
  const buildShipStationOrderFromShopify = ({
    kits,
    details,
    tableOrder,
    tagId,
  }) => {
    const sf = details?.order || details || {};
    console.log("sf", sf);
    const kitsArray = Array.isArray(kits?.allKits) ? kits.allKits : [];

    const items = [];
    const productTitles = [];
    for (const kit of kitsArray) {
      if (kit?.product_title) {
        productTitles.push(kit.product_title);
      }

      for (const sku of kit?.skus || []) {
        items.push({
          sku: sku?.pId?.sku,
          name: sku?.pId?.pro_title || "Product",
          imageUrl: null,
          quantity: Number(sku?.quantity || 1),
          unitPrice: Number(sku?.price || sku?.pId?.sale_price || 0),
          taxAmount: null,
          shippingAmount: null,
          productId: Number(sku?.pId?.uid) || undefined,
        });
      }
    }

    // Fallback: if no kits found, derive items from Shopify order line items (production safety)
    if (items.length === 0) {
      const sfLineNodes = Array.isArray(sf?.lineItems?.edges)
        ? sf.lineItems.edges.map((e) => e?.node).filter(Boolean)
        : [];
      for (const node of sfLineNodes) {
        if (node?.name) {
          productTitles.push(node.name);
        }
        items.push({
          sku: node?.sku || String(node?.id || ""),
          name: node?.name || "Product",
          imageUrl: null,
          quantity: Number(node?.quantity || 1),
          unitPrice: Number(node?.originalUnitPriceSet?.shopMoney?.amount || 0),
          taxAmount: null,
          shippingAmount: null,
          productId: undefined,
        });
      }
    }

    const orderDate = formatDateForShipStation(
      sf?.createdAt || tableOrder?.createdAt || new Date()
    );

    const billing = sf?.billingAddress || {};
    const shipping = sf?.shippingAddress || {};

    const advancedOptions = {
     
    };
    if (productTitles[0]) advancedOptions.customField1 = productTitles[0];
    if (productTitles[1]) advancedOptions.customField2 = productTitles[1];
    if (productTitles[2]) advancedOptions.customField3 = productTitles[2];

    if (sf?.dbInfo?.packageName ) {
      advancedOptions.customField3 = sf.dbInfo.packageName; 
    }
  

    // Validation for fulfillment info
    const missingWarehouse = !sf?.dbInfo?.warehouseId;
    const hasPkg = Boolean(sf?.dbInfo?.packageCode || sf?.dbInfo?.packageName);
    const weightValid =
      typeof sf?.dbInfo?.weight?.value === "number" &&
      sf?.dbInfo?.weight?.value > 0 &&
      ["pounds", "ounces", "grams"].includes(sf?.dbInfo?.weight?.units);

    console.log(
      "weightValid",
      weightValid,
      sf?.dbInfo?.weight,
      missingWarehouse,
      hasPkg
    );

    if (missingWarehouse || !hasPkg || !weightValid) {
      Swal.fire({
        icon: "warning",
        title: "Add Fulfillment Info",
        text:
          "Please add warehouse, package, weight, and dimensions before moving to ShipStation.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3500,
        timerProgressBar: true,
        background: "#f59e0b",
        color: "#111827",
        customClass: { popup: "rounded-lg" },
      });
      return null;
    }

    return {
      orderNumber: String(tableOrder?.order_key || sf?.id || ""),
      orderKey: String(tableOrder?.orderId || sf?.name || sf?.id || ""),
      orderDate: orderDate,
      orderStatus: "awaiting_shipment",
      customerId: undefined,
      customerUsername: sf?.email || undefined,
      customerEmail: sf?.email || undefined,
      tagIds: tagId ? [Number(tagId)] : undefined,
      billTo: {
        name:
          [billing?.firstName, billing?.lastName].filter(Boolean).join(" ") ||
          null,
        company: null,
        street1: billing?.address1 || null,
        street2: billing?.address2 || null,
        street3: null,
        city: billing?.city || null,
        state: billing?.province || null,
        postalCode: billing?.zip || null,
        country: normalizeCountryCode(billing?.country) || null,
        phone: billing?.phone || null,
        residential: null,
      },
      shipTo: {
        name:
          [shipping?.firstName, shipping?.lastName].filter(Boolean).join(" ") ||
          null,
        company: null,
        street1: shipping?.address1 || null,
        street2: shipping?.address2 || null,
        street3: null,
        city: shipping?.city || null,
        state: shipping?.province || null,
        postalCode: shipping?.zip || null,
        country: normalizeCountryCode(shipping?.country) || null,
        phone: shipping?.phone || null,
        residential: true,
      },
      items,
      requestedShippingService: undefined,
      amountPaid: Number(sf?.totalPriceSet?.shopMoney?.amount) || undefined,
      taxAmount: Number(sf?.totalTaxSet?.shopMoney?.amount) || undefined,
      shippingAmount: undefined,
      gift: false,
      paymentMethod: (sf?.paymentGatewayNames || []).join(", ") || undefined,
      advancedOptions,
      warehouseId: sf?.dbInfo?.warehouseId,
      packageCode: "package",
      
      weight: {
        value:
          typeof sf?.dbInfo?.weight?.value === "number" &&
          sf?.dbInfo?.weight?.value > 0
            ? sf.dbInfo.weight.value
            : 1, // default to 1 if missing or 0
        units: ["pounds", "ounces", "grams"].includes(sf?.dbInfo?.weight?.units)
          ? sf.dbInfo.weight.units
          : "ounces", // default to valid unit
      },

      dimensions: {
        length:
          typeof sf?.dbInfo?.dimensions?.length === "number" &&
          sf?.dbInfo?.dimensions?.length > 0
            ? sf.dbInfo.dimensions.length
            : 10,
        width:
          typeof sf?.dbInfo?.dimensions?.width === "number" &&
          sf?.dbInfo?.dimensions?.width > 0
            ? sf.dbInfo.dimensions.width
            : 10,
        height:
          typeof sf?.dbInfo?.dimensions?.height === "number" &&
          sf?.dbInfo?.dimensions?.height > 0
            ? sf.dbInfo.dimensions.height
            : 5,
        units: ["inches", "centimeters"].includes(sf?.dbInfo?.dimensions?.units)
          ? sf.dbInfo.dimensions.units
          : "inches",
      },
    };
  };

  const handleMoveToShipStation = async () => {
    try {
      const ordersToProcess = selectedOrders.length > 0 ? selectedOrders : [];
      if (ordersToProcess.length === 0) {
        message.warning("Please select at least one order.");
        return;
      }
      setIsMovingToShipStation(true);

      // Build a map of platformId (as string) => orders
      const idToOrder = new Map(filteredOrders.map((o) => [o._id, o]));
      const platformToOrders = new Map();
      for (const id of ordersToProcess) {
        const ord = idToOrder.get(id);
        if (!ord) continue;
        const rawPid = ord?.plateform_id ?? ord?.platform_id ?? "";
        const pid =
          typeof rawPid === "object"
            ? rawPid?._id
              ? String(rawPid._id)
              : String(rawPid)
            : String(rawPid);
        if (!pid) continue;
        if (!platformToOrders.has(pid)) platformToOrders.set(pid, []);
        platformToOrders.get(pid).push(ord);
      }

      const config = getPlatformConfig(activeTab);

      for (const [platformId, orders] of platformToOrders.entries()) {
        if (!platformId) {
          console.warn(
            "Skipping ShipStation post due to missing platformId for orders",
            orders?.map((o) => o?.orderId)
          );
          continue;
        }
        // Resolve platform tagId for ShipStation tagging
        const platformTagId = platformsData?.platforms?.find(
          (p) => String(p?._id) === String(platformId)
        )?.tagId;
        // Fetch kits and details for each order in parallel
        const results = await Promise.all(
          orders.map(async (ord) => {
            let kitsData = kitsByOrderId[ord?.orderId];
            if (kitsData) {
              console.log("Using cached kits for move", ord?.orderId, kitsData);
            } else {
              const numericOrderId =
                activeTab === "shopify"
                  ? String(ord?.orderId).replace("gid://shopify/Order/", "")
                  : ord?.orderId;

              console.log("Fetching kits for move", ord?.orderId);
              const kitsRes = await apiClient.get(
                `/api/v1/kit/order/kits/${encodeURIComponent(numericOrderId)}`
              );
              kitsData = kitsRes?.data;
            }
            let detailsRes;
            if (activeTab === "shopify") {
              detailsRes = await apiClient.get(
                `${config.detailsApi}?orderId=${ord?.orderId}`
              );
            } else {
              detailsRes = await apiClient.get(
                `${config.detailsApi}/${ord?.orderId}`
              );
            }
            console.log("Details", detailsRes?.data);
            return { ord, kits: kitsData, details: detailsRes?.data };
          })
        );

        // Build orderData list
        let orderData = results
          .map(({ ord, kits, details }) => {
            if (activeTab === "woocommerce") {
              return buildShipStationOrderFromWoo({
                kits,
                details,
                tableOrder: ord,
                tagId: platformTagId,
              });
            } else if (activeTab === "walmart") {
              return buildShipStationOrderFromWalmart({
                kits,
                details,
                tableOrder: ord,
                tagId: platformTagId,
              });
            } else if (activeTab === "shopify") {
              return buildShipStationOrderFromShopify({
                kits,
                details,
                tableOrder: ord,
                tagId: platformTagId,
              });
            }
            return null;
          })
          .filter(Boolean);

        // Ensure we don't send orders without items
        orderData = orderData.filter(
          (od) => Array.isArray(od?.items) && od.items.length > 0
        );

        if(orderData.length === 0) {
          return;
        }

        const payload = { plateformId: String(platformId), orderData };
        // console.log("Posting ShipStation payload", payload);

        // POST to ShipStation API for this platform group
        await apiClient.post(
          `/api/v1/shipstation/create/shipstation/order`,
          payload
        );
      }

      Swal.fire({
        icon: "success",
        title: "Moved to ShipStation",
        text: `Successfully sent ${ordersToProcess.length} order(s) to ShipStation`,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#10b981",
        color: "#fff",
        customClass: { popup: "rounded-lg" },
      });
      console.log("Items Moved to ShipStation for", ordersToProcess);
      // Refresh and clear selections
      setSelectedOrders([]);
      setSelectAll(false);
      await refetch();
    } catch (err) {
      console.error("Move to ShipStation failed", err);
      if (err?.response?.data) {
        console.error(
          "ShipStation create order error response:",
          err.response.data
        );
      }
      Swal.fire({
        icon: "error",
        title: "Failed to Move",
        text:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Move to ShipStation failed",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: { popup: "rounded-lg" },
      });
      console.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Move to ShipStation failed"
      );
    } finally {
      setIsMovingToShipStation(false);
    }
  };

  // Update select all state when orders change
  useEffect(() => {
    if (
      filteredOrders.filter((o) => !o?.shipStation_OrderId).length > 0 &&
      selectedOrders.length ===
        filteredOrders.filter((o) => !o?.shipStation_OrderId).length
    ) {
      setSelectAll(true);
    } else {
      setSelectAll(false);
    }
  }, [selectedOrders, filteredOrders]);

  // Ensure no disabled (ShipStation) orders remain selected when data updates
  useEffect(() => {
    setSelectedOrders((prev) => {
      const allowedIds = new Set(
        filteredOrders.filter((o) => !o?.shipStation_OrderId).map((o) => o._id)
      );
      const next = prev.filter((id) => allowedIds.has(id));
      if (next.length !== prev.length) return next;
      for (let i = 0; i < next.length; i += 1) {
        if (next[i] !== prev[i]) return next;
      }
      return prev;
    });
  }, [filteredOrders]);

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
                  loading={isMovingToShipStation}
                  disabled={isMovingToShipStation}
                  onClick={handleMoveToShipStation}
                >
                  Move to shipStation
                </Button>
              </div>
            </div>
          </div>
        )}

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
            showCheckboxes={true}
            selectedOrders={selectedOrders}
            onOrderSelect={handleOrderSelect}
            selectAll={selectAll}
            onSelectAll={handleSelectAll}
            fetchProcessedOrders={refetch}
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
            showCheckboxes={true}
            selectedOrders={selectedOrders}
            onOrderSelect={handleOrderSelect}
            selectAll={selectAll}
            onSelectAll={handleSelectAll}
            fetchProcessedOrders={refetch}
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
                Processed Orders
              </h1>
              <p className="text-gray-600">
                View and manage processed orders from different e-commerce
                platforms
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* <button
                onClick={fetchLatestOrders}
                disabled={isLoading || isRefreshing}
                className="sm:w-auto w-full flex min-w-fit text-[14px] sm:text-[15px] items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
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
              </button> */}
              <button
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
                className="sm:w-auto w-full flex items-center text-[14px] sm:text-[15px] min-w-fit  justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm"
              >
                {updateOrderStatusLoading && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {updateOrderStatusLoading ? "Updating..." : "Update Status"}
              </button>
            </div>
          </div>
        </div>
        {/* Filters */}
        <PlatformTabs
          activeTab={activeTab}
          onTabChange={handleTabChange}
        ></PlatformTabs>
        {/* Platform Tabs */}
        <div className="mt-5">
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
