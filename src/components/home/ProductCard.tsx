'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLoader } from '@/components/ui/Loader';
import { useState, useMemo } from 'react';

// Variant interface for product variants
interface ProductVariant {
  _id?: string;
  sku: string;
  attributes: {
    color?: string;
    size?: string;
    storage?: string;
    ram?: string;
    [key: string]: string | undefined;
  };
  images?: string[];
  price: number;
  salePrice?: number;
  mrp?: number;
  additionalPrice?: number;
  stock: number;
  active: boolean;
}

interface Product {
  _id: string;
  title: string;
  slug?: string;
  sku?: string;
  shortDescription: string;
  price?: number;
  salePrice?: number;
  mrp?: number;
  originalPrice?: number;
  imageUrl?: string;
  images?: string[];
  variants?: ProductVariant[];
  discount?: number;
  ratingAvg?: number;
  rating?: number;
  ratingCount?: number;
  reviewCount?: number;
  totalOrders?: number;
  inStock?: boolean;
  availableStock?: number;
  // Seller-related fields from backend
  isNearbySeller?: boolean;
  deliveryEta?: string;
  sellerScore?: number;
  sellerIsBoosted?: boolean;
  sellerBadges?: string[];
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { showLoader, hideLoader } = useLoader();
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [hoveredVariant, setHoveredVariant] = useState<ProductVariant | null>(null);
  
  // Get unique color variants with images
  const colorVariants = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return [];
    
    const colorMap = new Map<string, ProductVariant>();
    product.variants.forEach(v => {
      const color = v.attributes.color;
      if (color && v.active && !colorMap.has(color)) {
        colorMap.set(color, v);
      }
    });
    
