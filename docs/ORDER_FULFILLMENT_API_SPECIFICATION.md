# Order Fulfillment Module - API Specification

## Overview
This document specifies the API required for the Order Fulfillment Module. The module needs **ONE unified search API** that automatically searches across all platforms (WooCommerce, Shopify, Walmart, Amazon) and returns complete order details with auto-detected platform information.

**Key Requirement:** Backend should use existing order APIs/models from each platform. No need to create separate APIs - just one unified search endpoint that intelligently searches all platforms.

---

## API Requirements

### Unified Order Search/Scan API

**Purpose:** Single endpoint that searches across ALL platforms and automatically detects which platform the order belongs to. Returns complete order details in one response.

**Endpoint:** `GET /api/v1/fulfillment/orders/search`

**Request Parameters:**
```javascript
{
  query: string        // Required: Order ID, order number, or ShipStation packing slip barcode from ANY platform
}
```

**Query String Format:**
```
GET /api/v1/fulfillment/orders/search?query=ORD-12345
GET /api/v1/fulfillment/orders/search?query=gid://shopify/Order/6163651690800
GET /api/v1/fulfillment/orders/search?query=12345
```

**How It Works:**
1. Backend searches across ALL platform databases (WooCommerce, Shopify, Walmart, Amazon)
2. Backend automatically detects which platform the order belongs to
3. Returns complete order details with platform information
4. If order not found in any platform, returns 404

**Response Format (Success - 200):**
```javascript
{
  success: true,
  data: {
    // Basic Order Information
    orderId: string,              // Platform-specific order ID
    orderNumber: string,          // Human-readable order number
    platform: string,             // Auto-detected: "woocommerce" | "shopify" | "walmart" | "amazon"
    customerName: string,         // Customer full name
    customerEmail: string,        // Customer email
    phone: string,                // Customer phone
    
    // Shipping Information
    shipTo: {
      name: string,
      address1: string,
      address2: string | null,
      city: string,
      state: string,
      zip: string,
      country: string,
      phone: string | null
    },
    
    // Order Financials
    totalValue: number,
    subtotal: number,
    tax: number,
    shipping: number,
    discount: number,
    currency: string,
    
    // Order Status
    status: string,
    fulfillmentStatus: string,    // "pending" | "completely-fulfilled" | "partially-fulfilled"
    createdAt: string,            // ISO 8601 date string
    updatedAt: string,
    
    // Order Lines (Items)
    orderLines: [
      {
        id: string,                    // Line item ID
        productId: string,             // Product ID
        name: string,                  // Product name
        sku: string,                   // Product SKU
        variant: string | null,        // Product variant (size, color, etc.)
        quantity: number,              // Ordered quantity
        price: number,                 // Unit price
        total: number,                 // Line total (quantity * price)
        image: string | null,         // Product image URL
        isInStock: boolean,           // Stock availability status
        stockQuantity: number | null   // Available stock quantity
      }
    ],
    
    // Platform-Specific Data (based on detected platform)
    platformData: {
      // WooCommerce specific (if platform is woocommerce)
      wc_status?: string,
      order_key?: string,
      
      // Shopify specific (if platform is shopify)
      shopify_order_id?: string,
      tags?: string[],
      
      // Walmart specific (if platform is walmart)
      wm_status?: string,
      purchase_order_id?: string,
      
      // Amazon specific (if platform is amazon)
      amazon_order_id?: string,
      marketplace_id?: string
    },
    
    // Packing Information (if already packed)
    packingInfo: {
      packedAt: string | null,
      packedBy: string | null,
      photos: string[],                 // Array of photo URLs
      outOfStockItems: string[],        // Array of line item IDs that were out of stock
      status: string                    // "completely-fulfilled" | "partially-fulfilled"
    } | null
  }
}
```

**Response Format (Not Found - 404):**
```javascript
{
  success: false,
  error: {
    code: "ORDER_NOT_FOUND",
    message: "Order not found with the provided query",
    details: "No order matching 'ORD-12345' was found in any platform"
  }
}
```

