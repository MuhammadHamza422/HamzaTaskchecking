import React, { memo } from "react";
import { Timeline, Empty } from "antd";
import ActivityItem from "./ActivityItem";
import { ACTIVITY_COLORS, ACTIVITY_TYPES } from "./activityConstants";

const ActivityTimeline = memo(({ activities, isLoading }) => {
    if (!isLoading && (!activities || activities.length === 0)) {
        return (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
                <Empty description="No activities found" />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <Timeline
                mode="left"
                items={activities.map((activity) => {
                    const colorConfig = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS[ACTIVITY_TYPES.SYSTEM];
                    return {
                        color: colorConfig.primary,
                        children: <ActivityItem activity={activity} />,
                        label: null, // We handle timestamp inside item for better responsiveness
                    };
                })}
            />
        </div>
    );
});

ActivityTimeline.displayName = "ActivityTimeline";

export default ActivityTimeline;
