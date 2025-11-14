import { Link, useLocation } from "react-router-dom";
import { Home, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const pathMap = {
  fulfillment: "Order Fulfillment",
  packing: "Packing Operations",
  dropship: "Drop-ship Management",
  shipping: "Shipping Operations",
  list: "All Orders",
};

export default function FulfillmentBreadcrumb() {
  const location = useLocation();
  const paths = location.pathname.split("/").filter(Boolean);

  const breadcrumbItems = [
    { label: "Home", path: "/", icon: Home },
    ...paths.map((path, index) => {
      const fullPath = "/" + paths.slice(0, index + 1).join("/");
      const label = pathMap[path] || path.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const isLast = index === paths.length - 1;
      return { label, path: fullPath, isLast };
    }),
  ];

  // On mobile, show only: Home > ... > Last item
  const getDisplayItems = () => {
    if (breadcrumbItems.length <= 3) {
      return breadcrumbItems;
    }
    // On mobile, show Home, ellipsis, and last item
    return [
      breadcrumbItems[0], // Home
      { label: "...", isEllipsis: true },
      breadcrumbItems[breadcrumbItems.length - 1], // Last item
    ];
  };

  const displayItems = getDisplayItems();

  return (
    <nav className="flex items-center gap-1 md:gap-2 text-xs md:text-sm mb-4 px-1 overflow-x-auto scrollbar-hide">
      {/* Desktop: Show all items */}
      <div className="hidden md:flex items-center gap-2">
        {breadcrumbItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 whitespace-nowrap">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            {item.icon ? (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to={item.path}
                  className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate max-w-[150px]">{item.label}</span>
                </Link>
              </motion.div>
            ) : item.isLast ? (
              <span className="text-gray-900 font-medium truncate max-w-[200px]">{item.label}</span>
            ) : (
              <Link
                to={item.path}
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Show simplified breadcrumb */}
      <div className="flex md:hidden items-center gap-1">
        {displayItems.map((item, index) => (
          <div key={index} className="flex items-center gap-1 whitespace-nowrap">
            {index > 0 && <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />}
            {item.isEllipsis ? (
              <span className="text-gray-400">...</span>
            ) : item.icon ? (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Link
                  to={item.path}
                  className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors duration-200"
                >
                  <item.icon className="w-3 h-3 flex-shrink-0" />
                  {index === 0 && <span className="text-xs">Home</span>}
                </Link>
              </motion.div>
            ) : item.isLast ? (
              <span className="text-gray-900 font-medium text-xs truncate max-w-[120px]">{item.label}</span>
            ) : (
              <Link
                to={item.path}
                className="text-gray-600 hover:text-blue-600 transition-colors duration-200 text-xs truncate max-w-[100px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}

