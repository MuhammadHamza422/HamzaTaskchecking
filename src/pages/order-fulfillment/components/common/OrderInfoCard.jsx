import PlatformBadge from "./PlatformBadge";

export default function OrderInfoCard({ order }) {
  if (!order) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Order Number</p>
          <p className="text-base font-semibold text-gray-900">{order.orderNumber || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Customer Name</p>
          <p className="text-base font-semibold text-gray-900">{order.customerName || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Platform</p>
          <PlatformBadge 
            platform={order.platform ? order.platform.charAt(0).toUpperCase() + order.platform.slice(1) : order.platform} 
          />
        </div>
        <div className="md:col-span-2">
          <p className="text-xs font-medium text-gray-500 mb-2">Ship To</p>
          <p className="text-sm text-gray-900">{order.shipTo || "N/A"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Total Order Value</p>
          <p className="text-base font-semibold text-blue-600">
            ${order.totalValue?.toFixed(2) || "0.00"}
          </p>
        </div>
      </div>
    </div>
  );
}

