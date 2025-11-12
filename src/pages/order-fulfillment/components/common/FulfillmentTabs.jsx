import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const tabs = [
  { key: "dashboard", label: "Dashboard", path: "/fulfillment" },
  { key: "packing", label: "Packing Operations", path: "/fulfillment/packing" },
  { key: "dropship", label: "Drop-ship Management", path: "/fulfillment/dropship" },
  { key: "shipping", label: "Shipping Operations", path: "/fulfillment/shipping" },
];

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
      return location.pathname.startsWith("/fulfillment/packing") && 
        location.pathname !== "/fulfillment";
    }
    return location.pathname.startsWith(tab.path);
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 md:px-10">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = isTabActive(tab);
            return (
              <motion.button
                key={tab.key}
                onClick={() => handleTabClick(tab.path)}
                className={`relative px-6 py-4 font-medium text-sm transition-colors duration-200 whitespace-nowrap ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

