'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface UserData {
  name: string;
  phone: string;
  email: string;
  loggedIn: boolean;
  avatar?: string;
  gender?: string;
  birthday?: string;
}

interface Address {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  type: 'Home' | 'Work' | 'Other';
  isDefault: boolean;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, isAuthenticated, isLoading: authLoading, logout: authLogout } = useAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    birthday: ''
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) return;

    // Check if user is authenticated via AuthContext
    if (!isAuthenticated || !authUser) {
      router.push('/login');
      return;
    }

    // Map auth user to local user format
    const mappedUser: UserData = {
      name: authUser.fullName || authUser.firstName || authUser.username || '',
      phone: authUser.phone || '',
      email: authUser.email || '',
      loggedIn: true,
      avatar: authUser.avatar?.url,
      gender: '',
      birthday: ''
    };

    // Try to load additional profile data from localStorage
    const savedProfileData = localStorage.getItem('grabora_profile_extra');
    if (savedProfileData) {
      const extraData = JSON.parse(savedProfileData);
      mappedUser.gender = extraData.gender || '';
      mappedUser.birthday = extraData.birthday || '';
    }

    setUser(mappedUser);
    setFormData({
      name: mappedUser.name,
      email: mappedUser.email,
      phone: mappedUser.phone,
      gender: mappedUser.gender || '',
      birthday: mappedUser.birthday || ''
    });

    // Load addresses
    const savedAddresses = localStorage.getItem('grabora_addresses');
    if (savedAddresses) {
      setAddresses(JSON.parse(savedAddresses));
    }

    setLoading(false);
  }, [authLoading, isAuthenticated, authUser, router]);

  const handleUpdateProfile = () => {
    const updatedUser = { ...user, ...formData };
    // Save extra profile data (gender, birthday) to localStorage
    localStorage.setItem('grabora_profile_extra', JSON.stringify({
      gender: formData.gender,
      birthday: formData.birthday
    }));
    setUser(updatedUser as UserData);
    setEditMode(false);
    alert('Profile updated successfully!');
  };

  const handleLogout = async () => {
    await authLogout();
    router.push('/login');
  };

  const handleDeleteAddress = (id: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      const updatedAddresses = addresses.filter(addr => addr.id !== id);
      setAddresses(updatedAddresses);
      localStorage.setItem('grabora_addresses', JSON.stringify(updatedAddresses));
    }
  };

  const handleSetDefaultAddress = (id: string) => {
    const updatedAddresses = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id
    }));
    setAddresses(updatedAddresses);
    localStorage.setItem('grabora_addresses', JSON.stringify(updatedAddresses));
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 md:bg-gradient-to-br md:from-[#184979]/5 md:via-white md:to-[#f26322]/5">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#184979]"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 md:bg-gradient-to-br md:from-[#184979]/5 md:via-white md:to-[#f26322]/5 py-4 md:py-12 px-2 md:px-4">
      <div className="container mx-auto max-w-full md:max-w-7xl">
        
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-4 md:p-6 mb-4 md:mb-6 border border-white/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              {/* Avatar */}
              <div className="relative w-14 h-14 md:w-20 md:h-20 rounded-full overflow-hidden bg-gradient-to-br from-[#184979] to-[#f26322] flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-lg">
                {user.avatar ? (
                  <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                ) : (
                  <span>{user.name?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-black text-[#184979]">{user.name || 'User'}</h1>
                <p className="text-gray-600 text-sm md:text-base">{user.phone}</p>
                {user.email && <p className="text-xs md:text-sm text-gray-500">{user.email}</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 md:px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-all flex items-center gap-2 text-sm md:text-base"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl mb-4 md:mb-6 border border-white/50">
          <div className="flex overflow-x-auto no-scrollbar">
            {[
              { id: 'profile', label: 'Profile Info', icon: '👤' },
              { id: 'addresses', label: 'Addresses', icon: '📍' },
              { id: 'orders', label: 'My Orders', icon: '📦' },
              { id: 'security', label: 'Security', icon: '🔒' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[100px] md:min-w-[120px] px-3 md:px-6 py-2 md:py-4 font-bold text-xs md:text-base transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#184979] to-[#f26322] text-white shadow-md'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-3 md:p-8 border border-white/50">
          
          {/* Profile Info Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 md:mb-6">
                <h2 className="text-lg md:text-2xl font-black text-[#184979]">Personal Information</h2>
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="px-4 py-2 bg-[#184979] text-white rounded-lg font-bold hover:bg-[#f26322] transition-all"
                  >
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateProfile}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-4 py-2 bg-gray-400 text-white rounded-lg font-bold hover:bg-gray-500 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-600 text-sm md:text-base"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    disabled
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-xl bg-gray-100 text-gray-600 cursor-not-allowed text-sm md:text-base"
                  />
                  <p className="text-xs text-gray-500 mt-1">Phone number cannot be changed</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled={!editMode}
                    placeholder="Enter your email"
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-600 text-sm md:text-base"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-600 text-sm md:text-base"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Birthday */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.birthday}
                    onChange={(e) => setFormData({...formData, birthday: e.target.value})}
                    disabled={!editMode}
                    className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 disabled:bg-gray-100 disabled:text-gray-600 text-sm md:text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Addresses Tab */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-[#184979]">Saved Addresses</h2>
                <Link
                  href="/checkout"
                  className="px-4 py-2 bg-[#184979] text-white rounded-lg font-bold hover:bg-[#f26322] transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Address
                </Link>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">No Addresses Saved</h3>
                  <p className="text-gray-600 mb-4">Add your delivery addresses for faster checkout</p>
                  <Link
                    href="/checkout"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-[#184979] to-[#f26322] text-white rounded-xl font-bold hover:shadow-lg transition-all"
                  >
                    Add Your First Address
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`p-3 md:p-5 rounded-xl border-2 transition-all ${
                        address.isDefault
                          ? 'border-[#184979] bg-[#184979]/5'
                          : 'border-gray-200 hover:border-[#f26322]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 md:mb-3">
                        <div className="flex items-center gap-2 mb-2 sm:mb-0">
                          <span className="px-2 py-0.5 md:px-3 md:py-1 bg-gradient-to-r from-[#184979] to-[#f26322] text-white text-xs font-bold rounded-full">
                            {address.type}
                          </span>
                          {address.isDefault && (
                            <span className="px-2 py-0.5 md:px-3 md:py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-[#184979] mb-1 text-sm md:text-base">{address.name}</h4>
                      <p className="text-xs md:text-sm text-gray-600 mb-1">{address.phone}</p>
                      <p className="text-xs md:text-sm text-gray-700 mb-2 md:mb-3">
                        {address.address}, {address.city}, {address.state} - {address.pincode}
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2">
                        {!address.isDefault && (
                          <button
                            onClick={() => handleSetDefaultAddress(address.id)}
                            className="flex-1 px-3 py-2 bg-[#184979] text-white text-xs md:text-sm font-bold rounded-lg hover:bg-[#f26322] transition-all"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="px-3 py-2 bg-red-500 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-red-600 transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* My Orders Tab */}
          {activeTab === 'orders' && (
            <div className="text-center py-12">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-gradient-to-br from-[#184979] to-[#f26322] rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <svg className="w-7 h-7 md:w-10 md:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-lg md:text-2xl font-bold text-[#184979] mb-1 md:mb-2">View All Your Orders</h3>
              <p className="text-gray-600 mb-3 md:mb-6 text-xs md:text-base">Track, return or buy things again from your order history</p>
              <Link
                href="/orders"
                className="inline-block px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-[#184979] to-[#f26322] text-white rounded-xl font-bold hover:shadow-lg transition-all text-xs md:text-base"
              >
                Go to Orders Page
              </Link>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-[#184979] mb-6">Security Settings</h2>
              
              <div className="space-y-4">
                {/* Phone Number */}
                <div className="p-5 bg-gradient-to-r from-[#184979]/5 to-[#f26322]/5 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-[#184979] mb-1">Phone Number</h3>
                      <p className="text-sm text-gray-600">+91 {user.phone}</p>
                      <p className="text-xs text-gray-500 mt-1">Used for login and OTP verification</p>
                    </div>
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                {/* Account Status */}
                <div className="p-5 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
                  <div className="flex items-center gap-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <h3 className="font-bold text-green-800">Account Verified</h3>
                      <p className="text-sm text-green-700">Your account is secure and verified</p>
                    </div>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="p-5 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-red-800 mb-1">Delete Account</h3>
                      <p className="text-sm text-red-600">Permanently delete your account and all data</p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                          localStorage.removeItem('grabora_user');
                          router.push('/');
                        }
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-all"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
