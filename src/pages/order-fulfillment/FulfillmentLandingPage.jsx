import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { LayoutDashboard, Package, ShoppingCart, Truck, FileText } from "lucide-react";
import { motion } from "framer-motion";

const cards = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "View statistics, recent operations, and quick insights",
    icon: LayoutDashboard,
    path: "/fulfillment/dashboard",
    gradient: "from-blue-500 to-blue-600",
    hoverGradient: "from-blue-600 to-blue-700",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    delay: 0,
  },
  {
    id: "packing",
    title: "Packing Operations",
    description: "Scan, pack orders, and manage packing operations",
    icon: Package,
    path: "/fulfillment/packing",
    listPath: "/fulfillment/packing/list",
    gradient: "from-green-500 to-green-600",
    hoverGradient: "from-green-600 to-green-700",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    delay: 0.1,
  },
  {
    id: "dropship",
    title: "Drop-ship Management",
    description: "Manage orders with deselected items for dropshipping",
    icon: ShoppingCart,
    path: "/fulfillment/dropship",
    gradient: "from-purple-500 to-purple-600",
    hoverGradient: "from-purple-600 to-purple-700",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    delay: 0.2,
  },
  {
    id: "shipping",
    title: "Shipping Operations",
    description: "Track and manage shipping operations",
    icon: Truck,
    path: "/fulfillment/shipping",
    listPath: "/fulfillment/shipping/list",
    gradient: "from-orange-500 to-orange-600",
    hoverGradient: "from-orange-600 to-orange-700",
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    delay: 0.3,
  },
  {
    id: "activity-logs",
    title: "Activity Logs",
    description: "View and track all fulfillment activities and logs",
    icon: FileText,
    path: "/fulfillment/activity-logs",
    gradient: "from-indigo-500 to-indigo-600",
    hoverGradient: "from-indigo-600 to-indigo-700",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    delay: 0.4,
  },
];

export default function FulfillmentLandingPage() {
  const navigate = useNavigate();

  // Scroll to top on mount (especially important for mobile)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="max-w-[1550px] mx-auto px-4 sm:px-6 md:py-12 py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 shadow-xl">
            <Package className="w-10 h-10 md:w-12 md:h-12 text-white" />
          </div>
          <h1 className="lg:text-5xl md:text-4xl sm:text-3xl text-3xl font-bold md:font-extrabold text-gray-900 mb-4 leading-tight">
            Order Fulfillment
          </h1>
          <p className="text-base md:text-xl text-gray-600 max-w-2xl mx-auto">
            Streamline your fulfillment operations with powerful tools for packing, dropshipping, and shipping
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {cards.map((card) => {
            const IconComponent = card.icon;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: card.delay }}
                whileHover={{ scale: 1.02, y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(card.path)}
                className="group relative bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-transparent"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>

                <div className="relative p-4 md:p-8">
                  <div className="flex items-start gap-4 md:gap-6 mb-4 md:mb-6">
                    <div className={`${card.iconBg} p-2 sm:p-4 rounded-xl group-hover:bg-white transition-colors duration-300`}>
                      <IconComponent className={`w-6 h-6 sm:w-8 sm:h-8 ${card.iconColor} group-hover:text-gray-900 transition-colors duration-300`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 group-hover:text-white transition-colors duration-300 mb-2">
                        {card.title}
                      </h3>
                      <p className="text-gray-600 group-hover:text-blue-50 transition-colors duration-300 text-base leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 group-hover:text-white transition-colors duration-300">
                      <span>Get Started</span>
                      <motion.svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        initial={{ x: 0 }}
                        whileHover={{ x: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </motion.svg>
                    </div>
                    
                    {card.listPath && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(card.listPath);
                        }}
                        className="px-3 py-1.5 text-xs md:text-sm font-medium rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 group-hover:bg-white/20 group-hover:text-white transition-all duration-300"
                      >
                        See All Records
                      </button>
                    )}
                  </div>
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-500 text-sm">
            Select a module above to begin managing your fulfillment operations
          </p>
        </motion.div>
      </div>
    </div>
  );
}

