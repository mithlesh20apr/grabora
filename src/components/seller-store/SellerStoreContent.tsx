'use client';

import { useState, useEffect } from 'react';
import { usePincode } from '@/contexts/PincodeContext';
import { SellerStoreData, SellerStoreMeta } from '@/types/seller-store';
import SellerHeader from './SellerHeader';
import SellerHighlights from './SellerHighlights';
import PopularProducts from './PopularProducts';
import ProductGrid from './ProductGrid';

interface SellerStoreContentProps {
  initialData: SellerStoreData;
  meta: SellerStoreMeta;
  sellerId: string;
  initialPincode?: string;
}

export default function SellerStoreContent({
  initialData,
  meta: initialMeta,
  sellerId,
  initialPincode,
}: SellerStoreContentProps) {
  const { pincode } = usePincode();
  const [storeData, setStoreData] = useState(initialData);
  const [meta, setMeta] = useState(initialMeta);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Use context pincode or initial pincode
  const activePincode = pincode || initialPincode;

  // Fetch store data when pincode changes
  useEffect(() => {
    // Skip if we're using the initial pincode that was already fetched
    if (activePincode === initialPincode && currentPage === 1) return;

    async function fetchStoreData() {
      setIsLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '20',
        });

        if (activePincode) {
          params.append('pincode', activePincode);
        }

        const response = await fetch(`${apiBaseUrl}/seller/${sellerId}/store?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setStoreData(result.data);
          setMeta(result.meta);
        }
      } catch (error) {
        console.error('Error fetching store data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStoreData();
  }, [activePincode, currentPage, sellerId, initialPincode]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSellerActive = storeData.seller.isActive !== false;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Seller Header */}
      <SellerHeader seller={storeData.seller} hasPincode={!!activePincode} />

      {/* Seller Highlights */}
      <SellerHighlights />

      {/* Inactive Seller Banner */}
      {!isSellerActive && (
        <div className="bg-red-50 border-t border-b border-red-200">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-center gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-800 font-medium text-center">
                This seller is currently not accepting orders.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Container */}
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Popular Products Section */}
        {storeData.popularProducts.length > 0 && (
          <PopularProducts products={storeData.popularProducts} isSellerActive={isSellerActive} />
        )}

        {/* All Products Section */}
        <ProductGrid
          products={storeData.allProducts}
          meta={meta}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          isLoading={isLoading}
          isSellerActive={isSellerActive}
        />
      </div>
    </div>
  );
}
