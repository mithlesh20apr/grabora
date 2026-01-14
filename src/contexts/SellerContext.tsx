'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ==================== TYPE DEFINITIONS ====================

// Address Types
export interface SellerAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
}

// Bank Details
export interface BankDetails {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  isVerified: boolean;
}

// Seller Metrics
export interface SellerMetrics {
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  totalProducts: number;
  returnRate: number;
  pendingOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  thisMonthRevenue?: number;
  totalReviews?: number;
  activeProducts?: number;
  outOfStockProducts?: number;
  onTimeDeliveryRate?: number;
}

// KYC Types
export type KYCStatus = 'not_submitted' | 'incomplete' | 'partial' | 'pending' | 'verified' | 'rejected';

export interface KYCDocument {
  _id: string;
  type: string;
  documentNumber?: string;
  documentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

// Badge Types
export interface Badge {
  type: string;
  name: string;
  description?: string;
  icon?: string;
  awardedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

// Seller Type
export interface Seller {
  _id: string;
  sellerId: string;
  name: string;
  email: string;
  mobile: string;
  storeName: string;
  storeDescription?: string;
  businessType: 'individual' | 'partnership' | 'pvt_ltd' | 'llp' | 'proprietorship';
  logo?: string;
  isApproved: boolean;
  status: 'pending' | 'active' | 'suspended' | 'blocked';
  isKycCompleted: boolean;
  pickupAddress?: SellerAddress;
  businessAddress?: SellerAddress;
  bankDetails?: BankDetails;
  metrics?: SellerMetrics;
  badges?: Badge[];
  createdAt: string;
}

// Product Types
export interface ProductCategory {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  parentId?: string | null;
  level?: number;
  hasTemplate?: boolean;
  children?: Array<{ _id: string; name: string }>;
}

export interface CategoriesResponse {
  categories: ProductCategory[];
  total: number;
}

export interface CategoryTemplateAttribute {
  key: string;
  name: string;
  label?: string;
  type: 'text' | 'select' | 'number' | 'textarea' | 'radio' | 'checkbox' | 'boolean' | 'color' | 'multiselect';
  required: boolean;
  options?: string[];
  isVariant?: boolean;
  priority?: number;
  isFilterable?: boolean;
  unit?: string;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
  };
}

export interface CategoryTemplateSpecField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'textarea' | 'radio' | 'checkbox' | 'boolean' | 'color' | 'multiselect';
  required: boolean;
  options?: string[];
  unit?: string;
}

export interface CategoryTemplateSpecGroup {
  name: string;
  key: string;
  priority: number;
  specs: CategoryTemplateSpecField[];
}

