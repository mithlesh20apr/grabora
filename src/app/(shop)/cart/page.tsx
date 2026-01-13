'use client';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoader } from '@/components/ui/Loader';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface RecommendedProduct {
  _id: string;
  title: string;
  slug: string;
  price: number;
  salePrice: number;
  discount?: number;
  images: string[];
  ratingAvg?: number;
  ratingCount?: number;
  brand: string;
  flashSale?: boolean;
  isFeatured?: boolean;
}

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const { cartItems, cartCount, removeFromCart, updateQuantity, getCartTotal, clearCart, syncCartWithBackend, validateCartForCheckout } = useCart();
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [deliveryConfig] = useState({ freeDeliveryThreshold: 499, deliveryCharge: 99 });
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });

  // Debug: Log cart items whenever they change
  useEffect(() => {
    console.log('Cart Page - cartItems:', cartItems.map(item => ({
      name: item.name,
      _id: item._id,
      price: item.price,
      unitPrice: item.unitPrice,
      quantity: item.quantity
    })));
  }, [cartItems]);

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  // Handle proceed to checkout with loader and validation
  const handleProceedToCheckout = async () => {
    showLoader('Verifying cart...');
    
    try {
      // First sync cart with backend
      if (syncCartWithBackend) {
        const syncResult = await syncCartWithBackend();
        
        if (!syncResult.success) {
          hideLoader();
          showToast(syncResult.message || 'Failed to sync cart. Please try again.', 'error');
          return;
        }
      }
      
      // Then validate cart totals
      if (validateCartForCheckout) {
        const validation = await validateCartForCheckout();
        
        if (!validation.valid) {
          hideLoader();
          showToast(validation.message || 'Cart validation failed. Please review your cart.', 'error');
          return;
        }
      }
      
      showLoader('Preparing checkout...');
      router.push('/checkout');
    } catch (error) {
      hideLoader();
      showToast('An error occurred. Please try again.', 'error');
    }
  };

  // Handle quantity update with loader
  const handleQuantityUpdate = async (itemId: string, newQuantity: number) => {
    showLoader('Updating cart...');
    try {
      await updateQuantity(itemId, newQuantity);
    } finally {
      hideLoader();
    }
  };

  // Handle remove from cart with loader
  const handleRemoveFromCart = async (itemId: string) => {
    showLoader('Removing item...');
    try {
      await removeFromCart(itemId);
    } finally {
      hideLoader();
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Set return URL to cart page
      sessionStorage.setItem('returnUrl', '/cart');
      router.push('/login');
      return;
    }
  }, [isAuthenticated, isLoading, router]);

  // Sync cart with backend on page load to ensure prices are current
  useEffect(() => {
    const syncCart = async () => {
      if (isAuthenticated && cartItems.length > 0 && syncCartWithBackend) {
        try {
          const result = await syncCartWithBackend();
          if (!result.success && result.message) {
            console.warn('Cart sync on load:', result.message);
          }
        } catch (error) {
          console.error('Failed to sync cart on load:', error);
        }
      }
    };
    
    syncCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]); // Only run once when authenticated

  // Fetch recommended products
  useEffect(() => {
    const fetchData = async () => {
      setLoadingRecommendations(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        
        // Always show popular products recommendations
        const response = await fetch(`${apiBaseUrl}/recommendations/popular?limit=10`);
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data) {
            const products: RecommendedProduct[] = Array.isArray(result.data) 
              ? result.data 
              : result.data.products || [];
            setRecommendedProducts(products.slice(0, 5));
          }
        }
      } catch (error) {
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchData();
  }, [cartCount]);

  // Calculate total discount from price differences
  const getTotalDiscount = () => {
    return cartItems.reduce((total, item) => {
      if (item.unitPrice && item.price > item.unitPrice) {
        return total + ((item.price - item.unitPrice) * item.quantity);
      }
      return total;
    }, 0);
  };

  // Calculate delivery charges using API config (simplified for sync usage)
  const getDeliveryCharges = () => {
    // Use basic calculation for UI display, async calculation can be done on demand
    const cartTotal = getCartTotal();
    return cartTotal >= deliveryConfig.freeDeliveryThreshold ? 0 : deliveryConfig.deliveryCharge;
  };

  // Calculate delivery savings using API config
  const getDeliverySavings = () => {
    const cartTotal = getCartTotal();
    return cartTotal >= deliveryConfig.freeDeliveryThreshold ? deliveryConfig.deliveryCharge : 0;
  };

  const totalDiscount = getTotalDiscount();
  const deliveryCharges = getDeliveryCharges();
  const deliverySavings = getDeliverySavings();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 md:bg-gradient-to-br md:from-blue-50 md:via-purple-50 md:to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#184979] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#184979] font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render cart if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (cartCount === 0) {
    return (
      <div className="min-h-screen bg-gray-50 md:bg-gradient-to-br md:from-blue-50 md:via-purple-50 md:to-pink-50 py-8 md:py-16 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-br from-orange-300/20 to-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-gradient-to-br from-green-300/10 to-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 md:p-16 border border-white/50 animate-slide-in-up">
              {/* Cart Icon with Animation */}
              <div className="relative w-40 h-40 mx-auto mb-8">
                {/* Outer Glow Ring */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#184979]/30 via-[#f26322]/30 to-[#ff7a45]/30 rounded-full blur-xl animate-pulse"></div>
                
                {/* Middle Ring */}
                <div className="absolute inset-3 bg-gradient-to-br from-[#184979]/20 to-[#f26322]/20 rounded-full animate-spin-slow"></div>
                
                {/* Inner Circle */}
                <div className="absolute inset-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-xl">
                  <div className="relative">
                    {/* Cart Icon */}
                    <svg className="w-20 h-20 text-gray-400 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                    </svg>
                    {/* Empty indicator */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <span className="text-white text-xs font-bold">0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title with Gradient */}
              <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-[#184979] via-[#f26322] to-[#ff7a45] bg-clip-text text-transparent mb-4 animate-fade-in">
                Your Cart is Empty
              </h2>
              
              <p className="text-gray-600 mb-8 text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
                Looks like you haven't added anything to your cart yet.<br />
                <span className="font-semibold text-[#184979]">Discover amazing products</span> and start shopping!
              </p>

              {/* Feature Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-blue-900">Best Prices</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-green-900">Free Delivery</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-2 shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-purple-900">Secure Checkout</p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/"
                  className="group relative inline-flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#f26322] via-[#ff6b35] to-[#ff7a45] hover:from-[#e05512] hover:via-[#f26322] hover:to-[#ff7a45] text-white px-8 py-4 rounded-xl font-black transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
                  <svg className="w-6 h-6 relative z-10 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className="relative z-10">Start Shopping</span>
                  <svg className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>

                <Link
                  href="/products"
                  className="group inline-flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#184979] text-[#184979] rounded-xl font-bold hover:bg-[#184979] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Browse Products</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 md:bg-gradient-to-br md:from-gray-50 md:via-blue-50/30 md:to-orange-50/30 pb-24 md:pb-10">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-slide-in-down max-w-[90vw] ${
          toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
          'bg-yellow-500 text-white'
        }`}>
          {toast.type === 'success' && (
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {toast.type === 'warning' && (
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Mobile Sticky Header with Gradient */}
      <div className="sticky top-0 z-40 md:relative md:z-auto">
        <div className="bg-gradient-to-r from-[#184979] via-[#1e5a8f] to-[#184979] md:bg-gradient-to-br md:from-transparent md:via-transparent md:to-transparent py-4 md:py-8 px-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between md:block">
              <div>
                <h1 className="text-xl md:text-4xl font-black text-white md:text-[#184979] flex items-center gap-2">
                  <span className="md:hidden text-2xl">🛒</span>
                  Shopping Cart
                </h1>
                <p className="text-white/80 md:text-gray-600 text-xs md:text-base mt-0.5">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'} in your cart
                </p>
              </div>
              {/* Mobile Cart Total Badge */}
              <div className="md:hidden bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                <div className="text-[10px] text-white/70">Total</div>
                <div className="text-lg font-black text-white">₹{(getCartTotal() + deliveryCharges).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 md:px-4 pt-4 md:pt-0">

        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {/* Free Delivery Progress - Mobile */}
            {getCartTotal() < 499 && (
              <div className="mb-3 md:hidden bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-3 border border-orange-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🚚</span>
                  <span className="text-xs font-bold text-orange-700">Add ₹{(499 - getCartTotal()).toLocaleString()} more for FREE Delivery!</span>
                </div>
                <div className="w-full bg-orange-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((getCartTotal() / 499) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {getCartTotal() >= 499 && (
              <div className="mb-3 md:hidden bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-3 border border-green-200 flex items-center gap-2">
                <span className="text-lg">🎉</span>
                <span className="text-xs font-bold text-green-700">Yay! You get FREE Delivery on this order!</span>
              </div>
            )}
            
            <div className="space-y-3 md:space-y-4 max-h-[calc(100vh-280px)] md:max-h-[calc(200vh-200px)] overflow-y-auto pr-1 md:pr-2 scrollbar-thin scrollbar-thumb-[#184979]/20 scrollbar-track-gray-100">
              {cartItems.map((item, index) => (
              <div
                key={`${item._id}-${item.variantSku || item.sku || index}`}
                className="group relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-sm md:shadow-md hover:shadow-lg p-3 md:p-4 transition-all duration-300 border border-gray-100 md:border-gray-200 hover:border-[#f26322] overflow-hidden"
              >
                {/* Item Number Badge - Mobile */}
                <div className="absolute top-2 left-2 md:hidden w-5 h-5 bg-gradient-to-br from-[#184979] to-[#1e5a8f] rounded-full flex items-center justify-center z-20">
                  <span className="text-[10px] font-bold text-white">{index + 1}</span>
                </div>
                {/* Animated Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#184979]/0 via-[#f26322]/0 to-[#ff7a45]/0 group-hover:from-[#184979]/5 group-hover:via-[#f26322]/5 group-hover:to-[#ff7a45]/5 transition-all duration-300 pointer-events-none"></div>
                
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 pointer-events-none"></div>
                
                <div className="flex gap-2.5 md:gap-3 relative z-10">
                  {/* Product Image with Enhanced Effects */}
                  <div className="relative w-24 h-24 md:w-24 md:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 group-hover:shadow-lg transition-shadow ring-1 ring-gray-200 group-hover:ring-[#f26322]/50">
                    <div className="absolute inset-0 bg-gradient-to-t from-[#184979]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                    {/* Discount Badge on Image */}
                    {(item.unitPrice && item.price > item.unitPrice) && (
                      <div className="absolute top-1 left-1 z-20 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                        {Math.round(((item.price - item.unitPrice) / item.price) * 100)}% OFF
                      </div>
                    )}
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-contain group-hover:scale-110 transition-transform duration-500"
                      sizes="100px"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-sm md:text-base mb-1 line-clamp-2 group-hover:text-[#184979] transition-colors leading-tight">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 flex-wrap">
                          <span className="text-base md:text-xl font-black bg-gradient-to-r from-[#184979] to-[#1e5a8f] bg-clip-text text-transparent">
                            ₹{(item.unitPrice || item.price).toLocaleString()}
                          </span>
                          {item.unitPrice && item.price > item.unitPrice && (
                            <span className="text-xs text-gray-400 line-through">₹{item.price.toLocaleString()}</span>
                          )}
                        </div>
                        {item.unitPrice && item.price > item.unitPrice && (
                          <div className="hidden md:block text-xs text-green-600 font-semibold mb-2">
                            Save ₹{(item.price - item.unitPrice).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFromCart(item._id)}
                        className="group/btn relative text-red-400 hover:text-white hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 p-1.5 md:p-2 rounded-lg transition-all h-fit hover:shadow-md hover:scale-105"
                        title="Remove from cart"
                      >
                        <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <div className="flex items-center bg-gradient-to-r from-gray-50 to-gray-100 border border-[#184979]/20 rounded-xl overflow-hidden shadow-sm">
                        <button
                          onClick={() => handleQuantityUpdate(item._id, item.quantity - 1)}
                          className="px-3 py-1.5 hover:bg-gradient-to-r hover:from-[#f26322] hover:to-[#ff7a45] hover:text-white transition-all font-bold text-gray-600 disabled:opacity-30 text-base"
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="px-3 md:px-4 py-1.5 font-black text-[#184979] min-w-[2.5rem] text-center bg-white text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityUpdate(item._id, item.quantity + 1)}
                          className="px-3 py-1.5 hover:bg-gradient-to-r hover:from-[#f26322] hover:to-[#ff7a45] hover:text-white transition-all font-bold text-gray-600 text-base"
                        >
                          +
                        </button>
                      </div>

                      {/* Subtotal - More prominent on mobile */}
                      <div className="bg-gradient-to-br from-[#184979]/5 to-[#f26322]/5 px-3 py-1.5 rounded-xl border border-[#184979]/10">
                        <span className="font-black text-[#184979] text-sm">₹{((item.unitPrice || item.price) * item.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          </div>

          {/* Order Summary - Desktop Only */}
          <div className="hidden md:block lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-5 sticky top-24 border border-gray-200">
              {/* Header */}
              <div className="mb-5 pb-4 border-b-2 border-gray-100">
                <h2 className="text-xl font-black text-[#184979] mb-1">Order Summary</h2>
                <p className="text-xs text-gray-500">{cartCount} {cartCount === 1 ? 'item' : 'items'} in cart</p>
              </div>

              {/* Price Details */}
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-bold text-gray-900">₹{getCartTotal().toLocaleString()}</span>
                </div>
                
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-bold text-green-600">- ₹{totalDiscount.toLocaleString()}</span>
                  </div>
                )}

                {getTotalDiscount() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-semibold">You Save</span>
                    <span className="font-bold text-green-600">₹{getTotalDiscount().toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Delivery Charges</span>
                  <div className="flex items-center gap-1.5">
                    {deliverySavings > 0 ? (
                      <>
                        <span className="text-xs text-gray-400 line-through">₹{deliverySavings}</span>
                        <span className="font-bold text-green-600 text-sm">FREE</span>
                      </>
                    ) : (
                      <span className="font-bold text-gray-900 text-sm">₹{deliveryCharges}</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t-2 border-dashed border-gray-200">
                  <div className="flex justify-between items-baseline">
                    <span className="text-base font-bold text-gray-900">Total Amount</span>
                    <div className="text-right">
                      <div className="text-2xl font-black text-[#184979]">₹{(getCartTotal() + deliveryCharges).toLocaleString()}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">Incl. of all taxes</div>
                    </div>
                  </div>
                </div>

                {/* Savings Badge */}
                {(getCartTotal() > 0 || deliverySavings > 0) && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center gap-2">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="text-xs font-semibold text-green-700">
                      {getTotalDiscount() > 0 && deliverySavings > 0 ? (
                        <span>You saved ₹{(getTotalDiscount() + deliverySavings).toLocaleString()} total (₹{getTotalDiscount().toLocaleString()} on products + ₹{deliverySavings} delivery)!</span>
                      ) : getTotalDiscount() > 0 ? (
                        <span>You saved ₹{getTotalDiscount().toLocaleString()} on products!</span>
                      ) : deliverySavings > 0 ? (
                        <span>You saved ₹{deliverySavings} on delivery!</span>
                      ) : (
                        <span>Add ₹{(499 - getCartTotal()).toLocaleString()} more for free delivery!</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleProceedToCheckout}
                className="group relative w-full overflow-hidden bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white py-3.5 rounded-lg font-bold text-sm transition-all shadow-md hover:shadow-lg hover:scale-[1.02] flex items-center justify-center gap-2 mb-3"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
                <span className="relative z-10">Proceed to Checkout</span>
                <svg className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </button>

              {/* Continue Shopping Link */}
              <Link
                href="/products"
                className="block text-center text-sm text-[#184979] hover:text-[#f26322] font-semibold transition-colors py-2 hover:bg-gray-50 rounded-lg"
              >
                Continue Shopping
              </Link>

              {/* Trust Badges */}
              <div className="mt-5 pt-5 border-t border-gray-200 space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Free Delivery</div>
                    <div className="text-gray-500 text-[11px]">On orders above ₹499</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Easy Returns</div>
                    <div className="text-gray-500 text-[11px]">7 days return & exchange</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">Secure Payment</div>
                    <div className="text-gray-500 text-[11px]">100% safe & secure</div>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="mt-5 pt-5 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-2">We Accept</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] font-semibold text-gray-700">UPI</div>
                  <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] font-semibold text-gray-700">Cards</div>
                  <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] font-semibold text-gray-700">Net Banking</div>
                  <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] font-semibold text-gray-700">Wallets</div>
                  <div className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-[10px] font-semibold text-gray-700">COD</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Products Section */}
        {recommendedProducts.length > 0 && (
          <div className="mt-8 md:mt-16 mb-8">
            {/* Section Header - Mobile optimized */}
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-base md:text-lg">🔥</span>
                </div>
                <div>
                  <h2 className="text-lg md:text-3xl font-black text-[#184979]">
                    {cartCount > 0 ? 'You might like' : 'Popular'}
                  </h2>
                  <p className="text-[10px] md:text-sm text-gray-500 hidden md:block">Handpicked for you</p>
                </div>
              </div>
              <Link href="/products" className="text-xs md:text-sm font-bold text-[#f26322] flex items-center gap-1">
                See All
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
            
            {loadingRecommendations ? (
              <div className="flex justify-center py-8 md:py-12">
                <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-[#f26322]"></div>
              </div>
            ) : (
              /* Horizontal scroll on mobile, grid on desktop */
              <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-0 -mx-3 px-3 md:mx-0 md:px-0 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {recommendedProducts.map((product, index) => (
                  <Link
                    key={product._id || (product as any).id || `product-${index}`}
                    href={`/products/${product.slug}`}
                    className="group flex-shrink-0 w-[140px] md:w-auto bg-white rounded-2xl shadow-sm md:shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-[#f26322]"
                  >
                    <div className="aspect-square relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                      {((product.price > product.salePrice) || (product.discount && product.discount > 0)) && (
                        <div className="absolute top-1.5 left-1.5 md:top-2 md:right-2 md:left-auto z-10">
                          <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[9px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-full shadow-lg">
                            {product.discount || Math.round(((product.price - product.salePrice) / product.price) * 100)}% OFF
                          </span>
                        </div>
                      )}
                      {product.images && product.images.length > 0 ? (
                        <Image
                          src={product.images[0]}
                          alt={product.title}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <svg className="w-10 h-10 md:w-16 md:h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {/* Quick Add Overlay - Desktop only */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-end justify-center pb-3">
                        <span className="bg-white text-[#184979] text-xs font-bold px-4 py-2 rounded-full shadow-lg">Quick View</span>
                      </div>
                    </div>
                    <div className="p-2.5 md:p-3">
                      <h3 className="font-bold text-xs md:text-sm text-gray-800 mb-1.5 md:mb-2 line-clamp-2 group-hover:text-[#184979] transition-colors leading-tight">
                        {product.title}
                      </h3>
                      <div className="flex items-baseline gap-1.5 md:gap-2 mb-1">
                        <span className="text-sm md:text-lg font-black text-[#184979]">
                          ₹{product.salePrice.toLocaleString()}
                        </span>
                        {product.price > product.salePrice && (
                          <span className="text-[10px] md:text-xs text-gray-400 line-through">
                            ₹{product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {product.ratingAvg && product.ratingCount && product.ratingAvg > 0 && product.ratingCount > 0 && (
                        <div className="flex items-center gap-1 mb-1.5 md:mb-2">
                          <div className="flex items-center gap-0.5 bg-green-50 px-1.5 py-0.5 rounded">
                            <span className="text-yellow-500 text-[10px] md:text-sm">★</span>
                            <span className="text-[10px] md:text-sm font-bold text-green-700">{product.ratingAvg.toFixed(1)}</span>
                          </div>
                          <span className="text-[9px] md:text-xs text-gray-400">({product.ratingCount})</span>
                        </div>
                      )}
                      {/* Add to Cart Button - Hidden on mobile, compact */}
                      <button className="hidden md:block mt-2 w-full bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white text-xs font-bold py-2 rounded-lg hover:shadow-lg transition-all">
                        View Product
                      </button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Mobile Sticky Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-2xl z-50 safe-area-bottom">
        <div className="px-4 py-3">
          {/* Savings Banner */}
          {(getTotalDiscount() > 0 || deliverySavings > 0) && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg px-3 py-1.5 mb-2 flex items-center gap-2 border border-green-200">
              <span className="text-sm">🎉</span>
              <span className="text-[10px] font-bold text-green-700">
                You're saving ₹{(getTotalDiscount() + deliverySavings).toLocaleString()} on this order!
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between gap-3">
            {/* Price Summary */}
            <div className="flex-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-[#184979]">₹{(getCartTotal() + deliveryCharges).toLocaleString()}</span>
                {getTotalDiscount() > 0 && (
                  <span className="text-xs text-gray-400 line-through">₹{(getCartTotal() + getTotalDiscount() + deliveryCharges).toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <span>Incl. taxes</span>
                {deliverySavings > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-green-600 font-semibold">FREE Delivery</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Checkout Button */}
            <button
              onClick={handleProceedToCheckout}
              className="group relative overflow-hidden bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
              <span className="relative z-10">Checkout</span>
              <svg className="w-4 h-4 relative z-10 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
