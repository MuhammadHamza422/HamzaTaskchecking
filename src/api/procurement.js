import apiClient from "./client";
import { fetchAllUsers } from "./auth";
import { fetchCompanies } from "./company";
import { getEmployees } from "./employees";

/**
 * PROCUREMENT API CLIENT
 * 
 * All endpoints use the base URL: /api/v1/procurement
 */

// ==================== Purchase Orders ====================

/**
 * Get paginated list of purchase orders
 * @param {Object} params - Query parameters
 * @returns {Promise} Purchase orders list with pagination
 */
export const getPurchaseOrders = async (params = {}) => {
  const { data } = await apiClient.get("/api/v1/procurement/orders", {
    params,
  });
  return data;
};

/**
 * Get single purchase order by ID
 * @param {string} poId - Purchase order ID
 * @returns {Promise} Purchase order details
 */
export const getPurchaseOrder = async (poId) => {
  const { data } = await apiClient.get(`/api/v1/procurement/orders/${poId}`);
  return data;
};

/**
 * Get purchase order receipt data
 * @param {string} poId - Purchase order ID
 * @returns {Promise} Receipt data for printing
 */
export const getPurchaseOrderReceipt = async (poId) => {
  const { data } = await apiClient.get(`/api/v1/procurement/orders/${poId}/receipt`);
  return data;
};

/**
 * Create new purchase order
 * @param {Object} purchaseOrder - Purchase order data
 * @returns {Promise} Created purchase order
 */
export const createPurchaseOrder = async (purchaseOrder) => {
  const { data } = await apiClient.post("/api/v1/procurement/orders", purchaseOrder);
  return data;
};

/**
 * Toggle favorite status of a purchase order
 * @param {string} poId - Purchase order ID
 * @returns {Promise} Response with isFavorite status
 */
export const toggleFavorite = async (poId) => {
  const { data } = await apiClient.put(`/api/v1/procurement/orders/${poId}/favorite`);
  return data;
};

/**
 * Update purchase order
 * @param {string} poId - Purchase order ID
 * @param {Object} updates - Fields to update
 * @returns {Promise} Updated purchase order
 */
export const updatePurchaseOrder = async (poId, updates) => {
  const { data } = await apiClient.patch(`/api/v1/procurement/orders/${poId}`, updates);
  return data;
};

/**
 * Delete purchase order
 * @param {string} poId - Purchase order ID
 * @returns {Promise} Success response
 */
export const deletePurchaseOrder = async (poId) => {
  const { data } = await apiClient.delete(`/api/v1/procurement/orders/${poId}`);
  return data;
};

/**
 * Update purchase order status
 * @param {string} poId - Purchase order ID
 * @param {string} status - New status
 * @returns {Promise} Updated purchase order
 */
export const updatePurchaseOrderStatus = async (poId, status) => {
  const { data } = await apiClient.post(`/api/v1/procurement/orders/${poId}/status`, {
    status,
  });
  return data;
};

/**
 * Mark products as received
 * @param {string} poId - Purchase order ID
 * @param {Object} receiptData - Receipt data
 * @returns {Promise} Updated purchase order
 */
export const receiveProducts = async (poId, receiptData) => {
  const { data } = await apiClient.post(`/api/v1/procurement/orders/${poId}/receive`, receiptData);
  return data;
};

/**
 * Send purchase order by email
 * @param {string} poId - Purchase order ID
 * @param {Object} emailData - Email data
 * @returns {Promise} Success response
 */
export const sendPurchaseOrderEmail = async (poId, emailData) => {
  const { data } = await apiClient.post(`/api/v1/procurement/orders/${poId}/send-email`, emailData);
  return data;
};

// ==================== Statistics ====================

/**
 * Get procurement statistics for dashboard
 * @returns {Promise} Statistics object
 */
export const getProcurementStats = async () => {
  const { data } = await apiClient.get("/api/v1/procurement/orders/stats");
  return data;
};

// ==================== Activities ====================

