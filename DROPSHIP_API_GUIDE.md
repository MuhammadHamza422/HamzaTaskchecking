# Dropship Management API - Backend Implementation Guide

## Overview

When items are deselected during packing, they should automatically be moved to dropship management. This guide provides complete API specifications for dropship functionality.

---

## Database Schema

### DropshipOrder Model

```javascript
{
  _id: ObjectId,                    // Auto-generated
  dropshipId: String,               // Unique identifier (e.g., "DS-20250115-001")
  originalOrderId: String,          // Original order ID from platform
  originalOrderNumber: String,      // Original order number (display)
  platform: String,                 // "woocommerce" | "shopify" | "walmart"
  
  // Customer Information
  customerName: String,
  customerEmail: String,
  phone: String,
  
  // Shipping Information
  shipTo: {
    name: String,
    address1: String,
    address2: String | null,
    city: String,
    state: String,
    zip: String,
    country: String,
    phone: String
  },
  
  // Order Financials
  currency: String,                 // "USD"
  subtotal: Number,
  tax: Number,
  shipping: Number,
  discount: Number,
  totalValue: Number,
  
  // Deselected Items
  deselectedItems: [{
    id: String,                     // Item ID from original order
    productId: String,
    name: String,
    sku: String,
    variant: String | null,
    quantity: Number,
    price: Number,
    total: Number,
    image: String | null
  }],
  
  // Status & Tracking
  status: String,                    // "Unfulfilled" | "Fulfilled" | "Cancelled"
  marketplaceName: String,          // Marketplace name (e.g., "Shopify", "WooCommerce")
  marketplaceOrderNumber: String,   // Marketplace order number (if created)
  
  // Audit Logs
  createdBy: {
    userId: ObjectId,
    name: String,
    email: String
  },
  createdAt: Date,
  updatedAt: Date,
  
  // Audit Trail
  auditLogs: [{
    action: String,                  // "created" | "status_changed" | "marketplace_order_created"
    performedBy: {
      userId: ObjectId,
      name: String,
      email: String
    },
    timestamp: Date,
    details: Object                  // Additional details
  }]
}
```

---

## API Endpoints

### 1. Auto-Create Dropship (Internal - Called from Packing API)

**Endpoint:** `POST /api/v1/fulfillment/dropship/auto-create`

**Purpose:** Automatically create dropship records when items are deselected during packing.

**Called From:** Packing creation API (`/api/v1/fulfillment/packing/create`)

**Request Body:**
```json
{
  "originalOrderId": "699189",
  "originalOrderNumber": "699189",
  "platform": "woocommerce",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "phone": "+1234567890",
  "shipTo": {
    "name": "John Doe",
    "address1": "123 Main St",
    "address2": null,
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US",
    "phone": "+1234567890"
  },
  "currency": "USD",
  "subtotal": 100.00,
  "tax": 8.00,
  "shipping": 10.00,
  "discount": 0,
  "totalValue": 118.00,
  "deselectedItems": [
    {
      "id": "959324",
      "productId": "33421",
      "name": "Product Name",
      "sku": "SKU-123",
      "variant": null,
      "quantity": 1,
      "price": 50.00,
      "total": 50.00,
      "image": "https://example.com/image.jpg"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "data": {
    "dropshipId": "DS-20250115-001",
    "originalOrderId": "699189",
    "originalOrderNumber": "699189",
    "platform": "woocommerce",
    "status": "Unfulfilled",
    "deselectedItemsCount": 1,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Deselected items are required",
    "details": "At least one deselected item must be provided"
  }
}
```

---

### 2. Get All Dropship Orders

**Endpoint:** `GET /api/v1/fulfillment/dropship`

**Purpose:** List all dropship orders with pagination and filters.

**Query Parameters:**
| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `page` | number | No | Page number (default: 1) | `1` |
| `limit` | number | No | Items per page (default: 30) | `30` |
| `platform` | string | No | Filter by platform | `"woocommerce"` |
| `status` | string | No | Filter by status | `"Unfulfilled"` \| `"Fulfilled"` |
| `search` | string | No | Search in orderId or orderNumber | `"699189"` |
| `startDate` | string | No | Start date (ISO format) | `"2025-01-01T00:00:00.000Z"` |
| `endDate` | string | No | End date (ISO format) | `"2025-01-31T23:59:59.999Z"` |

