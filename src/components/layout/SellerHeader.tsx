'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSeller } from '@/contexts/SellerContext';

export default function SellerHeader() {
  const pathname = usePathname();
  const { seller, isAuthenticated, logout } = useSeller();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/seller/orders', label: 'Orders', icon: 'orders' },
    { href: '/seller/products', label: 'Products', icon: 'products' },
    { href: '/seller/inventory', label: 'Inventory', icon: 'inventory' },
    { href: '/seller/payments', label: 'Payments', icon: 'payments' },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  const renderIcon = (icon: string, className: string = 'w-5 h-5') => {
    const icons: Record<string, React.ReactNode> = {
      home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      orders: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
      products: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      inventory: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />,
      payments: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
    };
    return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[icon]}</svg>;
  };

  return (
    <>
      <header className="relative bg-gradient-to-br from-[#184979] via-[#1e5a8f] to-[#0d2d4a] shadow-xl font-sans sticky top-0 z-50">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-10 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-[#f26322] rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        {/* Diagonal Lines Pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)'
        }}></div>

        <div className="relative border-b border-white/10 backdrop-blur-sm">
          <nav className="container mx-auto px-3 sm:px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo & Seller Badge */}
              <div className="flex items-center gap-4">
                <Link href="/seller/dashboard" className="flex items-center gap-3 transform hover:scale-105 transition-transform duration-200">
                  <Image src="/logo/auth-dark.svg" alt="Grabora" width={120} height={35} className="h-8 w-auto drop-shadow-2xl" />
                </Link>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#f26322]/20 border border-[#f26322]/30 rounded-full">
                  <svg className="w-4 h-4 text-[#f26322]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  <span className="text-xs font-semibold text-white/90">Seller Portal</span>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden lg:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive(link.href)
                        ? 'bg-white/20 text-white shadow-lg'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {renderIcon(link.icon, 'w-4 h-4')}
                    {link.label}
                  </Link>
                ))}
              </div>

              {/* Right Section - Profile & Actions */}
              <div className="flex items-center gap-3">
                {/* Quick Actions */}
                <Link
                  href="/seller/products/add"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#f26322] hover:bg-[#e05512] text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-[#f26322]/25"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Product
                </Link>

                {/* Profile Dropdown */}
                {isAuthenticated && (
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                      className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/10 transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#184979] to-[#1e5a8f] flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {seller?.storeName?.charAt(0) || seller?.name?.charAt(0) || 'S'}
                      </div>
                      <div className="hidden md:block text-left">
                        <p className="text-sm font-medium text-white truncate max-w-[120px]">
                          {seller?.storeName || seller?.name || 'Seller'}
                        </p>
                        <p className="text-xs text-white/60">{seller?.isApproved ? 'Verified' : 'Pending'}</p>
                      </div>
                      <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsProfileMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 z-20 overflow-hidden">
                          <div className="p-4 bg-gradient-to-r from-[#184979] to-[#1e5a8f]">
                            <p className="font-semibold text-white truncate">{seller?.storeName || seller?.name || 'Seller'}</p>
                            <p className="text-sm text-white/70 truncate">{seller?.email}</p>
                          </div>
                          <div className="p-2">
                            <button
                              type="button"
                              onClick={async () => {
                                setIsProfileMenuOpen(false);
                                // Defensive: Only navigate if authenticated, else go to login
                                if (isAuthenticated) {
                                  window.location.href = '/seller/profile';
                                } else {
                                  window.location.href = '/seller/login';
                                }
                              }}
                              className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              My Profile
                            </button>
                            <Link
                              href="/seller/kyc"
                              onClick={() => setIsProfileMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              KYC Documents
                            </Link>
                            <Link
                              href="/"
                              onClick={() => setIsProfileMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
                            >
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                              </svg>
                              Visit Store
                            </Link>
                            <div className="border-t border-gray-100 my-2" />
                            <button
                              onClick={() => {
                                setIsProfileMenuOpen(false);
                                logout();
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Logout
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Mobile Menu Toggle */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMobileMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* Mobile Navigation Menu */}
            {isMobileMenuOpen && (
              <div className="lg:hidden mt-4 pt-4 border-t border-white/10">
                <div className="grid grid-cols-2 gap-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(link.href)
                          ? 'bg-white/20 text-white'
                          : 'text-white/70 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {renderIcon(link.icon, 'w-4 h-4')}
                      {link.label}
                    </Link>
                  ))}
                </div>
                <Link
                  href="/seller/products/add"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 mt-3 px-4 py-3 bg-[#f26322] hover:bg-[#e05512] text-white text-sm font-medium rounded-xl transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Product
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