/**
 * Get activities for a purchase order
 * @param {string} poId - Purchase order ID
 * @param {Object} params - Query parameters
 * @returns {Promise} Activities list
 */
export const getPurchaseOrderActivities = async (poId, params = {}) => {
  const { data } = await apiClient.get(`/api/v1/procurement/orders/${poId}/activities`, {
    params,
  });
  return data;
};

/**
 * Create activity log entry
 * @param {string} poId - Purchase order ID
 * @param {Object} activity - Activity data
 * @returns {Promise} Created activity
 */
export const createActivity = async (poId, activity) => {
  const { data } = await apiClient.post(`/api/v1/procurement/orders/${poId}/activities`, activity);
  return data;
};

// ==================== Vendors ====================

/**
 * Get list of vendors/sellers
 * Uses the sellers API endpoint: /api/v1/sellers/list
 * @param {Object} params - Query parameters (page, limit, q, sort, verified, blocked)
 * @returns {Promise} Vendors list formatted for components
 */
export const getVendors = async (params = {}) => {
  try {
    const { data } = await apiClient.get("/api/v1/sellers/list", { params });
    const list = Array.isArray(data?.data) ? data.data : [];
    return list.map((seller) => ({
      id: seller._id || seller.id,
      name: seller.name,
      email: seller.email || "",
      phone: seller.phone || "",
      address: seller.address || "",
    }));
  } catch (error) {
    console.error("Failed to fetch vendors:", error);
    return [];
  }
};

// ==================== Users ====================

/**
 * Get list of users (for buyer selection)
 * Uses the employees API endpoint: /api/v1/employees/list
 * @returns {Promise} Users list formatted for components
 */
export const getUsers = async () => {
  try {
    const response = await getEmployees({ page: 1, limit: 10000 });
    const employees = response?.data || [];
    return employees.map((employee) => ({
      id: employee._id || employee.id,
      name: employee.fullName || 
            (employee.firstName && employee.lastName 
              ? `${employee.firstName} ${employee.lastName}` 
              : employee.name || employee.email?.split("@")[0] || "Unknown"),
      email: employee.email || "",
      avatar: employee.avatar || null,
    }));
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return [];
  }
};

// ==================== Companies ====================

/**
 * Get list of companies
 * Uses the company API endpoint: /api/v1/company/all
 * @returns {Promise} Companies list formatted for components
 */
export const getCompanies = async () => {
  try {
    const companies = await fetchCompanies();
    return companies.map((company) => ({
      id: company._id || company.id,
      name: company.name,
      timezone: company.timezone || "",
    }));
  } catch (error) {
    console.error("Failed to fetch companies:", error);
    return [];
  }
};

// ==================== Kits ====================

/**
 * Create a new kit
 * @param {Object} kitData - Kit data
 * @returns {Promise} Created kit
 */
export const createKit = async (kitData) => {
  const { data } = await apiClient.post("/api/v1/procurement/kits", kitData);
  return data;
};

/**
 * Get all kits with pagination and filtering
 * @param {Object} params - Query parameters (page, limit, search, isActive)
 * @returns {Promise} Kits list with pagination
 */
export const getKits = async (params = {}) => {
  const { data } = await apiClient.get("/api/v1/procurement/kits", { params });
  return data;
};

/**
 * Get single kit by ID
 * @param {string} kitId - Kit ID or MongoDB ObjectId
 * @returns {Promise} Kit details
 */
export const getKit = async (kitId) => {
  const { data } = await apiClient.get(`/api/v1/procurement/kits/${kitId}`);
  return data;
};

/**
 * Update kit
 * @param {string} kitId - Kit ID or MongoDB ObjectId
 * @param {Object} updates - Fields to update
 * @returns {Promise} Updated kit
 */
export const updateKit = async (kitId, updates) => {
  const { data } = await apiClient.put(`/api/v1/procurement/kits/${kitId}`, updates);
  return data;
};

