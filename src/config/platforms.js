// Platform configuration for external orders
export const PLATFORM_CONFIG = {
  woocommerce: {
    key: "woocommerce",
    label: "WooCommerce",
    api: "/api/v1/orders/wc/orders/db",
    refreshApi: "/api/v1/orders/wc/orders",
    updateApi: "/api/v1/orders/wc/order/update",
    detailsApi: "/api/v1/orders/wc/order",
    color: "blue",
    bgColor: "bg-blue-500",
    borderColor: "border-blue-500",
    textColor: "text-blue-600",
    hoverColor: "hover:bg-blue-50",
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
    editableFields: ["kits", "tracking_number", "app_id", "wc_status", "status"],
  },
  walmart: {
    key: "walmart",
    label: "Walmart",
    api: "/api/v1/orders/wm/orders/db",
    refreshApi: "/api/v1/orders/wm/orders",
    updateApi: "/api/v1/orders/wm/order/update",
    detailsApi: "/api/v1/orders/wm/details",
    color: "green",
    bgColor: "bg-green-500",
    borderColor: "border-green-500",
    textColor: "text-green-600",
    hoverColor: "hover:bg-green-50",
    refetchInterval: 30 * 60 * 1000, // 30 minutes
    staleTime: 30 * 60 * 1000, // 30 minutes
    editableFields: ["kits", "tracking_number", "app_id", "wm_status", "status"],
  },
  shopify: {
    key: "shopify",
    label: "Shopify",
    api: "/api/v1/orders/shopify/orders",
    refreshApi: "/api/v1/orders/shopify/orders",
    updateApi: "/api/v1/orders/shopify/order/update",
    detailsApi: "/api/v1/orders/shopify/order",
    color: "purple",
    bgColor: "bg-purple-500",
    borderColor: "border-purple-500",
    textColor: "text-purple-600",
    hoverColor: "hover:bg-purple-50",
    refetchInterval: 45 * 60 * 1000, // 45 minutes
    staleTime: 45 * 60 * 1000, // 45 minutes
    editableFields: ["kits", "tracking_number", "app_id", "status"],
  },
  amazon: {
    key: "amazon",
    label: "Amazon",
    api: "/api/v1/orders/amazon/orders",
    refreshApi: "/api/v1/orders/amazon/orders",
    updateApi: "/api/v1/orders/amazon/order/update",
    detailsApi: "/api/v1/orders/amazon/order",
    color: "orange",
    bgColor: "bg-orange-500",
    borderColor: "border-orange-500",
    textColor: "text-orange-600",
    hoverColor: "hover:bg-orange-50",
    refetchInterval: 60 * 60 * 1000, // 1 hour
    staleTime: 60 * 60 * 1000, // 1 hour
    editableFields: ["kits", "tracking_number", "app_id", "status"],
  },
};

// Helper function to get platform config
export const getPlatformConfig = (platform) => {
  return PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.woocommerce;
};

// Helper function to get all platform keys
export const getPlatformKeys = () => {
  return Object.keys(PLATFORM_CONFIG);
}; 