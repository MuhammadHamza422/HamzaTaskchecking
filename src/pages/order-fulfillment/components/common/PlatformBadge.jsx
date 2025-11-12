const platformColors = {
  shopify: "bg-green-100 text-green-700 border-green-300",
  woocommerce: "bg-purple-100 text-purple-700 border-purple-300",
  walmart: "bg-blue-100 text-blue-700 border-blue-300",
  amazon: "bg-orange-100 text-orange-700 border-orange-300",
};

export default function PlatformBadge({ platform }) {
  const platformKey = platform?.toLowerCase() || "";
  const colorClass = platformColors[platformKey] || "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
    >
      {platform || "Unknown"}
    </span>
  );
}

