'use client';

import { useState, useEffect } from 'react';
import { useLoader } from '@/components/ui/Loader';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, Seller, SellerAddress } from '@/contexts/SellerContext';
import { PageLoader } from '@/components/ui/Loader';
import toast from 'react-hot-toast';

interface ProfileForm {
  name: string;
  mobile: string;
  storeName: string;
  storeDescription: string;
  businessType: string;
  gstin: string;
  pan: string;
  pickupAddress: SellerAddress;
  businessAddress: SellerAddress;
}
interface BankForm {
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}


const defaultAddress: SellerAddress = {
  addressLine1: '',
  city: '',
  state: '',
  pincode: '',
};

export default function SellerProfilePage() {
  const { seller, isAuthenticated, isLoading: authLoading, getProfile, updateProfile, updateBankDetails, changePassword } = useSeller();
  const { showLoader, hideLoader } = useLoader();
    // Autofill address using geolocation (OpenStreetMap Nominatim)
    const autofillAddressFromLocation = async (addressType: 'pickupAddress' | 'businessAddress') => {
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
              setProfileForm((prev) => ({
                ...prev,
                [addressType]: {
                  ...prev[addressType],
                  ...autofill,
                },
              }));
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
  const searchParams = useSearchParams();
  const initialTab = searchParams?.get('tab') === 'bank' ? 'bank' : 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<Seller | null>(null);

  useEffect(() => {
    if (authLoading) return; // Wait for context to load on client
    const hasToken = typeof window !== 'undefined' ? !!sessionStorage.getItem('sellerToken') : false;
    if (!isAuthenticated && !hasToken) {
      // Debug log for redirect reason
      if (typeof window !== 'undefined') {
        console.warn('[Profile Redirect] Not authenticated. Reason:', {
          isAuthenticated,
          hasToken,
          seller,
          token: sessionStorage.getItem('sellerToken'),
          refreshToken: sessionStorage.getItem('sellerRefreshToken'),
          sellerObj: sessionStorage.getItem('seller'),
        });
      }
      const tab = searchParams?.get('tab');
      router.replace(`/seller/login${tab ? `?tab=${tab}` : ''}`);
    }
  }, [authLoading, isAuthenticated, router, searchParams, seller]);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: '',
    mobile: '',
    storeName: '',
    storeDescription: '',
    businessType: 'individual',
    gstin: '',
    pan: '',
    pickupAddress: { ...defaultAddress },
    businessAddress: { ...defaultAddress },
  });

  const [bankForm, setBankForm] = useState<BankForm>({
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [sameAsPickup, setSameAsPickup] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (isAuthenticated) {
        const data = await getProfile();
        if (isMounted && data) {
          setProfileData(data);
          setProfileForm({
            name: data.name || '',
            mobile: data.mobile || '',
            storeName: data.storeName || '',
            storeDescription: data.storeDescription || '',
            businessType: data.businessType || 'individual',
            gstin: '',
            pan: '',
            pickupAddress: data.pickupAddress || { ...defaultAddress },
            businessAddress: data.businessAddress || { ...defaultAddress },
          });
          if (data.bankDetails) {
            setBankForm({
              accountHolderName: data.bankDetails.accountHolderName || '',
              accountNumber: data.bankDetails.accountNumber || '',
              confirmAccountNumber: data.bankDetails.accountNumber || '',
              ifscCode: data.bankDetails.ifscCode || '',
              bankName: data.bankDetails.bankName || '',
              branchName: data.bankDetails.branchName || '',
            });
          }
        }
      }
    };
    loadProfile();
    return () => { isMounted = false; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (sameAsPickup) {
      setProfileForm(prev => ({
        ...prev,
        businessAddress: { ...prev.pickupAddress },
      }));
    }
  }, [sameAsPickup, profileForm.pickupAddress]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await updateProfile(profileForm);
      if (result) {
        toast.success('Profile updated successfully');
      }
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
      toast.error('Account numbers do not match');
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode)) {
      toast.error('Invalid IFSC code format');
      return;
    }
    setIsLoading(true);
    try {
      const result = await updateBankDetails({
        accountHolderName: bankForm.accountHolderName,
        accountNumber: bankForm.accountNumber,
        ifscCode: bankForm.ifscCode,
        bankName: bankForm.bankName,
        branchName: bankForm.branchName,
      });
      if (result) {
        toast.success('Bank details updated successfully');
      }
    } catch {
      toast.error('Failed to update bank details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (result) {
        toast.success('Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch {
      toast.error('Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <PageLoader message="Loading profile..." />;
  }
  // If not authenticated after loading, don't render protected content (redirect will happen)
  if (!isAuthenticated) {
    return null;
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
            <div className="flex items-center gap-4">
              <Link href="/">
                <Image
                  src="/logo/logo.svg"
                  alt="Grabora"
                  width={120}
                  height={35}
                  className="h-8 w-auto"
                />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Seller Profile</h1>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#184979] to-[#f26322] flex items-center justify-center text-white text-3xl font-bold">
              {seller?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{seller?.name}</h2>
              <p className="text-gray-500">{seller?.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  seller?.status === 'active' ? 'bg-green-100 text-green-700' :
                  seller?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {seller?.status}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-500">{seller?.sellerId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="border-b border-gray-100">
            <nav className="flex">
              {[ 
                { key: 'profile', label: 'Profile Info', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                { key: 'bank', label: 'Bank Details', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-[#f26322] text-[#f26322]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Personal Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                      <input
                        type="tel"
                        value={profileForm.mobile}
                        onChange={(e) => setProfileForm({ ...profileForm, mobile: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Store Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Store Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
                        <input
                          type="text"
                          value={profileForm.storeName}
                          onChange={(e) => setProfileForm({ ...profileForm, storeName: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                        <select
                          value={profileForm.businessType}
                          onChange={(e) => setProfileForm({ ...profileForm, businessType: e.target.value })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none bg-white"
                        >
                          <option value="individual">Individual</option>
                          <option value="proprietorship">Proprietorship</option>
                          <option value="partnership">Partnership</option>
                          <option value="pvt_ltd">Private Limited</option>
                          <option value="llp">LLP</option>
                        </select>
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
                        onClick={() => autofillAddressFromLocation('businessAddress')}
                        disabled={sameAsPickup}
                      >
                        📍 Auto Detect Location
                      </button>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                      <input
                        type="text"
                        value={profileForm.businessAddress.addressLine1}
                        onChange={(e) => setProfileForm({ ...profileForm, businessAddress: { ...profileForm.businessAddress, addressLine1: e.target.value } })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                        required={!sameAsPickup}
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={profileForm.businessAddress.city}
                          onChange={(e) => setProfileForm({ ...profileForm, businessAddress: { ...profileForm.businessAddress, city: e.target.value } })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                          required={!sameAsPickup}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={profileForm.businessAddress.state}
                          onChange={(e) => setProfileForm({ ...profileForm, businessAddress: { ...profileForm.businessAddress, state: e.target.value } })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                          required={!sameAsPickup}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                        <input
                          type="text"
                          value={profileForm.businessAddress.pincode}
                          onChange={(e) => setProfileForm({ ...profileForm, businessAddress: { ...profileForm.businessAddress, pincode: e.target.value } })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                          required={!sameAsPickup}
                          maxLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Landmark</label>
                        <input
                          type="text"
                          value={profileForm.businessAddress.landmark || ''}
                          onChange={(e) => setProfileForm({ ...profileForm, businessAddress: { ...profileForm.businessAddress, landmark: e.target.value } })}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#f26322] text-white font-semibold py-3 rounded-xl hover:bg-[#e05512] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            )}

            {/* Bank Details Tab */}
            {activeTab === 'bank' && (
              <form onSubmit={handleBankSubmit} className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-blue-800">Important</p>
                      <p className="text-sm text-blue-600">Your bank details are used for receiving payments. Please ensure all information is accurate.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankForm.accountHolderName}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                      placeholder="As per bank records"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <input
                        type="password"
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Account Number</label>
                      <input
                        type="text"
                        value={bankForm.confirmAccountNumber}
                        onChange={(e) => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none uppercase"
                      placeholder="ABCD0123456"
                      maxLength={11}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                      <input
                        type="text"
                        value={bankForm.branchName}
                        onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#f26322] text-white font-semibold py-3 rounded-xl hover:bg-[#e05512] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Saving...' : 'Update Bank Details'}
                </button>
              </form>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none pr-12"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#f26322] text-white font-semibold py-3 rounded-xl hover:bg-[#e05512] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Updating...' : 'Change Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
