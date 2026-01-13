'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface ProductImageGalleryProps {
  images: string[];
  selectedIndex?: number;
  onIndexChange?: (index: number) => void;
}

export default function ProductImageGallery({ images, selectedIndex, onIndexChange }: ProductImageGalleryProps) {
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Use external index if provided, otherwise use internal state
  const selectedImageIndex = selectedIndex !== undefined ? selectedIndex : internalSelectedIndex;
  
  const setSelectedImageIndex = (index: number) => {
    if (onIndexChange) {
      onIndexChange(index);
    } else {
      setInternalSelectedIndex(index);
    }
  };
  
  // Sync internal state with external index
  useEffect(() => {
    if (selectedIndex !== undefined) {
      setInternalSelectedIndex(selectedIndex);
    }
  }, [selectedIndex]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate percentage position within the container
    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    
    setZoomPosition({ x: xPercent, y: yPercent });
  };

  const handleMouseEnter = () => {
    setIsZooming(true);
  };

  const handleMouseLeave = () => {
    setIsZooming(false);
  };

  return (
    <div className="relative">
      <div className="flex gap-4">
        {/* Thumbnail Column - Left Side */}
        <div className="flex flex-col gap-3 w-20 overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative w-15 h-15 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                selectedImageIndex === index
                  ? 'border-[#f26322] ring-2 ring-[#f26322]/30 shadow-lg scale-105'
                  : 'border-gray-200 hover:border-[#184979] hover:shadow-md'
              }`}
            >
              <Image
                src={image}
                alt={`Thumbnail ${index + 1}`}
                fill
                sizes="60px"
                className="object-cover"
              />
              {selectedImageIndex === index && (
                <div className="absolute inset-0 bg-[#f26322]/10"></div>
              )}
            </button>
          ))}
        </div>

        {/* Main Image Container */}
        <div className="flex-1 relative">
          <div
            ref={imageContainerRef}
            className="relative w-full bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg"
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: isZooming ? 'crosshair' : 'zoom-in', aspectRatio: '1 / 1' }}
          >
            {/* Normal Image - Hidden when zooming on desktop */}
            <Image
              src={images[selectedImageIndex]}
              alt="Product main image"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={`object-contain transition-opacity duration-200 ${isZooming ? 'lg:opacity-0' : 'opacity-100'}`}
              priority
            />
            
            {/* Zoomed Image - Shown inline when zooming on desktop */}
            {isZooming && (
              <div className="hidden lg:block absolute inset-0 bg-gray-50">
                <Image
                  src={images[selectedImageIndex]}
                  alt="Zoomed product view"
                  fill
                  sizes="50vw"
                  className="object-cover pointer-events-none"
                  style={{
                    transform: 'scale(2.5)',
                    transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                  }}
                />
                {/* Zoom indicator */}
                <div className="absolute top-3 left-3 bg-gradient-to-r from-[#ff3f6c] to-[#ff6b8a] text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                  2.5x Zoom
                </div>
              </div>
            )}
          </div>

          {/* Image Counter */}
          <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-semibold pointer-events-none">
            {selectedImageIndex + 1} / {images.length}
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              {selectedImageIndex > 0 && (
                <button
                  onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 group z-10"
                >
                  <svg className="w-5 h-5 text-gray-700 group-hover:text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              {selectedImageIndex < images.length - 1 && (
                <button
                  onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 group z-10"
                >
                  <svg className="w-5 h-5 text-gray-700 group-hover:text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