/**
 * Delete kit (soft delete)
 * @param {string} kitId - Kit ID or MongoDB ObjectId
 * @returns {Promise} Success response
 */
export const deleteKit = async (kitId) => {
  const { data } = await apiClient.delete(`/api/v1/procurement/kits/${kitId}`);
  return data;
};

/**
 * Bulk apply kit to multiple products in purchase order
 * @param {string} poId - Purchase Order ID
 * @param {Object} applyData - {kitId, productIds[], quantity}
 * @returns {Promise} Success response with updated products
 */
export const applyKitToProducts = async (poId, applyData) => {
  const { data } = await apiClient.post(
    `/api/v1/procurement/orders/${poId}/apply-kit`,
    applyData
  );
  return data;
};

// ==================== Boxes ====================

/**
 * Create a box for a purchase order
 * @param {string} poId - Purchase Order ID
 * @param {Object} boxData - Box data (name, items[])
 * @returns {Promise} Created box
 */
export const createBox = async (poId, boxData) => {
  const { data } = await apiClient.post(
    `/api/v1/procurement/purchase-orders/${poId}/boxes`,
    boxData
  );
  return data;
};

/**
 * Get all boxes for a purchase order
 * @param {string} poId - Purchase Order ID
 * @param {Object} params - Query parameters (includeItems)
 * @returns {Promise} Boxes list
 */
export const getBoxes = async (poId, params = {}) => {
  const { data } = await apiClient.get(
    `/api/v1/procurement/purchase-orders/${poId}/boxes`,
    { params }
  );
  return data;
};

/**
 * Get box details by boxId
 * @param {string} boxId - Box ID or MongoDB ObjectId
 * @returns {Promise} Box details
 */
export const getBox = async (boxId) => {
  const { data } = await apiClient.get(`/api/v1/procurement/boxes/${boxId}`);
  return data;
};

/**
 * Update box (assign/remove items)
 * @param {string} boxId - Box ID or MongoDB ObjectId
 * @param {Object} updates - Fields to update
 * @returns {Promise} Updated box
 */
export const updateBox = async (boxId, updates) => {
  const { data } = await apiClient.put(`/api/v1/procurement/boxes/${boxId}`, updates);
  return data;
};

/**
 * Delete box (soft delete)
 * @param {string} boxId - Box ID or MongoDB ObjectId
 * @returns {Promise} Success response
 */
export const deleteBox = async (boxId) => {
  const { data } = await apiClient.delete(`/api/v1/procurement/boxes/${boxId}`);
  return data;
};

// ==================== QR Codes ====================

/**
 * Get QR code data for a box
 * @param {string} boxId - Box ID or MongoDB ObjectId
 * @returns {Promise} QR code data
 */
export const getBoxQRData = async (boxId) => {
  const { data } = await apiClient.get(`/api/v1/procurement/boxes/${boxId}/qr-data`);
  return data;
};

/**
 * Generate QR code image for a box
 * @param {string} boxId - Box ID or MongoDB ObjectId
 * @param {Object} params - Query parameters (format, size)
 * @returns {Promise} QR code image (base64 or blob)
 */
export const getBoxQRCode = async (boxId, params = {}) => {
  const { data } = await apiClient.get(`/api/v1/procurement/boxes/${boxId}/qr-code`, {
    params,
  });
  return data;
};

/**
 * Get QR code data for a product
 * @param {string} productId - Product ID
 * @param {Object} params - Query parameters (sku, boxId, poId)
 * @returns {Promise} QR code data
 */
export const getProductQRData = async (productId, params = {}) => {
  const { data } = await apiClient.get(
    `/api/v1/procurement/products/${productId}/qr-data`,
    { params }
  );
  return data;
};

/**
 * Get QR code for a product or kit in a purchase order
 * @param {string} poId - Purchase Order ID
 * @param {string} productId - Product ID (ObjectId) or Kit ID (string like KIT-P00021-1)
 * @param {Object} params - Query parameters (format, size, unit)
 * @returns {Promise} QR code data
 */
