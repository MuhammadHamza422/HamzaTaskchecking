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

  return (
    <nav className="flex items-center gap-2 text-sm mb-4 px-1">
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          {item.icon ? (
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Link
                to={item.path}
                className="flex items-center gap-1.5 text-gray-600 hover:text-blue-600 transition-colors duration-200"
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            </motion.div>
          ) : item.isLast ? (
            <span className="text-gray-900 font-medium">{item.label}</span>
          ) : (
            <Link
              to={item.path}
              className="text-gray-600 hover:text-blue-600 transition-colors duration-200"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

