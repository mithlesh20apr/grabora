'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { PincodeProvider } from '@/contexts/PincodeContext';
import { LoaderProvider } from '@/components/ui/Loader';
import PincodeModal from '@/components/ui/PincodeModal';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show customer header/footer on seller pages
  const isSellerPage = pathname?.startsWith('/seller');

  return (
    <AuthProvider>
      <LoaderProvider>
        <PincodeProvider>
          <CartProvider>
            <WishlistProvider>
              {!isSellerPage && <Header />}
              {children}
              {!isSellerPage && <Footer />}
              <PincodeModal />
            </WishlistProvider>
          </CartProvider>
        </PincodeProvider>
      </LoaderProvider>
    </AuthProvider>
  );
}
