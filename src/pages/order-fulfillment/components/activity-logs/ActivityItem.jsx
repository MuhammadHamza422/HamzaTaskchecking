import React, { memo } from "react";
import { format } from "date-fns";
import { User, Package, Truck, AlertCircle, MessageSquare, Info } from "lucide-react";
import { ACTIVITY_COLORS, ACTIVITY_TYPES } from "./activityConstants";

const ActivityItem = memo(({ activity }) => {
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
            case ACTIVITY_TYPES.MISSING_PRODUCT_ADDED:
                return <AlertCircle className="w-4 h-4" />;
            case ACTIVITY_TYPES.NOTE:
            case ACTIVITY_TYPES.MESSAGE:
                return <MessageSquare className="w-4 h-4" />;
            default:
                return <Info className="w-4 h-4" />;
        }
    };

    return (
        <div
            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
            style={{ borderLeft: `4px solid ${colorConfig.primary}` }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: colorConfig.background, color: colorConfig.text }}
                        >
                            {getIcon()}
                            {type.replace(/_/g, " ").toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                            {format(new Date(timestamp), "MMM d, yyyy h:mm a")}
                        </span>
                    </div>

                    <p className="text-gray-900 font-medium text-sm mb-2">{message}</p>

                    {/* Metadata & Context */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {packingId && (
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                                <Package className="w-3 h-3" />
                                Packing #{packingId.orderNumber || packingId.orderId || "N/A"}
                            </span>
                        )}
                        {dropshipId && (
                            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                                <Truck className="w-3 h-3" />
                                Dropship: {dropshipId}
                            </span>
                        )}
                        {metadata?.platform && (
                            <span className="capitalize bg-gray-50 px-2 py-1 rounded">
                                {metadata.platform}
                            </span>
                        )}
                    </div>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-2 text-right">
                    <div className="hidden sm:block">
                        <p className="text-xs font-medium text-gray-900">{user?.name || "System"}</p>
                        <p className="text-[10px] text-gray-500">{user?.email}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                        {user?.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-4 h-4 text-gray-400" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

ActivityItem.displayName = "ActivityItem";

export default ActivityItem;
