'use client';

import { usePathname } from 'next/navigation';
import { SellerProvider } from '@/contexts/SellerContext';
import { Toaster } from 'react-hot-toast';
import SellerHeader from '@/components/layout/SellerHeader';

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Don't show header on login/register pages
  const authPages = ['/seller/login', '/seller/register'];
  const isAuthPage = authPages.includes(pathname || '');

  return (
    <SellerProvider>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      {!isAuthPage && <SellerHeader />}
      <main className={isAuthPage ? '' : 'min-h-screen bg-gray-50'}>
        {children}
      </main>
    </SellerProvider>
  );
}
