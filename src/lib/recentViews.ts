// Utility for managing recently viewed products
export interface RecentProduct {
  _id: string;
  title: string;
  slug: string;
  price: number;
  salePrice: number;
  imageUrl: string;
  brand: string;
  viewedAt: number;
}

const STORAGE_KEY = 'grabora_recent_views';
const MAX_RECENT_ITEMS = 10;

export const recentViewsManager = {
  // Add a product to recent views
  addView(product: Omit<RecentProduct, 'viewedAt'>) {
    if (typeof window === 'undefined') return;

    try {
      const existing = this.getRecentViews();
      
      // Remove if already exists (to update timestamp)
      const filtered = existing.filter(item => item._id !== product._id);
      
      // Add new view at the beginning
      const updated = [
        { ...product, viewedAt: Date.now() },
        ...filtered
      ].slice(0, MAX_RECENT_ITEMS);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      
      // Dispatch custom event for components to listen
      window.dispatchEvent(new CustomEvent('recentViewsUpdated'));
    } catch (error) {
    }
  },

  // Get all recent views
  getRecentViews(): RecentProduct[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      
      // Filter out items older than 30 days
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return parsed.filter((item: RecentProduct) => item.viewedAt > thirtyDaysAgo);
    } catch (error) {
      return [];
    }
  },

  // Clear all recent views
  clearRecentViews() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('recentViewsUpdated'));
    } catch (error) {
    }
  },

  // Remove a specific item
  removeView(productId: string) {
    if (typeof window === 'undefined') return;

    try {
      const existing = this.getRecentViews();
      const filtered = existing.filter(item => item._id !== productId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent('recentViewsUpdated'));
    } catch (error) {
    }
  },

  // Prepare data for syncing to database
  getViewsForSync(): {
    productId: string;
    viewedAt: number;
  }[] {
    const views = this.getRecentViews();
    return views.map(view => ({
      productId: view._id,
      viewedAt: view.viewedAt
    }));
  },

  // Sync to database (implement when backend is ready)
  async syncToDatabase(userId?: string) {
    if (typeof window === 'undefined') return;

    try {
      const views = this.getViewsForSync();
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/user/recent-views', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ userId, views })
      // });
      
      
      // After successful sync, you might want to mark items as synced
      // or clear local storage if you're using DB as source of truth
    } catch (error) {
    }
  }
};

// Hook for React components
export function useRecentViews() {
  const [recentViews, setRecentViews] = React.useState<RecentProduct[]>([]);

  React.useEffect(() => {
    // Initial load
    setRecentViews(recentViewsManager.getRecentViews());

    // Listen for updates
    const handleUpdate = () => {
      setRecentViews(recentViewsManager.getRecentViews());
    };

    window.addEventListener('recentViewsUpdated', handleUpdate);
    return () => window.removeEventListener('recentViewsUpdated', handleUpdate);
  }, []);

  return {
    recentViews,
    addView: recentViewsManager.addView.bind(recentViewsManager),
    clearViews: recentViewsManager.clearRecentViews.bind(recentViewsManager),
    removeView: recentViewsManager.removeView.bind(recentViewsManager),
    syncToDatabase: recentViewsManager.syncToDatabase.bind(recentViewsManager)
  };
}

// Add React import at top
import React from 'react';
