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

/**
 * Create packing record for an order with photos
 * Automatically creates dropship records for deselected items
 * @param {Object} packingData - Packing data object
 * @param {string} packingData.orderId - Order ID (GID for Shopify, orderId for others)
 * @param {string} packingData.platform - Platform name: "woocommerce" | "shopify" | "walmart"
 * @param {string} packingData.orderNumber - Display order number
 * @param {Array<string>} packingData.selectedItems - Array of packed item IDs
 * @param {Array<string>} packingData.deselectedItems - Array of deselected item IDs (moved to dropship)
 * @param {Array<Object>} packingData.deselectedItemsData - Full item data for deselected items
 * @param {Object} packingData.orderData - Complete order details (customer, shipping, financials)
 * @param {Array<File>} packingData.photos - Array of image File objects (1-5 photos)
 * @returns {Promise<Object>} Created packing record with photo URLs
 */
export async function createPacking(packingData) {
  const { orderId, platform, orderNumber, selectedItems, deselectedItems, deselectedItemsData, orderData, photos } = packingData;

  if (!orderId) {
    throw new Error("Order ID is required");
  }
  if (!platform) {
    throw new Error("Platform is required");
  }
  if (!orderNumber) {
    throw new Error("Order number is required");
  }
  if (!selectedItems || selectedItems.length === 0) {
    throw new Error("At least one item must be selected");
  }
  if (!photos || photos.length === 0) {
    throw new Error("At least 1 photo is required");
  }
  if (photos.length > 5) {
    throw new Error("Maximum 5 photos allowed");
  }

  try {
    const formData = new FormData();
    formData.append("orderId", orderId);
    formData.append("platform", platform);
    formData.append("orderNumber", orderNumber);
    formData.append("selectedItems", JSON.stringify(selectedItems));
    formData.append("deselectedItems", JSON.stringify(deselectedItems || []));
    if (deselectedItemsData && deselectedItemsData.length > 0) {
      formData.append("deselectedItemsData", JSON.stringify(deselectedItemsData));
    }
    if (orderData) {
      formData.append("orderData", JSON.stringify(orderData));
    }

    // Debug logging
    console.log("📤 API Request - Deselected Items:", {
      deselectedItems,
      deselectedItemsCount: deselectedItems?.length || 0,
      deselectedItemsData: deselectedItemsData?.map(item => ({ id: item.id, name: item.name })) || [],
      deselectedItemsJSON: JSON.stringify(deselectedItems || []),
    });

    photos.forEach((photo) => {
      formData.append("photos", photo);
    });

    const response = await apiClient.post("/api/v1/fulfillment/packing/create", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to create packing record";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      error.details = response.data.error?.details;
      throw error;
    }

    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      const errorMsg = error.response.data.error.message;
      const newError = new Error(errorMsg);
      newError.code = error.response.data.error.code;
      newError.details = error.response.data.error.details;
      throw newError;
    }
    throw error;
  }
}

/**
 * Get all packing orders with pagination and filters
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 30)
 * @param {string} filters.platform - Filter by platform: "woocommerce" | "shopify" | "walmart"
 * @param {string} filters.status - Filter by status: "Completely Fulfilled" | "Partially Fulfilled"
 * @param {string} filters.search - Search in orderId or orderNumber
 * @param {string} filters.startDate - Start date (ISO format)
 * @param {string} filters.endDate - End date (ISO format)
 * @returns {Promise<Object>} Packing orders list with pagination
 */
