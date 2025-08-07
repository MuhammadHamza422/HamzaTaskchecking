import React from "react";
import { Users, Package, ShoppingCart, Store, Gift, DollarSign, Calendar, TrendingUp } from 'lucide-react';

export default function DashboardHome() {
  const staticDashboardData = {
    totalUsers: 12345,
    totalProducts: 7890,
    totalOrders: 56789,
    todayOrders: 123,
    totalPlatforms: 5,
    totalKits: 456,
    platformOrders: {
      woocommerce: 12345,
      walmart: 9876,
      shopify: 23456,
      amazon: 11223,
    },
    monthlyOrders: 5000,
    yearlyOrders: 60000,
    totalRevenue: 1234567.89,
  };

  const metricCards = [
    {
      title: "Total Users",
      value: staticDashboardData.totalUsers || 0,
      icon: <Users className="text-blue-600" />,
      colorClass: "text-blue-600",
      suffix: "users",
    },
    {
      title: "Total Products",
      value: staticDashboardData.totalProducts || 0,
      icon: <Package className="text-green-600" />,
      colorClass: "text-green-600",
      suffix: "products",
    },
    {
      title: "Total Orders",
      value: staticDashboardData.totalOrders || 0,
      icon: <ShoppingCart className="text-purple-600" />,
      colorClass: "text-purple-600",
      suffix: "orders",
    },
    {
      title: "Total Platforms",
      value: staticDashboardData.totalPlatforms || 0,
      icon: <Store className="text-orange-600" />,
      colorClass: "text-orange-600",
      suffix: "platforms",
    },
    {
      title: "Total Kits",
      value: staticDashboardData.totalKits || 0,
      icon: <Gift className="text-indigo-600" />,
      colorClass: "text-indigo-600",
      suffix: "kits",
    },
  ];

  const platformCards = [
    {
      title: "WooCommerce Orders",
      value: staticDashboardData.platformOrders.woocommerce || 0,
      icon: <Package className="text-blue-600" />,
      colorClass: "text-blue-600",
      platform: "WooCommerce",
    },
    {
      title: "Walmart Orders",
      value: staticDashboardData.platformOrders.walmart || 0,
      icon: <Package className="text-green-600" />,
      colorClass: "text-green-600",
      platform: "Walmart",
    },
    {
      title: "Shopify Orders",
      value: staticDashboardData.platformOrders.shopify || 0,
      icon: <Package className="text-purple-600" />,
      colorClass: "text-purple-600",
      platform: "Shopify",
    },
    {
      title: "Amazon Orders",
      value: staticDashboardData.platformOrders.amazon || 0,
      icon: <Package className="text-orange-600" />,
      colorClass: "text-orange-600",
      platform: "Amazon",
    },
  ];

  return (
    <div className="max-w-[1550px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              Overview of your platform statistics and metrics
            </p>
          </div>
        </div>
      </div>

      {/* Main Metrics Cards */}
      <>
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Overview Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {metricCards.map((card, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-2xl">{card.icon}</div>
                  <TrendingUp className="text-gray-400" />
                </div>
                <div>
                  <div className="text-gray-600 font-medium text-sm mb-2">
                    {card.title}
                  </div>
                  <div className={`text-3xl font-bold ${card.colorClass}`}>
                    {card.value.toLocaleString()}
                    <span className="text-lg font-normal text-gray-500 ml-1">
                      {card.suffix}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Orders */}
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Platform Orders
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platformCards.map((card, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm p-5 border border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xl">{card.icon}</div>
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {card.platform}
                  </span>
                </div>
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">
                    {card.title}
                  </div>
                  <div className={`text-2xl font-bold ${card.colorClass}`}>
                    {card.value.toLocaleString()}
                    <span className="text-base font-normal text-gray-500 ml-1">
                      orders
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Monthly Orders</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {staticDashboardData.monthlyOrders.toLocaleString() || 0}
                </div>
              </div>
              <Calendar className="text-3xl text-blue-200" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Yearly Orders</div>
                <div className="text-2xl font-bold text-green-600 mt-1">
                  {staticDashboardData.yearlyOrders.toLocaleString() || 0}
                </div>
              </div>
              <TrendingUp className="text-3xl text-green-200" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm">Total Revenue</div>
                <div className="text-2xl font-bold text-purple-600 mt-1">
                  ${staticDashboardData.totalRevenue.toLocaleString() || 0}
                </div>
              </div>
              <DollarSign className="text-3xl text-purple-200" />
            </div>
          </div>
        </div>
      </>
    </div>
  );
}
