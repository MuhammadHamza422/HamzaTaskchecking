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
  Skeleton,
  Breadcrumb,
} from "antd";
import dayjs from "dayjs";
import { Plus, RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getPurchaseOrders,
  getVendors,
  getCompanies,
  getUsers,
} from "../../api/procurement";
import StatusBadge from "./components/StatusBadge";
import ReceiptBadge from "./components/ReceiptBadge";

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
    if (!amount && amount !== 0) return "$0.00";
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

  const columns = [
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Purchase Orders</h1>
            <p className="text-sm text-gray-600">Manage and track all purchase orders</p>
          </div>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/procurement/orders/new")}
            size="middle"
          >
            New Purchase Order
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

        {/* Table */}
        <Card size="small">
          {loading ? (
            <Skeleton active paragraph={{ rows: 8 }} />
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
      </div>
    </div>
  );
};

export default PurchaseOrdersListPage;
