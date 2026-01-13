'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLoader } from '@/components/ui/Loader';

interface SearchResult {
  id: string;
  title: string;
  category: string;
  price: number;
  image: string;
  slug: string;
}

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { showLoader, hideLoader } = useLoader();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search functionality with debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.trim().length >= 1) {
        setIsLoading(true);
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
          const response = await fetch(`${apiBaseUrl}/search?q=${encodeURIComponent(searchQuery.trim())}&limit=10`);
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.hits && result.data.hits.length > 0) {
              const searchResults: SearchResult[] = result.data.hits
                .map((hit: any) => {
                  // Generate slug from title if not provided
                  const slug = hit.slug || hit.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                  return {
                    id: hit.id || hit._id,
                    title: hit.title || 'Untitled Product',
                    category: hit.brand || 'Product',
                    price: hit.salePrice || hit.price || 0,
                    image: hit.images?.[0] || '',
                    slug: slug
                  };
                })
                .filter((item: SearchResult) => item.slug); // Filter out items without valid slugs
              setResults(searchResults);
              setIsOpen(true);
            } else {
              setResults([]);
              setIsOpen(true);
            }
          } else {
            setResults([]);
            setIsOpen(true);
          }
        } catch (error) {
          setResults([]);
          setIsOpen(true);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery)}`);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  const handleResultClick = (slug: string) => {
    if (!slug) {
      return;
    }
    // Show loader and navigate to product detail page
    showLoader('Loading product...');
    setIsOpen(false);
    setSearchQuery('');
    router.push(`/products/${slug}`);
  };

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl mx-2 md:mx-4 w-full">
      <form onSubmit={handleSearch}>
        <div className="relative group">
          {/* Animated Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#184979] to-[#f26322] rounded-full blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-300"></div>
          
          {/* Search Input Container */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="w-full px-4 py-2.5 pl-10 pr-10 md:px-6 md:py-3.5 md:pl-14 md:pr-14 text-sm md:text-base text-gray-800 bg-white/95 backdrop-blur-sm border-2 border-gray-200 rounded-full focus:outline-none focus:ring-4 focus:ring-[#184979]/20 focus:border-[#184979] transition-all duration-300 shadow-lg placeholder:text-gray-400 font-medium"
            />
            
            {/* Search Icon */}
            <div className="absolute left-3 md:left-5 top-1/2 transform -translate-y-1/2 text-[#184979]">
              <svg
                className="w-5 h-5 md:w-6 md:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            
            {/* Clear Button */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsOpen(false);
                }}
                className="absolute right-5 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-gray-200 hover:bg-[#f26322] rounded-full flex items-center justify-center transition-colors group/clear"
              >
                <svg className="w-4 h-4 text-gray-600 group-hover/clear:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="absolute right-5 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#184979] border-t-transparent"></div>
              </div>
            )}
          </div>
        </div>
      </form>

      {/* Search Results Dropdown - Mobile Optimized */}
      {isOpen && (
        <div className="absolute top-full mt-2 md:mt-3 w-full bg-white rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 md:border-2 md:border-gray-100 max-h-[70vh] md:max-h-[500px] overflow-hidden z-[1000]">
          {/* Dropdown Header - Compact on Mobile */}
          <div className="bg-gradient-to-r from-[#184979] to-[#1e5a8f] px-3 py-2 md:px-5 md:py-3 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-xs md:text-sm flex items-center gap-1.5 md:gap-2">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <span className="hidden xs:inline">Search</span> Results
              </h3>
              <span className="text-white/80 text-[10px] md:text-xs bg-white/20 px-2 py-0.5 rounded-full">{results.length} found</span>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(70vh-100px)] md:max-h-[420px] scrollbar-thin scrollbar-track-gray-200 scrollbar-thumb-blue overscroll-contain">
            {isLoading ? (
              <div className="p-6 md:p-8 text-center">
                <div className="inline-flex items-center gap-2 md:gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-2 md:border-3 border-[#184979] border-t-transparent"></div>
                  <span className="text-gray-600 font-medium text-sm md:text-base">Searching...</span>
                </div>
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="p-1.5 md:p-2">
                  {results.map((product, index) => (
                    <button
                      key={product.id}
                      onClick={() => handleResultClick(product.slug)}
                      className="w-full flex items-center p-2.5 md:p-4 hover:bg-gradient-to-r hover:from-[#184979]/5 hover:to-[#f26322]/5 active:bg-[#184979]/10 rounded-lg md:rounded-xl transition-all duration-200 text-left group border border-transparent hover:border-[#184979]/20 mb-1.5 md:mb-2 touch-manipulation"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {/* Product Image - Smaller on Mobile */}
                      <div className="relative w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg md:rounded-xl flex-shrink-0 mr-2.5 md:mr-4 overflow-hidden group-hover:scale-105 transition-transform shadow-sm md:shadow-md">
                        {product.image ? (
                          <img 
                            src={product.image} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-5 h-5 md:w-8 md:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                        )}
                        {/* Shine Effect - Hidden on Mobile for Performance */}
                        <div className="hidden md:block absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
                      </div>
                      
                      {/* Product Info - Compact on Mobile */}
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-xs md:text-sm font-bold text-gray-900 line-clamp-2 md:truncate mb-0.5 md:mb-1 group-hover:text-[#184979] transition-colors leading-tight">
                          {product.title}
                        </p>
                        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                          <span className="inline-flex items-center px-1.5 md:px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold bg-[#f26322]/10 text-[#f26322] truncate max-w-[80px] md:max-w-none">
                            {product.category}
                          </span>
                        </div>
                      </div>
                      
                      {/* Price & Arrow - Mobile Optimized */}
                      <div className="flex items-center gap-1.5 md:gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm md:text-lg font-bold text-[#184979]">
                            ₹{product.price.toLocaleString()}
                          </p>
                          <p className="text-[9px] md:text-xs text-green-600 font-semibold hidden xs:block">In Stock</p>
                        </div>
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#184979]/10 flex items-center justify-center group-hover:bg-[#184979] transition-colors">
                          <svg className="w-3 h-3 md:w-4 md:h-4 text-[#184979] group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                {/* View All Button - Mobile Friendly */}
                <div className="border-t border-gray-100 md:border-t-2 p-3 md:p-4 bg-gradient-to-r from-gray-50 to-white sticky bottom-0">
                  <button
                    onClick={handleSearch}
                    className="w-full group relative bg-gradient-to-r from-[#184979] to-[#1e5a8f] hover:from-[#f26322] hover:to-[#ff7a45] active:scale-[0.98] text-white py-2.5 md:py-3 px-4 md:px-6 rounded-lg md:rounded-xl font-bold text-sm md:text-base transition-all duration-300 shadow-md md:shadow-lg hover:shadow-xl overflow-hidden touch-manipulation"
                  >
                    {/* Shine Effect - Hidden on Mobile */}
                    <span className="hidden md:block absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700"></span>
                    
                    <span className="relative flex items-center justify-center gap-1.5 md:gap-2">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="truncate">View all &quot;{searchQuery}&quot;</span>
                      <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 md:p-8 text-center">
                <div className="inline-flex flex-col items-center">
                  <div className="w-14 h-14 md:w-20 md:h-20 bg-gray-100 rounded-full flex items-center justify-center mb-3 md:mb-4">
                    <svg className="w-7 h-7 md:w-10 md:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-semibold mb-0.5 md:mb-1 text-sm md:text-base">No products found</p>
                  <p className="text-gray-400 text-xs md:text-sm">Try different keywords</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
