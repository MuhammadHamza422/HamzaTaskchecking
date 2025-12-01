import apiClient from "./client";

/**
 * Shipping Operations API
 * Integrates with ShipStation v2 Fulfillments API
 */

/**
 * Scan and validate tracking number
 * Creates a pending shipping record in the database
 * @param {string} trackingNumber - Tracking number to validate
 * @returns {Promise<Object>} Shipping record with fulfillment and order summary
 */
export async function scanTracking(trackingNumber) {
  if (!trackingNumber || trackingNumber.trim() === "") {
    throw new Error("Tracking number is required");
  }

  try {
    const response = await apiClient.post(
      "/api/v1/fulfillment/shipping/scan-tracking",
      { trackingNumber: trackingNumber.trim() }
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to scan tracking number";
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
 * Get full order details for a shipping record
 * Called in background while camera is open
 * @param {string} shippingRecordId - Shipping record ID from scan step
 * @returns {Promise<Object>} Full order and fulfillment details
 */
export async function getOrderDetails(shippingRecordId) {
  if (!shippingRecordId) {
    throw new Error("Shipping record ID is required");
  }

  try {
    const response = await apiClient.get("/api/v1/fulfillment/shipping/order-details", {
      params: { shippingRecordId },
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
 * Complete a shipping record
 * Sends photos as multipart/form-data (same pattern as packing)
 * Backend middleware handles S3 upload
 * @param {string} shippingRecordId - Shipping record ID
 * @param {Object} data - Completion data
 * @param {Array<File>} data.photos - Array of photo File objects (1-10 images)
 * @param {string} data.notes - Optional notes
 * @returns {Promise<Object>} Completed shipping record
 */
export async function completeShipping(shippingRecordId, data = {}) {
  if (!shippingRecordId) {
    throw new Error("Shipping record ID is required");
  }

  if (!data.photos || data.photos.length === 0) {
    throw new Error("At least one photo is required");
  }

  if (data.photos.length > 10) {
    throw new Error("Maximum 10 photos allowed");
  }

  try {
    const formData = new FormData();
    
    // Append photos (same field name as packing: "photos")
    data.photos.forEach((photo) => {
      formData.append("photos", photo);
    });

    // Append notes if provided
    if (data.notes) {
      formData.append("notes", data.notes);
    }

    const response = await apiClient.post(
      `/api/v1/fulfillment/shipping/${shippingRecordId}/complete`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to complete shipping";
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
 * Get all shipping records with pagination and filters
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 25, max: 100)
 * @param {string} filters.status - Filter by status: pending, photos_captured, completed, failed, cancelled
 * @param {string} filters.trackingNumber - Search by tracking number
 * @param {string} filters.startDate - Start date (ISO format)
 * @param {string} filters.endDate - End date (ISO format)
 * @param {string} filters.operatorId - Filter by operator
 * @param {string} filters.sortBy - Sort field: createdAt, scannedAt, completedAt, trackingNumber (default: createdAt)
 * @param {string} filters.sortOrder - Sort direction: asc, desc (default: desc)
 * @returns {Promise<Object>} Shipping records list with pagination
 */
export async function getAllShippingRecords(filters = {}) {
  try {
    const params = {};

    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = Math.min(filters.limit, 100);
    // Support both limit and pageSize for backward compatibility
    if (filters.pageSize && !filters.limit) params.limit = Math.min(filters.pageSize, 100);
    if (filters.status) params.status = filters.status;
    if (filters.trackingNumber) params.trackingNumber = filters.trackingNumber;
    // Support search for backward compatibility
    if (filters.search && !filters.trackingNumber) params.trackingNumber = filters.search;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.operatorId) params.operatorId = filters.operatorId;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    const response = await apiClient.get("/api/v1/fulfillment/shipping/records", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch shipping records";
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
 * Get shipping record details by ID
 * @param {string} shippingRecordId - Shipping record ID
 * @returns {Promise<Object>} Complete shipping record details
 */
export async function getShippingRecordDetails(shippingRecordId) {
  if (!shippingRecordId) {
    throw new Error("Shipping record ID is required");
  }

  try {
    const response = await apiClient.get(
      `/api/v1/fulfillment/shipping/records/${shippingRecordId}`
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch shipping record details";
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
      newError.status = error.response?.status;
      throw newError;
    }
    if (error.response?.status) {
      error.status = error.response.status;
    }
    throw error;
  }
}

/**
 * Delete a shipping record
 * @param {string} shippingRecordId - Shipping record ID
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteShippingRecord(shippingRecordId) {
  if (!shippingRecordId) {
    throw new Error("Shipping record ID is required");
  }

  try {
    const response = await apiClient.delete(
      `/api/v1/fulfillment/shipping/records/${shippingRecordId}`
    );

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to delete shipping record";
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
 * Get shipping statistics
 * @param {Object} filters - Optional filter parameters
 * @param {string} filters.startDate - Start date (ISO format)
 * @param {string} filters.endDate - End date (ISO format)
 * @param {string} filters.timezone - IANA timezone (default: America/New_York)
 * @returns {Promise<Object>} Shipping statistics
 */
export async function getShippingStats(filters = {}) {
  try {
    const params = {};

    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.timezone) params.timezone = filters.timezone;

    const response = await apiClient.get("/api/v1/fulfillment/shipping/stats", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch shipping statistics";
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