export const getProductQRCode = async (poId, productId, params = {}) => {
  const { data } = await apiClient.get(
    `/api/v1/procurement/orders/${poId}/products/${productId}/qr-code`,
    { params }
  );
  return data;
};

/**
 * Regenerate QR code for a product or kit with custom size
 * @param {string} poId - Purchase Order ID
 * @param {string} productId - Product ID (ObjectId) or Kit ID (string)
 * @param {Object} params - Query parameters or body (size, unit)
 * @returns {Promise} Updated QR code data
 */
export const regenerateProductQRCode = async (poId, productId, params = {}) => {
  const { data } = await apiClient.post(
    `/api/v1/procurement/orders/${poId}/products/${productId}/regenerate-qr`,
    params
  );
  return data;
};

// ==================== Scanning ====================

/**
 * Scan box QR code (get box details from scan)
 * @param {string} boxId - Box ID
 * @returns {Promise} Box details with items
 */
export const scanBox = async (boxId) => {
  const { data } = await apiClient.get(`/api/v1/procurement/scan/box/${boxId}`);
  return data;
};

/**
 * Scan product QR code (get product details from scan)
 * @param {string} productId - Product ID
 * @param {Object} params - Query parameters (sku, boxId, poId)
 * @returns {Promise} Product details with context
 */
export const scanProduct = async (productId, params = {}) => {
  const { data } = await apiClient.get(`/api/v1/procurement/scan/product/${productId}`, {
    params,
  });
  return data;
};

/**
 * Scan kit QR code (get kit details from scan)
 * @param {string} kitId - Kit ID (e.g., "KIT-P00021-1")
 * @param {Object} params - Query parameters (poId - optional)
 * @returns {Promise} Kit details with kitProducts array
 */
export const scanKit = async (kitId, params = {}) => {
  const { data } = await apiClient.get(`/api/v1/procurement/scan/kit/${kitId}`, {
    params,
  });
  return data;
};

// ==================== Printing ====================

/**
 * Print packing list for purchase order
 * @param {string} poId - Purchase Order ID
 * @param {Object} params - Query parameters (format, includeBoxes)
 * @returns {Promise} Packing list document
 */
export const printPackingList = async (poId, params = {}) => {
  const { data } = await apiClient.get(
    `/api/v1/procurement/purchase-orders/${poId}/packing-list`,
    { params, responseType: "blob" }
  );
  return data;
};

/**
 * Print box labels
 * @param {Object} printData - {boxIds[], format, template}
 * @returns {Promise} PDF blob
 */
export const printBoxLabels = async (printData) => {
  const { data } = await apiClient.post(
    `/api/v1/procurement/boxes/print-labels`,
    printData,
    { responseType: "blob" }
  );
  return data;
};

/**
 * Print item labels
 * @param {Object} printData - {products[], format, template}
 * @returns {Promise} PDF blob
 */
export const printItemLabels = async (printData) => {
  const { data } = await apiClient.post(
    `/api/v1/procurement/products/print-labels`,
    printData,
    { responseType: "blob" }
  );
  return data;
};

// ==================== Documents ====================

/**
 * Upload document for a purchase order
 * @param {string} poId - Purchase Order ID
 * @param {FormData} formData - FormData with file, name (optional), description (optional), category (optional)
 * @returns {Promise} Uploaded document data
 */
