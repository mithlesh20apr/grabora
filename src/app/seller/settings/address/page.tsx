'use client';

import { useState, useEffect } from 'react';
import { useLoader } from '@/components/ui/Loader';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSeller, SellerAddress } from '@/contexts/SellerContext';
import { PageLoader } from '@/components/ui/Loader';
import toast from 'react-hot-toast';

const defaultAddress: SellerAddress = {
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
};

export default function PickupAddressPage() {
  const { seller, isAuthenticated, isLoading: authLoading, getProfile, updateProfile } = useSeller();
  const { showLoader, hideLoader } = useLoader();
    // Autofill address using geolocation (OpenStreetMap Nominatim)
    const autofillAddressFromLocation = async (addressType: 'pickup' | 'business') => {
      if (!navigator.geolocation) {
        toast.error('Geolocation is not supported by your browser');
        return;
      }
      showLoader('Detecting your location...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
            );
            const data = await response.json();
            if (data && data.address) {
              const addr = data.address;
              const autofill = {
                addressLine1: `${addr.road || ''} ${addr.neighbourhood || ''}`.trim() || addr.display_name || '',
                city: addr.city || addr.town || addr.village || '',
                state: addr.state || '',
                pincode: addr.postcode || '',
                landmark: addr.suburb || addr.locality || '',
              };
              if (addressType === 'pickup') {
                setPickupAddress((prev) => ({ ...prev, ...autofill }));
              } else {
                setBusinessAddress((prev) => ({ ...prev, ...autofill }));
              }
              toast.success('Address auto-filled from your location!');
            } else {
              toast.error('Could not fetch address details. Please enter manually.');
            }
          } catch (error) {
            toast.error('Could not fetch address details. Please enter manually.');
          } finally {
            hideLoader();
          }
        },
        (error) => {
          toast.error('Unable to retrieve your location. Please check permissions.');
          hideLoader();
        }
      );
    };
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [sameAsPickup, setSameAsPickup] = useState(false);

  const [pickupAddress, setPickupAddress] = useState<SellerAddress>({ ...defaultAddress });
  const [businessAddress, setBusinessAddress] = useState<SellerAddress>({ ...defaultAddress });

  useEffect(() => {
    // Check if token exists in sessionStorage
    const hasToken = typeof window !== 'undefined' ? !!sessionStorage.getItem('sellerToken') : false;

    if (!authLoading && !isAuthenticated && !hasToken) {
      router.replace('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (isAuthenticated) {
        const data = await getProfile();
        if (isMounted && data) {
          setPickupAddress(data.pickupAddress || { ...defaultAddress });
          setBusinessAddress(data.businessAddress || { ...defaultAddress });
        }
      }
    };
    loadProfile();
    return () => { isMounted = false; };
  }, [isAuthenticated, getProfile]);

  useEffect(() => {
    if (sameAsPickup) {
      setBusinessAddress({ ...pickupAddress });
    }
  }, [sameAsPickup, pickupAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await updateProfile({
        name: seller?.name || '',
        storeName: seller?.storeName || '',
        storeDescription: seller?.storeDescription || '',
        businessType: seller?.businessType || 'individual',
        pickupAddress,
        businessAddress: sameAsPickup ? pickupAddress : businessAddress,
      });
      if (result) {
        toast.success('Pickup address updated successfully');
        // Redirect back to dashboard after successful update
        setTimeout(() => router.push('/seller/dashboard'), 1500);
      }
    } catch {
      toast.error('Failed to update pickup address');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return <PageLoader message="Loading..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/seller/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Pickup Address</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Pickup Address</h2>
            <p className="text-gray-600">This is where orders will be picked up from for delivery to customers.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Pickup Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Pickup Address</h3>
              <button
                type="button"
                className="mb-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                onClick={() => autofillAddressFromLocation('pickup')}
              >
                📍 Auto Detect Location
              </button>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pickupAddress.addressLine1}
                    onChange={(e) => setPickupAddress({ ...pickupAddress, addressLine1: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                    placeholder="Street address, building name, etc."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupAddress.city}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupAddress.state}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, state: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pickupAddress.pincode}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, pincode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                    <input
                      type="text"
                      value={pickupAddress.landmark || ''}
                      onChange={(e) => setPickupAddress({ ...pickupAddress, landmark: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Business Address */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Business Address</h3>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsPickup}
                    onChange={(e) => setSameAsPickup(e.target.checked)}
                    className="w-4 h-4 text-[#f26322] rounded border-gray-300 focus:ring-[#f26322]"
                  />
                  Same as pickup address
                </label>
              </div>

              <div className={`space-y-4 ${sameAsPickup ? 'opacity-50 pointer-events-none' : ''}`}>
                <button
                  type="button"
                  className="mb-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                  onClick={() => autofillAddressFromLocation('business')}
                  disabled={sameAsPickup}
                >
                  📍 Auto Detect Location
                </button>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address Line 1 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessAddress.addressLine1}
                    onChange={(e) => setBusinessAddress({ ...businessAddress, addressLine1: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                    required={!sameAsPickup}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessAddress.city}
                      onChange={(e) => setBusinessAddress({ ...businessAddress, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                      required={!sameAsPickup}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessAddress.state}
                      onChange={(e) => setBusinessAddress({ ...businessAddress, state: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                      required={!sameAsPickup}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessAddress.pincode}
                      onChange={(e) => setBusinessAddress({ ...businessAddress, pincode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                      maxLength={6}
                      required={!sameAsPickup}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                    <input
                      type="text"
                      value={businessAddress.landmark || ''}
                      onChange={(e) => setBusinessAddress({ ...businessAddress, landmark: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-[#f26322] text-white font-semibold py-3 rounded-xl hover:bg-[#e05512] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save Address'}
              </button>
              <Link
                href="/seller/dashboard"
                className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-800">Important</p>
              <p className="text-sm text-blue-600">
                Make sure your pickup address is accurate. This is where our delivery partners will collect orders from.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
