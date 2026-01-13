'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function MoreMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: '24X7 Support', href: '/support', icon: '💬' },
    { label: 'Track Order', href: '/track-order', icon: '📍' },
    // { label: 'Help Center', href: '/help', icon: '❓' }, // Redirects to /support
    // { label: 'Advertise', href: '/advertise', icon: '📋' }, // Page not available yet
  ];

  return (
    <div 
      className="relative z-[100]"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className="flex items-center space-x-1 text-white hover:text-[#f26322] focus:outline-none transition-colors duration-200"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full w-48 pt-2 z-[100]">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-300 overflow-hidden">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="flex items-center px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 transition-colors"
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
