'use client';

import { NearbySeller } from '@/services/home';
import Image from 'next/image';
import Link from 'next/link';

interface NearbySellersProps {
  sellers: NearbySeller[];
}

export default function NearbySellersSection({ sellers }: NearbySellersProps) {
  if (!sellers || sellers.length === 0) return null;

  return (
    <section className="py-8 md:py-12 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-10 h-10 text-[#184979]" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Nearby Sellers</h2>
            <p className="text-gray-600 text-sm md:text-base">Fast delivery from local stores</p>
          </div>
        </div>

        {/* Sellers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sellers.map((seller) => (
            <Link
              key={seller.sellerId}
              href={`/seller/${seller.sellerId}`}
              className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 border border-gray-200 hover:border-[#184979]"
            >
              {/* Store Logo */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {seller.storeLogo ? (
                    <Image
                      src={seller.storeLogo}
                      alt={seller.storeName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#184979] text-white text-2xl font-bold">
                      {seller.storeName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#184979] transition-colors line-clamp-1">
                    {seller.storeName}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {seller.avgRating.toFixed(1)}
                    </span>
                    <span>•</span>
                    <span>{seller.totalOrders} orders</span>
                  </div>
                </div>
              </div>

              {/* Delivery ETA */}
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Delivery: {seller.deliveryEta}
              </div>

              {/* View Store Button */}
              <div className="mt-4 text-center">
                <span className="text-[#184979] font-semibold group-hover:underline">
                  View Store →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
