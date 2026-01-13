'use client';

export default function OrdersLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header Skeleton */}
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-6"></div>
        
        {/* Filter Tabs Skeleton */}
        <div className="flex gap-3 mb-6 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse flex-shrink-0"></div>
          ))}
        </div>
        
        {/* Order Cards Skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-4">
              {/* Order Header */}
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
              
              {/* Order Items */}
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-200 rounded animate-pulse flex-shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-5 w-20 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              
              {/* Order Actions */}
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
