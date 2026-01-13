'use client';

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header Skeleton */}
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse mb-6"></div>
        
        {/* Progress Steps Skeleton */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse hidden sm:block"></div>
            </div>
          ))}
        </div>
        
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Main Form Section */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {/* Section Title */}
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
              
              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i}>
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Order Summary Section */}
          <div className="lg:col-span-4 mt-6 lg:mt-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
              
              {/* Items */}
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-3 py-3 border-b">
                  <div className="w-16 h-16 bg-gray-200 rounded animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
              
              {/* Totals */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between py-2">
                  <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ))}
              
              <div className="border-t mt-3 pt-3">
                <div className="h-5 w-full bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
