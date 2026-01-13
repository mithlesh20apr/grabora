'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { recentViewsManager, RecentProduct } from '@/lib/recentViews';

export default function RecentlyViewed() {
  const [recentViews, setRecentViews] = useState<RecentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initial load
    const views = recentViewsManager.getRecentViews();
    setRecentViews(views);
    setIsLoading(false);

    // Listen for updates
    const handleUpdate = () => {
      setRecentViews(recentViewsManager.getRecentViews());
    };

    window.addEventListener('recentViewsUpdated', handleUpdate);
    return () => window.removeEventListener('recentViewsUpdated', handleUpdate);
  }, []);

  const handleRemove = (productId: string) => {
    recentViewsManager.removeView(productId);
  };

  const handleClearAll = () => {
    if (confirm('Clear all recently viewed products?')) {
      recentViewsManager.clearRecentViews();
    }
  };

  if (isLoading) {
    return null;
  }

  if (recentViews.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 md:mb-12">
      <div className="flex items-center justify-between mb-4 md:mb-8 pb-2 md:pb-4 border-b-2 border-gray-200">
        <h2 className="text-base md:text-2xl font-bold text-gray-900">Recently Viewed Products</h2>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div className="overflow-x-auto scrollbar-thin scrollbar-track-gray-200 scrollbar-thumb-blue pb-4">
          <div className="flex gap-3 md:gap-6" style={{ width: 'max-content' }}>
            {recentViews.map((product) => (
              <div 
                key={product._id} 
                className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300"
                style={{ width: 'calc((100vw - 4rem) / 2.5)', minWidth: '150px', maxWidth: '300px' }}
              >
                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(product._id)}
                  className="absolute top-2 right-2 md:top-3 md:right-3 w-6 h-6 md:w-8 md:h-8 bg-white rounded-full shadow-md flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 hover:bg-red-50"
                  title="Remove from recently viewed"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <Link href={`/products/${product.slug}`} className="block">
                  {/* Image */}
                  <div className="relative w-full aspect-square bg-gray-100">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="300px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-2.5 md:p-4">
                    <p className="text-[10px] md:text-xs text-[#f26322] font-semibold mb-0.5 md:mb-1 uppercase tracking-wide line-clamp-1">{product.brand}</p>
                    <h3 className="text-xs md:text-sm font-semibold text-gray-800 mb-1.5 md:mb-2 line-clamp-2 leading-tight group-hover:text-[#184979] transition-colors">
                      {product.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 md:gap-2">
                      <span className="text-sm md:text-lg font-bold text-[#184979]">₹{product.salePrice.toLocaleString()}</span>
                      {product.price !== product.salePrice && (
                        <>
                          <span className="text-[10px] md:text-sm text-gray-400 line-through">₹{product.price.toLocaleString()}</span>
                          <span className="text-[9px] md:text-xs font-semibold text-green-600 bg-green-50 px-1 md:px-2 py-0.5 rounded">
                            {Math.round((1 - product.salePrice / product.price) * 100)}% OFF
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
        
        {/* Scroll Indicator */}
        {recentViews.length > 4 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <svg className="w-5 h-5 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <span className="text-sm text-gray-500 font-medium">Scroll to see more</span>
            <svg className="w-5 h-5 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
