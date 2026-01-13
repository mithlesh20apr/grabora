'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/home/ProductCard';
import Link from 'next/link';
import { useLoader } from '@/components/ui/Loader';

// Loading component for Suspense fallback
function ProductsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#ff3f6c] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading products...</p>
      </div>
    </div>
  );
}

// Main page component wrapper with Suspense
export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent />
    </Suspense>
  );
}

// Variant interface for product variants
interface ProductVariant {
  _id?: string;
  sku: string;
  attributes: {
    color?: string;
    size?: string;
    storage?: string;
    ram?: string;
    [key: string]: string | undefined;
  };
  images?: string[];
  price: number;
  salePrice?: number;
  mrp?: number;
  additionalPrice?: number;
  stock: number;
  active: boolean;
}

interface Product {
  _id: string;
  title: string;
  slug: string;
  sku?: string;
  shortDescription: string;
  description: string;
  brand: string;
  categoryId: string | { _id: string; name: string; slug: string; imageUrl?: string };
  tags: string[];
  price: number;
  salePrice?: number;
  mrp?: number;
  images: string[];
  variants: ProductVariant[];
  ratingAvg: number;
  ratingCount: number;
  attributes?: Record<string, string>;
  status: string;
  flashSale: boolean;
  isFeatured: boolean;
  discount?: number;
  totalOrders: number;
  inStock?: boolean;
  availableStock?: number;
  createdAt: string;
  updatedAt: string;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const { hideLoader } = useLoader();
  const searchQuery = searchParams?.get('search') || '';
  const categoryParam = searchParams?.get('category') || '';
  
  const [currentPage, setCurrentPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 12;

  // Filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    categoryParam ? [categoryParam] : []
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch products from API
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        
        let response: Response;
        
        // If search query exists, use the search API
        if (searchQuery) {
          const searchParams = new URLSearchParams();
          searchParams.append('q', searchQuery);
          searchParams.append('limit', (itemsPerPage * currentPage).toString()); // Get enough results for pagination
          
          response = await fetch(`${apiBaseUrl}/search?${searchParams.toString()}`, {
            cache: 'no-store',
          });

          if (!response.ok) {
            throw new Error('Failed to search products');
          }

          const searchResult = await response.json();
          const searchHits = searchResult.data?.hits || [];
          
          // Transform search results to product format
          const transformedProducts: Product[] = searchHits.map((hit: { 
            id?: string; 
            _id?: string; 
            title?: string; 
            slug?: string;
            shortDescription?: string; 
            description?: string; 
            brand?: string; 
            categoryId?: string | { _id: string; name: string; slug: string }; 
            tags?: string[]; 
            price?: number; 
            salePrice?: number; 
            mrp?: number;
            images?: string[]; 
            variants?: ProductVariant[]; 
            ratingAvg?: number; 
            ratingCount?: number; 
            attributes?: Record<string, string>;
            status?: string; 
            flashSale?: boolean; 
            isFeatured?: boolean; 
            discount?: number; 
            totalOrders?: number; 
            inStock?: boolean;
            availableStock?: number;
            createdAt?: string; 
            updatedAt?: string 
          }) => ({
            _id: hit.id || hit._id || '',
            title: hit.title || '',
            slug: hit.slug || (hit.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            shortDescription: hit.shortDescription || '',
            description: hit.description || '',
            brand: hit.brand || '',
            categoryId: hit.categoryId || '',
            tags: hit.tags || [],
            price: hit.price || 0,
            salePrice: hit.salePrice || hit.price || 0,
            mrp: hit.mrp || hit.price || 0,
            images: hit.images || [],
            variants: hit.variants || [],
            ratingAvg: hit.ratingAvg || 0,
            ratingCount: hit.ratingCount || 0,
            attributes: hit.attributes || {},
            status: hit.status || 'active',
            flashSale: hit.flashSale || false,
            isFeatured: hit.isFeatured || false,
            discount: hit.discount || 0,
            totalOrders: hit.totalOrders || 0,
            inStock: hit.inStock ?? true,
            availableStock: hit.availableStock || 0,
            createdAt: hit.createdAt || '',
            updatedAt: hit.updatedAt || '',
          }));
          
          // Apply client-side pagination for search results
          const startIndex = (currentPage - 1) * itemsPerPage;
          const paginatedResults = transformedProducts.slice(startIndex, startIndex + itemsPerPage);
          
          setAllProducts(paginatedResults);
          setTotalProducts(transformedProducts.length);
          setTotalPages(Math.ceil(transformedProducts.length / itemsPerPage));
        } else {
          // Use products API for non-search requests
          const params = new URLSearchParams();
          params.append('page', currentPage.toString());
          params.append('limit', itemsPerPage.toString());
          
          if (selectedCategories.length > 0) {
            params.append('categories', selectedCategories.join(','));
          }
          if (selectedBrands.length > 0) {
            params.append('brands', selectedBrands.join(','));
          }
          if (priceRange[1] < 10000) {
            params.append('maxPrice', priceRange[1].toString());
          }
          if (minRating > 0) {
            params.append('minRating', minRating.toString());
          }
          if (sortBy !== 'featured') {
            params.append('sortBy', sortBy);
          }

          response = await fetch(`${apiBaseUrl}/products?${params.toString()}`, {
            cache: 'no-store',
          });

          if (!response.ok) {
            throw new Error('Failed to fetch products');
          }

          const result = await response.json();
          // Handle both old and new API response formats
          const productsData = result.data?.products || result.data || [];
          setAllProducts(productsData);
          setTotalProducts(result.data?.total || result.meta?.total || productsData.length);
          setTotalPages(result.data?.totalPages || result.meta?.totalPages || 1);
        }
        
        setLoading(false);
        hideLoader(); // Hide global loader when data is fetched
      } catch (error) {
        setAllProducts([]);
        setLoading(false);
        hideLoader(); // Hide global loader on error too
      }
    }

