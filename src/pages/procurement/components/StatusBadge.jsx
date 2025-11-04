import React from "react";
import { PO_STATUS_LABELS, PO_STATUS_COLORS } from "../constants/procurementConstants";

/**
 * Status Badge Component
 * Displays purchase order status with color coding
 */
const StatusBadge = ({ status, className = "" }) => {
  const statusLabel = PO_STATUS_LABELS[status] || status;
  const statusColor = PO_STATUS_COLORS[status] || "bg-gray-100 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border ${statusColor} ${className}`}
    >
      {statusLabel}
    </span>
  );
};

export default StatusBadge;

