'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout: authLogout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userName = user?.firstName || user?.fullName?.split(' ')[0] || user?.username || '';
  const isLoggedIn = isAuthenticated;

  // Check if we're in the seller area
  const isSellerArea = pathname?.startsWith('/seller');

  // Detect touch device on mount (client-side only)
  useEffect(() => {
    setIsTouchDevice(!window.matchMedia('(hover: hover)').matches);
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Seller area items - redirect to seller dashboard
  const sellerItems = [
    { label: 'Seller Dashboard', href: '/seller/dashboard', icon: '🏪' },
    { label: 'My Products', href: '/seller/products', icon: '📦' },
    { label: 'Orders', href: '/seller/orders', icon: '📋' },
    { label: 'Seller Profile', href: '/seller/profile', icon: '👤' },
  ];

  // Only show these items when logged in (customer area)
  const loggedInItems = [
    { label: 'Profile', href: '/profile', icon: '👤' },
    { label: 'Orders', href: '/orders', icon: '📦' },
    { label: 'Track Order', href: '/track-order', icon: '📍' },
    { label: 'Wishlist', href: '/wishlist', icon: '❤️' },
    { label: '24×7 Support', href: '/support', icon: '💬' },
    { label: 'FAQs', href: '/support?tab=faq', icon: '❓' },
    // { label: 'Rewards', href: '/rewards', icon: '🎁' }, // Page not available yet
    // { label: 'Gifts', href: '/gifts', icon: '🎉' }, // Page not available yet
  ];

  // Show these items when NOT logged in
  const guestItems = [
    { label: 'Sign Up', href: '/register', icon: '✨' },
    { label: 'Track Order', href: '/track-order', icon: '📍' },
    { label: '24×7 Support', href: '/support', icon: '💬' },
    { label: 'FAQs', href: '/support?tab=faq', icon: '❓' },
  ];

  // Use seller items if in seller area, otherwise use regular logic
  const menuItems = isSellerArea ? sellerItems : (isLoggedIn ? loggedInItems : guestItems);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setIsOpen(false);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    await authLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // Hover handlers - only work on non-touch devices
  const handleMouseEnter = () => {
    if (!isTouchDevice) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <div 
        ref={menuRef}
        className="relative z-[100]"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className="flex items-center space-x-1 text-white hover:text-[#f26322] focus:outline-none font-sans font-medium transition-colors duration-200 p-2 -m-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="hidden lg:block">{userName || 'Account'}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full w-56 pt-2 z-[100]">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-300 overflow-hidden">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center px-5 py-3 text-sm text-gray-800 hover:bg-blue-50 transition-colors"
                >
                  <span className="mr-3 text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
              
              {isLoggedIn && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={handleLogoutClick}
                    className="w-full flex items-center px-5 py-3 text-sm text-red-600 hover:bg-red-50 font-semibold transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
              
              {!isLoggedIn && (
                <div className="border-t border-gray-200 bg-gray-50">
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center px-5 py-3 text-sm text-[#184979] hover:bg-blue-100 font-semibold"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Sign In
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Logout Confirmation Toast - Rendered outside relative container */}
      {showLogoutConfirm && (
        <div 
          className="fixed z-[99999] flex items-center justify-center p-4" 
          style={{ 
            top: 0,
            left: 0, 
            right: 0, 
            bottom: 0,
            margin: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            position: 'fixed',
            width: '100vw',
            height: '100vh'
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border-2 border-gray-200 relative" 
            style={{ zIndex: 100000 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Logout Confirmation</h3>
                <p className="text-sm text-gray-600">Are you sure you want to logout?</p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelLogout}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
