import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Button,
  Card,
  Typography,
  notification,
  message,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Form,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import CreateManualOrderModal from "../../components/manual-orders/CreateManualOrderModal";
import ManualOrderTable from "../../components/manual-orders/ManualOrderTable";
import ManualOrderDetailsDrawer from "../../components/manual-orders/ManualOrderDetailsDrawer";
import { getManualOrders, getManualOrderDetails } from "../../api/manualOrders";
import Swal from "sweetalert2";
import apiClient from "../../api/client";

const { Title, Text } = Typography;

// Constants
const INITIAL_FILTERS = {
  search: "",
  dateRange: null,
  platform: null,
};

const DEFAULT_PAGE_SIZE = 30;

const ManualOrdersPage = () => {
  // Modal and drawer states
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // Selection states
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isMovingToShipStation, setIsMovingToShipStation] = useState(false);

  // Filter state
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  // Memoized fetch function
  const fetchOrders = useCallback(async () => {
    const response = await getManualOrders({
      page: currentPage,
      limit: pageSize,
      search: filters.search,
    });

    return {
      success: response.success,
      orders: response.data || [],
      totalOrders: response.totalCount || 0,
      page: response.page || currentPage,
      perPage: response.limit || pageSize,
    };
  }, [currentPage, pageSize, filters.search]);

  // React Query hooks
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["manualOrders", currentPage, pageSize, filters.search],
    queryFn: fetchOrders,
    keepPreviousData: true,
  });

  const { data: platformsData } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/plateforms/all");
      return response.data;
    },
    staleTime: 0,
  });

  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
    error: orderDetailsError,
  } = useQuery({
    queryKey: ["manualOrderDetails", selectedOrder?._id],
    queryFn: () => getManualOrderDetails(selectedOrder._id),
    enabled: !!selectedOrder?._id && open,
  });

  // Utility functions
  const normalizeCountryCode = useCallback((value) => {
    if (!value) return null;
    const upper = String(value).trim().toUpperCase();
    const countryMap = {
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
      PK: "PK",
      PAK: "PK",
      PAKISTAN: "PK",
    };
    return countryMap[upper] || (upper.length === 2 ? upper : null);
  }, []);

  const formatDateForShipStation = useCallback((value) => {
    try {
      if (!value) return new Date().toISOString();

      let date;
      if (typeof value === "number") {
        date = new Date(value);
      } else if (typeof value === "string") {
        const hasZone = /Z|[+-]\d{2}:\d{2}$/.test(value);
        date = new Date(hasZone ? value : `${value}Z`);
      } else if (value instanceof Date) {
        date = value;
      } else {
        date = new Date(value);
      }

      return isNaN(date.getTime())
        ? new Date().toISOString()
        : date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }, []);

  const removeUndefinedValues = useCallback((obj) => {
    return Object.keys(obj).reduce((acc, key) => {
      if (obj[key] !== undefined) {
        acc[key] = obj[key];
      }
      return acc;
    }, {});
  }, []);

  const buildShipStationOrder = useCallback(
    (order, orderDetails) => {
      const details = orderDetails?.data || order;
      const items = [];
      const productTitles = [];

      // Process items
      if (details.items && Array.isArray(details.items)) {
        details.items.forEach((item) => {
          if (item.product?.pro_title) {
            productTitles.push(item.product.pro_title);
          }
          items.push({
            lineItemKey:
              item.product?.wc_id ||
              item.product?._id ||
              `item-${item.product?._id}`,
            sku: item.product?.sku || String(item.product?._id || ""),
            name: item.product?.pro_title || "Product",
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.product?.sale_price || 0),
            productId: Number(item.product?.uid) || undefined,
          });
        });
      }

      const shipTo = details.shipTo || {};
      const billTo = details.billTo || {};

      // Build advanced options
      const advancedOptions = {};
      productTitles.slice(0, 3).forEach((title, index) => {
        advancedOptions[`customField${index + 1}`] = title;
      });

      const payload = {
        orderNumber: String(details.orderNumber || details._id || ""),
        orderKey: String(details._id || details.orderNumber || ""),
        orderDate: formatDateForShipStation(
          details.orderDate || details.createdAt
        ),
        orderStatus: "awaiting_shipment",
        customerId: Number(details.customerId),
        customerUsername: details.customerUsername || undefined,
        customerEmail: details.customerEmail || undefined,
        tagIds: details.plateform?.tagId
          ? [Number(details.plateform.tagId)]
          : undefined,
        billTo: {
          name: billTo.name,
          company: billTo.company,
          street1: billTo.street1,
          street2: billTo.street2,
          city: billTo.city,
          state: billTo.state,
          postalCode: billTo.postalCode,
          country: normalizeCountryCode(billTo.country),
          phone: billTo.phone,
          residential: billTo.residential,
        },
        shipTo: {
          name: shipTo.name,
          company: shipTo.company,
          street1: shipTo.street1,
          street2: shipTo.street2,
          city: shipTo.city,
          state: shipTo.state,
          postalCode: shipTo.postalCode,
          country: normalizeCountryCode(shipTo.country),
          phone: shipTo.phone,
          residential: shipTo.residential,
        },
        items,
        requestedShippingService: details.requestedShippingService || null,
        amountPaid: Number(details.order_total) || undefined,
        taxAmount: Number(details.tax_amount) || undefined,
        shippingAmount: Number(details.shipping_amount) || undefined,
        gift: false,
        ...(Object.keys(advancedOptions).length > 0 && { advancedOptions }),
      };

      return removeUndefinedValues(payload);
    },
    [normalizeCountryCode, formatDateForShipStation, removeUndefinedValues]
  );

  // Computed values
  const filteredOrders = useMemo(() => {
    if (!ordersData?.orders) return [];
    let filtered = ordersData.orders;

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderNumber?.toString().toLowerCase().includes(query) ||
          order.customerId?.toString().toLowerCase().includes(query) ||
          order.customerUsername?.toLowerCase().includes(query)
      );
    }

    // Platform filter
    if (filters.platform) {
      filtered = filtered.filter((order) => {
        const orderPlatformId = order.plateform?._id || order.plateform;
        return String(orderPlatformId) === String(filters.platform);
      });
    }

    // Date range filter
    if (filters.dateRange?.length === 2) {
      const [startDate, endDate] = filters.dateRange.map(
        (date) => new Date(date)
      );
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    return filtered;
  }, [ordersData?.orders, filters]);

  const selectableOrders = useMemo(
    () => filteredOrders.filter((order) => 
      !(order?.shipstation_status === true || order?.shipStation_OrderId)
    ),
    [filteredOrders]
  );

  // Event handlers
  const handleCreateOrder = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const handleModalCancel = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const handleOrderSuccess = useCallback(() => {
    refetch();
  }, [refetch]);

  const handlePageChange = useCallback((page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  const handleDrawerOpen = useCallback((order) => {
    setSelectedOrder(order);
    setOpen(true);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setOpen(false);
    setSelectedOrder(null);
  }, []);

  const handleFiltersChange = useCallback(
    (newFilters, resetPagination = false) => {
      setFilters(newFilters);
      if (resetPagination) {
        setCurrentPage(1);
      }
      setSelectedOrders([]);
      setSelectAll(false);
    },
    []
  );

  const handleFiltersReset = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  }, []);

  const handleSelectAll = useCallback(
    (checked) => {
      setSelectAll(checked);
      setSelectedOrders(
        checked ? selectableOrders.map((order) => order._id) : []
      );
    },
    [selectableOrders]
  );

  const handleOrderSelect = useCallback((orderId, checked) => {
    setSelectedOrders((prev) =>
      checked ? [...prev, orderId] : prev.filter((id) => id !== orderId)
    );
  }, []);

  const handleMoveToShipStation = useCallback(async () => {
    if (selectedOrders.length === 0) {
      message.warning("Please select at least one order.");
      return;
    }

    setIsMovingToShipStation(true);

    try {
      // Group orders by platform
      const orderMap = new Map(filteredOrders.map((o) => [o._id, o]));
      const platformGroups = new Map();

      selectedOrders.forEach((orderId) => {
        const order = orderMap.get(orderId);
        if (!order) return;

        const platformId = String(
          order?.plateform?._id || order?.plateform || ""
        );
        if (!platformId) return;

        if (!platformGroups.has(platformId)) {
          platformGroups.set(platformId, []);
        }
        platformGroups.get(platformId).push(order);
      });

      // Process each platform group
      for (const [platformId, orders] of platformGroups) {
        const orderDetailsResults = await Promise.all(
          orders.map(async (order) => {
            try {
              const details = await getManualOrderDetails(order._id);
              return { order, details };
            } catch (error) {
              console.error(
                `Failed to fetch details for order ${order._id}:`,
                error
              );
              return { order, details: null };
            }
          })
        );

        const orderData = orderDetailsResults
          .map(({ order, details }) => buildShipStationOrder(order, details))
          .filter((order) => order?.items?.length > 0);

        if (orderData.length === 0) continue;

        const payload = {
          plateformId: platformId,
          orderData,
        };
        console.log("payload", JSON.stringify(payload, null, 2));

        await apiClient.post(
          "/api/v1/shipstation/create/shipstation/order",
          payload
        );
      }

      Swal.fire({
        icon: "success",
        title: "Moved to ShipStation",
        text: `Successfully sent ${selectedOrders.length} order(s) to ShipStation`,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#10b981",
        color: "#fff",
        customClass: { popup: "rounded-lg" },
      });

      setSelectedOrders([]);
      setSelectAll(false);
      await refetch();
    } catch (error) {
      console.error("Move to ShipStation failed:", error);

      Swal.fire({
        icon: "error",
        title: "Failed to Move",
        text:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
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
    } finally {
      setIsMovingToShipStation(false);
    }
  }, [selectedOrders, filteredOrders, buildShipStationOrder, refetch]);

  // Effects
  useEffect(() => {
    setSelectAll(
      selectableOrders.length > 0 &&
        selectedOrders.length === selectableOrders.length
    );
  }, [selectedOrders.length, selectableOrders.length]);

  useEffect(() => {
    const allowedIds = new Set(selectableOrders.map((o) => o._id));
    setSelectedOrders((prev) => prev.filter((id) => allowedIds.has(id)));
  }, [selectableOrders]);

  useEffect(() => {
    if (error) {
      notification.error({
        message: "Failed to load manual orders",
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

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <Title level={2} className="text-gray-800 mb-2">
                Manual Orders
              </Title>
              <Text className="text-gray-600">
                Create and manage manual orders for your customers
              </Text>
            </div>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button
                type="primary"
                size="large"
                icon={<PlusOutlined />}
                onClick={handleCreateOrder}
                className="bg-blue-600 hover:bg-blue-700 border-blue-600 shadow-lg hover:shadow-xl"
              >
                Create Manual Order
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <div className="mb-6">
          <Card className="shadow-sm">
            <Form layout="vertical">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={24} md={12} lg={10}>
                  <Form.Item label="Search">
                    <Input
                      placeholder="Search by order number or customer name..."
                      value={filters.search}
                      onChange={(e) =>
                        handleFiltersChange(
                          { ...filters, search: e.target.value },
                          true
                        )
                      }
                      prefix={<SearchOutlined />}
                      allowClear
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={6} lg={6}>
                  <Form.Item label="Platform">
                    <Select
                      placeholder="All Platforms"
                      value={filters.platform}
                      onChange={(value) =>
                        handleFiltersChange(
                          { ...filters, platform: value },
                          true
                        )
                      }
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {platformsData?.platforms?.map((platform) => (
                        <Select.Option
                          key={platform._id}
                          value={platform._id}
                          label={platform.plt_name}
                        >
                          {platform.plt_name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12} md={6} lg={6}>
                  <Form.Item label="Date Range">
                    <DatePicker.RangePicker
                      value={filters.dateRange}
                      onChange={(dates) =>
                        handleFiltersChange(
                          { ...filters, dateRange: dates },
                          true
                        )
                      }
                      format="YYYY-MM-DD"
                      placeholder={["Start Date", "End Date"]}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={24} md={6} lg={2}>
                  <Form.Item label=" " style={{ marginBottom: 0 }}>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleFiltersReset}
                      style={{ width: "100%" }}
                    >
                      Reset
                    </Button>
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </div>

        {/* Bulk Actions */}
        {selectedOrders.length > 0 && (
          <Card
            className="mb-4"
            style={{ backgroundColor: "#f0f9ff", borderColor: "#3b82f6" }}
          >
            <Row justify="space-between" align="middle">
              <Col>
                <Typography.Text strong style={{ color: "#1e40af" }}>
                  {selectedOrders.length} order(s) selected
                </Typography.Text>
              </Col>
              <Col>
                <Button
                  type="primary"
                  size="small"
                  style={{ backgroundColor: "#059669", borderColor: "#059669" }}
                  loading={isMovingToShipStation}
                  onClick={handleMoveToShipStation}
                >
                  Move to ShipStation
                </Button>
              </Col>
            </Row>
          </Card>
        )}

        {/* Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ManualOrderTable
            orders={filteredOrders}
            loading={isLoading}
            currentPage={currentPage}
            pageSize={pageSize}
            totalOrders={ordersData?.totalOrders || filteredOrders.length}
            onPageChange={handlePageChange}
            onRowClick={handleDrawerOpen}
            showPagination={true}
            showCheckboxes={true}
            selectedOrders={selectedOrders}
            onOrderSelect={handleOrderSelect}
            selectAll={selectAll}
            onSelectAll={handleSelectAll}
          />
        </motion.div>

        {/* Create Manual Order Modal */}
        <CreateManualOrderModal
          visible={isModalVisible}
          onCancel={handleModalCancel}
          onSuccess={handleOrderSuccess}
        />

        {/* Order Details Drawer */}
        <ManualOrderDetailsDrawer
          open={open}
          onClose={handleDrawerClose}
          selectedOrder={selectedOrder}
          orderDetails={orderDetails}
          orderDetailsLoading={orderDetailsLoading}
        />
      </div>
    </div>
  );
};

export default ManualOrdersPage;
