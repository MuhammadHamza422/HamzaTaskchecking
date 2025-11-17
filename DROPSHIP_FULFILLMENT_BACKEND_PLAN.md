# Dropship Order Fulfillment - Backend API Plan

## Overview
This document outlines the backend APIs required to implement per-item fulfillment for dropship orders, where each item can be fulfilled individually with marketplace order details, tracking information, and automatic movement to packing orders.

## Current Flow
1. User views dropship order details
2. Each order item has a checkbox/row that can be clicked
3. Clicking opens a fulfillment modal with:
   - Marketplace Name (required)
   - Marketplace Order Number (optional)
   - Notes (optional)
   - Tracking ID (required)
   - Tracking Link (required)
4. After submitting, the item status becomes "Fulfilled"
5. Item automatically moves to packing orders
6. When all items are fulfilled, dropship order status becomes "Completely Fulfilled"
7. Dropship order is removed from dropship list and moved to packing orders as a complete order

---

## Required Backend APIs

### 1. Fulfill Individual Dropship Item
**Endpoint:** `POST /api/v1/fulfillment/dropship/:dropshipId/items/:lineItemId/fulfill`

**Authentication:** Required (Bearer token)

**Authorization:** Admin/Warehouse role required

**Request Body:**
```json
{
  "marketplaceName": "Shopify",                    // Required, string, max 100 chars
  "marketplaceOrderNumber": "SH-12345",            // Optional, string, max 100 chars
  "notes": "Order fulfilled via Shopify",          // Optional, string, max 1000 chars
  "trackingId": "1Z999AA10123456784",              // Required, string, max 100 chars
  "trackingLink": "https://tracking.example.com/1Z999AA10123456784"  // Required, string, max 500 chars, must be valid URL
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "dropshipId": "DS-20250115-001",
    "lineItemId": "gid://shopify/LineItem/17077066989872",
    "fulfillmentStatus": "Fulfilled",
    "marketplaceName": "Shopify",
    "marketplaceOrderNumber": "SH-12345",
    "trackingId": "1Z999AA10123456784",
    "trackingLink": "https://tracking.example.com/1Z999AA10123456784",
    "packingId": "507f1f77bcf86cd799439011",        // NEW: Packing order ID created for this item
    "packingOrderNumber": "PK-20250115-001",        // NEW: Packing order number
    "fulfilledAt": "2025-01-15T12:00:00.000Z",
    "fulfilledBy": {
      "userId": "507f1f77bcf86cd799439012",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "dropshipStatus": "Partially Fulfilled",        // Updated dropship order status
    "remainingItemsCount": 2,                      // Items still unfulfilled
    "fulfilledItemsCount": 1                        // Items fulfilled so far
  }
}
```

**Error Responses:**
- `400` - Validation error (missing required fields, invalid URL, etc.)
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Dropship order or line item not found
- `409` - Item already fulfilled

**Backend Logic:**
1. Validate request body (required fields, URL format, etc.)
2. Verify dropship order exists and is not deleted
3. Verify line item exists in dropship order and is not already fulfilled
4. Create a new packing order for this single item:
   - Use original order details (customer, shipping address, etc.)
   - Include only the fulfilled item
   - Set status to "Completely Fulfilled" (single item = complete)
   - Add tracking information
   - Add marketplace order details
   - Link back to original dropship order
5. Update line item status to "Fulfilled" in dropship order
6. Update dropship order status:
   - If all items fulfilled → "Completely Fulfilled"
   - If some items fulfilled → "Partially Fulfilled"
   - If no items fulfilled → "Unfulfilled"
7. If all items are fulfilled:
   - Create a consolidated packing order with all items
   - Mark dropship order as "Completely Fulfilled"
   - Optionally: Soft delete or archive the dropship order
8. Return response with packing order details

---

### 2. Get Dropship Order Details (MODIFIED)
**Endpoint:** `GET /api/v1/fulfillment/dropship/:dropshipId` (existing endpoint)

**Changes:**
- Add `fulfillmentStatus` field to each item in `deselectedItems` array
- Add `fulfilledItemsCount` and `remainingItemsCount` to response
- Add `packingOrders` array with linked packing order IDs

