import React, { useState, useEffect } from "react";
import { Input, Select, DatePicker, Button, Drawer, Badge } from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import { useMediaQuery } from "react-responsive";
import useFullscreen from "../useFullscreen";

const { Option } = Select;
const { RangePicker } = DatePicker;

const statusOptions = ["processing", "completed", "cancelled", "pending"];

const platformOptions = [
  { value: "6890cc6719f58a04b3f95a47", label: "WooCommerce" },
  { value: "6890cc6719f58a04b3f95a48", label: "Walmart" },
  { value: "6890cc6719f58a04b3f95a49", label: "Amazon" },
];

export default function ManualOrderFilters({ filters, onFiltersChange, onReset }) {
  const [searchValue, setSearchValue] = useState(filters.search);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 768 });
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();

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
      dateRange: dates,
    });
  };

  const handlePlatformChange = (value) => {
    onFiltersChange({ ...filters, platform: value });
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
    if (filters.platform) count++;
    if (filters.status) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  // Filter content component
  const FilterContent = ({ isMobileDrawer = false }) => (
    <div
      className={`grid ${
        isMobileDrawer
          ? "grid-cols-1"
          : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
      } gap-4`}
    >
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

      {/* Platform Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Platform
        </label>
        <Select
          placeholder="Select Platform"
          value={filters.platform}
          onChange={handlePlatformChange}
          allowClear
          size={isMobileDrawer ? "large" : "middle"}
          className="w-full"
        >
          {platformOptions.map((platform) => (
            <Option key={platform.value} value={platform.value}>
              {platform.label}
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
          size={isMobileDrawer ? "large" : "middle"}
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
          size={isMobileDrawer ? "large" : "middle"}
          className="w-full"
        >
          Reset Filters
        </Button>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1">
          <Input
            placeholder="Search by order number, customer ID, or customer name..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            size="large"
            className="rounded-lg"
            allowClear
          />
        </div>

        {/* Filter Button */}
        <div className="flex items-center gap-2">
          <Button
            icon={<FilterOutlined />}
            onClick={() => setIsDrawerOpen(true)}
            size="large"
            className="rounded-lg"
          >
            Filters
            {activeFiltersCount > 0 && (
              <Badge
                count={activeFiltersCount}
                size="small"
                className="ml-2"
                style={{ backgroundColor: "#1890ff" }}
              />
            )}
          </Button>
        </div>
      </div>

      {/* Desktop Filters */}
      {!isMobile && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <FilterContent />
        </div>
      )}

      {/* Mobile Filter Drawer */}
      <Drawer
        title="Filter Orders"
        placement="right"
        onClose={() => setIsDrawerOpen(false)}
        open={isDrawerOpen}
        width={320}
        getContainer={getContainer}
        key={String(isFullscreen)}
        footer={
          <div className="flex gap-2">
            <Button onClick={() => setIsDrawerOpen(false)} className="flex-1">
              Close
            </Button>
            <Button
              type="primary"
              onClick={() => setIsDrawerOpen(false)}
              className="flex-1"
            >
              Apply Filters
            </Button>
          </div>
        }
      >
        <FilterContent isMobileDrawer={true} />
      </Drawer>
    </div>
  );
}
