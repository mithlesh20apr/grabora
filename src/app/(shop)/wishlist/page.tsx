'use client';

import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

export default function WishlistPage() {
  const { wishlistItems, wishlistCount, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const handleAddToCart = (item: any) => {
    addToCart({
      _id: item._id,
      sku: item.sku,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      discount: item.discount
    });
    setToastMessage('Added to Cart!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleRemove = (itemId: string) => {
    removeFromWishlist(itemId);
    setToastMessage('Removed from Wishlist');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  if (wishlistCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-pink-50 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-3xl shadow-2xl p-12">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-pink-100 to-red-100 rounded-full flex items-center justify-center">
                <svg className="w-16 h-16 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Wishlist is Empty</h2>
              <p className="text-gray-600 mb-8">Start adding products you love to your wishlist.</p>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white px-8 py-4 rounded-full font-bold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-pink-50 py-8 md:py-16">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#184979] to-[#1e5a8f] text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 flex items-center gap-2 border-2 border-white/30">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[#184979] mb-2">My Wishlist</h1>
            <p className="text-gray-600">{wishlistCount} {wishlistCount === 1 ? 'item' : 'items'} in your wishlist</p>
          </div>
          {wishlistCount > 0 && (
            <button
              onClick={clearWishlist}
              className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          )}
        </div>

        {/* Wishlist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlistItems.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-gray-100">
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Discount Badge */}
                {item.discount && item.discount > 0 && (
                  <div className="absolute top-3 left-3 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                    {item.discount}% OFF
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(item._id)}
                  className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:scale-110 duration-300 shadow-xl"
                >
                  <svg className="w-5 h-5 text-gray-700 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Product Details */}
              <div className="p-4">
                <h3 className="font-bold text-gray-800 text-base mb-2 line-clamp-2">
                  {item.name}
                </h3>

                {item.category && (
                  <p className="text-xs text-gray-500 mb-3">{item.category}</p>
                )}

                {/* Price */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl font-black text-[#184979]">
                    ₹{item.price.toLocaleString()}
                  </span>
                  {item.discount && item.discount > 0 && (
                    <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded">
                      {item.discount}% OFF
                    </span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => handleAddToCart(item)}
                  className="w-full bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Continue Shopping */}
        <div className="mt-12 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-[#184979] hover:text-[#f26322] font-semibold text-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
