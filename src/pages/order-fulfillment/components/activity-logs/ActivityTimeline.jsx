import React, { memo } from "react";
import { Timeline, Empty } from "antd";
import ActivityItem from "./ActivityItem";

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
                    // Use API-provided color object directly
                    const colorConfig = activity.color || { primary: "#6B7280" };
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
