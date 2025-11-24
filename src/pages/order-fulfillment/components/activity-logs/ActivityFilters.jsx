import React, { memo } from "react";
import { Form, Input, Select, DatePicker, Button } from "antd";
import { Search, X, Filter } from "lucide-react";
import { ACTIVITY_TYPES, ACTIVITY_LABELS } from "./activityConstants";

const { RangePicker } = DatePicker;
const { Option } = Select;

const ActivityFilters = memo(({ filters, onUpdateFilter, onSetDateRange, onClearFilters }) => {
    return (
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-gray-100 shadow-sm mb-6">
            <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
                <Filter className="w-5 h-5 text-indigo-600" />
                <h3>Filter Activities</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Packing ID */}
                <Input
                    placeholder="Search Packing ID..."
                    prefix={<Search className="w-4 h-4 text-gray-400" />}
                    value={filters.packingId}
                    onChange={(e) => onUpdateFilter("packingId", e.target.value)}
                    allowClear
                    className="rounded-lg"
                />

                {/* Search Dropship ID */}
                <Input
                    placeholder="Search Dropship ID..."
                    prefix={<Search className="w-4 h-4 text-gray-400" />}
                    value={filters.dropshipId}
                    onChange={(e) => onUpdateFilter("dropshipId", e.target.value)}
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

                {/* Date Range */}
                <RangePicker
                    onChange={onSetDateRange}
                    className="w-full rounded-lg"
                    format="YYYY-MM-DD"
                />
            </div>

            {/* Active Filters Summary & Clear */}
            {(filters.packingId || filters.dropshipId || filters.type || filters.startDate) && (
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex flex-wrap gap-2">
                        {filters.packingId && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                                Packing: {filters.packingId}
                            </span>
                        )}
                        {filters.dropshipId && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                                Dropship: {filters.dropshipId}
                            </span>
                        )}
                        {filters.type && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                Type: {ACTIVITY_LABELS[filters.type]}
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
