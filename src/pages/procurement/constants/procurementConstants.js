/**
 * Procurement Module Constants
 */

// Purchase Order Statuses (Updated to match backend)
export const PO_STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  PICKUP_SCHEDULED: "pickup_scheduled",
  IN_TRANSIT: "in_transit",
  RECEIVED: "received",
  CANCELLED: "cancelled",
};

// Status Display Labels
export const PO_STATUS_LABELS = {
  [PO_STATUS.DRAFT]: "Draft",
  [PO_STATUS.CONFIRMED]: "Confirmed",
  [PO_STATUS.PICKUP_SCHEDULED]: "Pickup Scheduled",
  [PO_STATUS.IN_TRANSIT]: "In Transit",
  [PO_STATUS.RECEIVED]: "Received",
  [PO_STATUS.CANCELLED]: "Cancelled",
};

// Status Badge Colors (matching backend expectations)
export const PO_STATUS_COLORS = {
  [PO_STATUS.DRAFT]: "bg-gray-100 text-gray-700 border-gray-200",
  [PO_STATUS.CONFIRMED]: "bg-blue-100 text-blue-700 border-blue-200",
  [PO_STATUS.PICKUP_SCHEDULED]: "bg-orange-100 text-orange-700 border-orange-200",
  [PO_STATUS.IN_TRANSIT]: "bg-yellow-100 text-yellow-700 border-yellow-200",
  [PO_STATUS.RECEIVED]: "bg-green-100 text-green-700 border-green-200",
  [PO_STATUS.CANCELLED]: "bg-red-100 text-red-700 border-red-200",
};

// Status Transition Rules (from backend)
// Key: current status, Value: array of allowed next statuses
export const PO_STATUS_TRANSITIONS = {
  [PO_STATUS.DRAFT]: [PO_STATUS.CONFIRMED, PO_STATUS.CANCELLED],
  [PO_STATUS.CONFIRMED]: [PO_STATUS.PICKUP_SCHEDULED, PO_STATUS.CANCELLED],
  [PO_STATUS.PICKUP_SCHEDULED]: [PO_STATUS.IN_TRANSIT, PO_STATUS.CANCELLED],
  [PO_STATUS.IN_TRANSIT]: [PO_STATUS.RECEIVED, PO_STATUS.CANCELLED],
  [PO_STATUS.RECEIVED]: [], // Final status
  [PO_STATUS.CANCELLED]: [], // Final status
};

// Status Flow Order (for workflow visualization)
export const PO_STATUS_FLOW = [
  PO_STATUS.DRAFT,
  PO_STATUS.CONFIRMED,
  PO_STATUS.PICKUP_SCHEDULED,
  PO_STATUS.IN_TRANSIT,
  PO_STATUS.RECEIVED,
];

// Receipt Status (unchanged)
export const RECEIPT_STATUS = {
  NO_RECEIPT: "no_receipt",
  READY_TO_RECEIVE: "ready_to_receive",
  PARTIALLY_RECEIVED: "partially_received",
  FULLY_RECEIVED: "fully_received",
};

export const RECEIPT_STATUS_LABELS = {
  [RECEIPT_STATUS.NO_RECEIPT]: "No Receipt",
  [RECEIPT_STATUS.READY_TO_RECEIVE]: "Ready To Receive",
  [RECEIPT_STATUS.PARTIALLY_RECEIVED]: "Partially Received",
  [RECEIPT_STATUS.FULLY_RECEIVED]: "Fully Received",
};

// Shipping Methods
export const SHIPPING_METHODS = [
  { value: "by_air", label: "By Air" },
  { value: "by_sea", label: "By Sea" },
  { value: "by_land", label: "By Land" },
  { value: "express", label: "Express" },
];

// Activity Types
export const ACTIVITY_TYPES = {
  STATUS_CHANGE: "status_change",
  AMOUNT_UPDATE: "amount_update",
  PRODUCT_ADDED: "product_added",
  PRODUCT_REMOVED: "product_removed",
  PRODUCT_UPDATED: "product_updated",
  RECEIPT_UPDATE: "receipt_update",
  NOTE: "note",
  MESSAGE: "message",
  SYSTEM: "system",
};

// Table Column IDs
export const TABLE_COLUMNS = {
  CHECKBOX: "checkbox",
  STAR: "star",
  DATE_CREATED: "dateCreated",
  REFERENCE: "reference",
  VENDOR: "vendor",
  COMPANY: "company",
  BUYER: "buyer",
  ORDER_DEADLINE: "orderDeadline",
  ACTIVITIES: "activities",
  TOTAL: "total",
  STATUS: "status",
  RECEIPT: "receipt",
};
