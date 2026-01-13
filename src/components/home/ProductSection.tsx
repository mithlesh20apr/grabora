'use client';

import Link from 'next/link';
import ProductCard from './ProductCard';
import { useLoader } from '@/components/ui/Loader';

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
  price: number;
  salePrice: number;
  images: string[];
  discount: number;
  ratingAvg: number;
  ratingCount: number;
  variants?: ProductVariant[];
}

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  products: Product[];
  icon?: React.ReactNode;
  bgColor?: string;
}

export default function ProductSection({ 
  title, 
  subtitle, 
  products, 
  icon,
  bgColor = 'bg-gray-50' 
}: ProductSectionProps) {
  const { showLoader } = useLoader();

  // Handle view all click
  const handleViewAllClick = () => {
    showLoader('Loading products...');
  };

  return (
    <section className="py-6 md:py-16 relative overflow-hidden">
      {/* Vibrant Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-gray-50 to-white">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#184979]/10 via-transparent to-[#f26322]/10"></div>
      </div>

      {/* Mega Animated Orbs - Hidden on mobile */}
      <div className="absolute inset-0 hidden md:block">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-radial from-[#184979]/20 via-[#1e5a8f]/10 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '5s' }}></div>
        <div className="absolute -bottom-32 -right-32 w-[600px] h-[600px] bg-gradient-radial from-[#f26322]/20 via-[#ff7a45]/10 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-gradient-radial from-[#f26322]/10 via-transparent to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '7s' }}></div>
      </div>

      {/* Floating Shapes - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden opacity-10 hidden md:block">
        <div className="absolute top-24 left-[8%] w-20 h-20 border-4 border-[#184979] rounded-lg rotate-45 animate-pulse" style={{ animationDuration: '3s' }}></div>
        <div className="absolute top-48 right-[12%] w-24 h-24 border-4 border-[#f26322] rounded-full animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute bottom-32 left-[18%] w-16 h-16 border-4 border-[#184979] rounded-lg rotate-12 animate-pulse" style={{ animationDelay: '2s', animationDuration: '3.5s' }}></div>
        <div className="absolute bottom-20 right-[22%] w-28 h-28 border-4 border-[#f26322] rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}></div>
      </div>

      {/* Diagonal Pattern - Hidden on mobile */}
      <div className="absolute inset-0 opacity-5 hidden md:block" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 50px, rgba(24, 73, 121, 0.1) 50px, rgba(24, 73, 121, 0.1) 100px)',
      }}></div>

      {/* Sparkles - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden hidden md:block">
        <div className="absolute top-20 left-[10%] text-[#f26322] text-3xl animate-pulse opacity-40" style={{ animationDelay: '0s', animationDuration: '2s' }}>🔥</div>
        <div className="absolute top-32 right-[15%] text-[#f26322] text-4xl animate-pulse opacity-50" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>⭐</div>
        <div className="absolute bottom-40 left-[20%] text-[#184979] text-3xl animate-pulse opacity-40" style={{ animationDelay: '1s', animationDuration: '2.2s' }}>📈</div>
        <div className="absolute bottom-28 right-[18%] text-[#f26322] text-4xl animate-pulse opacity-50" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }}>✨</div>
      </div>
      
      <div className="container mx-auto px-3 md:px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-4 md:mb-12">
          <div className="flex items-center justify-center gap-2 md:gap-4 mb-2 md:mb-4">
            {/* Icon with Glow Effect - Hidden on mobile */}
            <div className="relative hidden md:block">
              <div className="absolute inset-0 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full filter blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative transform hover:scale-110 transition-transform duration-300">
                {icon}
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-xl md:text-5xl font-black leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#184979] via-[#1e5a8f] to-[#184979]">
                {title}
              </span>
            </h2>
          </div>
          
          {/* Subtitle - Hidden on mobile */}
          {subtitle && (
            <p className="hidden md:block text-gray-700 text-lg md:text-xl max-w-2xl mx-auto font-semibold mb-4">{subtitle}</p>
          )}
          
          {/* Decorative Line with Animated Elements - Hidden on mobile */}
          <div className="hidden md:flex items-center justify-center gap-3">
            <span className="h-1.5 w-24 bg-gradient-to-r from-transparent via-[#184979] to-[#184979] rounded-full"></span>
            <span className="h-2.5 w-2.5 bg-[#184979] rounded-full animate-pulse"></span>
            <span className="h-2 w-40 bg-gradient-to-r from-[#184979] via-[#f26322] to-[#ff7a45] rounded-full shadow-lg"></span>
            <span className="h-2.5 w-2.5 bg-[#f26322] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></span>
            <span className="h-1.5 w-24 bg-gradient-to-r from-[#ff7a45] to-transparent rounded-full"></span>
          </div>
          
          {/* Badge - Smaller on mobile */}
          <div className="mt-3 md:mt-6 inline-block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full filter blur-xl opacity-50 hidden md:block"></div>
              <div className="relative bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white px-4 py-1.5 md:px-6 md:py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider shadow-lg md:shadow-xl">
                🌟 Trending Now 🌟
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid - 2 per row with horizontal scroll on mobile */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-6 overflow-x-auto pb-2 md:pb-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {products.map(product => (
            <div key={product._id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-6 md:mt-12">
          <Link href="/products" onClick={handleViewAllClick} className="group relative inline-flex items-center justify-center overflow-hidden">
            {/* Animated Background Glow - Hidden on mobile */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#184979] via-[#1e5a8f] to-[#184979] rounded-full filter blur-2xl opacity-50 group-hover:opacity-70 transition-opacity animate-pulse hidden md:block"></div>
            
            {/* Button Container */}
            <div className="relative bg-gradient-to-r from-[#184979] via-[#1e5a8f] to-[#184979] text-white px-6 py-2.5 md:px-12 md:py-5 rounded-full text-sm md:text-lg font-bold transition-all duration-300 transform group-hover:scale-110 shadow-lg md:shadow-2xl border border-white/20 md:border-2 group-hover:border-[#f26322]">
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 rounded-full"></div>
              
              {/* Button Content */}
              <span className="relative flex items-center gap-1.5 md:gap-3">
                <svg className="w-4 h-4 md:w-6 md:h-6 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span className="font-black text-xs md:text-base">View All Products</span>
                <svg className="w-4 h-4 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              
              {/* Corner Decorations - Hidden on mobile */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#f26322] rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#f26322] rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#f26322] rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#f26322] rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></div>
              
              {/* Floating Particles - Hidden on mobile */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
                <div className="absolute -top-1 left-1/4 w-1 h-1 bg-[#f26322] rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                <div className="absolute -top-1 right-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
                <div className="absolute -bottom-1 left-1/3 w-1 h-1 bg-white rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '2.2s' }}></div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
