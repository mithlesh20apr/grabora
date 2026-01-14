import React from 'react';
import Link from 'next/link';
import BoostStatus from './BoostStatus';

interface BoostCardProps {
  isActive: boolean;
  expiryDate?: string;
}

const BoostCard: React.FC<BoostCardProps> = ({ isActive, expiryDate }) => (
  <div className="bg-gradient-to-r from-[#f26322]/30 to-[#f26322]/10 rounded-2xl border border-[#f26322]/30 p-6 mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 bg-[#f26322]/20 rounded-xl flex items-center justify-center flex-shrink-0">
        <svg className="w-8 h-8 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h3 className="text-xl font-bold text-white mb-1">Boost Your Store 🚀</h3>
        <p className="text-sm text-gray-200">Increase your ranking, get more visibility, and attract more buyers with paid boost plans. Enjoy priority listing and exclusive features!</p>
        <div className="mt-2">
          <BoostStatus isActive={isActive} expiryDate={expiryDate} />
        </div>
      </div>
    </div>
    <div className="flex gap-3 mt-4 lg:mt-0">
      <Link
        href="/seller/boost"
        className="px-6 py-3 bg-[#f26322] hover:bg-[#e05512] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#f26322]/25"
      >
        View Boost Plans
      </Link>
      {isActive && (
        <button className="px-6 py-3 border-2 border-white/10 text-white font-semibold rounded-xl hover:bg-white/5 transition-all">
          Renew Boost
        </button>
      )}
    </div>
  </div>
);

export default BoostCard;