**Success Response (200):**
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
        "status": "Unfulfilled",
        "customerName": "John Doe",
        "deselectedItemsCount": 2,
        "totalValue": 118.00,
        "currency": "USD",
        "createdAt": "2025-01-15T10:30:00.000Z",
        "createdBy": {
          "name": "Admin User",
          "email": "admin@example.com"
        }
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "perPage": 30,
      "totalPages": 5
    }
  }
}
```

---

### 3. Get Dropship Order Details

**Endpoint:** `GET /api/v1/fulfillment/dropship/:dropshipId`

**Purpose:** Get complete details of a single dropship order.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropshipId` | string | Yes | Dropship order ID |

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "dropshipId": "DS-20250115-001",
    "originalOrderId": "699189",
    "originalOrderNumber": "699189",
    "platform": "woocommerce",
    "status": "Unfulfilled",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "phone": "+1234567890",
    "shipTo": {
      "name": "John Doe",
      "address1": "123 Main St",
      "address2": null,
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "US",
      "phone": "+1234567890"
    },
    "currency": "USD",
    "subtotal": 100.00,
    "tax": 8.00,
    "shipping": 10.00,
    "discount": 0,
    "totalValue": 118.00,
    "deselectedItems": [
      {
        "id": "959324",
        "productId": "33421",
        "name": "Product Name",
        "sku": "SKU-123",
        "variant": null,
        "quantity": 1,
        "price": 50.00,
        "total": 50.00,
        "image": "https://example.com/image.jpg"
      }
    ],
    "marketplaceName": null,
    "marketplaceOrderNumber": null,
    "createdBy": {
      "userId": "507f1f77bcf86cd799439012",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "createdAt": "2025-01-15T10:30:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "auditLogs": [
      {
        "action": "created",
        "performedBy": {
          "userId": "507f1f77bcf86cd799439012",
          "name": "Admin User",
          "email": "admin@example.com"
        },
        "timestamp": "2025-01-15T10:30:00.000Z",
        "details": {
          "source": "packing_operation",
          "packingId": "507f1f77bcf86cd799439011"
        }
      }
    ]
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "error": {
    "code": "DROPSHIP_NOT_FOUND",
    "message": "Dropship order not found"
  }
}
```

---

### 4. Update Dropship Status

**Endpoint:** `PATCH /api/v1/fulfillment/dropship/:dropshipId/status`

**Purpose:** Update dropship order status (e.g., mark as Fulfilled).

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropshipId` | string | Yes | Dropship order ID |

**Request Body:**
```json
{
  "status": "Fulfilled",
  "marketplaceName": "Shopify",
  "marketplaceOrderNumber": "SH-12345",
  "notes": "Order fulfilled via Shopify"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "dropshipId": "DS-20250115-001",
    "status": "Fulfilled",
    "marketplaceName": "Shopify",
    "marketplaceOrderNumber": "SH-12345",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

### 5. Create Marketplace Order (Manual)

**Endpoint:** `POST /api/v1/fulfillment/dropship/:dropshipId/create-marketplace-order`

**Purpose:** Manually create a marketplace order for dropship items.

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `dropshipId` | string | Yes | Dropship order ID |

**Request Body:**
```json
{
  "marketplaceName": "Shopify",
  "marketplaceOrderNumber": "SH-12345",
  "notes": "Created via Shopify API"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "dropshipId": "DS-20250115-001",
    "status": "Fulfilled",
    "marketplaceName": "Shopify",
    "marketplaceOrderNumber": "SH-12345",
    "updatedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

---

## Integration with Packing API

### Update Packing Creation API

**Endpoint:** `POST /api/v1/fulfillment/packing/create`

**Changes Required:**

1. **Accept New Fields:**
   - `deselectedItems` (Array<string>) - Item IDs that were deselected
   - `deselectedItemsData` (Array<Object>) - Full item data for deselected items
   - `orderData` (Object) - Complete order details (customer, shipping, financials)

2. **After Creating Packing Record:**
   - If `deselectedItems` array has items:
     - Call internal dropship creation function
     - Pass all order details and deselected items
     - Create dropship record automatically
     - Add audit log linking to packing record

3. **Response Update:**
   ```json
   {
     "success": true,
     "data": {
       "packingId": "507f1f77bcf86cd799439011",
       "orderId": "699189",
       "orderNumber": "699189",
       "platform": "woocommerce",
       "status": "Partially Fulfilled",
       "selectedItems": ["959324", "959325"],
       "deselectedItemsCount": 1,
       "dropshipCreated": true,
       "dropshipId": "DS-20250115-001",
       "photoUrls": [...],
       "packedAt": "2025-01-15T10:30:00.000Z"
     }
   }
   ```

---

## Status Values

- **"Unfulfilled"** - Initial status when dropship is created
- **"Fulfilled"** - When marketplace order is created and fulfilled
- **"Cancelled"** - If dropship is cancelled

---

## Audit Log Actions

- **"created"** - When dropship record is created
- **"status_changed"** - When status is updated
- **"marketplace_order_created"** - When marketplace order is created
- **"cancelled"** - When dropship is cancelled

---

## Error Codes

- `VALIDATION_ERROR` - Missing or invalid parameters
- `DROPSHIP_NOT_FOUND` - Dropship order not found
- `DUPLICATE_DROPSHIP` - Dropship already exists for this order
- `MARKETPLACE_ERROR` - Error creating marketplace order
- `SERVER_ERROR` - Internal server error

---

## Implementation Notes

1. **Dropship ID Generation:**
   - Format: `DS-YYYYMMDD-XXX` (e.g., "DS-20250115-001")
   - Auto-increment sequence per day

2. **Automatic Creation:**
   - Triggered automatically when packing is created with deselected items
   - No manual intervention required

3. **Data Preservation:**
   - Preserve original order number and all order details
   - Store complete item information for deselected items
   - Maintain audit trail linking to original packing operation

4. **Status Management:**
   - Default status: "Unfulfilled"
   - Update to "Fulfilled" when marketplace order is created
   - Track marketplace name and order number

5. **Audit Logs:**
   - Log all status changes
   - Track who performed each action
   - Include timestamps and details

---

## Testing Checklist

- [ ] Create dropship automatically when items are deselected
- [ ] List dropship orders with filters
- [ ] Get dropship order details
- [ ] Update dropship status
- [ ] Create marketplace order
- [ ] Verify audit logs are created
- [ ] Test error handling
- [ ] Verify data preservation from original order

---

## Postman Collection

Backend team should provide a Postman collection JSON file with all endpoints configured for easy testing.

---

**Base URL:** `http://localhost:9901`  
**Authentication:** Bearer token required  
**Content-Type:** `application/json` (except packing create which uses `multipart/form-data`)