**Response Format (Error - 500):**
```javascript
{
  success: false,
  error: {
    code: "INTERNAL_SERVER_ERROR",
    message: "An error occurred while searching for the order",
    details: "Database connection failed"
  }
}
```

**Implementation Notes:**
- Search across ALL platforms: WooCommerce, Shopify, Walmart, Amazon
- Auto-detect platform based on where the order is found
- Use existing order APIs/models from each platform (OrderController, wc_orders, shopify_orders, etc.)
- Search by: orderId, orderNumber, order_key, customerOrderId, ShipStation packing slip barcode
- Use database indexes for fast lookups
- Return complete order details in single response (no need for separate details API)
- Include all order line items with stock information
- Check inventory/stock status for each item
- Include packing information if order was previously packed
- Response time should be < 1000ms for optimal UX
- Use efficient queries to avoid N+1 problems

---

## Database Models Reference

### Use Existing Order Models
Reference existing order models from:
- `OrderController` (routes/orders)
- WooCommerce: `wc_orders` collection/table
- Shopify: `shopify_orders` collection/table
- Walmart: `walmart_orders` collection/table
- Amazon: `amazon_orders` collection/table

### New Fields Required
Add to existing order models (if not present):
```javascript
{
  fulfillmentStatus: {
    type: String,
    enum: ["pending", "completely-fulfilled", "partially-fulfilled"],
    default: "pending"
  },
  packingInfo: {
    packedAt: Date,
    packedBy: ObjectId,  // Reference to User
    photos: [String],    // Array of photo URLs
    outOfStockItems: [String],  // Array of line item IDs
    status: String
  }
}
```

---

## Error Handling Requirements

### Standard Error Response Format
```javascript
{
  success: false,
  error: {
    code: string,        // Error code (e.g., "ORDER_NOT_FOUND", "VALIDATION_ERROR")
    message: string,    // User-friendly error message
    details: string      // Technical details for debugging
  }
}
```

### Common Error Codes
- `ORDER_NOT_FOUND` - Order doesn't exist
- `VALIDATION_ERROR` - Invalid request parameters
- `PLATFORM_NOT_SUPPORTED` - Platform not recognized
- `DATABASE_ERROR` - Database operation failed
- `INTERNAL_SERVER_ERROR` - Unexpected server error

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `500` - Internal Server Error

---

## Performance & Optimization Requirements

### Response Time Targets
- Search API: < 1000ms (includes complete order details)

### Optimization Strategies
1. **Database Indexing:**
   - Index on `orderId`, `orderNumber`, `order_key` fields
   - Index on `platform` field
   - Composite indexes for common queries

2. **Query Optimization:**
   - Use `select()` to limit fields returned
   - Use `lean()` for read-only queries (Mongoose)
   - Avoid N+1 queries with proper joins/populates
   - Use aggregation pipelines for complex queries

3. **Caching:**
   - Cache frequently accessed orders (Redis recommended)
   - Cache TTL: 5-10 minutes for order data
   - Invalidate cache on order updates

4. **Code Optimization:**
   - Use async/await properly
   - Avoid blocking operations
   - Use connection pooling
   - Implement request timeouts

---

## Code Quality Requirements

### Code Standards
1. **Clean Code:**
   - Use meaningful variable and function names
   - Keep functions small and focused (single responsibility)
   - Avoid deep nesting (max 3 levels)
   - Use early returns to reduce complexity

2. **Comments:**
   - Add comments for complex business logic
   - Document function parameters and return values
   - Explain "why" not "what" (code should be self-explanatory)
   - Keep comments concise and relevant

3. **Error Handling:**
   - Use try-catch blocks for async operations
   - Log errors with proper context
   - Return consistent error format
   - Don't expose sensitive information in errors

