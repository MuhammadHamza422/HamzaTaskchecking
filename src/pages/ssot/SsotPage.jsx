import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Table, Input, Select, DatePicker, Button, Tag, Space, Card, Row, Col } from "antd";
import { SearchOutlined, ReloadOutlined, FilterOutlined } from "@ant-design/icons";
import { format } from "date-fns";

const { RangePicker } = DatePicker;
const { Option } = Select;

const SsotPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  // Dummy data based on the image provided
  const dataSource = [
    {
      key: "1",
      platform: "Shopify", // Placeholder for logo
      orderNo: "1001",
      processedVia: "Hector",
      packingStatus: "Partially Packed",
      itemsPacked: 3,
      packedBy: "Hector",
      whShippingStatus: "Validated",
      dsStatus: "Pending",
      dsItems: 2,
      fulfillmentStatus: "Partially Fulfilled",
      fulfilledFrom: "Osaka",
      orderTs: "2023-10-26T10:00:00",
      processedAt: "2023-10-26T10:05:00",
      packedAt: "2023-10-26T10:30:00",
      shippedAt: null,
      deoFe: 85,
      whFe: 90,
      overallFe: 88,
    },
    {
      key: "2",
      platform: "Amazon", // Placeholder for logo
      orderNo: "1002",
      processedVia: "ShipStation",
      packingStatus: "Complete",
      itemsPacked: 2,
      packedBy: "Hector",
      whShippingStatus: "Invalid",
      dsStatus: "Complete",
      dsItems: 0,
      fulfillmentStatus: "Complete",
      fulfilledFrom: "Fleetwood",
      orderTs: "2023-10-26T11:00:00",
      processedAt: "2023-10-26T11:05:00",
      packedAt: "2023-10-26T11:30:00",
      shippedAt: "2023-10-26T14:00:00",
      deoFe: 95,
      whFe: 92,
      overallFe: 94,
    },
  ];

  const columns = [
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      render: (text) => <Tag color="blue">{text}</Tag>, // Placeholder for logo
    },
    {
      title: "Order No.",
      dataIndex: "orderNo",
      key: "orderNo",
      sorter: (a, b) => a.orderNo.localeCompare(b.orderNo),
    },
    {
      title: "Processed Via",
      dataIndex: "processedVia",
      key: "processedVia",
    },
    {
      title: "Packing Status",
      dataIndex: "packingStatus",
      key: "packingStatus",
      render: (status) => {
        let color = "default";
        if (status === "Complete") color = "success";
        if (status === "Partially Packed") color = "warning";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "Items Packed",
      dataIndex: "itemsPacked",
      key: "itemsPacked",
    },
    {
      title: "Packed By",
      dataIndex: "packedBy",
      key: "packedBy",
    },
    {
      title: "WH Shipping Status",
      dataIndex: "whShippingStatus",
      key: "whShippingStatus",
      render: (status) => {
        const color = status === "Validated" ? "success" : "error";
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: "DS Status",
      dataIndex: "dsStatus",
      key: "dsStatus",
    },
    {
      title: "DS Items",
      dataIndex: "dsItems",
      key: "dsItems",
    },
    {
      title: "Fulfillment Status",
      dataIndex: "fulfillmentStatus",
      key: "fulfillmentStatus",
      render: (status) => {
          let color = 'default';
          if (status === 'Complete') color = 'success';
          else if (status === 'Partially Fulfilled') color = 'warning';
          return <Tag color={color}>{status}</Tag>
      }
    },
    {
      title: "Fulfilled From",
      dataIndex: "fulfilledFrom",
      key: "fulfilledFrom",
    },
    {
      title: "Order TS",
      dataIndex: "orderTs",
      key: "orderTs",
      render: (date) => date ? format(new Date(date), "MM/dd HH:mm") : "-",
    },
    {
      title: "Processed At",
      dataIndex: "processedAt",
      key: "processedAt",
       render: (date) => date ? format(new Date(date), "MM/dd HH:mm") : "-",
    },
    {
      title: "Packed At",
      dataIndex: "packedAt",
      key: "packedAt",
       render: (date) => date ? format(new Date(date), "MM/dd HH:mm") : "-",
    },
    {
      title: "Shipped At",
      dataIndex: "shippedAt",
      key: "shippedAt",
       render: (date) => date ? format(new Date(date), "MM/dd HH:mm") : "-",
    },
    {
      title: "DEO FE %",
      dataIndex: "deoFe",
      key: "deoFe",
      render: (val) => <span style={{ color: val < 90 ? "red" : "green", fontWeight: "bold" }}>{val}%</span>
    },
    {
      title: "WH FE %",
      dataIndex: "whFe",
      key: "whFe",
      render: (val) => <span style={{ color: val < 90 ? "red" : "green", fontWeight: "bold" }}>{val}%</span>
    },
    {
      title: "Overall FE %",
      dataIndex: "overallFe",
      key: "overallFe",
      render: (val) => <span style={{ color: val < 90 ? "red" : "green", fontWeight: "bold" }}>{val}%</span>
    },
  ];

  // Filter data based on search and filters
  const filteredData = dataSource.filter((record) => {
    const matchesSearch =
      !searchText ||
      record.orderNo?.toLowerCase().includes(searchText.toLowerCase()) ||
      record.platform?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesPlatform = !selectedPlatform || record.platform === selectedPlatform;
    
    const matchesDateRange = !dateRange || !dateRange.length || (() => {
      if (!record.orderTs) return true;
      const recordDate = new Date(record.orderTs);
      const [start, end] = dateRange;
      if (!start || !end) return true;
      // Ant Design RangePicker returns dayjs objects, convert to Date
      const startDate = start.toDate ? start.toDate() : new Date(start);
      const endDate = end.toDate ? end.toDate() : new Date(end);
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      return recordDate >= startOfDay && recordDate <= endOfDay;
    })();
    
    return matchesSearch && matchesPlatform && matchesDateRange;
  });

  const handleRowClick = (record) => {
    navigate(`/fulfillment/ssot/details/${record.orderNo}`);
  };

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleClearFilters = () => {
    setSearchText("");
    setSelectedPlatform(null);
    setDateRange(null);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Fulfillment Operations - SSOT</h1>
          <p className="text-gray-500 mt-1">Single Source of Truth for Order Fulfillment</p>
        </div>
        
        {/* Filters Section */}
        <Card className="mb-4 shadow-sm">
          <div className="space-y-4">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Input
                  placeholder="Search Order No or Platform"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Select
                  placeholder="Filter by Platform"
                  style={{ width: "100%" }}
                  allowClear
                  value={selectedPlatform}
                  onChange={setSelectedPlatform}
                >
                  <Option value="Shopify">Shopify</Option>
                  <Option value="Amazon">Amazon</Option>
                  <Option value="Walmart">Walmart</Option>
                  <Option value="ShipStation">ShipStation</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <RangePicker
                  style={{ width: "100%" }}
                  value={dateRange}
                  onChange={setDateRange}
                  format="MM/DD/YYYY"
                />
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Space>
                  <Button 
                    type="primary" 
                    icon={<ReloadOutlined />} 
                    loading={loading}
                    onClick={handleRefresh}
                  >
                    Refresh
                  </Button>
                  <Button 
                    icon={<FilterOutlined />}
                    onClick={handleClearFilters}
                  >
                    Clear
                  </Button>
                </Space>
              </Col>
            </Row>
          </div>
        </Card>
      </div>

      <Card className="shadow-sm rounded-lg border border-gray-200" bodyStyle={{ padding: 0 }}>
        <div className="overflow-x-auto">
            <Table
            columns={columns}
            dataSource={filteredData}
            loading={loading}
            pagination={{
                total: filteredData.length,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `Total ${total} orders`,
            }}
            scroll={{ x: 2000 }}
            rowClassName="cursor-pointer hover:bg-blue-50 transition-colors"
            size="middle"
            bordered
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
            })}
            />
        </div>
      </Card>
    </div>
  );
};

export default SsotPage;

