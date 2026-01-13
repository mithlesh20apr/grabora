'use client';

import { useState } from 'react';
import { usePincode } from '@/contexts/PincodeContext';

export default function PincodeModal() {
  const { showModal, setPincode, closeModal } = usePincode();
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  if (!showModal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate pincode
    if (!/^\d{6}$/.test(inputValue)) {
      setError('Pincode must be 6 digits');
      return;
    }

    try {
      setPincode(inputValue);
      setInputValue('');
    } catch (err: any) {
      setError(err.message || 'Failed to set pincode');
    }
  };

  const handleSkip = () => {
    closeModal();
    setInputValue('');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] font-sans p-4" onClick={handleSkip}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-auto my-auto transform transition-all animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#184979] to-[#1e5a8f] rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Enter Your Pincode</h2>
                <p className="text-sm text-gray-600">Get personalized availability</p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Enter your pincode to see nearby sellers, delivery times, and high-demand products in your area.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-2">
                Pincode
              </label>
              <input
                id="pincode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={inputValue}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setInputValue(value);
                  setError('');
                }}
                placeholder="Enter 6-digit pincode (e.g., 110096)"
                autoFocus
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                    : 'border-gray-300 focus:border-[#184979] focus:ring-[#184979]/20'
                } bg-white text-gray-900 placeholder:text-gray-500`}
              />
              {error && (
                <p className="text-xs text-red-500 mt-1">{error}</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Skip for now
              </button>
              <button
                type="submit"
                disabled={inputValue.length !== 6}
                className="flex-1 px-4 py-2 bg-[#184979] text-white rounded-lg hover:bg-[#0d2d4a] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save Pincode
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>You can change your pincode anytime by clicking on the location in the header.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