    fetchProducts();
  }, [currentPage, searchQuery, selectedCategories, selectedBrands, priceRange, minRating, sortBy]);

  // Scroll to top button visibility
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get unique categories and brands
  const categories = useMemo(() => {
    const cats = new Set(allProducts.map(p => p.tags || []).flat().filter(Boolean));
    return Array.from(cats) as string[];
  }, [allProducts]);

  const brands = useMemo(() => {
    const brds = new Set(allProducts.map(p => p.brand).filter(Boolean));
    return Array.from(brds) as string[];
  }, [allProducts]);

  // Products are already filtered by API
  const filteredProducts = allProducts;
  const paginatedProducts = allProducts;

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Toggle brand selection
  const toggleBrand = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand)
        ? prev.filter(b => b !== brand)
        : [...prev, brand]
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setPriceRange([0, 10000]);
    setMinRating(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Enhanced Breadcrumb & Hero Section */}
      <div className="relative bg-gradient-to-r from-[#184979] via-[#1a5a8a] to-[#184979] text-white overflow-hidden">
        {/* Decorative Background Elements - Hidden on mobile */}
        <div className="absolute inset-0 opacity-10 hidden md:block">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#f26322] rounded-full filter blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 relative z-10">
          <nav className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm mb-2 md:mb-4">
            <Link href="/" className="text-white/80 hover:text-white transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="hidden sm:inline">Home</span>
            </Link>
            <span className="text-white/50">/</span>
            <span className="text-white font-semibold">Products</span>
          </nav>
          
          <div className="flex flex-row items-center justify-between gap-2 md:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-2xl md:text-4xl lg:text-5xl font-black mb-0.5 md:mb-2 tracking-tight truncate">
                {searchQuery ? `Search: "${searchQuery}"` : 
                 categoryParam ? `${categoryParam} Products` : 
                 'Discover Products'}
              </h1>
              <p className="text-white/90 text-[10px] sm:text-sm md:text-lg line-clamp-1">
                {searchQuery ? `Results for "${searchQuery}"` :
                 categoryParam ? `Browse ${categoryParam.toLowerCase()} collection` :
                 'Find perfect items from our collection'}
              </p>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4 bg-white/10 backdrop-blur-sm px-2 md:px-6 py-1.5 md:py-4 rounded-lg md:rounded-2xl border border-white/20 flex-shrink-0">
              <div className="text-center">
                <div className="text-sm md:text-3xl font-black text-white">{totalProducts}</div>
                <div className="text-[8px] md:text-sm text-white/80">Products</div>
              </div>
              <div className="w-px h-6 md:h-12 bg-white/30"></div>
              <div className="text-center">
                <div className="text-sm md:text-3xl font-black text-[#f26322]">{categories.length}</div>
                <div className="text-[8px] md:text-sm text-white/80">Categories</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 pb-24 md:pb-8">
        {/* Mobile Filter & Sort Row - Combined for mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-4">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#184979] to-[#0d2d4a] hover:from-[#0d2d4a] hover:to-[#184979] text-white px-3 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-98 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm">Filters</span>
            {(selectedCategories.length + selectedBrands.length) > 0 && 
              <span className="bg-[#f26322] px-1.5 py-0.5 rounded-full text-[10px] font-black">
                {selectedCategories.length + selectedBrands.length}
              </span>
            }
          </button>
          
          {/* Mobile Product Count & Sort */}
          <div className="flex-1 flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-[#184979]">{filteredProducts.length}</span>
              <span className="text-xs text-gray-500">items</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border-0 rounded-lg px-2 py-1 text-xs font-medium focus:ring-0 outline-none bg-gray-50 text-gray-700 cursor-pointer"
            >
              <option value="featured">✨ Featured</option>
              <option value="newest">🆕 Newest</option>
              <option value="price-low">💰 Low-High</option>
              <option value="price-high">💎 High-Low</option>
              <option value="rating">⭐ Top Rated</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-8">

          {/* Enhanced Filters Sidebar */}
          <aside className={`lg:w-72 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white rounded-2xl shadow-md p-5 sticky top-24 border border-gray-200">
              {/* Filter Header */}
              <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#184979] to-[#0d2d4a] rounded-lg flex items-center justify-center shadow-sm">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-[#184979]">Filters</h2>
                </div>
                {(selectedCategories.length + selectedBrands.length + (minRating > 0 ? 1 : 0)) > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[#f26322] hover:text-[#d14e15] font-bold flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear All
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="mb-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
                  <div className="w-7 h-7 bg-[#184979]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </div>
                  Categories
                </h3>
                <div className="space-y-2">
                  {categories.map(category => (
                    <label key={category} className="flex items-center gap-2.5 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-all">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                        className="w-4 h-4 text-[#184979] border border-gray-300 rounded focus:ring-1 focus:ring-[#184979]"
                      />
                      <span className="text-gray-700 text-sm font-medium group-hover:text-[#184979] transition-colors flex-1">
                        {category}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-xs font-medium rounded-full text-gray-500">
                        {allProducts.filter(p => p.tags?.includes(category)).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Brand Filter */}
              <div className="mb-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
                  <div className="w-7 h-7 bg-[#f26322]/10 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  Brands
                </h3>
                <div className="space-y-2">
                  {brands.map(brand => (
                    <label key={brand} className="flex items-center gap-2.5 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-all">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(brand)}
                        onChange={() => toggleBrand(brand)}
                        className="w-4 h-4 text-[#f26322] border border-gray-300 rounded focus:ring-1 focus:ring-[#f26322]"
                      />
                      <span className="text-gray-700 text-sm font-medium group-hover:text-[#f26322] transition-colors flex-1">
                        {brand}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 text-xs font-medium rounded-full text-gray-500">
                        {allProducts.filter(p => p.brand === brand).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
                  <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  Price Range
                </h3>
                <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#184979]"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">₹0</span>
                    <span className="font-semibold text-[#184979]">
                      ₹{priceRange[1].toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>tags.includes(category)

              {/* Rating Filter */}
              <div className="mb-5">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-base">
                  <div className="w-7 h-7 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  Minimum Rating
                </h3>
                <div className="space-y-2">
                  {[4, 3, 2, 1].map(rating => (
                    <label key={rating} className="flex items-center gap-2.5 cursor-pointer group p-2 rounded-lg hover:bg-gray-50 transition-all">
                      <input
                        type="radio"
                        name="rating"
                        checked={minRating === rating}
                        onChange={() => setMinRating(rating)}
                        className="w-4 h-4 text-yellow-500 border border-gray-300 focus:ring-1 focus:ring-yellow-400"
                      />
                      <div className="flex items-center gap-1">
                        {Array.from({ length: rating }).map((_, i) => (
                          <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="text-gray-700 text-sm font-medium group-hover:text-yellow-600 ml-1">& up</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Active Filters Summary */}
              {(selectedCategories.length + selectedBrands.length) > 0 && (
                <div className="mt-5 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold text-sm text-[#184979]">Active Filters</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCategories.map(cat => (
                      <span key={cat} className="px-2.5 py-1 bg-white rounded-full text-xs font-medium text-[#184979] border border-[#184979]/20">
                        {cat}
                      </span>
                    ))}
                    {selectedBrands.map(brand => (
                      <span key={brand} className="px-2.5 py-1 bg-white rounded-full text-xs font-medium text-[#f26322] border border-[#f26322]/20">
                        {brand}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            {/* Enhanced Sort and Results Section - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block bg-white rounded-xl shadow-md p-5 mb-6 border border-gray-200">
              <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#184979] to-[#0d2d4a] rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#184979]">{filteredProducts.length}</div>
                    <div className="text-sm text-gray-600">
                      Products {(selectedCategories.length + selectedBrands.length) > 0 && (
                        <span className="text-[#f26322] font-semibold">(Filtered)</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <svg className="w-5 h-5 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium focus:ring-1 focus:ring-[#184979] focus:border-[#184979] outline-none bg-white hover:border-[#184979] transition-colors cursor-pointer"
                  >
                    <option value="featured">✨ Featured</option>
                    <option value="newest">🆕 Newest</option>
                    <option value="price-low">💰 Low-High</option>
                    <option value="price-high">💎 High-Low</option>
                    <option value="rating">⭐ Top Rated</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <>
                {/* Loading State */}
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {[...Array(8)].map((_, index) => (
                      <div key={index} className="bg-white rounded-xl md:rounded-2xl p-2 md:p-4 animate-pulse">
                        <div className="aspect-square bg-gray-200 rounded-lg md:rounded-xl mb-2 md:mb-4"></div>
                        <div className="h-3 md:h-4 bg-gray-200 rounded mb-1 md:mb-2"></div>
                        <div className="h-3 md:h-4 bg-gray-200 rounded w-3/4 mb-2 md:mb-4"></div>
                        <div className="flex justify-between items-center">
                          <div className="h-4 md:h-6 bg-gray-200 rounded w-16 md:w-20"></div>
                          <div className="h-6 md:h-8 bg-gray-200 rounded w-16 md:w-24"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
                    {paginatedProducts.map(product => (
                      <ProductCard key={product._id} product={product} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                  <div className="mt-6 md:mt-12 flex flex-col items-center gap-3 md:gap-6">
                    {/* Page Info */}
                    <div className="text-xs md:text-sm text-gray-600 text-center">
                      Showing <span className="font-semibold text-[#184979]">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                      <span className="font-semibold text-[#184979]">{Math.min(currentPage * itemsPerPage, totalProducts)}</span> of{' '}
                      <span className="font-semibold text-[#184979]">{totalProducts}</span> products
                    </div>

                    {/* Pagination Buttons */}
                    <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto max-w-full pb-2">
                      {/* Previous Button */}
                      <button
                        onClick={() => {
                          setCurrentPage(prev => prev - 1);
                          scrollToTop();
                        }}
                        disabled={currentPage === 1}
                        className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-gray-300 text-gray-700 text-sm md:text-base font-medium hover:bg-[#184979] hover:text-white hover:border-[#184979] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 transition-all flex-shrink-0"
                      >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">‹</span>
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1 md:gap-2">
                        {[...Array(totalPages)].map((_, index) => {
                          const page = index + 1;
                          // Show first, last, current, and adjacent pages
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => {
                                  setCurrentPage(page);
                                  scrollToTop();
                                }}
                                className={`w-8 h-8 md:w-10 md:h-10 rounded-lg text-sm md:text-base font-semibold transition-all flex-shrink-0 ${
                                  currentPage === page
                                    ? 'bg-gradient-to-r from-[#184979] to-[#0d2d4a] text-white shadow-lg'
                                    : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="text-gray-400 px-1">...</span>;
                          }
                          return null;
                        })}
                      </div>

                      {/* Next Button */}
                      <button
                        onClick={() => {
                          setCurrentPage(prev => prev + 1);
                          scrollToTop();
                        }}
                        disabled={currentPage === totalPages}
                        className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-gray-300 text-gray-700 text-sm md:text-base font-medium hover:bg-[#184979] hover:text-white hover:border-[#184979] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-700 transition-all flex-shrink-0"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">›</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-md p-6 md:p-12 text-center border border-gray-200">
                <div className="relative inline-block mb-4 md:mb-6">
                  <div className="absolute inset-0 bg-[#184979]/10 rounded-full filter blur-2xl"></div>
                  <svg className="w-20 h-20 md:w-32 md:h-32 text-gray-300 relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl md:text-3xl font-black text-gray-800 mb-2 md:mb-3">No Products Found</h3>
                <p className="text-gray-600 mb-4 md:mb-8 text-sm md:text-lg">Try adjusting your filters</p>
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#184979] to-[#0d2d4a] hover:from-[#f26322] hover:to-[#d14e15] text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold text-sm md:text-base shadow-md hover:shadow-lg transition-all active:scale-98"
                >
                  <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Clear Filters
                </button>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-40 w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white rounded-full shadow-xl hover:shadow-2xl transition-all transform hover:scale-110 flex items-center justify-center group"
          aria-label="Scroll to top"
        >
          <svg
            className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-y-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