export const uploadDocument = async (poId, formData) => {
  const { data } = await apiClient.post(
    `/api/v1/procurement/orders/${poId}/documents`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data;
};

/**
 * Get all documents for a purchase order
 * @param {string} poId - Purchase Order ID
 * @param {Object} params - Query parameters (category, page, limit, sort)
 * @returns {Promise} Documents list with pagination
 */
export const getDocuments = async (poId, params = {}) => {
  const { data } = await apiClient.get(
    `/api/v1/procurement/orders/${poId}/documents`,
    { params }
  );
  return data;
};

/**
 * Get single document by ID
 * @param {string} poId - Purchase Order ID
 * @param {string} documentId - Document ID
 * @returns {Promise} Document data
 */
export const getDocument = async (poId, documentId) => {
  const { data } = await apiClient.get(
    `/api/v1/procurement/orders/${poId}/documents/${documentId}`
  );
  return data;
};

/**
 * Delete document
 * @param {string} poId - Purchase Order ID
 * @param {string} documentId - Document ID
 * @returns {Promise} Success response
 */
export const deleteDocument = async (poId, documentId) => {
  const { data } = await apiClient.delete(
    `/api/v1/procurement/orders/${poId}/documents/${documentId}`
  );
  return data;
};

/**
 * Download document
 * @param {string} poId - Purchase Order ID
 * @param {string} documentId - Document ID
 * @returns {Promise} File download (redirects or blob)
 */
export const downloadDocument = async (poId, documentId) => {
  // If backend redirects to S3 URL, just return the URL
  // Otherwise, handle as blob download
  const response = await apiClient.get(
    `/api/v1/procurement/orders/${poId}/documents/${documentId}/download`,
    { responseType: "blob" }
  );
  return response.data;
};

// ==================== Shipping Details ====================

/**
 * Create or update shipping details for a purchase order
 * @param {string} poId - Purchase Order ID
 * @param {Object} shippingData - {bookingDate, crd, trackingId, trackingLink}
 * @returns {Promise} Shipping details data
 */
export const updateShippingDetails = async (poId, shippingData) => {
  const { data } = await apiClient.put(
    `/api/v1/procurement/orders/${poId}/shipping-details`,
    shippingData
  );
  return data;
};

/**
 * Get shipping details for a purchase order
 * @param {string} poId - Purchase Order ID
 * @returns {Promise} Shipping details data (or null if not set)
 */
export const getShippingDetails = async (poId) => {
  const { data } = await apiClient.get(
    `/api/v1/procurement/orders/${poId}/shipping-details`
  );
  return data;
};

// ==================== Costs ====================

/**
 * Add cost item to a purchase order
 * @param {string} poId - Purchase Order ID
 * @param {Object} costData - {item, cost, currency}
 * @returns {Promise} Created cost item data
 */
export const addCost = async (poId, costData) => {
  const { data } = await apiClient.post(
    `/api/v1/procurement/orders/${poId}/costs`,
    costData
  );
  return data;
};

/**
 * Get all cost items for a purchase order
 * @param {string} poId - Purchase Order ID
 * @param {Object} params - Query parameters (currency, page, limit, sort)
 * @returns {Promise} Costs list with pagination and summary
 */
export const getCosts = async (poId, params = {}) => {
  const { data } = await apiClient.get(
    `/api/v1/procurement/orders/${poId}/costs`,
    { params }
  );
  return data;
};

/**
 * Update cost item
 * @param {string} poId - Purchase Order ID
 * @param {string} costId - Cost Item ID
 * @param {Object} updates - {item, cost, currency} (all optional)
 * @returns {Promise} Updated cost item data
 */
export const updateCost = async (poId, costId, updates) => {
  const { data } = await apiClient.put(
    `/api/v1/procurement/orders/${poId}/costs/${costId}`,
    updates
  );
  return data;
};

/**
 * Delete cost item
 * @param {string} poId - Purchase Order ID
 * @param {string} costId - Cost Item ID
 * @returns {Promise} Success response
 */
export const deleteCost = async (poId, costId) => {
  const { data } = await apiClient.delete(
    `/api/v1/procurement/orders/${poId}/costs/${costId}`
  );
  return data;
};

// ==================== Dashboard Stats ====================

/**
 * Get procurement dashboard statistics
 * @param {Object} params - Query parameters (dateFrom, dateTo, company, vendor)
 * @returns {Promise} Dashboard statistics
 */
export const getDashboardStats = async (params = {}) => {
  const { data } = await apiClient.get("/api/v1/procurement/dashboard/stats", {
    params,
  });
  return data;
};
