// Home page API services with pincode support
import { apiGet } from '@/lib/api';
import { API_BASE_URL } from '@/lib/api';

export interface HomeData {
  banners: any[];
  categories: any[];
  featuredCategories: any[];
  flashSale: any[];
  trendingProducts: any[];
  newArrivals: any[];
  bestSellers: any[];
}

export interface NearbySeller {
  sellerId: string;
  storeName: string;
  storeLogo: string;
  avgRating: number;
  totalOrders: number;
  deliveryEta: string;
}

export interface HighDemandProduct {
  id: string;
  title: string;
  price: string;
  salePrice: string;
  images: string[];
  badge: string;
  orderCount: number;
  deliveryEta: string;
}

/**
 * Fetches home page data with optional pincode
 */
export async function fetchHomeData(pincode?: string | null): Promise<HomeData> {
  try {
    const endpoint = pincode ? `/home?pincode=${pincode}` : '/home';
    const result = await apiGet<HomeData>(endpoint, false);
    return result.data;
  } catch (error) {
    console.error('Failed to fetch home data:', error);
    // Return empty data structure on error
    return {
      banners: [],
      categories: [],
      featuredCategories: [],
      flashSale: [],
      trendingProducts: [],
      newArrivals: [],
      bestSellers: [],
    };
  }
}

/**
 * Fetches nearby sellers based on pincode
 */
export async function fetchNearbySellers(pincode: string): Promise<NearbySeller[]> {
  try {
    const result = await apiGet<NearbySeller[]>(`/seller/nearby?pincode=${pincode}`, false);
    return result.data || [];
  } catch (error) {
    console.error('Failed to fetch nearby sellers:', error);
    return [];
  }
}

/**
 * Fetches high demand products based on pincode
 */
export async function fetchHighDemandProducts(pincode: string): Promise<HighDemandProduct[]> {
  try {
    const result = await apiGet<HighDemandProduct[]>(`/products/high-demand?pincode=${pincode}`, false);
    return result.data || [];
  } catch (error) {
    console.error('Failed to fetch high demand products:', error);
    return [];
  }
}

/**
 * Fetches all pincode-specific data in parallel
 */
export async function fetchPincodeData(pincode: string) {
  try {
    const [homeData, nearbySellers, highDemandProducts] = await Promise.all([
      fetchHomeData(pincode),
      fetchNearbySellers(pincode),
      fetchHighDemandProducts(pincode),
    ]);

    return {
      homeData,
      nearbySellers,
      highDemandProducts,
    };
  } catch (error) {
    console.error('Failed to fetch pincode data:', error);
    return {
      homeData: {
        banners: [],
        categories: [],
        featuredCategories: [],
        flashSale: [],
        trendingProducts: [],
        newArrivals: [],
        bestSellers: [],
      },
      nearbySellers: [],
      highDemandProducts: [],
    };
  }
}
