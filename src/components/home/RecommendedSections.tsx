'use client';
import { useState, useEffect } from 'react';
import ProductSection from '@/components/home/ProductSection';
import { useAuth } from '@/contexts/AuthContext';

export default function RecommendedSections() {
  const { isAuthenticated } = useAuth();
  const [personalizedProducts, setPersonalizedProducts] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        
        // Fetch personalized recommendations if user is logged in
        if (isAuthenticated) {
          const token = sessionStorage.getItem('token');
          if (token) {
            try {
              const personalizedResponse = await fetch(`${apiBaseUrl}/recommendations/personalized?limit=10`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (personalizedResponse.ok) {
                const personalizedResult = await personalizedResponse.json();
                if (personalizedResult.success && personalizedResult.data) {
                  setPersonalizedProducts(personalizedResult.data);
                }
              }
            } catch (error) {
            }
          }
        }

        // Fetch trending products (public)
        try {
          const trendingResponse = await fetch(`${apiBaseUrl}/recommendations/trending?limit=10`);
          if (trendingResponse.ok) {
            const trendingResult = await trendingResponse.json();
            if (trendingResult.success && trendingResult.data) {
              setTrendingProducts(trendingResult.data);
            }
          }
        } catch (error) {
        }

        // Fetch popular products (public)
        try {
          const popularResponse = await fetch(`${apiBaseUrl}/recommendations/popular?limit=10`);
          if (popularResponse.ok) {
            const popularResult = await popularResponse.json();
            if (popularResult.success && popularResult.data) {
              setPopularProducts(popularResult.data);
            }
          }
        } catch (error) {
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-[#184979]"></div>
          <p className="text-gray-600 mt-4">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Personalized Recommendations - Only for logged-in users */}
      {isAuthenticated && personalizedProducts.length > 0 && (
        <ProductSection
          title="Just For You"
          subtitle="Personalized recommendations based on your preferences"
          products={personalizedProducts}
          icon={
            <svg className="w-10 h-10 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          }
          bgColor="bg-gradient-to-br from-orange-50 to-white"
        />
      )}

      {/* Trending Products */}
      {trendingProducts.length > 0 && (
        <ProductSection
          title="Trending Products"
          subtitle="Most popular items right now"
          products={trendingProducts}
          icon={
            <svg className="w-10 h-10 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
          bgColor="bg-white"
        />
      )}

      {/* Popular Products */}
      {popularProducts.length > 0 && (
        <ProductSection
          title="Popular Products"
          subtitle="Customer favorites across all categories"
          products={popularProducts}
          icon={
            <svg className="w-10 h-10 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          }
          bgColor="bg-gray-50"
        />
      )}
    </>
  );
}
