import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  Card,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Tag,
  Row,
  Col,
  Breadcrumb,
} from "antd";
import dayjs from "dayjs";
import { Plus, RefreshCcw, Star } from "lucide-react";
import { toggleFavorite } from "../../api/procurement";
import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import {
  getPurchaseOrders,
  getVendors,
  getCompanies,
  getUsers,
} from "../../api/procurement";
import StatusBadge from "./components/StatusBadge";
import ReceiptBadge from "./components/ReceiptBadge";
import ProcurementTableSkeleton from "./components/ProcurementTableSkeleton";

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

/**
 * Purchase Orders List Page
 * Clean, compact design with Ant Design components
 */
const PurchaseOrdersListPage = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: undefined,
    vendor: undefined,
    company: undefined,
    dateRange: undefined,
    favorite: undefined,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
  });

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [vendorsData, companiesData, buyersData] = await Promise.all([
          getVendors({ limit: 1000 }),
          getCompanies(),
          getUsers(),
        ]);
        setVendors(vendorsData || []);
        setCompanies(companiesData || []);
        setBuyers(buyersData || []);
      } catch (error) {
        console.error("Failed to load dropdown data:", error);
      }
    };
    loadDropdownData();
  }, []);

  // Load purchase orders
  useEffect(() => {
    loadPurchaseOrders();
  }, [filters, pagination.page]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: filters.search || undefined,
        status: filters.status || undefined,
        vendor: filters.vendor || undefined,
        company: filters.company || undefined,
        favorite: filters.favorite !== undefined ? String(filters.favorite) : undefined,
      };

      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        // Ant Design RangePicker returns dayjs objects
        params.dateFrom = filters.dateRange[0].startOf("day").toISOString();
        params.dateTo = filters.dateRange[1].endOf("day").toISOString();
      }

      const response = await getPurchaseOrders(params);
      const orders = response.data || [];
      setPurchaseOrders(orders);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total || 0,
      }));
    } catch (error) {
      console.error("Failed to load purchase orders:", error);
      setPurchaseOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  const formatCurrency = (amount, currency = "USD") => {
    if (!amount && amount !== 0) {
      if (currency === "JPY") return "¥0";
      return "$0.00";
    }
    
    // JPY doesn't use decimal places
    if (currency === "JPY") {
      return new Intl.NumberFormat("ja-JP", {
        style: "currency",
        currency: "JPY",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    }
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getDaysAgo = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date - now;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "1 day ago";
      if (diffDays === -1) return "1 day overdue";
      if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
      if (diffDays < 7) return `${diffDays} days ago`;
      return formatDate(dateString);
    } catch {
      return "-";
    }
  };

  const isOverdue = (deadline) => {
    if (!deadline) return false;
    try {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return deadlineDate < today;
    } catch {
      return false;
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: undefined,
      vendor: undefined,
      company: undefined,
      dateRange: undefined,
      favorite: undefined,
    });
  };

  const getVendorName = (po) => {
    const vendorId = po.vendor?.id || po.vendor?._id || po.vendor;
    const vendor = vendors.find((v) => v.id === vendorId || v._id === vendorId);
    return vendor?.name || po.vendor?.name || "-";
  };

  const getCompanyName = (po) => {
    const companyId = po.company?.id || po.company?._id || po.company;
    const company = companies.find((c) => c.id === companyId || c._id === companyId);
    return company?.name || po.company?.name || "-";
  };

  const getBuyerName = (po) => {
    const buyerId = po.buyer?.id || po.buyer?._id || po.buyer;
    const buyer = buyers.find((b) => b.id === buyerId || b._id === buyerId);
    return buyer?.name || po.buyer?.name || "-";
  };

  const handleToggleFavorite = async (poId, e) => {
    e.stopPropagation();
    try {
      const response = await toggleFavorite(poId);
      if (response.success) {
        setPurchaseOrders((prev) =>
          prev.map((po) =>
            (po._id || po.id) === poId
              ? { ...po, isFavorite: response.data.isFavorite }
              : po
          )
        );
        Swal.fire({
          icon: "success",
          title: response.data.isFavorite ? "Added to Favorites" : "Removed from Favorites",
          text: response.data.isFavorite
            ? "Purchase order has been marked as favorite"
            : "Purchase order has been removed from favorites",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Update Favorite",
        text: error?.response?.data?.error?.message || "Failed to update favorite status",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    }
  };

  const columns = [
    {
      title: "",
      key: "favorite",
      width: 50,
      fixed: "left",
      render: (_, record) => (
        <Button
          type="text"
          icon={
            <Star
              className={
                record.isFavorite
                  ? "fill-yellow-400 text-yellow-500"
                  : "text-gray-300"
              }
              size={16}
            />
          }
          onClick={(e) => handleToggleFavorite(record._id || record.id, e)}
          size="small"
        />
      ),
    },
    {
      title: "Date Created",
      dataIndex: "createdDate",
      key: "createdDate",
      width: 120,
      render: (date, record) => formatDate(date || record.createdAt),
    },
    {
      title: "Order ID",
      dataIndex: "reference",
      key: "reference",
      width: 100,
      render: (ref, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/procurement/orders/${record._id || record.id}`)}
          className="p-0 h-auto font-semibold"
        >
          {ref || record._id || record.id}
        </Button>
      ),
    },
    {
      title: "Vendor",
      key: "vendor",
      width: 150,
      render: (_, record) => getVendorName(record),
    },
    {
      title: "Company",
      key: "company",
      width: 150,
      render: (_, record) => getCompanyName(record),
    },
    {
      title: "Buyer",
      key: "buyer",
      width: 150,
      render: (_, record) => getBuyerName(record),
    },
    {
      title: "Deadline",
      dataIndex: "orderDeadline",
      key: "orderDeadline",
      width: 130,
      render: (date) => (
        <span className={`whitespace-nowrap ${isOverdue(date) ? "text-red-600 font-medium" : ""}`}>
          {getDaysAgo(date)}
        </span>
      ),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 120,
      align: "right",
      render: (total, record) => (
        <span className="font-medium">{formatCurrency(total, record.currency)}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Receipt",
      dataIndex: "receiptStatus",
      key: "receiptStatus",
      width: 130,
      render: (status) => <ReceiptBadge status={status || "none"} />,
    },
  ];

  return (
    <div className="p-4">
      <div className="max-w-full">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item>
            <Link to="/">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/procurement">Procurement</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Purchase Orders</Breadcrumb.Item>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Purchase Orders</h1>
            <p className="text-xs sm:text-sm text-gray-600">Manage and track all purchase orders</p>
          </div>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/procurement/orders/new")}
            size="middle"
            className="w-full sm:w-auto"
          >
            <span className="hidden sm:inline">New Purchase Order</span>
            <span className="sm:hidden">New Order</span>
          </Button>
        </div>

        {/* Filters - Always Visible */}
        <Card size="small" className="mb-4">
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Search
                placeholder="Search PO ID, vendor, company..."
                allowClear
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onSearch={loadPurchaseOrders}
                size="middle"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <Select
                allowClear
                placeholder="Status"
                value={filters.status}
                onChange={(value) => setFilters({ ...filters, status: value })}
                style={{ width: "100%" }}
                size="middle"
              >
                <Option value="draft">Draft</Option>
                <Option value="confirmed">Confirmed</Option>
                <Option value="pickup_scheduled">Pickup Scheduled</Option>
                <Option value="in_transit">In Transit</Option>
                <Option value="received">Received</Option>
                <Option value="cancelled">Cancelled</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Select
                allowClear
                showSearch
                placeholder="Vendor"
                value={filters.vendor}
                onChange={(value) => setFilters({ ...filters, vendor: value })}
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: "100%" }}
                size="middle"
                options={vendors.map((v) => ({ value: v.id, label: v.name }))}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={5}>
              <Select
                allowClear
                showSearch
                placeholder="Company"
                value={filters.company}
                onChange={(value) => setFilters({ ...filters, company: value })}
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                style={{ width: "100%" }}
                size="middle"
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={4}>
              <RangePicker
                allowClear
                value={filters.dateRange}
                onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
                style={{ width: "100%" }}
                size="middle"
                format="MM/DD/YYYY"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={3}>
              <Select
                allowClear
                placeholder="Favorites"
                value={filters.favorite}
                onChange={(value) => setFilters({ ...filters, favorite: value })}
                style={{ width: "100%" }}
                size="middle"
              >
                <Option value={true}>Favorites Only</Option>
                <Option value={false}>Non-Favorites</Option>
              </Select>
            </Col>
          </Row>
          <Row gutter={[12, 12]} className="mt-2">
            <Col span={24}>
              <Space>
                <Button size="small" onClick={loadPurchaseOrders} icon={<RefreshCcw size={14} />}>
                  Refresh
                </Button>
                <Button size="small" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Desktop Table View */}
        <Card size="small" className="hidden md:block">
          {loading ? (
            <ProcurementTableSkeleton />
          ) : (
            <Table
              columns={columns}
              dataSource={purchaseOrders}
              rowKey={(record) => record._id || record.id}
              loading={loading}
              pagination={{
                current: pagination.page,
                pageSize: pagination.limit,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} orders`,
                onChange: (page, pageSize) => {
                  setPagination({ page, limit: pageSize, total: pagination.total });
                },
              }}
              scroll={{ x: 1200 }}
              size="middle"
              onRow={(record) => ({
                onClick: () => navigate(`/procurement/orders/${record._id || record.id}`),
                className: "cursor-pointer",
              })}
            />
          )}
        </Card>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i} size="small" loading={true} />
              ))}
            </div>
          ) : purchaseOrders.length === 0 ? (
            <Card size="small">
              <div className="text-center py-8 text-gray-500">
                <p>No purchase orders found</p>
              </div>
            </Card>
          ) : (
            purchaseOrders.map((order) => (
              <Card
                key={order._id || order.id}
                size="small"
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/procurement/orders/${order._id || order.id}`)}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Button
                      type="text"
                      icon={
                        <Star
                          className={
                            order.isFavorite
                              ? "fill-yellow-400 text-yellow-500"
                              : "text-gray-300"
                          }
                          size={16}
                        />
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(order._id || order.id, e);
                      }}
                      size="small"
                      className="shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {order.reference || order._id || order.id}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(order.createdDate || order.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={order.status} />
                    <ReceiptBadge status={order.receiptStatus || "none"} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm pt-3 border-t">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Vendor</div>
                    <div className="font-medium text-gray-900">{getVendorName(order) || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Company</div>
                    <div className="font-medium text-gray-900">{getCompanyName(order) || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Buyer</div>
                    <div className="font-medium text-gray-900">{getBuyerName(order) || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Deadline</div>
                    <div className={`font-medium text-gray-900 ${isOverdue(order.orderDeadline) ? "text-red-600" : ""}`}>
                      {getDaysAgo(order.orderDeadline)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-gray-400 text-xs mb-1">Total</div>
                    <div className="font-bold text-lg text-gray-900">
                      {formatCurrency(order.total, order.currency)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Mobile Pagination */}
        {!loading && purchaseOrders.length > 0 && (
          <div className="md:hidden mt-4 flex justify-center">
            <Space>
              <Button
                size="small"
                disabled={pagination.page === 1}
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </span>
              <Button
                size="small"
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              >
                Next
              </Button>
            </Space>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrdersListPage;
