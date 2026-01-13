'use client';

import { useState, useEffect } from 'react';
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

interface FlashSaleProps {
  products: Product[];
}

export default function FlashSale({ products }: FlashSaleProps) {
  const { showLoader } = useLoader();
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 59,
    seconds: 59
  });

  // Handle view all click
  const handleViewAllClick = () => {
    showLoader('Loading products...');
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-6 md:py-16 relative overflow-hidden">
      {/* Vibrant Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f26322] via-[#184979] to-[#0d2d4a]">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ff7a45]/40 via-transparent to-[#1e5a8f]/40 animate-pulse"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-[#184979]/60 via-[#f26322]/20 to-[#0d2d4a]/80"></div>
      </div>

      {/* Mega Animated Orbs - Hidden on mobile */}
      <div className="absolute inset-0 hidden md:block">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-radial from-[#f26322]/40 via-[#ff7a45]/20 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-radial from-[#ff7a45]/50 via-[#f26322]/30 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-gradient-radial from-white/20 via-[#f26322]/10 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-gradient-radial from-[#184979]/30 via-[#1e5a8f]/20 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }}></div>
      </div>

      {/* Dynamic Shapes - Stars and Sparkles - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden hidden md:block">
        {/* Stars */}
        <div className="absolute top-20 left-[5%] text-yellow-300 text-4xl animate-pulse opacity-70" style={{ animationDelay: '0s', animationDuration: '2s' }}>⭐</div>
        <div className="absolute top-32 right-[8%] text-yellow-300 text-3xl animate-pulse opacity-60" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>✨</div>
        <div className="absolute bottom-40 left-[15%] text-yellow-300 text-5xl animate-pulse opacity-80" style={{ animationDelay: '1s', animationDuration: '3s' }}>⭐</div>
        <div className="absolute bottom-24 right-[20%] text-yellow-300 text-3xl animate-pulse opacity-70" style={{ animationDelay: '1.5s', animationDuration: '2.2s' }}>✨</div>
        <div className="absolute top-1/2 left-[10%] text-yellow-300 text-4xl animate-pulse opacity-60" style={{ animationDelay: '2s', animationDuration: '2.8s' }}>💥</div>
        <div className="absolute top-1/3 right-[12%] text-yellow-300 text-5xl animate-pulse opacity-75" style={{ animationDelay: '0.8s', animationDuration: '3.2s' }}>⚡</div>
      </div>

      {/* Animated Lightning Bolts - Enhanced - Hidden on mobile */}
      <div className="absolute inset-0 opacity-20 hidden md:block">
        <svg className="absolute top-10 left-10 w-28 h-28 text-[#f26322] animate-pulse drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '0.5s', animationDuration: '1.5s' }}>
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
        <svg className="absolute top-32 right-16 w-24 h-24 text-yellow-300 animate-pulse drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '1.5s', animationDuration: '2s' }}>
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
        <svg className="absolute bottom-20 left-1/4 w-32 h-32 text-white animate-pulse drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '2.5s', animationDuration: '1.8s' }}>
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
        <svg className="absolute bottom-40 right-28 w-20 h-20 text-[#ff7a45] animate-pulse drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '3s', animationDuration: '2.2s' }}>
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
        <svg className="absolute top-1/2 left-[5%] w-26 h-26 text-[#f26322] animate-pulse drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '0.8s', animationDuration: '2.5s' }}>
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
        <svg className="absolute top-1/3 right-[8%] w-22 h-22 text-yellow-300 animate-pulse drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '1.2s', animationDuration: '1.9s' }}>
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
      </div>

      {/* Animated Diagonal Stripes - Multiple Layers - Hidden on mobile */}
      <div className="absolute inset-0 opacity-10 hidden md:block" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255, 255, 255, 0.1) 40px, rgba(255, 255, 255, 0.1) 80px)',
      }}></div>
      <div className="absolute inset-0 opacity-8 hidden md:block" style={{
        backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 30px, rgba(242, 99, 34, 0.2) 30px, rgba(242, 99, 34, 0.2) 60px)',
      }}></div>

      {/* Floating Particles - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden hidden md:block">
        {[
          { top: 10, left: 5, delay: 0.2, duration: 4.5, color: 'bg-[#f26322]' },
          { top: 25, left: 85, delay: 1.1, duration: 3.8, color: 'bg-yellow-300' },
          { top: 40, left: 15, delay: 0.8, duration: 5.2, color: 'bg-white' },
          { top: 55, left: 75, delay: 2.3, duration: 4.1, color: 'bg-[#f26322]' },
          { top: 70, left: 35, delay: 1.5, duration: 3.5, color: 'bg-yellow-300' },
          { top: 85, left: 90, delay: 0.5, duration: 4.8, color: 'bg-white' },
          { top: 15, left: 45, delay: 2.8, duration: 3.9, color: 'bg-[#f26322]' },
          { top: 35, left: 60, delay: 1.9, duration: 4.3, color: 'bg-yellow-300' },
          { top: 60, left: 25, delay: 0.3, duration: 5.0, color: 'bg-white' },
          { top: 80, left: 55, delay: 2.1, duration: 3.7, color: 'bg-[#f26322]' },
          { top: 5, left: 70, delay: 1.3, duration: 4.6, color: 'bg-yellow-300' },
          { top: 45, left: 95, delay: 0.9, duration: 3.6, color: 'bg-white' },
          { top: 65, left: 10, delay: 2.5, duration: 4.2, color: 'bg-[#f26322]' },
          { top: 90, left: 40, delay: 1.7, duration: 5.1, color: 'bg-yellow-300' },
          { top: 20, left: 30, delay: 0.6, duration: 3.4, color: 'bg-white' },
          { top: 50, left: 80, delay: 2.0, duration: 4.4, color: 'bg-[#f26322]' },
          { top: 75, left: 20, delay: 1.2, duration: 4.0, color: 'bg-yellow-300' },
          { top: 30, left: 50, delay: 2.7, duration: 3.3, color: 'bg-white' },
          { top: 95, left: 65, delay: 0.4, duration: 4.7, color: 'bg-[#f26322]' },
          { top: 12, left: 92, delay: 1.8, duration: 3.2, color: 'bg-yellow-300' },
        ].map((particle, i) => (
          <div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${particle.color} opacity-70 animate-bounce`}
            style={{
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Glowing Rings - Hidden on mobile */}
      <div className="absolute inset-0 overflow-hidden opacity-30 hidden md:block">
        <div className="absolute top-10 right-1/4 w-64 h-64 border-4 border-[#f26322] rounded-full animate-ping" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 border-4 border-yellow-300 rounded-full animate-ping" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-48 h-48 border-4 border-white rounded-full animate-ping" style={{ animationDelay: '2s', animationDuration: '3.5s' }}></div>
      </div>

      {/* Radial Burst Effect - Hidden on mobile */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-[#f26322]/5 to-transparent hidden md:block"></div>
      <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent hidden md:block"></div>

      <div className="container mx-auto px-3 md:px-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 md:mb-10">
          <div className="text-center md:text-left mb-3 md:mb-0">
            <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-3 justify-center md:justify-start">
              <div className="relative">
                {/* Animated Lightning Icon with Multiple Layers - Reduced on mobile */}
                <div className="absolute inset-0 bg-[#f26322] rounded-full filter blur-xl md:blur-2xl animate-pulse opacity-60 hidden md:block"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full filter blur-md md:blur-xl animate-pulse opacity-50 hidden md:block" style={{ animationDelay: '0.5s' }}></div>
                <svg className="relative w-8 h-8 md:w-12 md:h-12 text-[#f26322] drop-shadow-2xl" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
                <svg className="absolute top-0 left-0 w-8 h-8 md:w-12 md:h-12 text-white animate-ping opacity-20 hidden md:block" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1 md:gap-2 mb-0 md:mb-1">
                  <h2 className="text-xl md:text-4xl font-black text-white tracking-tight drop-shadow-lg">Flash Sale</h2>
                  <span className="px-2 py-0.5 md:px-3 md:py-1 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white text-[10px] md:text-xs font-bold rounded-full animate-pulse shadow-lg">LIVE</span>
                </div>
                <div className="hidden md:flex items-center gap-2 mt-2">
                  <span className="h-1.5 w-16 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full shadow-lg"></span>
                  <span className="h-1.5 w-10 bg-white/60 rounded-full"></span>
                  <span className="h-1.5 w-6 bg-white/40 rounded-full"></span>
                  <span className="h-1 w-3 bg-white/20 rounded-full"></span>
                </div>
              </div>
            </div>
            <p className="hidden md:block text-white/95 text-xl font-bold drop-shadow-lg">
              🔥 Hurry up! Lightning deals you can't miss
            </p>
            <p className="text-[#fff] text-xs md:text-sm font-semibold mt-1 md:mt-2 animate-pulse">
              ⚡ Up to 70% OFF
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="flex gap-1.5 md:gap-3">
            {[{ value: timeLeft.hours, label: 'Hrs' }, { value: timeLeft.minutes, label: 'Min' }, { value: timeLeft.seconds, label: 'Sec' }].map((item, index) => (
              <div key={index} className="relative group">
                {/* Animated Background Glow - Hidden on mobile */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#f26322] via-[#ff7a45] to-[#f26322] rounded-xl md:rounded-2xl blur-xl md:blur-2xl opacity-30 group-hover:opacity-50 transition-opacity animate-pulse hidden md:block"></div>
                <div className="absolute inset-0 bg-[#f26322]/10 rounded-xl md:rounded-2xl blur-md md:blur-xl hidden md:block"></div>
                
                {/* Timer Box */}
                <div className="relative bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl p-2 md:p-5 text-center min-w-[50px] md:min-w-[90px] border border-white/40 md:border-2 hover:border-[#f26322] transition-all hover:scale-110 duration-300 shadow-lg md:shadow-2xl">
                  {/* Corner Decorations - Hidden on mobile */}
                  <div className="absolute top-0 left-0 w-2 h-2 md:w-3 md:h-3 border-t border-l md:border-t-2 md:border-l-2 border-[#f26322] rounded-tl-lg hidden md:block"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 md:w-3 md:h-3 border-t border-r md:border-t-2 md:border-r-2 border-[#f26322] rounded-tr-lg hidden md:block"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 md:w-3 md:h-3 border-b border-l md:border-b-2 md:border-l-2 border-[#f26322] rounded-bl-lg hidden md:block"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 md:w-3 md:h-3 border-b border-r md:border-b-2 md:border-r-2 border-[#f26322] rounded-br-lg hidden md:block"></div>
                  
                  {/* Time Value */}
                  <div className="relative">
                    <div className="text-lg md:text-4xl font-black text-white mb-0 md:mb-1 tabular-nums drop-shadow-2xl">
                      {String(item.value).padStart(2, '0')}
                    </div>
                    {/* Animated Underline - Hidden on mobile */}
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 md:w-8 h-0.5 md:h-1 bg-gradient-to-r from-transparent via-[#f26322] to-transparent rounded-full hidden md:block"></div>
                  </div>
                  
                  {/* Label */}
                  <div className="text-white/90 text-[8px] md:text-xs font-bold uppercase tracking-wider mt-0.5 md:mt-2">{item.label}</div>
                  
                  {/* Pulse Indicator - Hidden on mobile */}
                  {item.label === 'Sec' && (
                    <div className="absolute -top-1 -right-1 hidden md:block">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f26322] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#f26322]"></span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Products Grid - 2 per row on mobile, grid on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-5 pb-2 md:pb-0">
          {products.map(product => (
            <div key={product._id}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-4 md:mt-8">
          <Link href="/products" onClick={handleViewAllClick} className="group relative inline-flex bg-gradient-to-r from-white via-gray-50 to-white hover:from-gray-50 hover:via-white hover:to-gray-50 text-[#184979] px-6 py-2.5 md:px-12 md:py-5 rounded-full text-sm md:text-lg font-bold shadow-xl md:shadow-2xl transform hover:scale-110 transition-all duration-300 overflow-hidden border border-white/50 md:border-2">
            {/* Animated Background */}
            <span className="absolute inset-0 bg-gradient-to-r from-[#f26322]/0 via-[#f26322]/20 to-[#f26322]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-30 animate-pulse"></span>
            
            {/* Shine Effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-50 transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000"></span>
            
            {/* Button Content */}
            <span className="relative flex items-center gap-1.5 md:gap-3">
              <svg className="w-4 h-4 md:w-6 md:h-6 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
              </svg>
              <span className="font-black text-xs md:text-base">View All Flash Deals</span>
              <svg className="w-4 h-4 md:w-6 md:h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            
            {/* Corner Accents - Hidden on mobile */}
            <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#f26322] rounded-tl-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></span>
            <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#f26322] rounded-tr-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></span>
            <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#f26322] rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></span>
            <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#f26322] rounded-br-full opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></span>
          </Link>
        </div>
      </div>
    </section>
  );
}
