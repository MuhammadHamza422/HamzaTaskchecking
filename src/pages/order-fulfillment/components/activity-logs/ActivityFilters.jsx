import React, { memo, useState, useEffect, useCallback } from "react";
import { Input, Select, DatePicker, Button } from "antd";
import { Search, X, Filter, ArrowUpDown } from "lucide-react";
import { debounce } from "lodash";
import { ACTIVITY_TYPES, ACTIVITY_LABELS } from "./activityConstants";
import { useUsers } from "./hooks/useUsers";

const { RangePicker } = DatePicker;
const { Option } = Select;

// Common platforms list
const PLATFORMS = [
  "shopify",
  "amazon",
  "walmart",
  "woocommerce",
  "ebay",
  "etsy",
  "bigcommerce",
  "magento",
];

// const SORT_OPTIONS = [
//   { value: "timestamp", label: "Timestamp" },
//   { value: "type", label: "Activity Type" },
//   { value: "user", label: "User" },
// ];

const ActivityFilters = memo(({ filters, onUpdateFilter, onSetDateRange, onClearFilters }) => {
    const [searchValue, setSearchValue] = useState(filters.search || "");
    const { data: users = [], isLoading: usersLoading } = useUsers();

    // Debounced search update
    const debouncedSearch = useCallback(
        debounce((value) => {
            onUpdateFilter("search", value);
        }, 300),
        [onUpdateFilter]
    );

    // Update search value when filter changes externally
    useEffect(() => {
        setSearchValue(filters.search || "");
    }, [filters.search]);

    // Handle search input change
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchValue(value);
        debouncedSearch(value);
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
                <Filter className="w-5 h-5 text-indigo-600" />
                <h3>Filter Activities</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Unified Search - Replaces Packing ID and Dropship ID */}
                <Input
                    placeholder="Search all (Packing ID, Dropship ID, Order #, User, Tracking)..."
                    prefix={<Search className="w-4 h-4 text-gray-400" />}
                    value={searchValue}
                    onChange={handleSearchChange}
                    allowClear
                    className="rounded-lg"
                />

                {/* Activity Type */}
                <Select
                    placeholder="Activity Type"
                    value={filters.type || undefined}
                    onChange={(value) => onUpdateFilter("type", value)}
                    allowClear
                    className="w-full rounded-lg"
                >
                    {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                        <Option key={value} value={value}>
                            {label}
                        </Option>
                    ))}
                </Select>

                {/* User Filter */}
                <Select
                    placeholder="Filter by User"
                    value={filters.userId || undefined}
                    onChange={(value) => onUpdateFilter("userId", value)}
                    allowClear
                    showSearch
                    loading={usersLoading}
                    filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    className="w-full rounded-lg"
                >
                    {users.map((user) => (
                        <Option key={user._id} value={user._id} label={`${user.name} ${user.email}`}>
                            <div className="flex items-center gap-2">
                                <span>{user.name}</span>
                                <span className="text-gray-400 text-xs">({user.email})</span>
                            </div>
                        </Option>
                    ))}
                </Select>

                {/* Platform Filter */}
                <Select
                    placeholder="Filter by Platform"
                    value={filters.platform || undefined}
                    onChange={(value) => onUpdateFilter("platform", value)}
                    allowClear
                    className="w-full rounded-lg"
                >
                    {PLATFORMS.map((platform) => (
                        <Option key={platform} value={platform}>
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                        </Option>
                    ))}
                </Select>

                {/* Date Range */}
                <RangePicker
                    onChange={onSetDateRange}
                    className="w-full rounded-lg"
                    format="YYYY-MM-DD"
                />

                {/* Sort By */}
                {/* <Select
                    placeholder="Sort By"
                    value={filters.sortBy || "timestamp"}
                    onChange={(value) => onUpdateFilter("sortBy", value)}
                    className="w-full rounded-lg"
                    suffixIcon={<ArrowUpDown className="w-4 h-4" />}
                >
                    {SORT_OPTIONS.map((option) => (
                        <Option key={option.value} value={option.value}>
                            {option.label}
                        </Option>
                    ))}
                </Select> */}

                {/* Sort Order */}
                <Select
                    placeholder="Sort Order"
                    value={filters.sortOrder || "desc"}
                    onChange={(value) => onUpdateFilter("sortOrder", value)}
                    className="w-full rounded-lg"
                >
                    <Option value="desc">Newest First</Option>
                    <Option value="asc">Oldest First</Option>
                </Select>
            </div>

            {/* Active Filters Summary & Clear */}
            {(filters.search || filters.type || filters.userId || filters.platform || filters.startDate || filters.sortBy !== "timestamp" || filters.sortOrder !== "desc") && (
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-wrap gap-2">
                        {filters.search && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                                Search: {filters.search}
                            </span>
                        )}
                        {filters.type && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                Type: {ACTIVITY_LABELS[filters.type]}
                            </span>
                        )}
                        {filters.userId && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
                                User: {users.find(u => u._id === filters.userId)?.name || filters.userId}
                            </span>
                        )}
                        {filters.platform && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                                Platform: {filters.platform}
                            </span>
                        )}
                        {filters.startDate && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                {filters.startDate} - {filters.endDate}
                            </span>
                        )}
                       
                    </div>

                    <Button
                        type="text"
                        danger
                        icon={<X className="w-4 h-4" />}
                        onClick={onClearFilters}
                        className="flex items-center gap-1 text-xs"
                    >
                        Clear Filters
                    </Button>
                </div>
            )}
        </div>
    );
});

ActivityFilters.displayName = "ActivityFilters";

export default ActivityFilters;
