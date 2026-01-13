'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Banner {
  _id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  redirectTo: string;
  priority: number;
}

interface HeroBannerProps {
  banners: Banner[];
}

export default function HeroBanner({ banners }: HeroBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!banners || banners.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners]);

  // Return placeholder if no banners
  if (!banners || banners.length === 0) {
    return (
      <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9] max-h-[200px] md:max-h-[400px] overflow-hidden bg-gradient-to-br from-[#184979] via-[#1e5a8f] to-[#0d2d4a] z-10 flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-lg md:text-2xl font-bold">Welcome to Grabora</h2>
          <p className="text-white/70 mt-1 md:mt-2 text-sm md:text-base">Discover amazing products</p>
        </div>
      </div>
    );
  }

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % banners.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);

  return (
    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] lg:aspect-[24/9] max-h-[200px] md:max-h-[400px] overflow-hidden bg-gradient-to-br from-[#184979] via-[#1e5a8f] to-[#0d2d4a] z-10">

      {/* Slides */}
      {banners.map((banner, index) => (
        <div
          key={banner._id || (banner as any).id || `banner-${index}`}
          className={`absolute inset-0 transition-all duration-1000 ${
            index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        >
          <Link href={banner.redirectTo || '/products'} className="block w-full h-full relative group">
            {/* Image with Parallax Effect */}
            <div className="absolute inset-0 overflow-hidden">
              {banner.imageUrl ? (
                <Image
                  src={banner.imageUrl}
                  alt={banner.title || 'Banner'}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-[3000ms]"
                  priority={index === 0}
                  sizes="100vw"
                  quality={100}
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-[#184979] to-[#0d2d4a]"></div>
              )}
            </div>

            {/* Simple Gradient Overlay - Removed for better visibility */}
            {/* <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent"></div> */}
          </Link>
        </div>
      ))}

      {/* Enhanced Navigation Arrows - Only show if multiple banners */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 md:left-8 top-1/2 -translate-y-1/2 group z-20 opacity-0 hover:opacity-100 transition-opacity duration-300"
            aria-label="Previous banner"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#184979] to-[#1e5a8f] rounded-full filter blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative bg-white/20 hover:bg-white/30 backdrop-blur-xl p-2 md:p-3 rounded-full transition-all duration-300 border border-white/30 hover:border-white/50 hover:scale-110 shadow-2xl">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-2 md:right-8 top-1/2 -translate-y-1/2 group z-20 opacity-0 hover:opacity-100 transition-opacity duration-300"
            aria-label="Next banner"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#184979] to-[#1e5a8f] rounded-full filter blur-xl opacity-0 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative bg-white/20 hover:bg-white/30 backdrop-blur-xl p-2 md:p-3 rounded-full transition-all duration-300 border border-white/30 hover:border-white/50 hover:scale-110 shadow-2xl">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </>
      )}

      {/* Enhanced Dots Navigation - Only show if multiple banners */}
      {banners.length > 1 && (
        <div className="absolute bottom-2 md:bottom-10 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-white/10 backdrop-blur-xl px-3 py-1.5 md:px-6 md:py-3 rounded-full shadow-2xl">
            <div className="flex space-x-2 md:space-x-3">
              {banners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className="group relative"
                  aria-label={`Go to banner ${index + 1}`}
                >
                  {index === currentSlide && (
                    <div className="absolute inset-0 bg-[#f26322] rounded-full filter blur-md animate-pulse"></div>
                  )}
                  <div className={`relative w-2 h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? 'bg-gradient-to-r from-[#f26322] to-[#ff7a45] w-6 md:w-10 shadow-lg'
                      : 'bg-white/50 hover:bg-white/80 hover:scale-125'
                  }`}></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
        {/* <div 
          className="h-full bg-gradient-to-r from-[#f26322] to-[#ff7a45] transition-all duration-[5000ms] ease-linear"
          style={{ width: '100%' }}
          key={currentSlide}
        ></div> */}
      </div>
    </div>
  );
}
