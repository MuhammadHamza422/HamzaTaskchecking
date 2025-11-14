import { useState, useEffect } from "react";
import { PackageCheck, Package, TrendingUp, Clock, Loader2, Calendar, X } from "lucide-react";
import { DatePicker } from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import StatCard from "./components/common/StatCard";
import QuickActionCard from "./components/common/QuickActionCard";
import RecentPackingTable from "./components/packing/RecentPackingTable";
import FulfillmentBreadcrumb from "./components/common/FulfillmentBreadcrumb";
import { getFulfillmentStats, getRecentPacking } from "../../api/fulfillment";
import Swal from "sweetalert2";

const { RangePicker } = DatePicker;

export default function FulfillmentDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentPacking, setRecentPacking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(null);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange.length === 2) {
        params.startDate = dateRange[0].startOf("day").toISOString();
        params.endDate = dateRange[1].endOf("day").toISOString();
      }

      const [statsResult, recentPackingResult] = await Promise.all([
        getFulfillmentStats(params),
        getRecentPacking({ ...params, limit: 10 }),
      ]);

      if (statsResult.success) {
        setStats(statsResult.data);
      }

      if (recentPackingResult.success) {
        setRecentPacking(recentPackingResult.data.orders || []);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to Load Dashboard",
        text: error.message || "Unable to fetch dashboard data. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setLoading(false);
    }
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const handleDateRangeChange = (dates) => {
    setDateRange(dates);
  };

  const clearDateRange = () => {
    setDateRange(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 py-6">
        <FulfillmentBreadcrumb />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <PackageCheck className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Order Fulfillment</h1>
                <p className="text-gray-600 text-base">Overview of packing and shipping operations</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <RangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                format="MMM DD, YYYY"
                className="h-10"
                placeholder={["Start Date", "End Date"]}
                suffixIcon={<Calendar className="w-4 h-4 text-gray-400" />}
              />
              {dateRange && (
                <button
                  onClick={clearDateRange}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <StatCard
                icon={Package}
                title="Total Packed"
                value={stats?.totalPackedOrders?.toLocaleString() || "0"}
                change={null}
                changeType="neutral"
                color="text-blue-600"
                delay={0}
              />
              <StatCard
                icon={Clock}
                title="Today's Packed"
                value={stats?.todayPackedOrders?.toLocaleString() || "0"}
                change={null}
                changeType="neutral"
                color="text-green-600"
                delay={0.1}
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
              <RecentPackingTable data={recentPacking} loading={false} />
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
