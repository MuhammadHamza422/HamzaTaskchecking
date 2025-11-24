export const ACTIVITY_TYPES = {
  // Packing Activities
  PACKING_CREATED: "packing_created",
  PACKING_UPDATED: "packing_updated",
  PACKING_DELETED: "packing_deleted",
  ITEMS_SELECTED: "items_selected",
  ITEMS_DESELECTED: "items_deselected",
  PHOTOS_ADDED: "photos_added",
  PHOTOS_REMOVED: "photos_removed",
  NOTES_UPDATED: "notes_updated",

  // Dropship Activities
  DROPSHIP_CREATED: "dropship_created",
  DROPSHIP_STATUS_CHANGED: "dropship_status_changed",
  MARKETPLACE_ORDER_CREATED: "marketplace_order_created",
  ITEM_FULFILLED: "item_fulfilled",

  // Missing Product Activities
  MISSING_PRODUCT_ADDED: "missing_product_added",
  MISSING_PRODUCT_DELETED: "missing_product_deleted",

  // Communication Activities
  NOTE: "note",
  MESSAGE: "message",
  SYSTEM: "system",
};

export const ACTIVITY_COLORS = {
  [ACTIVITY_TYPES.PACKING_CREATED]: {
    primary: "#10B981",
    background: "#D1FAE5",
    text: "#065F46",
    badge: "green",
  },
  [ACTIVITY_TYPES.PACKING_UPDATED]: {
    primary: "#3B82F6",
    background: "#DBEAFE",
    text: "#1E40AF",
    badge: "blue",
  },
  [ACTIVITY_TYPES.PACKING_DELETED]: {
    primary: "#EF4444",
    background: "#FEE2E2",
    text: "#991B1B",
    badge: "red",
  },
  [ACTIVITY_TYPES.ITEMS_SELECTED]: {
    primary: "#10B981",
    background: "#D1FAE5",
    text: "#065F46",
    badge: "green",
  },
  [ACTIVITY_TYPES.ITEMS_DESELECTED]: {
    primary: "#F59E0B",
    background: "#FEF3C7",
    text: "#92400E",
    badge: "amber",
  },
  [ACTIVITY_TYPES.PHOTOS_ADDED]: {
    primary: "#8B5CF6",
    background: "#EDE9FE",
    text: "#5B21B6",
    badge: "purple",
  },
  [ACTIVITY_TYPES.PHOTOS_REMOVED]: {
    primary: "#EF4444",
    background: "#FEE2E2",
    text: "#991B1B",
    badge: "red",
  },
  [ACTIVITY_TYPES.NOTES_UPDATED]: {
    primary: "#6366F1",
    background: "#E0E7FF",
    text: "#4338CA",
    badge: "indigo",
  },
  [ACTIVITY_TYPES.DROPSHIP_CREATED]: {
    primary: "#10B981",
    background: "#D1FAE5",
    text: "#065F46",
    badge: "green",
  },
  [ACTIVITY_TYPES.DROPSHIP_STATUS_CHANGED]: {
    primary: "#3B82F6",
    background: "#DBEAFE",
    text: "#1E40AF",
    badge: "blue",
  },
  [ACTIVITY_TYPES.MARKETPLACE_ORDER_CREATED]: {
    primary: "#8B5CF6",
    background: "#EDE9FE",
    text: "#5B21B6",
    badge: "purple",
  },
  [ACTIVITY_TYPES.ITEM_FULFILLED]: {
    primary: "#10B981",
    background: "#D1FAE5",
    text: "#065F46",
    badge: "green",
  },
  [ACTIVITY_TYPES.MISSING_PRODUCT_ADDED]: {
    primary: "#F59E0B",
    background: "#FEF3C7",
    text: "#92400E",
    badge: "amber",
  },
  [ACTIVITY_TYPES.MISSING_PRODUCT_DELETED]: {
    primary: "#EF4444",
    background: "#FEE2E2",
    text: "#991B1B",
    badge: "red",
  },
  [ACTIVITY_TYPES.NOTE]: {
    primary: "#6366F1",
    background: "#E0E7FF",
    text: "#4338CA",
    badge: "indigo",
  },
  [ACTIVITY_TYPES.MESSAGE]: {
    primary: "#8B5CF6",
    background: "#EDE9FE",
    text: "#5B21B6",
    badge: "purple",
  },
  [ACTIVITY_TYPES.SYSTEM]: {
    primary: "#6B7280",
    background: "#F3F4F6",
    text: "#1F2937",
    badge: "default",
  },
};

export const ACTIVITY_LABELS = {
  [ACTIVITY_TYPES.PACKING_CREATED]: "Packing Created",
  [ACTIVITY_TYPES.PACKING_UPDATED]: "Packing Updated",
  [ACTIVITY_TYPES.PACKING_DELETED]: "Packing Deleted",
  [ACTIVITY_TYPES.ITEMS_SELECTED]: "Items Selected",
  [ACTIVITY_TYPES.ITEMS_DESELECTED]: "Items Deselected",
  [ACTIVITY_TYPES.PHOTOS_ADDED]: "Photos Added",
  [ACTIVITY_TYPES.PHOTOS_REMOVED]: "Photos Removed",
  [ACTIVITY_TYPES.NOTES_UPDATED]: "Notes Updated",
  [ACTIVITY_TYPES.DROPSHIP_CREATED]: "Dropship Created",
  [ACTIVITY_TYPES.DROPSHIP_STATUS_CHANGED]: "Status Changed",
  [ACTIVITY_TYPES.MARKETPLACE_ORDER_CREATED]: "Marketplace Order",
  [ACTIVITY_TYPES.ITEM_FULFILLED]: "Item Fulfilled",
  [ACTIVITY_TYPES.MISSING_PRODUCT_ADDED]: "Missing Product",
  [ACTIVITY_TYPES.MISSING_PRODUCT_DELETED]: "Missing Product Removed",
  [ACTIVITY_TYPES.NOTE]: "Note",
  [ACTIVITY_TYPES.MESSAGE]: "Message",
  [ACTIVITY_TYPES.SYSTEM]: "System",
};
