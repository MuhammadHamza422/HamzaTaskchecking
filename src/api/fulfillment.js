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
 * Scan order and get full details in a single API call (optimized for barcode scanning)
 * Combines search + details into one request for better performance
 * @param {string} query - Order ID, order number, or ShipStation packing slip barcode from ANY platform
 * @returns {Promise<Object>} Combined search and order details
 */
export async function scanOrderWithDetails(query) {
  if (!query || query.trim() === "") {
    throw new Error("Query parameter is required");
  }

  try {
    const response = await apiClient.get("/api/v1/fulfillment/orders/search", {
      params: { 
        query: query.trim(),
        includeDetails: true
      },
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to scan order";
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
  const { orderId, platform, orderNumber, selectedItems, deselectedItems, deselectedItemsData, orderData, photos, missingProducts } = packingData;

  if (!orderId) {
    throw new Error("Order ID is required");
  }
  if (!platform) {
    throw new Error("Platform is required");
  }
  if (!orderNumber) {
    throw new Error("Order number is required");
  }
  // Allow all items deselected - will create only dropship order
  // Photos are optional when all items are deselected
  if (!selectedItems || selectedItems.length === 0) {
    // All items deselected - photos are optional
    if (!photos || photos.length === 0) {
      // Allow creating without photos when all items deselected
      console.log("All items deselected - creating dropship order only");
    }
  } else {
    // At least one item selected - photos are required
    if (!photos || photos.length === 0) {
      throw new Error("At least 1 photo is required when items are selected");
    }
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

    // Add missing products if provided
    if (missingProducts && Array.isArray(missingProducts) && missingProducts.length > 0) {
      formData.append("missingProducts", JSON.stringify(missingProducts));
    }

    // Debug logging
    console.log("📤 API Request - Deselected Items:", {
      deselectedItems,
      deselectedItemsCount: deselectedItems?.length || 0,
      deselectedItemsData: deselectedItemsData?.map(item => ({ id: item.id, name: item.name })) || [],
      deselectedItemsJSON: JSON.stringify(deselectedItems || []),
    });

    // Only append photos if provided (optional when all items deselected)
    if (photos && photos.length > 0) {
      photos.forEach((photo) => {
        formData.append("photos", photo);
      });
    }

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
      newError.status = error.response?.status; // Include status code for 404 handling
      throw newError;
    }
    // Preserve status code if available
    if (error.response?.status) {
      error.status = error.response.status;
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

/**
 * Fulfill a missing product from dropship order
 * @param {string} dropshipId - Dropship order ID
 * @param {string} itemId - Deselected item ID (line item ID)
 * @param {string} missingProductId - Missing product ID to fulfill
 * @param {Object} fulfillmentData - Fulfillment data
 * @param {string} fulfillmentData.fulfillmentType - Fulfillment type: "japan" | "marketplace" (required)
 * @param {string} fulfillmentData.courierService - Courier service (required if fulfillmentType === "japan")
 * @param {string} fulfillmentData.marketplaceName - Marketplace name (required if fulfillmentType === "marketplace")
 * @param {string} fulfillmentData.marketplaceOrderNumber - Marketplace order number (optional)
 * @param {string} fulfillmentData.trackingId - Tracking ID (required)
 * @param {string} fulfillmentData.trackingLink - Tracking link URL (required if fulfillmentType === "marketplace")
 * @param {string} fulfillmentData.notes - Notes (optional)
 * @returns {Promise<Object>} Fulfillment result with updated dropship order
 */
export async function fulfillDropshipMissingProduct(dropshipId, itemId, missingProductId, fulfillmentData) {
  if (!dropshipId || !itemId || !missingProductId) {
    throw new Error("Dropship ID, item ID, and missing product ID are required");
  }

  if (!fulfillmentData.fulfillmentType) {
    throw new Error("Fulfillment type is required");
  }

  try {
    const encodedItemId = encodeURIComponent(itemId);
    const encodedMissingProductId = encodeURIComponent(missingProductId);
    
    const response = await apiClient.post(
      `/api/v1/fulfillment/dropship/${dropshipId}/items/${encodedItemId}/missing-products/${encodedMissingProductId}/fulfill`,
      {
        fulfillmentType: fulfillmentData.fulfillmentType,
        courierService: fulfillmentData.courierService?.trim() || null,
        marketplaceName: fulfillmentData.marketplaceName?.trim() || null,
        marketplaceOrderNumber: fulfillmentData.marketplaceOrderNumber?.trim() || null,
        trackingId: fulfillmentData.trackingId?.trim() || null,
        trackingLink: fulfillmentData.trackingLink?.trim() || null,
        notes: fulfillmentData.notes?.trim() || null,
      }
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || response.data.message || "Failed to fulfill missing product";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      throw error;
    }

    return response.data;
  } catch (error) {
    if (error.response?.status) {
      error.status = error.response.status;
    }
    
    console.error("Fulfill missing product error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      dropshipId,
      itemId,
      missingProductId,
    });

    if (error.response?.data) {
      const errorData = error.response.data;
      const errorMsg = 
        errorData.error?.message || 
        errorData.message || 
        errorData.error ||
        `Failed to fulfill missing product (${error.response.status})`;
      
      const newError = new Error(errorMsg);
      newError.code = errorData.error?.code || errorData.code;
      throw newError;
    }
    
    if (error.message) {
      throw error;
    }
    
    throw new Error(error.message || "Network error: Unable to connect to server");
  }
}

/**
 * Fulfill individual dropship item
 * @param {string} dropshipId - Dropship order ID
 * @param {string} lineItemId - Order line item ID (will be URL-encoded)
 * @param {Object} fulfillmentData - Fulfillment data
 * @param {string} fulfillmentData.fulfillmentType - Fulfillment type: "japan" | "marketplace" (required)
 * @param {string} fulfillmentData.courierService - Courier service (required if fulfillmentType === "japan")
 * @param {string} fulfillmentData.marketplaceName - Marketplace name (required if fulfillmentType === "marketplace")
 * @param {string} fulfillmentData.marketplaceOrderNumber - Marketplace order number (optional)
 * @param {string} fulfillmentData.notes - Notes (optional)
 * @param {string} fulfillmentData.trackingId - Tracking ID (required)
 * @param {string} fulfillmentData.trackingLink - Tracking link URL (required if fulfillmentType === "marketplace")
 * @returns {Promise<Object>} Fulfillment result with packing order details
 */
export async function fulfillDropshipItem(dropshipId, lineItemId, fulfillmentData) {
  if (!dropshipId || !lineItemId) {
    throw new Error("Dropship ID and line item ID are required");
  }

  if (!fulfillmentData.fulfillmentType) {
    throw new Error("Fulfillment type is required");
  }

  // Validation based on fulfillmentType
  if (fulfillmentData.fulfillmentType === "japan") {
    if (!fulfillmentData.trackingId || !fulfillmentData.courierService) {
      throw new Error("Tracking ID and courier service are required for Japan fulfillment");
    }
  } else if (fulfillmentData.fulfillmentType === "marketplace") {
    if (!fulfillmentData.marketplaceName || !fulfillmentData.trackingId || !fulfillmentData.trackingLink) {
      throw new Error("Marketplace name, tracking ID, and tracking link are required for marketplace fulfillment");
    }
  }

  try {
    // URL encode the lineItemId to handle special characters (e.g., gid://shopify/LineItem/...)
    const encodedLineItemId = encodeURIComponent(lineItemId);
    
    const response = await apiClient.post(
      `/api/v1/fulfillment/dropship/${dropshipId}/items/${encodedLineItemId}/fulfill`,
      {
        fulfillmentType: fulfillmentData.fulfillmentType,
        courierService: fulfillmentData.courierService?.trim() || null,
        marketplaceName: fulfillmentData.marketplaceName?.trim() || null,
        marketplaceOrderNumber: fulfillmentData.marketplaceOrderNumber?.trim() || null,
        notes: fulfillmentData.notes?.trim() || null,
        trackingId: fulfillmentData.trackingId?.trim() || null,
        trackingLink: fulfillmentData.trackingLink?.trim() || null,
      }
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || response.data.message || "Failed to fulfill item";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      throw error;
    }

    return response.data;
  } catch (error) {
    // Preserve status code if available
    if (error.response?.status) {
      error.status = error.response.status;
    }
    // Log full error details for debugging
    console.error("Fulfill dropship item error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      dropshipId,
      lineItemId,
    });

    if (error.response?.data) {
      // Handle different response structures
      const errorData = error.response.data;
      const errorMsg = 
        errorData.error?.message || 
        errorData.message || 
        errorData.error ||
        `Failed to fulfill item (${error.response.status})`;
      
      const newError = new Error(errorMsg);
      newError.code = errorData.error?.code || errorData.code;
      throw newError;
    }
    
    // If it's already an Error object with a message, throw it as is
    if (error.message) {
      throw error;
    }
    
    // Fallback for network errors or other issues
    throw new Error(error.message || "Network error: Unable to connect to server");
  }
}

/**
 * Update an existing packing order
 * @param {string} packingId - Packing order ID
 * @param {Object} updateData - Data to update (selectedItems, photos, notes, etc.)
 * @returns {Promise<Object>} Updated packing order details
 */
export async function updatePackingOrder(packingId, updateData) {
  if (!packingId) {
    throw new Error("Packing ID is required");
  }

  try {
    const formData = new FormData();

    // Add selected items
    if (updateData.selectedItems) {
      formData.append("selectedItems", JSON.stringify(updateData.selectedItems));
    }

    // Add deselected items
    if (updateData.deselectedItems) {
      formData.append("deselectedItems", JSON.stringify(updateData.deselectedItems));
    }

    // Add deselected items data
    if (updateData.deselectedItemsData) {
      formData.append("deselectedItemsData", JSON.stringify(updateData.deselectedItemsData));
    }

    // Add photos
    if (updateData.photos && Array.isArray(updateData.photos)) {
      updateData.photos.forEach((photo) => {
        if (photo instanceof File) {
          formData.append("photos", photo);
        }
      });
    }

    // Add photo URLs to remove
    if (updateData.removePhotoUrls && Array.isArray(updateData.removePhotoUrls)) {
      formData.append("removePhotoUrls", JSON.stringify(updateData.removePhotoUrls));
    }

    // Add notes
    if (updateData.notes !== undefined) {
      formData.append("notes", updateData.notes || "");
    }

    const response = await apiClient.patch(`/api/v1/fulfillment/packing/${packingId}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to update packing order";
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
 * Delete a packing order
 * @param {string} packingId - Packing order ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deletePackingOrder(packingId) {
  if (!packingId) {
    throw new Error("Packing ID is required");
  }

  try {
    const response = await apiClient.delete(`/api/v1/fulfillment/packing/${packingId}`);

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to delete packing order";
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
 * Add a missing product to an order line item
 * @param {string} packingId - Packing order ID
 * @param {string} lineItemId - Order line item ID
 * @param {string} productName - Missing product name
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} Created missing product details
 */
export async function addMissingProduct(packingId, lineItemId, productName, notes = null) {
  if (!packingId || !lineItemId || !productName) {
    throw new Error("Packing ID, line item ID, and product name are required");
  }

  try {
    // URL encode the lineItemId to handle special characters (e.g., gid://shopify/LineItem/...)
    const encodedLineItemId = encodeURIComponent(lineItemId);
    const response = await apiClient.post(
      `/api/v1/fulfillment/packing/${packingId}/order-lines/${encodedLineItemId}/missing-products`,
      {
        productName: productName.trim(),
        notes: notes?.trim() || null,
      }
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || response.data.message || "Failed to add missing product";
      const error = new Error(errorMsg);
      error.code = response.data.error?.code;
      throw error;
    }

    return response.data;
  } catch (error) {
    // Log full error details for debugging
    console.error("Add missing product error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      packingId,
      lineItemId,
      productName,
    });

    if (error.response?.data) {
      // Handle different response structures
      const errorData = error.response.data;
      const errorMsg = 
        errorData.error?.message || 
        errorData.message || 
        errorData.error ||
        `Failed to add missing product (${error.response.status})`;
      
      const newError = new Error(errorMsg);
      newError.code = errorData.error?.code || errorData.code;
      throw newError;
    }
    
    // If it's already an Error object with a message, throw it as is
    if (error.message) {
      throw error;
    }
    
    // Fallback for network errors or other issues
    throw new Error(error.message || "Network error: Unable to connect to server");
  }
}

/**
 * Get missing products for an order line item
 * @param {string} packingId - Packing order ID
 * @param {string} lineItemId - Order line item ID
 * @returns {Promise<Object>} Missing products list
 */
export async function getMissingProducts(packingId, lineItemId) {
  if (!packingId || !lineItemId) {
    throw new Error("Packing ID and line item ID are required");
  }

  try {
    // URL encode the lineItemId to handle special characters (e.g., gid://shopify/LineItem/...)
    const encodedLineItemId = encodeURIComponent(lineItemId);
    const response = await apiClient.get(
      `/api/v1/fulfillment/packing/${packingId}/order-lines/${encodedLineItemId}/missing-products`
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch missing products";
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
 * Delete a missing product from an order line item
 * @param {string} packingId - Packing order ID
 * @param {string} lineItemId - Order line item ID
 * @param {string} missingProductId - Missing product ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteMissingProduct(packingId, lineItemId, missingProductId) {
  if (!packingId || !lineItemId || !missingProductId) {
    throw new Error("Packing ID, line item ID, and missing product ID are required");
  }

  try {
    // URL encode the lineItemId to handle special characters (e.g., gid://shopify/LineItem/...)
    const encodedLineItemId = encodeURIComponent(lineItemId);
    const response = await apiClient.delete(
      `/api/v1/fulfillment/packing/${packingId}/order-lines/${encodedLineItemId}/missing-products/${missingProductId}`
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to delete missing product";
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

