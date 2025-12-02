import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Input, Select, DatePicker, Button, Tag, Space, Card, Row, Col, message, Tooltip, Badge } from "antd";
import { SearchOutlined, ReloadOutlined, FilterOutlined, CalendarOutlined } from "@ant-design/icons";
import { format } from "date-fns";
import { getSSOTOrders } from "../../api/ssot";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;
const { Option } = Select;

const SsotPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0,
  });

  // Filter states
  const [searchText, setSearchText] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [packingStatus, setPackingStatus] = useState(null);
  const [dropshipStatus, setDropshipStatus] = useState(null);
  const [shippingStatus, setShippingStatus] = useState(null);
  const [fulfillmentStatus, setFulfillmentStatus] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Fetch orders from API
  const fetchOrders = useCallback(async (page = 1, pageSize = 50) => {
    setLoading(true);
    try {
      const filters = {
        page,
        pageSize,
      };

      if (searchText) filters.search = searchText;
      if (selectedPlatform) filters.platform = selectedPlatform;
      if (packingStatus) filters.packingStatus = packingStatus;
      if (dropshipStatus) filters.dropshipStatus = dropshipStatus;
      if (shippingStatus) filters.shippingStatus = shippingStatus;
      if (fulfillmentStatus) filters.fulfillmentStatus = fulfillmentStatus;
      if (dateRange && dateRange.length === 2) {
        filters.startDate = dateRange[0].toISOString();
        filters.endDate = dateRange[1].toISOString();
      }

      const response = await getSSOTOrders(filters);
      
      if (response.success && response.data) {
        setOrders(response.data.orders || []);
        setPagination({
          current: response.data.pagination?.page || page,
          pageSize: response.data.pagination?.pageSize || pageSize,
          total: response.data.pagination?.total || 0,
          totalPages: response.data.pagination?.totalPages || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching SSOT orders:", error);
      message.error(error.message || "Failed to fetch orders");
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedPlatform, packingStatus, dropshipStatus, shippingStatus, fulfillmentStatus, dateRange]);

  // Initial load
  useEffect(() => {
    fetchOrders(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(1, pagination.pageSize);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  // Handle filter changes
  useEffect(() => {
    fetchOrders(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlatform, packingStatus, dropshipStatus, shippingStatus, fulfillmentStatus, dateRange]);

  const handleClearFilters = () => {
    setSearchText("");
    setSelectedPlatform(null);
    setPackingStatus(null);
    setDropshipStatus(null);
    setShippingStatus(null);
    setFulfillmentStatus(null);
    setDateRange(null);
  };

  const handleTableChange = (newPagination) => {
    fetchOrders(newPagination.current, newPagination.pageSize);
  };

  const handleRowClick = (record) => {
    navigate(`/fulfillment/ssot/details/${encodeURIComponent(record.platform)}/${encodeURIComponent(record.orderId)}`, {
      state: { orderNumber: record.orderNumber },
    });
  };

  const handleRefresh = () => {
    fetchOrders(pagination.current, pagination.pageSize);
  };

  // Helper component for Status Pills
  const StatusPill = ({ status, type }) => {
    if (!status || status === "N/A") return <span className="text-gray-400 text-xs">-</span>;
    
    let colorClass = "bg-gray-100 text-gray-600 border-gray-200";
    
    const s = status.toLowerCase();
    if (s.includes("completely") || s.includes("shipped") || s === "fulfilled") {
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (s.includes("partially") || s === "pending") {
      colorClass = "bg-amber-50 text-amber-700 border-amber-200";
    } else if (s.includes("unfulfilled") || s.includes("invalid") || s.includes("error")) {
      colorClass = "bg-rose-50 text-rose-700 border-rose-200";
    } else if (s.includes("not")) {
      colorClass = "bg-slate-50 text-slate-500 border-slate-200";
    }

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${colorClass} whitespace-nowrap`}>
        {status}
      </span>
    );
  };

  const columns = [
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      width: 80,
      align: "center",
      render: (platformName) => {
        const platformIcons = {
          shopify: "/shopify-icon.png",
          woocommerce: "/woocommerce icon.png",
          walmart: "/Walmart_App_icon.png",
        };
        const iconPath = platformIcons[platformName?.toLowerCase()];
        return (
          <Tooltip title={platformName?.charAt(0).toUpperCase() + platformName?.slice(1)}>
            <div className="flex items-center justify-center h-full">
              {iconPath ? (
                <img src={iconPath} alt={platformName} className="w-6 h-6 object-contain hover:scale-110 transition-transform" />
              ) : (
                <Tag>{platformName?.substring(0, 2).toUpperCase()}</Tag>
              )}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "Order No.",
      dataIndex: "orderNumber",
      key: "orderNumber",
      width: 120,
      render: (text) => <span className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer">{text}</span>,
    },
    {
      title: "Processed Via",
      dataIndex: "processedVia",
      key: "processedVia",
      width: 150,
      render: (text) => <span className="text-gray-600 text-xs">{text}</span>,
    },
    {
      title: "Packing",
      dataIndex: ["packing", "status"],
      key: "packingStatus",
      width: 140,
      render: (status) => <StatusPill status={status} />,
    },
    {
      title: "Packed",
      key: "packingDetails",
      width: 120,
      render: (_, record) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-gray-700">{record.packing?.itemsPacked || 0} Items</span>
          <span className="text-gray-400 text-[10px]">{record.packing?.packedBy?.name?.split(" ")[0] || "-"}</span>
        </div>
      ),
    },
    {
      title: "Shipping",
      dataIndex: ["warehouseShipping", "status"],
      key: "whShippingStatus",
      width: 140,
      render: (status) => <StatusPill status={status} />,
    },
    {
      title: "Dropship",
      key: "dsDetails",
      width: 140,
      render: (_, record) => (
        <div className="flex flex-col gap-1">
          <StatusPill status={record.dropship?.status} />
          {record.dropship?.items > 0 && (
            <span className="text-[10px] text-gray-400 pl-1">{record.dropship?.items} Items</span>
          )}
        </div>
      ),
    },
    {
      title: "Fulfillment",
      dataIndex: "fulfillmentStatus",
      key: "fulfillmentStatus",
      width: 150,
      render: (status) => {
        const display = status?.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        return <StatusPill status={display} />;
      },
    },
    {
      title: "From",
      dataIndex: "fulfilledFrom",
      key: "fulfilledFrom",
      width: 120,
      render: (text) => <span className="text-xs text-gray-500 truncate block max-w-[120px]" title={text}>{text || "-"}</span>,
    },
    {
      title: "Timestamps",
      key: "timestamps",
      width: 160,
      render: (_, record) => (
        <div className="flex flex-col text-[10px] text-gray-500 gap-0.5">
          <div className="flex justify-between"><span>Ordered:</span> <span className="text-gray-700">{record.timestamps?.orderTS ? format(new Date(record.timestamps.orderTS), "MM/dd HH:mm") : "-"}</span></div>
          {record.timestamps?.shippedAt && <div className="flex justify-between"><span className="text-emerald-600">Shipped:</span> <span className="text-emerald-700 font-medium">{format(new Date(record.timestamps.shippedAt), "MM/dd HH:mm")}</span></div>}
        </div>
      ),
    },
    {
      title: "Efficiency (FE%)",
      key: "efficiency",
      width: 180,
      render: (_, record) => {
        const overall = record.efficiency?.overallFE;
        return (
          <div className="flex items-center gap-2">
             <div className="flex flex-col items-center">
                <span className="text-[9px] text-gray-400 uppercase">Overall</span>
                <span className={`text-sm font-bold ${!overall ? 'text-gray-300' : overall >= 100 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {overall ?? "-"}%
                </span>
             </div>
             <div className="h-6 w-px bg-gray-200 mx-1"></div>
             <div className="flex flex-col gap-0.5">
                <div className="flex items-center justify-between w-16 text-[10px]">
                  <span className="text-gray-400">DEO</span>
                  <span className={record.efficiency?.deoFE >= 100 ? "text-emerald-600" : "text-rose-600"}>{record.efficiency?.deoFE ?? "-"}%</span>
                </div>
                <div className="flex items-center justify-between w-16 text-[10px]">
                  <span className="text-gray-400">WH</span>
                  <span className={record.efficiency?.whFE >= 100 ? "text-emerald-600" : "text-rose-600"}>{record.efficiency?.whFE ?? "-"}%</span>
                </div>
             </div>
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">SSOT Dashboard</h1>
              <p className="text-slate-500 text-sm mt-1">Single Source of Truth for Order Fulfillment Operations</p>
            </div>
            <div className="flex gap-3">
               <Button 
                  onClick={handleRefresh} 
                  icon={<ReloadOutlined />} 
                  loading={loading}
                  className="border-gray-200 hover:text-blue-600 hover:border-blue-600"
                >
                  Refresh Data
                </Button>
                <Button 
                  onClick={handleClearFilters}
                  icon={<FilterOutlined />}
                  className="border-gray-200 hover:text-red-600 hover:border-red-600"
                >
                  Clear Filters
                </Button>
            </div>
          </div>

          {/* Compact Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Input
              placeholder="Search Order / ID..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="rounded-lg border-gray-200 hover:border-blue-400 focus:border-blue-500"
              allowClear
            />
            <Select
              placeholder="Platform"
              className="w-full"
              allowClear
              value={selectedPlatform}
              onChange={setSelectedPlatform}
              options={[
                { value: 'shopify', label: 'Shopify' },
                { value: 'woocommerce', label: 'WooCommerce' },
                { value: 'walmart', label: 'Walmart' },
              ]}
            />
            <Select
              placeholder="Packing Status"
              className="w-full"
              allowClear
              value={packingStatus}
              onChange={setPackingStatus}
              options={[
                { value: 'Completely Fulfilled', label: 'Fully Packed' },
                { value: 'Partially Fulfilled', label: 'Partially Packed' },
                { value: 'Not Packed', label: 'Not Packed' },
              ]}
            />
            <Select
              placeholder="Dropship Status"
              className="w-full"
              allowClear
              value={dropshipStatus}
              onChange={setDropshipStatus}
              options={[
                { value: 'Unfulfilled', label: 'DS Unfulfilled' },
                { value: 'Partially Fulfilled', label: 'DS Partial' },
                { value: 'Completely Fulfilled', label: 'DS Complete' },
                { value: 'Cancelled', label: 'DS Cancelled' },
              ]}
            />
            <Select
              placeholder="Shipping Status"
              className="w-full"
              allowClear
              value={shippingStatus}
              onChange={setShippingStatus}
              options={[
                { value: 'Shipped', label: 'Shipped' },
                { value: 'Pending', label: 'Pending' },
                { value: 'Not Started', label: 'Not Started' },
              ]}
            />
            <RangePicker
              className="w-full rounded-lg border-gray-200"
              value={dateRange}
              onChange={setDateRange}
              format="MMM DD, YYYY"
              suffixIcon={<CalendarOutlined className="text-gray-400" />}
            />
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Table
            columns={columns}
            dataSource={orders}
            loading={loading}
            rowKey={(record) => `${record.platform}-${record.orderId}`}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              showTotal: (total, range) => (
                <span className="text-gray-500 text-xs">
                  Showing {range[0]}-{range[1]} of {total} orders
                </span>
              ),
              pageSizeOptions: ["25", "50", "100"],
              className: "p-4",
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
            className="ssot-table"
            rowClassName="cursor-pointer hover:bg-slate-50 transition-colors group"
            size="middle"
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
            })}
          />
        </div>
      </div>
      <style>{`
        .ssot-table .ant-table-thead > tr > th {
          background: #f8fafc;
          color: #475569;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid #e2e8f0;
        }
        .ssot-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f1f5f9;
          padding: 12px 16px;
        }
        .ssot-table .ant-table-tbody > tr:last-child > td {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
};

export default SsotPage;