export interface CategoryTemplate {
  _id?: string;
  id?: string;
  categoryId: string;
  categoryName: string;
  attributes: CategoryTemplateAttribute[];
  specificationGroups?: CategoryTemplateSpecGroup[] | null;
  variantAttributes: string[];
  warrantyOptions?: Array<{
    label: string;
    period: string;
  }> | null;
  suggestedHighlights?: string[];
  requiresBrand?: boolean;
  requiresSKU?: boolean;
  seoTitleFormat?: string;
  defaultInTheBox?: string[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductSpecification {
  group: string;
  specs: Array<{ key: string; label: string; value: string }>;
}

export interface ProductWarranty {
  summary: string;
  covered: string;
  period: string;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
}

export interface Product {
  _id: string;
  title: string;
  slug: string;
  sku: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
  price: number;
  salePrice?: number;
  mrp?: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  tags?: string[];
  highlights?: string[];
  specifications?: ProductSpecification[];
  warranty?: ProductWarranty;
  weight?: number;
  dimensions?: ProductDimensions;
  variants?: ProductVariant[];
  status: 'draft' | 'active' | 'archived' | 'out_of_stock';
  categoryId: ProductCategory | string;
  sellerId: string;
  isFlagged?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductVariant {
  sku: string;
  title: string;
  price: number;
  salePrice?: number;
  mrp?: number;
  additionalPrice?: number;
  stock: number;
  images?: string[];
  attributes?: Record<string, string>;
  isActive: boolean;
}

export interface CreateProductData {
  title: string;
  slug?: string;
  sku: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
  categoryId: string;
  price: number;
  salePrice?: number;
  mrp?: number;
  costPrice?: number;
  stock: number;
  lowStockThreshold?: number;
  images: string[];
  tags?: string[];
  highlights?: string[];
  attributes?: Record<string, string>;
  specifications?: ProductSpecification[];
  warranty?: ProductWarranty;
  weight?: number;
  dimensions?: ProductDimensions;
  variants?: ProductVariant[];
  status?: 'draft' | 'active' | 'archived';
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  status?: 'draft' | 'active' | 'archived' | 'out_of_stock';
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isFlagged?: boolean;
  lowStock?: boolean;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Order Types
export interface OrderAddress {
  label?: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
  phone: string;
}

export interface OrderItem {
  productId: string;
  sellerId: string;
  sku: string;
  title: string;
  image: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

export interface OrderStatusHistory {
  status: string;
  timestamp: string;
  updatedBy?: string;
  updatedByType?: 'seller' | 'system' | 'admin';
  notes?: string;
}

export interface OrderFulfillment {
  trackingId?: string | null;
  carrier?: string | null;
  status?: string | null;
}

export interface Order {
  _id: string;
  orderId: string;
  userId: OrderUser;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingCharges: number;
  tax: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  address: OrderAddress;
  fulfillment?: OrderFulfillment;
  statusHistory?: OrderStatusHistory[];
  trackingNumber?: string;
  shippingProvider?: string;
  shippedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  fromDate?: string;
  toDate?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateOrderStatusData {
  status: 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  shippingProvider?: string;
  notes?: string;
}

export interface ShipOrderData {
  trackingNumber: string;
  shippingProvider: string;
}

// Inventory Types
export interface InventoryItem {
  _id: string;
  title: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
  price: number;
  images: string[];
  categoryId: ProductCategory;
  status: 'draft' | 'active' | 'archived' | 'out_of_stock';
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface InventoryFilters {
  page?: number;
  limit?: number;
  lowStock?: boolean;
  outOfStock?: boolean;
  category?: string;
  search?: string;
}

export interface InventoryResponse {
  inventory: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventoryAlertItem {
  _id: string;
  title: string;
  sku: string;
  stock: number;
  lowStockThreshold?: number;
}

export interface InventoryAlertsResponse {
  lowStock: {
    count: number;
    items: InventoryAlertItem[];
  };
  outOfStock: {
    count: number;
    items: InventoryAlertItem[];
  };
}

export interface BulkStockUpdate {
  productId: string;
  stock: number;
  lowStockThreshold?: number;
}

// Wallet/Payment Types
export interface Wallet {
  _id: string;
  sellerId: string;
  sellerCode: string;
  availableBalance: number;
  onHoldBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  totalCommissionPaid: number;
  totalRefunds: number;
  pendingSettlement: number;
  minimumWithdrawal: number;
  lastSettlementDate?: string;
  lastWithdrawalDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  _id: string;
  transactionId: string;
  walletId: string;
  sellerId: string;
  sellerCode: string;
  type: 'credit' | 'debit' | 'withdrawal' | 'refund' | 'commission' | 'adjustment' | 'bonus' | 'penalty';
  category: string;
  amount: number;
  description: string;
  orderId?: string;
  orderNumber?: string;
  balanceBefore: number;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  type?: string;
  status?: 'pending' | 'completed' | 'failed';
  fromDate?: string;
  toDate?: string;
}

export interface TransactionsResponse {
  transactions: WalletTransaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Settlement {
  _id: string;
  settlementId: string;
  sellerId: string;
  sellerCode: string;
  walletId: string;
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  grossAmount: number;
  commission: number;
  commissionRate?: number;
  tds?: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod?: string;
  bankDetails?: {
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  transactionId?: string;
  paidAt?: string;
  createdAt: string;
  orderItems?: Array<{
    orderId: string;
    orderNumber: string;
    orderAmount: number;
    commission: number;
    netAmount: number;
    deliveredAt: string;
  }>;
}

export interface SettlementFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  fromDate?: string;
  toDate?: string;
}

export interface SettlementsResponse {
  settlements: Settlement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EarningsSummary {
  period: string;
  wallet: {
    currentBalance: number;
    pendingBalance: number;
    totalEarnings: number;
    totalWithdrawn: number;
  };
  periodStats: {
    earnings: number;
    transactions: number;
    deliveredOrders: number;
    salesValue: number;
  };
}

// Dashboard Types
interface DashboardData {
  seller: {
    storeName: string;
    sellerId: string;
    isApproved: boolean;
    status: string;
    metrics: SellerMetrics;
    badges: Badge[];
    activeBadges: Badge[];
  };
}

interface BadgesData {
  currentBadges: Badge[];
  eligibleBadges: Array<{
    type: string;
    name: string;
    description?: string;
    requirements: Record<string, number>;
    currentProgress?: Record<string, number>;
    eligible: boolean;
    missingRequirements?: string[];
  }>;
}

// Auth Types
interface RegisterData {
  name: string;
  email: string;
  mobile: string;
  password: string;
  storeName: string;
  storeDescription?: string;
  businessType?: string;
}

interface UpdateProfileData {
  name?: string;
  storeName?: string;
  storeDescription?: string;
  businessType?: string;
  logo?: string;
  pickupAddress?: SellerAddress;
  businessAddress?: SellerAddress;
}

interface BankDetailsData {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
}

// API Result Types
interface ApiResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

// ==================== CONTEXT TYPE ====================

interface SellerContextType {
  seller: Seller | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApproved: boolean;
  kycStatus: KYCStatus | null;
  kycDocuments: KYCDocument[];
  
  // Auth actions
  apiCall: (endpoint: string, options?: RequestInit, isFormData?: boolean) => Promise<Response>;
  register: (data: RegisterData) => Promise<ApiResult>;
  login: (email: string, password: string) => Promise<ApiResult>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  
  // Profile actions
  getProfile: () => Promise<Seller | null>;
  updateProfile: (data: UpdateProfileData) => Promise<ApiResult>;
  updateBankDetails: (data: BankDetailsData) => Promise<ApiResult>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<ApiResult>;
  
  // KYC actions
  submitKYCDocument: (type: string, documentNumber: string, document: File) => Promise<ApiResult>;
  getKYCStatus: () => Promise<{ status: KYCStatus; documents: KYCDocument[] } | null>;
  
  // Dashboard
  getDashboard: () => Promise<DashboardData | null>;
  getBadges: () => Promise<BadgesData | null>;
  
  // Category APIs
  getCategories: (search?: string) => Promise<ProductCategory[]>;
  getCategory: (id: string) => Promise<ProductCategory | null>;
  getCategoryTemplate: (categoryId: string) => Promise<CategoryTemplate | null>;
  
  // Product APIs
  getProducts: (filters?: ProductFilters) => Promise<ProductsResponse | null>;
  getProduct: (id: string) => Promise<Product | null>;
  createProduct: (data: CreateProductData) => Promise<ApiResult<{ product: Product }>>;
  updateProduct: (id: string, data: Partial<CreateProductData>) => Promise<ApiResult<{ product: Product }>>;
  deleteProduct: (id: string) => Promise<ApiResult>;
  updateProductStock: (id: string, stock: number, lowStockThreshold?: number) => Promise<ApiResult<{ product: Product }>>;
  
  // Order APIs
  getOrders: (filters?: OrderFilters) => Promise<OrdersResponse | null>;
  getOrder: (id: string) => Promise<Order | null>;
  updateOrderStatus: (id: string, data: UpdateOrderStatusData) => Promise<ApiResult<{ order: Order }>>;
  shipOrder: (id: string, data: ShipOrderData) => Promise<ApiResult<{ order: Order }>>;
  
  // Inventory APIs
  getInventory: (filters?: InventoryFilters) => Promise<InventoryResponse | null>;
  getInventoryAlerts: () => Promise<InventoryAlertsResponse | null>;
  bulkUpdateStock: (updates: BulkStockUpdate[]) => Promise<ApiResult>;
  
  // Wallet/Payment APIs
  getWallet: () => Promise<Wallet | null>;
  getTransactions: (filters?: TransactionFilters) => Promise<TransactionsResponse | null>;
  requestWithdrawal: (amount: number, bankAccountId: string) => Promise<ApiResult>;
  getSettlements: (filters?: SettlementFilters) => Promise<SettlementsResponse | null>;
  getSettlement: (id: string) => Promise<Settlement | null>;
  getEarningsSummary: (period?: string) => Promise<EarningsSummary | null>;
}

// ==================== CONTEXT ====================

const SellerContext = createContext<SellerContextType | undefined>(undefined);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
const SELLER_API_URL = `${API_BASE_URL}/seller`;

export function SellerProvider({ children }: { children: React.ReactNode }) {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const router = useRouter();

  const isAuthenticated = !!seller && !!accessToken;
  const isApproved = seller?.isApproved ?? false;

  // Load seller data from sessionStorage on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }
    
    const storedToken = sessionStorage.getItem('sellerToken');
    const storedRefreshToken = sessionStorage.getItem('sellerRefreshToken');
    const storedSeller = sessionStorage.getItem('seller');

    if (storedToken && storedSeller) {
      try {
        setAccessToken(storedToken);
        setRefreshTokenValue(storedRefreshToken);
        setSeller(JSON.parse(storedSeller));
      } catch {
        sessionStorage.removeItem('sellerToken');
        sessionStorage.removeItem('sellerRefreshToken');
        sessionStorage.removeItem('seller');
      }
    }
    setIsLoading(false);
  }, []);

  // Helper function for API calls (client-side only)
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}, isFormData: boolean = false) => {
    // Guard for SSR
    if (typeof window === 'undefined') {
      throw new Error('API calls can only be made on the client side');
    }
    
    const token = sessionStorage.getItem('sellerToken');
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${SELLER_API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Check for token expiration
    if (response.status === 401) {
      const result = await response.clone().json();
      if (result.message === 'Token expired' || result.message === 'Invalid token' || result.message === 'Unauthorized') {
        // Try to refresh token
        const refreshed = await refreshToken();
        if (refreshed) {
          // Retry original request with new token
          const newToken = sessionStorage.getItem('sellerToken');
          if (newToken) headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${SELLER_API_URL}${endpoint}`, {
            ...options,
            headers,
          });
          return retryResponse;
        } else {
          // Clear session and redirect to login
          sessionStorage.removeItem('sellerToken');
          sessionStorage.removeItem('sellerRefreshToken');
          sessionStorage.removeItem('seller');
          setSeller(null);
          setAccessToken(null);
          setRefreshTokenValue(null);
          router.push('/seller/login');
          return response;
        }
      }
    }

    return response;
  }, [router]);

  // Helper to build query string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildQueryString = (params: Record<string, any>): string => {
    const filtered = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (filtered.length === 0) return '';
    return '?' + filtered.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  };

  // ==================== AUTH METHODS ====================

  const register = async (data: RegisterData): Promise<ApiResult> => {
    try {
      const response = await fetch(`${SELLER_API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Handle both response formats: nested tokens or flat structure
        const sellerData = result.data.seller;
        const token = result.data.tokens?.accessToken || result.data.accessToken;
        const refresh = result.data.tokens?.refreshToken || result.data.refreshToken;

        if (!token || !refresh || !sellerData) {
          return { success: false, message: 'Invalid response format from server' };
        }

        // Store in sessionStorage first before updating state
        sessionStorage.setItem('sellerToken', token);
        sessionStorage.setItem('sellerRefreshToken', refresh);
        sessionStorage.setItem('seller', JSON.stringify(sellerData));

        // Then update state
        setSeller(sellerData);
        setAccessToken(token);
        setRefreshTokenValue(refresh);

        return { success: true, message: result.message || 'Registration successful' };
      }

      return { success: false, message: result.message || 'Registration failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const login = async (email: string, password: string): Promise<ApiResult> => {
    try {
      const response = await fetch(`${SELLER_API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Handle both response formats: nested tokens or flat structure
        const sellerData = result.data.seller;
        const token = result.data.tokens?.accessToken || result.data.accessToken;
        const refresh = result.data.tokens?.refreshToken || result.data.refreshToken;

        if (!token || !refresh || !sellerData) {
          return { success: false, message: 'Invalid response format from server' };
        }

        // Store in sessionStorage first before updating state
        sessionStorage.setItem('sellerToken', token);
        sessionStorage.setItem('sellerRefreshToken', refresh);
        sessionStorage.setItem('seller', JSON.stringify(sellerData));

        // Then update state
        setSeller(sellerData);
        setAccessToken(token);
        setRefreshTokenValue(refresh);

        return { success: true, message: result.message || 'Login successful' };
      }

      return { success: false, message: result.message || 'Login failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiCall('/logout', { method: 'POST' });
    } catch {
      // Ignore errors
    } finally {
      setSeller(null);
      setAccessToken(null);
      setRefreshTokenValue(null);
      setKycStatus(null);
      setKycDocuments([]);
      
      sessionStorage.removeItem('sellerToken');
      sessionStorage.removeItem('sellerRefreshToken');
      sessionStorage.removeItem('seller');
      
      router.push('/seller/login');
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') return false;
      
      const storedRefreshToken = sessionStorage.getItem('sellerRefreshToken');
      if (!storedRefreshToken) return false;

      const response = await fetch(`${SELLER_API_URL}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const { accessToken: newToken, refreshToken: newRefresh } = result.data;
        
        setAccessToken(newToken);
        setRefreshTokenValue(newRefresh);
        
        sessionStorage.setItem('sellerToken', newToken);
        sessionStorage.setItem('sellerRefreshToken', newRefresh);
        
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  // ==================== PROFILE METHODS ====================

  const getProfile = useCallback(async (): Promise<Seller | null> => {
    try {
      const response = await apiCall('/profile');
      const result = await response.json();

      if (result.success && result.data) {
        // Map API response to Seller model
        const apiSeller = result.data;
        const sellerObj: Seller = {
          _id: apiSeller.id || apiSeller._id || '',
          sellerId: apiSeller.sellerId || '',
          name: apiSeller.name || '',
          email: apiSeller.email || '',
          mobile: apiSeller.mobile || '',
          storeName: apiSeller.storeName || '',
          storeDescription: apiSeller.storeDescription || '',
          businessType: apiSeller.businessType || 'individual',
          logo: apiSeller.storeLogo || apiSeller.logo || undefined,
          isApproved: !!apiSeller.isApproved,
          status: apiSeller.status || 'pending',
          isKycCompleted: !!apiSeller.isKycCompleted,
          pickupAddress: apiSeller.pickupAddress || undefined,
          businessAddress: apiSeller.businessAddress || undefined,
          bankDetails: apiSeller.bankDetails || undefined,
          metrics: apiSeller.metrics || undefined,
          badges: apiSeller.badges || undefined,
          createdAt: apiSeller.createdAt || '',
        };
        setSeller(sellerObj);
        sessionStorage.setItem('seller', JSON.stringify(sellerObj));
        if (apiSeller.kycStatus) {
          setKycStatus(apiSeller.kycStatus);
        }
        return sellerObj;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const updateProfile = async (data: UpdateProfileData): Promise<ApiResult> => {
    try {
      const response = await apiCall('/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data?.seller) {
        const updatedSeller = { ...seller, ...result.data.seller } as Seller;
        setSeller(updatedSeller);
        sessionStorage.setItem('seller', JSON.stringify(updatedSeller));
        return { success: true, message: result.message || 'Profile updated successfully' };
      }

      return { success: false, message: result.message || 'Update failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const updateBankDetails = async (data: BankDetailsData): Promise<ApiResult> => {
    try {
      const response = await apiCall('/bank-details', {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data?.bankDetails) {
        const updatedSeller = { ...seller, bankDetails: result.data.bankDetails } as Seller;
        setSeller(updatedSeller);
        sessionStorage.setItem('seller', JSON.stringify(updatedSeller));
        return { success: true, message: result.message || 'Bank details updated successfully' };
      }

      return { success: false, message: result.message || 'Update failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<ApiResult> => {
    try {
      const response = await apiCall('/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        return { success: true, message: result.message || 'Password changed successfully' };
      }

      return { success: false, message: result.message || 'Password change failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // ==================== KYC METHODS ====================

  const submitKYCDocument = async (type: string, documentNumber: string, document: File): Promise<ApiResult> => {
    try {
      const formData = new FormData();
      formData.append('type', type);
      formData.append('documentNumber', documentNumber);
      formData.append('document', document);

      const response = await apiCall('/kyc/document', {
        method: 'POST',
        body: formData,
      }, true);

      const result = await response.json();

      if (result.success) {
        if (result.data?.kycDocuments) {
          setKycDocuments(result.data.kycDocuments);
        }
        if (result.data?.kycStatus) {
          setKycStatus(result.data.kycStatus);
        }
        return { success: true, message: result.message || 'Document submitted successfully' };
      }

      return { success: false, message: result.message || 'Submission failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const getKYCStatus = useCallback(async (): Promise<{ status: KYCStatus; documents: KYCDocument[] } | null> => {
    try {
      const response = await apiCall('/kyc/status');
      const result = await response.json();

      if (result.success && result.data) {
        // Support both documents and kycDocuments from backend
        const docs = result.data.documents || result.data.kycDocuments || [];
        setKycStatus(result.data.kycStatus);
        setKycDocuments(docs);

        setSeller(prevSeller => {
          if (prevSeller) {
            const updatedSeller = { ...prevSeller, isKycCompleted: result.data.isKycCompleted };
            sessionStorage.setItem('seller', JSON.stringify(updatedSeller));
            return updatedSeller;
          }
          return prevSeller;
        });

        return {
          status: result.data.kycStatus,
          documents: docs,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  // ==================== DASHBOARD METHODS ====================

  const getDashboard = useCallback(async (): Promise<DashboardData | null> => {
    try {
      const response = await apiCall('/dashboard');
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const getBadges = useCallback(async (): Promise<BadgesData | null> => {
    try {
      const response = await apiCall('/badges');
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }

      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  // ==================== CATEGORY METHODS ====================

  /**
   * Fetch categories, optionally filtered by search text
   * @param search Optional search string
   */
  const getCategories = useCallback(async (search?: string): Promise<ProductCategory[]> => {
    try {
      let url = '/categories?flat=true';
      if (search && search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }
      const response = await apiCall(url);
      const result = await response.json();

      // Normalize category fields for compatibility
      const normalizeCategory = (cat: any): ProductCategory => ({
        _id: cat._id || cat.id || '',
        name: cat.name,
        slug: cat.slug,
        image: cat.image || cat.imageUrl || null,
        parentId: cat.parentId ?? null,
        level: cat.level,
        hasTemplate: cat.hasTemplate,
        children: cat.children,
      });

      let categories: any[] = [];
      if (result.success && Array.isArray(result.data)) {
        categories = result.data;
      } else if (result.success && result.data?.categories) {
        categories = result.data.categories;
      } else if (result.success && Array.isArray(result.data?.data)) {
        categories = result.data.data;
      }

      return categories.map(normalizeCategory);
    } catch {
      return [];
    }
  }, [apiCall]);

  const getCategory = useCallback(async (id: string): Promise<ProductCategory | null> => {
    try {
      const response = await apiCall(`/categories/${id}`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const getCategoryTemplate = useCallback(async (categoryId: string): Promise<CategoryTemplate | null> => {
    try {
      const response = await apiCall(`/category-templates/${categoryId}`);
      const result = await response.json();

      console.log('🌐 API Response for category template:', result);
      console.log('📦 result.data:', result.data);
      console.log('📦 result.data.template:', result.data?.template);

      if (result.success && result.data) {
        // Handle both response formats: result.data.template or result.data directly
        const template = result.data.template || result.data;
        console.log('✅ Returning template:', template);
        return template;
      }
      console.log('❌ No valid template data found');
      return null;
    } catch (error) {
      console.error('❌ Error fetching category template:', error);
      return null;
    }
  }, [apiCall]);

  // ==================== PRODUCT METHODS ====================

  const getProducts = useCallback(async (filters?: ProductFilters): Promise<ProductsResponse | null> => {
    try {
      const query = buildQueryString(filters || {});
      const response = await apiCall(`/products${query}`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const getProduct = useCallback(async (id: string): Promise<Product | null> => {
    try {
      const response = await apiCall(`/products/${id}`);
      const result = await response.json();

      if (result.success && result.data?.product) {
        return result.data.product;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const createProduct = async (data: CreateProductData): Promise<ApiResult<{ product: Product }>> => {
    try {
      const response = await apiCall('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data?.product) {
        return { success: true, message: result.message || 'Product created', data: { product: result.data.product } };
      }

      return { success: false, message: result.message || 'Failed to create product' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const updateProduct = async (id: string, data: Partial<CreateProductData>): Promise<ApiResult<{ product: Product }>> => {
    try {
      const response = await apiCall(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data?.product) {
        return { success: true, message: result.message || 'Product updated', data: { product: result.data.product } };
      }

      return { success: false, message: result.message || 'Failed to update product' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const deleteProduct = async (id: string): Promise<ApiResult> => {
    try {
      const response = await apiCall(`/products/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        return { success: true, message: result.message || 'Product deleted' };
      }

      return { success: false, message: result.message || 'Failed to delete product' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const updateProductStock = async (id: string, stock: number, lowStockThreshold?: number): Promise<ApiResult<{ product: Product }>> => {
    try {
      const body: { stock: number; lowStockThreshold?: number } = { stock };
      if (lowStockThreshold !== undefined) {
        body.lowStockThreshold = lowStockThreshold;
      }

      const response = await apiCall(`/products/${id}/stock`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success && result.data?.product) {
        return { success: true, message: result.message || 'Stock updated', data: { product: result.data.product } };
      }

      return { success: false, message: result.message || 'Failed to update stock' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // ==================== ORDER METHODS ====================

  const getOrders = useCallback(async (filters?: OrderFilters): Promise<OrdersResponse | null> => {
    try {
      const query = buildQueryString(filters || {});
      const response = await apiCall(`/orders${query}`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const getOrder = useCallback(async (id: string): Promise<Order | null> => {
    try {
      const response = await apiCall(`/orders/${id}`);
      const result = await response.json();

      if (result.success && result.data?.order) {
        return result.data.order;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const updateOrderStatus = async (id: string, data: UpdateOrderStatusData): Promise<ApiResult<{ order: Order }>> => {
    try {
      const response = await apiCall(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data?.order) {
        return { success: true, message: result.message || 'Order status updated', data: { order: result.data.order } };
      }

      return { success: false, message: result.message || 'Failed to update order status' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const shipOrder = async (id: string, data: ShipOrderData): Promise<ApiResult<{ order: Order }>> => {
    try {
      const response = await apiCall(`/orders/${id}/ship`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success && result.data?.order) {
        return { success: true, message: result.message || 'Order marked as shipped', data: { order: result.data.order } };
      }

      return { success: false, message: result.message || 'Failed to ship order' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // ==================== INVENTORY METHODS ====================

  const getInventory = useCallback(async (filters?: InventoryFilters): Promise<InventoryResponse | null> => {
    try {
      const query = buildQueryString(filters || {});
      const response = await apiCall(`/inventory${query}`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const getInventoryAlerts = useCallback(async (): Promise<InventoryAlertsResponse | null> => {
    try {
      const response = await apiCall('/inventory/alerts');
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const bulkUpdateStock = async (updates: BulkStockUpdate[]): Promise<ApiResult> => {
    try {
      const response = await apiCall('/inventory/bulk-update', {
        method: 'PATCH',
        body: JSON.stringify({ updates }),
      });

      const result = await response.json();

      if (result.success) {
        return { success: true, message: result.message || 'Bulk update completed', data: result.data };
      }

      return { success: false, message: result.message || 'Bulk update failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // ==================== WALLET/PAYMENT METHODS ====================

  const getWallet = useCallback(async (): Promise<Wallet | null> => {
    try {
      const response = await apiCall('/wallet');
      const result = await response.json();

      if (result.success && result.data?.wallet) {
        return result.data.wallet;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const getTransactions = useCallback(async (filters?: TransactionFilters): Promise<TransactionsResponse | null> => {
    try {
      const query = buildQueryString(filters || {});
      const response = await apiCall(`/wallet/transactions${query}`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const requestWithdrawal = async (amount: number, bankAccountId: string): Promise<ApiResult> => {
    try {
      const response = await apiCall('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, bankAccountId }),
      });

      const result = await response.json();

      if (result.success) {
        return { success: true, message: result.message || 'Withdrawal request submitted', data: result.data };
      }

      return { success: false, message: result.message || 'Withdrawal request failed' };
    } catch {
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const getSettlements = useCallback(async (filters?: SettlementFilters): Promise<SettlementsResponse | null> => {
    try {
      const query = buildQueryString(filters || {});
      const response = await apiCall(`/settlements${query}`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const getSettlement = useCallback(async (id: string): Promise<Settlement | null> => {
    try {
      const response = await apiCall(`/settlements/${id}`);
      const result = await response.json();

      if (result.success && result.data?.settlement) {
        return result.data.settlement;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  const getEarningsSummary = useCallback(async (period?: string): Promise<EarningsSummary | null> => {
    try {
      const query = period ? `?period=${period}` : '';
      const response = await apiCall(`/earnings/summary${query}`);
      const result = await response.json();

      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [apiCall]);

  // Suppress unused variable warnings
  void refreshTokenValue;

  return (
    <SellerContext.Provider
      value={{
        seller,
        accessToken,
        isAuthenticated,
        isLoading,
        isApproved,
        kycStatus,
        kycDocuments,
        register,
        login,
        logout,
        refreshToken,
        getProfile,
        updateProfile,
        updateBankDetails,
        changePassword,
        submitKYCDocument,
        getKYCStatus,
        getDashboard,
        getBadges,
        // Categories
        getCategories,
        getCategory,
        getCategoryTemplate,
        // Products
        getProducts,
        getProduct,
        createProduct,
        updateProduct,
        deleteProduct,
        updateProductStock,
        // Orders
        getOrders,
        getOrder,
        updateOrderStatus,
        shipOrder,
        // Inventory
        getInventory,
        getInventoryAlerts,
        bulkUpdateStock,
        // Wallet/Payments
        getWallet,
        getTransactions,
        requestWithdrawal,
        getSettlements,
        getSettlement,
        getEarningsSummary,
        apiCall,
      }}
    >
      {children}
    </SellerContext.Provider>
  );
}

export function useSeller() {
  const context = useContext(SellerContext);
  if (context === undefined) {
    throw new Error('useSeller must be used within a SellerProvider');
  }
  return context;
}
