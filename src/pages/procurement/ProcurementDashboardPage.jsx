import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FileText,
  ShoppingBag,
  Package,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  Clock,
  CheckCircle,
  Calendar,
} from "lucide-react";
import {
  Card,
  Table,
  Tag,
  Space,
  message,
  Breadcrumb,
  Button,
  Row,
  Col,
  DatePicker,
} from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import { getDashboardStats } from "../../api/procurement";
import StatusBadge from "./components/StatusBadge";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export default function ProcurementDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Memoize date range params to prevent unnecessary API calls
  const dateRangeParams = useMemo(() => {
    if (!dateRange || dateRange.length !== 2) return null;
    return {
      startDate: dateRange[0].startOf("day").toISOString(),
      endDate: dateRange[1].endOf("day").toISOString(),
    };
  }, [dateRange?.[0]?.toISOString(), dateRange?.[1]?.toISOString()]);

  useEffect(() => {
    loadDashboardStats();
  }, [dateRangeParams]);

  const loadDashboardStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = dateRangeParams || {};
      const response = await getDashboardStats(params);
      setStats(response?.data || null);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
      setError("Failed to load dashboard statistics");
      message.error(
        error?.response?.data?.error?.message ||
          "Failed to load dashboard statistics"
      );
    } finally {
      setLoading(false);
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

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return dayjs(dateString).format("MMM DD, YYYY");
    } catch {
      return "-";
    }
  };

  const getChangeIndicator = (changeType, change) => {
    if (!changeType || !change) return null;
    const isIncrease = changeType === "increase";
    const color = isIncrease ? "text-green-600" : "text-red-600";
    const Icon = isIncrease ? ArrowUp : ArrowDown;

    return (
      <div className={`flex items-center gap-1 text-sm ${color}`}>
        <Icon size={14} />
        <span>{Math.abs(change)}</span>
      </div>
    );
  };

  const statsCards = stats
    ? [
        {
          title: "Total Purchase Orders",
          value: stats.totalOrders?.value || 0,
          change: stats.totalOrders?.change,
          changeType: stats.totalOrders?.changeType,
          changePercentage: stats.totalOrders?.changePercentage,
          icon: FileText,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        },
        {
          title: "Purchase Orders Draft",
          value: stats.draftCount?.value || 0,
          change: stats.draftCount?.change,
          changeType: stats.draftCount?.changeType,
          changePercentage: stats.draftCount?.changePercentage,
          icon: ShoppingBag,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
        },
        {
          title: "Purchase Orders Confirmed",
          value: stats.confirmedCount?.value || 0,
          change: stats.confirmedCount?.change,
          changeType: stats.confirmedCount?.changeType,
          changePercentage: stats.confirmedCount?.changePercentage,
          icon: Package,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        },
        {
          title: "Total Procurement Cost",
          value: formatCurrency(
            stats.totalSpend?.value || 0,
            stats.totalSpend?.currency || "USD"
          ),
          change: stats.totalSpend?.change,
          changeType: stats.totalSpend?.changeType,
          changePercentage: stats.totalSpend?.changePercentage,
          icon: TrendingUp,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
        },
      ]
    : [];

  const recentOrdersColumns = [
    {
      title: "Order ID",
      dataIndex: "reference",
      key: "reference",
      width: 120,
      render: (ref, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/procurement/orders/${record._id}`)}
          className="p-0 h-auto font-semibold"
        >
          {ref}
        </Button>
      ),
    },
    {
      title: "Vendor",
      key: "vendor",
      width: 200,
      render: (_, record) => record.vendor?.name || "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 120,
      align: "right",
      render: (total, record) => (
        <span className="font-medium">
          {formatCurrency(total, record.currency)}
        </span>
      ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (date) => formatDate(date),
    },
  ];

  const overdueOrdersColumns = [
    {
      title: "Order ID",
      dataIndex: "reference",
      key: "reference",
      width: 120,
      render: (ref, record) => (
        <Button
          type="link"
          onClick={() => navigate(`/procurement/orders/${record._id}`)}
          className="p-0 h-auto font-semibold"
        >
          {ref}
        </Button>
      ),
    },
    {
      title: "Vendor",
      key: "vendor",
      width: 200,
      render: (_, record) => record.vendor?.name || "-",
    },
    {
      title: "Deadline",
      dataIndex: "orderDeadline",
      key: "orderDeadline",
      width: 120,
      render: (date) => formatDate(date),
    },
    {
      title: "Days Overdue",
      dataIndex: "daysOverdue",
      key: "daysOverdue",
      width: 120,
      render: (days) => (
        <Tag color="red">
          <Clock size={12} className="inline mr-1" />
          {days} days
        </Tag>
      ),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      width: 120,
      align: "right",
      render: (total, record) => (
        <span className="font-medium">
          {formatCurrency(total, record.currency)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-[1480px] mx-auto">
          <Skeleton height={32} width={300} style={{ marginBottom: 24 }} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} size="small">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton height={48} width={48} circle />
                  <Skeleton height={20} width={60} />
                </div>
                <Skeleton height={20} width={150} style={{ marginBottom: 8 }} />
                <Skeleton height={32} width={100} />
              </Card>
            ))}
          </div>
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Card size="small">
                <Skeleton height={40} style={{ marginBottom: 16 }} />
                <Skeleton height={200} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small">
                <Skeleton height={40} style={{ marginBottom: 16 }} />
                <Skeleton height={200} />
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-[1480px] mx-auto">
          <Card>
            <div className="text-center py-12">
              <AlertCircle
                className="text-5xl text-red-400 mb-4 mx-auto"
                size={48}
              />
              <h2 className="text-xl font-bold mb-2">
                Failed to Load Dashboard
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={loadDashboardStats}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-[1480px] mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item>
            <Link to="/">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/procurement">Procurement</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Procurement Dashboard
              </h1>
              <p className="text-gray-600">
                Manage your procurement processes, orders, and supplier
                relationships
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <RangePicker
                value={dateRange}
                onChange={(dates) => setDateRange(dates)}
                format="YYYY-MM-DD"
                allowClear
                placeholder={["Start Date", "End Date"]}
                size="middle"
              />
              {dateRange && (
                <Button
                  size="small"
                  onClick={() => setDateRange(null)}
                  type="text"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <Card size="small" className="mb-8 bg-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/procurement/orders"
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200 text-gray-600 hover:text-blue-600 font-medium"
            >
              <FileText className="w-5 h-5" />
              View Purchase Orders
            </Link>
            <Link
              to="/procurement/orders/new"
              className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors duration-200 text-gray-600 hover:text-green-600 font-medium"
            >
              <ShoppingBag className="w-5 h-5" />
              Create Draft
            </Link>
            {/* <button className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors duration-200 text-gray-600 hover:text-purple-600 font-medium">
              <Package className="w-5 h-5" />
              View Contracts
            </button> */}
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((stat, index) => (
            <Card
              key={index}
              className={`${stat.bgColor} ${stat.borderColor} border-2`}
              size="small"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`${stat.color} p-3 rounded-lg bg-white shadow-sm`}
                >
                  <stat.icon className="w-6 h-6" />
                </div>
                {getChangeIndicator(stat.changeType, stat.change)}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                {stat.title}
              </h3>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              {stat.changePercentage && (
                <p className="text-xs text-gray-500 mt-1">
                  {stat.changePercentage > 0 ? "+" : ""}
                  {stat.changePercentage}% from previous period
                </p>
              )}
            </Card>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Recent Orders */}
          <Card
            className="bg-gray-100"
            title={
              <Space>
                <FileText size={18} />
                <span>Recent Orders</span>
              </Space>
            }
            extra={
              <Link to="/procurement/orders">
                <button className="text-blue-600 hover:text-blue-700 text-sm">
                  View All
                </button>
              </Link>
            }
            size="small"
          >
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              <div className="overflow-x-auto -mx-4 px-4">
                <Table
                  className="[&_.ant-table-thead>tr>th]:bg-white"
                  columns={recentOrdersColumns}
                  dataSource={stats.recentOrders}
                  rowKey={(record) => record._id}
                  pagination={false}
                  size="small"
                  scroll={{ x: "max-content" }}
                  onRow={(record) => ({
                    onClick: () =>
                      navigate(`/procurement/orders/${record._id}`),
                    className: "cursor-pointer",
                  })}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent orders</p>
              </div>
            )}
          </Card>

          {/* Overdue Orders */}
          <Card
            className="bg-gray-100"
            title={
              <Space>
                <AlertCircle size={18} className="text-red-600" />
                <span>
                  Overdue Orders
                  {stats?.overdueOrders?.count > 0 && (
                    <Tag color="red" className="ml-2">
                      {stats.overdueOrders.count}
                    </Tag>
                  )}
                </span>
              </Space>
            }
            extra={
              stats?.overdueOrders?.count > 0 && (
                <Link to="/procurement/orders?status=overdue">
                  <button className="text-blue-600 hover:text-blue-700 text-sm">
                    View All
                  </button>
                </Link>
              )
            }
            size="small"
          >
            {stats?.overdueOrders?.orders &&
            stats.overdueOrders.orders.length > 0 ? (
              <div className="overflow-x-auto -mx-4 px-4">
                <Table
                  className="[&_.ant-table-thead>tr>th]:bg-white"
                  columns={overdueOrdersColumns}
                  dataSource={stats.overdueOrders.orders}
                  rowKey={(record) => record._id}
                  pagination={false}
                  size="small"
                  scroll={{ x: "max-content" }}
                  onRow={(record) => ({
                    onClick: () =>
                      navigate(`/procurement/orders/${record._id}`),
                    className: "cursor-pointer",
                  })}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm">No overdue orders</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