export async function getAllPackingOrders(filters = {}) {
  try {
    const params = {};

    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.platform) params.platform = filters.platform;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const response = await apiClient.get("/api/v1/fulfillment/packing", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch packing orders";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      throw error;
    }

    // Normalize response: convert outOfStockItemsCount to deselectedItemsCount for backward compatibility
    if (response.data.data && response.data.data.orders) {
      response.data.data.orders = response.data.data.orders.map((order) => {
        if (order.outOfStockItemsCount !== undefined && order.deselectedItemsCount === undefined) {
          order.deselectedItemsCount = order.outOfStockItemsCount;
        }
        return order;
      });
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
 * Get packing order details by ID
 * @param {string} packingId - Packing order ID
 * @returns {Promise<Object>} Complete packing order details
 */
export async function getPackingOrderDetails(packingId) {
  if (!packingId) {
    throw new Error("Packing ID is required");
  }

  try {
    const response = await apiClient.get(`/api/v1/fulfillment/packing/${packingId}`);

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch packing order details";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      throw error;
    }

    // Normalize response: convert outOfStockItems to deselectedItemsCount for backward compatibility
    if (response.data.data) {
      const data = response.data.data;
      // If deselectedItemsCount is not present, calculate it from outOfStockItems array
      if (!data.deselectedItemsCount && data.outOfStockItems) {
        data.deselectedItemsCount = Array.isArray(data.outOfStockItems) ? data.outOfStockItems.length : 0;
      }
      // Also handle outOfStockItemsCount if present
      if (!data.deselectedItemsCount && data.outOfStockItemsCount !== undefined) {
        data.deselectedItemsCount = data.outOfStockItemsCount;
      }
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
 * Get fulfillment dashboard statistics
 * @param {Object} filters - Optional filter parameters
 * @param {string} filters.startDate - Start date (ISO 8601 format)
 * @param {string} filters.endDate - End date (ISO 8601 format)
 * @returns {Promise<Object>} Dashboard statistics
 */
export async function getFulfillmentStats(filters = {}) {
  try {
    const params = {};

    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const response = await apiClient.get("/api/v1/fulfillment/stats", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch fulfillment statistics";
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
 * Get recent packing operations for dashboard
 * @param {Object} filters - Optional filter parameters
 * @param {string} filters.startDate - Start date (ISO 8601 format)
 * @param {string} filters.endDate - End date (ISO 8601 format)
 * @param {number} filters.limit - Number of records (default: 10, max: 20)
 * @returns {Promise<Object>} Recent packing operations
 */
export async function getRecentPacking(filters = {}) {
  try {
    const params = {};

    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.limit) params.limit = Math.min(filters.limit, 20);

    const response = await apiClient.get("/api/v1/fulfillment/recent/packing", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch recent packing operations";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      throw error;
    }

    // Normalize response: convert outOfStockItemsCount to deselectedItemsCount for backward compatibility
    if (response.data.data && response.data.data.orders) {
      response.data.data.orders = response.data.data.orders.map((order) => {
        if (order.outOfStockItemsCount !== undefined && order.deselectedItemsCount === undefined) {
          order.deselectedItemsCount = order.outOfStockItemsCount;
        }
        return order;
      });
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
 * Get all dropship orders with pagination and filters
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 30)
 * @param {string} filters.platform - Filter by platform: "woocommerce" | "shopify" | "walmart"
 * @param {string} filters.status - Filter by status: "Unfulfilled" | "Fulfilled" | "Cancelled"
 * @param {string} filters.search - Search in orderId, orderNumber, or dropshipId
 * @param {string} filters.startDate - Start date (ISO format)
 * @param {string} filters.endDate - End date (ISO format)
 * @returns {Promise<Object>} Dropship orders list with pagination
 */
export async function getAllDropshipOrders(filters = {}) {
  try {
    const params = {};

    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.platform) params.platform = filters.platform;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    const response = await apiClient.get("/api/v1/fulfillment/dropship", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch dropship orders";
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
 * Get dropship order details by ID
 * @param {string} dropshipId - Dropship order ID (e.g., "DS-20250115-001")
 * @returns {Promise<Object>} Complete dropship order details
 */
export async function getDropshipOrderDetails(dropshipId) {
  if (!dropshipId) {
    throw new Error("Dropship ID is required");
  }

  try {
    const response = await apiClient.get(`/api/v1/fulfillment/dropship/${dropshipId}`);

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch dropship order details";
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
 * Update dropship order status
 * @param {string} dropshipId - Dropship order ID
 * @param {Object} updateData - Update data
 * @param {string} updateData.status - New status: "Unfulfilled" | "Fulfilled" | "Cancelled"
 * @param {string} updateData.marketplaceName - Marketplace name (optional)
 * @param {string} updateData.marketplaceOrderNumber - Marketplace order number (optional)
 * @param {string} updateData.notes - Notes (optional)
 * @returns {Promise<Object>} Updated dropship order
 */
export async function updateDropshipStatus(dropshipId, updateData) {
  if (!dropshipId) {
    throw new Error("Dropship ID is required");
  }

  try {
    const response = await apiClient.patch(
      `/api/v1/fulfillment/dropship/${dropshipId}/status`,
      updateData
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to update dropship status";
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
 * Create marketplace order for dropship
 * @param {string} dropshipId - Dropship order ID
 * @param {Object} orderData - Marketplace order data
 * @param {string} orderData.marketplaceName - Marketplace name (e.g., "Shopify")
 * @param {string} orderData.marketplaceOrderNumber - Marketplace order number
 * @param {string} orderData.notes - Notes (optional)
 * @returns {Promise<Object>} Updated dropship order with marketplace info
 */
export async function createMarketplaceOrder(dropshipId, orderData) {
  if (!dropshipId) {
    throw new Error("Dropship ID is required");
  }

  try {
    const response = await apiClient.post(
      `/api/v1/fulfillment/dropship/${dropshipId}/create-marketplace-order`,
      orderData
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to create marketplace order";
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

