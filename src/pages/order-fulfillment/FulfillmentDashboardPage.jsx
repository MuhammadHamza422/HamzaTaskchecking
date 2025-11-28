import { useState, useEffect } from "react";
import { PackageCheck, Package, TrendingUp, Clock, Loader2, Calendar, X, ShoppingCart, Store } from "lucide-react";
import { DatePicker } from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import StatCard from "./components/common/StatCard";
import QuickActionCard from "./components/common/QuickActionCard";
import RecentPackingTable from "./components/packing/RecentPackingTable";
import FulfillmentBreadcrumb from "./components/common/FulfillmentBreadcrumb";
import { getFulfillmentStats, getRecentPacking } from "../../api/fulfillment";
import Swal from "sweetalert2";

// Extend dayjs with timezone support
dayjs.extend(utc);
dayjs.extend(timezone);

const { RangePicker } = DatePicker;
const US_EASTERN_TZ = "America/New_York";

// Utility function to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0 && current > 0) return 100;
  if (previous === 0 && current < 0) return -100;
  return ((current - previous) / previous) * 100;
};

// Utility function to determine change type
const getChangeType = (changePercent) => {
  if (changePercent > 0) return "increase";
  if (changePercent < 0) return "decrease";
  return "neutral";
};

// Get default date range (last 1 month in US Eastern)
const getDefaultDateRange = () => {
  const now = dayjs().tz(US_EASTERN_TZ);
  const oneMonthAgo = now.subtract(1, "month").add(1, "day");
  return [oneMonthAgo, now];
};

export default function FulfillmentDashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentPacking, setRecentPacking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const params = { timezone: US_EASTERN_TZ };
      
      if (dateRange && dateRange.length === 2) {
        // Convert dates to US Eastern timezone boundaries and then to UTC
        params.startDate = dateRange[0].tz(US_EASTERN_TZ).startOf("day").utc().toISOString();
        params.endDate = dateRange[1].tz(US_EASTERN_TZ).endOf("day").utc().toISOString();
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
    setDateRange(getDefaultDateRange());
  };

  // Date range presets for US Eastern timezone
  const rangePresets = [
    {
      label: "Today",
      value: [dayjs().tz(US_EASTERN_TZ).startOf("day"), dayjs().tz(US_EASTERN_TZ).endOf("day")],
    },
    {
      label: "Last 7 Days",
      value: [dayjs().tz(US_EASTERN_TZ).subtract(6, "day").startOf("day"), dayjs().tz(US_EASTERN_TZ).endOf("day")],
    },
    {
      label: "This Week",
      value: [dayjs().tz(US_EASTERN_TZ).startOf("week"), dayjs().tz(US_EASTERN_TZ).endOf("day")],
    },
    {
      label: "This Month",
      value: [dayjs().tz(US_EASTERN_TZ).startOf("month"), dayjs().tz(US_EASTERN_TZ).endOf("day")],
    },
    {
      label: "Last Month",
      value: [
        dayjs().tz(US_EASTERN_TZ).subtract(1, "month").startOf("month"),
        dayjs().tz(US_EASTERN_TZ).subtract(1, "month").endOf("month"),
      ],
    },
  ];

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
                presets={rangePresets}
              />
              <button
                onClick={clearDateRange}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                title="Reset to default (Last 1 Month)"
              >
                <X className="w-4 h-4" />
                Reset
              </button>
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
            {/* Main Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatCard
                icon={Package}
                title="Total Fulfilled"
                value={stats?.totalPackedOrders?.current?.toLocaleString() || "0"}
                change={
                  stats?.totalPackedOrders
                    ? calculatePercentageChange(
                        stats.totalPackedOrders.current,
                        stats.totalPackedOrders.previous
                      )
                    : null
                }
                changeType={
                  stats?.totalPackedOrders
                    ? getChangeType(
                        calculatePercentageChange(
                          stats.totalPackedOrders.current,
                          stats.totalPackedOrders.previous
                        )
                      )
                    : "neutral"
                }
                color="text-blue-600"
                delay={0}
              />
              <StatCard
                icon={ShoppingCart}
                title="Total Dropship Orders"
                value={stats?.totalDropshipOrders?.current?.toLocaleString() || "0"}
                change={
                  stats?.totalDropshipOrders
                    ? calculatePercentageChange(
                        stats.totalDropshipOrders.current,
                        stats.totalDropshipOrders.previous
                      )
                    : null
                }
                changeType={
                  stats?.totalDropshipOrders
                    ? getChangeType(
                        calculatePercentageChange(
                          stats.totalDropshipOrders.current,
                          stats.totalDropshipOrders.previous
                        )
                      )
                    : "neutral"
                }
                color="text-purple-600"
                delay={0.1}
              />
              <StatCard
                icon={Clock}
                title="Packed Today"
                value={stats?.packedToday?.current?.toLocaleString() || "0"}
                change={
                  stats?.packedToday
                    ? calculatePercentageChange(
                        stats.packedToday.current,
                        stats.packedToday.previous
                      )
                    : null
                }
                changeType={
                  stats?.packedToday
                    ? getChangeType(
                        calculatePercentageChange(
                          stats.packedToday.current,
                          stats.packedToday.previous
                        )
                      )
                    : "neutral"
                }
                color="text-green-600"
                delay={0.2}
              />
            </div>

            {/* Platform Distribution Cards */}
            {stats?.platformDistribution && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mb-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Store className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Platform Distribution</h2>
                  </div>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <StatCard
                    icon={Store}
                    title="Shopify Orders"
                    value={stats.platformDistribution.shopify?.current?.toLocaleString() || "0"}
                    change={
                      stats.platformDistribution.shopify
                        ? calculatePercentageChange(
                            stats.platformDistribution.shopify.current,
                            stats.platformDistribution.shopify.previous
                          )
                        : null
                    }
                    changeType={
                      stats.platformDistribution.shopify
                        ? getChangeType(
                            calculatePercentageChange(
                              stats.platformDistribution.shopify.current,
                              stats.platformDistribution.shopify.previous
                            )
                          )
                        : "neutral"
                    }
                    color="text-blue-600"
                    delay={0.3}
                  />
                  <StatCard
                    icon={Store}
                    title="Walmart Orders"
                    value={stats.platformDistribution.walmart?.current?.toLocaleString() || "0"}
                    change={
                      stats.platformDistribution.walmart
                        ? calculatePercentageChange(
                            stats.platformDistribution.walmart.current,
                            stats.platformDistribution.walmart.previous
                          )
                        : null
                    }
                    changeType={
                      stats.platformDistribution.walmart
                        ? getChangeType(
                            calculatePercentageChange(
                              stats.platformDistribution.walmart.current,
                              stats.platformDistribution.walmart.previous
                            )
                          )
                        : "neutral"
                    }
                    color="text-orange-600"
                    delay={0.4}
                  />
                  <StatCard
                    icon={Store}
                    title="WooCommerce Orders"
                    value={stats.platformDistribution.woocommerce?.current?.toLocaleString() || "0"}
                    change={
                      stats.platformDistribution.woocommerce
                        ? calculatePercentageChange(
                            stats.platformDistribution.woocommerce.current,
                            stats.platformDistribution.woocommerce.previous
                          )
                        : null
                    }
                    changeType={
                      stats.platformDistribution.woocommerce
                        ? getChangeType(
                            calculatePercentageChange(
                              stats.platformDistribution.woocommerce.current,
                              stats.platformDistribution.woocommerce.previous
                            )
                          )
                        : "neutral"
                    }
                    color="text-green-600"
                    delay={0.5}
                  />
                </div>
              </>
            )}

            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            </div> */}

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
