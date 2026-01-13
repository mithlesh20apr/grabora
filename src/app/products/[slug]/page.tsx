'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import ProductImageGallery from '@/components/products/ProductImageGallery';
import ProductCard from '@/components/home/ProductCard';
import RecentlyViewed from '@/components/products/RecentlyViewed';
import { recentViewsManager } from '@/lib/recentViews';
import { useCart } from '@/contexts/CartContext';
import { useLoader } from '@/components/ui/Loader';
import { optimizeImages, filesToDataURLs, validateImageFile } from '@/lib/imageOptimizer';

// Flexible variant attributes interface
interface VariantAttributes {
  color?: string;
  size?: string;
  storage?: string;
  ram?: string;
  [key: string]: string | undefined; // Allow any additional attributes
}

// Updated Variant interface to match new API response
interface ProductVariant {
  _id: string;
  sku: string;
  slug?: string; // Variant-specific slug from API
  attributes: VariantAttributes;
  images?: string[]; // Variant-specific images
  price: number;
  salePrice?: number;
  mrp?: number;
  additionalPrice?: number; // Legacy support
  title?: string; // Variant-specific title
  stock: number;
  active: boolean;
}

// Product attributes interface
interface ProductAttributes {
  material?: string;
  fitType?: string;
  pattern?: string;
  sleeveType?: string;
  collarType?: string;
  occasion?: string;
  washCare?: string;
  countryOfOrigin?: string;
  processor?: string;
  ram?: string;
  storage?: string;
  screenSize?: string;
  battery?: string;
  os?: string;
  [key: string]: string | undefined;
}

// Types matching API response
interface Product {
  _id: string;
  title: string;
  slug: string;
  sku?: string;
  shortDescription: string;
  description: string;
  brand: string;
  categoryId: string | { _id: string; name: string; slug: string; imageUrl?: string };
  tags: string[];
  price: number;
  salePrice?: number;
  mrp?: number;
  costPrice?: number;
  stock?: number;
  lowStockThreshold?: number;
  images: string[];
  variants: ProductVariant[];
  ratingAvg: number;
  ratingCount: number;
  attributes?: ProductAttributes;
  status: string;
  discount?: number;
  totalOrders: number;
  flashSale?: boolean;
  isFeatured?: boolean;
  inStock?: boolean;
  availableStock?: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  createdAt: string;
  updatedAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();
  const { addToCart, updateQuantity, clearCart } = useCart();
  const { showLoader, hideLoader } = useLoader();
  