**New Response Structure:**
```json
{
  "success": true,
  "data": {
    "dropshipId": "DS-20250115-001",
    "originalOrderId": "699189",
    "originalOrderNumber": "699189",
    "platform": "woocommerce",
    "status": "Partially Fulfilled",              // Updated status
    "fulfilledItemsCount": 1,                     // NEW
    "remainingItemsCount": 2,                     // NEW
    "deselectedItems": [
      {
        "id": "gid://shopify/LineItem/17077066989872",
        "productId": "33421",
        "name": "Product Name",
        "sku": "SKU-123",
        "variant": null,
        "quantity": 1,
        "price": 50.00,
        "total": 50.00,
        "image": "https://example.com/image.jpg",
        "fulfillmentStatus": "Fulfilled",         // NEW: "Unfulfilled" | "Fulfilled"
        "fulfilledAt": "2025-01-15T12:00:00.000Z", // NEW: Only if fulfilled
        "marketplaceName": "Shopify",             // NEW: Only if fulfilled
        "marketplaceOrderNumber": "SH-12345",     // NEW: Only if fulfilled
        "trackingId": "1Z999AA10123456784",       // NEW: Only if fulfilled
        "trackingLink": "https://tracking.example.com/...", // NEW: Only if fulfilled
        "packingId": "507f1f77bcf86cd799439011"   // NEW: Packing order ID if fulfilled
      },
      {
        "id": "item2",
        // ... other fields
        "fulfillmentStatus": "Unfulfilled"        // NEW
      }
    ],
    "packingOrders": [                            // NEW: Array of packing orders created from this dropship
      {
        "packingId": "507f1f77bcf86cd799439011",
        "packingOrderNumber": "PK-20250115-001",
        "status": "Completely Fulfilled",
        "createdAt": "2025-01-15T12:00:00.000Z",
        "itemsCount": 1
      }
    ],
    // ... other existing fields
  }
}
```

---

### 3. Get All Dropship Orders (MODIFIED)
**Endpoint:** `GET /api/v1/fulfillment/dropship` (existing endpoint)

**Changes:**
- Add `fulfilledItemsCount` and `remainingItemsCount` to each order in the list
- Filter out completely fulfilled orders (or show them with a filter option)

**New Response Fields:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "dropshipId": "DS-20250115-001",
        "originalOrderId": "699189",
        "originalOrderNumber": "699189",
        "platform": "woocommerce",
        "status": "Partially Fulfilled",
        "deselectedItemsCount": 3,
        "fulfilledItemsCount": 1,                  // NEW
        "remainingItemsCount": 2,                  // NEW
        // ... other existing fields
      }
    ],
    // ... pagination
  }
}
```

---

### 4. Get Fulfillment History for Item (Optional)
**Endpoint:** `GET /api/v1/fulfillment/dropship/:dropshipId/items/:lineItemId/fulfillment-history`

**Authentication:** Required

**Request:** No body required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "lineItemId": "gid://shopify/LineItem/17077066989872",
    "fulfillmentHistory": [
      {
        "fulfillmentId": "507f1f77bcf86cd799439012",
        "marketplaceName": "Shopify",
        "marketplaceOrderNumber": "SH-12345",
        "trackingId": "1Z999AA10123456784",
        "trackingLink": "https://tracking.example.com/...",
        "notes": "Order fulfilled via Shopify",
        "fulfilledAt": "2025-01-15T12:00:00.000Z",
        "fulfilledBy": {
          "userId": "507f1f77bcf86cd799439012",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "packingId": "507f1f77bcf86cd799439011"
      }
    ]
  }
}
```

---

## Database Schema Changes

### Dropship Order Line Items
Add fields to store fulfillment information:
```javascript
{
  fulfillmentStatus: {
    type: String,
    enum: ["Unfulfilled", "Fulfilled"],
    default: "Unfulfilled"
  },
  fulfilledAt: Date,
  marketplaceName: String,
  marketplaceOrderNumber: String,
  trackingId: String,
  trackingLink: String,
  packingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PackingOrder"
  },
  fulfilledBy: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String
  }
}
```

### Packing Order
Add fields to link back to dropship order:
```javascript
{
  sourceDropshipId: {
    type: String,
    ref: "DropshipOrder"
  },
  sourceLineItemId: String,  // The line item ID from dropship order
  isFromDropship: {
    type: Boolean,
    default: false
  }
}
```

---

## Business Logic Flow

### When Fulfilling an Item:

