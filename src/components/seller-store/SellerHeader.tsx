'use client';

import Image from 'next/image';
import { SellerInfo } from '@/types/seller-store';

interface SellerHeaderProps {
  seller: SellerInfo;
  hasPincode: boolean;
}

export default function SellerHeader({ seller, hasPincode }: SellerHeaderProps) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Store Logo */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden bg-gray-100 border-2 border-gray-200 shadow-lg">
              {seller.storeLogo ? (
                <Image
                  src={seller.storeLogo}
                  alt={seller.storeName}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#184979] to-[#1e5a8f] text-white text-4xl font-bold">
                  {seller.storeName.charAt(0)}
                </div>
              )}
            </div>
          </div>

          {/* Store Info */}
          <div className="flex-1 space-y-3">
            {/* Store Name & Badges */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                  {seller.storeName}
                </h1>
                {hasPincode && (
                  <span className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Local Seller
                  </span>
                )}
              </div>

              {seller.storeDescription && (
                <p className="text-gray-600 text-sm md:text-base max-w-2xl">
                  {seller.storeDescription}
                </p>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              {/* Rating */}
              <div className="flex items-center gap-2">
                {renderStars(Math.round(seller.avgRating))}
                <span className="text-sm font-semibold text-gray-700">
                  {seller.avgRating.toFixed(1)}
                </span>
              </div>

              {/* Total Orders */}
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
                <span className="text-sm font-medium">
                  {seller.totalOrders.toLocaleString()} orders
                </span>
              </div>

              {/* Delivery ETA */}
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full border border-green-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-sm font-semibold">{seller.deliveryEta}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
