# Backend API Guide: Missing Products During Packing Process

## Overview
Missing products should be added **during the packing process** (before creating the packing order), not after. The missing products will be stored temporarily in the frontend and sent when creating the packing order.

## Current API (To Be Removed/Deprecated)
Currently, missing products are added to **existing packing orders**:
- `POST /api/v1/fulfillment/packing/:packingId/order-lines/:lineItemId/missing-products`
- `GET /api/v1/fulfillment/packing/:packingId/order-lines/:lineItemId/missing-products`
- `DELETE /api/v1/fulfillment/packing/:packingId/order-lines/:lineItemId/missing-products/:missingProductId`

## New API Requirements

### 1. Update Create Packing Order API
**Endpoint:** `POST /api/v1/fulfillment/packing`

**Current Request Body:**
```json
{
  "orderId": "string",
  "platform": "shopify|shipstation",
  "selectedItems": ["itemId1", "itemId2"],
  "photos": [File],
  "order": {
    "orderNumber": "string",
    "totalValue": number,
    "currency": "USD",
    "subtotal": number,
    "tax": number,
    "shipping": number,
    "discount": number
  }
}
```

**Updated Request Body (Add missingProducts field):**
```json
{
  "orderId": "string",
  "platform": "shopify|shipstation",
  "selectedItems": ["itemId1", "itemId2"],
  "photos": [File],
  "order": {
    "orderNumber": "string",
    "totalValue": number,
    "currency": "USD",
    "subtotal": number,
    "tax": number,
    "shipping": number,
    "discount": number
  },
  "missingProducts": [
    {
      "lineItemId": "gid://shopify/LineItem/123456",
      "productName": "Missing Product Name",
      "notes": "Optional notes about the missing product"
    },
    {
      "lineItemId": "gid://shopify/LineItem/789012",
      "productName": "Another Missing Product",
      "notes": null
    }
  ]
}
```

**Response:** (No change needed)
```json
{
  "success": true,
  "data": {
    "packingId": "string",
    "status": "pending|completed",
    "orderNumber": "string",
    "selectedItems": ["itemId1", "itemId2"],
    "deselectedItemsCount": 0,
    "missingProducts": [
      {
        "id": "missingProductId",
        "lineItemId": "gid://shopify/LineItem/123456",
        "productName": "Missing Product Name",
        "notes": "Optional notes",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### 2. Backend Implementation Notes

1. **Accept missingProducts in createPacking endpoint:**
   - `missingProducts` is an optional array
   - Each item should have: `lineItemId`, `productName`, `notes` (optional)
   - Validate that `lineItemId` exists in the order's line items
   - Create missing product records linked to the packing order and line item

2. **Database Schema:**
   - Missing products should be stored with:
     - `id` (unique identifier)
     - `packingId` (foreign key to packing order)
     - `lineItemId` (the order line item ID)
     - `productName` (required)
     - `notes` (optional)
     - `createdAt` (timestamp)

3. **Validation:**
   - Ensure `lineItemId` exists in the order
   - Ensure `productName` is not empty
   - Ensure `packingId` exists (when creating)

4. **Response:**
   - Include `missingProducts` array in the packing order response
   - Each missing product should have all fields including `id` and `createdAt`

## Migration Notes

1. **Existing Missing Products:**
   - Missing products added to existing packing orders (via old API) should still work
   - Consider deprecating the old endpoints but keep them for backward compatibility

2. **Frontend Changes:**
   - Frontend will store missing products in state during packing process
   - Missing products will be sent when creating the packing order
   - No need for separate API calls to add missing products during packing

## Example Implementation (Pseudo-code)

```javascript
// In createPacking controller
async function createPacking(req, res) {
  const { orderId, platform, selectedItems, missingProducts = [], order, photos } = req.body;
  
  // ... existing packing creation logic ...
  
  // Create missing products if provided
  if (missingProducts && missingProducts.length > 0) {
    const missingProductRecords = await Promise.all(
      missingProducts.map(async (mp) => {
        // Validate lineItemId exists in order
        const lineItem = order.orderLines.find(item => item.id === mp.lineItemId);
        if (!lineItem) {
          throw new Error(`Line item ${mp.lineItemId} not found in order`);
        }
        
        // Create missing product record
        return await MissingProduct.create({
          packingId: packing.id,
          lineItemId: mp.lineItemId,
          productName: mp.productName.trim(),
          notes: mp.notes?.trim() || null,
        });
      })
    );
    
    packing.missingProducts = missingProductRecords;
  }
  
  return res.json({
    success: true,
    data: {
      ...packing,
      missingProducts: packing.missingProducts || []
    }
  });
}
```

## Summary

- **Add `missingProducts` array to `POST /api/v1/fulfillment/packing` request**
- **Store missing products when creating packing order**
- **Return missing products in packing order response**
- **Keep old endpoints for backward compatibility (optional)**

