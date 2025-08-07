import React, { useState, useEffect } from "react";
import {
  Input,
  Select,
  DatePicker,
  Button,
  Drawer,
  Badge,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useMediaQuery } from "react-responsive";

const { Option } = Select;
const { RangePicker } = DatePicker;

const wcorderStatus = [
  "pending",
  "failed", 
  "processing",
  "on-hold",
  "completed",
  "cancelled",
  "refunded",
];

const statusOptions = ["partially processed", "processed", "unprocessed"];

export default function OrderFilters({ filters, onFiltersChange, onReset }) {
  const [searchValue, setSearchValue] = useState(filters.search);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // Debounced search with pagination reset
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchValue }, true);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleSearchChange = (value) => {
    setSearchValue(value);
  };

  const handleDateRangeChange = (dates) => {
    onFiltersChange({ 
      ...filters, 
      dateRange: dates 
    });
  };

  const handleWcStatusChange = (value) => {
    onFiltersChange({ ...filters, wc_status: value });
  };

  const handleStatusChange = (value) => {
    onFiltersChange({ ...filters, status: value });
  };

  const handleReset = () => {
    setSearchValue("");
    onReset();
    setIsDrawerOpen(false);
  };

  // Count active filters
  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.dateRange && filters.dateRange.length === 2) count++;
    if (filters.wc_status) count++;
    if (filters.status) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  // Filter content component
  const FilterContent = ({ isMobileDrawer = false }) => (
    <div className={`grid ${isMobileDrawer ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-5'} gap-4`}>
      {/* Date Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <RangePicker
          className="w-full"
          value={filters.dateRange}
          onChange={handleDateRangeChange}
          format="YYYY-MM-DD"
          placeholder={["Start Date", "End Date"]}
          size={isMobileDrawer ? "large" : "middle"}
        />
      </div>

      {/* WC Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          WC Status
        </label>
        <Select
          placeholder="Select WC Status"
          value={filters.wc_status}
          onChange={handleWcStatusChange}
          allowClear
          className="w-full"
          size={isMobileDrawer ? "large" : "middle"}
        >
          {wcorderStatus.map((status) => (
            <Option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Option>
          ))}
        </Select>
      </div>

      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status
        </label>
        <Select
          placeholder="Select Status"
          value={filters.status}
          onChange={handleStatusChange}
          allowClear
          className="w-full"
          size={isMobileDrawer ? "large" : "middle"}
        >
          {statusOptions.map((status) => (
            <Option key={status} value={status}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Option>
          ))}
        </Select>
      </div>

      {/* Reset Button */}
      {!isMobileDrawer && (
        <div className="flex items-end">
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            className="w-full"
          >
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );

  // Mobile layout
  if (isMobile) {
    return (
      <>
        <div className="mb-4 bg-white rounded-lg border border-[#f0f0f0] shadow-sm">
          {/* Search bar - always visible */}
          <div className="p-3 border-b border-gray-100">
            <Input
              placeholder="Search by Order ID..."
              prefix={<SearchOutlined className="text-gray-400" />}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              allowClear
              size="large"
              className="rounded-lg"
            />
          </div>

          {/* Filter button */}
          <div className="p-3 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge count={activeFiltersCount} size="small" offset={[8, -8]}>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => setIsDrawerOpen(true)}
                  type={activeFiltersCount > 0 ? "primary" : "default"}
                  size="large"
                  className="flex items-center gap-2"
                >
                  Filters
                </Button>
              </Badge>
               
              {activeFiltersCount > 0 && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleReset}
                  size="large"
                  type="text"
                  className="text-gray-500"
                >
                  Reset
                </Button>
              )}
            </div>

            {/* Active filters summary */}
            {activeFiltersCount > 0 && (
              <div className="text-xs text-gray-500">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
              </div>
            )}
          </div>

          {/* Active filters chips */}
          {activeFiltersCount > 0 && (
            <div className="px-3 pb-3">
              <div className="flex flex-wrap gap-2">
                {filters.search && (
                  <div className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    Search: {filters.search}
                    <CloseOutlined 
                      className="cursor-pointer hover:text-blue-900" 
                      onClick={() => {
                        setSearchValue("");
                        onFiltersChange({ ...filters, search: "" });
                      }}
                    />
                  </div>
                )}
                {filters.wc_status && (
                  <div className="bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    WC: {filters.wc_status}
                    <CloseOutlined 
                      className="cursor-pointer hover:text-green-900" 
                      onClick={() => handleWcStatusChange(undefined)}
                    />
                  </div>
                )}
                {filters.status && (
                  <div className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    Status: {filters.status}
                    <CloseOutlined 
                      className="cursor-pointer hover:text-purple-900" 
                      onClick={() => handleStatusChange(undefined)}
                    />
                  </div>
                )}
                {filters.dateRange && filters.dateRange.length === 2 && (
                  <div className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    Date Range
                    <CloseOutlined 
                      className="cursor-pointer hover:text-orange-900" 
                      onClick={() => handleDateRangeChange(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile drawer for filters */}
        <Drawer
          title="Filters"
          placement="bottom"
          onClose={() => setIsDrawerOpen(false)}
          open={isDrawerOpen}
          height="auto"
          styles={{
            body: { padding: '20px' }
          }}
          extra={
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              type="text"
            >
              Reset All
            </Button>
          }
        >
          <div className="space-y-6">
            <FilterContent isMobileDrawer={true} />
             
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                type="primary" 
                size="large" 
                className="flex-1"
                onClick={() => setIsDrawerOpen(false)}
              >
                Apply Filters
              </Button>
              <Button 
                size="large" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Drawer>
      </>
    );
  }

  // Desktop layout
  return (
    <div className="mb-4 shadow-sm rounded-lg border border-[#f0f0f0] p-4 bg-white overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search by Order ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Search Order ID
          </label>
          <Input
            placeholder="Enter order ID..."
            prefix={<SearchOutlined />}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            allowClear
          />
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <RangePicker
            className="w-full"
            value={filters.dateRange}
            onChange={handleDateRangeChange}
            format="YYYY-MM-DD"
            placeholder={["Start Date", "End Date"]}
          />
        </div>

        {/* WC Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WC Status
          </label>
          <Select
            placeholder="Select WC Status"
            value={filters.wc_status}
            onChange={handleWcStatusChange}
            allowClear
            className="w-full"
          >
            {wcorderStatus.map((status) => (
              <Option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Option>
            ))}
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <Select
            placeholder="Select Status"
            value={filters.status}
            onChange={handleStatusChange}
            allowClear
            className="w-full"
          >
            {statusOptions.map((status) => (
              <Option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Option>
            ))}
          </Select>
        </div>

        {/* Reset Button */}
        <div className="flex items-end">
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            className="w-full"
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
}