    return Array.from(colorMap.values());
  }, [product.variants]);
  
  // Handle different data structures from API and mock data
  const productSlug = product.slug || product.title.toLowerCase().replace(/\s+/g, '-');
  const productPrice = product.mrp || product.price || product.originalPrice || 0;
  const productSalePrice = product.salePrice || product.price || 0;
  
  // Get display image - either from hovered variant or default
  const productImage = useMemo(() => {
    if (hoveredVariant && hoveredVariant.images && hoveredVariant.images.length > 0) {
      return hoveredVariant.images[0];
    }
    return product.images?.[0] || product.imageUrl || '';
  }, [hoveredVariant, product.images, product.imageUrl]);
  
  const productRating = product.ratingAvg || product.rating || 0;
  const productReviewCount = product.ratingCount || product.reviewCount || 0;
  
  const discountPercent = productPrice > productSalePrice 
    ? Math.round(((productPrice - productSalePrice) / productPrice) * 100)
    : product.discount || 0;

  const isWishlisted = isInWishlist(product._id);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showLoader('Adding to cart...');
    try {
      // Get SKU from product, or first variant if available
      const productSku = product.sku || (product.variants && product.variants.length > 0 ? product.variants[0].sku : undefined);

      // Handle both _id and id field names from API
      const productId = product._id || (product as any).id;

      if (!productId) {
        console.error('Product missing ID:', product);
        throw new Error('Product ID is required');
      }

      const cartItem = {
        _id: productId,
        productId: productId, // Also set productId explicitly for API calls
        sku: productSku, // Use actual SKU from API or first variant
        slug: productSlug, // Store slug for fetching SKU later if needed
        name: product.title,
        price: productPrice, // Use MRP/original price
        unitPrice: productSalePrice, // Use sale price
        imageUrl: productImage,
        discount: discountPercent
      };
      await addToCart(cartItem);
      setToastMessage('Added to Cart!');
      setShowAddedToast(true);
      setTimeout(() => setShowAddedToast(false), 2000);
    } catch (error) {
      console.error('Add to cart error:', error);
      setToastMessage('Failed to add to cart');
      setShowAddedToast(true);
      setTimeout(() => setShowAddedToast(false), 2000);
    } finally {
      hideLoader();
    }
  };

  const handleWishlistToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    showLoader(isWishlisted ? 'Removing from wishlist...' : 'Adding to wishlist...');
    try {
      if (isWishlisted) {
        await removeFromWishlist(product._id);
        setToastMessage('Removed from Wishlist');
      } else {
        await addToWishlist({
          _id: product._id,
          name: product.title,
          price: productSalePrice,
          imageUrl: productImage,
          discount: discountPercent,
          category: product.shortDescription
        });
        setToastMessage('Added to Wishlist!');
      }
      setShowAddedToast(true);
      setTimeout(() => setShowAddedToast(false), 2000);
    } catch (error) {
      setToastMessage('Operation failed');
      setShowAddedToast(true);
      setTimeout(() => setShowAddedToast(false), 2000);
    } finally {
      hideLoader();
    }
  };

  // Navigate to product detail page
  const handleProductClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements (buttons)
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    showLoader('Loading product...');
    router.push(`/products/${productSlug}`);
  };

  // Seller UI helpers
  const isNearbySeller = product.isNearbySeller;
  const deliveryEta = product.deliveryEta;
  const sellerBadges = Array.isArray(product.sellerBadges) ? product.sellerBadges : [];
  const sellerIsBoosted = !!product.sellerIsBoosted;

  // Badge icons
  const BADGE_ICONS: Record<string, JSX.Element> = {
    TOP_RATED: (
      <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-[10px] font-bold mr-1">Top Rated</span>
    ),
    BOOSTED: (
      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold mr-1">Boosted</span>
    ),
  };

  return (
    <div
      onClick={handleProductClick}
      className={`cursor-pointer group bg-white rounded-xl md:rounded-2xl shadow-md md:shadow-lg hover:shadow-[0_20px_60px_rgba(24,73,121,0.25)] transition-all duration-500 overflow-hidden border ${sellerIsBoosted ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-[#f26322]'} transform hover:-translate-y-2 relative block`}
    >
      {/* Toast Notification */}
      {showAddedToast && (
        <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#184979] to-[#1e5a8f] text-white px-3 py-1.5 md:px-6 md:py-3 rounded-full shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 flex items-center gap-1.5 md:gap-2 border border-white/30 md:border-2">
          <svg className="w-4 h-4 md:w-5 md:h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-bold text-xs md:text-sm">{toastMessage}</span>
        </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-br from-[#184979]/0 to-[#f26322]/0 group-hover:from-[#184979]/5 group-hover:to-[#f26322]/5 transition-all duration-500 pointer-events-none rounded-2xl"></div>
      {/* Image Container */}
      <div className="relative w-full bg-gradient-to-br from-gray-100 to-gray-50 overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
        {/* Seller badges and tags */}
        <div className="absolute top-2 left-2 z-30 flex flex-col gap-1 items-start">
          {/* Nearby Seller tag */}
          {isNearbySeller && (
            <span className="bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 rounded-full mb-0.5 shadow">Nearby Seller</span>
          )}
          {/* Seller badges */}
          {sellerBadges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sellerBadges.map((badge) => (
                <span key={badge}>{BADGE_ICONS[badge] || <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold mr-1">{badge}</span>}</span>
              ))}
            </div>
          )}
          {/* Sponsored/Boosted indicator */}
          {sellerIsBoosted && (
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-300 shadow">Sponsored</span>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
        <Image
          src={productImage}
          alt={product.title}
          fill
          className="object-contain group-hover:scale-110 transition-all duration-700"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={false}
        />
        {/* Delivery ETA */}
        {deliveryEta && (
          <div className="absolute bottom-2 left-2 bg-white/90 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded shadow z-30 flex items-center gap-1">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {deliveryEta}
          </div>
        )}
        
        {/* Discount Badge */}
        {discountPercent > 0 && (
          <div className="absolute top-2 left-2 md:top-3 md:left-3 z-20">
            <div className="relative bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white px-2 py-1 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold shadow-xl md:shadow-2xl animate-pulse">
              <span className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-75 hidden md:block"></span>
              <span className="relative flex items-center gap-0.5 md:gap-1">
                <svg className="w-3 h-3 md:w-4 md:h-4 hidden md:block" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                </svg>
                {discountPercent}% OFF
              </span>
            </div>
          </div>
        )}

        {/* Wishlist Button */}
        <button 
          onClick={handleWishlistToggle}
          className={`absolute top-2 right-2 md:top-3 md:right-3 z-20 backdrop-blur-sm p-1.5 md:p-2.5 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-all shadow-lg md:shadow-xl hover:scale-125 duration-300 ${
            isWishlisted 
              ? 'bg-red-500 hover:bg-red-600 opacity-100' 
              : 'bg-white/90 hover:bg-white hover:rotate-12'
          }`}
        >
          <svg 
            className={`w-4 h-4 md:w-5 md:h-5 transition-all ${
              isWishlisted 
                ? 'text-white fill-white' 
                : 'text-gray-700 hover:text-red-500 hover:fill-red-500'
            }`}
            fill={isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>

        {/* Quick View Overlay - Hidden on mobile */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-all duration-500 z-20 hidden md:block">
          <button className="w-full bg-white text-[#184979] py-3 rounded-xl font-bold hover:bg-gradient-to-r hover:from-[#f26322] hover:to-[#ff7a45] hover:text-white transition-all duration-300 shadow-2xl flex items-center justify-center gap-2 group/btn">
            <svg className="w-5 h-5 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Quick View
          </button>
        </div>
        
        {/* Color Variant Swatches - Show on hover, hidden on mobile */}
        {colorVariants.length > 1 && (
          <div className="absolute bottom-3 left-3 right-3 z-15 opacity-0 group-hover:opacity-100 transition-all duration-300 hidden md:block">
            <div className="flex gap-1.5 justify-center bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg">
              {colorVariants.slice(0, 5).map((variant) => (
                <button
                  key={variant._id || variant.sku}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredVariant(variant);
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    setHoveredVariant(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className={`relative w-8 h-8 rounded-md overflow-hidden border-2 transition-all duration-150 ${
                    hoveredVariant?._id === variant._id || hoveredVariant?.sku === variant.sku
                      ? 'border-[#f26322] scale-110 shadow-md'
                      : 'border-gray-200 hover:border-[#184979]'
                  }`}
                  title={variant.attributes.color}
                >
                  {variant.images && variant.images.length > 0 ? (
                    <Image
                      src={variant.images[0]}
                      alt={variant.attributes.color || ''}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-[8px] font-bold text-gray-600">
                      {variant.attributes.color?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </button>
              ))}
              {colorVariants.length > 5 && (
                <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 border border-gray-200">
                  +{colorVariants.length - 5}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2.5 md:p-5 relative">
        {/* Color count badge */}
        {colorVariants.length > 1 && (
          <div className="absolute -top-3 right-2 md:right-3 bg-[#184979] text-white text-[8px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-semibold">
            {colorVariants.length} colors
          </div>
        )}
        
        <h3 className="font-bold text-gray-800 mb-1 md:mb-2 line-clamp-2 group-hover:text-[#184979] transition-colors text-xs md:text-base leading-tight">
          {product.title}
        </h3>

        {/* Rating & Sold - Simplified on mobile */}
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="flex items-center gap-1 md:gap-3">
            <div className="flex items-center">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => {
                  const starValue = i + 1;
                  const isFull = productRating >= starValue;
                  const isHalf = !isFull && productRating >= starValue - 0.5;
                  
                  return (
                    <div key={i} className="relative w-3 h-3 md:w-4 md:h-4">
                      {/* Empty star background */}
                      <svg className="w-3 h-3 md:w-4 md:h-4 fill-gray-300 absolute" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      {/* Full or half star */}
                      {(isFull || isHalf) && (
                        <svg 
                          className="w-3 h-3 md:w-4 md:h-4 fill-current absolute" 
                          viewBox="0 0 20 20"
                          style={isHalf ? { clipPath: 'inset(0 50% 0 0)' } : {}}
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px] md:text-sm text-gray-500 ml-0.5 md:ml-1">({productReviewCount})</span>
            </div>
            {(product.totalOrders || 0) > 0 && (
              <span className="hidden md:inline text-xs text-purple-600 font-semibold">{product.totalOrders} sold</span>
            )}
          </div>
          <span className="hidden md:inline text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">In Stock</span>
        </div>

        {/* Price Section */}
        <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-md md:rounded-lg p-2 md:p-3 mb-2 md:mb-3">
          <div className="flex items-center gap-1 md:gap-2 flex-nowrap overflow-hidden">
            <span className="text-sm md:text-xl font-extrabold text-[#184979] flex-shrink-0">
              ₹{productSalePrice.toLocaleString()}
            </span>
            {productPrice > productSalePrice && (
              <span className="text-[10px] md:text-sm text-gray-400 line-through flex-shrink-0">
                ₹{productPrice.toLocaleString()}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="text-[10px] md:text-xs font-bold text-green-600 bg-green-100 px-1 py-0.5 md:px-2 md:py-1 rounded flex-shrink-0 ml-auto">
                {discountPercent}% OFF
              </span>
            )}
          </div>
          {discountPercent > 0 && (
            <div className="hidden md:block text-xs text-green-600 font-semibold mt-1">
              Save ₹{(productPrice - productSalePrice).toLocaleString()}
            </div>
          )}
        </div>

        {/* Features/Benefits - Hidden on mobile */}
        <div className="hidden md:block space-y-2 mb-4 text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Free Shipping on orders above ₹499</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>7 Days Easy Return & Exchange</span>
          </div>
          {discountPercent > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-[#f26322]">Limited Time Offer!</span>
            </div>
          )}
        </div>

        {/* Add to Cart Button */}
        <button 
          onClick={handleAddToCart}
          className="w-full bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white py-2 px-3 md:py-3 md:px-4 rounded-lg md:rounded-xl text-xs md:text-base font-bold transition-all shadow-md md:shadow-lg hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2 group/cart"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5 group-hover/cart:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="hidden md:inline">Add to Cart</span>
          <span className="md:hidden">Add</span>
        </button>
      </div>
    </div>
  );
}
