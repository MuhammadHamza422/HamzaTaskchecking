import React from "react";
import { Truck } from "lucide-react";
import { RECEIPT_STATUS_LABELS } from "../constants/procurementConstants";

/**
 * Receipt Status Badge Component
 * Displays receipt status with appropriate icon
 */
const ReceiptBadge = ({ status, className = "" }) => {
  const statusLabel = RECEIPT_STATUS_LABELS[status] || status;

  const getColorClasses = (status) => {
    switch (status) {
      case "no_receipt":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "ready_to_receive":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "partially_received":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "fully_received":
        return "bg-green-100 text-green-700 border-green-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const showTruckIcon = status === "ready_to_receive";

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${getColorClasses(
        status
      )} ${className}`}
    >
      {showTruckIcon && <Truck className="w-3.5 h-3.5" />}
      {statusLabel}
    </span>
  );
};

export default ReceiptBadge;