4. **Code Structure:**
   ```javascript
   // Good example structure
   async function searchOrder(query, platform) {
     // Validate input
     if (!query) {
       throw new ValidationError('Query parameter is required');
     }
     
     // Search logic
     try {
       const order = await findOrderInDatabase(query, platform);
       if (!order) {
         throw new NotFoundError('Order not found');
       }
       return formatOrderResponse(order);
     } catch (error) {
       logger.error('Order search failed', { query, platform, error });
       throw error;
     }
   }
   ```

---

## API Routes Structure

### Recommended Route Structure
```javascript
// routes/fulfillment.js or routes/orders/fulfillment.js

router.get('/fulfillment/orders/search', searchOrder);
```

### Controller Structure
```javascript
// controllers/fulfillmentController.js

exports.searchOrder = async (req, res) => {
  const { query } = req.query;
  
  // Search across all platforms
  // Use existing order controllers/models:
  // - WooCommerce: OrderController (wc_orders)
  // - Shopify: OrderController (shopify_orders)
  // - Walmart: OrderController (walmart_orders)
  // - Amazon: OrderController (amazon_orders)
  
  // Auto-detect platform and return complete order details
  // Implementation
};
```

---

## Testing Requirements

### Unit Tests
- Test search functionality for each platform
- Test error handling scenarios
- Test edge cases (empty query, invalid platform, etc.)

### Integration Tests
- Test API endpoints with real database
- Test cross-platform search
- Test response formats

---

## Postman Collection Requirements

### Required Collection Structure
```json
{
  "info": {
    "name": "Order Fulfillment APIs",
    "description": "APIs for Order Fulfillment Module"
  },
  "item": [
    {
      "name": "Search Order",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/v1/fulfillment/orders/search?query=ORD-12345"
      }
    },
    {
      "name": "Get Order Details",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/v1/fulfillment/orders/:orderId/details?platform=shopify"
      }
    }
  ]
}
```

### Include in Collection:
1. Environment variables (baseUrl, auth tokens)
2. Example requests for each endpoint
3. Example responses (success and error cases)
4. Pre-request scripts if needed
5. Tests for response validation

---

## Frontend Integration Guide

### API Client Setup
```javascript
// src/api/fulfillment.js
import apiClient from "./client";

// Search/Scan Order - Returns complete order details
export async function searchOrder(query) {
  const response = await apiClient.get("/api/v1/fulfillment/orders/search", {
    params: { query }
  });
  return response.data;
}
```

### Usage Example
```javascript
// In PackingLandingPage component
const handleScan = async (orderNumber) => {
  try {
    // Single API call - returns complete order details with auto-detected platform
    const result = await searchOrder(orderNumber);
    
    if (result.success) {
      const { orderId, platform } = result.data;
      
      // Navigate to details page with complete order data
      navigate(`/fulfillment/packing/${orderId}`, {
        state: { orderData: result.data, platform, orderId }
      });
    }
  } catch (error) {
    // Handle error
    showError(error.response?.data?.error?.message || "Order not found");
  }
};

// In PackingOrderDetails component
// Order data already available from navigation state, or fetch if needed
useEffect(() => {
  if (location.state?.orderData) {
    setOrderData(location.state.orderData);
  } else {
    // Fallback: fetch if not in state
    const loadOrder = async () => {
      try {
        const result = await searchOrder(orderId);
        if (result.success) {
          setOrderData(result.data);
        }
      } catch (error) {
        // Handle error
      }
    };
    loadOrder();
  }
}, [orderId]);
```

---

## Additional Notes

1. **Security:**
   - Validate all input parameters
   - Sanitize query strings to prevent injection
   - Use authentication middleware
   - Rate limiting for search endpoint

2. **Logging:**
   - Log all API requests
   - Log errors with full context
   - Log performance metrics

3. **Documentation:**
   - Update API documentation
   - Document any platform-specific behaviors
   - Include examples in documentation

---

## Questions or Clarifications

If you need any clarification on:
- Response formats
- Error handling
- Database structure
- Performance requirements

Please contact the frontend team before implementation.

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** Frontend Development Team

