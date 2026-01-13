'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { useLoader } from '@/components/ui/Loader';
import { optimizeImages, filesToDataURLs, validateImageFile } from '@/lib/imageOptimizer';

interface OrderItem {
  _id?: string;
  productId: string;
  name?: string;
  title?: string;
  price?: number;
  unitPrice?: number;
  quantity?: number;
  qty?: number;
  imageUrl?: string;
  totalPrice?: number;
}

interface Order {
  _id: string;
  orderId: string;
  items: OrderItem[];
  total?: number;
  totalAmount: number;
  subtotal: number;
  discount: number;
  shippingCharges: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'success' | 'failed' | 'pending' | 'paid';
  orderDate?: string;
  createdAt: string;
  updatedAt: string;
  deliveryDate?: string;
  paymentMethod?: string;
  paymentProvider?: {
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
  };
  address?: {
    label: string;
    name: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    phone: string;
  };
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  userId?: {
    _id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

export default function OrdersPage() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { showLoader, hideLoader } = useLoader();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'not-shipped' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [reviewImageFiles, setReviewImageFiles] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionTitle, setQuestionTitle] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [productQuestions, setProductQuestions] = useState<Record<string, any[]>>({});
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionVotes, setQuestionVotes] = useState<Record<string, { voted: boolean; count: number }>>({});
  const [answerVotes, setAnswerVotes] = useState<Record<string, { voted: boolean; count: number }>>({});
  const [showAnswerForm, setShowAnswerForm] = useState<Record<string, boolean>>({});
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState<string | null>(null);
  const [myQuestions, setMyQuestions] = useState<any[]>([]);
  const [showMyQuestions, setShowMyQuestions] = useState(false);
  const [loadingMyQuestions, setLoadingMyQuestions] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<string | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [shoppingTrendsProducts, setShoppingTrendsProducts] = useState<any[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showRetryPaymentModal, setShowRetryPaymentModal] = useState(false);
  const [orderToRetry, setOrderToRetry] = useState<Order | null>(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });
  const [productReviews, setProductReviews] = useState<Record<string, any[]>>({});
  const [reviewSummaries, setReviewSummaries] = useState<Record<string, { total: number; avgRating: number }>>({});
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    fetchOrders();
    loadRecommendations();
  }, [currentPage]);

  // Fetch questions when modal opens with a product
  useEffect(() => {
    if (showQuestionModal && selectedProduct?.productId) {
      fetchProductQuestions(selectedProduct.productId);
    }
  }, [showQuestionModal, selectedProduct?.productId]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
  };

  const fetchProductReviews = async (productId: string) => {
    if (productReviews[productId]) return; // Already fetched

    try {
      setLoadingReviews(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      const response = await fetch(`${apiBaseUrl}/products/${productId}/reviews`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const result = await response.json();
        
        // Handle different response structures
        let reviews = [];
        let summary = null;
        
        if (result.success && result.data?.reviews) {
          reviews = result.data.reviews;
          summary = result.data.summary;
        } else if (result.data && Array.isArray(result.data)) {
          reviews = result.data;
        } else if (Array.isArray(result)) {
          reviews = result;
        }
        
        if (reviews.length > 0 || summary) {
          
          // Store reviews
          setProductReviews(prev => {
            const updated = {
              ...prev,
              [productId]: reviews
            };
            return updated;
          });
          
          // Store summary if available
          if (summary) {
            setReviewSummaries(prev => ({
              ...prev,
              [productId]: {
                total: summary.total || reviews.length,
                avgRating: summary.avgRating || 0
              }
            }));
          }
        } else {
        }
      }
    } catch (error) {
    } finally {
      setLoadingReviews(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      const response = await fetch(`${apiBaseUrl}/orders?page=${currentPage}&limit=10`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();

      if (result.success && result.data) {
        setOrders(result.data);
        setTotalOrders(result.meta.total);
        setCurrentPage(result.meta.page);
        setTotalPages(result.meta.pages);
        
        // Fetch reviews for all products in orders
        const productIds = new Set<string>();
        result.data.forEach((order: Order) => {
          order.items.forEach(item => {
            if (item.productId) {
              productIds.add(item.productId);
            }
          });
        });
        
        
        // Fetch reviews for each unique product
        productIds.forEach(productId => {
          fetchProductReviews(productId);
        });
      }
    } catch (error) {
      // Fallback to localStorage
      const savedOrders = localStorage.getItem('grabora_orders');
      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders);
        setOrders(Array.isArray(parsedOrders) ? parsedOrders : [parsedOrders]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendations = async () => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      // Fetch popular products for recommendations
      const popularResponse = await fetch(`${apiBaseUrl}/recommendations/popular?limit=10`);
      if (popularResponse.ok) {
        const result = await popularResponse.json();
        if (result.success && result.data) {
          const products = Array.isArray(result.data) ? result.data : result.data.products || [];
          setRecommendedProducts(products.slice(0, 4));
        }
      }
      
      // Fetch trending products
      const trendingResponse = await fetch(`${apiBaseUrl}/recommendations/trending?limit=10`);
      if (trendingResponse.ok) {
        const result = await trendingResponse.json();
        if (result.success && result.data) {
          const products = Array.isArray(result.data) ? result.data : result.data.products || [];
          setTrendingProducts(products.slice(0, 4));
        }
      }
      
      // Fetch personalized recommendations (for you)
      const forYouResponse = await fetch(`${apiBaseUrl}/recommendations/for-you?limit=10`);
      if (forYouResponse.ok) {
        const result = await forYouResponse.json();
        if (result.success && result.data) {
          const products = Array.isArray(result.data) ? result.data : result.data.products || [];
          setShoppingTrendsProducts(products.slice(0, 6));
        }
      }
    } catch (error) {
    }
  };

  const getItemName = (item: OrderItem) => {
    return item.title || item.name || 'Unknown Product';
  };

  const getItemPrice = (item: OrderItem) => {
    return item.unitPrice || item.price || 0;
  };

  const getItemQuantity = (item: OrderItem) => {
    return item.qty || item.quantity || 1;
  };

  const getOrderTotal = (order: Order) => {
    return order.totalAmount || order.total || 0;
  };

  const getOrderDate = (order: Order) => {
    return order.createdAt || order.orderDate || new Date().toISOString();
  };

  const getShippingAddress = (order: Order) => {
    if (order.address) {
      return {
        address: order.address.line1 + (order.address.line2 ? ', ' + order.address.line2 : ''),
        city: order.address.city,
        state: order.address.state,
        pincode: order.address.pincode,
      };
    }
    return order.shippingAddress || {
      address: 'N/A',
      city: 'N/A',
      state: 'N/A',
      pincode: 'N/A',
    };
  };

  const getPaymentMethod = (order: Order) => {
    if (order.paymentProvider) {
      return order.paymentProvider.provider === 'cod' ? 'Cash on Delivery' : order.paymentProvider.provider;
    }
    return order.paymentMethod || 'COD';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'shipped': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'delivered': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'shipped': return '🚚';
      case 'delivered': return '📦';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : filter === 'not-shipped'
    ? orders.filter(order => order.status === 'pending' || order.status === 'confirmed')
    : orders.filter(order => order.status === filter);
  const notYetShippedOrders = orders.filter(order => order.status === 'pending' || order.status === 'confirmed');

  const handleBuyAgain = (order: Order) => {
    // Add all items from the order back to cart
    order.items.forEach(item => {
      const cartItem = {
        _id: item.productId || item._id,
        name: getItemName(item),
        price: getItemPrice(item),
        quantity: getItemQuantity(item),
        imageUrl: (item as any).thumbnail || item.imageUrl || '/placeholder.png',
      };

      const existingCart = localStorage.getItem('grabora_cart');
      const cart = existingCart ? JSON.parse(existingCart) : [];
      
      // Check if item already exists in cart
      const existingItemIndex = cart.findIndex((cartItem: any) => cartItem._id === (item.productId || item._id));
      if (existingItemIndex > -1) {
        cart[existingItemIndex].quantity += getItemQuantity(item);
      } else {
        cart.push(cartItem);
      }
      
      localStorage.setItem('grabora_cart', JSON.stringify(cart));
    });
    
    // Trigger cart update event
    window.dispatchEvent(new Event('storage'));
    showToast(`${order.items.length} item(s) added to cart!`, 'success');
    router.push('/cart');
  };

  const handleAddToCart = (product: any) => {
    try {
      // Use CartContext's addToCart method
      addToCart({
        _id: product._id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        imageUrl: product.thumbnail || product.imageUrl,
      });
      
      // Show success feedback
      showToast(`${product.name} added to cart!`, 'success');
    } catch (error) {
      showToast('Error adding item to cart. Please try again.', 'error');
    }
  };

  const handleCancelOrder = (order: Order) => {
    setOrderToCancel(order);
    setShowCancelModal(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel || !cancelReason.trim()) {
      showToast('Please select a cancellation reason', 'warning');
      return;
    }

    setCancellingOrder(true);
    showLoader('Cancelling order...');

    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        hideLoader();
        showToast('Please login to cancel order', 'warning');
        router.push('/login');
        return;
      }
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const response = await fetch(`${apiBaseUrl}/orders/${orderToCancel.orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: cancelReason }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update order status to cancelled in local state
        const updatedOrders = orders.map(order => 
          order.orderId === orderToCancel.orderId 
            ? { ...order, status: 'cancelled' as const }
            : order
        );
        
        setOrders(updatedOrders);
        
        setShowCancelModal(false);
        setOrderToCancel(null);
        setCancelReason('');
        hideLoader();
        showToast(result.message || 'Order cancelled successfully!', 'success');
      } else {
        throw new Error(result.message || 'Failed to cancel order');
      }
    } catch (error: any) {
      hideLoader();
      showToast(error.message || 'Failed to cancel order. Please try again.', 'error');
    } finally {
      setCancellingOrder(false);
    }
  };

  const handleRetryPayment = (order: Order) => {
    setOrderToRetry(order);
    setShowRetryPaymentModal(true);
  };

  const confirmRetryPayment = () => {
    if (!orderToRetry) return;

    // In production, this would integrate with Razorpay
    // For now, we'll redirect to checkout or show payment modal
    setShowRetryPaymentModal(false);
    
    // Update payment status to pending
    const updatedOrders = orders.map(order => 
      order.orderId === orderToRetry.orderId 
        ? { ...order, paymentStatus: 'pending' as const }
        : order
    );
    setOrders(updatedOrders);
    localStorage.setItem('grabora_orders', JSON.stringify(updatedOrders));
    
    // Simulate payment processing
    alert('Redirecting to payment gateway...');
    // In production: router.push(`/payment?orderId=${orderToRetry.orderId}`);
    setOrderToRetry(null);
  };

  const handleWriteReview = (product: OrderItem) => {
    setSelectedProduct(product);
    setShowReviewModal(true);
  };

  const handleAskQuestion = (product: OrderItem) => {
    
    // Reset form and view state first
    setQuestionText('');
    setQuestionTitle('');
    setShowMyQuestions(false);
    setAnswerText({});
    setShowAnswerForm({});
    
    // Then set the selected product and show modal
    // The useEffect will handle fetching questions
    setSelectedProduct(product);
    setShowQuestionModal(true);
  };

  const handleVoteQuestionHelpful = async (questionId: string) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      if (!token) {
        showToast('Please login to vote', 'warning');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/questions/${questionId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      // Update local state
      setQuestionVotes(prev => ({
        ...prev,
        [questionId]: {
          voted: true,
          count: (prev[questionId]?.count || 0) + 1
        }
      }));

      showToast('Thank you for your feedback!', 'success');
    } catch (error) {
      showToast('Failed to submit vote. Please try again.', 'error');
    }
  };

  const handleVoteAnswerHelpful = async (questionId: string, answerId: string) => {
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      if (!token) {
        showToast('Please login to vote', 'warning');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/questions/${questionId}/answer/${answerId}/helpful`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to vote');
      }

      // Update local state
      setAnswerVotes(prev => ({
        ...prev,
        [answerId]: {
          voted: true,
          count: (prev[answerId]?.count || 0) + 1
        }
      }));

      showToast('Thank you for your feedback!', 'success');
    } catch (error) {
      showToast('Failed to submit vote. Please try again.', 'error');
    }
  };

  const handleSubmitAnswer = async (questionId: string) => {
    const answer = answerText[questionId]?.trim();
    
    if (!answer) {
      showToast('Please write your answer', 'warning');
      return;
    }

    try {
      setSubmittingAnswer(questionId);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      if (!token) {
        showToast('Please login to answer questions', 'warning');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/questions/${questionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ answer }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      // Clear answer form
      setAnswerText(prev => ({ ...prev, [questionId]: '' }));
      setShowAnswerForm(prev => ({ ...prev, [questionId]: false }));
      
      // Refresh questions to show new answer
      if (selectedProduct?.productId) {
        setProductQuestions(prev => {
          const updated = { ...prev };
          delete updated[selectedProduct.productId];
          return updated;
        });
        await fetchProductQuestions(selectedProduct.productId);
      }
      
      showToast('Your answer has been submitted successfully!', 'success');
    } catch (error) {
      showToast('Failed to submit answer. Please try again.', 'error');
    } finally {
      setSubmittingAnswer(null);
    }
  };

  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Check if adding these images would exceed the limit
    const remainingSlots = 5 - reviewImages.length;
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
      const optimized = await optimizeImages(files, {
        maxSizeMB: 1,
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8
      });

      // Get preview URLs
      const previewUrls = await filesToDataURLs(optimized);
      
      // Update state
      setReviewImageFiles(prev => [...prev, ...optimized]);
      setReviewImages(prev => [...prev, ...previewUrls]);
      
      // Reset input
      e.target.value = '';
    } catch (error) {
      showToast('Failed to upload images. Please try again.', 'error');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveReviewImage = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
    setReviewImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submitReview = async () => {
    if (!selectedProduct?.productId) {
      showToast('Product information is missing', 'error');
      return;
    }

    try {
      setSubmittingReview(true);
      showLoader('Submitting your review...');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      if (!token) {
        hideLoader();
        showToast('Please login to submit a review', 'error');
        return;
      }

      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('rating', reviewRating.toString());
      formData.append('title', reviewTitle);
      formData.append('comment', reviewText);
      
      // Append all image files
      reviewImageFiles.forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch(`${apiBaseUrl}/products/${selectedProduct.productId}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      const result = await response.json();
      
      // Reset form
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewTitle('');
      setReviewText('');
      setReviewImages([]);
      setReviewImageFiles([]);
      
      // Refresh reviews for this product
      if (selectedProduct?.productId) {
        setProductReviews(prev => {
          const updated = { ...prev };
          delete updated[selectedProduct.productId];
          return updated;
        });
        await fetchProductReviews(selectedProduct.productId);
      }
      
      hideLoader();
      showToast('Thank you for your review! Your feedback has been submitted successfully.', 'success');
    } catch (error) {
      hideLoader();
      showToast('Failed to submit review. Please try again later.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const fetchMyQuestions = async () => {
    try {
      setLoadingMyQuestions(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      if (!token) {
        showToast('Please login to view your questions', 'warning');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/questions/my-questions`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const questions = Array.isArray(result.data) ? result.data : result.data.questions || [];
          setMyQuestions(questions);
        }
      }
    } catch (error) {
      showToast('Failed to load your questions', 'error');
    } finally {
      setLoadingMyQuestions(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingQuestion(questionId);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      if (!token) {
        showToast('Please login to delete questions', 'warning');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/questions/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showToast('Question deleted successfully', 'success');
        // Remove from myQuestions list
        setMyQuestions(prev => prev.filter(q => q._id !== questionId));
        // Refresh product questions if viewing current product
        if (selectedProduct) {
          fetchProductQuestions(selectedProduct.productId);
        }
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete question', 'error');
      }
    } catch (error) {
      showToast('Failed to delete question', 'error');
    } finally {
      setDeletingQuestion(null);
    }
  };

  const fetchProductQuestions = async (productId: string, force: boolean = false) => {
    if (!force && productQuestions[productId]) {
      return; // Already fetched unless forced
    }

    try {
      setLoadingQuestions(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      const response = await fetch(`${apiBaseUrl}/questions/product/${productId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const questions = Array.isArray(result.data) ? result.data : result.data.questions || [];
          setProductQuestions(prev => ({
            ...prev,
            [productId]: questions
          }));
        }
      }
    } catch (error) {
    } finally {
      setLoadingQuestions(false);
    }
  };

  const submitQuestion = async () => {
    if (!questionText.trim()) {
      showToast('Please write your question', 'warning');
      return;
    }

    if (!selectedProduct?.productId) {
      showToast('Product information is missing', 'error');
      return;
    }

    try {
      setSubmittingQuestion(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');

      if (!token) {
        showToast('Please login to ask a question', 'error');
        return;
      }

      const response = await fetch(`${apiBaseUrl}/questions/product/${selectedProduct.productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: questionText,
          title: questionTitle
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit question');
      }

      const result = await response.json();
      
      setShowQuestionModal(false);
      setQuestionText('');
      setQuestionTitle('');
      
      // Refresh questions
      if (selectedProduct?.productId) {
        setProductQuestions(prev => {
          const updated = { ...prev };
          delete updated[selectedProduct.productId];
          return updated;
        });
        await fetchProductQuestions(selectedProduct.productId);
      }
      
      showToast('Your question has been submitted successfully!', 'success');
    } catch (error) {
      showToast('Failed to submit question. Please try again later.', 'error');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] md:bg-gradient-to-br md:from-gray-50 md:via-blue-50/30 md:to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#f26322] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#184979] font-semibold">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] md:bg-gradient-to-br md:from-gray-50 md:via-blue-50/30 md:to-orange-50/20 py-4 md:py-6 overflow-x-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#f26322]/10 to-[#ff7a45]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#184979]/10 to-[#1e5a8f]/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-3 md:px-4 relative z-10 max-w-full overflow-hidden">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center gap-2 text-xs md:text-sm text-[#184979]/60 mb-2 md:mb-3">
            <Link href="/" className="hover:text-[#f26322] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#184979] font-semibold">My Orders</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-4xl font-black bg-gradient-to-r from-[#184979] to-[#f26322] bg-clip-text text-transparent mb-1 md:mb-2">
                My Orders
              </h1>
              <p className="text-xs md:text-sm text-[#184979]/70">Track and manage your orders</p>
            </div>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Orders List */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6 min-w-0">

        {/* Filter Tabs */}
        <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg p-2 pt-3 mb-4 md:mb-6 border border-white/50 overflow-visible">
          <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300 -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {[
              { value: 'all', label: 'All' },
              { value: 'not-shipped', label: 'Not Shipped', count: notYetShippedOrders.length },
              { value: 'pending', label: 'Pending' },
              { value: 'confirmed', label: 'Confirmed' },
              { value: 'shipped', label: 'Shipped' },
              { value: 'delivered', label: 'Delivered' },
              { value: 'cancelled', label: 'Cancelled' }
            ].map((status) => (
              <button
                key={status.value}
                onClick={() => setFilter(status.value as any)}
                className={`px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg font-bold text-[11px] md:text-sm transition-all relative flex-shrink-0 whitespace-nowrap mt-1 ${
                  filter === status.value
                    ? status.value === 'not-shipped'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-md'
                      : 'bg-gradient-to-r from-[#184979] to-[#f26322] text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.label}
                {status.value === 'not-shipped' && status.count !== undefined && status.count > 0 && (
                  <span className="absolute -top-2 -right-1 min-w-[18px] h-[18px] md:min-w-[20px] md:h-[20px] bg-red-500 text-white text-[9px] md:text-[10px] font-black rounded-full flex items-center justify-center animate-pulse px-1">
                    {status.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg p-6 md:p-12 text-center border border-white/50">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <svg className="w-8 h-8 md:w-12 md:h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">No orders found</h3>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">You haven't placed any orders yet</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white rounded-xl font-bold text-sm md:text-base hover:shadow-lg transition-all"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.orderId} className="bg-white/90 backdrop-blur-xl rounded-lg md:rounded-xl shadow-lg border border-white/50 overflow-hidden hover:shadow-xl transition-all">
                {/* Order Header */}
                <div className="bg-gradient-to-r from-[#184979]/5 to-[#f26322]/5 p-2.5 md:p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="w-7 h-7 md:w-10 md:h-10 bg-gradient-to-br from-[#184979] to-[#f26322] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs md:text-lg">{getStatusIcon(order.status)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] md:text-sm text-gray-600">Order ID</p>
                        <p className="font-black text-[#184979] text-xs md:text-base truncate max-w-[120px] md:max-w-none">{order.orderId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] md:text-sm text-gray-600">Date</p>
                        <p className="font-bold text-[#184979] text-[10px] md:text-base">{new Date(getOrderDate(order)).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-md md:rounded-lg border md:border-2 font-bold text-[9px] md:text-xs ${getStatusColor(order.status)}`}>
                        {order.status.toUpperCase()}
                      </span>
                      {order.paymentStatus === 'failed' && (
                        <span className="px-1.5 md:px-3 py-0.5 md:py-1.5 rounded-md md:rounded-lg border md:border-2 bg-red-100 text-red-800 border-red-300 font-bold text-[9px] md:text-xs">
                          FAILED
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-2.5 md:p-4">
                  <div className="space-y-2 mb-3 md:mb-4">
                    {order.items.map((item, idx) => {
                      
                      return (
                      <div key={item._id || item.productId || idx} className="flex gap-2 p-1.5 md:p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden bg-white flex-shrink-0">
                          <Image
                            src={(item as any).thumbnail || item.imageUrl || '/placeholder.png'}
                            alt={getItemName(item)}
                            fill
                            className="object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-[#184979] text-[11px] md:text-sm truncate">{getItemName(item)}</h4>
                          <p className="text-[10px] md:text-xs text-gray-600">Qty: {getItemQuantity(item)}</p>
                          
                          {/* Rating Display */}
                          {(() => {
                            
                            const summary = reviewSummaries[item.productId];
                            const reviews = productReviews[item.productId] || [];
                            
                            // Use summary if available, otherwise calculate
                            if (summary && summary.avgRating > 0) {
                              const avgRating = summary.avgRating.toFixed(1);
                              
                              return (
                                <div className="flex items-center gap-1 mb-0.5 md:mb-1">
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span key={star} className="text-yellow-400" style={{ fontSize: '8px' }}>
                                        {star <= Math.round(summary.avgRating) ? '⭐' : '☆'}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-[8px] md:text-[10px] font-semibold text-gray-700">{avgRating}</span>
                                  <span className="text-[8px] md:text-[10px] text-gray-500">({summary.total})</span>
                                </div>
                              );
                            } else if (reviews.length > 0) {
                              const totalRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0);
                              const avgRating = (totalRating / reviews.length).toFixed(1);
                              
                              return (
                                <div className="flex items-center gap-1 mb-0.5 md:mb-1">
                                  <div className="flex items-center">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span key={star} className="text-yellow-400" style={{ fontSize: '8px' }}>
                                        {star <= Math.round(parseFloat(avgRating)) ? '⭐' : '☆'}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-[8px] md:text-[10px] font-semibold text-gray-700">{avgRating}</span>
                                  <span className="text-[8px] md:text-[10px] text-gray-500">({reviews.length})</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          
                          <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                            {(item as any).totalPrice && (item as any).totalPrice !== (getItemPrice(item) * getItemQuantity(item)) ? (
                              <>
                                <p className="text-[10px] md:text-xs text-gray-500 line-through">₹{(item as any).totalPrice.toLocaleString()}</p>
                                <p className="text-[11px] md:text-sm font-bold text-[#f26322]">₹{(getItemPrice(item) * getItemQuantity(item)).toLocaleString()}</p>
                                <span className="text-[8px] md:text-[10px] bg-green-100 text-green-700 px-1 md:px-1.5 py-0.5 rounded font-bold hidden sm:inline">
                                  Save ₹{((item as any).totalPrice - (getItemPrice(item) * getItemQuantity(item))).toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <p className="text-[11px] md:text-sm font-bold text-[#f26322]">₹{(getItemPrice(item) * getItemQuantity(item)).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 md:gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleWriteReview(item)}
                            className="px-1 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[10px] bg-orange-100 text-[#f26322] rounded font-bold hover:bg-orange-200 transition-colors whitespace-nowrap"
                          >
                            ⭐
                          </button>
                          <button
                            onClick={() => handleAskQuestion(item)}
                            className="px-1 md:px-2 py-0.5 md:py-1 text-[8px] md:text-[10px] bg-blue-100 text-[#184979] rounded font-bold hover:bg-blue-200 transition-colors whitespace-nowrap"
                          >
                            ❓
                          </button>
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  {/* Order Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2 md:pt-3 border-t border-gray-200">
                    <div className="flex-shrink-0">
                      <p className="text-[10px] md:text-sm text-gray-600">Total</p>
                      <p className="text-sm md:text-xl font-black text-[#184979]">₹{getOrderTotal(order).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 md:gap-2">
                      {order.paymentStatus === 'failed' && (
                        <button
                          onClick={() => handleRetryPayment(order)}
                          className="px-1.5 md:px-3 py-1 md:py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded font-bold text-[10px] md:text-xs hover:shadow-lg transition-all flex items-center gap-1"
                        >
                          <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => handleBuyAgain(order)}
                        className="px-1.5 md:px-3 py-1 md:py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded font-bold text-[10px] md:text-xs hover:shadow-lg transition-all flex items-center gap-1"
                      >
                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Again
                      </button>
                      <Link
                        href={`/track-order?orderId=${order.orderId}`}
                        className="px-1.5 md:px-3 py-1 md:py-1.5 bg-gradient-to-r from-[#184979] to-[#1e5a8f] text-white rounded font-bold text-[10px] md:text-xs hover:shadow-lg transition-all flex items-center gap-1"
                      >
                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        Track
                      </Link>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          // Fetch reviews for all products in this order
                          if (order.status === 'delivered') {
                            order.items.forEach(item => {
                              fetchProductReviews(item.productId);
                            });
                          }
                        }}
                        className="px-1.5 md:px-3 py-1 md:py-1.5 bg-white border border-[#184979] text-[#184979] rounded font-bold text-[10px] md:text-xs hover:bg-[#184979] hover:text-white transition-all flex items-center gap-1"
                      >
                        <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

          {/* Pagination */}
          {filteredOrders.length > 0 && totalPages > 1 && (
            <div className="flex flex-wrap justify-center items-center gap-1.5 md:gap-2 mt-4 md:mt-8">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-2 md:px-4 py-1 md:py-2 rounded font-bold text-[10px] md:text-sm transition-all ${
                  currentPage === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-[#184979] hover:bg-[#184979] hover:text-white border border-[#184979]'
                }`}
              >
                Prev
              </button>
              
              <div className="flex gap-1 md:gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-6 h-6 md:w-10 md:h-10 rounded font-bold text-[10px] md:text-sm transition-all ${
                      currentPage === page
                        ? 'bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white shadow-lg'
                        : 'bg-white text-[#184979] hover:bg-[#184979] hover:text-white border border-[#184979]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-2 md:px-4 py-1 md:py-2 rounded font-bold text-[10px] md:text-sm transition-all ${
                  currentPage === totalPages
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-[#184979] hover:bg-[#184979] hover:text-white border border-[#184979]'
                }`}
              >
                Next
              </button>
            </div>
          )}
          </div>

          {/* Right Sidebar - Recommendations */}
          <div className="lg:col-span-1">
            <div className=" top-6 overflow-y-auto space-y-4 pr-2 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            
            {/* Shopping Trends Recommendations */}
            {shoppingTrendsProducts.length > 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      📊 For You
                    </h3>
                    <p className="text-[10px] text-gray-600">Based on your shopping trends</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {shoppingTrendsProducts.slice(0, 4).map((product, index) => (
                    <div key={product._id || (product as any).id || `trend-${index}`} className="bg-gradient-to-br from-orange-50/50 to-white rounded-lg p-2.5 border border-orange-100 hover:border-orange-300 transition-all group hover:shadow-md">
                      <div className="flex gap-2.5">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white flex-shrink-0 shadow-sm">
                          <Image
                            src={product.thumbnail || product.images?.[0] || product.imageUrl || '/placeholder.png'}
                            alt={product.title || product.name}
                            fill
                            className="object-contain p-1 group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {product.brand && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full font-bold leading-none">
                                {product.brand}
                              </span>
                            </div>
                          )}
                          <h4 className="text-xs font-bold text-[#184979] line-clamp-2 mb-1.5 leading-tight">{product.title || product.name}</h4>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-[#f26322]">₹{(product.salePrice || product.price).toLocaleString()}</span>
                            <button 
                              onClick={() => handleAddToCart(product)}
                              className="px-2.5 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded text-[10px] font-bold hover:shadow-md transition-all active:scale-95"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Products */}
            {trendingProducts.length > 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      🔥 Trending Now
                    </h3>
                    <p className="text-[10px] text-gray-600">Popular picks today</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {trendingProducts.map((product, index) => (
                    <div key={product._id || (product as any).id || `trending-${index}`} className="bg-gradient-to-br from-purple-50/50 to-white rounded-lg p-2.5 border border-purple-100 hover:border-purple-300 transition-all group hover:shadow-md">
                      <div className="flex gap-2.5">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white flex-shrink-0 shadow-sm">
                          <Image
                            src={product.thumbnail || product.images?.[0] || product.imageUrl || '/placeholder.png'}
                            alt={product.title || product.name}
                            fill
                            className="object-contain p-1 group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          {product.category && (
                            <p className="text-[9px] px-1.5 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-bold inline-block mb-1 leading-none">{product.category}</p>
                          )}
                          <h4 className="text-xs font-bold text-[#184979] line-clamp-2 mb-1.5 leading-tight">{product.title || product.name}</h4>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-[#f26322]">₹{(product.salePrice || product.price).toLocaleString()}</span>
                            <button 
                              onClick={() => handleAddToCart(product)}
                              className="px-2.5 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded text-[10px] font-bold hover:shadow-md transition-all active:scale-95"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Browser History */}
            {recommendedProducts.length > 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      👁️ Your History
                    </h3>
                    <p className="text-[10px] text-gray-600">Recently viewed</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {recommendedProducts.map((product, index) => (
                    <div key={product._id || (product as any).id || `recommended-${index}`} className="bg-gradient-to-br from-blue-50/50 to-white rounded-lg p-2.5 border border-blue-100 hover:border-blue-300 transition-all group hover:shadow-md">
                      <div className="flex gap-2.5">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white flex-shrink-0 shadow-sm">
                          <Image
                            src={product.thumbnail || product.images?.[0] || product.imageUrl || '/placeholder.png'}
                            alt={product.title || product.name}
                            fill
                            className="object-contain p-1 group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-[#184979] line-clamp-2 mb-1.5 leading-tight">{product.title || product.name}</h4>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-black text-[#f26322]">₹{(product.salePrice || product.price).toLocaleString()}</span>
                            <button 
                              onClick={() => handleAddToCart(product)}
                              className="px-2.5 py-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded text-[10px] font-bold hover:shadow-md transition-all active:scale-95"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations Notice */}
            {recommendedProducts.length === 0 && trendingProducts.length === 0 && shoppingTrendsProducts.length === 0 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 p-6 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-gray-800 mb-1">No Recommendations</h3>
                <p className="text-xs text-gray-600">Start shopping to see personalized recommendations</p>
              </div>
            )}

            </div>
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="sticky top-0 bg-gradient-to-r from-[#184979] to-[#f26322] p-4 md:p-6 flex items-center justify-between">
              <h2 className="text-lg md:text-2xl font-black text-white">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-white hover:bg-white/20 p-1.5 md:p-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 md:p-6">
              <div className="space-y-3 md:space-y-4">
                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <h3 className="font-bold text-[#184979] text-sm md:text-base mb-2">Order Information</h3>
                  <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                    <div>
                      <p className="text-gray-600 text-[10px] md:text-xs">Order ID</p>
                      <p className="font-bold text-xs md:text-sm truncate">{selectedOrder.orderId}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-[10px] md:text-xs">Status</p>
                      <span className={`inline-block px-1.5 md:px-2 py-0.5 md:py-1 rounded text-[10px] md:text-xs font-bold ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-600 text-[10px] md:text-xs">Order Date</p>
                      <p className="font-bold text-xs md:text-sm">{new Date(getOrderDate(selectedOrder)).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-[10px] md:text-xs">Payment</p>
                      <p className="font-bold text-xs md:text-sm">{getPaymentMethod(selectedOrder)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <h3 className="font-bold text-[#184979] text-sm md:text-base mb-2">Shipping Address</h3>
                  {(() => {
                    const address = getShippingAddress(selectedOrder);
                    return (
                      <>
                        <p className="text-xs md:text-sm">{address.address}</p>
                        <p className="text-xs md:text-sm">{address.city}, {address.state} - {address.pincode}</p>
                      </>
                    );
                  })()}
                </div>

                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <h3 className="font-bold text-[#184979] text-sm md:text-base mb-2 md:mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={item._id || item.productId || idx} className="flex gap-2 md:gap-3 bg-white p-2 rounded">
                        <div className="relative w-10 h-10 md:w-12 md:h-12 rounded overflow-hidden flex-shrink-0">
                          <Image src={(item as any).thumbnail || item.imageUrl || '/placeholder.png'} alt={getItemName(item)} fill className="object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-xs md:text-sm truncate">{getItemName(item)}</p>
                          <p className="text-[10px] md:text-xs text-gray-600">Qty: {getItemQuantity(item)} × ₹{getItemPrice(item)}</p>
                          {(item as any).totalPrice && (item as any).totalPrice !== (getItemPrice(item) * getItemQuantity(item)) && (
                            <p className="text-[10px] text-green-600 font-bold">
                              Save ₹{((item as any).totalPrice - (getItemPrice(item) * getItemQuantity(item))).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {(item as any).totalPrice && (item as any).totalPrice !== (getItemPrice(item) * getItemQuantity(item)) ? (
                            <>
                              <p className="text-[10px] md:text-xs text-gray-500 line-through">₹{(item as any).totalPrice.toLocaleString()}</p>
                              <p className="font-bold text-xs md:text-sm text-[#f26322]">₹{(getItemPrice(item) * getItemQuantity(item)).toLocaleString()}</p>
                            </>
                          ) : (
                            <p className="font-bold text-xs md:text-sm text-[#f26322]">₹{(getItemPrice(item) * getItemQuantity(item)).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-300 flex justify-between items-center">
                    <span className="font-bold text-[#184979] text-sm md:text-base">Total Amount</span>
                    <span className="text-lg md:text-xl font-black text-[#184979]">₹{getOrderTotal(selectedOrder).toLocaleString()}</span>
                  </div>
                </div>

                {/* Reviews Section */}
                {selectedOrder.status === 'delivered' && (
                  <div className="bg-gray-50 rounded-lg p-3 md:p-4 mt-3 md:mt-4">
                    <h3 className="font-bold text-[#184979] text-sm md:text-base mb-2 md:mb-3">Product Reviews</h3>
                    <div className="space-y-3 md:space-y-4">
                      {selectedOrder.items.map((item, idx) => {
                        const reviews = productReviews[item.productId] || [];
                        const userReview = reviews.find((r: any) => r.user?._id === sessionStorage.getItem('userId') || r.userId === sessionStorage.getItem('userId'));
                        
                        return (
                          <div key={item._id || item.productId || idx} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex gap-3 items-start mb-2">
                              <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <Image src={(item as any).thumbnail || item.imageUrl || '/placeholder.png'} alt={getItemName(item)} fill className="object-contain" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-800 truncate">{getItemName(item)}</p>
                                {userReview ? (
                                  <div className="mt-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="flex items-center">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <span key={star} className="text-yellow-400 text-sm">
                                            {star <= userReview.rating ? '⭐' : '☆'}
                                          </span>
                                        ))}
                                      </div>
                                      {userReview.createdAt && (
                                        <span className="text-xs text-gray-500">
                                          {new Date(userReview.createdAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                    {userReview.title && (
                                      <p className="font-semibold text-xs text-gray-800 mb-1">{userReview.title}</p>
                                    )}
                                    <p className="text-xs text-gray-600 line-clamp-2">{userReview.comment}</p>
                                    {userReview.images && userReview.images.length > 0 && (
                                      <div className="flex gap-1 mt-2">
                                        {userReview.images.slice(0, 3).map((img: string, imgIdx: number) => (
                                          <div key={imgIdx} className="relative w-12 h-12 rounded overflow-hidden border border-gray-200">
                                            <Image src={img} alt={`Review ${imgIdx + 1}`} fill className="object-cover" />
                                          </div>
                                        ))}
                                        {userReview.images.length > 3 && (
                                          <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                            +{userReview.images.length - 3}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSelectedProduct(item);
                                      setShowReviewModal(true);
                                      fetchProductReviews(item.productId);
                                    }}
                                    className="mt-2 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded text-xs font-semibold hover:shadow-md transition-all flex items-center gap-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                    </svg>
                                    Write Review
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-200">
                {(selectedOrder.status === 'pending' || selectedOrder.status === 'confirmed') && (
                  <button
                    onClick={() => {
                      handleCancelOrder(selectedOrder);
                      setSelectedOrder(null);
                    }}
                    className="px-6 py-3 bg-white border-2 border-red-500 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Order
                  </button>
                )}
                <Link
                  href={`/track-order?orderId=${selectedOrder.orderId}`}
                  className="px-6 py-3 bg-gradient-to-r from-[#184979] to-[#1e5a8f] text-white rounded-lg font-bold text-sm hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  Track Order
                </Link>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all flex items-center gap-2 ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-md w-full max-h-[95vh] md:max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 md:p-6 flex items-center justify-between rounded-t-xl md:rounded-t-2xl flex-shrink-0">
              <h2 className="text-lg md:text-xl font-black text-white">Write a Review</h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-white hover:bg-white/20 p-1.5 md:p-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              <div className="flex gap-2 md:gap-3 mb-4 p-2 md:p-3 bg-gray-50 rounded-lg">
                <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={(selectedProduct as any).thumbnail || selectedProduct.imageUrl || '/placeholder.png'} alt={getItemName(selectedProduct)} fill className="object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#184979] text-sm md:text-base truncate">{getItemName(selectedProduct)}</p>
                  <p className="text-xs md:text-sm text-gray-600">₹{getItemPrice(selectedProduct).toLocaleString()}</p>
                </div>
              </div>

              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-bold text-[#184979] mb-2">Rating</label>
                <div className="flex gap-1 md:gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="text-2xl md:text-3xl transition-transform hover:scale-110"
                    >
                      {star <= reviewRating ? '⭐' : '☆'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-bold text-[#184979] mb-1.5 md:mb-2">Review Title <span className="text-gray-400 text-[10px] md:text-xs font-normal">(Optional)</span></label>
                <input
                  type="text"
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none bg-white text-gray-900 placeholder:text-gray-500"
                  placeholder="Summarize your experience..."
                />
              </div>

              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-bold text-[#184979] mb-1.5 md:mb-2">Your Review <span className="text-gray-400 text-[10px] md:text-xs font-normal">(Optional)</span></label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none resize-none bg-white text-gray-900 placeholder:text-gray-500"
                  placeholder="Share your experience with this product..."
                />
              </div>

              <div className="mb-3 md:mb-4">
                <label className="block text-xs md:text-sm font-bold text-[#184979] mb-1.5 md:mb-2">Add Photos (Optional)</label>
                <div className="space-y-2 md:space-y-3">
                  {reviewImages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {reviewImages.map((image, index) => (
                        <div key={index} className="relative w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 border-gray-300">
                          <Image src={image} alt={`Review ${index + 1}`} fill className="object-cover" />
                          <button
                            onClick={() => handleRemoveReviewImage(index)}
                            className="absolute top-0.5 right-0.5 md:top-1 md:right-1 bg-red-500 text-white rounded-full p-0.5 md:p-1 hover:bg-red-600 transition-colors"
                          >
                            <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {reviewImages.length < 5 && (
                    <label className="flex items-center justify-center gap-2 px-3 md:px-4 py-2.5 md:py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition-colors">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs md:text-sm font-medium text-gray-600">
                        {uploadingImages ? 'Uploading...' : `Add Photos (${reviewImages.length}/5)`}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleReviewImageUpload}
                        disabled={uploadingImages}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <button
                onClick={submitReview}
                disabled={submittingReview}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submittingReview ? (
                  <>
                    <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {showQuestionModal && selectedProduct && (
        <div key={selectedProduct.productId} className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-[#184979] to-blue-600 p-3 md:p-5 flex items-center justify-between rounded-t-xl md:rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-4 flex-wrap">
                <h2 className="text-base md:text-xl font-black text-white">Product Q&A</h2>
                <button
                  onClick={() => {
                    setShowMyQuestions(!showMyQuestions);
                    if (!showMyQuestions && myQuestions.length === 0) {
                      fetchMyQuestions();
                    }
                  }}
                  className={`px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-semibold rounded-lg transition-all ${
                    showMyQuestions 
                      ? 'bg-white text-[#184979]' 
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  My Questions
                </button>
              </div>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="text-white hover:bg-white/20 p-1.5 md:p-2 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3 md:p-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {/* Product Info */}
              <div className="flex gap-2 md:gap-3 mb-4 md:mb-6 p-2 md:p-4 bg-gray-50 rounded-lg">
                <div className="relative w-14 h-14 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0">
                  <Image src={(selectedProduct as any).thumbnail || selectedProduct.imageUrl || '/placeholder.png'} alt={getItemName(selectedProduct)} fill className="object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#184979] text-sm md:text-lg truncate">{getItemName(selectedProduct)}</p>
                  <p className="text-xs md:text-sm text-gray-600">₹{getItemPrice(selectedProduct).toLocaleString()}</p>
                </div>
              </div>

              {/* Ask Question Form */}
              <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h3 className="font-bold text-[#184979] mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ask Your Question
                </h3>
                
                <div className="mb-2 md:mb-3">
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Question Title <span className="text-gray-400 text-[10px] md:text-xs font-normal">(Optional)</span></label>
                  <input
                    type="text"
                    value={questionTitle}
                    onChange={(e) => setQuestionTitle(e.target.value)}
                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:border-[#184979] focus:outline-none bg-white text-gray-900 placeholder:text-gray-500"
                    placeholder="Summarize your question..."
                  />
                </div>

                <div className="mb-2 md:mb-3">
                  <label className="block text-xs md:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">Your Question <span className="text-red-500">*</span></label>
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    rows={2}
                    className="w-full px-2 md:px-3 py-1.5 md:py-2 text-sm md:text-base border-2 border-gray-300 rounded-lg focus:border-[#184979] focus:outline-none resize-none bg-white text-gray-900 placeholder:text-gray-500"
                    placeholder="Ask anything about this product..."
                  />
                </div>

                <button
                  onClick={submitQuestion}
                  disabled={!questionText.trim() || submittingQuestion}
                  className="w-full py-2 md:py-3 bg-gradient-to-r from-[#184979] to-blue-600 text-white rounded-lg font-bold text-sm md:text-base hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submittingQuestion ? (
                    <>
                      <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Submit Question
                    </>
                  )}
                </button>
              </div>

              {/* Existing Questions */}
              {!showMyQuestions && (
              <div>
                <h3 className="font-bold text-[#184979] mb-2 md:mb-3 flex items-center gap-2 text-sm md:text-base">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Questions from Customers
                </h3>
                
                {(() => {
                  const currentProductId = selectedProduct.productId;
                  const questions = productQuestions[currentProductId] || [];
                  
                  
                  if (loadingQuestions) {
                    return (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 border-4 border-[#184979] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                        <p className="text-gray-600 text-sm">Loading questions...</p>
                      </div>
                    );
                  }
                  
                  if (questions.length === 0) {
                    return (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="font-semibold text-gray-800 mb-1">No questions yet</p>
                        <p className="text-sm text-gray-600">Be the first to ask about this product!</p>
                      </div>
                    );
                  }
                  
                  return (
                    <div className="space-y-4">
                      {questions.slice(0, 5).map((q: any) => (
                        <div key={q._id} className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <div className="flex gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-[#184979] font-bold text-lg">
                                {q.userId?.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900">{q.userId?.name || 'Anonymous'}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(q.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              {q.title && (
                                <p className="font-semibold text-[#184979] mb-1">{q.title}</p>
                              )}
                              <p className="text-gray-700">{q.question}</p>
                              
                              {/* Voting and Stats */}
                              <div className="flex items-center gap-3 mt-3">
                                <button
                                  onClick={() => handleVoteQuestionHelpful(q._id)}
                                  disabled={questionVotes[q._id]?.voted}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700"
                                >
                                  <svg className="w-4 h-4" fill={questionVotes[q._id]?.voted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                  </svg>
                                  {questionVotes[q._id]?.voted ? 'Voted' : 'Helpful'}
                                  {(questionVotes[q._id]?.count || q.helpfulCount || 0) > 0 && (
                                    <span className="ml-1">({questionVotes[q._id]?.count || q.helpfulCount})</span>
                                  )}
                                </button>
                                <button
                                  onClick={() => setShowAnswerForm(prev => ({ ...prev, [q._id]: !prev[q._id] }))}
                                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all bg-blue-100 hover:bg-blue-200 text-blue-700"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                  </svg>
                                  Answer
                                </button>
                                {q.answers && q.answers.length > 0 && (
                                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                    </svg>
                                    {q.answers.length} {q.answers.length === 1 ? 'Answer' : 'Answers'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Answer Form */}
                          {showAnswerForm[q._id] && (
                            <div className="mt-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                              <label className="block text-sm font-semibold text-[#184979] mb-2">Your Answer</label>
                              <textarea
                                value={answerText[q._id] || ''}
                                onChange={(e) => setAnswerText(prev => ({ ...prev, [q._id]: e.target.value }))}
                                rows={3}
                                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#184979] focus:outline-none resize-none text-sm bg-white text-gray-900 placeholder:text-gray-500"
                                placeholder="Share your knowledge and help others..."
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleSubmitAnswer(q._id)}
                                  disabled={!answerText[q._id]?.trim() || submittingAnswer === q._id}
                                  className="px-4 py-2 bg-gradient-to-r from-[#184979] to-blue-600 text-white rounded-lg font-semibold text-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  {submittingAnswer === q._id ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                      </svg>
                                      Submitting...
                                    </>
                                  ) : (
                                    'Submit Answer'
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowAnswerForm(prev => ({ ...prev, [q._id]: false }));
                                    setAnswerText(prev => ({ ...prev, [q._id]: '' }));
                                  }}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-300 transition-all"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Answers */}
                          {q.answers && q.answers.length > 0 && (
                            <div className="ml-10 mt-3 space-y-2 border-l-2 border-green-200 pl-4">
                              {q.answers.map((answer: any) => {
                                const userId = sessionStorage.getItem('userId');
                                const isOwnAnswer = answer.userId?._id === userId || answer.user?.name === sessionStorage.getItem('userName');
                                const isOfficial = answer.isSellerAnswer === true;
                                
                                return (
                                <div key={answer._id} className={`p-3 rounded-lg border-2 ${
                                  isOwnAnswer ? 'bg-blue-50 border-blue-300' :
                                  isOfficial ? 'bg-green-50 border-green-300' :
                                  'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    {isOfficial && (
                                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        VERIFIED
                                      </span>
                                    )}
                                    {isOwnAnswer && (
                                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        YOUR ANSWER
                                      </span>
                                    )}
                                    {!isOwnAnswer && !isOfficial && (
                                      <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        {answer.user?.name || answer.userId?.name || 'User'}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500 ml-auto">
                                      {new Date(answer.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className={`text-sm font-medium ${
                                    isOwnAnswer ? 'text-blue-900' :
                                    isOfficial ? 'text-green-900' :
                                    'text-gray-700'
                                  }`}>{answer.answer}</p>
                                  
                                  {/* Answer Voting */}
                                  <button
                                    onClick={() => handleVoteAnswerHelpful(q._id, answer._id)}
                                    disabled={answerVotes[answer._id]?.voted}
                                    className="flex items-center gap-1 mt-2 px-2 py-1 text-xs font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-green-100 hover:bg-green-200 text-green-700"
                                  >
                                    <svg className="w-3 h-3" fill={answerVotes[answer._id]?.voted ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 20 20">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                                    </svg>
                                    {answerVotes[answer._id]?.voted ? 'Voted' : 'Helpful'}
                                    {(answerVotes[answer._id]?.count || answer.helpfulCount || 0) > 0 && (
                                      <span>({answerVotes[answer._id]?.count || answer.helpfulCount})</span>
                                    )}
                                  </button>
                                </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                      {questions.length > 5 && (
                        <p className="text-sm text-gray-600 text-center">Showing 5 of {questions.length} questions</p>
                      )}
                    </div>
                  );
                })()}
              </div>
              )}

              {/* My Questions Section */}
              {showMyQuestions && (
                <div>
                  <h3 className="font-bold text-[#184979] mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Questions
                  </h3>

                  {loadingMyQuestions ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 border-4 border-[#184979] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                      <p className="text-gray-600 text-sm">Loading your questions...</p>
                    </div>
                  ) : myQuestions.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <svg className="w-16 h-16 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-semibold text-gray-800 mb-1">No questions yet</p>
                      <p className="text-sm text-gray-600">You haven't asked any questions</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myQuestions.map((q: any) => (
                        <div key={q._id} className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-2 justify-between">
                              <div className="flex items-center gap-2 flex-1">
                              {q.productId?.title && (
                                <div className="flex items-center gap-2 mb-2">
                                  {q.productId.thumbnail && (
                                    <div className="relative w-10 h-10 rounded overflow-hidden">
                                      <Image src={q.productId.thumbnail} alt={q.productId.title} fill className="object-contain" />
                                    </div>
                                  )}
                                  <span className="text-xs font-semibold text-gray-600">{q.productId.title}</span>
                                </div>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(q.createdAt).toLocaleDateString()}
                              </span>
                              </div>
                              <button
                                onClick={() => handleDeleteQuestion(q._id)}
                                disabled={deletingQuestion === q._id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete question"
                              >
                                {deletingQuestion === q._id ? (
                                  <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            {q.title && (
                              <p className="font-semibold text-[#184979] mb-1">{q.title}</p>
                            )}
                            <p className="text-gray-700">{q.question}</p>
                            
                            {/* Status Badge */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                q.status === 'answered' ? 'bg-green-100 text-green-700' :
                                q.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {q.status === 'answered' ? '✓ Answered' : '⏳ Pending'}
                              </span>
                              {q.helpfulCount > 0 && (
                                <span className="text-xs text-gray-600">
                                  {q.helpfulCount} found helpful
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Answers */}
                          {q.answers && q.answers.length > 0 && (
                            <div className="mt-3 space-y-2 border-l-2 border-green-200 pl-4">
                              {q.answers.map((answer: any) => {
                                const userId = sessionStorage.getItem('userId');
                                const isOwnAnswer = answer.userId?._id === userId || answer.user?.name === sessionStorage.getItem('userName');
                                const isOfficial = answer.isSellerAnswer === true;
                                
                                return (
                                <div key={answer._id} className={`p-3 rounded-lg border-2 ${
                                  isOwnAnswer ? 'bg-blue-50 border-blue-300' :
                                  isOfficial ? 'bg-green-50 border-green-300' :
                                  'bg-gray-50 border-gray-200'
                                }`}>
                                  <div className="flex items-center gap-2 mb-2">
                                    {isOfficial && (
                                      <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        VERIFIED
                                      </span>
                                    )}
                                    {isOwnAnswer && (
                                      <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        YOUR ANSWER
                                      </span>
                                    )}
                                    {!isOwnAnswer && !isOfficial && (
                                      <span className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                        </svg>
                                        {answer.user?.name || answer.userId?.name || 'User'}
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-500 ml-auto">
                                      {new Date(answer.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className={`text-sm font-medium ${
                                    isOwnAnswer ? 'text-blue-900' :
                                    isOfficial ? 'text-green-900' :
                                    'text-gray-700'
                                  }`}>{answer.answer}</p>
                                </div>
                              );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {showCancelModal && orderToCancel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Cancel Order</h2>
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-bold text-yellow-800 text-sm mb-1">Are you sure?</p>
                    <p className="text-xs text-yellow-700">Order #{orderToCancel.orderId} will be cancelled and cannot be restored.</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-[#184979] mb-2">Reason for Cancellation *</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none bg-white text-gray-900"
                >
                  <option value="">Select a reason</option>
                  <option value="changed_mind">Changed my mind</option>
                  <option value="ordered_by_mistake">Ordered by mistake</option>
                  <option value="found_better_price">Found better price elsewhere</option>
                  <option value="delivery_time">Delivery time too long</option>
                  <option value="payment_issue">Payment issue</option>
                  <option value="other">Other reason</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                  disabled={cancellingOrder}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Keep Order
                </button>
                <button
                  onClick={confirmCancelOrder}
                  disabled={!cancelReason || cancellingOrder}
                  className="flex-1 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {cancellingOrder ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cancelling...
                    </>
                  ) : (
                    'Cancel Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Retry Payment Modal */}
      {showRetryPaymentModal && orderToRetry && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 flex items-center justify-between">
              <h2 className="text-xl font-black text-white">Retry Payment</h2>
              <button
                onClick={() => setShowRetryPaymentModal(false)}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-4">
                <div className="flex gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-bold text-blue-800 text-sm mb-1">Payment Failed</p>
                    <p className="text-xs text-blue-700">Your previous payment attempt for order #{orderToRetry.orderId} was unsuccessful.</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Order Total</span>
                  <span className="text-2xl font-black text-[#184979]">₹{getOrderTotal(orderToRetry).toLocaleString()}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {orderToRetry.items.length} item(s) • Order ID: {orderToRetry.orderId}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-2">You will be redirected to the payment gateway to complete your payment securely.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowRetryPaymentModal(false)}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRetryPayment}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Proceed to Pay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-8 right-8 z-[99999] animate-slide-in-right">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-xl border-2 ${
            toast.type === 'success' ? 'bg-green-50/95 border-green-500 text-green-800' :
            toast.type === 'error' ? 'bg-red-50/95 border-red-500 text-red-800' :
            'bg-orange-50/95 border-orange-500 text-orange-800'
          }`}>
            {toast.type === 'success' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <p className="font-semibold text-sm">{toast.message}</p>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className="ml-2 p-1 hover:bg-white/30 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
