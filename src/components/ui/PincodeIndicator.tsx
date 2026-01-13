'use client';

import { usePincode } from '@/contexts/PincodeContext';

export default function PincodeIndicator() {
  const { pincode, openModal } = usePincode();

  if (!pincode) return null;

  return (
    <div className="bg-gradient-to-r from-[#184979] to-[#1e5a8f] py-2 px-4">
      <div className="container mx-auto flex items-center justify-center gap-2 text-white text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-semibold">
          Showing results for <span className="font-bold">{pincode}</span>
        </span>
        <button
          onClick={openModal}
          className="ml-2 text-white underline hover:text-[#f26322] transition-colors font-semibold"
        >
          Change
        </button>
      </div>
    </div>
  );
}
