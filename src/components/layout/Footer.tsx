'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [openSection, setOpenSection] = useState<string | null>(null);
  
  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };
  
  return (
    <footer className="relative bg-gradient-to-br from-[#0d2d4a] via-[#184979] to-[#1e5a8f] text-white overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#f26322] rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Diagonal Pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,.1) 35px, rgba(255,255,255,.1) 70px)'
      }}></div>

      <div className="container mx-auto px-4 py-6 md:py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mb-6 md:mb-10">
          {/* About Section */}
          <div className="pb-4 md:pb-0 border-b border-white/10 md:border-0">
            <div className="mb-3 md:mb-6">
              <img src="/logo/auth-dark.svg" alt="Grabora Logo" className="h-8 md:h-10 w-auto drop-shadow-2xl mb-2 md:mb-4" />
            </div>
            <p className="text-white/80 text-xs md:text-sm leading-relaxed mb-3 md:mb-4 hidden md:block">
              Your one-stop shop for all your needs. Quality products, fast delivery, and excellent customer service.
            </p>
            {/* Social Media */}
            <div className="flex items-center gap-2 md:gap-3">
              <Link href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-[#f26322] rounded-full flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </Link>
              <Link href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-[#f26322] rounded-full flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </Link>
              <Link href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-[#f26322] rounded-full flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                </svg>
              </Link>
              <Link href="#" className="w-8 h-8 md:w-10 md:h-10 bg-white/10 hover:bg-[#f26322] rounded-full flex items-center justify-center transition-all hover:scale-110 backdrop-blur-sm">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </Link>
            </div>
          </div>

          {/* Quick Links - Collapsible on mobile */}
          <div>
            <button 
              onClick={() => toggleSection('quickLinks')}
              className="w-full flex items-center justify-between md:cursor-default"
            >
              <h4 className="text-base md:text-xl font-bold mb-0 md:mb-6 relative inline-block">
                Quick Links
                <span className="absolute -bottom-1 left-0 w-8 md:w-12 h-0.5 md:h-1 bg-gradient-to-r from-[#f26322] to-transparent"></span>
              </h4>
              <svg 
                className={`w-5 h-5 md:hidden transition-transform duration-300 ${openSection === 'quickLinks' ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <ul className={`space-y-2 md:space-y-3 mt-3 md:mt-0 overflow-hidden transition-all duration-300 ${openSection === 'quickLinks' ? 'max-h-96' : 'max-h-0 md:max-h-none'}`}>
              <li>
                <Link href="/" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Shop
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Cart
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Wishlist
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  My Profile
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service - Collapsible on mobile */}
          <div>
            <button 
              onClick={() => toggleSection('customerService')}
              className="w-full flex items-center justify-between md:cursor-default"
            >
              <h4 className="text-base md:text-xl font-bold mb-0 md:mb-6 relative inline-block">
                Customer Service
                <span className="absolute -bottom-1 left-0 w-8 md:w-12 h-0.5 md:h-1 bg-gradient-to-r from-[#f26322] to-transparent"></span>
              </h4>
              <svg 
                className={`w-5 h-5 md:hidden transition-transform duration-300 ${openSection === 'customerService' ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <ul className={`space-y-2 md:space-y-3 mt-3 md:mt-0 overflow-hidden transition-all duration-300 ${openSection === 'customerService' ? 'max-h-96' : 'max-h-0 md:max-h-none'}`}>
              <li>
                <Link href="/support" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Help & Support
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Track Order
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Checkout
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-white/80 hover:text-[#f26322] text-xs md:text-sm flex items-center gap-2 transition-all hover:translate-x-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Register
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info - Collapsible on mobile */}
          <div>
            <button 
              onClick={() => toggleSection('contactUs')}
              className="w-full flex items-center justify-between md:cursor-default"
            >
              <h4 className="text-base md:text-xl font-bold mb-0 md:mb-6 relative inline-block">
                Contact Us
                <span className="absolute -bottom-1 left-0 w-8 md:w-12 h-0.5 md:h-1 bg-gradient-to-r from-[#f26322] to-transparent"></span>
              </h4>
              <svg 
                className={`w-5 h-5 md:hidden transition-transform duration-300 ${openSection === 'contactUs' ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <ul className={`space-y-3 md:space-y-4 mt-3 md:mt-0 overflow-hidden transition-all duration-300 ${openSection === 'contactUs' ? 'max-h-96' : 'max-h-0 md:max-h-none'}`}>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] md:text-xs mb-0.5 md:mb-1">Email</p>
                  <p className="text-white/90 text-xs md:text-sm font-medium">support@grabora.com</p>
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] md:text-xs mb-0.5 md:mb-1">Phone</p>
                  <p className="text-white/90 text-xs md:text-sm font-medium">+1 (555) 123-4567</p>
                </div>
              </li>
              <li className="flex items-start gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/60 text-[10px] md:text-xs mb-0.5 md:mb-1">Address</p>
                  <p className="text-white/90 text-xs md:text-sm font-medium">123 Main St, City, Country</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-4 md:pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#f26322] rounded-full animate-pulse"></div>
              <p className="text-white/70 text-xs md:text-sm">
                &copy; {currentYear} <span className="font-bold text-white">Grabora</span>. All rights reserved.
              </p>
            </div>
            <div className="flex items-center gap-3 md:gap-6 text-[10px] md:text-sm">
              <Link href="#" className="text-white/70 hover:text-[#f26322] transition-colors">
                Privacy
              </Link>
              <span className="text-white/30">|</span>
              <Link href="#" className="text-white/70 hover:text-[#f26322] transition-colors">
                Terms
              </Link>
              <span className="text-white/30">|</span>
              <Link href="#" className="text-white/70 hover:text-[#f26322] transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-white/10">
          <div className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
              <div className="flex items-center gap-2 md:gap-4">
                <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h5 className="text-sm md:text-lg font-bold text-white mb-0.5 md:mb-1">Subscribe</h5>
                  <p className="text-white/70 text-[10px] md:text-sm hidden sm:block">Get updates in your inbox</p>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Email"
                    className="px-3 py-2 md:px-4 md:py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-xs md:text-base placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[#f26322] w-full md:w-64"
                  />
                  <button className="px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white text-xs md:text-base font-bold rounded-lg transition-all hover:scale-105 shadow-lg whitespace-nowrap">
                    Go
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
