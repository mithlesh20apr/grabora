export interface Product {
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

export interface SellerInfo {
  sellerId: string;
  storeName: string;
  storeDescription: string;
  storeLogo: string | null;
  avgRating: number;
  totalOrders: number;
  deliveryEta: string;
  isActive?: boolean;
}

export interface SellerStoreData {
  seller: SellerInfo;
  popularProducts: Product[];
  allProducts: Product[];
}

export interface SellerStoreMeta {
  totalProducts: number;
  page: number;
  limit: number;
  totalPages: number;
}
