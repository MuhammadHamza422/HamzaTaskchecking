import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Package, Truck, ShoppingCart } from "lucide-react";

const tabs = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/fulfillment",
    icon: LayoutDashboard,
    color: "blue",
    description: "Overview and statistics",
  },
  {
    key: "packing",
    label: "Packing Operations",
    path: "/fulfillment/packing",
    icon: Package,
    color: "green",
    description: "Pack and prepare orders",
  },
  {
    key: "dropship",
    label: "Drop-ship Management",
    path: "/fulfillment/dropship",
    icon: ShoppingCart,
    color: "purple",
    description: "Manage drop-ship orders",
  },
  {
    key: "shipping",
    label: "Shipping Operations",
    path: "/fulfillment/shipping",
    icon: Truck,
    color: "orange",
    description: "Ship and track orders",
  },
];

const colorClasses = {
  blue: {
    active: "bg-blue-50 border-blue-500 text-blue-700",
    inactive: "bg-gray-50 border-gray-200 text-gray-600",
    iconActive: "text-blue-600",
    iconInactive: "text-gray-400",
    dot: "bg-blue-500",
  },
  green: {
    active: "bg-green-50 border-green-500 text-green-700",
    inactive: "bg-gray-50 border-gray-200 text-gray-600",
    iconActive: "text-green-600",
    iconInactive: "text-gray-400",
    dot: "bg-green-500",
  },
  purple: {
    active: "bg-purple-50 border-purple-500 text-purple-700",
    inactive: "bg-gray-50 border-gray-200 text-gray-600",
    iconActive: "text-purple-600",
    iconInactive: "text-gray-400",
    dot: "bg-purple-500",
  },
  orange: {
    active: "bg-orange-50 border-orange-500 text-orange-700",
    inactive: "bg-gray-50 border-gray-200 text-gray-600",
    iconActive: "text-orange-600",
    iconInactive: "text-gray-400",
    dot: "bg-orange-500",
  },
};

export default function FulfillmentTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabClick = (path) => {
    navigate(path);
  };

  const isTabActive = (tab) => {
    if (tab.path === "/fulfillment") {
      return location.pathname === "/fulfillment";
    }
    if (tab.path === "/fulfillment/packing") {
      return location.pathname.startsWith("/fulfillment/packing") && location.pathname !== "/fulfillment";
    }
    return location.pathname.startsWith(tab.path);
  };

  return (
    <div className="bg-gradient-to-b from-white to-gray-50 border-b border-gray-200 shadow-sm">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 md:px-10 py-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
          {tabs.map((tab, index) => {
            const isActive = isTabActive(tab);
            const colors = colorClasses[tab.color];
            const Icon = tab.icon;

            return (
              <div key={tab.key} className="relative flex items-center shrink-0">
                <motion.button
                  onClick={() => handleTabClick(tab.path)}
                  className={`relative px-6 py-4 rounded-xl border-2 transition-all duration-300 min-w-[200px] text-left ${
                    isActive ? colors.active : `${colors.inactive} hover:border-gray-300 hover:bg-gray-100`
                  }`}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isActive ? "bg-white shadow-sm" : "bg-white/50"
                      } transition-all duration-300`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-colors duration-300 ${
                          isActive ? colors.iconActive : colors.iconInactive
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`font-semibold text-sm transition-colors duration-300 ${
                            isActive ? colors.active.split(" ")[2] : "text-gray-600"
                          }`}
                        >
                          {tab.label}
                        </h3>
                        {isActive && (
                          <motion.div
                            className={`w-2 h-2 rounded-full ${colors.dot}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </div>
                      <p
                        className={`text-xs mt-0.5 transition-colors duration-300 ${
                          isActive ? "text-gray-600" : "text-gray-400"
                        }`}
                      >
                        {tab.description}
                      </p>
                    </div>
                  </div>
                </motion.button>

                {index < tabs.length - 1 && (
                  <div className="mx-2 flex items-center">
                    <div className="w-8 border-t-2 border-dashed border-gray-300" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
