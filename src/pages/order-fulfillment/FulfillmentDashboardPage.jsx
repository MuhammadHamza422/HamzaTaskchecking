import { PackageCheck, Package, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import StatCard from "./components/common/StatCard";
import QuickActionCard from "./components/common/QuickActionCard";
import RecentPackingTable from "./components/packing/RecentPackingTable";

const mockStats = {
  totalPacked: 1247,
  totalPackedChange: 12,
  completelyFulfilled: 1156,
  completelyFulfilledChange: 8,
  partiallyFulfilled: 91,
  partiallyFulfilledChange: -5,
  pendingPacking: 23,
  pendingPackingChange: -15,
  avgPackingTime: "12 min",
  avgPackingTimeChange: -8,
};

export default function FulfillmentDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-100 rounded-lg">
              <PackageCheck className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Order Fulfillment</h1>
              <p className="text-gray-600 text-base">Overview of packing and shipping operations</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Package}
            title="Total Packed"
            value={mockStats.totalPacked.toLocaleString()}
            change={mockStats.totalPackedChange}
            changeType="increase"
            color="text-blue-600"
            delay={0}
          />
          <StatCard
            icon={CheckCircle2}
            title="Completely Fulfilled"
            value={mockStats.completelyFulfilled.toLocaleString()}
            change={mockStats.completelyFulfilledChange}
            changeType="increase"
            color="text-green-600"
            delay={0.1}
          />
          <StatCard
            icon={AlertCircle}
            title="Partially Fulfilled"
            value={mockStats.partiallyFulfilled}
            change={mockStats.partiallyFulfilledChange}
            changeType="decrease"
            color="text-amber-600"
            delay={0.2}
          />
          <StatCard
            icon={Clock}
            title="Pending Packing"
            value={mockStats.pendingPacking}
            change={mockStats.pendingPackingChange}
            changeType="decrease"
            color="text-gray-600"
            delay={0.3}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <QuickActionCard
            icon={PackageCheck}
            title="Start Packing"
            description="Scan or search for an order to begin packing"
            path="/fulfillment/packing"
            color="text-blue-600"
          />
          <QuickActionCard
            icon={Package}
            title="View All Packing"
            description="See all packing operations and filter by status"
            path="/fulfillment/packing/list"
            color="text-green-600"
          />
          <QuickActionCard
            icon={TrendingUp}
            title="Drop-ship Management"
            description="Manage orders with unselected items"
            path="/fulfillment/dropship"
            color="text-amber-600"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <RecentPackingTable />
        </motion.div>
      </div>
    </div>
  );
}

