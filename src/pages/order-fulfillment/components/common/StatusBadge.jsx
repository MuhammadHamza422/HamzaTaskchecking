const statusConfig = {
  "completely-fulfilled": {
    label: "Completely Fulfilled",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  "partially-fulfilled": {
    label: "Partially Fulfilled",
    className: "bg-amber-100 text-amber-700 border-amber-300",
  },
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-700 border-gray-300",
  },
  unfulfilled: {
    label: "Unfulfilled",
    className: "bg-red-100 text-red-700 border-red-300",
  },
  fulfilled: {
    label: "Fulfilled",
    className: "bg-green-100 text-green-700 border-green-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-gray-100 text-gray-700 border-gray-300",
  },
};

export default function StatusBadge({ status }) {
  const statusKey = status?.toLowerCase()?.replace(/\s+/g, "-") || "pending";
  const config = statusConfig[statusKey] || statusConfig.pending;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}
    >
      {config.label}
    </span>
  );
}

