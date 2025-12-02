import apiClient from "./client";

/**
 * Get SSOT orders list with pagination and filters
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.pageSize - Items per page (default: 50, max: 100)
 * @param {string} filters.platform - Platform filter: "woocommerce", "shopify", "walmart", or platform ID/name
 * @param {string} filters.fulfillmentStatus - Overall fulfillment status filter
 * @param {string} filters.packingStatus - Packing status: "Completely Fulfilled", "Partially Fulfilled"
 * @param {string} filters.dropshipStatus - Dropship status: "Unfulfilled", "Partially Fulfilled", "Completely Fulfilled", "Cancelled", "N/A"
 * @param {string} filters.shippingStatus - Shipping status: "Shipped", "Pending", "Not Started"
 * @param {string} filters.search - Search in orderId, orderNumber
 * @param {string} filters.startDate - Filter by order creation date (ISO 8601 format)
 * @param {string} filters.endDate - Filter by order creation date (ISO 8601 format)
 * @returns {Promise<Object>} SSOT orders list with pagination
 */
export async function getSSOTOrders(filters = {}) {
  try {
    const params = {};

    if (filters.page) params.page = filters.page;
    if (filters.pageSize) params.pageSize = filters.pageSize;
    if (filters.platform) params.platform = filters.platform;
    if (filters.fulfillmentStatus) params.fulfillmentStatus = filters.fulfillmentStatus;
    if (filters.packingStatus) params.packingStatus = filters.packingStatus;
    if (filters.dropshipStatus) params.dropshipStatus = filters.dropshipStatus;
    if (filters.shippingStatus) params.shippingStatus = filters.shippingStatus;
    if (filters.search) params.search = filters.search;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const response = await apiClient.get("/api/v1/fulfillment/ssot/orders", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch SSOT orders";
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
 * Get SSOT order details
 * @param {Object} params - Query parameters
 * @param {string} params.platform - Platform: "woocommerce", "shopify", "walmart" (required)
 * @param {string} params.orderId - Order ID (primary key) (required)
 * @param {string} params.orderNumber - Order number (optional, for convenience)
 * @param {string} params.country - Country code for Walmart orders (optional, default: "usa")
 * @returns {Promise<Object>} Complete SSOT order details
 */
export async function getSSOTOrderDetails(params) {
  const { platform, orderId, orderNumber, country } = params;

  if (!platform) {
    throw new Error("Platform is required");
  }
  if (!orderId) {
    throw new Error("Order ID is required");
  }

  try {
    const queryParams = {
      platform,
      orderId,
    };

    if (orderNumber) queryParams.orderNumber = orderNumber;
    if (country) queryParams.country = country;

    const response = await apiClient.get("/api/v1/fulfillment/ssot/order", {
      params: queryParams,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch SSOT order details";
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

