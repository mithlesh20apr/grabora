# SKU Issue - Debug Guide

## Problem
SKU is being generated from product title instead of using actual API SKU.

Expected: `SMG-SL-S24`
Actual: `SAMSUNG-GALAXY-S24-5G-SNAPDRAGON-(COBALT-VIOLET,-256-GB)-(8-GB-RAM)-DEFAULT`

## Root Cause Analysis

The SKU field might be missing in one of these places:

### 1. **Product Data from API**
When products are fetched and displayed, they may not include the SKU field:
- Homepage products
- Search results  
- Product detail page

**Fix Applied**: Added `sku?: string` to Product interface in ProductCard

### 2. **Cart Item Storage**
When items are added to cart, SKU should be stored:
- ProductCard.tsx: Sends `sku: product.sku` 
- Product detail page: Sends `sku: selectedVariant.sku || product.sku`
- CartContext: Stores SKU in cart items

**Fix Applied**: 
- Added console.log in ProductCard to verify SKU is sent
- Added console.log in product detail page  
- Added SKU field to CartItem interface
- CartContext now maps SKU from backend when loading cart

### 3. **Cart Item Retrieval**
When loading cart from backend, SKU might be lost:
- Backend returns items with SKU
- Frontend transforms backend data
- SKU should be preserved

**Fix Applied**: 
- CartContext now includes `sku: item.sku` when loading from backend
- Cart items saved to localStorage should include SKU

### 4. **Order Creation**
When placing order, SKU should come from cart:
- createOrder function reads from cartItems
- Falls back to generating from title if item.sku is undefined

**Fix Applied**:
- Added console.log to show what SKU is being used
- Shows whether fallback is being used

## Debugging Steps

1. **Open Browser Console** (F12)
2. **Add product to cart** from:
   - Homepage
   - Product detail page
   - Or search results
3. **Look for logs**:
   ```
   "Adding to cart with SKU: ..." (ProductCard)
   "Adding to cart from product detail: ..." (Product page)
   ```
4. **Check if SKU is undefined**
   - If undefined: Product data doesn't have SKU from API
   - If has value: SKU is being sent but not stored in cart

5. **Check cart contents**:
   ```javascript
   // In console:
   JSON.parse(localStorage.getItem('grabora_cart'))
   // Check if items have 'sku' field
   ```

6. **Place order and check logs**:
   ```
   "Order item SKU: ..." (Checkout page)
   ```
   - If `itemSku` is undefined and `fallbackUsed` is true: SKU was lost somewhere

## Files Modified

1. **CartContext.tsx**
   - Added `sku?: string` to CartItem interface
   - Added SKU mapping when loading from backend

2. **ProductCard.tsx**
   - Added `sku?: string` to Product interface
   - Added console.log for debugging
   - Sends SKU when adding to cart

3. **Product Detail Page ([slug]/page.tsx)**
   - Added console.log for debugging
   - Sends variant SKU or product SKU

4. **Checkout Page**
   - Added console.log in both createOrder functions
   - Shows which SKU is being used and if fallback is triggered

## Next Steps If Still Not Working

If SKU is still undefined in logs:

1. **Check API Response**:
   - Use Network tab in DevTools
   - Check if `/api/products/slug/{slug}` returns `sku` field
   - Check if `/api/cart/{userId}` returns items with `sku` field

2. **Verify Product Data**:
   - Homepage: Check what product data structure is being passed
   - Product Detail: Check if fetched product has `sku` field

3. **Backend Issue**:
   - Products might not have SKU stored in database
   - Cart items might not be returning SKU from backend API
   - Backend cart/add endpoint might not be storing SKU

## Reference

API Response format (should have sku):
```json
{
  "sku": "SMG-SL-S24",
  "title": "Samsung Galaxy S24 5G Snapdragon...",
  "price": 79999,
  "salePrice": 55999,
  ...
}
```
