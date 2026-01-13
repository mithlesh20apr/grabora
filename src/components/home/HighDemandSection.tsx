'use client';

import { HighDemandProduct } from '@/services/home';
import ProductCard from './ProductCard';

interface HighDemandSectionProps {
  products: HighDemandProduct[];
}

export default function HighDemandSection({ products }: HighDemandSectionProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="py-8 md:py-12 bg-gradient-to-br from-orange-50 to-red-50">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <svg className="w-10 h-10 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              High Demand in Your Area
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Popular products near you with fast delivery
            </p>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <div key={product.id} className="relative">
              {/* High Demand Badge */}
              <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {product.orderCount} orders
              </div>

              <ProductCard
                product={{
                  _id: product.id,
                  title: product.title,
                  shortDescription: '',
                  price: parseFloat(product.price),
                  salePrice: parseFloat(product.salePrice),
                  images: product.images,
                  rating: 4.5,
                }}
              />

              {/* Delivery Badge */}
              {product.deliveryEta && (
                <div className="mt-2 bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full text-center">
                  🚀 {product.deliveryEta}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
