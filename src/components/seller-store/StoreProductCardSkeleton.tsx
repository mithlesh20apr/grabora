export default function StoreProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-pulse">
      {/* Image Skeleton */}
      <div className="aspect-square bg-gray-200"></div>

      {/* Content Skeleton */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* Rating */}
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>

        {/* Price */}
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>

        {/* Delivery */}
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>

        {/* Button */}
        <div className="h-9 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );
}
