'use client';

export default function RegisterLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#184979] to-[#0d2d4a] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo Skeleton */}
        <div className="flex justify-center mb-6">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
        
        {/* Title Skeleton */}
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mx-auto mb-2"></div>
        <div className="h-4 w-56 bg-gray-200 rounded animate-pulse mx-auto mb-8"></div>
        
        {/* Form Fields Skeleton */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div>
              <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
          <div>
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div>
            <div className="h-3 w-28 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div>
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div>
            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
            <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="h-12 w-full bg-gray-200 rounded-lg animate-pulse mt-2"></div>
        </div>
        
        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <div className="h-4 w-8 bg-gray-200 rounded animate-pulse mx-4"></div>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>
        
        {/* Social Login Skeleton */}
        <div className="flex gap-4">
          <div className="h-12 flex-1 bg-gray-200 rounded-lg animate-pulse"></div>
          <div className="h-12 flex-1 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        
        {/* Login Link */}
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mx-auto mt-6"></div>
      </div>
    </div>
  );
}
