'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WishlistItem {
  _id: string;
  name: string;
  price: number;
  imageUrl: string;
  discount?: number;
  category?: string;
}

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  wishlistCount: number;
  addToWishlist: (item: WishlistItem) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  isInWishlist: (itemId: string) => boolean;
  clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const savedWishlist = localStorage.getItem('grabora_wishlist');
    if (savedWishlist) {
      try {
        setWishlistItems(JSON.parse(savedWishlist));
      } catch (error) {
      }
    }
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('grabora_wishlist', JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const addToWishlist = async (item: WishlistItem): Promise<void> => {
    // Simulate small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setWishlistItems((prevItems) => {
      const exists = prevItems.find((i) => i._id === item._id);
      if (exists) {
        // If already in wishlist, don't add again
        return prevItems;
      }
      return [...prevItems, item];
    });
  };

  const removeFromWishlist = async (itemId: string): Promise<void> => {
    // Simulate small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setWishlistItems((prevItems) => prevItems.filter((item) => item._id !== itemId));
  };

  const isInWishlist = (itemId: string) => {
    return wishlistItems.some((item) => item._id === itemId);
  };

  const clearWishlist = () => {
    setWishlistItems([]);
  };

  const wishlistCount = wishlistItems.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        clearWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
