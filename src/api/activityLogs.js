import apiClient from "./client";

/**
 * Get all fulfillment activities with optional filtering and pagination
 * @param {Object} filters - Filter parameters
 * @param {string} filters.search - Unified search across packingId, dropshipId, orderNumber, user name/email, tracking
 * @param {string} filters.packingId - Filter by packing order ID (backward compatibility)
 * @param {string} filters.dropshipId - Filter by dropship order ID (backward compatibility)
 * @param {string} filters.type - Filter by activity type
 * @param {string} filters.userId - Filter by user ID who performed the action
 * @param {string} filters.platform - Filter by platform/marketplace
 * @param {string} filters.sortBy - Sort field: "timestamp" | "type" | "user" (default: "timestamp")
 * @param {string} filters.sortOrder - Sort order: "asc" | "desc" (default: "desc")
 * @param {boolean} filters.includeStats - Include statistics in response (default: false)
 * @param {number} filters.limit - Items per page (max: 100, default: 50)
 * @param {number} filters.offset - Offset for pagination (default: 0)
 * @param {string} filters.startDate - Filter by start date (YYYY-MM-DD format)
 * @param {string} filters.endDate - Filter by end date (YYYY-MM-DD format)
 * @returns {Promise<Object>} List of activities, pagination info, and optional stats
 */
export async function getActivities(filters = {}) {
  try {
    const params = {};

    // New unified search (takes priority over packingId/dropshipId)
    if (filters.search) {
      params.search = filters.search;
    } else {
      // Backward compatibility: only use packingId/dropshipId if search is not provided
      if (filters.packingId) params.packingId = filters.packingId;
      if (filters.dropshipId) params.dropshipId = filters.dropshipId;
    }

    // Existing filters
    if (filters.type) params.type = filters.type;
    if (filters.limit) params.limit = filters.limit;
    if (filters.offset !== undefined) params.offset = filters.offset;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    // New filters
    if (filters.userId) params.userId = filters.userId;
    if (filters.platform) params.platform = filters.platform;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;
    if (filters.includeStats !== undefined) {
      params.includeStats = filters.includeStats;
    }

    const response = await apiClient.get("/api/v1/fulfillment/activities", {
      params,
    });

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to fetch activities";
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
 * Create a manual activity entry (for notes, messages, etc.)
 * @param {Object} activityData - Activity data
 * @param {string} activityData.packingId - Packing order ID (conditional)
 * @param {string} activityData.dropshipId - Dropship order ID (conditional)
 * @param {string} activityData.type - Activity type
 * @param {string} activityData.message - Activity message
 * @param {string} activityData.details - Optional detailed description
 * @param {Object} activityData.metadata - Optional additional metadata
 * @returns {Promise<Object>} Created activity
 */
export async function createActivity(activityData) {
  if (!activityData.packingId && !activityData.dropshipId) {
    throw new Error("At least one of packingId or dropshipId is required");
  }
  if (!activityData.type) {
    throw new Error("Activity type is required");
  }
  if (!activityData.message) {
    throw new Error("Activity message is required");
  }

  try {
    const response = await apiClient.post("/api/v1/fulfillment/activities", activityData);

    if (!response.data.success) {
      const errorMsg = response.data.error?.message || "Failed to create activity";
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
