import apiClient from "./client";

/**
 * Search/Scan for an order across all platforms
 * Returns minimal data to identify the order (orderId, platform, status)
 * @param {string} query - Order ID, order number, or ShipStation packing slip barcode from ANY platform
 * @returns {Promise<Object>} Search result with orderId and platform
 */
export async function searchOrder(query) {
  if (!query || query.trim() === "") {
    throw new Error("Query parameter is required");
  }

  try {
    const response = await apiClient.get("/api/v1/fulfillment/orders/search", {
      params: { query: query.trim() },
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to search for order";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      throw error;
    }

    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      const errorMsg = error.response.data.error.message;
      const newError = new Error(errorMsg);
      newError.code = error.response.data.error.code;
      throw newError;
    }
    throw error;
  }
}

/**
 * Get complete order details including products, shipping info, and stock status
 * @param {string} orderId - Order ID from search API response (GID for Shopify, orderId for others)
 * @param {string} platform - Platform name: "woocommerce" | "shopify" | "walmart"
 * @param {string} country - Optional: For Walmart only (default: "usa")
 * @returns {Promise<Object>} Complete order information with line items
 */
export async function getOrderDetails(orderId, platform, country = null) {
  if (!orderId) {
    throw new Error("Order ID is required");
  }
  if (!platform) {
    throw new Error("Platform is required");
  }

  try {
    const params = {
      orderId: orderId,
      platform: platform,
    };

    if (country && platform === "walmart") {
      params.country = country;
    }

    const response = await apiClient.get("/api/v1/fulfillment/orders/details", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch order details";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      throw error;
    }

    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      const errorMsg = error.response.data.error.message;
      const newError = new Error(errorMsg);
      newError.code = error.response.data.error.code;
      throw newError;
    }
    throw error;
  }
}

