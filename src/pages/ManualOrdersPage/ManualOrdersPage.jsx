import React, { useState, useEffect } from 'react';
import { Button, Card, Typography, Space, notification } from 'antd';
import { PlusOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import CreateManualOrderModal from '../../components/manual-orders/CreateManualOrderModal';
import ManualOrderTable from '../../components/manual-orders/ManualOrderTable';
import ManualOrderFilters from '../../components/manual-orders/ManualOrderFilters';
import ManualOrderDetailsDrawer from '../../components/manual-orders/ManualOrderDetailsDrawer';
import { getManualOrders, getManualOrderDetails } from '../../api/manualOrders';
import Swal from 'sweetalert2';

const { Title, Text } = Typography;

// Dummy data for development
const dummyOrders = [
  {
    _id: '1',
    customerId: 'CUST12345',
    orderNumber: 'ORD-98765',
    plateform: '6890cc6719f58a04b3f95a47',
    customerUsername: 'john_doe',
    customerEmail: 'john.doe@example.com',
    requestShippingService: 'Express Shipping',
    billTo: {
      name: 'John Doe',
      company: 'JD Solutions',
      street1: '123 Main Street',
      street2: 'Suite 456',
      street3: null,
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US',
      phone: '+1-310-555-1234',
      residential: false,
      addressVerified: true,
    },
    shipTo: {
      name: 'John Doe',
      company: 'JD Solutions',
      street1: '123 Main Street',
      street2: 'Suite 456',
      street3: null,
      city: 'Los Angeles',
      state: 'CA',
      postalCode: '90001',
      country: 'US',
      phone: '+1-310-555-1234',
      residential: true,
      addressVerified: true,
    },
    items: [
      { product: '68921e6a904fbf6d73854579', quantity: 2 },
      { product: '68921e6a904fbf6d7385457a', quantity: 1 }
    ],
    order_total: 150.75,
    shipping_amount: 10.00,
    tax_amount: 5.75,
    status: 'processing',
    orderDate: '2025-01-18T12:00:00.000Z'
  },
  {
    _id: '2',
    customerId: 'CUST67890',
    orderNumber: 'ORD-98766',
    plateform: '6890cc6719f58a04b3f95a48',
    customerUsername: 'jane_smith',
    customerEmail: 'jane.smith@example.com',
    requestShippingService: 'Standard Shipping',
    billTo: {
      name: 'Jane Smith',
      company: 'Smith Corp',
      street1: '456 Oak Avenue',
      street2: null,
      street3: null,
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      phone: '+1-212-555-5678',
      residential: false,
      addressVerified: true,
    },
    shipTo: {
      name: 'Jane Smith',
      company: 'Smith Corp',
      street1: '456 Oak Avenue',
      street2: null,
      street3: null,
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      phone: '+1-212-555-5678',
      residential: false,
      addressVerified: true,
    },
    items: [
      { product: '68921e6a904fbf6d7385457b', quantity: 1 }
    ],
    order_total: 89.99,
    shipping_amount: 5.99,
    tax_amount: 4.50,
    status: 'completed',
    orderDate: '2025-01-17T10:30:00.000Z'
  },
  {
    _id: '3',
    customerId: 'CUST11111',
    orderNumber: 'ORD-98767',
    plateform: '6890cc6719f58a04b3f95a49',
    customerUsername: 'bob_wilson',
    customerEmail: 'bob.wilson@example.com',
    requestShippingService: 'Next Day Air',
    billTo: {
      name: 'Bob Wilson',
      company: null,
      street1: '789 Pine Street',
      street2: 'Apt 3B',
      street3: null,
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'US',
      phone: '+1-312-555-9012',
      residential: true,
      addressVerified: false,
    },
    shipTo: {
      name: 'Bob Wilson',
      company: null,
      street1: '789 Pine Street',
      street2: 'Apt 3B',
      street3: null,
      city: 'Chicago',
      state: 'IL',
      postalCode: '60601',
      country: 'US',
      phone: '+1-312-555-9012',
      residential: true,
      addressVerified: false,
    },
    items: [
      { product: '68921e6a904fbf6d7385457c', quantity: 3 },
      { product: '68921e6a904fbf6d7385457d', quantity: 1 }
    ],
    order_total: 245.50,
    shipping_amount: 15.00,
    tax_amount: 12.25,
    status: 'pending',
    orderDate: '2025-01-16T15:45:00.000Z'
  }
];

const ManualOrdersPage = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [open, setOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);

  // Filter state
  const [filters, setFilters] = useState({
    search: "",
    dateRange: null,
    platform: null,
    status: null,
  });

  // Mock data for development - replace with actual API call
  const mockFetchOrders = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let filteredOrders = [...dummyOrders];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredOrders = filteredOrders.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customerId.toLowerCase().includes(searchLower) ||
        order.customerUsername.toLowerCase().includes(searchLower)
      );
    }

    if (filters.platform) {
      filteredOrders = filteredOrders.filter(order => order.plateform === filters.platform);
    }

    if (filters.status) {
      filteredOrders = filteredOrders.filter(order => order.status === filters.status);
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      const startDate = new Date(filters.dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.dateRange[1]);
      endDate.setHours(23, 59, 59, 999);

      filteredOrders = filteredOrders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= startDate && orderDate <= endDate;
      });
    }

    // Simulate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

    return {
      success: true,
      orders: paginatedOrders,
      totalOrders: filteredOrders.length,
      page: currentPage,
      perPage: pageSize,
    };
  };

  // Use React Query for data fetching
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['manualOrders', currentPage, pageSize, filters],
    queryFn: mockFetchOrders,
    keepPreviousData: true,
  });

  // Order details query
  const {
    data: orderDetails,
    isLoading: orderDetailsLoading,
    error: orderDetailsError,
    refetch: refetchOrderDetails,
  } = useQuery({
    queryKey: ['manualOrderDetails', selectedOrder?._id],
    queryFn: () => {
      // For now, return the selected order as details
      return Promise.resolve({ success: true, order: selectedOrder });
    },
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
      platform: null,
      status: null,
    });
    setCurrentPage(1);
  };

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

        {/* Filters */}
        <ManualOrderFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onReset={handleFiltersReset}
        />

        {/* Orders Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ManualOrderTable
            orders={ordersData?.orders || []}
            loading={isLoading}
            currentPage={currentPage}
            pageSize={pageSize}
            totalOrders={ordersData?.totalOrders || 0}
            onPageChange={handlePageChange}
            onRowClick={handleDrawerOpen}
            onEditClick={handleEditClick}
            showPagination={true}
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