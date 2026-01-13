'use client';

export default function CartLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header Skeleton */}
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6"></div>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Cart Items Section */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-sm p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 py-4 border-b last:border-b-0">
                  {/* Image Skeleton */}
                  <div className="w-24 h-24 bg-gray-200 rounded-lg animate-pulse flex-shrink-0"></div>
                  
                  {/* Content Skeleton */}
                  <div className="flex-1">
                    <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse mb-3"></div>
                    <div className="flex items-center justify-between">
                      <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Summary Section */}
          <div className="lg:col-span-4 mt-6 lg:mt-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between py-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
              <div className="border-t mt-3 pt-3">
                <div className="flex justify-between">
                  <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse mt-4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
