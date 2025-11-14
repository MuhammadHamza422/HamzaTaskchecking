import { useState, useEffect } from "react";
import { Drawer, Input, Select, DatePicker, Button } from "antd";
import { Search, Filter, X, Calendar, Tag, CheckCircle } from "lucide-react";

const { RangePicker } = DatePicker;

export default function FilterDrawer({
  open,
  onClose,
  filters,
  onFilterChange,
  platforms = [],
  platformsLoading = false,
  statusOptions = [],
  searchPlaceholder = "Search...",
  onApply,
  onClear,
}) {
  const [localFilters, setLocalFilters] = useState(filters);

  // Sync local filters when drawer opens or filters change
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleFilterChange = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApply = () => {
    Object.keys(localFilters).forEach((key) => {
      onFilterChange(key, localFilters[key]);
    });
    if (onApply) onApply();
    onClose();
  };

  const handleClear = () => {
    const clearedFilters = {
      platform: null,
      status: null,
      dateRange: null,
      search: "",
    };
    setLocalFilters(clearedFilters);
    if (onClear) {
      Object.keys(clearedFilters).forEach((key) => {
        onFilterChange(key, clearedFilters[key]);
      });
      onClear();
    }
  };

  const hasActiveFilters = 
    localFilters.search ||
    localFilters.platform ||
    localFilters.status ||
    (localFilters.dateRange && localFilters.dateRange.length === 2);

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <span className="text-lg font-semibold">Filters</span>
        </div>
      }
      placement="bottom"
      height="auto"
      open={open}
      onClose={onClose}
      className="filter-drawer"
      styles={{
        body: { padding: "24px" },
        header: { padding: "16px 24px", borderBottom: "1px solid #e5e7eb" },
      }}
    >
      <div className="space-y-4 pb-4">
        {/* Search Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <Input
            placeholder={searchPlaceholder}
            prefix={<Search className="w-4 h-4 text-gray-400" />}
            value={localFilters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="w-full h-11"
            allowClear
          />
        </div>

        {/* Platform Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
          <Select
            placeholder="Select Platform"
            allowClear
            value={localFilters.platform}
            onChange={(value) => handleFilterChange("platform", value)}
            className="w-full h-11"
            loading={platformsLoading}
            suffixIcon={<Tag className="w-4 h-4 text-gray-400" />}
            options={platforms.map((platform) => ({
              label: typeof platform === "string" ? platform : platform.plt_name,
              value: typeof platform === "string" ? platform : platform.plt_name,
            }))}
          />
        </div>

        {/* Status Filter */}
        {statusOptions.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Select
              placeholder="Select Status"
              allowClear
              value={localFilters.status}
              onChange={(value) => handleFilterChange("status", value)}
              className="w-full h-11"
              suffixIcon={<CheckCircle className="w-4 h-4 text-gray-400" />}
              options={statusOptions}
            />
          </div>
        )}

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <RangePicker
            value={localFilters.dateRange}
            onChange={(dates) => handleFilterChange("dateRange", dates)}
            className="w-full h-11"
            suffixIcon={<Calendar className="w-4 h-4 text-gray-400" />}
            format="MMM DD, YYYY"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            onClick={handleClear}
            className="flex-1 h-11"
            disabled={!hasActiveFilters}
          >
            <X className="w-4 h-4 mr-2" />
            Clear All
          </Button>
          <Button
            type="primary"
            onClick={handleApply}
            className="flex-1 h-11"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

