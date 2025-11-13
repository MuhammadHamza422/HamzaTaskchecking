import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MdPendingActions, 
  MdCheckCircle, 
  MdCreateNewFolder,
  MdLocalShipping
} from "react-icons/md";

const orderSteps = [
  {
    path: "orders/external/orders/pending",
    label: "Pending Orders",
    icon: MdPendingActions,
    color: "blue",
    description: "New orders awaiting processing",
  },
  {
    path: "orders/external/orders/processed",
    label: "Processed Orders",
    icon: MdCheckCircle,
    color: "green",
    description: "Orders ready for shipment",
  },
  {
    path: "orders/external/orders/shipped",
    label: "Shipped Orders",
    icon: MdLocalShipping,
    color: "purple",
    description: "Orders with tracking numbers",
  },
  {
    path: "orders/external/orders/manual",
    label: "Manual Orders",
    icon: MdCreateNewFolder,
    color: "orange",
    description: "Manually created orders",
  },
];

export default function OrderStepper() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentStepIndex = orderSteps.findIndex((step) => {
    // Match by checking if pathname includes the step path or ends with the last segment
    const pathSegments = step.path.split("/");
    const lastSegment = pathSegments[pathSegments.length - 1];
    return location.pathname.includes(lastSegment) || 
           location.pathname === `/${step.path}` ||
           location.pathname.endsWith(`/${lastSegment}`);
  });

  const handleStepClick = (step) => {
    navigate(`/${step.path}`);
  };

  return (
    <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2 md:gap-3">
        {orderSteps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          const IconComponent = step.icon;
          
          const colorClasses = {
            blue: {
              bg: "bg-blue-500",
              text: "text-blue-600",
              border: "border-blue-500",
              light: "bg-blue-50",
            },
            green: {
              bg: "bg-green-500",
              text: "text-green-600",
              border: "border-green-500",
              light: "bg-green-50",
            },
            orange: {
              bg: "bg-orange-500",
              text: "text-orange-600",
              border: "border-orange-500",
              light: "bg-orange-50",
            },
            purple: {
              bg: "bg-purple-500",
              text: "text-purple-600",
              border: "border-purple-500",
              light: "bg-purple-50",
            },
          };

          const colors = colorClasses[step.color];

          return (
            <div key={step.path} className="flex items-center flex-1 min-w-0">
              {/* Step Item */}
              <motion.button
                onClick={() => handleStepClick(step)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 md:gap-2.5 px-2.5 md:px-3 py-2 rounded-lg transition-all duration-200 flex-1 min-w-0 ${
                  isActive
                    ? `${colors.light} ${colors.text} border-2 ${colors.border} shadow-sm`
                    : isCompleted
                    ? `${colors.light} ${colors.text} border-2 border-transparent hover:border-gray-200`
                    : "bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100 hover:text-gray-700"
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-lg flex-shrink-0 transition-all duration-200 ${
                    isActive
                      ? `${colors.bg} text-white shadow-md`
                      : isCompleted
                      ? `${colors.bg} text-white`
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  <IconComponent className="text-xs md:text-sm" />
                </div>

                {/* Label & Description */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    className={`font-semibold text-xs md:text-sm truncate ${
                      isActive ? colors.text : isCompleted ? colors.text : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span
                    className={`text-[10px] md:text-xs truncate hidden md:block ${
                      isActive ? "text-gray-600" : "text-gray-400"
                    }`}
                  >
                    {step.description}
                  </span>
                </div>

                {/* Active Indicator */}
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`w-1.5 h-1.5 rounded-full ${colors.bg} flex-shrink-0`}
                  />
                )}

                {/* Completed Checkmark */}
                {isCompleted && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className={`w-4 h-4 md:w-5 md:h-5 rounded-full ${colors.bg} flex items-center justify-center text-white flex-shrink-0`}
                  >
                    <svg
                      className="w-2.5 h-2.5 md:w-3 md:h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </motion.div>
                )}
              </motion.button>

              {/* Connector Line */}
              {index < orderSteps.length - 1 && (
                <div className="flex items-center mx-1 md:mx-2 flex-shrink-0">
                  <div
                    className={`h-0.5 w-4 md:w-6 ${
                      index < currentStepIndex
                        ? colors.bg
                        : "bg-gray-300"
                    } transition-colors duration-200`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

