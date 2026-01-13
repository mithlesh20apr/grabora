'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLoader } from '@/components/ui/Loader';

interface Category {
  _id: string;
  name: string;
  slug: string;
  imageUrl: string;
}

interface FeaturedCategoriesProps {
  categories: Category[];
}

export default function FeaturedCategories({ categories }: FeaturedCategoriesProps) {
  const { showLoader } = useLoader();

  // Handle category click with loader
  const handleCategoryClick = (categoryName: string) => {
    showLoader(`Loading ${categoryName}...`);
  };

  // Return null if no categories
  if (!categories || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-6 md:py-16 relative">
      {/* Vibrant Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#184979] via-[#1e5a8f] to-[#0d2d4a] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#f26322]/30 via-transparent to-[#184979]/40"></div>
      </div>

      {/* Animated Mega Orbs - Hidden on mobile */}
      <div className="absolute inset-0 hidden md:block overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-radial from-[#f26322]/30 via-[#ff7a45]/15 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-gradient-radial from-[#184979]/40 via-[#1e5a8f]/20 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-gradient-radial from-white/10 via-[#f26322]/5 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }}></div>
      </div>

      {/* Floating Shapes - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden opacity-20 hidden md:block">
        <div className="absolute top-20 left-[10%] w-16 h-16 border-4 border-[#f26322] rounded-lg rotate-45 animate-pulse" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-40 right-[15%] w-20 h-20 border-4 border-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-32 left-[20%] w-12 h-12 border-4 border-white rounded-lg rotate-12 animate-pulse" style={{ animationDelay: '2s', animationDuration: '3.5s' }}></div>
        <div className="absolute bottom-20 right-[25%] w-24 h-24 border-4 border-[#f26322] rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}></div>
      </div>

      {/* Diagonal Stripes - Hidden on mobile */}
      <div className="absolute inset-0 opacity-5 hidden md:block" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255, 255, 255, 0.1) 40px, rgba(255, 255, 255, 0.1) 80px)',
      }}></div>

      {/* Sparkle Elements - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden hidden md:block">
        <div className="absolute top-16 left-[8%] text-yellow-300 text-3xl animate-pulse opacity-60" style={{ animationDelay: '0s', animationDuration: '2s' }}>✨</div>
        <div className="absolute top-24 right-[12%] text-yellow-300 text-4xl animate-pulse opacity-70" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>⭐</div>
        <div className="absolute bottom-32 left-[18%] text-yellow-300 text-3xl animate-pulse opacity-60" style={{ animationDelay: '1s', animationDuration: '2.2s' }}>✨</div>
        <div className="absolute bottom-24 right-[22%] text-yellow-300 text-4xl animate-pulse opacity-70" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }}>⭐</div>
      </div>
      
      <div className="container mx-auto px-3 md:px-4 relative z-10">
        <div className="text-center mb-4 md:mb-12">
          {/* Badge */}
          <div className="inline-block bg-gradient-to-r from-[#f26322] to-[#ff7a45] px-4 py-1.5 md:px-8 md:py-3 rounded-full mb-2 md:mb-4 shadow-2xl transform hover:scale-105 transition-transform">
            <span className="text-white font-bold text-xs md:text-sm uppercase tracking-wider flex items-center gap-1 md:gap-2">
              <span className="text-sm md:text-xl">🌟</span>
              Shop by Category
              <span className="text-sm md:text-xl">🌟</span>
            </span>
          </div>
          
          {/* Title */}
          <h2 className="text-xl md:text-5xl font-black text-white mb-2 md:mb-4 leading-tight drop-shadow-2xl">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-yellow-100 to-white">
              Featured Categories
            </span>
          </h2>
          
          {/* Decorative Line - Hidden on mobile */}
          <div className="hidden md:flex items-center justify-center gap-3 mb-4">
            <span className="h-1.5 w-20 bg-gradient-to-r from-transparent via-[#f26322] to-[#f26322] rounded-full"></span>
            <span className="h-2 w-2 bg-[#f26322] rounded-full animate-pulse"></span>
            <span className="h-1.5 w-32 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full"></span>
            <span className="h-2 w-2 bg-[#ff7a45] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></span>
            <span className="h-1.5 w-20 bg-gradient-to-r from-[#ff7a45] to-transparent rounded-full"></span>
          </div>
          
          {/* Subtitle - Hidden on mobile */}
          <p className="hidden md:block text-white/90 text-lg md:text-xl font-medium max-w-2xl mx-auto drop-shadow-lg">
            Explore our handpicked collections curated just for you
          </p>
        </div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-6 overflow-x-auto pb-2 md:pb-0 pt-3 md:pt-0 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent -mx-3 px-3 md:mx-0 md:px-0">
          {categories.map((category, index) => {
            const colors = [
              { bg: 'from-orange-500/20 to-red-500/20', ring: 'ring-orange-400', shadow: 'shadow-orange-500/50' },
              { bg: 'from-purple-500/20 to-indigo-500/20', ring: 'ring-purple-400', shadow: 'shadow-purple-500/50' },
              { bg: 'from-pink-500/20 to-rose-500/20', ring: 'ring-pink-400', shadow: 'shadow-pink-500/50' },
              { bg: 'from-blue-500/20 to-cyan-500/20', ring: 'ring-blue-400', shadow: 'shadow-blue-500/50' },
              { bg: 'from-green-500/20 to-emerald-500/20', ring: 'ring-green-400', shadow: 'shadow-green-500/50' },
              { bg: 'from-yellow-500/20 to-amber-500/20', ring: 'ring-yellow-400', shadow: 'shadow-yellow-500/50' },
            ];

            const colorScheme = colors[index % colors.length];
            
            // Map category slugs to appropriate search/category links
            const getCategoryLink = (slug: string | undefined) => {
              if (!slug) return '/products';
              const categoryMap: { [key: string]: string } = {
                'electronics-mall': '/products?category=Electronics',
                'bags-mall': '/products?search=Bags',
                'fashion-mall': '/products?category=Fashion',
                'home-decor': '/products?category=Home',
                'beauty-care': '/products?category=Beauty',
                'sports-fitness': '/products?category=Sports',
                'books': '/products?category=Books'
              };
              return categoryMap[slug] || `/products?search=${encodeURIComponent(slug.replace(/-/g, ' '))}`;
            };
            
            return (
            <Link
              key={category._id ? category._id : `${category.name}-${index}`}
              href={getCategoryLink(category.slug)}
              onClick={() => handleCategoryClick(category.name)}
              className="group relative flex-shrink-0 w-[100px] md:w-auto"
            >
              {/* Card Container */}
              <div className="relative bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-2xl md:rounded-3xl p-3 md:p-6 shadow-xl md:shadow-2xl hover:shadow-[0_25px_80px_rgba(242,99,34,0.4)] transition-all duration-500 transform hover:-translate-y-4 hover:scale-105 border border-white/40 md:border-2 hover:border-[#f26322] overflow-hidden">
                
                {/* Animated Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colorScheme.bg} opacity-0 group-hover:opacity-100 transition-all duration-500`}></div>
                
                {/* Rotating Border Effect - Hidden on mobile */}
                <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden md:block">
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#f26322] via-[#ff7a45] to-[#f26322] animate-spin-slow" style={{ padding: '2px', animationDuration: '3s' }}></div>
                </div>
                
                {/* Glowing Orb Effect - Hidden on mobile */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-radial from-[#f26322]/40 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 hidden md:block"></div>
                <div className="absolute -bottom-12 -left-12 w-28 h-28 bg-gradient-radial from-[#184979]/30 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 hidden md:block"></div>
                
                <div className="relative flex flex-col items-center">
                  {/* Image Container */}
                  <div className="relative mb-2 md:mb-4">
                    {/* Animated Ring - Hidden on mobile */}
                    <div className={`absolute inset-0 rounded-full ${colorScheme.ring} ring-4 opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 animate-pulse hidden md:block`}></div>
                    
                    {/* Image Wrapper */}
                    <div className={`w-14 h-14 md:w-24 md:h-24 relative rounded-full overflow-hidden bg-gradient-to-br from-white to-gray-50 shadow-lg md:shadow-2xl ${colorScheme.shadow} group-hover:shadow-3xl group-hover:scale-110 md:group-hover:rotate-12 transition-all duration-500 ring-2 md:ring-4 ring-white/50 group-hover:ring-[#f26322]/60`}>
                      {category.imageUrl ? (
                        <Image
                          src={category.imageUrl}
                          alt={category.name}
                          fill
                          sizes="(max-width: 768px) 56px, 96px"
                          className="object-cover p-2 group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#184979] to-[#0d2d4a] text-white text-2xl font-bold">
                          {category.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      {/* Shine Effect */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
                    </div>
                    
                    {/* Corner Badge - Adjusted positioning for mobile */}
                    <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-5 h-5 md:w-6 md:h-6 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-full flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-bounce">
                      ✨
                    </div>
                  </div>
                  
                  {/* Category Name */}
                  <h3 className="text-center font-bold text-gray-800 group-hover:text-[#184979] transition-colors capitalize text-[10px] md:text-sm mb-1 md:mb-2 drop-shadow-sm leading-tight">
                    {category.name.replace(/-/g, ' ')}
                  </h3>
                  
                  {/* Hover Arrow - Hidden on mobile */}
                  <div className="hidden md:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <span className="text-xs text-[#f26322] font-bold">Explore</span>
                    <svg className="w-4 h-4 text-[#f26322] group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Corner Accent - Hidden on mobile */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#f26322]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-full hidden md:block"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-[#184979]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-tr-full hidden md:block"></div>
                
                {/* Floating Particles - Hidden on mobile */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 hidden md:block">
                  <div className="absolute top-4 left-4 w-1 h-1 bg-[#f26322] rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute top-6 right-6 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
                  <div className="absolute bottom-8 left-6 w-1 h-1 bg-[#184979] rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '2.2s' }}></div>
                </div>
              </div>
            </Link>
          )})}
        </div>
      </div>
    </section>
  );
}
