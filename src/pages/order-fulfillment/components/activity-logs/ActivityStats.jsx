import React, { useMemo } from "react";
import { Statistic, Card } from "antd";
import { Activity, CheckCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { ACTIVITY_TYPES } from "./activityConstants";

export default function ActivityStats({ activities, total, stats: apiStats }) {
    // Use API stats if available, otherwise calculate from activities (backward compatibility)
    const stats = useMemo(() => {
        // If API stats are provided, use them
        if (apiStats) {
            return {
                packing: apiStats.packing || 0,
                dropship: apiStats.dropship || 0,
                issues: apiStats.issues || 0,
            };
        }

        // Fallback: Calculate from activities (for backward compatibility)
        if (!activities) return { packing: 0, dropship: 0, issues: 0 };

        return activities.reduce((acc, curr) => {
            if (curr.type.startsWith("packing_")) acc.packing++;
            if (curr.type.startsWith("dropship_")) acc.dropship++;
            if (curr.type.includes("missing") || curr.type.includes("deleted")) acc.issues++;
            return acc;
        }, { packing: 0, dropship: 0, issues: 0 });
    }, [activities, apiStats]);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card bordered={false} className="shadow-sm rounded-xl">
                <Statistic
                    title={<span className="flex items-center gap-2 text-gray-500 text-sm"><Activity className="w-4 h-4" /> Total Activities</span>}
                    value={total}
                    valueStyle={{ color: '#4F46E5', fontWeight: 600 }}
                />
            </Card>

            <Card bordered={false} className="shadow-sm rounded-xl">
                <Statistic
                    title={<span className="flex items-center gap-2 text-gray-500 text-sm"><CheckCircle className="w-4 h-4" /> Packing Ops</span>}
                    value={stats.packing}
                    valueStyle={{ color: '#10B981', fontWeight: 600 }}
                />
            </Card>

            <Card bordered={false} className="shadow-sm rounded-xl">
                <Statistic
                    title={<span className="flex items-center gap-2 text-gray-500 text-sm"><MessageSquare className="w-4 h-4" /> Dropship Ops</span>}
                    value={stats.dropship}
                    valueStyle={{ color: '#8B5CF6', fontWeight: 600 }}
                />
            </Card>

            <Card bordered={false} className="shadow-sm rounded-xl">
                <Statistic
                    title={<span className="flex items-center gap-2 text-gray-500 text-sm"><AlertTriangle className="w-4 h-4" /> Issues/Alerts</span>}
                    value={stats.issues}
                    valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
                />
            </Card>
        </div>
    );
}