  // Store the original slug and current variantId
  const originalSlugRef = useRef<string | null>(null);
  const currentVariantIdRef = useRef<string | null>(null);
  const initialFetchDoneRef = useRef(false);
  const isVariantChangeRef = useRef(false); // Track intentional variant changes
  
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };
  const [userPincode, setUserPincode] = useState('');
  const [deliveryEstimate, setDeliveryEstimate] = useState<any>(null);
  const [isCheckingDelivery, setIsCheckingDelivery] = useState(false);
  const [deliveryChecked, setDeliveryChecked] = useState(false);

  // Initial fetch on mount - only runs once
  useEffect(() => {
    // Skip if already fetched in this component instance
    if (initialFetchDoneRef.current) {
      console.log('[Initial useEffect] Already fetched, skipping');
      return;
    }
    
    // Get slug from URL path directly to avoid dependency issues
    const pathParts = window.location.pathname.split('/');
    const slugFromPath = decodeURIComponent(pathParts[pathParts.length - 1]);
    
    console.log('[Initial useEffect] Slug from path:', slugFromPath);
    
    if (!slugFromPath) return;
    
    // Mark as done immediately to prevent double calls
    initialFetchDoneRef.current = true;
    
    // Store the original slug
    originalSlugRef.current = slugFromPath;
    console.log('[Initial useEffect] Set originalSlugRef to:', originalSlugRef.current);
    
    // Get variantId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const variantId = urlParams.get('variantId');
    
    async function initialFetch() {
      setLoading(true);
      console.log('[Initial Fetch] Starting fetch for slug:', slugFromPath, 'variantId:', variantId);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        const url = variantId 
          ? `${apiBaseUrl}/products/slug/${encodeURIComponent(slugFromPath)}?variantId=${variantId}`
          : `${apiBaseUrl}/products/slug/${encodeURIComponent(slugFromPath)}`;
        
        console.log('[Initial Fetch] URL:', url);
        const response = await fetch(url, { cache: 'no-store' });
        
        if (!response.ok) {
          console.error('[Initial Fetch] Response not OK:', response.status);
          throw new Error('Product not found');
        }
        
        const result = await response.json();
        console.log('[Initial Fetch] Got result, success:', result.success, 'has data:', !!result.data);
        
        if (result.success && result.data) {
          console.log('[Initial Fetch] Setting product:', result.data.title);
          console.log('[Initial Fetch] Variants count:', result.data.variants?.length);
          setProduct(result.data);
          currentVariantIdRef.current = variantId || null;
          
          // Update selected variant state if selectedVariant is returned
          if (result.data.selectedVariant) {
            console.log('[Initial Fetch] Selected variant:', result.data.selectedVariant.attributes?.color);
            setSelectedVariant(result.data.selectedVariant);
            setSelectedColor(result.data.selectedVariant.attributes?.color || '');
            setSelectedStorage(result.data.selectedVariant.attributes?.storage || '');
            setSelectedRam(result.data.selectedVariant.attributes?.ram || '');
            
            const sizeValue = result.data.selectedVariant.attributes?.size || '';
            if (sizeValue.includes(',')) {
              setSelectedSize(sizeValue.split(',')[0].trim());
            } else {
              setSelectedSize(sizeValue);
            }
          }
        }
      } catch (error) {
        console.error('[Initial Fetch] Error:', error);
        // Show error state instead of redirecting
        setProduct(null);
      } finally {
        setLoading(false);
        hideLoader();
      }
    }
    
    initialFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array - run only once on mount

  // Function to fetch product with variant (called on color change)
  const fetchProductWithVariant = async (variantId: string) => {
    const slugToFetch = originalSlugRef.current;
    if (!slugToFetch) {
      console.log('[Variant Fetch] No slug available');
      return;
    }
    
    // Prevent duplicate variant fetches for same variant
    if (currentVariantIdRef.current === variantId) {
      console.log('[Variant Fetch] Same variant ID, skipping:', variantId);
      return;
    }
    
    // Mark that this is an intentional variant change - prevents useEffect from resetting states
    isVariantChangeRef.current = true;
    
    console.log('[Variant Fetch] Fetching variant:', variantId, 'for slug:', slugToFetch);
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const url = `${apiBaseUrl}/products/slug/${encodeURIComponent(slugToFetch)}?variantId=${variantId}`;
      
      console.log('[Variant Fetch] URL:', url);
      const response = await fetch(url, { cache: 'no-store' });
      
      if (!response.ok) {
        console.error('[Variant Fetch] Response not OK:', response.status);
        throw new Error('Product not found');
      }
      
      const result = await response.json();
      console.log('[Variant Fetch] Result success:', result.success, 'Title:', result.data?.title, 'Slug:', result.data?.slug);
      
      if (result.success && result.data) {
        // Update the variant ID ref BEFORE setting product to prevent re-fetches
        currentVariantIdRef.current = variantId;
        
        console.log('[Variant Fetch] Setting product data:', {
          title: result.data.title,
          price: result.data.price,
          salePrice: result.data.salePrice,
          imagesCount: result.data.images?.length,
          selectedVariantColor: result.data.selectedVariant?.attributes?.color
        });
        
        // Set product first - images are already merged at product.images level by API
        setProduct(result.data);
        
        // Update variant-related states
        if (result.data.selectedVariant) {
          const newColor = result.data.selectedVariant.attributes?.color || '';
          console.log('[Variant Fetch] Setting selectedColor to:', newColor);
          setSelectedVariant(result.data.selectedVariant);
          setSelectedColor(newColor);
          setSelectedStorage(result.data.selectedVariant.attributes?.storage || '');
          setSelectedRam(result.data.selectedVariant.attributes?.ram || '');
          
          const sizeValue = result.data.selectedVariant.attributes?.size || '';
          if (sizeValue.includes(',')) {
            setSelectedSize(sizeValue.split(',')[0].trim());
          } else {
            setSelectedSize(sizeValue);
          }
          
          // Reset image index to show first image of new variant
          setSelectedImageIndex(0);
        }
        
        // Update URL with the slug from the API response
        if (result.data.slug) {
          const newUrl = `/products/${result.data.slug}?variantId=${variantId}`;
          window.history.replaceState({}, '', newUrl);
          console.log('[Variant Fetch] Updated URL to:', newUrl);
        }
        
        // Update document title
        if (result.data.title) {
          document.title = `${result.data.title} | Grabora`;
        }
      }
    } catch (error) {
      console.error('[Variant Fetch] Error:', error);
    }
  };

  // Fetch reviews from API
  useEffect(() => {
    async function fetchReviews() {
      if (!product?._id) return;
      
      setReviewsLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        const token = sessionStorage.getItem('token');
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${apiBaseUrl}/products/${product._id}/reviews`, {
          headers,
          cache: 'no-store',
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.reviews) {
            // Transform API reviews to match component structure
            const reviewsData = result.data.reviews.map((review: any) => {
              // userId might be a string ID or object, handle both cases
              let userName = 'Anonymous';
              let userAvatar = 'A';
              
              if (typeof review.userId === 'object' && review.userId !== null) {
                userName = review.userId.firstName || review.userId.username || 'Anonymous';
                userAvatar = (review.userId.firstName?.[0] || review.userId.username?.[0] || 'A').toUpperCase();
              } else {
                // If userId is just an ID string, use default
                userName = 'Verified Buyer';
                userAvatar = 'VB';
              }
              
              return {
                id: review._id,
                _id: review._id,
                name: userName,
                avatar: userAvatar,
                rating: review.rating,
                date: new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                verified: review.status === 'approved',
                title: review.title,
                review: review.comment,
                comment: review.comment,
                helpful: review.helpfulCount || 0,
                helpfulCount: review.helpfulCount || 0,
                images: review.images || []
              };
            });
            setReviews(reviewsData);
          } else {
            setReviews([]);
          }
        } else {
          setReviews([]);
        }
      } catch (error) {
      } finally {
        setReviewsLoading(false);
      }
    }
    
    fetchReviews();
  }, [product?._id]);

  // Fetch similar products from API
  useEffect(() => {
    async function fetchSimilarProducts() {
      if (!product?._id) return;
      
      setRelatedLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        console.log(apiBaseUrl)
        const response = await fetch(`${apiBaseUrl}/recommendations/similar/${product._id}?limit=10`, {
          cache: 'no-store',
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Ensure data is an array
            const similarData = Array.isArray(result.data) ? result.data : [];
            setRelatedProducts(similarData);
          } else {
            setRelatedProducts([]);
          }
        } else {
          setRelatedProducts([]);
        }
      } catch (error) {
        setRelatedProducts([]);
      } finally {
        setRelatedLoading(false);
      }
    }
    
    fetchSimilarProducts();
  }, [product?._id]);

  // Fetch available coupons from API
  useEffect(() => {
    async function fetchCoupons() {
      setCouponsLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        const token = sessionStorage.getItem('token');
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${apiBaseUrl}/coupons`, {
          headers,
          cache: 'no-store',
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Filter only active coupons
            const activeCoupons = result.data.filter((coupon: any) => coupon.status === 'active');
            setAvailableCoupons(activeCoupons);
          } else {
            setAvailableCoupons([]);
          }
        } else {
          setAvailableCoupons([]);
        }
      } catch (error) {
        setAvailableCoupons([]);
      } finally {
        setCouponsLoading(false);
      }
    }
    
    fetchCoupons();
  }, []);

  // Remove static data generation function
  const generateProductFromSlug_REMOVED = (slug: string): Product => {
    // Create a simple hash from slug to generate consistent but unique data
    const hash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const productId = `product-${hash}`;
    
    const brands = ["ALSU", "Fastrack", "Noise", "boAt", "Samsung", "Sony", "Nike", "Adidas", "Puma"];
    const colors = [
      ["MARRON", "BLACK", "BROWN"],
      ["RED", "BLUE", "GREEN"],
      ["WHITE", "BLACK", "GREY"],
      ["NAVY", "SKY BLUE", "TEAL"],
      ["PINK", "PURPLE", "MAGENTA"]
    ];
    const sizes = [["S", "M", "L"], ["Small", "Medium", "Large"], ["Free Size"]];
    
    const brandIndex = hash % brands.length;
    const colorSet = colors[hash % colors.length];
    const sizeSet = sizes[hash % sizes.length];
    const basePrice = 200 + (hash % 20) * 100;
    const salePrice = basePrice - (hash % 50);
    
    // Generate multiple images (6-8 images per product)
    const imageCount = 6 + (hash % 3); // 6, 7, or 8 images
    const allImages = [
      "https://node-crm.s3.ap-south-1.amazonaws.com/products/1764846028558_es1np_512.webp",
      "https://node-crm.s3.ap-south-1.amazonaws.com/products/1764846028558_vhseh_512.webp",
      "https://node-crm.s3.ap-south-1.amazonaws.com/products/1764846028559_woni4_512.webp",
      "https://node-crm.s3.ap-south-1.amazonaws.com/products/1764846028559_ludwa_512.webp",
      "https://node-crm.s3.ap-south-1.amazonaws.com/products/1764846028558_es1np_512.webp",
      "https://node-crm.s3.ap-south-1.amazonaws.com/products/1764846028558_vhseh_512.webp",
      "https://node-crm.s3.ap-south-1.amazonaws.com/products/1764846028559_woni4_512.webp",
      "https://node-crm.s3.ap-south-1.amazonaws.com/products/1764846028559_ludwa_512.webp",
    ];
    
    return {
      _id: productId,
      title: `${brands[brandIndex]} ${slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
      slug: slug,
      shortDescription: `Premium quality ${brands[brandIndex]} product`,
      description: `Material: Premium Quality\nPattern: Modern Design\nMultipack: 1\nSizes: Multiple sizes available\n\nThis is a premium quality product from ${brands[brandIndex]}. Perfect for everyday use with modern design and superior craftsmanship. Features include durable construction, elegant finish, and attention to detail.`,
      brand: brands[brandIndex],
      categoryId: `category-${hash % 10}`,
      tags: ["TRENDING", "NEW ARRIVAL", brands[brandIndex].toUpperCase()],
      price: basePrice,
      salePrice: salePrice,
      images: allImages.slice(0, imageCount),
      variants: sizeSet.flatMap((size, sIdx) => 
        colorSet.map((color, cIdx) => ({
          sku: `SKU-${hash}-${sIdx}-${cIdx}`,
          attributes: { color, size },
          price: basePrice + (sIdx * 10),
          additionalPrice: salePrice + (sIdx * 10),
          stock: 5 + (hash % 20),
          active: true,
          _id: `variant-${hash}-${sIdx}-${cIdx}`
        }))
      ),
      ratingAvg: 3.5 + (hash % 15) / 10,
      ratingCount: 50 + (hash % 200),
      status: "active",
      discount: Math.round(((basePrice - salePrice) / basePrice) * 100),
      totalOrders: 20 + (hash % 100),
      flashSale: hash % 3 === 0,
      isFeatured: hash % 2 === 0,
      createdAt: "2025-12-04T10:35:20.845Z",
      updatedAt: "2025-12-06T13:16:13.347Z"
    };
  };

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'reviews'>('description');
  
  // Image gallery state for variant-based image switching
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [hoveredVariant, setHoveredVariant] = useState<ProductVariant | null>(null);

  // Review interaction state
  const [reviewHelpful, setReviewHelpful] = useState<Record<string, { helpful: number; notHelpful: number; userVoted: 'helpful' | 'notHelpful' | null; reported: boolean }>>({});
  
  // Write review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    review: '',
    images: [] as string[]
  });
  const [reviewImageFiles, setReviewImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  // User submitted reviews state
  const [userReviews, setUserReviews] = useState<any[]>([]);
  
  // Pagination and display optimization for reviews
  const [reviewsPerPage] = useState(5);
  const [currentReviewPage, setCurrentReviewPage] = useState(1);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  
  // Calculate paginated reviews
  const allReviews = [...userReviews, ...reviews];
  const totalReviewPages = Math.ceil(allReviews.length / reviewsPerPage);
  const paginatedReviews = allReviews.slice(
    (currentReviewPage - 1) * reviewsPerPage,
    currentReviewPage * reviewsPerPage
  );
  
  // Calculate rating and review count dynamically from actual reviews
  const calculatedRating = allReviews.length > 0 
    ? parseFloat((allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / allReviews.length).toFixed(1))
    : 0;
  // Always use calculated values from reviews
  const displayRating = calculatedRating;
  const displayReviewCount = allReviews.length;
  
  // Toggle review expansion
  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  // Handle review image upload with optimization
  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Check if adding these images would exceed the limit
    const remainingSlots = 5 - reviewForm.images.length;
    if (files.length > remainingSlots) {
      showToast(`You can only upload ${remainingSlots} more image(s). Maximum 5 images allowed.`, 'warning');
      return;
    }

    // Validate all files
    for (const file of files) {
      const validation = validateImageFile(file, 10);
      if (!validation.valid) {
        showToast(validation.error || 'Invalid file', 'error');
        return;
      }
    }

    try {
      setUploadingImages(true);

      // Optimize images
      const optimizedFiles = await optimizeImages(files, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.85,
        maxSizeMB: 1,
        outputFormat: 'jpeg',
      });

      // Convert to data URLs for preview
      const dataURLs = await filesToDataURLs(optimizedFiles);

      // Store both files and preview URLs
      setReviewImageFiles(prev => [...prev, ...optimizedFiles]);
      setReviewForm(prev => ({
        ...prev,
        images: [...prev.images, ...dataURLs]
      }));

      // Reset input
      e.target.value = '';
    } catch (error) {
      showToast('Failed to upload images. Please try again.', 'error');
    } finally {
      setUploadingImages(false);
    }
  };

  // Remove review image
  const handleRemoveReviewImage = (index: number) => {
    setReviewImageFiles(prev => prev.filter((_, idx) => idx !== index));
    setReviewForm(prev => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== index)
    }));
  };
  
  // Load more reviews state
  const [visibleReviews, setVisibleReviews] = useState(3);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track product view in localStorage
  useEffect(() => {
    if (product && product._id) {
      // Add to recent views
      recentViewsManager.addView({
        _id: product._id,
        title: product.title,
        slug: product.slug,
        price: product.price,
        salePrice: product.salePrice || product.price,
        imageUrl: product.images[0] || '',
        brand: product.brand
      });
    }
  }, [product]);

  // Detect variant type based on attributes (clothing vs electronics)
  const variantType = useMemo(() => {
    if (!product || !product.variants || product.variants.length === 0) return 'simple';
    const firstVariant = product.variants[0];
    if (!firstVariant || !firstVariant.attributes) return 'simple';
    const attrs = firstVariant.attributes;
    // Check for mobile/electronics variant (has storage/ram)
    if (attrs.storage || attrs.ram) return 'electronics';
    // Check for clothing variant (has size)
    if (attrs.size) return 'clothing';
    // Check if only color variant
    if (attrs.color) return 'color-only';
    return 'simple';
  }, [product]);

  // Extract unique attribute values from variants
  const availableColors = useMemo(() => {
    if (!product || !product.variants) return [];
    const colors = product.variants
      .filter(v => v && v.attributes && v.attributes.color && v.active)
      .map(v => v.attributes.color as string);
    return Array.from(new Set(colors));
  }, [product]);

  // Parse sizes - handle comma-separated sizes from variants
  const availableSizes = useMemo(() => {
    if (!product || !product.variants) return [];
    const allSizes: string[] = [];
    product.variants.forEach(v => {
      if (v && v.attributes && v.attributes.size && v.active) {
        // Check if size is comma-separated string
        const sizeValue = v.attributes.size as string;
        if (sizeValue.includes(',')) {
          // Split comma-separated sizes and trim whitespace
          const parsedSizes = sizeValue.split(',').map(s => s.trim()).filter(Boolean);
          allSizes.push(...parsedSizes);
        } else {
          allSizes.push(sizeValue);
        }
      }
    });
    
    // Return unique sizes in a logical order
    const uniqueSizes = Array.from(new Set(allSizes));
    
    // Sort sizes logically (XS, S, M, L, XL, XXL, then numeric)
    const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '2XL', '3XL', '4XL', '5XL'];
    return uniqueSizes.sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a.toUpperCase());
      const bIndex = sizeOrder.indexOf(b.toUpperCase());
      
      // If both are in the predefined order, sort by that
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      // If only one is in predefined order, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // Otherwise, try numeric comparison
      const aNum = parseInt(a);
      const bNum = parseInt(b);
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
      // Fallback to alphabetical
      return a.localeCompare(b);
    });
  }, [product]);

  const availableStorage = useMemo(() => {
    if (!product || !product.variants) return [];
    const storage = product.variants
      .filter(v => v && v.attributes && v.attributes.storage && v.active)
      .map(v => v.attributes.storage as string);
    return Array.from(new Set(storage));
  }, [product]);

  const availableRam = useMemo(() => {
    if (!product || !product.variants) return [];
    const ram = product.variants
      .filter(v => v && v.attributes && v.attributes.ram && v.active)
      .map(v => v.attributes.ram as string);
    return Array.from(new Set(ram));
  }, [product]);

  // Get unique colors with their variant images for color swatch display
  const colorVariantsWithImages = useMemo(() => {
    if (!product || !product.variants) return [];
    const colorMap = new Map<string, { color: string; images: string[]; variant: ProductVariant }>();
    product.variants.forEach(v => {
      if (!v) return;
      const attrs = v.attributes || {};
      const color = attrs.color;
      if (color && v.active && !colorMap.has(color)) {
        colorMap.set(color, {
          color,
          images: v.images || product.images,
          variant: v
        });
      }
    });
    return Array.from(colorMap.values());
  }, [product]);

  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedStorage, setSelectedStorage] = useState<string>('');
  const [selectedRam, setSelectedRam] = useState<string>('');

  // Display title - API returns merged variant title when variantId is passed
  const displayTitle = useMemo(() => {
    return product?.title || '';
  }, [product?.title]);

  // Display short description - API returns merged variant data
  const displayShortDescription = useMemo(() => {
    return product?.shortDescription || product?.title || '';
  }, [product?.shortDescription, product?.title]);

  // Get sizes available for current selected color
  const sizesForSelectedColor = useMemo(() => {
    if (!product || !product.variants || !selectedColor) return availableSizes;
    const colorVariant = product.variants.find(
      v => v && v.attributes && v.attributes.color === selectedColor && v.active
    );
    if (!colorVariant || !colorVariant.attributes.size) return availableSizes;
    
    const sizeValue = colorVariant.attributes.size as string;
    if (sizeValue.includes(',')) {
      return sizeValue.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [sizeValue];
  }, [product, selectedColor, availableSizes]);

  // Initialize selected variant and attributes when product loads
  // This should ONLY run on initial load, NOT when variant changes
  useEffect(() => {
    // Skip if this is an intentional variant change - don't reset states
    if (isVariantChangeRef.current) {
      console.log('[Init useEffect] Skipping - intentional variant change detected');
      isVariantChangeRef.current = false; // Reset the flag for next time
      return;
    }
    // Only initialize if we don't already have a selectedColor set
    // This prevents resetting when product data is refreshed
    if (product && Array.isArray(product.variants) && product.variants.length > 0 && !selectedColor) {
      console.log('[Init useEffect] Initializing variant states for first time load');
      const firstVariant = product.variants.find(v => v && v.active) || product.variants[0];
      if (!firstVariant || !firstVariant.attributes) return;
      setSelectedVariant(firstVariant);
      setSelectedColor(firstVariant.attributes.color || '');
      // Handle comma-separated sizes - select first available size
      const sizeValue = firstVariant.attributes.size || '';
      if (sizeValue.includes(',')) {
        const firstSize = sizeValue.split(',')[0].trim();
        setSelectedSize(firstSize);
      } else {
        setSelectedSize(sizeValue);
      }
      setSelectedStorage(firstVariant.attributes.storage || '');
      setSelectedRam(firstVariant.attributes.ram || '');
      setSelectedImageIndex(0);
    }
  }, [product, selectedColor]);

  // Get current display images - API returns merged variant images at product level
  const displayImages = useMemo(() => {
    // If hovering on a variant with images, show those for preview
    if (hoveredVariant && hoveredVariant.images && hoveredVariant.images.length > 0) {
      return hoveredVariant.images;
    }
    // Use product.images which contains the selected variant's images from API
    // (API merges variant images into product.images when variantId is provided)
    return product?.images || [];
  }, [product, hoveredVariant]);

  // Find matching variant based on selected attributes
  const findMatchingVariant = (
    color?: string,
    size?: string,
    storage?: string,
    ram?: string
  ): ProductVariant | undefined => {
    if (!product) return undefined;
    return product.variants.find(v => {
      const attrs = v.attributes || {};
      const matchColor = !color || attrs.color === color;
      // Handle comma-separated sizes - check if the selected size is included
      let matchSize = !size;
      if (size && attrs.size) {
        const variantSizes = (attrs.size as string).split(',').map(s => s.trim());
        matchSize = variantSizes.includes(size);
      }
      const matchStorage = !storage || attrs.storage === storage;
      const matchRam = !ram || attrs.ram === ram;
      return matchColor && matchSize && matchStorage && matchRam && v.active;
    });
  };

  // Check if a size is available for current color
  const isSizeAvailable = (size: string): boolean => {
    if (!product || !selectedColor) return true;
    
    const colorVariant = product.variants.find(
      v => v.attributes.color === selectedColor && v.active
    );
    
    if (!colorVariant || !colorVariant.attributes.size) return false;
    
    const variantSizes = (colorVariant.attributes.size as string).split(',').map(s => s.trim());
    return variantSizes.includes(size);
  };

  // Helper function to update URL with variantId and fetch updated product data
  const selectVariant = async (variant?: ProductVariant) => {
    if (!product || !variant?._id) {
      console.log('[selectVariant] No product or variant ID');
      return;
    }
    
    console.log('[selectVariant] Selecting variant:', variant._id, 'Color:', variant.attributes?.color);
    
    // Fetch product with variant data from API - this will update URL with slug from response
    await fetchProductWithVariant(variant._id);
  };

  // Update selected variant when attributes change
  const handleColorChange = async (color: string) => {
    if (!product) return;
    console.log('[handleColorChange] Changing to color:', color);
    // Find the variant for this color, treating null attributes as empty object
    console.log('[handleColorChange] Available variants:', product.variants.map(v => ({ id: v._id, color: (v.attributes || {}).color, active: v.active })));
    const variant = product.variants.find(v => {
      const attrs = v.attributes || {};
      return attrs.color === color && v.active;
    });
    console.log('[handleColorChange] Found variant:', variant?._id, (variant?.attributes || {}).color);
    if (variant && variant._id) {
      // Select this variant - will update URL and fetch new data
      await selectVariant({ ...variant, _id: variant._id });
      // Reset image index when color changes
      setSelectedImageIndex(0);
    } else {
      console.log('[handleColorChange] No variant found for color:', color);
    }
  };

  const handleSizeChange = async (size: string) => {
    if (!product) return;
    
    console.log('[handleSizeChange] Changing to size:', size, 'for color:', selectedColor);
    
    // Set the selected size state immediately
    setSelectedSize(size);
    
    // Find variant that has this size available for current color
    const variant = product.variants.find(v => {
      if (v.attributes.color !== selectedColor || !v.active) return false;
      if (!v.attributes.size) return false;
      const sizes = (v.attributes.size as string).split(',').map(s => s.trim());
      return sizes.includes(size);
    });
    
    console.log('[handleSizeChange] Found variant:', variant?._id);
    
    // Note: We don't call selectVariant here because size changes don't need API refetch
    // The variant is the same, just the selected size within that variant changes
    if (variant) {
      setSelectedVariant(variant);
    }
  };

  const handleStorageChange = async (storage: string) => {
    if (!product) return;
    const variant = findMatchingVariant(selectedColor, selectedSize, storage, selectedRam);
    if (variant) {
      await selectVariant(variant);
    }
  };

  const handleRamChange = async (ram: string) => {
    if (!product) return;
    const variant = findMatchingVariant(selectedColor, selectedSize, selectedStorage, ram);
    if (variant) {
      await selectVariant(variant);
    }
  };

  // Handle color variant hover for image preview
  const handleColorHover = (variant: ProductVariant | null) => {
    setHoveredVariant(variant);
    if (variant) {
      setSelectedImageIndex(0);
    }
  };

  // Get current variant price info - API returns merged variant prices at product level
  const getVariantPrice = () => {
    if (!product) {
      return { price: 0, salePrice: 0, mrp: 0 };
    }
    // API merges variant price data into product when variantId is provided
    // So we read directly from product level
    const actualMrp = product.mrp || product.price || 0;
    const actualSalePrice = product.salePrice || product.price || 0;
    return {
      price: actualMrp > actualSalePrice ? actualMrp : product.price || 0,
      salePrice: actualSalePrice,
      mrp: actualMrp
    };
  };

  const variantPrice = getVariantPrice();

  // Handle review helpful/not helpful votes
  const handleReviewHelpful = async (reviewId: string, type: 'helpful' | 'notHelpful') => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');
      
      // Determine vote value based on type
      const voteValue = type === 'helpful' ? 'yes' : 'no';
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${apiBaseUrl}/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ vote: voteValue }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }
      
      const result = await response.json();
      
      // Update local state after successful API call
      setReviewHelpful(prev => {
        const current = prev[reviewId] || { helpful: 0, notHelpful: 0, userVoted: null, reported: false };
        
        // If user already voted for the same type, remove vote
        if (current.userVoted === type) {
          return {
            ...prev,
            [reviewId]: {
              ...current,
              [type]: Math.max(0, current[type] - 1),
              userVoted: null
            }
          };
        }
        
        // If user voted for opposite type, switch vote
        if (current.userVoted && current.userVoted !== type) {
          const oppositeType = type === 'helpful' ? 'notHelpful' : 'helpful';
          return {
            ...prev,
            [reviewId]: {
              ...current,
              [type]: current[type] + 1,
              [oppositeType]: Math.max(0, current[oppositeType] - 1),
              userVoted: type
            }
          };
        }
        
        // New vote
        return {
          ...prev,
          [reviewId]: {
            ...current,
            [type]: current[type] + 1,
            userVoted: type
          }
        };
      });
      
    } catch (error) {
      showToast('Failed to submit vote. Please try again.', 'error');
    }
  };

  // Handle review report
  const handleReportReview = (reviewId: string) => {
    if (confirm('Are you sure you want to report this review? Our team will review it shortly.')) {
      setReviewHelpful(prev => ({
        ...prev,
        [reviewId]: {
          ...(prev[reviewId] || { helpful: 0, notHelpful: 0, userVoted: null, reported: false }),
          reported: true
        }
      }));
      showToast('Thank you for reporting. Our team has been notified.', 'success');
    }
  };

  // Handle review form submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reviewForm.title.trim() || !reviewForm.review.trim()) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    if (!product?._id) {
      showToast('Product information is missing', 'error');
      return;
    }
    
    showLoader('Submitting your review...');
    
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');
      
      // Prepare FormData for multipart/form-data
      const formData = new FormData();
      formData.append('rating', reviewForm.rating.toString());
      formData.append('title', reviewForm.title);
      formData.append('comment', reviewForm.review);
      
      // Append all image files
      reviewImageFiles.forEach((file) => {
        formData.append('images', file);
      });
      
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${apiBaseUrl}/products/${product._id}/reviews`, {
        method: 'POST',
        headers,
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit review');
      }
      
      const result = await response.json();
      
      // Add the new review to local state for immediate display
      const newReview = {
        id: result.data?._id || `review-user-${Date.now()}`,
        name: 'You',
        avatar: 'YO',
        rating: reviewForm.rating,
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        verified: true,
        title: reviewForm.title,
        review: reviewForm.review,
        comment: reviewForm.review,
        helpful: 0,
        helpfulCount: 0,
        images: reviewForm.images
      };
      
      setUserReviews(prev => [newReview, ...prev]);
      setReviewForm({ rating: 5, title: '', review: '', images: [] });
      setReviewImageFiles([]);
      setShowReviewForm(false);
      
      hideLoader();
      showToast('Thank you for your review! Your feedback has been submitted successfully.', 'success');
      
      // Optionally refresh reviews from API
      // You can call fetchReviews() here if you have access to it
    } catch (error) {
      hideLoader();
      showToast('Failed to submit review. Please try again later.', 'error');
    }
  };
  
  // Handle load more reviews
  const handleLoadMoreReviews = () => {
    setIsLoadingMore(true);
    // Simulate loading delay
    setTimeout(() => {
      setVisibleReviews(prev => prev + 3);
      setIsLoadingMore(false);
    }, 500);
  };

  const handleAddToCart = async () => {
    if (!product || !selectedVariant) return;
    
    showLoader('Adding to cart...');
    
    try {
      // Build variant-specific name with color/size/storage info
      // Use variant title if available (includes correct color), otherwise use product title
      const baseTitle = selectedVariant.title || product.title;
      
      // Only add size to the title since color is already in variant title
      const variantParts: string[] = [];
      if (selectedSize) variantParts.push(selectedSize);
      if (selectedStorage) variantParts.push(selectedStorage);
      if (selectedRam) variantParts.push(selectedRam);
      
      const variantName = variantParts.length > 0 
        ? `${baseTitle} (${variantParts.join(', ')})`
        : baseTitle;
      
      // Create unique ID based on variant + selected size (for same variant with multiple sizes)
      const uniqueId = selectedSize 
        ? `${product._id}_${selectedVariant.sku || 'default'}_${selectedSize}`
        : `${product._id}_${selectedVariant.sku || 'default'}`;
      
      const cartItem = {
        _id: uniqueId, // Unique ID per variant + size combination
        productId: product._id, // Original product ID for API
        variantId: selectedVariant._id, // Variant ID for order
        sku: selectedVariant.sku || product.sku, // Use variant SKU if available, otherwise product SKU
        slug: product.slug, // Store slug for fetching SKU later if needed
        name: variantName, // Variant-specific name
        price: variantPrice.mrp, // Use MRP/original price
        unitPrice: variantPrice.salePrice, // Use sale price
        imageUrl: displayImages[0] || product.images[0] || '',
        discount: variantPrice.mrp > variantPrice.salePrice 
          ? Math.round(((variantPrice.mrp - variantPrice.salePrice) / variantPrice.mrp) * 100) 
          : 0,
        variantSku: selectedVariant.sku,
        // Use actual selected states for attributes (important when size is comma-separated in variant)
        variantAttributes: {
          color: selectedColor || selectedVariant.attributes.color,
          size: selectedSize || selectedVariant.attributes.size,
          storage: selectedStorage || selectedVariant.attributes.storage,
          ram: selectedRam || selectedVariant.attributes.ram
        }
      };
      
      console.log('[handleAddToCart] Adding item:', { name: variantName, color: selectedColor, size: selectedSize, variantId: selectedVariant._id });
      
      // Add to cart (adds with quantity 1)
      await addToCart(cartItem);
      
      // If quantity > 1, update the quantity
      if (quantity > 1) {
        await updateQuantity(product._id, quantity);
      }
      
      setToastMessage(`${quantity} item(s) added to cart!`);
      setShowAddedToast(true);
      setTimeout(() => setShowAddedToast(false), 3000);
    } catch (error) {
      showToast('Failed to add to cart', 'error');
    } finally {
      hideLoader();
    }
  };

  const handleBuyNow = async () => {
    if (!product || !selectedVariant) return;
    
    showLoader('Processing...');
    
    try {
      // Clear existing cart first - Buy Now should only have this item
      await clearCart();
      
      // Build variant-specific name with color/size/storage info
      // Use variant title if available (includes correct color), otherwise use product title
      const baseTitle = selectedVariant.title || product.title;
      
      // Only add size to the title since color is already in variant title
      const variantParts: string[] = [];
      if (selectedSize) variantParts.push(selectedSize);
      if (selectedStorage) variantParts.push(selectedStorage);
      if (selectedRam) variantParts.push(selectedRam);
      
      const variantName = variantParts.length > 0 
        ? `${baseTitle} (${variantParts.join(', ')})`
        : baseTitle;
      
      // Create unique ID based on variant + selected size
      const uniqueId = selectedSize 
        ? `${product._id}_${selectedVariant.sku || 'default'}_${selectedSize}`
        : `${product._id}_${selectedVariant.sku || 'default'}`;
      
      const cartItem = {
        _id: uniqueId, // Unique ID per variant + size combination
        productId: product._id, // Original product ID for API
        variantId: selectedVariant._id, // Variant ID for order
        sku: selectedVariant.sku || product.sku,
        slug: product.slug,
        name: variantName, // Variant-specific name
        price: variantPrice.mrp, // Use MRP/original price
        unitPrice: variantPrice.salePrice, // Use sale price
        imageUrl: displayImages[0] || product.images[0] || '',
        discount: variantPrice.mrp > variantPrice.salePrice 
          ? Math.round(((variantPrice.mrp - variantPrice.salePrice) / variantPrice.mrp) * 100) 
          : 0,
        variantSku: selectedVariant.sku,
        // Use actual selected states for attributes
        variantAttributes: {
          color: selectedColor || selectedVariant.attributes.color,
          size: selectedSize || selectedVariant.attributes.size,
          storage: selectedStorage || selectedVariant.attributes.storage,
          ram: selectedRam || selectedVariant.attributes.ram
        }
      };
      
      console.log('[handleBuyNow] Adding item:', { name: variantName, color: selectedColor, size: selectedSize, variantId: selectedVariant._id });
      
      // Add to cart (adds with quantity 1)
      await addToCart(cartItem);
      
      // If quantity > 1, update the quantity
      if (quantity > 1) {
        await updateQuantity(cartItem._id, quantity);
      }
      
      hideLoader();
      // Navigate to checkout
      router.push('/checkout');
    } catch (error) {
      hideLoader();
      showToast('Failed to process. Please try again.', 'error');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-[#184979] mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Loading product details...</p>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist.</p>
          <a href="/products" className="bg-[#184979] text-white px-6 py-3 rounded-lg hover:bg-[#0d2d4a] transition-colors">
            Browse Products
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 relative">
      {/* Toast Notification - Mobile Optimized */}
      {showAddedToast && (
        <div className="fixed top-16 md:top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#184979] to-[#1e5a8f] text-white px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl shadow-2xl animate-in slide-in-from-top-5 fade-in duration-300 flex items-center gap-2 md:gap-3 border-2 border-white/30 max-w-[90vw]">
          <svg className="w-5 h-5 md:w-6 md:h-6 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-bold text-sm md:text-base truncate">{toastMessage}</span>
        </div>
      )}
      
      {/* Breadcrumb Hero - Compact on Mobile */}
      <div className="bg-gradient-to-r from-[#184979] via-[#1a5a8a] to-[#184979] text-white py-3 md:py-6 mb-4 md:mb-8 shadow-lg">
        <div className="container mx-auto px-3 md:px-4">
          <nav className="text-xs md:text-sm">
            <ol className="flex items-center space-x-1.5 md:space-x-2 overflow-x-auto scrollbar-hide">
              <li><a href="/" className="hover:text-white/80 transition-colors flex items-center gap-1 whitespace-nowrap">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="hidden xs:inline">Home</span>
              </a></li>
              <li><span className="text-white/50">/</span></li>
              <li><a href="/products" className="hover:text-white/80 transition-colors whitespace-nowrap">Products</a></li>
              <li><span className="text-white/50">/</span></li>
              <li className="text-white/90 font-semibold truncate max-w-[100px] md:max-w-none">{product.brand}</li>
            </ol>
          </nav>
        </div>
      </div>
      <div className="container mx-auto px-3 md:px-4 pb-8 md:pb-12">

        {/* Product Details - Mobile Optimized Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 lg:gap-10 mb-8 md:mb-12 relative">
          {/* Image Gallery - Full width on mobile */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-md md:shadow-lg p-3 md:p-4 lg:p-6 border border-gray-100 relative group">
              {/* Discount Badge - Smaller on Mobile */}
              {variantPrice.mrp > variantPrice.salePrice && (
                <div className="absolute top-2 md:top-4 left-2 md:left-4 z-10">
                  <div className="bg-[#ff3f6c] text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md text-xs md:text-sm font-bold shadow-lg">
                    {Math.round(((variantPrice.mrp - variantPrice.salePrice) / variantPrice.mrp) * 100)}% OFF
                  </div>
                </div>
              )}
              
              {/* Flash Sale Badge - Smaller on Mobile */}
              {product.flashSale && (
                <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10">
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2 py-1 md:px-3 md:py-1.5 rounded-md flex items-center gap-1 md:gap-1.5 shadow-lg animate-pulse">
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
                    </svg>
                    <span className="font-bold text-xs md:text-sm">Flash Sale</span>
                  </div>
                </div>
              )}
              
              {/* Wishlist Button - Smaller on Mobile */}
              <button className="absolute top-2 md:top-4 right-2 md:right-4 z-10 w-8 h-8 md:w-10 md:h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-all hover:scale-110 group/wish" style={{ display: product.flashSale ? 'none' : 'flex' }}>
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover/wish:text-[#ff3f6c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              
              <ProductImageGallery 
                images={displayImages} 
                selectedIndex={selectedImageIndex}
                onIndexChange={setSelectedImageIndex}
              />
            
            {/* Color Variant Image Swatches - For variants with images */}
            {colorVariantsWithImages.length > 1 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color: <span className="text-[#f26322]">{hoveredVariant?.attributes.color || selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorVariantsWithImages.map(({ color, images, variant }) => (
                    <button
                      key={color}
                      onMouseEnter={() => handleColorHover(variant)}
                      onMouseLeave={() => handleColorHover(null)}
                      onClick={() => handleColorChange(color)}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        selectedColor === color
                          ? 'border-[#f26322] ring-2 ring-[#f26322]/30 scale-105'
                          : 'border-gray-200 hover:border-[#184979] hover:scale-105'
                      }`}
                      title={color}
                    >
                      <Image
                        src={images[0] || ''}
                        alt={color}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                      {selectedColor === color && (
                        <div className="absolute bottom-0 left-0 right-0 bg-[#f26322] text-white text-[10px] text-center py-0.5">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            </div>
            
            {/* Product Highlights - Below Image */}
            <div className="mt-4 bg-gradient-to-r from-[#fef6f0] to-[#fff9f5] rounded-2xl p-4 border border-orange-100">
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center text-center p-2 hover:bg-white rounded-xl transition-colors">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                    <svg className="w-5 h-5 text-[#ff3f6c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-700 leading-tight">100% Original</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 hover:bg-white rounded-xl transition-colors">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                    <svg className="w-5 h-5 text-[#ff3f6c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-700 leading-tight">Easy Returns</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 hover:bg-white rounded-xl transition-colors">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                    <svg className="w-5 h-5 text-[#ff3f6c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-700 leading-tight">Free Delivery</span>
                </div>
                <div className="flex flex-col items-center text-center p-2 hover:bg-white rounded-xl transition-colors">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-1.5 shadow-sm">
                    <svg className="w-5 h-5 text-[#ff3f6c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-700 leading-tight">Pay on Delivery</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Info - Mobile Optimized */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-sm p-4 md:p-5 lg:p-6 border border-gray-100">
            {/* Brand */}
            <div className="flex items-center gap-1.5 md:gap-2 mb-2 flex-wrap">
              <a href={`/products?brand=${product.brand}`} className="text-[#ff3f6c] text-xs md:text-sm font-semibold hover:underline">
                {product.brand}
              </a>
              {product.flashSale && (
                <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] md:text-xs font-bold rounded animate-pulse">
                  <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  Flash Sale
                </span>
              )}
              {product.isFeatured && (
                <span className="inline-flex items-center gap-1 px-1.5 md:px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] md:text-xs font-semibold rounded">
                  <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Bestseller
                </span>
              )}
            </div>
            
            {/* Title - Responsive sizing */}
            <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-1.5 md:mb-2 leading-tight tracking-tight">{displayTitle}</h1>
            
            {/* Short Description */}
            <p className="text-gray-500 text-xs md:text-sm mb-3 md:mb-4 leading-relaxed line-clamp-2 md:line-clamp-none">{displayShortDescription}</p>

            {/* Tags - Scrollable on Mobile */}
            {product.tags && product.tags.length > 0 && (
              <div className="flex gap-1.5 md:gap-2 mb-3 md:mb-4 overflow-x-auto scrollbar-hide pb-1">
                {product.tags.map((tag, index) => (
                  <span key={index} className="text-[10px] md:text-xs px-2 py-0.5 md:py-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Rating - Compact on Mobile */}
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4 pb-3 md:pb-4 border-b border-gray-100 flex-wrap">
              <div className="flex items-center gap-1 bg-teal-600 text-white px-1.5 md:px-2 py-0.5 rounded text-[10px] md:text-xs font-bold">
                <span>{displayRating}</span>
                <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
              <span className="text-gray-400 text-[10px] md:text-sm">{displayReviewCount.toLocaleString()} Ratings</span>
              <span className="text-gray-300 hidden xs:inline">|</span>
              <span className="text-gray-400 text-[10px] md:text-sm">{product.totalOrders || 0}+ Orders</span>
            </div>

            {/* Price Section with Special Offer - Mobile Optimized */}
            <div className="mb-4 md:mb-6">
              {variantPrice.mrp > variantPrice.salePrice && (
                <div className="bg-gradient-to-r from-[#fff0f3] to-[#fff5f7] border border-[#ff3f6c]/20 rounded-lg md:rounded-xl p-2 md:p-3 mb-2 md:mb-3">
                  <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                    <span className="bg-[#ff3f6c] text-white text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded animate-pulse">SPECIAL OFFER</span>
                    <span className="text-[#ff3f6c] text-xs md:text-sm font-semibold">Save ₹{(variantPrice.mrp - variantPrice.salePrice).toLocaleString()}!</span>
                  </div>
                </div>
              )}
              <div className="flex items-baseline gap-2 md:gap-3 flex-wrap">
                <span className="text-2xl md:text-3xl font-black text-gray-900">
                  ₹{variantPrice.salePrice.toLocaleString()}
                </span>
                {variantPrice.mrp > variantPrice.salePrice && (
                  <>
                    <span className="text-sm md:text-base text-gray-400 line-through">MRP ₹{variantPrice.mrp.toLocaleString()}</span>
                    <span className="bg-[#ff3f6c] text-white text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded">
                      {Math.round(((variantPrice.mrp - variantPrice.salePrice) / variantPrice.mrp) * 100)}% OFF
                    </span>
                  </>
                )}
              </div>
              <p className="text-green-600 text-[10px] md:text-xs font-semibold mt-1.5 md:mt-2 flex items-center gap-1">
                <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                inclusive of all taxes
              </p>
            </div>

            <div className="border-t border-gray-100 pt-3 md:pt-6">

            {/* Color Selection - Mobile Optimized */}
            {availableColors.length > 0 && (
            <div className="mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-2 md:mb-3 bg-gray-50 md:bg-transparent px-2 py-1.5 md:p-0 rounded-lg md:rounded-none">
                <label className="text-xs md:text-sm font-bold text-[#184979] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="text-base md:text-lg">🎨</span>
                  Select Color
                </label>
                <span className="text-xs md:text-sm font-bold text-[#ff3f6c] bg-pink-50 px-2 py-0.5 rounded-full">{selectedColor}</span>
              </div>
              
              {/* Color Buttons - Always show text buttons for reliability */}
              <div className="flex flex-wrap gap-2 md:gap-3">
                {availableColors.map(color => {
                  // Try to find variant with images for this color
                  const colorVariant = colorVariantsWithImages.find(cv => cv.color === color);
                  const hasValidImage = colorVariant?.images?.[0] && colorVariant.images[0].startsWith('http');
                  
                  if (hasValidImage) {
                    // Show image swatch
                    return (
                      <button
                        key={color}
                        onMouseEnter={() => colorVariant?.variant && handleColorHover(colorVariant.variant)}
                        onMouseLeave={() => handleColorHover(null)}
                        onClick={() => handleColorChange(color)}
                        className={`relative group rounded-lg md:rounded-xl overflow-hidden transition-all duration-200 ${
                          selectedColor === color
                            ? 'ring-2 ring-[#ff3f6c] ring-offset-1 md:ring-offset-2'
                            : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-1'
                        }`}
                      >
                        <div className="relative w-11 h-11 md:w-16 md:h-16 rounded-lg overflow-hidden">
                          <Image
                            src={colorVariant.images[0]}
                            alt={color}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className={`absolute bottom-0 left-0 right-0 text-[8px] md:text-[10px] text-center py-0.5 md:py-1 font-semibold ${
                          selectedColor === color 
                            ? 'bg-[#f26322] text-white' 
                            : 'bg-black/60 text-white'
                        }`}>
                          {color}
                        </div>
                      </button>
                    );
                  } else {
                    // Show text button
                    return (
                      <button
                        key={color}
                        onClick={() => handleColorChange(color)}
                        className={`px-3 py-1.5 md:px-5 md:py-2.5 rounded-full border-2 transition-all font-semibold text-xs md:text-sm ${
                          selectedColor === color
                            ? 'border-[#ff3f6c] bg-[#fff0f3] text-[#ff3f6c]'
                            : 'border-gray-300 hover:border-[#ff3f6c] text-gray-700 bg-white'
                        }`}
                      >
                        {color}
                      </button>
                    );
                  }
                })}
              </div>
            </div>
            )}

            {/* Size Selection - Mobile Optimized */}
            {availableSizes.length > 0 && (
            <div className="mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <label className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide">
                  Select Size
                </label>
                <button className="text-[10px] md:text-sm text-[#ff3f6c] hover:underline font-medium flex items-center gap-1">
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  SIZE CHART
                </button>
              </div>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {availableSizes.map(size => {
                  const isAvailable = isSizeAvailable(size);
                  const isSelected = selectedSize === size;
                  
                  return (
                    <button
                      key={size}
                      onClick={() => isAvailable && handleSizeChange(size)}
                      disabled={!isAvailable}
                      className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#ff3f6c] text-white border-2 border-[#ff3f6c]'
                          : isAvailable
                            ? 'border-2 border-gray-300 text-gray-700 hover:border-[#ff3f6c] bg-white'
                            : 'border border-gray-200 text-gray-300 bg-gray-50 cursor-not-allowed'
                      }`}
                    >
                      {size}
                      {/* Cross line for unavailable */}
                      {!isAvailable && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-8 md:w-10 h-[1px] bg-gray-300 rotate-45"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Availability hint */}
              {sizesForSelectedColor.length < availableSizes.length && (
                <p className="text-[10px] md:text-xs text-gray-500 mt-1.5 md:mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Some sizes not available in {selectedColor}
                </p>
              )}
            </div>
            )}

            {/* Available Coupon Offers - Mobile Optimized */}
            {availableCoupons.length > 0 && (
            <div className="mb-4 md:mb-6">
              <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-[#ff3f6c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide">Available Offers</span>
              </div>
              <div className="space-y-2">
                {availableCoupons.slice(0, 3).map((coupon: any) => (
                  <div key={coupon.code} className="bg-gradient-to-r from-[#fff5f7] to-[#fff0f3] rounded-lg p-2 md:p-3 border border-[#ff3f6c]/20 hover:border-[#ff3f6c]/40 transition-all">
                    <div className="flex items-start gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-[#ff3f6c] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                          <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#ff3f6c] text-sm">
                            {coupon.discountType === 'percent' 
                              ? `${coupon.discountValue}% OFF` 
                              : `₹${coupon.discountValue} OFF`}
                          </span>
                          {coupon.discountType === 'percent' && coupon.maxDiscountValue && (
                            <span className="text-xs text-gray-500">upto ₹{coupon.maxDiscountValue}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">{coupon.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-dashed border-gray-300 font-mono tracking-wider">
                            {coupon.code}
                          </span>
                          {coupon.minCartValue > 0 && (
                            <span className="text-[10px] text-gray-400">Min. ₹{coupon.minCartValue}</span>
                          )}
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(coupon.code);
                              showToast(`Coupon code "${coupon.code}" copied!`, 'success');
                            }}
                            className="text-[10px] text-[#ff3f6c] font-semibold hover:underline ml-auto"
                          >
                            COPY CODE
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {availableCoupons.length > 3 && (
                  <button 
                    onClick={() => router.push('/checkout')}
                    className="w-full text-center text-xs text-[#ff3f6c] font-semibold py-2 hover:underline"
                  >
                    +{availableCoupons.length - 3} more offers available at checkout →
                  </button>
                )}
              </div>
            </div>
            )}

            {/* Storage Selection - Mobile Optimized */}
            {availableStorage.length > 0 && (
            <div className="mb-4 md:mb-6">
              <label className="block text-xs md:text-sm font-bold text-gray-900 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                Select Storage: <span className="text-[#f26322]">{selectedStorage}</span>
              </label>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {availableStorage.map(storage => (
                  <button
                    key={storage}
                    onClick={() => handleStorageChange(storage)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg border-2 transition-all font-semibold shadow-sm hover:shadow-md min-w-[60px] md:min-w-[80px] text-xs md:text-sm ${
                      selectedStorage === storage
                        ? 'border-[#184979] bg-gradient-to-r from-[#184979] to-[#0d2d4a] text-white scale-105 shadow-lg'
                        : 'border-gray-300 hover:border-[#184979] text-gray-700 bg-white'
                    }`}
                  >
                    {storage}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* RAM Selection - Mobile Optimized */}
            {availableRam.length > 0 && (
            <div className="mb-4 md:mb-6">
              <label className="block text-xs md:text-sm font-bold text-gray-900 mb-2 md:mb-3 flex items-center gap-1.5 md:gap-2">
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                Select RAM: <span className="text-[#f26322]">{selectedRam}</span>
              </label>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {availableRam.map(ram => (
                  <button
                    key={ram}
                    onClick={() => handleRamChange(ram)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-lg border-2 transition-all font-semibold shadow-sm hover:shadow-md min-w-[50px] md:min-w-[70px] text-xs md:text-sm ${
                      selectedRam === ram
                        ? 'border-[#f26322] bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white scale-105 shadow-lg'
                        : 'border-gray-300 hover:border-[#f26322] text-gray-700 bg-white'
                    }`}
                  >
                    {ram}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Delivery Section - Mobile Optimized */}
            <div className="mb-4 md:mb-6 pt-4 md:pt-6 border-t border-gray-100">
              <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide">Delivery Options</span>
              </div>
              <div className="flex gap-2 mb-2 md:mb-3">
                <input
                  type="text"
                  placeholder="Enter pincode"
                  value={userPincode}
                  onChange={(e) => setUserPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 px-2.5 py-2 md:px-3 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff3f6c] text-xs md:text-sm"
                />
                <button 
                  onClick={() => {
                    if (userPincode.length === 6) {
                      setIsCheckingDelivery(true);
                      setDeliveryChecked(false);
                      setDeliveryEstimate(null);
                      
                      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
                      fetch(`${apiBaseUrl}/delivery/check/${userPincode}`)
                        .then(res => res.json())
                        .then(data => {
                          setDeliveryChecked(true);
                          if (data.success && data.data) {
                            setDeliveryEstimate(data.data);
                          } else {
                            setDeliveryEstimate(null);
                          }
                        })
                        .catch(error => {
                          setDeliveryChecked(true);
                          setDeliveryEstimate(null);
                        })
                        .finally(() => {
                          setIsCheckingDelivery(false);
                        });
                    }
                  }}
                  className="px-4 py-2 bg-[#f26322] text-white rounded-lg hover:bg-[#d55420] transition-colors text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={userPincode.length !== 6 || isCheckingDelivery}
                >
                  {isCheckingDelivery ? (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Checking...</span>
                    </div>
                  ) : (
                    'Check'
                  )}
                </button>
              </div>
              {deliveryChecked && deliveryEstimate && deliveryEstimate.isServiceable && (
                <div className="text-sm bg-white rounded-lg p-3 border border-green-200">
                  <div className="flex items-center text-green-600 mb-2">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Delivery available to {deliveryEstimate.city}, {deliveryEstimate.state}
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      <span className="font-semibold">Estimated delivery:</span> {deliveryEstimate.estimatedDelivery?.formatted}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-semibold">Shipping charges:</span> ₹{deliveryEstimate.shippingCharges}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {deliveryEstimate.codAvailable ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                          COD Available
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          COD Not Available
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {deliveryChecked && deliveryEstimate && !deliveryEstimate.isServiceable && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Delivery not available to {deliveryEstimate.city}, {deliveryEstimate.state}
                  </div>
                </div>
              )}
              {deliveryChecked && userPincode && userPincode.length === 6 && deliveryEstimate === null && (
                <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Unable to check delivery for this pincode
                  </div>
                </div>
              )}
            </div>

            {/* Quantity & Stock - Mobile Optimized */}
            <div className="mb-4 md:mb-6">
              {/* Low Stock Warning */}
              {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= (product.lowStockThreshold || 5) && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-2 md:p-3 mb-2 md:mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-full flex items-center justify-center animate-pulse flex-shrink-0">
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-bold text-orange-700">Hurry! Only {selectedVariant.stock} left</p>
                      <p className="text-[10px] md:text-xs text-orange-600">Order soon before it sells out</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <label className="text-xs md:text-sm font-semibold text-gray-900 uppercase tracking-wide">Quantity</label>
                {selectedVariant && selectedVariant.stock > 0 ? (
                  <span className="text-[10px] md:text-xs text-green-700 font-semibold flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full"></span>
                    In Stock ({selectedVariant.stock})
                  </span>
                ) : (
                  <span className="text-[10px] md:text-xs text-red-600 font-semibold flex items-center gap-1 bg-red-50 px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full"></span>
                    Out of Stock
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-gray-300 hover:border-[#ff3f6c] text-gray-700 hover:text-[#ff3f6c] font-bold text-lg transition-all flex items-center justify-center disabled:opacity-40 active:scale-95 bg-white"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(selectedVariant?.stock || 999, parseInt(e.target.value) || 1)))}
                  className="w-12 md:w-14 h-9 md:h-10 text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#ff3f6c] font-bold text-gray-900 bg-white"
                  min="1"
                  max={selectedVariant?.stock || 999}
                />
                <button
                  onClick={() => setQuantity(Math.min(selectedVariant?.stock || 999, quantity + 1))}
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full border-2 border-gray-300 hover:border-[#ff3f6c] text-gray-700 hover:text-[#ff3f6c] font-bold text-lg transition-all flex items-center justify-center disabled:opacity-40 active:scale-95 bg-white"
                  disabled={quantity >= (selectedVariant?.stock || 999)}
                >
                  +
                </button>
              </div>
            </div>
            </div>

            {/* Action Buttons - Mobile Sticky */}
            <div className="hidden md:flex gap-3 pt-6 border-t border-gray-100">
              <button
                onClick={handleAddToCart}
                disabled={!selectedVariant || (selectedVariant && selectedVariant.stock === 0)}
                className="flex-1 h-12 bg-white border-2 border-[#ff3f6c] text-[#ff3f6c] rounded-lg font-bold text-sm hover:bg-[#fff0f3] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                ADD TO BAG
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!selectedVariant || (selectedVariant && selectedVariant.stock === 0)}
                className="flex-1 h-12 bg-[#ff3f6c] text-white rounded-lg font-bold text-sm hover:bg-[#e5335d] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                BUY NOW
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Sticky Bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 p-3 flex gap-2 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
          <button
            onClick={handleAddToCart}
            disabled={!selectedVariant || (selectedVariant && selectedVariant.stock === 0)}
            className="flex-1 h-11 bg-white border-2 border-[#ff3f6c] text-[#ff3f6c] rounded-lg font-bold text-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            ADD TO BAG
          </button>
          <button
            onClick={handleBuyNow}
            disabled={!selectedVariant || (selectedVariant && selectedVariant.stock === 0)}
            className="flex-1 h-11 bg-[#ff3f6c] text-white rounded-lg font-bold text-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            BUY NOW
          </button>
        </div>

        {/* Tabs Section - Mobile Optimized */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-sm mb-8 md:mb-12 border border-gray-100 overflow-hidden pb-16 md:pb-0">
          <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto scrollbar-hide">
            <div className="flex gap-0 min-w-max">
              {['description', 'specifications', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 md:px-6 py-3 md:py-4 font-semibold capitalize transition-all text-xs md:text-sm whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-white text-[#ff3f6c] border-b-2 border-[#ff3f6c] -mb-[2px]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === 'description' && (
              <div className="space-y-4 md:space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-gradient-to-r from-[#184979] to-[#f26322] pb-3 md:pb-4">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-[#184979] to-[#0d2d4a] rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                      <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg md:text-2xl font-bold text-[#184979]">Product Description</h3>
                      <p className="text-xs md:text-sm text-gray-500">Everything you need to know</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-blue-50 to-orange-50 px-4 py-2 rounded-full">
                    <svg className="w-4 h-4 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-semibold text-[#184979]">Verified Info</span>
                  </div>
                </div>

                {/* Description Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {/* Main Description */}
                  <div className="md:col-span-2 bg-gradient-to-br from-gray-50 to-white rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
                    <div className="text-gray-700 leading-relaxed space-y-3 md:space-y-4 text-justify">
                      {product.description.split('\n').map((paragraph, index) => (
                        paragraph.trim() && (
                          <p key={index} className="text-sm md:text-base">
                            {paragraph}
                          </p>
                        )
                      ))}
                    </div>
                  </div>

                  {/* Quick Info Sidebar */}
                  <div className="space-y-3 md:space-y-4">
                    {/* Key Features Card */}
                    <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg md:rounded-xl p-4 md:p-5 border border-blue-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-[#184979] rounded-md md:rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-sm md:text-base text-[#184979]">Key Highlights</h4>
                      </div>
                      <ul className="space-y-2 md:space-y-2 md:space-y-3">
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Premium Quality Assured</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Authentic {product.brand} Product</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Best Price Guarantee</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs md:text-sm text-gray-700">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span>Fast & Secure Delivery</span>
                        </li>
                      </ul>
                    </div>

                    {/* Quick Stats Card */}
                    <div className="bg-gradient-to-br from-orange-50 to-white rounded-lg md:rounded-xl p-4 md:p-5 border border-orange-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-[#f26322] rounded-md md:rounded-lg flex items-center justify-center">
                          <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <h4 className="font-bold text-sm md:text-base text-[#f26322]">Product Stats</h4>
                      </div>
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Rating</span>
                          <div className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="font-bold text-xs md:text-sm text-[#184979]">{displayRating}/5</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Orders</span>
                          <span className="font-bold text-xs md:text-sm text-[#184979]">{product.totalOrders || 0}+</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs md:text-sm text-gray-600">Stock</span>
                          {selectedVariant && selectedVariant.stock > 0 ? (
                            <span className="font-bold text-xs md:text-sm text-green-600">In Stock ({selectedVariant.stock})</span>
                          ) : (
                            <span className="font-bold text-xs md:text-sm text-red-600">Out of Stock</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info Section */}
                <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 mt-4 md:mt-6">
                  <div className="bg-white rounded-lg p-2 md:p-4 border-l-2 md:border-l-4 border-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row items-center md:gap-3 text-center md:text-left">
                      <svg className="w-5 h-5 md:w-8 md:h-8 text-blue-500 mb-1 md:mb-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <div>
                        <h5 className="font-bold text-gray-800 text-[10px] md:text-sm">Secure Payment</h5>
                        <p className="text-[9px] md:text-xs text-gray-600">100% Protected</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 md:p-4 border-l-2 md:border-l-4 border-green-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row items-center md:gap-3 text-center md:text-left">
                      <svg className="w-5 h-5 md:w-8 md:h-8 text-green-500 mb-1 md:mb-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <h5 className="font-bold text-gray-800 text-[10px] md:text-sm">Quality Checked</h5>
                        <p className="text-[9px] md:text-xs text-gray-600">Verified Product</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-2 md:p-4 border-l-2 md:border-l-4 border-orange-500 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row items-center md:gap-3 text-center md:text-left">
                      <svg className="w-5 h-5 md:w-8 md:h-8 text-orange-500 mb-1 md:mb-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h5 className="font-bold text-gray-800 text-[10px] md:text-sm">Easy Returns</h5>
                        <p className="text-[9px] md:text-xs text-gray-600">7 Days Return</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="space-y-3 md:space-y-4">
                {/* General Info */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="bg-gray-50 px-3 py-2 md:px-4 md:py-3 border-b border-gray-200">
                    <h3 className="font-bold text-gray-800 flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      General Information
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    <div className="px-3 py-2.5 md:px-4 md:py-3 flex justify-between items-center hover:bg-blue-50">
                      <span className="text-xs md:text-sm font-medium text-gray-600">Brand</span>
                      <span className="text-xs md:text-sm font-semibold text-gray-900">{product.brand}</span>
                    </div>
                    <div className="px-3 py-2.5 md:px-4 md:py-3 flex justify-between items-center hover:bg-blue-50">
                      <span className="text-xs md:text-sm font-medium text-gray-600">SKU</span>
                      <span className="text-xs md:text-sm font-mono text-gray-700">{selectedVariant?.sku || product.sku || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Product Attributes - Grouped by category */}
                {product.attributes && Object.entries(product.attributes)
                  .filter(([, value]) => value)
                  .reduce((groups: Record<string, [string, string][]>, [key, value]) => {
                    // Categorize attributes
                    let category = 'Other Details';
                    const lowerKey = key.toLowerCase();
                    
                    if (lowerKey.includes('warranty') || lowerKey.includes('guarantee')) category = 'Warranty';
                    else if (lowerKey.includes('battery') || lowerKey.includes('power') || lowerKey.includes('charge')) category = 'Battery & Power Features';
                    else if (lowerKey.includes('dimension') || lowerKey.includes('size') || lowerKey.includes('weight')) category = 'Dimensions';
                    else if (lowerKey.includes('display') || lowerKey.includes('screen') || lowerKey.includes('resolution')) category = 'Display Features';
                    else if (lowerKey.includes('os') || lowerKey.includes('processor') || lowerKey.includes('cpu') || lowerKey.includes('ram') || lowerKey.includes('core')) category = 'OS & Processor Features';
                    else if (lowerKey.includes('camera') || lowerKey.includes('photo') || lowerKey.includes('video')) category = 'Camera Features';
                    else if (lowerKey.includes('multimedia') || lowerKey.includes('audio') || lowerKey.includes('speaker') || lowerKey.includes('sound')) category = 'Multimedia Features';
                    else if (lowerKey.includes('call') || lowerKey.includes('sim') || lowerKey.includes('network')) category = 'Call Features';
                    else if (lowerKey.includes('connect') || lowerKey.includes('bluetooth') || lowerKey.includes('wifi') || lowerKey.includes('nfc')) category = 'Connectivity Features';
                    else if (lowerKey.includes('memory') || lowerKey.includes('storage') || lowerKey.includes('ram') || lowerKey.includes('rom')) category = 'Memory & Storage Features';
                    else if (lowerKey === 'general') category = 'General';
                    
                    if (!groups[category]) groups[category] = [];
                    groups[category].push([key, value as string]);
                    return groups;
                  }, {})
                  ? Object.entries(
                      product.attributes
                        ? Object.entries(product.attributes)
                          .filter(([, value]) => value !== undefined && value !== null && value !== '')
                          .reduce((groups: Record<string, [string, string][]>, [key, value]) => {
                            let category = 'Other Details';
                            const lowerKey = key.toLowerCase();
                            
                            if (lowerKey.includes('warranty') || lowerKey.includes('guarantee')) category = 'Warranty';
                            else if (lowerKey.includes('battery') || lowerKey.includes('power') || lowerKey.includes('charge')) category = 'Battery & Power Features';
                            else if (lowerKey.includes('dimension') || lowerKey.includes('size') || lowerKey.includes('weight')) category = 'Dimensions';
                            else if (lowerKey.includes('display') || lowerKey.includes('screen') || lowerKey.includes('resolution')) category = 'Display Features';
                            else if (lowerKey.includes('os') || lowerKey.includes('processor') || lowerKey.includes('cpu') || lowerKey.includes('ram') || lowerKey.includes('core')) category = 'OS & Processor Features';
                            else if (lowerKey.includes('camera') || lowerKey.includes('photo') || lowerKey.includes('video')) category = 'Camera Features';
                            else if (lowerKey.includes('multimedia') || lowerKey.includes('audio') || lowerKey.includes('speaker') || lowerKey.includes('sound')) category = 'Multimedia Features';
                            else if (lowerKey.includes('call') || lowerKey.includes('sim') || lowerKey.includes('network')) category = 'Call Features';
                            else if (lowerKey.includes('connect') || lowerKey.includes('bluetooth') || lowerKey.includes('wifi') || lowerKey.includes('nfc')) category = 'Connectivity Features';
                            else if (lowerKey.includes('memory') || lowerKey.includes('storage') || lowerKey.includes('ram') || lowerKey.includes('rom')) category = 'Memory & Storage Features';
                            else if (lowerKey === 'general') category = 'General';
                            
                            if (!groups[category]) groups[category] = [];
                            groups[category].push([key, String(value)]);
                            return groups;
                          }, {})
                        : {}
                    ).map(([category, specs]) => (
                      <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-3 py-2 md:px-4 md:py-3 border-b border-gray-200">
                          <h3 className="font-bold text-gray-800 flex items-center gap-1.5 md:gap-2 text-sm md:text-base">
                            <svg className="w-4 h-4 md:w-5 md:h-5 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                            </svg>
                            {category}
                          </h3>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {specs.map(([key, value], idx) => {
                            const formatLabel = (str: string) => {
                              const abbr: Record<string, string> = { 'os': 'Operating System', 'ram': 'RAM', 'sku': 'SKU', 'cpu': 'CPU', 'gpu': 'GPU', 'rom': 'Storage' };
                              if (abbr[str.toLowerCase()]) return abbr[str.toLowerCase()];
                              return str.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
                            };
                            return (
                              <div key={`${category}-${idx}`} className="px-3 py-2.5 md:px-4 md:py-3 flex justify-between items-center hover:bg-orange-50 transition-colors">
                                <span className="text-xs md:text-sm font-medium text-gray-600">{formatLabel(key)}</span>
                                <span className="text-xs md:text-sm font-semibold text-gray-900 text-right max-w-[60%]">{value}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  : null}

                {/* Selected Variant Attributes and Stock */}
                {(selectedVariant || product.weight || product.dimensions) && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow mt-4">
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-3 border-b border-gray-200">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <svg className="w-5 h-5 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Selected Variant & Additional Info
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {selectedSize && (
                        <div className="px-4 py-3 flex justify-between items-center hover:bg-orange-50 transition-colors">
                          <span className="text-sm font-medium text-gray-600">Size</span>
                          <span className="text-sm font-semibold text-gray-900">{selectedSize}</span>
                        </div>
                      )}
                      {selectedVariant && Object.entries(selectedVariant.attributes)
                        .filter(([key, value]) => value && key !== 'size')
                        .map(([key, value]) => {
                          const formatLabel = (str: string) => {
                            const abbr: Record<string, string> = { 'os': 'Operating System', 'ram': 'RAM', 'sku': 'SKU', 'cpu': 'CPU', 'gpu': 'GPU', 'rom': 'Storage' };
                            if (abbr[str.toLowerCase()]) return abbr[str.toLowerCase()];
                            return str.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
                          };
                          return (
                            <div key={`attr-${key}`} className="px-4 py-3 flex justify-between items-center hover:bg-orange-50 transition-colors">
                              <span className="text-sm font-medium text-gray-600">{formatLabel(key)}</span>
                              <span className="text-sm font-semibold text-gray-900">{value}</span>
                            </div>
                          );
                        })
                      }
                      {selectedVariant && (
                        <div className="px-4 py-3 flex justify-between items-center hover:bg-orange-50 transition-colors">
                          <span className="text-sm font-medium text-gray-600">Stock Status</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedVariant.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {selectedVariant.stock > 0 ? `In Stock (${selectedVariant.stock})` : 'Out of Stock'}
                          </span>
                        </div>
                      )}
                      {product.weight && (
                        <div className="px-4 py-3 flex justify-between items-center hover:bg-orange-50 transition-colors">
                          <span className="text-sm font-medium text-gray-600">Weight</span>
                          <span className="text-sm font-semibold text-gray-900">{product.weight} kg</span>
                        </div>
                      )}
                      {product.dimensions && (
                        <div className="px-4 py-3 flex justify-between items-center hover:bg-orange-50 transition-colors">
                          <span className="text-sm font-medium text-gray-600">Dimensions (L×W×H)</span>
                          <span className="text-sm font-semibold text-gray-900">{product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                {/* Reviews Header - Mobile Optimized */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
                  <h3 className="text-lg md:text-2xl font-bold text-[#184979] flex items-center gap-2">
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    Customer Reviews
                  </h3>
                  <button 
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="w-full sm:w-auto px-4 py-2.5 md:px-5 md:py-2.5 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white rounded-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 text-sm md:text-base"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {showReviewForm ? 'Cancel' : 'Write a Review'}
                  </button>
                </div>

                {/* Write Review Form - Mobile Optimized */}
                {showReviewForm && (
                  <div className="mb-6 md:mb-8 bg-gradient-to-br from-blue-50 to-white rounded-xl md:rounded-2xl p-4 md:p-6 border-2 border-[#184979]/20 shadow-lg">
                    <h4 className="text-base md:text-xl font-bold text-[#184979] mb-3 md:mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Write Your Review
                    </h4>
                    <form onSubmit={handleSubmitReview} className="space-y-4 md:space-y-5">
                      {/* Rating Selection - Mobile Optimized */}
                      <div>
                        <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                          Your Rating <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center gap-1 md:gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                              className="transition-transform hover:scale-110 active:scale-95"
                            >
                              <svg 
                                className={`w-8 h-8 md:w-10 md:h-10 ${star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`} 
                                fill="currentColor" 
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </button>
                          ))}
                          <span className="ml-2 md:ml-3 text-sm md:text-lg font-bold text-[#184979] flex items-center">
                            {reviewForm.rating} Star{reviewForm.rating !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Review Title - Mobile Optimized */}
                      <div>
                        <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                          Review Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={reviewForm.title}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Sum up your experience"
                          className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all bg-white text-gray-900 placeholder:text-gray-500"
                          required
                        />
                      </div>

                      {/* Review Text - Mobile Optimized */}
                      <div>
                        <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                          Your Review <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={reviewForm.review}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, review: e.target.value }))}
                          placeholder="Share your experience with this product..."
                          rows={4}
                          className="w-full px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 outline-none transition-all resize-none bg-white text-gray-900 placeholder:text-gray-500"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">{reviewForm.review.length} characters</p>
                      </div>

                      {/* Image Upload - Mobile Optimized */}
                      <div>
                        <label className="block text-xs md:text-sm font-bold text-gray-700 mb-2">
                          Add Photos (Optional)
                        </label>
                        <div className="space-y-3">
                          <label className={`flex items-center justify-center gap-2 px-3 py-3 md:px-4 md:py-3 border-2 border-dashed rounded-lg transition-all cursor-pointer ${
                            uploadingImages 
                              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                              : 'border-gray-300 hover:border-[#f26322] hover:bg-orange-50 active:bg-orange-100'
                          }`}>
                            {uploadingImages ? (
                              <>
                                <svg className="animate-spin h-5 w-5 text-[#f26322]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span className="text-xs md:text-sm font-semibold text-gray-600">Optimizing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="text-xs md:text-sm font-semibold text-gray-600">Upload Images</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleReviewImageUpload}
                              disabled={uploadingImages || reviewForm.images.length >= 5}
                              className="hidden"
                            />
                          </label>
                          
                          {/* Image Preview - Mobile Grid */}
                          {reviewForm.images.length > 0 && (
                            <div className="grid grid-cols-5 gap-2">
                              {reviewForm.images.map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-300 group">
                                  <Image 
                                    src={img} 
                                    alt={`Review image ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveReviewImage(idx)}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity flex items-center justify-center"
                                  >
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Up to 5 photos ({reviewForm.images.length}/5)
                        </p>
                      </div>

                      {/* Submit Buttons - Mobile Stack */}
                      <div className="flex flex-col sm:flex-row gap-2 md:gap-3 pt-2 md:pt-4">
                        <button
                          type="submit"
                          className="flex-1 bg-gradient-to-r from-[#184979] to-[#0d2d4a] text-white py-3 px-4 md:py-3 md:px-6 rounded-lg font-bold hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm md:text-base"
                        >
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Submit Review
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowReviewForm(false);
                            setReviewForm({ rating: 5, title: '', review: '', images: [] });
                          }}
                          className="sm:w-auto px-4 md:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-bold hover:bg-gray-50 active:bg-gray-100 transition-all text-sm md:text-base"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Rating Overview */}
                {(() => {
                  // Calculate rating breakdown from actual reviews
                  const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                  allReviews.forEach(review => {
                    const rating = Math.round(review.rating);
                    if (rating >= 1 && rating <= 5) {
                      ratingCounts[rating as keyof typeof ratingCounts]++;
                    }
                  });
                  const totalReviews = allReviews.length;
                  const calculatedAvg = totalReviews > 0 
                    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
                    : product.ratingAvg.toFixed(1);
                  
                  return (
                    <div className="flex flex-col gap-4 md:gap-8 mb-6 md:mb-8 p-4 md:p-8 bg-gradient-to-br from-blue-50 to-orange-50 rounded-xl md:rounded-2xl border border-gray-200 shadow-sm">
                      {/* Mobile: Horizontal Layout for Rating Score */}
                      <div className="flex items-center gap-4 md:flex-col md:items-center md:border-r-0 md:pr-0 pb-4 md:pb-0 border-b md:border-b-0 border-gray-200">
                        <div className="flex flex-col items-center">
                          <div className="text-4xl md:text-6xl font-black text-[#184979] mb-1 md:mb-3">{totalReviews > 0 ? calculatedAvg : product.ratingAvg}</div>
                          <div className="flex items-center justify-center mb-1 md:mb-2">
                            {[...Array(5)].map((_, i) => {
                              const avgRating = parseFloat(calculatedAvg);
                              const starValue = i + 1;
                              const isFull = avgRating >= starValue;
                              const isHalf = !isFull && avgRating >= starValue - 0.5;
                              
                              return (
                                <div key={i} className="relative w-4 h-4 md:w-6 md:h-6">
                                  <svg className="w-4 h-4 md:w-6 md:h-6 text-gray-300 absolute" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  {(isFull || isHalf) && (
                                    <svg 
                                      className="w-4 h-4 md:w-6 md:h-6 text-yellow-400 absolute" 
                                      fill="currentColor" 
                                      viewBox="0 0 20 20"
                                      style={isHalf ? { clipPath: 'inset(0 50% 0 0)' } : {}}
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex-1 md:text-center">
                          <div className="text-xs md:text-sm font-semibold text-gray-600">{totalReviews > 0 ? totalReviews : product.ratingCount} Reviews</div>
                          <div className="text-[10px] md:text-xs text-gray-500 mt-0.5 md:mt-1">Based on customer ratings</div>
                        </div>
                      </div>
                      
                      {/* Rating Breakdown - Full Width on Mobile */}
                      <div className="flex-1 w-full">
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count = ratingCounts[rating as keyof typeof ratingCounts];
                          const percentage = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                          return (
                            <div key={rating} className="flex items-center gap-2 md:gap-4 mb-2 md:mb-3">
                              <span className="text-xs md:text-sm font-semibold text-gray-700 w-8 md:w-16 flex items-center gap-0.5 md:gap-1 flex-shrink-0">
                                {rating}
                                <svg className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2 md:h-3 overflow-hidden shadow-inner">
                                <div 
                                  className="bg-gradient-to-r from-yellow-400 to-yellow-500 h-2 md:h-3 rounded-full transition-all duration-500 shadow-sm" 
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] md:text-sm font-semibold text-gray-600 w-14 md:w-16 text-right flex-shrink-0">{count} <span className="hidden md:inline">({percentage}%)</span></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Reviews List - Mobile Optimized */}
                <div className="space-y-3 md:space-y-6">
                  {(() => {
                    if (reviewsLoading) {
                      return (
                        <div className="flex items-center justify-center py-8 md:py-12">
                          <div className="text-center">
                            <div className="inline-block animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-4 border-[#184979] mb-3 md:mb-4"></div>
                            <p className="text-gray-600 font-medium text-sm md:text-base">Loading reviews...</p>
                          </div>
                        </div>
                      );
                    }
                    
                    if (allReviews.length === 0) {
                      return (
                        <div className="text-center py-8 md:py-12 bg-gray-50 rounded-xl">
                          <svg className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-3 md:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">No Reviews Yet</h3>
                          <p className="text-gray-600 mb-4 text-sm md:text-base">Be the first to review this product!</p>
                          <button
                            onClick={() => setShowReviewForm(true)}
                            className="bg-[#184979] text-white px-5 py-2 md:px-6 md:py-2 rounded-lg hover:bg-[#0d2d4a] transition-colors text-sm md:text-base"
                          >
                            Write a Review
                          </button>
                        </div>
                      );
                    }
                    
                    return paginatedReviews.map((review) => {
                      const reviewData = reviewHelpful[review.id] || { helpful: review.helpful || 0, notHelpful: 0, userVoted: null, reported: false };
                      const isExpanded = expandedReviews.has(review.id);
                      const reviewText = review.review || review.comment || '';
                      const shouldTruncate = reviewText.length > 200;
                      const displayText = !isExpanded && shouldTruncate ? reviewText.slice(0, 200) + '...' : reviewText;
                      
                      return (
                      <div key={review.id} className="bg-white rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-200 hover:border-[#184979]/30 hover:shadow-md transition-all">
                        {/* Review Header - Mobile Compact */}
                        <div className="flex items-start gap-2.5 md:gap-3 mb-2.5 md:mb-3">
                          {/* Avatar */}
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#184979] to-[#0d2d4a] rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm flex-shrink-0">
                            {review.avatar}
                          </div>
                          {/* User Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-1.5 md:gap-2 mb-0.5 md:mb-1">
                              <h4 className="font-bold text-gray-900 text-xs md:text-sm truncate">{review.name}</h4>
                              {review.verified && (
                                <span className="inline-flex items-center gap-0.5 md:gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] md:text-[10px] font-semibold rounded-full flex-shrink-0">
                                  <svg className="w-2 h-2 md:w-2.5 md:h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  <span className="hidden sm:inline">Verified</span>
                                </span>
                              )}
                            </div>
                            {/* Rating & Date Row */}
                            <div className="flex items-center gap-1.5 md:gap-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => {
                                  const starValue = i + 1;
                                  const isFull = review.rating >= starValue;
                                  const isHalf = !isFull && review.rating >= starValue - 0.5;
                                  
                                  return (
                                    <div key={i} className="relative w-3 h-3 md:w-3.5 md:h-3.5">
                                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-300 absolute" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                      </svg>
                                      {(isFull || isHalf) && (
                                        <svg 
                                          className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-400 absolute" 
                                          fill="currentColor" 
                                          viewBox="0 0 20 20"
                                          style={isHalf ? { clipPath: 'inset(0 50% 0 0)' } : {}}
                                        >
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-[10px] md:text-xs text-gray-500">•</span>
                              <span className="text-[10px] md:text-xs text-gray-500">{review.date}</span>
                            </div>
                          </div>
                          {/* Report Button */}
                          {!reviewData.reported ? (
                            <button 
                              onClick={() => handleReportReview(review.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1 md:p-1.5 rounded-lg hover:bg-red-50 active:bg-red-100 flex-shrink-0"
                              title="Report"
                            >
                              <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                              </svg>
                            </button>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] md:text-[10px] font-semibold rounded-full flex items-center gap-1 flex-shrink-0">
                              Reported
                            </span>
                          )}
                        </div>

                        {/* Review Title */}
                        <h5 className="font-bold text-xs md:text-sm text-[#184979] mb-1.5 md:mb-2">{review.title}</h5>

                        {/* Review Content */}
                        <p className="text-gray-700 text-xs md:text-sm leading-relaxed mb-2.5 md:mb-3">
                          {displayText}
                          {shouldTruncate && (
                            <button
                              onClick={() => toggleReviewExpansion(review.id)}
                              className="text-[#f26322] hover:text-[#d14d12] font-semibold ml-1 md:ml-2"
                            >
                              {isExpanded ? 'Show less' : 'Read more'}
                            </button>
                          )}
                        </p>

                        {/* Review Images - Mobile Scroll */}
                        {review.images && review.images.length > 0 && (
                          <div className="flex gap-1.5 md:gap-2 mb-2.5 md:mb-3 overflow-x-auto pb-1 -mx-1 px-1">
                            {review.images.slice(0, 4).map((img: string, idx: number) => (
                              <div key={idx} className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-md overflow-hidden border border-gray-200 hover:border-[#f26322] transition-colors cursor-pointer group">
                                <Image 
                                  src={img} 
                                  alt={`Review ${idx + 1}`}
                                  fill
                                  className="object-cover group-hover:scale-110 transition-transform"
                                />
                              </div>
                            ))}
                            {review.images.length > 4 && (
                              <div className="w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center text-[10px] md:text-xs text-gray-600 font-bold">
                                +{review.images.length - 4}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Review Actions - Mobile Compact */}
                        <div className="flex items-center gap-2 md:gap-4 pt-2.5 md:pt-3 border-t border-gray-100">
                          <span className="text-[10px] md:text-xs text-gray-600 font-medium">Helpful?</span>
                          <div className="flex items-center gap-1.5 md:gap-2">
                            {/* Helpful Button */}
                            <button
                              onClick={() => handleReviewHelpful(review.id, 'helpful')}
                              className={`flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all active:scale-95 ${
                                reviewData.userVoted === 'helpful'
                                  ? 'bg-green-100 text-green-700 border border-green-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-600 active:bg-green-100'
                              }`}
                            >
                              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                              <span>{reviewData.helpful}</span>
                            </button>
                            {/* Not Helpful Button */}
                            <button
                              onClick={() => handleReviewHelpful(review.id, 'notHelpful')}
                              className={`flex items-center gap-1 md:gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg text-[10px] md:text-xs font-semibold transition-all active:scale-95 ${
                                reviewData.userVoted === 'notHelpful'
                                  ? 'bg-red-100 text-red-700 border border-red-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600 active:bg-red-100'
                              }`}
                            >
                              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                              <span>{reviewData.notHelpful}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                </div>

                {/* Pagination Controls - Mobile Optimized */}
                {allReviews.length > reviewsPerPage && (
                  <div className="flex flex-col items-center gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200">
                    <p className="text-xs md:text-sm text-gray-600 text-center">
                      Showing <span className="font-bold text-[#184979]">{((currentReviewPage - 1) * reviewsPerPage) + 1}</span> - {' '}
                      <span className="font-bold text-[#184979]">{Math.min(currentReviewPage * reviewsPerPage, allReviews.length)}</span> of{' '}
                      <span className="font-bold text-[#184979]">{allReviews.length}</span> reviews
                    </p>
                    
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <button
                        onClick={() => setCurrentReviewPage(prev => Math.max(1, prev - 1))}
                        disabled={currentReviewPage === 1}
                        className="px-3 py-1.5 md:px-4 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalReviewPages) }, (_, i) => {
                          let pageNum;
                          if (totalReviewPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentReviewPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentReviewPage >= totalReviewPages - 2) {
                            pageNum = totalReviewPages - 4 + i;
                          } else {
                            pageNum = currentReviewPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentReviewPage(pageNum)}
                              className={`w-8 h-8 md:w-10 md:h-10 rounded-lg text-xs md:text-sm font-semibold transition-all active:scale-95 ${
                                currentReviewPage === pageNum
                                  ? 'bg-[#184979] text-white'
                                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentReviewPage(prev => Math.min(totalReviewPages, prev + 1))}
                        disabled={currentReviewPage === totalReviewPages}
                        className="px-3 py-1.5 md:px-4 md:py-2 border border-gray-300 rounded-lg text-xs md:text-sm font-semibold text-gray-700 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recently Viewed Products */}
        <div className="mb-12">
          <RecentlyViewed />
        </div>

        {/* Related Products */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-1 pb-2 border-b-2 border-gray-200">
            <div>
              <h2 className="text-base md:text-2xl font-bold text-gray-900 mb-0.5 md:mb-1">Similar Products</h2>
              <p className="text-xs md:text-sm text-gray-600 hidden sm:block">Products related to what you're viewing</p>
            </div>
            <a href="/products" className="inline-flex items-center gap-1 md:gap-2 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white px-3 py-1.5 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold hover:shadow-lg transition-all transform hover:scale-105">
              View All
              <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
          
          {/* Loading State */}
          {relatedLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-4 border-[#184979] mb-4"></div>
                <p className="text-gray-600">Loading similar products...</p>
              </div>
            </div>
          ) : relatedProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No similar products found</p>
            </div>
          ) : (
            <div className="relative">
              <div className="overflow-x-auto scrollbar-thin scrollbar-track-gray-200 scrollbar-thumb-blue pb-4">
                <div className="flex gap-3 md:gap-6" style={{ width: 'max-content' }}>
                  {relatedProducts.map(relatedProduct => (
                    <div 
                      key={relatedProduct._id}
                      style={{ width: 'calc((100vw - 4rem) / 2.5)', minWidth: '150px', maxWidth: '300px' }}
                    >
                      <ProductCard product={relatedProduct} />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Scroll Indicator */}
              {relatedProducts.length > 4 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <svg className="w-5 h-5 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className="text-sm text-gray-500 font-medium">Scroll to see more</span>
                  <svg className="w-5 h-5 text-gray-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-yellow-500 text-white'
          }`}>
            {toast.type === 'success' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
