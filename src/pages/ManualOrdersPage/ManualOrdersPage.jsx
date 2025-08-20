import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Typography, Space, notification, message, Input, Select, DatePicker, Row, Col, Form } from 'antd';
import { PlusOutlined, ShoppingCartOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import CreateManualOrderModal from '../../components/manual-orders/CreateManualOrderModal';
import ManualOrderTable from '../../components/manual-orders/ManualOrderTable';
import ManualOrderDetailsDrawer from '../../components/manual-orders/ManualOrderDetailsDrawer';
import { getManualOrders, getManualOrderDetails } from '../../api/manualOrders';
import Swal from 'sweetalert2';
import apiClient from '../../api/client';
import dayjs from 'dayjs';

const { Title, Text } = Typography;



const ManualOrdersPage = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isMovingToShipStation, setIsMovingToShipStation] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    dateRange: null,
    platform: null,
  });

  // Real API call for fetching manual orders
  const fetchOrders = async () => {
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
  };

  // Use React Query for data fetching
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['manualOrders', currentPage, pageSize, filters.search],
    queryFn: fetchOrders,
    keepPreviousData: true,
  });

  // Fetch platforms for filter dropdown
  const { data: platformsData } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/plateforms/all");
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Order details query
  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
    error: orderDetailsError,
    refetch: refetchOrderDetails,
  } = useQuery({
    queryKey: ['manualOrderDetails', selectedOrder?._id],
    queryFn: () => getManualOrderDetails(selectedOrder._id),
    enabled: !!selectedOrder?._id && open,
  });

  const handleCreateOrder = () => {
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleOrderSuccess = (response) => {
    console.log('Order created successfully:', response);
    refetch(); // Refresh the orders list
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
      platform: null,
    });
    setCurrentPage(1);
    setSelectedOrders([]);
    setSelectAll(false);
  };

  // Compute filtered orders with stable identity
  const filteredOrders = useMemo(() => {
    if (!ordersData?.orders) return [];
    let filtered = ordersData.orders;
    
    // Search filter
    if (filters.search) {
      const q = String(filters.search).toLowerCase();
      filtered = filtered.filter((order) =>
        order.orderNumber?.toString().toLowerCase().includes(q) ||
        order.customerId?.toString().toLowerCase().includes(q) ||
        order.customerUsername?.toLowerCase().includes(q)
      );
    }
    
    // Platform filter
    if (filters.platform) {
      const platformId = filters.platform;
      filtered = filtered.filter((order) => {
        const orderPlatformId = order.plateform?._id || order.plateform;
        return String(orderPlatformId) === String(platformId);
      });
    }
    
    // Date range filter
    if (filters.dateRange && filters.dateRange.length === 2) {
      const startDate = new Date(filters.dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.dateRange[1]);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.orderDate || order.createdAt);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }
    
    return filtered;
  }, [ordersData?.orders, filters.search, filters.platform, filters.dateRange]);
  const totalFilteredOrders = filteredOrders.length;

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

  // Build ShipStation order payload for Manual Orders
  const buildShipStationOrderFromManual = (order) => {
    const items = [];
    const productTitles = [];
    
    if (order.items && Array.isArray(order.items)) {
      for (const item of order.items) {
        if (item.product?.pro_title) {
          productTitles.push(item.product.pro_title);
        }
        items.push({
          lineItemKey: item.product?._id || `item-${item.product?._id}`,
          sku: item.product?.sku || String(item.product?._id || ""),
          name: item.product?.pro_title || "Product",
          imageUrl: null,
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.product?.sale_price || 0),
          taxAmount: null,
          shippingAmount: null,
          productId: Number(item.product?.uid) || undefined,
        });
      }
    }

    const orderDate = formatDateForShipStation(order.orderDate || order.createdAt || new Date());
    const shipTo = order.shipTo || {};
    const billTo = order.billTo || {};

    const advancedOptions = {};
    if (productTitles[0]) advancedOptions.customField1 = productTitles[0];
    if (productTitles[1]) advancedOptions.customField2 = productTitles[1];
    if (productTitles[2]) advancedOptions.customField3 = productTitles[2];

    return {
      orderNumber: String(order.orderNumber || order._id || ""),
      orderKey: String(order._id || order.orderNumber || ""),
      orderDate: orderDate,
      orderStatus: "awaiting_shipment",
      customerId: order.customerId || undefined,
      customerUsername: order.customerUsername || undefined,
      customerEmail: order.customerEmail || undefined,
      billTo: {
        name: billTo.name || null,
        company: billTo.company || null,
        street1: billTo.street1 || null,
        street2: billTo.street2 || null,
        street3: billTo.street3 || null,
        city: billTo.city || null,
        state: billTo.state || null,
        postalCode: billTo.postalCode || null,
        country: normalizeCountryCode(billTo.country) || null,
        phone: billTo.phone || null,
        residential: billTo.residential || null,
      },
      shipTo: {
        name: shipTo.name || null,
        company: shipTo.company || null,
        street1: shipTo.street1 || null,
        street2: shipTo.street2 || null,
        street3: shipTo.street3 || null,
        city: shipTo.city || null,
        state: shipTo.state || null,
        postalCode: shipTo.postalCode || null,
        country: normalizeCountryCode(shipTo.country) || null,
        phone: shipTo.phone || null,
        residential: shipTo.residential || true,
      },
      items,
      requestedShippingService: order.requestedShippingService || null,
      amountPaid: Number(order.order_total) || undefined,
      taxAmount: Number(order.tax_amount) || undefined,
      shippingAmount: Number(order.shipping_amount) || undefined,
      gift: false,
      paymentMethod: undefined,
      advancedOptions,
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
        const rawPid = ord?.plateform?._id ?? ord?.plateform ?? "";
        const pid = typeof rawPid === "object" ? rawPid?._id : String(rawPid);
        if (!pid) continue;
        if (!platformToOrders.has(pid)) platformToOrders.set(pid, []);
        platformToOrders.get(pid).push(ord);
      }

      for (const [platformId, orders] of platformToOrders.entries()) {
        if (!platformId) {
          console.warn(
            "Skipping ShipStation post due to missing platformId for orders",
            orders?.map((o) => o?.orderNumber)
          );
          continue;
        }

        // Build orderData list
        let orderData = orders
          .map((ord) => buildShipStationOrderFromManual(ord))
          .filter(Boolean);

        // Ensure we don't send orders without items
        orderData = orderData.filter(
          (od) => Array.isArray(od?.items) && od.items.length > 0
        );

        const payload = { plateformId: String(platformId), orders: orderData };
        console.log("Posting ShipStation payload", payload);

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
                {/* Search Input */}
                <Col xs={24} sm={24} md={12} lg={10}>
                  <Form.Item label="Search">
                    <Input
                      placeholder="Search by order number or customer name..."
                      value={filters.search}
                      onChange={(e) => handleFiltersChange({ ...filters, search: e.target.value }, true)}
                      prefix={<SearchOutlined />}
                      allowClear
                    />
                  </Form.Item>
                </Col>

                {/* Platform Filter */}
                <Col xs={24} sm={12} md={6} lg={6}>
                  <Form.Item label="Platform">
                    <Select
                      placeholder="All Platforms"
                      value={filters.platform}
                      onChange={(value) => handleFiltersChange({ ...filters, platform: value }, true)}
                      allowClear
                      showSearch
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {platformsData?.platforms?.map((platform) => (
                        <Select.Option key={platform._id} value={platform._id} label={platform.plt_name}>
                          {platform.plt_name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                {/* Date Range Filter */}
                <Col xs={24} sm={12} md={6} lg={6}>
                  <Form.Item label="Date Range">
                    <DatePicker.RangePicker
                      value={filters.dateRange}
                      onChange={(dates) => handleFiltersChange({ ...filters, dateRange: dates }, true)}
                      format="YYYY-MM-DD"
                      placeholder={['Start Date', 'End Date']}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>

                {/* Reset Filters Button */}
                <Col xs={24} sm={24} md={6} lg={2}>
                  <Form.Item label=" " style={{ marginBottom: 0 }}>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={handleFiltersReset}
                      style={{ width: '100%' }}
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
            <Card className="mb-4" style={{ backgroundColor: '#f0f9ff', borderColor: '#3b82f6' }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Typography.Text strong style={{ color: '#1e40af' }}>
                    {selectedOrders.length} order(s) selected
                  </Typography.Text>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    size="small"
                    style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                    loading={isMovingToShipStation}
                    disabled={isMovingToShipStation}
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
            totalOrders={ordersData?.totalOrders || totalFilteredOrders}
            onPageChange={handlePageChange}
            onRowClick={handleDrawerOpen}
            onEditClick={handleEditClick}
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