'use client';

import { usePincode } from '@/contexts/PincodeContext';
import LocationModal from './LocationModal';

export default function LocationDisplay() {
  const { pincode, isLoading, openModal } = usePincode();

  if (isLoading) {
    return (
      <div className="flex items-center text-sm text-gray-600 font-sans">
        <svg className="w-4 h-4 mr-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="text-white/80">Detecting location...</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center cursor-pointer group"
      onClick={openModal}
    >
      <div className="flex items-center text-sm border-r border-white/20 pr-4 py-1">
        <svg
          className="w-6 h-6 mr-2 text-white group-hover:text-[#f26322] transition-colors drop-shadow-md"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <div className="flex flex-col">
          <span className="text-xs text-white/80 font-medium">Deliver to</span>
          <div className="flex items-center">
            <span className="font-semibold text-white group-hover:text-[#f26322] transition-colors">
              {pincode || 'Select Pincode'}
            </span>
            <svg
              className="w-3 h-3 ml-1 text-white/80 group-hover:text-[#f26322] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
