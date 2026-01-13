'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import SearchBar from './SearchBar';
import UserMenu from './UserMenu';
import MoreMenu from './MoreMenu';
import LocationDisplay from './LocationDisplay';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useLoader } from '@/components/ui/Loader';

interface Category {
  _id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  imageUrl?: string;
  status?: string;
  children?: Category[];
}

interface CategoryDisplay {
  id: string;
  name: string;
  href: string;
  icon: React.ReactElement;
  subcategories: {
    name: string;
    image: string;
    href: string;
  }[];
}

export default function Header() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();
  const { showLoader } = useLoader();
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const categoryNavRef = useRef<HTMLDivElement>(null);
  const [categoryNavBottom, setCategoryNavBottom] = useState(0);

  // Handle category navigation with loader
  const handleCategoryClick = (categoryName: string) => {
    showLoader(`Loading ${categoryName}...`);
  };

  // Fetch categories from API with caching
  useEffect(() => {
    async function fetchCategories() {
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        const response = await fetch(`${apiBaseUrl}/home`, {
          next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }

        const result = await response.json();
        // Get categories - prioritize featuredCategories, fallback to categories
        let apiCategories: Category[] = result.data.featuredCategories || result.data.categories || [];
        
        // Filter only parent categories (parentId is null or undefined)
        const parentCategories = apiCategories.filter(cat => !cat.parentId);

        // Transform API categories to display format (using children array for subcategories)
        const transformedCategories: CategoryDisplay[] = parentCategories.map((mainCat, index) => {
          // Get children/subcategories directly from the category object
          const subcats = mainCat.children || [];
          
          // Icon colors rotation
          const iconColors = ['text-blue-500', 'text-pink-500', 'text-green-500', 'text-purple-500', 'text-orange-500', 'text-red-500'];
          const iconColor = iconColors[index % iconColors.length];
          const hoverColor = iconColor.replace('500', '600');

          // Helper function to convert slug/name to search query
          const toSearchQuery = (text: string) => {
            return text.replace(/-/g, ' ');
          };

          return {
            id: mainCat._id,
            name: mainCat.name,
            href: `/products?search=${encodeURIComponent(toSearchQuery(mainCat.slug || mainCat.name))}`,
            icon: (
              <svg className={`w-5 h-5 ${iconColor} group-hover:${hoverColor}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
            ),
            subcategories: subcats.length > 0 
              ? subcats.map(sub => ({
                  name: sub.name,
                  image: sub.imageUrl || '',
                  href: `/products?search=${encodeURIComponent(toSearchQuery(sub.slug || sub.name))}`
                }))
              : [{
                  name: mainCat.name,
                  image: mainCat.imageUrl || '',
                  href: `/products?search=${encodeURIComponent(toSearchQuery(mainCat.slug || mainCat.name))}`
                }]
          };
        });

        setCategories(transformedCategories);
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  // Use API categories, show empty if still loading or no data
  const displayCategories = categories.length > 0 ? categories : [];
  
  return (
    <>
    <header className="relative bg-gradient-to-br from-[#184979] via-[#1e5a8f] to-[#0d2d4a] shadow-xl font-sans sticky top-0 z-50">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#f26322] rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      {/* Diagonal Lines Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)'
      }}></div>

      {/* Top Bar */}
      <div className="relative border-b border-white/10 backdrop-blur-sm">
        <nav className="container mx-auto px-3 sm:px-4 py-2 sm:py-4">
          {/* Mobile: Enhanced Layout */}
          <div className="lg:hidden">
            {/* Row 1: Logo, Search Icon Toggle, and Actions */}
            <div className="flex items-center gap-2">
              {/* Logo - Fixed Width */}
              <Link href="/" className="flex-shrink-0 min-w-[80px] transform hover:scale-105 transition-transform duration-200">
                <img src="/logo/auth-dark.svg" alt="Grabora Logo" className="h-8 w-auto drop-shadow-2xl" />
              </Link>

              {/* Mobile Search Bar - Inline Compact */}
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full px-3 py-2 pl-9 text-sm text-gray-800 bg-white/95 backdrop-blur-sm border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#f26322]/50 shadow-lg placeholder:text-gray-400 font-medium"
                    onClick={() => {
                      const searchInput = document.querySelector('.mobile-search-expanded') as HTMLElement;
                      if (searchInput) searchInput.focus();
                    }}
                    onFocus={(e) => {
                      e.target.blur();
                      const expandedSearch = document.getElementById('mobile-search-container');
                      if (expandedSearch) expandedSearch.classList.remove('hidden');
                    }}
                    readOnly
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Mobile Actions - Compact */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* User Menu */}
                <UserMenu />

                {/* Wishlist */}
                <Link href="/wishlist" className="relative p-2 text-white hover:text-[#f26322] transition-colors duration-200 hover:bg-white/10 rounded-full">
                  <svg className="w-5 h-5 filter drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className="absolute top-0 right-0 bg-gradient-to-br from-[#f26322] to-[#e05512] text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-lg">{wishlistCount}</span>
                  )}
                </Link>

                {/* Cart */}
                <Link href="/cart" className="relative p-2 text-white hover:text-[#f26322] transition-colors duration-200 hover:bg-white/10 rounded-full">
                  <svg className="w-5 h-5 filter drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 bg-gradient-to-br from-[#f26322] to-[#e05512] text-white text-[9px] rounded-full h-4 w-4 flex items-center justify-center font-bold shadow-lg ring-1 ring-white/30">{cartCount}</span>
                  )}
                </Link>
              </div>
            </div>

            {/* Expanded Mobile Search Overlay */}
            <div id="mobile-search-container" className="hidden fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm">
              <div className="bg-gradient-to-br from-[#184979] via-[#1e5a8f] to-[#0d2d4a] p-4 shadow-2xl">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      const container = document.getElementById('mobile-search-container');
                      if (container) container.classList.add('hidden');
                    }}
                    className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <SearchBar />
                  </div>
                </div>
              </div>
              <div 
                className="flex-1"
                onClick={() => {
                  const container = document.getElementById('mobile-search-container');
                  if (container) container.classList.add('hidden');
                }}
              ></div>
            </div>
          </div>

          {/* Desktop: Single row layout */}
          <div className="hidden lg:flex items-center justify-between gap-6">
            {/* Logo */}
            <Link href="/" className="text-2xl font-bold flex-shrink-0 transform hover:scale-105 transition-transform duration-200 relative">
              <img src="/logo/auth-dark.svg" alt="Grabora Logo" className="h-10 w-auto drop-shadow-2xl" />
            </Link>

            {/* Location Display */}
            <div className="relative">
              <LocationDisplay />
            </div>

            {/* Search Bar - Enhanced */}
            <div className="flex-1 max-w-3xl relative">
              <SearchBar />
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-6 flex-shrink-0 relative">
              {/* Become a Seller - Enhanced */}
              <Link 
                href="/seller/register" 
                className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105 border border-white/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Sell
              </Link>

              {/* User Menu Button Only */}
              <UserMenu />

              {/* Wishlist - Enhanced */}
              <Link 
                href="/wishlist" 
                className="relative text-white hover:text-[#f26322] flex flex-col items-center group transition-colors duration-200"
              >
                <div className="relative">
                  <svg className="w-7 h-7 filter drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  {wishlistCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-br from-[#f26322] via-[#ff6b3d] to-[#e05512] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-xl animate-in zoom-in duration-200">
                      {wishlistCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium mt-1 hidden lg:block drop-shadow-md">Wishlist</span>
              </Link>

              {/* Cart - Enhanced */}
              <Link 
                href="/cart" 
                className="relative text-white hover:text-[#f26322] flex flex-col items-center group transition-colors duration-200"
              >
                <div className="relative">
                  <svg className="w-7 h-7 filter drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gradient-to-br from-[#f26322] via-[#ff6b3d] to-[#e05512] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-xl ring-2 ring-white/30 ring-offset-1 ring-offset-[#184979] animate-in zoom-in duration-200">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium mt-1 hidden lg:block drop-shadow-md">Cart</span>
              </Link>

              {/* More Menu with Three Dots */}
              <MoreMenu />
            </div>
          </div>
        </nav>
      </div>

      {/* Bottom Navigation Bar - Categories with Images */}
    </header>
      <div ref={categoryNavRef} className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-md relative">
        <nav className="container mx-auto px-2 sm:px-4 py-1 sm:py-1.5">
          <div className="flex items-center justify-between gap-1 sm:gap-2">
            {/* Categories with Images */}
            <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide flex-1">
              {displayCategories.map((category, index) => (
                <div
                  key={category.id || `category-${index}`}
                  className="relative group"
                  onMouseEnter={() => setHoveredCategory(category.id)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={(e) => {
                    // On mobile, toggle the submenu instead of navigating
                    if (window.innerWidth < 1024) {
                      e.preventDefault();
                      setHoveredCategory(hoveredCategory === category.id ? null : category.id);
                    }
                  }}
                >
                  <div 
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gradient-to-br hover:from-blue-50 hover:to-orange-50 transition-all duration-300 group cursor-pointer lg:cursor-default"
                  >
                    {/* Category Image */}
                    <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-all duration-300 ring-1 ring-gray-200 group-hover:ring-[#184979] flex-shrink-0">
                      {category.subcategories[0]?.image ? (
                        <Image
                          src={category.subcategories[0].image}
                          alt={category.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          sizes="(max-width: 640px) 32px, 40px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#184979] to-[#0d2d4a] text-white text-sm font-bold">
                          {category.name.charAt(0)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent group-hover:from-[#184979]/30 transition-colors duration-300"></div>
                    </div>
                    
                    {/* Category Name - Hidden on very small screens */}
                    <span className="hidden sm:inline text-xs font-bold text-gray-700 group-hover:text-[#184979] transition-colors duration-200 whitespace-nowrap">
                      {category.name}
                    </span>

                    {/* Dropdown Arrow - Shows on all screens */}
                    <svg className={`w-3 h-3 text-gray-400 group-hover:text-[#184979] transition-all duration-200 flex-shrink-0 ${hoveredCategory === category.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* Submenu Portals - Rendered outside header */}
      {displayCategories
        .filter((category) => hoveredCategory === category.id && categoryNavRef.current)
        .map((category) => (
          <div
            key={`submenu-${category.id || category.name}`}
            className="fixed left-0 right-0 bg-gradient-to-br from-[#0a1929] via-[#184979] to-[#0d2d4a] backdrop-blur-xl shadow-2xl border-t-2 sm:border-t-4 border-[#f26322] z-[9999] animate-in fade-in slide-in-from-top-2 duration-200 max-h-[70vh] sm:max-h-none overflow-y-auto"
            style={{ top: `${categoryNavRef.current?.getBoundingClientRect().bottom}px` }}
            onMouseEnter={() => setHoveredCategory(category.id)}
            onMouseLeave={() => setHoveredCategory(null)}
          >
            {/* Vibrant Multi-Layer Background Effects - Hidden on mobile */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
              {/* Mega Animated Orbs */}
              <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-gradient-radial from-[#f26322]/40 via-[#ff7a45]/20 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
              <div className="absolute -bottom-32 -left-32 w-[700px] h-[700px] bg-gradient-radial from-[#ff7a45]/30 via-white/15 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-[#f26322]/25 via-[#ff7a45]/10 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }}></div>
              <div className="absolute top-0 left-[25%] w-[450px] h-[450px] bg-gradient-radial from-white/20 via-yellow-100/10 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}></div>
              
              {/* Radial Burst Effect */}
              <div className="absolute inset-0 opacity-30" style={{
                background: 'radial-gradient(circle at 50% 0%, rgba(242, 99, 34, 0.3) 0%, transparent 50%)'
              }}></div>
            </div>
            
            {/* Diagonal Stripes Pattern - Hidden on mobile */}
            <div className="absolute inset-0 opacity-10 pointer-events-none hidden sm:block" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255, 255, 255, 0.15) 40px, rgba(255, 255, 255, 0.15) 80px)',
            }}></div>
            
            {/* Animated Floating Shapes - Hidden on mobile */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 hidden sm:block">
              <div className="absolute top-12 left-[8%] w-16 h-16 border-4 border-[#f26322] rounded-lg rotate-45 animate-pulse" style={{ animationDuration: '3s' }}></div>
              <div className="absolute top-16 right-[12%] w-20 h-20 border-4 border-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
              <div className="absolute bottom-16 left-[15%] w-14 h-14 border-4 border-white rounded-lg rotate-12 animate-pulse" style={{ animationDelay: '2s', animationDuration: '3.5s' }}></div>
              <div className="absolute bottom-12 right-[20%] w-18 h-18 border-4 border-[#ff7a45] rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}></div>
            </div>
            
            {/* Sparkles & Emojis - Hidden on mobile */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
              <div className="absolute top-6 left-[12%] text-yellow-300 text-3xl animate-pulse opacity-60" style={{ animationDelay: '0s', animationDuration: '2s' }}>✨</div>
              <div className="absolute top-10 right-[18%] text-yellow-300 text-4xl animate-pulse opacity-70" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>⭐</div>
              <div className="absolute top-8 left-[35%] text-orange-400 text-2xl animate-pulse opacity-50" style={{ animationDelay: '0.8s', animationDuration: '2.3s' }}>💫</div>
              <div className="absolute bottom-10 left-[25%] text-yellow-300 text-3xl animate-pulse opacity-60" style={{ animationDelay: '1s', animationDuration: '2.2s' }}>✨</div>
              <div className="absolute bottom-8 right-[30%] text-yellow-400 text-3xl animate-pulse opacity-65" style={{ animationDelay: '1.2s', animationDuration: '2.4s' }}>⚡</div>
              <div className="absolute top-1/2 right-[8%] text-yellow-300 text-2xl animate-pulse opacity-55" style={{ animationDelay: '0.3s', animationDuration: '2.6s' }}>🌟</div>
            </div>
            
            {/* Glowing Rings - Hidden on mobile */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
              <div className="absolute top-8 left-[20%] w-32 h-32 border-[6px] border-[#f26322]/30 rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
              <div className="absolute bottom-12 right-[25%] w-40 h-40 border-[6px] border-white/20 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
            </div>

            <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-5 relative z-10">
              {/* Submenu Header */}
              <div className="mb-2 sm:mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative group/icon">
                    {/* Glow Effect - Hidden on mobile */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-lg sm:rounded-xl filter blur-md opacity-0 group-hover/icon:opacity-70 transition-opacity animate-pulse hidden sm:block"></div>
                    <div className="relative w-8 h-8 sm:w-11 sm:h-11 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg sm:shadow-xl">
                      <span className="text-base sm:text-xl text-white">{category.icon}</span>
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-white rounded-full animate-pulse shadow-lg hidden sm:block"></div>
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-lg font-bold bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent drop-shadow-lg">
                      {category.name}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-white/70 flex items-center gap-1">
                      <span className="text-xs sm:text-sm">🎯</span> Explore
                    </p>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-full">
                  <svg className="w-3.5 h-3.5 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs font-semibold text-white">Featured</span>
                </div>
              </div>

              {/* Subcategories Grid with Enhanced Cards */}
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5 sm:gap-3">
                {category.subcategories.map((sub, index) => (
                  <Link
                    key={`${category.id}-${sub.name}-${index}`}
                    href={sub.href}
                    onClick={() => handleCategoryClick(sub.name)}
                    className="group relative bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-md sm:rounded-xl p-1.5 sm:p-3 hover:shadow-2xl transition-all duration-300 sm:hover:-translate-y-2 border border-white/40 sm:border-2 hover:border-[#f26322] overflow-hidden touch-manipulation"
                  >
                    {/* Animated Gradient Glow - Hidden on mobile */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#184979]/0 via-[#f26322]/0 to-[#ff7a45]/0 group-hover:from-[#184979]/10 group-hover:via-[#f26322]/10 group-hover:to-[#ff7a45]/10 transition-all duration-300 hidden sm:block"></div>
                    
                    {/* Shine Effect - Hidden on mobile */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 hidden sm:block"></div>
                    
                    {/* Corner Accents - Hidden on mobile */}
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#f26322] rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#184979] rounded-bl-xl opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"></div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-1 sm:gap-2">
                      {/* Image Container with Enhanced Effects */}
                      <div className="relative w-10 h-10 sm:w-20 sm:h-20 rounded-md sm:rounded-lg overflow-hidden shadow-sm sm:shadow-md group-hover:shadow-xl transition-all duration-300">
                        {/* Rotating Border Animation - Hidden on mobile */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#f26322] via-[#ff7a45] to-[#f26322] rounded-lg animate-spin opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block" style={{ animationDuration: '3s' }}></div>
                        <div className="absolute inset-0 sm:inset-[2px] rounded-md sm:rounded-lg overflow-hidden bg-white">
                          {sub.image ? (
                            <Image
                              src={sub.image}
                              alt={sub.name}
                              fill
                              className="object-cover sm:group-hover:scale-110 transition-transform duration-300"
                              sizes="(max-width: 640px) 40px, 80px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f26322] to-[#ff7a45] text-white text-xs sm:text-lg font-bold">
                              {sub.name.charAt(0)}
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#184979]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:block"></div>
                        </div>
                        
                        {/* Glowing Orbs - Hidden on mobile */}
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#f26322] rounded-full filter blur-sm opacity-0 group-hover:opacity-70 animate-pulse hidden sm:block"></div>
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-[#184979] rounded-full filter blur-sm opacity-0 group-hover:opacity-70 animate-pulse hidden sm:block" style={{ animationDelay: '0.5s' }}></div>
                        
                        {/* Trending Badge - Hidden on mobile */}
                        <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white text-[8px] sm:text-[9px] font-bold px-1 sm:px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg transform group-hover:scale-110 items-center gap-0.5 hidden sm:flex">
                          <span className="animate-pulse">🔥</span>
                          <span>HOT</span>
                        </div>
                      </div>
                      
                      {/* Text Content with Gradient */}
                      <div className="text-center">
                        <h4 className="text-[8px] sm:text-xs font-bold text-gray-800 sm:group-hover:text-transparent sm:group-hover:bg-gradient-to-r sm:group-hover:from-[#184979] sm:group-hover:to-[#f26322] sm:group-hover:bg-clip-text transition-all duration-200 leading-tight line-clamp-2">
                          {sub.name}
                        </h4>
                        {/* View button - Hidden on mobile */}
                        <div className="hidden sm:flex items-center justify-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <span className="text-[9px] text-[#f26322] font-semibold">View</span>
                          <svg className="w-2.5 h-2.5 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Floating Particles - Hidden on mobile */}
                    <div className="absolute top-2 left-2 w-1 h-1 bg-[#f26322] rounded-full opacity-0 group-hover:opacity-100 animate-ping hidden sm:block"></div>
                    <div className="absolute bottom-2 right-2 w-1 h-1 bg-[#184979] rounded-full opacity-0 group-hover:opacity-100 animate-ping hidden sm:block" style={{ animationDelay: '0.3s' }}></div>
                  </Link>
                ))}
              </div>

              {/* Enhanced Footer Section */}
              <div className="mt-2 sm:mt-4 pt-2 sm:pt-3 border-t border-white/20 flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-1 sm:gap-2 text-[8px] sm:text-xs text-white/90 bg-white/10 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/20">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#f26322] flex-shrink-0 animate-pulse hidden sm:block" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold"><span className="hidden sm:inline">🎁 </span>Free Shipping ₹499+</span>
                </div>
                <Link 
                  href={category.href}
                  onClick={() => handleCategoryClick(category.name)}
                  className="group relative inline-flex items-center gap-1 sm:gap-2 overflow-hidden bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-white hover:to-white text-white hover:text-[#184979] px-2.5 sm:px-5 py-1 sm:py-2 rounded-full font-semibold text-[10px] sm:text-sm transition-all duration-300 shadow-lg hover:shadow-2xl transform sm:hover:scale-105 touch-manipulation border border-white/20 sm:border-2"
                >
                  {/* Shine Effect - Hidden on mobile */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 hidden sm:block"></div>
                  
                  {/* Corner Accents - Hidden on mobile */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-white rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-white group-hover:border-[#184979] rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block"></div>
                  
                  <span className="relative z-10">View All</span>
                  <svg className="relative z-10 w-2.5 h-2.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  
                  {/* Floating Particles - Hidden on mobile */}
                  <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-ping hidden sm:block"></div>
                  <div className="absolute bottom-1 left-1 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-ping hidden sm:block" style={{ animationDelay: '0.2s' }}></div>
                </Link>
              </div>
            </div>
          </div>
        ))}
    </>
  );
}