1. **Validation:**
   - Verify dropship order exists and is active
   - Verify line item exists and is not already fulfilled
   - Validate required fields (marketplaceName, trackingId, trackingLink)
   - Validate trackingLink is a valid URL

2. **Create Packing Order:**
   - Create new packing order with:
     - Original order details (customer, shipping address, platform, etc.)
     - Only the fulfilled item
     - Status: "Completely Fulfilled" (single item = complete)
     - Tracking information
     - Marketplace order details
     - Link to dropship order (`sourceDropshipId`, `sourceLineItemId`)
   - Generate packing order number (e.g., PK-YYYYMMDD-XXX)

3. **Update Dropship Order:**
   - Mark line item as "Fulfilled"
   - Update item with fulfillment details
   - Recalculate dropship order status:
     - If all items fulfilled → "Completely Fulfilled"
     - If some items fulfilled → "Partially Fulfilled"
     - If no items fulfilled → "Unfulfilled"

4. **Final Step (When All Items Fulfilled):**
   - Create a consolidated packing order with all items (optional)
   - Mark dropship order as "Completely Fulfilled"
   - Optionally: Archive or soft-delete the dropship order
   - Remove from active dropship list (or show with filter)

---

## Error Handling

### Validation Errors (400):
- `MARKETPLACE_NAME_REQUIRED` - Marketplace name is required
- `TRACKING_ID_REQUIRED` - Tracking ID is required
- `TRACKING_LINK_REQUIRED` - Tracking link is required
- `INVALID_TRACKING_LINK` - Tracking link must be a valid URL
- `ITEM_ALREADY_FULFILLED` - This item has already been fulfilled

### Not Found Errors (404):
- `DROPSHIP_NOT_FOUND` - Dropship order not found
- `LINE_ITEM_NOT_FOUND` - Line item not found in dropship order

### Conflict Errors (409):
- `ITEM_ALREADY_FULFILLED` - Item is already fulfilled

---

## API Endpoints Summary

| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/v1/fulfillment/dropship/:dropshipId/items/:lineItemId/fulfill` | Fulfill individual item | **NEW** |
| GET | `/api/v1/fulfillment/dropship/:dropshipId` | Get dropship details (modified) | **MODIFIED** |
| GET | `/api/v1/fulfillment/dropship` | Get all dropship orders (modified) | **MODIFIED** |
| GET | `/api/v1/fulfillment/dropship/:dropshipId/items/:lineItemId/fulfillment-history` | Get fulfillment history | **OPTIONAL** |

---

## Testing Checklist

- [ ] Fulfill single item in dropship order
- [ ] Verify packing order is created correctly
- [ ] Verify dropship order status updates correctly
- [ ] Fulfill multiple items one by one
- [ ] Verify status changes from "Unfulfilled" → "Partially Fulfilled" → "Completely Fulfilled"
- [ ] Verify dropship order is removed from active list when all items fulfilled
- [ ] Verify tracking information is saved correctly
- [ ] Verify marketplace order details are saved correctly
- [ ] Test validation errors (missing fields, invalid URLs)
- [ ] Test error when trying to fulfill already fulfilled item
- [ ] Test error when dropship order doesn't exist
- [ ] Test error when line item doesn't exist
- [ ] Verify packing orders are linked back to dropship order
- [ ] Verify audit logs are created for each fulfillment

---

## Notes

1. **URL Encoding:** The `lineItemId` may contain special characters (e.g., `gid://shopify/LineItem/...`). Backend should decode it using `decodeURIComponent()`.

2. **Packing Order Creation:** Each fulfilled item creates its own packing order. When all items are fulfilled, you may optionally create a consolidated packing order.

3. **Status Management:** Dropship order status is automatically calculated based on fulfillment status of items.

4. **Soft Delete:** When all items are fulfilled, consider soft-deleting the dropship order (add `deletedAt` timestamp) rather than hard-deleting, for audit purposes.

5. **Tracking Link Validation:** Ensure tracking link is a valid URL format (starts with http:// or https://).

6. **Audit Trail:** Log all fulfillment actions for audit purposes.

---

## Frontend Integration Notes

- Frontend will URL-encode the `lineItemId` before making API calls
- Frontend will show checkboxes/rows for each item
- Frontend will open modal on row click with the form fields
- Frontend will update UI after successful fulfillment
- Frontend will refresh dropship details after each fulfillment
- Frontend will handle loading states and error messages

