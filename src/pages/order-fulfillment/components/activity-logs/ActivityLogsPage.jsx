import React, { useState } from "react";
import { Button } from "antd";
import { format } from "date-fns";
import { User, Package, Truck, AlertCircle, MessageSquare, Info, CheckCircle2, ExternalLink } from "lucide-react";

import ActivityFilters from "./ActivityFilters";
import ActivityStats from "./ActivityStats";
import CustomPagination from "../common/CustomPagination";

import { useActivities } from "./hooks/useActivities";
import { useActivityFilters } from "./hooks/useActivityFilters";
import FulfillmentBreadcrumb from "../common/FulfillmentBreadcrumb";
import { ACTIVITY_COLORS, ACTIVITY_TYPES, ACTIVITY_LABELS } from "./activityConstants";

export default function ActivityLogsPage() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { filters, updateFilter, setDateRange, clearFilters } =
    useActivityFilters();

  const { activities, total, totalPages, isLoading, error } = useActivities(
    filters,
    page,
    limit
  );

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
  };

  if (error) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl m-4">
        <h3 className="font-bold text-lg mb-2">Error Loading Activities</h3>
        <p>{error.message}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-2">
      <div className="max-w-[1440px] mx-auto">
        <FulfillmentBreadcrumb />
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Activity Logs
            </h1>
            <p className="text-gray-500 mt-1">
              Track and monitor all fulfillment operations
            </p>
          </div>
        </div>

        {/* Stats */}
        <ActivityStats activities={activities} total={total} />

        {/* Filters */}
        <ActivityFilters
          filters={filters}
          onUpdateFilter={updateFilter}
          onSetDateRange={setDateRange}
          onClearFilters={clearFilters}
        />

        {/* Activities Table */}
        <div className="mt-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200 bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-sm whitespace-nowrap font-semibold text-gray-700 border-b">
                    Packing ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                    Platform
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      Loading activities...
                    </td>
                  </tr>
                ) : activities.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                      No activities found
                    </td>
                  </tr>
                ) : (
                  activities.map((activity, idx) => {
                    const { type, message, user, timestamp, metadata, packingId, dropshipId } = activity;
                    const colorConfig = ACTIVITY_COLORS[type] || ACTIVITY_COLORS[ACTIVITY_TYPES.SYSTEM];
                    
                    const getIcon = () => {
                      switch (type) {
                        case ACTIVITY_TYPES.PACKING_CREATED:
                        case ACTIVITY_TYPES.PACKING_UPDATED:
                          return <Package className="w-4 h-4" />;
                        case ACTIVITY_TYPES.DROPSHIP_CREATED:
                        case ACTIVITY_TYPES.DROPSHIP_STATUS_CHANGED:
                          return <Truck className="w-4 h-4" />;
                        case ACTIVITY_TYPES.ITEM_FULFILLED:
                          return <CheckCircle2 className="w-4 h-4" />;
                        case ACTIVITY_TYPES.MISSING_PRODUCT_ADDED:
                          return <AlertCircle className="w-4 h-4" />;
                        case ACTIVITY_TYPES.NOTE:
                        case ACTIVITY_TYPES.MESSAGE:
                          return <MessageSquare className="w-4 h-4" />;
                        default:
                          return <Info className="w-4 h-4" />;
                      }
                    };

                    // Render metadata details
                    const renderMetadata = () => {
                      if (!metadata) return null;

                      const details = [];

                      // Item Fulfilled metadata
                      if (type === ACTIVITY_TYPES.ITEM_FULFILLED) {
                        if (metadata.marketplaceName) {
                          details.push(
                            <span key="marketplace" className="text-xs text-gray-600">
                              via {metadata.marketplaceName}
                            </span>
                          );
                        }
                        if (metadata.marketplaceOrderNumber) {
                          details.push(
                            <span key="order" className="text-xs text-gray-600">
                              Order: {metadata.marketplaceOrderNumber}
                            </span>
                          );
                        }
                        if (metadata.trackingId) {
                          details.push(
                            <div key="tracking" className="flex items-center gap-1 mt-1">
                              <span className="text-xs text-gray-600">Tracking: {metadata.trackingId}</span>
                              {metadata.trackingLink && (
                                <a
                                  href={metadata.trackingLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          );
                        }
                        if (metadata.remainingItemsCount !== undefined) {
                          details.push(
                            <span key="progress" className="text-xs text-blue-600 font-medium mt-1 block">
                              Progress: {metadata.fulfilledItemsCount || 0}/{metadata.totalItemsCount || 0} fulfilled
                              {metadata.remainingItemsCount > 0 && ` (${metadata.remainingItemsCount} remaining)`}
                            </span>
                          );
                        }
                      }

                      // Status Changed metadata
                      if (type === ACTIVITY_TYPES.DROPSHIP_STATUS_CHANGED) {
                        if (metadata.oldStatus && metadata.newStatus) {
                          details.push(
                            <span key="status" className="text-xs text-gray-600">
                              {metadata.oldStatus} → {metadata.newStatus}
                            </span>
                          );
                        }
                        if (metadata.remainingItemsCount !== undefined) {
                          details.push(
                            <span key="counts" className="text-xs text-gray-600">
                              {metadata.fulfilledItemsCount || 0} fulfilled, {metadata.remainingItemsCount} remaining
                            </span>
                          );
                        }
                      }

                      // Packing Updated metadata (dropship completion)
                      if (type === ACTIVITY_TYPES.PACKING_UPDATED && metadata.source === "dropship_completion") {
                        if (metadata.dropshipId) {
                          details.push(
                            <span key="dropship" className="text-xs text-gray-600">
                              Dropship: {metadata.dropshipId}
                            </span>
                          );
                        }
                        if (metadata.fulfilledItemsCount) {
                          details.push(
                            <span key="items" className="text-xs text-green-600 font-medium">
                              {metadata.fulfilledItemsCount} items moved back
                            </span>
                          );
                        }
                      }

                      if (details.length === 0) return null;

                      return (
                        <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
                          {details}
                        </div>
                      );
                    };

                    return (
                      <tr
                        key={activity._id || idx}
                        className={`hover:bg-gray-50 ${
                          idx % 2 !== 0 ? "bg-gray-50/50" : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3 border-b">
                          <span
                            className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: colorConfig.background, color: colorConfig.text }}
                          >
                            {getIcon()}
                            {ACTIVITY_LABELS[type] || type.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 border-b">
                          <div className="w-[350px]">
                            <div>{message}</div>
                            {renderMetadata()}
                          </div>
                        </td>
                        <td className="px-4 py-3 border-b">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                              {user?.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{user?.name || "System"}</p>
                              <p className="text-xs text-gray-500">{user?.email || ""}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 border-b whitespace-nowrap">
                          {format(new Date(timestamp), "MMM d, yyyy h:mm a")}
                        </td>
                        <td className="px-4 py-3 border-b">
                          {packingId ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded">
                              <Package className="w-3 h-3" />
                              {typeof packingId === 'object' 
                                ? (packingId.orderNumber || packingId.orderId || packingId._id || "N/A")
                                : packingId}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 border-b">
                          {metadata?.platform || metadata?.marketplaceName ? (
                            <span className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded capitalize">
                              {metadata.platform || metadata.marketplaceName}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <CustomPagination
            page={page}
            limit={limit}
            total={total}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            itemName="activities"
            limitOptions={[20, 50, 100]}
          />
        )}
      </div>
    </div>
  );
}
