import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SellerStoreContent from '@/components/seller-store/SellerStoreContent';

interface SellerStorePageProps {
  params: Promise<{
    sellerId: string;
  }>;
  searchParams: Promise<{
    page?: string;
    pincode?: string;
  }>;
}

interface SellerStoreData {
  seller: {
    sellerId: string;
    storeName: string;
    storeDescription: string;
    storeLogo: string | null;
    avgRating: number;
    totalOrders: number;
    deliveryEta: string;
  };
  popularProducts: Product[];
  allProducts: Product[];
}

interface Product {
  id: string;
  title: string;
  slug: string;
  price: string;
  salePrice: string | null;
  mrp: string | null;
  images: string[];
  ratingAvg: string;
  ratingCount: number;
  totalOrders: number;
  stock: number;
  discount: number;
  isNearbySeller?: boolean;
  deliveryEta?: string;
}

interface SellerStoreResponse {
  statusCode: number;
  success: boolean;
  message: string;
  data: SellerStoreData;
  meta: {
    totalProducts: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

async function getSellerStore(
  sellerId: string,
  page: number = 1,
  pincode?: string
): Promise<SellerStoreResponse | null> {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
    });

    if (pincode) {
      params.append('pincode', pincode);
    }

    const response = await fetch(`${apiBaseUrl}/seller/${sellerId}/store?${params.toString()}`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch seller store');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching seller store:', error);
    return null;
  }
}

export async function generateMetadata({ params }: SellerStorePageProps): Promise<Metadata> {
  const { sellerId } = await params;
  const storeData = await getSellerStore(sellerId);

  if (!storeData) {
    return {
      title: 'Seller Not Found | Grabora',
    };
  }

  return {
    title: `${storeData.data.seller.storeName} | Grabora`,
    description: storeData.data.seller.storeDescription || `Shop from ${storeData.data.seller.storeName} - Fast local delivery`,
  };
}

export default async function SellerStorePage({ params, searchParams }: SellerStorePageProps) {
  const { sellerId } = await params;
  const { page, pincode } = await searchParams;
  const pageNumber = page ? parseInt(page) : 1;
  const storeData = await getSellerStore(sellerId, pageNumber, pincode);

  if (!storeData || !storeData.success) {
    notFound();
  }

  return (
    <SellerStoreContent
      initialData={storeData.data}
      meta={storeData.meta}
      sellerId={sellerId}
      initialPincode={pincode}
    />
  );
}
