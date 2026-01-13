'use client';

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb Skeleton */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
              {i < 3 && <div className="h-3 w-3 bg-gray-200 rounded animate-pulse"></div>}
            </div>
          ))}
        </div>
        
        <div className="lg:grid lg:grid-cols-2 lg:gap-8">
          {/* Image Gallery Skeleton */}
          <div>
            <div className="aspect-square bg-gray-200 rounded-lg animate-pulse mb-4"></div>
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-16 h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Product Info Skeleton */}
          <div>
            {/* Title */}
            <div className="h-8 w-3/4 bg-gray-200 rounded animate-pulse mb-4"></div>
            
            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-5 w-16 bg-gray-100 rounded animate-pulse"></div>
              <div className="h-5 w-14 bg-green-100 rounded animate-pulse"></div>
            </div>
            
            {/* Description */}
            <div className="space-y-2 mb-6">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-4/6 bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            {/* Variant Selection */}
            <div className="space-y-4 mb-6">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
            
            {/* Quantity & Buttons */}
            <div className="flex gap-4 mb-6">
              <div className="h-12 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-12 flex-1 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-12 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            
            {/* Additional Info */}
            <div className="border-t pt-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
