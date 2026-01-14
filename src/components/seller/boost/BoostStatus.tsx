import React from 'react';

interface BoostStatusProps {
  isActive: boolean;
  expiryDate?: string;
}

const BoostStatus: React.FC<BoostStatusProps> = ({ isActive, expiryDate }) => {
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold ${isActive ? 'bg-emerald-500/20 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
      {isActive ? (
        <>
          <span className="text-emerald-600">Boost Active</span>
          {expiryDate && <span className="text-xs text-gray-500">(expires {expiryDate})</span>}
        </>
      ) : (
        <span>Not Boosted</span>
      )}
    </div>
  );
};

export default BoostStatus;
