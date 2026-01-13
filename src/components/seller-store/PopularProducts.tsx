'use client';

import { Product } from '@/types/seller-store';
import StoreProductCard from './StoreProductCard';

interface PopularProductsProps {
  products: Product[];
  isSellerActive?: boolean;
}

export default function PopularProducts({ products, isSellerActive = true }: PopularProductsProps) {
  if (products.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Popular Products</h2>
          <p className="text-gray-600 text-sm">Bestsellers from this store</p>
        </div>
      </div>

      {/* Desktop: Grid, Mobile: Horizontal Scroll */}
      <div className="md:hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
          {products.slice(0, 6).map((product) => (
            <div key={product.id} className="flex-none w-[280px] snap-start">
              <StoreProductCard product={product} isSellerActive={isSellerActive} />
            </div>
          ))}
        </div>
      </div>

      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {products.slice(0, 6).map((product) => (
          <StoreProductCard key={product.id} product={product} isSellerActive={isSellerActive} />
        ))}
      </div>
    </section>
  );
}
