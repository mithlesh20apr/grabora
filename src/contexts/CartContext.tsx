'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiPost } from '@/lib/api';

interface CartItem {
  _id: string;
  productId?: string; // from backend
  variantId?: string; // variant ID for order placement
  sku?: string; // product SKU from API (from ProductCard)
  variantSku?: string; // variant SKU (from product detail page)
  slug?: string; // product slug for fetching full data if SKU missing
  name: string;
  price: number; // original/marked price
  unitPrice?: number; // salePrice from backend or ProductCard
  imageUrl: string;
  quantity: number;
  qty?: number; // from backend response
  discount?: number;
  variantAttributes?: Record<string, string | undefined>; // variant attributes from product detail (color, size, etc.)
}

interface CartContextType {
  cartItems: CartItem[];
  cartCount: number;
  addToCart: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  isLoading: boolean;
  syncCartWithBackend: () => Promise<{ success: boolean; total: number; items: CartItem[]; message?: string }>;
  validateCartForCheckout: () => Promise<{ valid: boolean; backendTotal: number; frontendTotal: number; message?: string }>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load cart from backend if user is authenticated
  const loadCartFromBackend = async () => {
    try {
      const token = sessionStorage.getItem('token');
      
      if (token) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        
        // GET /cart/ - user is identified by JWT token
        const response = await fetch(`${apiBaseUrl}/cart/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.items) {
            // Debug: Log raw backend cart data
            console.log('Backend cart data:', JSON.stringify(result.data.items, null, 2));
            
            // Get existing cart items from localStorage to preserve variant images
            const existingCart = localStorage.getItem('grabora_cart');
            const existingItems: CartItem[] = existingCart ? JSON.parse(existingCart) : [];
            
            // Transform backend cart data to frontend format
            const backendItems = result.data.items.map((item: any) => {
              // Debug: Log each item's price fields
              console.log(`Item ${item.title}: price=${item.price}, unitPrice=${item.unitPrice}, currentPrice=${item.currentPrice}, salePrice=${item.salePrice}`);
              
              // Use more explicit price extraction
              // price = MRP/original price (higher value)
              // unitPrice = sale price (actual selling price, lower value)
              const mrpPrice = item.mrp || item.price || item.currentPrice || 0;
              const salePrice = item.unitPrice || item.salePrice || item.currentSalePrice || mrpPrice;
              
              // Create composite ID for variant identification
              const variantSku = item.variantSku || item.sku || item.productSku;
              const compositeId = variantSku ? `${item.productId}_${variantSku}` : item.productId;
              
              // Find existing item to preserve variant-specific imageUrl and name
              const existingItem = existingItems.find(
                (e) => e._id === compositeId || 
                       (e.productId === item.productId && e.variantSku === variantSku)
              );
              
              // Prefer existing imageUrl (user-selected variant image) over backend image
              const imageUrl = existingItem?.imageUrl || item.image || item.imageUrl || (item.images && item.images[0]) || '/placeholder.jpg';
              
              // Build variant-specific name if not preserved from existing
              let itemName = existingItem?.name || item.title || item.name || 'Product';
              if (!existingItem?.name && item.variantAttributes) {
                const variantParts: string[] = [];
                if (item.variantAttributes.color) variantParts.push(item.variantAttributes.color);
                if (item.variantAttributes.size) variantParts.push(item.variantAttributes.size);
                if (item.variantAttributes.storage) variantParts.push(item.variantAttributes.storage);
                if (item.variantAttributes.ram) variantParts.push(item.variantAttributes.ram);
                if (variantParts.length > 0) {
                  itemName = `${item.title || item.name} (${variantParts.join(', ')})`;
                }
              }
              
              return {
                _id: compositeId, // Composite ID for local state
                productId: item.productId, // Original product ID for API calls
                sku: item.sku || item.productSku,
                variantSku: variantSku,
                slug: item.slug,
                name: itemName, // Variant-specific name
                price: mrpPrice, // original/MRP price
                unitPrice: salePrice, // sale price (actual selling price)
                imageUrl: imageUrl,
                quantity: item.qty || item.quantity,
                qty: item.qty || item.quantity,
                discount: item.discount || (mrpPrice > salePrice ? Math.round(((mrpPrice - salePrice) / mrpPrice) * 100) : 0),
                variantAttributes: item.variantAttributes || existingItem?.variantAttributes,
              };
            });
            
            setCartItems(backendItems);
            localStorage.setItem('grabora_cart', JSON.stringify(backendItems));
          }
        }
      }
    } catch (error) {
      console.error('Failed to load cart from backend:', error);
    }
  };

  // Load cart from localStorage on mount (fallback for guest users)
  useEffect(() => {
    const savedCart = localStorage.getItem('grabora_cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        console.log('Loaded cart from localStorage:', parsedCart);
        setCartItems(parsedCart);
      } catch (error) {
        console.error('Failed to parse localStorage cart:', error);
      }
    }
    
    // Also try to load from backend if authenticated - this will override localStorage
    loadCartFromBackend();
  }, []);

  // Save cart to localStorage whenever it changes (fallback for guest users)
  useEffect(() => {
    localStorage.setItem('grabora_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = async (item: Omit<CartItem, 'quantity'>) => {
    setIsLoading(true);

    // Debug: Log incoming item with all price fields
    console.log('Adding to cart - item data:', {
      _id: item._id,
      name: item.name,
      price: item.price,
      unitPrice: item.unitPrice,
      sku: item.sku
    });

    try {
      const token = sessionStorage.getItem('token');
      const user = sessionStorage.getItem('user');

      if (token && user) {
        const userData = JSON.parse(user);
        // Use productId for API (original product ID), not _id which may include variant suffix
        // Handle case where _id might be undefined
        const apiProductId = item.productId || (item._id ? item._id.split('_')[0] : undefined);

        if (!apiProductId) {
          console.error('Product ID is missing:', item);
          throw new Error('Product ID is required to add item to cart');
        }

        const cartPayload = {
          userId: userData._id,
          items: [
            {
              productId: apiProductId,
              sku: item.variantSku || item.sku, // Use variant SKU if available
              qty: 1,
              unitPrice: item.unitPrice || item.price, // Use sale price if available, else original
              variantAttributes: item.variantAttributes, // Include variant attributes
              imageUrl: item.imageUrl, // Include selected variant image
            }
          ]
        };
        console.log('Sending to cart API:', cartPayload);

        try {
          const result = await apiPost('/cart/add', cartPayload);
          console.log('Cart API response:', result);
        } catch (apiError) {
          console.error('Cart API call failed:', apiError);
          throw apiError; // Re-throw to be caught by outer catch
        }
      } else {
        console.log('User not authenticated, adding to localStorage only');
      }
      
      // Update local state - identify items by both productId AND variantSku
      // Different variants of the same product should be separate cart items
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((i) =>
          i._id === item._id &&
          (i.variantSku === item.variantSku || (!i.variantSku && !item.variantSku))
        );

        if (existingItem) {
          // Same product AND same variant - increment quantity and update properties
          return prevItems.map((i) =>
            (i._id === item._id && (i.variantSku === item.variantSku || (!i.variantSku && !item.variantSku))) ? {
              ...i,
              ...item, // Update all properties from new item (imageUrl, prices, etc.)
              quantity: i.quantity + 1
            } : i
          );
        }
        // New item OR different variant - add as new cart item
        return [...prevItems, { ...item, quantity: 1 }];
      });

      console.log('Item successfully added to cart (with API call)');
    } catch (error) {
      console.error('Error in addToCart:', error);
      // Fallback to local storage for guest users or on API error
      setCartItems((prevItems) => {
        const existingItem = prevItems.find((i) =>
          i._id === item._id &&
          (i.variantSku === item.variantSku || (!i.variantSku && !item.variantSku))
        );

        if (existingItem) {
          return prevItems.map((i) =>
            (i._id === item._id && (i.variantSku === item.variantSku || (!i.variantSku && !item.variantSku))) ? {
              ...i,
              ...item, // Update all properties from new item
              quantity: i.quantity + 1
            } : i
          );
        }
        return [...prevItems, { ...item, quantity: 1 }];
      });

      console.log('Item added to cart (localStorage fallback)');
      // Re-throw error so the UI can handle it
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      
      if (token) {
        const user = sessionStorage.getItem('user');
        if (!user) throw new Error('User ID is required');
        const userData = JSON.parse(user);
        // Extract original product ID (remove variant suffix if present)
        const apiProductId = itemId.split('_')[0];
        // Find the item to get its variantSku
        const cartItem = cartItems.find(item => item._id === itemId);
        await apiPost('/cart/remove', {
          userId: userData._id,
          productId: apiProductId,
          sku: cartItem?.variantSku || cartItem?.sku, // Include SKU for variant-specific removal
        });
      }

      // Update local state
      setCartItems((prevItems) => prevItems.filter((item) => item._id !== itemId));
    } catch (error) {
      // Fallback to local storage
      setCartItems((prevItems) => prevItems.filter((item) => item._id !== itemId));
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }
    
    setIsLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      
      if (token) {
        const user = sessionStorage.getItem('user');
        if (!user) throw new Error('User ID is required');
        const userData = JSON.parse(user);
        // Extract original product ID (remove variant suffix if present)
        const apiProductId = itemId.split('_')[0];
        // Find the item to get its variantSku
        const cartItem = cartItems.find(item => item._id === itemId);
        await apiPost('/cart/update', {
          userId: userData._id,
          productId: apiProductId,
          sku: cartItem?.variantSku || cartItem?.sku, // Include SKU for variant-specific update
          quantity,
        });
      }

      // Update local state
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item._id === itemId ? { ...item, quantity } : item
        )
      );
    } catch (error) {
      // Fallback to local storage
      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item._id === itemId ? { ...item, quantity } : item
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    // Clear local state first
    setCartItems([]);
    localStorage.removeItem('grabora_cart');
    
    // Also clear backend cart if authenticated
    try {
      const token = sessionStorage.getItem('token');
      const user = sessionStorage.getItem('user');
      
      if (token && user) {
        const userData = JSON.parse(user);
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        await fetch(`${apiBaseUrl}/cart/clear`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: userData._id }),
        });
      }
    } catch (error) {
      console.error('Failed to clear backend cart:', error);
    }
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      // Use unitPrice (salePrice) from backend if available, otherwise use price
      const itemPrice = item.unitPrice || item.price;
      return total + (itemPrice * item.quantity);
    }, 0);
  };

  // Sync cart with backend and update local state with backend data
  const syncCartWithBackend = async (): Promise<{ success: boolean; total: number; items: CartItem[]; message?: string }> => {
    try {
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        return { 
          success: false, 
          total: getCartTotal(), 
          items: cartItems, 
          message: 'Please login to sync cart' 
        };
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      const response = await fetch(`${apiBaseUrl}/cart/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.items) {
          // Debug: Log raw backend cart data during sync
          console.log('Sync - Backend cart data:', JSON.stringify(result.data.items, null, 2));
          
          // Transform backend cart data to frontend format
          // Preserve existing frontend imageUrl for variant-specific images
          const backendItems: CartItem[] = result.data.items.map((item: any) => {
            // Use more explicit price extraction
            // price = MRP/original price (higher value)
            // unitPrice = sale price (actual selling price, lower value)
            const mrpPrice = item.mrp || item.price || item.currentPrice || 0;
            const salePrice = item.unitPrice || item.salePrice || item.currentSalePrice || mrpPrice;
            
            console.log(`Sync - Item ${item.title}: mrp=${mrpPrice}, sale=${salePrice}`);
            
            // Create composite ID for variant identification
            const variantSku = item.variantSku || item.sku || item.productSku;
            const compositeId = variantSku ? `${item.productId}_${variantSku}` : item.productId;
            
            // Find existing item to preserve variant-specific imageUrl and name
            const existingItem = cartItems.find(
              (e) => e._id === compositeId || 
                     (e.productId === item.productId && e.variantSku === variantSku)
            );
            
            // Prefer existing imageUrl (user-selected variant image) over backend image
            const imageUrl = existingItem?.imageUrl || item.image || item.imageUrl || (item.images && item.images[0]) || '/placeholder.jpg';
            
            // Build variant-specific name if not preserved from existing
            let itemName = existingItem?.name || item.title || item.name || 'Product';
            if (!existingItem?.name && item.variantAttributes) {
              const variantParts: string[] = [];
              if (item.variantAttributes.color) variantParts.push(item.variantAttributes.color);
              if (item.variantAttributes.size) variantParts.push(item.variantAttributes.size);
              if (item.variantAttributes.storage) variantParts.push(item.variantAttributes.storage);
              if (item.variantAttributes.ram) variantParts.push(item.variantAttributes.ram);
              if (variantParts.length > 0) {
                itemName = `${item.title || item.name} (${variantParts.join(', ')})`;
              }
            }
            
            return {
              _id: compositeId, // Composite ID for local state
              productId: item.productId, // Original product ID for API calls
              sku: item.sku || item.productSku,
              variantSku: variantSku,
              slug: item.slug,
              name: itemName, // Variant-specific name
              price: mrpPrice, // original/MRP price
              unitPrice: salePrice, // sale price (actual selling price)
              imageUrl: imageUrl,
              quantity: item.qty || item.quantity,
              qty: item.qty || item.quantity,
              discount: item.discount || (mrpPrice > salePrice ? Math.round(((mrpPrice - salePrice) / mrpPrice) * 100) : 0),
              variantAttributes: item.variantAttributes || existingItem?.variantAttributes,
            };
          });
          
          // Calculate backend total using sale prices
          const backendTotal = backendItems.reduce((total, item) => {
            const itemPrice = item.unitPrice || item.price;
            return total + (itemPrice * item.quantity);
          }, 0);
          
          // Update local state with backend data
          setCartItems(backendItems);
          localStorage.setItem('grabora_cart', JSON.stringify(backendItems));
          
          return { 
            success: true, 
            total: backendTotal, 
            items: backendItems 
          };
        }
      }
      
      return { 
        success: false, 
        total: getCartTotal(), 
        items: cartItems, 
        message: 'Failed to sync cart with server' 
      };
    } catch (error) {
      console.error('Cart sync error:', error);
      return { 
        success: false, 
        total: getCartTotal(), 
        items: cartItems, 
        message: 'Network error while syncing cart' 
      };
    }
  };

  // Validate cart for checkout - ensures frontend and backend totals match
  const validateCartForCheckout = async (): Promise<{ valid: boolean; backendTotal: number; frontendTotal: number; message?: string }> => {
    const frontendTotal = getCartTotal();
    
    try {
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        return { 
          valid: false, 
          backendTotal: 0, 
          frontendTotal, 
          message: 'Please login to proceed with checkout' 
        };
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      // Fetch fresh cart data from backend
      const response = await fetch(`${apiBaseUrl}/cart/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        return { 
          valid: false, 
          backendTotal: 0, 
          frontendTotal, 
          message: 'Failed to verify cart with server. Please try again.' 
        };
      }
      
      const result = await response.json();
      
      if (!result.success || !result.data || !result.data.items) {
        return { 
          valid: false, 
          backendTotal: 0, 
          frontendTotal, 
          message: 'Invalid cart data from server' 
        };
      }
      
      const backendItems = result.data.items;
      
      // Calculate backend total
      const backendTotal = backendItems.reduce((total: number, item: any) => {
        const itemPrice = item.unitPrice || item.salePrice || item.currentSalePrice || item.price;
        const qty = item.qty || item.quantity;
        return total + (itemPrice * qty);
      }, 0);
      
      // Check if item counts match
      const backendItemCount = backendItems.reduce((count: number, item: any) => count + (item.qty || item.quantity), 0);
      const frontendItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
      
      if (backendItemCount !== frontendItemCount) {
        // Sync cart with backend data
        await syncCartWithBackend();
        return { 
          valid: false, 
          backendTotal, 
          frontendTotal, 
          message: `Cart item count mismatch. Backend: ${backendItemCount}, Frontend: ${frontendItemCount}. Cart has been synced. Please review and try again.` 
        };
      }
      
      // Allow small tolerance for floating point differences (₹1)
      const tolerance = 1;
      const totalDifference = Math.abs(backendTotal - frontendTotal);
      
      if (totalDifference > tolerance) {
        // Sync cart with backend data to fix the discrepancy
        await syncCartWithBackend();
        return { 
          valid: false, 
          backendTotal, 
          frontendTotal, 
          message: `Cart total mismatch detected (₹${frontendTotal.toLocaleString()} vs ₹${backendTotal.toLocaleString()}). Cart has been synced with latest prices. Please review and try again.` 
        };
      }
      
      // Also update local cart with backend data to ensure everything is in sync
      const syncedItems: CartItem[] = backendItems.map((item: any) => {
        // Use more explicit price extraction
        const mrpPrice = item.mrp || item.price || item.currentPrice || 0;
        const salePrice = item.unitPrice || item.salePrice || item.currentSalePrice || mrpPrice;
        
        return {
          _id: item.productId,
          productId: item.productId,
          sku: item.sku || item.productSku,
          variantSku: item.variantSku || item.sku || item.productSku,
          slug: item.slug,
          name: item.title || item.name || 'Product',
          price: mrpPrice, // original/MRP price
          unitPrice: salePrice, // sale price (actual selling price)
          imageUrl: item.image || item.imageUrl || (item.images && item.images[0]) || '/placeholder.jpg',
          quantity: item.qty || item.quantity,
          qty: item.qty || item.quantity,
          discount: item.discount || (mrpPrice > salePrice ? Math.round(((mrpPrice - salePrice) / mrpPrice) * 100) : 0),
          variantAttributes: item.variantAttributes,
        };
      });
      
      setCartItems(syncedItems);
      localStorage.setItem('grabora_cart', JSON.stringify(syncedItems));
      
      return { 
        valid: true, 
        backendTotal, 
        frontendTotal: backendTotal // Use backend total as the source of truth
      };
      
    } catch (error) {
      console.error('Cart validation error:', error);
      return { 
        valid: false, 
        backendTotal: 0, 
        frontendTotal, 
        message: 'Network error while validating cart. Please check your connection and try again.' 
      };
    }
  };

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        isLoading,
        syncCartWithBackend,
        validateCartForCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
