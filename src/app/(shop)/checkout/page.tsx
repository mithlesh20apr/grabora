'use client';

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLoader } from '@/components/ui/Loader';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface UserInfo {
  fullName: string;
  email: string;
  phone: string;
}

interface ShippingAddress {
  id?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  label?: string;
  isDefault?: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
      const { cartItems, cartCount, getCartTotal, removeFromCart, updateQuantity, clearCart, validateCartForCheckout, syncCartWithBackend } = useCart();
  const { user, isAuthenticated, getCurrentUser } = useAuth();
  const { showLoader, hideLoader } = useLoader();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ show: false, message: '', type: 'success' });
  
  // User Information
  const [userInfo, setUserInfo] = useState<UserInfo>({
    fullName: '',
    email: '',
    phone: '',
  });

  // Shipping Addresses (Multiple)
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Shipping Address (Current being edited/added)
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('online');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'card' | 'upi' | 'netbanking'>('card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Card Payment Details
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardHolder: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
  });

  const [detectedCardType, setDetectedCardType] = useState<'visa' | 'mastercard' | 'amex' | 'rupay' | 'discover' | 'unknown'>('unknown');
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Detect card type based on card number
  const detectCardType = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    
    // Visa: starts with 4
    if (/^4/.test(cleanNumber)) {
      return 'visa';
    }
    // Mastercard: starts with 51-55 or 2221-2720
    if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
      return 'mastercard';
    }
    // American Express: starts with 34 or 37
    if (/^3[47]/.test(cleanNumber)) {
      return 'amex';
    }
    // RuPay: starts with 60, 6521, 6522
    if (/^(60|6521|6522)/.test(cleanNumber)) {
      return 'rupay';
    }
    // Discover: starts with 6011, 622126-622925, 644-649, 65
    if (/^(6011|622|64|65)/.test(cleanNumber)) {
      return 'discover';
    }
    
    return 'unknown';
  };

  // UPI Payment Details
  const [upiDetails, setUpiDetails] = useState({
    upiId: '',
    qrCode: '',
  });
  
  const [isValidUpiId, setIsValidUpiId] = useState<boolean | null>(null);
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('');
  const [paymentTimeoutId, setPaymentTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Coupon Functionality
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount: number;
    type: 'percentage' | 'fixed';
    description?: string;
    maxDiscountValue?: number;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [showCouponList, setShowCouponList] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [deliveryConfig, setDeliveryConfig] = useState({ freeDeliveryThreshold: 499, deliveryCharge: 99 });
  const [deliveryEstimate, setDeliveryEstimate] = useState<any>(null);
  const [pincodeDeliveryInfo, setPincodeDeliveryInfo] = useState<any>(null);
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [calculatedShippingCharges, setCalculatedShippingCharges] = useState<number>(99);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState<boolean>(true); // Track if delivery is available for pincode
  const [deliveryErrorMessage, setDeliveryErrorMessage] = useState<string>(''); // Store delivery error message
  const [isScrolled, setIsScrolled] = useState(false);
  const orderSummaryRef = useRef<HTMLDivElement>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);
  const hasLoadedUser = useRef(false);

  // Hide loader on page mount (in case navigated from cart)
  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  // Authentication check on page load
  useEffect(() => {
    const checkAuth = async () => {
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        showToast('Please login to proceed with checkout', 'error');
        router.push('/login?returnUrl=/checkout');
        return;
      }

      // Verify token is valid by getting current user (this is working)
      try {
        if (!isAuthenticated || !user) {
          await getCurrentUser();
        } else {
        }
        
      } catch (error) {
        sessionStorage.removeItem('token');
        showToast('Session expired. Please login again.', 'error');
        router.push('/login?returnUrl=/checkout');
      }
    };

    checkAuth();
  }, [getCurrentUser, router, isAuthenticated, user]);

  // Track scroll position for sticky order summary
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 200;
      
      // Check if we're near the bottom of the content
      if (contentEndRef.current) {
        const contentEndRect = contentEndRef.current.getBoundingClientRect();
        const shouldDisableSticky = contentEndRect.bottom <= window.innerHeight;
        
        if (shouldDisableSticky) {
          setIsScrolled(false);
        } else {
          setIsScrolled(scrolled);
        }
      } else {
        setIsScrolled(scrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Validate UPI ID format
  const validateUpiId = (upiId: string) => {
    // UPI ID format: username@bankname (e.g., 9876543210@paytm, user@oksbi)
    const upiRegex = /^[\w.-]+@[a-zA-Z]+$/;
    return upiRegex.test(upiId);
  };

  // Net Banking
  const [selectedBank, setSelectedBank] = useState('');

  // Generate UPI QR Code
  useEffect(() => {
    if (selectedPaymentType === 'upi' && paymentMethod === 'online') {
      // Generate UPI QR code (in real app, this would be generated by backend)
      const upiString = `upi://pay?pa=grabora@paytm&pn=Grabora&am=${getCartTotal()}&cu=INR&tn=Order Payment`;
      setUpiDetails(prev => ({ ...prev, qrCode: upiString }));
    }
  }, [selectedPaymentType, paymentMethod, getCartTotal]);

  // Form Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Check for payment failure and show message
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    
    if (paymentStatus === 'failed') {
      showToast('Payment failed. Please try again or choose a different payment method.', 'error');
      // Remove the query parameter
      window.history.replaceState({}, '', '/checkout');
    }
  }, []);

  // Toast notification helper
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  // Load user data on mount and fetch from API
  useEffect(() => {
    const loadUserData = async () => {
      
      // Check sessionStorage directly
      const token = sessionStorage.getItem('token');
      const storedUser = sessionStorage.getItem('user');
      
      // Redirect if cart is empty (but not during order processing or if we have a current order)
      const currentOrderId = sessionStorage.getItem('current_order_id');
      if (cartCount === 0 && !isProcessingOrder && !currentOrderId) {
        router.push('/cart');
        return;
      }
      
      // Check if user is authenticated
      if (isAuthenticated && !hasLoadedUser.current) {
        hasLoadedUser.current = true;
        setIsLoggedIn(true);
        
        // Fetch latest user data from API once
        try {
          await getCurrentUser();
        } catch (error) {
        }
        
        // Sync cart with backend to ensure prices are accurate
        if (syncCartWithBackend) {
          try {
            const syncResult = await syncCartWithBackend();
            if (!syncResult.success && syncResult.message) {
              console.warn('Cart sync warning:', syncResult.message);
            }
          } catch (error) {
            console.error('Cart sync error:', error);
          }
        }
      } else if (!isAuthenticated) {
        setShowLoginModal(true);
      } else {
      }
    };
    
    loadUserData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartCount, router, isProcessingOrder, isAuthenticated, getCurrentUser]);

  // Fetch available coupons and delivery config on mount
  useEffect(() => {
    const fetchConfigData = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        
        // Fetch coupons
        const couponsResponse = await fetch(`${apiBaseUrl}/coupons`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const couponsResult = await couponsResponse.json();
        
        if (couponsResult.success && couponsResult.data) {
          const activeCoupons = couponsResult.data.filter((coupon: any) => coupon.status === 'active');
          setAvailableCoupons(activeCoupons);
        }
        
        // Use static delivery configuration
        setDeliveryConfig({
          freeDeliveryThreshold: 499,
          deliveryCharge: 99
        });
      } catch (error) {
      }
    };
    
    fetchConfigData();
  }, []);

  // Update userInfo when user data changes
  useEffect(() => {
    if (user) {
      const fullName = user.fullName || 
                     (user.firstName && user.lastName 
                       ? `${user.firstName} ${user.lastName}`.trim()
                       : user.firstName || user.username || '');
      
      // Clean phone number - remove country code if present
      let cleanPhone = user.phone || '';
      if (cleanPhone.startsWith('+91')) {
        cleanPhone = cleanPhone.substring(3).trim();
      } else if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.substring(2).trim();
      }
      
      
      setUserInfo({
        fullName: fullName,
        email: user.email || '',
        phone: cleanPhone,
      });
      
      // Load saved addresses from localStorage
      const addresses = JSON.parse(localStorage.getItem('grabora_addresses') || '[]');
      setSavedAddresses(addresses);
      
      // Set default address if exists
      const defaultAddr = addresses.find((addr: ShippingAddress) => addr.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id || null);
        setShippingAddress(defaultAddr);
      }
    }
  }, [user]);

  // Check delivery availability when pincode changes
  useEffect(() => {
    const checkDeliveryAvailability = async () => {
      if (shippingAddress.pincode && shippingAddress.pincode.length === 6) {
        setIsCheckingPincode(true);
        try {
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
          
          // Check delivery availability for pincode using /delivery/check API
          const deliveryCheckResponse = await fetch(`${apiBaseUrl}/delivery/check/${shippingAddress.pincode}`);
          
          if (deliveryCheckResponse.ok) {
            const deliveryCheckResult = await deliveryCheckResponse.json();
            
            if (deliveryCheckResult.success && deliveryCheckResult.data) {
              const checkData = deliveryCheckResult.data;
              setPincodeDeliveryInfo(checkData);
              
              // Set delivery availability based on isServiceable
              if (checkData.isServiceable === false) {
                setIsDeliveryAvailable(false);
                setDeliveryErrorMessage(checkData.message || 'Delivery not available for this pincode');
                showToast(checkData.message || 'Delivery not available for this pincode', 'error');
              } else {
                setIsDeliveryAvailable(true);
                setDeliveryErrorMessage('');
              }
              
              // If COD is not available and user had selected COD, switch to online payment
              if (checkData.codAvailable === false && paymentMethod === 'cod') {
                setPaymentMethod('online');
                showToast('Cash on Delivery is not available for this pincode. Switched to online payment.', 'warning');
              }
              
              // Pre-populate delivery estimate from check API if available
              if (checkData.estimatedDelivery || checkData.shippingCharges !== undefined) {
                setDeliveryEstimate((prev: typeof deliveryEstimate) => ({
                  ...prev,
                  ...checkData,
                  deliveryPartner: checkData.delivery?.message || 'Standard Delivery',
                }));
              }
            }
          } else {
            // Handle error response
            const errorResult = await deliveryCheckResponse.json().catch(() => null);
            if (errorResult && !errorResult.success) {
              setIsDeliveryAvailable(false);
              setDeliveryErrorMessage(errorResult.message || 'Delivery not available for this pincode');
              showToast(errorResult.message || 'Delivery not available for this pincode', 'error');
            }
          }
          
        } catch (error) {
          console.error('Failed to check delivery availability:', error);
        } finally {
          setIsCheckingPincode(false);
        }
      } else {
        setPincodeDeliveryInfo(null);
        setDeliveryEstimate(null);
        // Reset delivery availability when pincode is cleared
        setIsDeliveryAvailable(true);
        setDeliveryErrorMessage('');
      }
    };
    
    checkDeliveryAvailability();
    // Also calculate shipping charges when pincode changes
    calculateShippingCharges();
  }, [shippingAddress.pincode]);

  // Recalculate shipping when cart total, payment method, or coupon changes
  // (This useEffect will be moved after variable declarations)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple login - store user info in localStorage
    const userData = { ...userInfo, ...shippingAddress };
    localStorage.setItem('grabora_user', JSON.stringify(userData));
    setIsLoggedIn(true);
    setShowLoginModal(false);
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser', 'error');
      return;
    }

    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Using OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();
          
          if (data && data.address) {
            const addr = data.address;
            setShippingAddress({
              address: `${addr.road || ''} ${addr.neighbourhood || ''}`.trim() || addr.display_name,
              city: addr.city || addr.town || addr.village || '',
              state: addr.state || '',
              pincode: addr.postcode || '',
              country: addr.country || 'India',
            });
          }
        } catch (error) {
          showToast('Could not fetch address details. Please enter manually.', 'warning');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        showToast('Unable to retrieve your location. Please check permissions.', 'error');
        setIsDetectingLocation(false);
      }
    );
  };

  const handleSaveAddress = () => {
    if (!validateShippingAddress()) {
      return;
    }

    const newAddress: ShippingAddress = {
      ...shippingAddress,
      id: Date.now().toString(),
      label: shippingAddress.label || 'Home',
      isDefault: savedAddresses.length === 0, // First address is default
    };

    const updatedAddresses = [...savedAddresses, newAddress];
    setSavedAddresses(updatedAddresses);
    localStorage.setItem('grabora_addresses', JSON.stringify(updatedAddresses));
    
    setSelectedAddressId(newAddress.id || null);
    setIsAddingNewAddress(false);
    setErrors({});
  };

  const handleSelectAddress = (address: ShippingAddress) => {
    setSelectedAddressId(address.id || null);
    setShippingAddress(address);
    setIsAddingNewAddress(false);
  };

  const handleDeleteAddress = (addressId: string) => {
    const updatedAddresses = savedAddresses.filter(addr => addr.id !== addressId);
    setSavedAddresses(updatedAddresses);
    localStorage.setItem('grabora_addresses', JSON.stringify(updatedAddresses));
    
    if (selectedAddressId === addressId) {
      setSelectedAddressId(null);
      setShippingAddress({
        address: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!userInfo.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!userInfo.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(userInfo.email)) newErrors.email = 'Email is invalid';
    if (!userInfo.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(userInfo.phone)) newErrors.phone = 'Phone number must be 10 digits';

    if (!shippingAddress.address.trim()) newErrors.address = 'Address is required';
    if (!shippingAddress.city.trim()) newErrors.city = 'City is required';
    if (!shippingAddress.state.trim()) newErrors.state = 'State is required';
    if (!shippingAddress.pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(shippingAddress.pincode)) newErrors.pincode = 'Pincode must be 6 digits';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateContactInfo = () => {
    const newErrors: Record<string, string> = {};

    if (!userInfo.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!userInfo.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(userInfo.email)) newErrors.email = 'Email is invalid';
    if (!userInfo.phone.trim()) newErrors.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(userInfo.phone)) newErrors.phone = 'Phone number must be 10 digits';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateShippingAddress = () => {
    const newErrors: Record<string, string> = {};

    if (!shippingAddress.address.trim()) newErrors.address = 'Address is required';
    if (!shippingAddress.city.trim()) newErrors.city = 'City is required';
    if (!shippingAddress.state.trim()) newErrors.state = 'State is required';
    if (!shippingAddress.pincode.trim()) newErrors.pincode = 'Pincode is required';
    else if (!/^\d{6}$/.test(shippingAddress.pincode)) newErrors.pincode = 'Pincode must be 6 digits';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinueToAddress = () => {
    if (validateContactInfo()) {
      setCompletedSteps([...completedSteps, 1]);
      setCurrentStep(2);
      setErrors({});
    }
  };

  const handleContinueToPayment = () => {
    // Check if an address is selected or being added
    if (!selectedAddressId && !isAddingNewAddress) {
      alert('Please select or add a shipping address');
      return;
    }

    // If adding new address, validate and save it first
    if (isAddingNewAddress) {
      if (validateShippingAddress()) {
        handleSaveAddress();
        setCompletedSteps([...completedSteps, 2]);
        setCurrentStep(3);
        setErrors({});
      }
    } else {
      setCompletedSteps([...completedSteps, 2]);
      setCurrentStep(3);
      setErrors({});
    }
  };

  // Coupon Functions
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      const response = await fetch(`${apiBaseUrl}/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          code: couponCode.toUpperCase(),
          cartValue: getCartTotal()
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const couponData = result.data;
        setAppliedCoupon({
          code: couponData.couponCode,
          discount: typeof couponData.discountAmount === 'number' && !isNaN(couponData.discountAmount) ? couponData.discountAmount : 0,
          type: couponData.discountType === 'percent' ? 'percentage' : 'fixed',
          description: couponData.discountType === 'percent'
            ? `${couponData.discountAmount}% off`
            : `₹${couponData.discountAmount} off`,
        });
        setCartTotalOverride(
          typeof couponData.newTotal === 'number' && !isNaN(couponData.newTotal)
            ? couponData.newTotal
            : undefined
        );
        showToast(`Coupon "${couponData.couponCode}" applied successfully! 🎉`, 'success');
        setCouponCode('');
        setShowCouponList(false);
      } else {
        setCouponError(result.message || 'Invalid coupon code');
        showToast(result.message || 'Invalid coupon code', 'error');
      }
    } catch (error) {
      setCouponError('Failed to apply coupon. Please try again.');
      showToast('Failed to apply coupon', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  // Apply coupon directly with code parameter (for list items)
  const applyCouponDirect = async (code: string) => {
    setCouponLoading(true);
    setCouponError('');

    try {
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      const response = await fetch(`${apiBaseUrl}/coupons/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          code: code,
          cartValue: getCartTotal()
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const couponData = result.data;
        setAppliedCoupon({
          code: couponData.couponCode,
          discount: typeof couponData.discountAmount === 'number' && !isNaN(couponData.discountAmount) ? couponData.discountAmount : 0,
          type: couponData.discountType === 'percent' ? 'percentage' : 'fixed',
          description: couponData.discountType === 'percent'
            ? `${couponData.discountAmount}% off`
            : `₹${couponData.discountAmount} off`,
        });
        setCartTotalOverride(
          typeof couponData.newTotal === 'number' && !isNaN(couponData.newTotal)
            ? couponData.newTotal
            : undefined
        );
        showToast(`Coupon "${couponData.couponCode}" applied successfully! 🎉`, 'success');
        setCouponCode('');
        setShowCouponList(false);
      } else {
        setCouponError(result.message || 'Invalid coupon code');
        showToast(result.message || 'Invalid coupon code', 'error');
      }
    } catch (error) {
      setCouponError('Failed to apply coupon. Please try again.');
      showToast('Failed to apply coupon', 'error');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCartTotalOverride(undefined);
    setCouponCode('');
    setCouponError('');
    showToast('Coupon removed', 'success');
  };

  // Store overridden cart total after coupon
  const [cartTotalOverride, setCartTotalOverride] = useState<number | undefined>(undefined);

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    // Use the discount directly from appliedCoupon (from API)
    return typeof appliedCoupon.discount === 'number' && !isNaN(appliedCoupon.discount)
      ? appliedCoupon.discount
      : 0;
  };

  const getFinalTotal = () => {
    if (typeof cartTotalOverride === 'number' && !isNaN(cartTotalOverride)) {
      // If cartTotalOverride is set (from coupon API), add delivery charges to it
      return cartTotalOverride + calculatedShippingCharges;
    }
    const subtotal = getCartTotal();
    const discount = calculateDiscount();
    return Math.max(subtotal - discount + calculatedShippingCharges, 0);
  };

  // Calculate delivery charges using shipping API
  const calculateShippingCharges = async () => {
    if (!shippingAddress.pincode || shippingAddress.pincode.length !== 6) {
      setCalculatedShippingCharges(deliveryConfig.deliveryCharge);
      // Reset delivery availability when pincode is incomplete
      setIsDeliveryAvailable(true);
      setDeliveryErrorMessage('');
      return;
    }

    // Check if cart has items and valid total
    const baseCartTotal = getCartTotal();
    if (!baseCartTotal || baseCartTotal <= 0 || cartItems.length === 0) {
      setCalculatedShippingCharges(deliveryConfig.deliveryCharge);
      return;
    }

    setIsCalculatingShipping(true);
    // Reset error state before checking
    setDeliveryErrorMessage('');
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      // Calculate request payload
      const requestPayload = {
        pincode: shippingAddress.pincode,
        cartTotal: Math.max(
          typeof cartTotalOverride === 'number' && !isNaN(cartTotalOverride) 
            ? cartTotalOverride 
            : getCartTotal() - calculateDiscount(),
          1 // Ensure minimum cart total of 1
        ),
        weight: Math.max(cartItems.reduce((total, item) => total + (item.quantity * 0.5), 0), 0.1), // Minimum weight 0.1kg
        cod: paymentMethod === 'cod'
      };
      
      
      // Calculate shipping cost using the shipping API
      const response = await fetch(`${apiBaseUrl}/delivery/calculate-shipping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // Delivery is available - reset error states
          setIsDeliveryAvailable(true);
          setDeliveryErrorMessage('');
          // Use totalShipping from API response
          setCalculatedShippingCharges(result.data.totalShipping || 0);
          // Store complete shipping details for display
          setDeliveryEstimate(result.data);
          
          // If COD is not available and user had selected COD, switch to online payment
          if (!result.data.codAvailable && paymentMethod === 'cod') {
            setPaymentMethod('online');
            showToast('Cash on Delivery is not available for this pincode. Switched to online payment.', 'warning');
          }
        } else {
          // API returned success: false - delivery not available
          setIsDeliveryAvailable(false);
          setDeliveryErrorMessage(result.message || 'Delivery not available for this pincode');
          showToast(result.message || 'Delivery not available for this pincode', 'error');
          // Set high shipping to indicate issue
          setCalculatedShippingCharges(0);
          setDeliveryEstimate(null);
        }
      } else {
        // Response not OK - try to parse error message
        const errorResult = await response.json().catch(() => null);
        if (errorResult && !errorResult.success) {
          setIsDeliveryAvailable(false);
          setDeliveryErrorMessage(errorResult.message || 'Delivery not available for this pincode');
          showToast(errorResult.message || 'Delivery not available for this pincode', 'error');
          setCalculatedShippingCharges(0);
          setDeliveryEstimate(null);
        } else {
          throw new Error('Failed to calculate shipping');
        }
      }
    } catch (error) {
      // Fallback to basic calculation - but keep delivery available true for network errors
      const effectiveTotal = typeof cartTotalOverride === 'number' && !isNaN(cartTotalOverride) 
        ? cartTotalOverride 
        : getCartTotal() - calculateDiscount();
      setCalculatedShippingCharges(effectiveTotal >= deliveryConfig.freeDeliveryThreshold ? 0 : deliveryConfig.deliveryCharge);
      setDeliveryEstimate(null);
      // Don't set delivery as unavailable for network errors - only for explicit API rejection
    } finally {
      setIsCalculatingShipping(false);
    }
  };

  // Synchronous getter for current shipping charges
  const getDeliveryCharges = () => {
    return calculatedShippingCharges;
  };

  // Calculate delivery savings using calculated shipping charges
  const getDeliverySavings = () => {
    // If we have delivery estimate from API with free shipping info
    if (deliveryEstimate?.isFreeShipping && deliveryEstimate?.shippingCharges > 0) {
      return deliveryEstimate.shippingCharges;
    }
    
    // Fallback to basic calculation
    const effectiveTotal = typeof cartTotalOverride === 'number' && !isNaN(cartTotalOverride) 
      ? cartTotalOverride 
      : getCartTotal() - calculateDiscount();
    
    return effectiveTotal >= deliveryConfig.freeDeliveryThreshold && calculatedShippingCharges === 0 ? deliveryConfig.deliveryCharge : 0;
  };

  // Calculate product-level discounts (from unitPrice vs price)
  const getProductDiscount = () => {
    return cartItems.reduce((total, item) => {
      if (item.unitPrice && item.price > item.unitPrice) {
        return total + ((item.price - item.unitPrice) * item.quantity);
      }
      return total;
    }, 0);
  };

  // Get amount needed for free shipping
  const getAmountForFreeShipping = () => {
    if (deliveryEstimate?.amountForFreeShipping !== undefined) {
      return deliveryEstimate.amountForFreeShipping;
    }
    
    // Fallback calculation
    const effectiveTotal = typeof cartTotalOverride === 'number' && !isNaN(cartTotalOverride) 
      ? cartTotalOverride 
      : getCartTotal() - calculateDiscount();
    
    const threshold = deliveryEstimate?.freeShippingThreshold || deliveryConfig.freeDeliveryThreshold;
    return Math.max(threshold - effectiveTotal, 0);
  };

  // Recalculate shipping when cart total, payment method, or coupon changes
  useEffect(() => {
    if (shippingAddress.pincode && shippingAddress.pincode.length === 6) {
      calculateShippingCharges();
    }
  }, [cartTotalOverride, paymentMethod, appliedCoupon, cartItems]);

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
    setErrors({});
  };

  // Comprehensive validation before payment
  const validateAllCheckoutDetails = () => {
    const errors: string[] = [];

    // Validate contact information
    if (!userInfo.fullName.trim()) errors.push('Full name is required');
    if (!userInfo.email.trim()) errors.push('Email is required');
    else if (!/\S+@\S+\.\S+/.test(userInfo.email)) errors.push('Valid email is required');
    if (!userInfo.phone.trim()) errors.push('Phone number is required');
    else if (!/^\d{10}$/.test(userInfo.phone)) errors.push('Valid 10-digit phone number is required');

    // Validate shipping address
    if (!selectedAddressId && !isAddingNewAddress) {
      errors.push('Shipping address is required');
    } else if (selectedAddressId) {
      const selectedAddress = savedAddresses.find(addr => addr.id === selectedAddressId);
      if (!selectedAddress) errors.push('Please select a valid shipping address');
    } else if (isAddingNewAddress) {
      if (!shippingAddress.address.trim()) errors.push('Street address is required');
      if (!shippingAddress.city.trim()) errors.push('City is required');
      if (!shippingAddress.state.trim()) errors.push('State is required');
      if (!shippingAddress.pincode.trim()) errors.push('Pincode is required');
      else if (!/^\d{6}$/.test(shippingAddress.pincode)) errors.push('Valid 6-digit pincode is required');
    }

    // Validate payment method selection
    if (!paymentMethod) {
      errors.push('Payment method is required');
    } else if (paymentMethod === 'online' && !selectedPaymentType) {
      errors.push('Please select an online payment option');
    } else if (paymentMethod === 'online' && selectedPaymentType === 'upi') {
      // UPI validation is optional - Razorpay will handle it if not provided
      // But if user entered a UPI ID, validate the format
      if (upiDetails.upiId.trim() && !validateUpiId(upiDetails.upiId)) {
        errors.push('Please enter a valid UPI ID (e.g., 9876543210@paytm)');
      }
    } else if (paymentMethod === 'online' && selectedPaymentType === 'netbanking') {
      // Netbanking - no pre-validation needed, Razorpay handles bank selection
    }
    // Card payment - no validation needed here, Razorpay handles card details securely

    // Validate cart has items
    if (cartCount === 0) {
      errors.push('Cart is empty');
    }

    return errors;
  };

  // Check if all details are valid for payment
  const isReadyForPayment = () => {
    return currentStep >= 3 && validateAllCheckoutDetails().length === 0;
  };

  const handleRemoveItem = (productId: string) => {
    removeFromCart(productId);
    showToast('Item removed from cart', 'success');
    // If cart becomes empty, redirect to cart page (only if not processing an order)
    if (cartItems.length === 1 && !isProcessingOrder) {
      setTimeout(() => router.push('/cart'), 1000);
    }
  };

  const handleUpdateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity > 0) {
      updateQuantity(productId, newQuantity);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // No need to validate UPI/Card/Netbanking details here - Razorpay handles it

    // CRITICAL: Validate cart with backend before proceeding
    showLoader('Verifying cart...');
    const validation = await validateCartForCheckout();
    
    if (!validation.valid) {
      hideLoader();
      showToast(validation.message || 'Cart validation failed. Please review your cart and try again.', 'error');
      return;
    }

    hideLoader();

    // If COD, process directly
    if (paymentMethod === 'cod') {
      await processOrder('cod', null);
      return;
    }

    // For online payments, create order first then initiate payment
    await createOrderAndInitiatePayment();
  };

  const createOrderAndInitiatePayment = async () => {
    try {
      setIsProcessingPayment(true);
      showLoader('Creating order...');
      
      // Create the order - backend returns razorpay order details
      const orderResult = await createOrder('online');
      
      if (!orderResult) {
        setIsProcessingPayment(false);
        hideLoader();
        return;
      }
      
      showLoader('Initiating payment...');
      // Initiate Razorpay payment with the returned razorpay details
      await initiateRazorpayPayment(orderResult.orderId, orderResult.razorpay);
      hideLoader();
      
    } catch (error) {
      setIsProcessingPayment(false);
      hideLoader();;
      showToast('Failed to initiate payment. Please try again.', 'error');
    }
  };

  // Return type for createOrder
  interface CreateOrderResult {
    orderId: string;
    razorpay?: {
      orderId: string;
      amount: number;
      currency: string;
      key: string;
    };
  }

  const createOrder = async (payment: 'cod' | 'online'): Promise<CreateOrderResult | null> => {
    try {
      // Check if delivery is available before creating order
      if (!isDeliveryAvailable) {
        showToast(deliveryErrorMessage || 'Delivery not available for this pincode. Please update your address.', 'error');
        return null;
      }
      
      // Generate order ID
      const orderId = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
      
      // Fetch actual SKU from product API for items missing SKU
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      // Format items according to API structure - simplified: only productId, sku, qty
      const formattedItems = await Promise.all(cartItems.map(async (item) => {
        // Check both variantSku (from product detail page) and sku (from ProductCard)
        let finalSku = item.variantSku || item.sku;
        
        // If SKU is missing or undefined, try to fetch from product API using slug
        if (!finalSku && (item as any).slug) {
          try {
            const response = await fetch(`${apiBaseUrl}/products/slug/${(item as any).slug}`);
            if (response.ok) {
              const result = await response.json();
              const productData = result.data;
              // Get SKU from product or first variant
              finalSku = productData?.sku || productData?.variants?.[0]?.sku;
            }
          } catch (error) {
            console.error(`Failed to fetch SKU for ${item.name}:`, error);
          }
        }
        
        // Fallback to generated SKU if still missing
        if (!finalSku) {
          finalSku = `${item.name.replace(/\s+/g, '-').toUpperCase()}-DEFAULT`;
        }
        
        // Simplified item structure - only what API needs
        return {
          productId: item.productId || item._id,
          sku: finalSku,
          qty: item.quantity
        };
      }));

      // Calculate totals
      const discount = calculateDiscount();
      const deliveryCharges = getDeliveryCharges();

      // Get address for order
      const orderAddress = selectedAddressId 
        ? savedAddresses.find(addr => addr.id === selectedAddressId)
        : shippingAddress;

      // Create simplified order payload matching API requirements
      const orderPayload = {
        orderId: orderId,
        items: formattedItems,
        discount: discount,
        shippingCharges: deliveryCharges,
        tax: 0,
        address: {
          label: orderAddress?.label || 'Home',
          name: userInfo.fullName,
          line1: orderAddress?.address || '',
          line2: '',
          city: orderAddress?.city || '',
          state: orderAddress?.state || '',
          country: orderAddress?.country || 'India',
          pincode: orderAddress?.pincode || '',
          phone: userInfo.phone,
          email: userInfo.email
        },
        paymentProvider: payment === 'online' ? 'razorpay' : 'cod'
      };

      // Send order to backend API (apiBaseUrl already defined above for SKU fetching)
      const token = sessionStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      // Since getCurrentUser() is working with same token, let's validate the payload first

      // Get the latest token (should be the same, but just in case)
      const currentToken = sessionStorage.getItem('token');
      
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
        body: JSON.stringify(orderPayload),
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(`Server returned invalid response. Status: ${response.status}`);
      }

      if (!response.ok) {
        // Handle specific authentication errors
        if (response.status === 401) {
          // The token works for getCurrentUser but not for orders API - might be permission issue
          throw new Error('Access denied for orders API. Please check your permissions or contact support.');
        }
        throw new Error(result?.error?.description || result?.message || `Server error: ${response.status} - ${response.statusText}`);
      }

      showToast(`Order ${orderId} created successfully!`, 'success');
      
      // Extract razorpay details from response if available (for online payments)
      const razorpayData = result.data?.razorpay || result.razorpay;
      
      // Create shipment after successful order creation
      try {
        const shipmentResponse = await fetch(`${apiBaseUrl}/delivery/shipment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
          },
          body: JSON.stringify({
            orderId: orderId
          }),
        });
        
        if (shipmentResponse.ok) {
          const shipmentResult = await shipmentResponse.json();
          
          // Store shipment ID for tracking
          if (shipmentResult.data?.shipmentId) {
            sessionStorage.setItem(`shipment_${orderId}`, shipmentResult.data.shipmentId);
          }
        }
      } catch (shipmentError) {
        // Don't fail the order for shipment creation error
      }
      
      // Store order ID for later use
      sessionStorage.setItem('current_order_id', orderId);
      
      // Return orderId and razorpay data
      return {
        orderId: orderId,
        razorpay: razorpayData
      };
      
    } catch (error) {
      
      let errorMessage = 'Failed to create order';
      
      if (error instanceof Error) {
        // Handle specific error types
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running on the correct port.';
        } else if (error.message.includes('Session expired') || error.message.includes('Authentication token not found')) {
          errorMessage = error.message;
          // Redirect to login page
          setTimeout(() => {
            router.push('/login?returnUrl=/checkout');
          }, 2000);
        } else if (error.message.includes('Server error: 401')) {
          errorMessage = 'Authentication failed. Please login again.';
          sessionStorage.removeItem('token');
          setTimeout(() => {
            router.push('/login?returnUrl=/checkout');
          }, 2000);
        } else {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage, 'error');
      return null;
    }
  };

  const initiateRazorpayPayment = async (orderId: string, razorpayData?: { orderId: string; amount: number; currency: string; key: string }) => {
    // Clear any existing timeout
    if (paymentTimeoutId) {
      clearTimeout(paymentTimeoutId);
    }
    
    try {
      setIsProcessingPayment(true);
      
      // Safety timeout: Reset loading state after 30 seconds if something goes wrong
      const timeoutId = setTimeout(() => {
        setIsProcessingPayment(false);
        showToast('Payment initialization timeout. Please try again.', 'warning');
      }, 30000);
      setPaymentTimeoutId(timeoutId);
      
      // Check if Razorpay is loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        clearTimeout(timeoutId);
        setIsProcessingPayment(false);
        showToast('Payment gateway not loaded. Please refresh the page and try again.', 'error');
        return;
      }
      
      // Check if we have razorpay data from backend
      if (!razorpayData || !razorpayData.orderId) {
        clearTimeout(timeoutId);
        setIsProcessingPayment(false);
        showToast('Payment order not created. Please try again.', 'error');
        return;
      }

      console.log('Using Razorpay order from backend:', razorpayData.orderId);

      // Configure Razorpay to show only the selected payment method
      // This skips the payment method selection screen in Razorpay
      const paymentMethodConfig: any = {};
      
      // Disable all methods first, then enable only the selected one
      if (selectedPaymentType === 'card') {
        paymentMethodConfig.card = true;
        paymentMethodConfig.netbanking = false;
        paymentMethodConfig.upi = false;
        paymentMethodConfig.wallet = false;
        paymentMethodConfig.emi = false;
        paymentMethodConfig.paylater = false;
      } else if (selectedPaymentType === 'upi') {
        paymentMethodConfig.card = false;
        paymentMethodConfig.netbanking = false;
        paymentMethodConfig.upi = true;
        paymentMethodConfig.wallet = false;
        paymentMethodConfig.emi = false;
        paymentMethodConfig.paylater = false;
      } else if (selectedPaymentType === 'netbanking') {
        paymentMethodConfig.card = false;
        paymentMethodConfig.netbanking = true;
        paymentMethodConfig.upi = false;
        paymentMethodConfig.wallet = false;
        paymentMethodConfig.emi = false;
        paymentMethodConfig.paylater = false;
      }

      // Build prefill config with all available user data
      const prefillConfig: any = {
        name: userInfo.fullName || '',
        email: userInfo.email || '',
        contact: userInfo.phone || '',
      };

      // For UPI, pre-fill the VPA if available
      if (selectedPaymentType === 'upi' && upiDetails.upiId) {
        prefillConfig['vpa'] = upiDetails.upiId;
      }

      // For card, add cardholder name if available  
      if (selectedPaymentType === 'card' && cardDetails.cardHolder) {
        prefillConfig.name = cardDetails.cardHolder;
      }

      const options = {
        key: razorpayData.key || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: razorpayData.amount,
        currency: razorpayData.currency || 'INR',
        name: 'Grabora',
        description: 'Order Payment',
        image: '/logo/favicon.png',
        order_id: razorpayData.orderId,
        prefill: prefillConfig,
        theme: {
          color: '#184979',
        },
        // Only enable the selected payment method
        method: paymentMethodConfig,
        // Remember customer for future payments
        remember_customer: true,
        handler: async function (response: any) {
          // Clear timeout on successful payment
          if (paymentTimeoutId) {
            clearTimeout(paymentTimeoutId);
          }
          
          try {
            // Call payment verification API
            const token = sessionStorage.getItem('token');
            const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
            
            const verificationResponse = await fetch(`${apiBaseUrl}/payment-intents/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                orderId: orderId, // Include order ID for lookup
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }),
            });

            const verificationResult = await verificationResponse.json();

            if (!verificationResponse.ok) {
              // Payment verification failed
              setIsProcessingPayment(false);
              
              let errorMessage = 'Payment verification failed. Please contact support.';
              if (verificationResult.message) {
                errorMessage = verificationResult.message;
              }
              
              showToast(errorMessage, 'error');
              
              return; // Don't proceed with order processing
            }

            // Payment verification successful
            
            // Store verification result if needed
            if (verificationResult.data) {
              sessionStorage.setItem(`payment_verification_${response.razorpay_order_id}`, JSON.stringify(verificationResult.data));
            }
            
            // Payment successful and verified - update order status and complete
            setIsProcessingPayment(false);
            await updateOrderAfterPayment(orderId || sessionStorage.getItem('current_order_id'), {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              payment_method: selectedPaymentType,
              verification_status: 'verified',
              verification_data: verificationResult.data,
              ...(selectedPaymentType === 'upi' ? { upi_id: upiDetails.upiId, upi_app: selectedUpiApp } : {}),
            });
            
          } catch (verificationError) {
            setIsProcessingPayment(false);
            
            // Handle verification API errors
            let errorMessage = 'Payment verification failed due to technical issue. Please contact support.';
            
            if (verificationError instanceof Error) {
              if (verificationError.message.includes('fetch') || 
                  verificationError.message.includes('network') ||
                  verificationError.name === 'TypeError') {
                errorMessage = 'Network error during payment verification. Please contact support with your payment details.';
              } else if (verificationError.message.includes('timeout')) {
                errorMessage = 'Payment verification timed out. Please contact support with your payment ID.';
              }
            }
            
            showToast(errorMessage, 'error');
            
            // Show payment ID to user for support reference
            showToast(`Payment ID for support: ${response.razorpay_payment_id}`, 'warning');
          }
        },
        modal: {
          ondismiss: function () {
            // Clear timeout when modal is dismissed
            if (paymentTimeoutId) {
              clearTimeout(paymentTimeoutId);
            }
            setIsProcessingPayment(false);
            showToast('Payment cancelled', 'warning');
          },
          onhidden: function () {
            // Clear timeout and ensure loading state is cleared when modal is closed
            if (paymentTimeoutId) {
              clearTimeout(paymentTimeoutId);
            }
            setIsProcessingPayment(false);
          },
          escape: true,
          backdropclose: false,
        },
      };

      // Add error handler for payment failures
      (options as any).error = function (error: any) {
        // Clear timeout on error
        if (paymentTimeoutId) {
          clearTimeout(paymentTimeoutId);
        }
        setIsProcessingPayment(false);
        
        // Show user-friendly error messages based on error reason
        let errorMessage = 'Payment failed. Please try again.';
        
        if (error.reason) {
          const reason = error.reason.toLowerCase();
          if (reason.includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (reason.includes('cancelled') || reason.includes('closed')) {
            errorMessage = 'Payment was cancelled.';
          } else if (reason.includes('timeout')) {
            errorMessage = 'Payment timed out. Please try again.';
          } else if (reason.includes('insufficient')) {
            errorMessage = 'Insufficient balance. Please try another payment method.';
          }
        }
        
        showToast(errorMessage, 'error');
      };

      const razorpayOptions = {
        ...options,
      };

      // Open Razorpay payment modal
      const razorpay = new (window as any).Razorpay(razorpayOptions);
      
      // Add event listeners for additional error handling
      razorpay.on('payment.failed', function (response: any) {
        // Clear timeout on payment failure
        if (paymentTimeoutId) {
          clearTimeout(paymentTimeoutId);
        }
        setIsProcessingPayment(false);
        
        let errorMessage = 'Payment failed. Please try again.';
        
        if (response.error) {
          const errorCode = response.error.code;
          const errorDescription = response.error.description || '';
          
          if (errorCode === 'BAD_REQUEST_ERROR') {
            errorMessage = 'Invalid payment details. Please check and try again.';
          } else if (errorCode === 'GATEWAY_ERROR') {
            errorMessage = 'Payment gateway error. Please try again or use another payment method.';
          } else if (errorCode === 'SERVER_ERROR') {
            errorMessage = 'Server error. Please try again after some time.';
          } else if (errorDescription.toLowerCase().includes('insufficient')) {
            errorMessage = 'Insufficient balance. Please try another payment method.';
          } else if (errorDescription.toLowerCase().includes('declined')) {
            errorMessage = 'Payment declined by bank. Please contact your bank or try another method.';
          }
        }
        
        showToast(errorMessage, 'error');
      });
      
      razorpay.open();
      
      // Clear the 30s timeout and set a shorter one for modal open
      if (paymentTimeoutId) {
        clearTimeout(paymentTimeoutId);
      }
      
      // Set a new shorter timeout after modal opens
      const newTimeoutId = setTimeout(() => {
        setIsProcessingPayment(false);
      }, 2000);
      setPaymentTimeoutId(newTimeoutId);

      // For UPI, show additional instructions
      if (selectedPaymentType === 'upi') {
        showToast('Opening Razorpay UPI payment gateway...', 'success');
      }
    } catch (error) {
      // Clear timeout on error
      if (paymentTimeoutId) {
        clearTimeout(paymentTimeoutId);
      }
      setIsProcessingPayment(false);
      showToast('Failed to initiate payment. Please try again.', 'error');
    }
  };

  const updateOrderAfterPayment = async (orderId: string | null, paymentDetails: any) => {
    if (!orderId) {
      showToast('Order ID not found. Please contact support.', 'error');
      return;
    }

    try {
      // Call payment intent API
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      const paymentIntentResponse = await fetch(`${apiBaseUrl}/payment-intents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: orderId,
          amount: getFinalTotal()
        }),
      });

      const paymentIntentResult = await paymentIntentResponse.json();

      if (!paymentIntentResponse.ok) {
        showToast('Payment completed but processing failed. Please contact support.', 'warning');
      } else {
        if (paymentIntentResult.data) {
          sessionStorage.setItem(`payment_intent_${orderId}`, JSON.stringify(paymentIntentResult.data));
        }
      }

      // Store order completion data
      const orderCompletion = {
        orderId: orderId,
        paymentDetails,
        completedAt: new Date().toISOString(),
        status: 'completed'
      };

      // Save locally as backup
      const existingOrders = JSON.parse(localStorage.getItem('grabora_orders') || '[]');
      const orderIndex = existingOrders.findIndex((order: any) => order.orderId === orderId);
      if (orderIndex >= 0) {
        existingOrders[orderIndex] = { ...existingOrders[orderIndex], ...orderCompletion };
      } else {
        existingOrders.push(orderCompletion);
      }
      localStorage.setItem('grabora_orders', JSON.stringify(existingOrders));

      showToast('Payment successful! Order completed. 🎉', 'success');
      
      // Navigate to order confirmation
      router.push(`/order-confirmation?orderId=${orderId}`);
      
      // Clear cart
      setTimeout(() => {
        clearCart();
        setIsProcessingOrder(false);
      }, 500);

    } catch (error) {
      showToast('Payment completed but order update failed. Please contact support.', 'warning');
    }
  };

  const processOrder = async (payment: 'cod' | 'online', paymentDetails: any) => {
    // For COD, create and complete order directly
    if (payment === 'cod') {
      setIsProcessingOrder(true);
      showLoader('Processing your order...');
      const orderId = await createOrder('cod');
      if (orderId) {
        // For COD, just complete the order
        const orderCompletion = {
          orderId: orderId,
          paymentDetails: { method: 'cod' },
          completedAt: new Date().toISOString(),
          status: 'confirmed'
        };

        const existingOrders = JSON.parse(localStorage.getItem('grabora_orders') || '[]');
        existingOrders.push(orderCompletion);
        localStorage.setItem('grabora_orders', JSON.stringify(existingOrders));

        hideLoader();
        showToast(`COD Order ${orderId} placed successfully! 🎉`, 'success');
        
        // Navigate to order confirmation page first
        router.push(`/order-confirmation?orderId=${orderId}`);
        
        // Clear cart and reset state after successful navigation
        setTimeout(() => {
          clearCart();
          setIsProcessingOrder(false);
        }, 100);
      } else {
        hideLoader();
        setIsProcessingOrder(false);
      }
      return;
    }

    // This function is now mainly for fallback/legacy support
    try {
      // Set processing flag to prevent empty cart redirect
      setIsProcessingOrder(true);
      
      // Generate order ID
      const orderId = `ORD-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
      
      // Format items - simplified: only productId, sku, qty
      const formattedItems = cartItems.map(item => {
        const finalSku = item.variantSku || item.sku || `${item.name.replace(/\s+/g, '-').toUpperCase()}-DEFAULT`;
        return {
          productId: item.productId || item._id,
          sku: finalSku,
          qty: item.quantity
        };
      });

      // Calculate totals
      const discount = calculateDiscount();
      const deliveryCharges = getDeliveryCharges();

      // Get address for order
      const orderAddress = selectedAddressId 
        ? savedAddresses.find(addr => addr.id === selectedAddressId)
        : shippingAddress;

      // Create simplified order payload matching API requirements
      const orderPayload = {
        orderId: orderId,
        items: formattedItems,
        discount: discount,
        shippingCharges: deliveryCharges,
        tax: 0,
        address: {
          label: orderAddress?.label || 'Home',
          name: userInfo.fullName,
          line1: orderAddress?.address || '',
          line2: '',
          city: orderAddress?.city || '',
          state: orderAddress?.state || '',
          country: orderAddress?.country || 'India',
          pincode: orderAddress?.pincode || '',
          phone: userInfo.phone,
          email: userInfo.email
        },
        paymentProvider: payment === 'online' ? 'razorpay' : 'cod'
      };

      // Send order to backend API
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      const response = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create order');
      }

      // After successful order creation, call payment intent API for online payments
      if (payment === 'online') {
        try {
          const paymentIntentResponse = await fetch(`${apiBaseUrl}/payment-intent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
            body: JSON.stringify({
              orderId: orderId,
              amount: getFinalTotal()
            }),
          });

          const paymentIntentResult = await paymentIntentResponse.json();

          if (!paymentIntentResponse.ok) {
            // If payment intent fails, we need to handle this carefully
            
            // Still proceed with order confirmation but show warning
            showToast('Order created but payment setup failed. Please contact support.', 'warning');
            
            // Could implement order cancellation logic here if needed
            // await cancelOrder(orderId);
          } else {
            // Payment intent successful
            
            // Store payment intent details if needed for tracking
            if (paymentIntentResult.data) {
              sessionStorage.setItem(`payment_intent_${orderId}`, JSON.stringify(paymentIntentResult.data));
            }
          }
        } catch (paymentIntentError) {
          
          // Network or other error in payment intent
          if (paymentIntentError instanceof Error && 
              (paymentIntentError.message.includes('fetch') || 
               paymentIntentError.message.includes('network') ||
               paymentIntentError.name === 'TypeError')) {
            showToast('Order created but payment processing unavailable. Please contact support.', 'warning');
          } else {
            showToast('Order created but payment setup encountered an issue. Please contact support.', 'warning');
          }
        }
      }

      // Save order locally as backup
      const localOrder = {
        orderId: orderId,
        items: [...cartItems],
        userInfo: { ...userInfo },
        shippingAddress: { ...orderAddress },
        paymentMethod: payment,
        paymentDetails,
        subtotal: getCartTotal(),
        discount: discount,
        deliveryCharges: deliveryCharges,
        coupon: appliedCoupon ? {
          code: appliedCoupon.code,
          discount: appliedCoupon.discount,
          type: appliedCoupon.type,
        } : null,
        total: getFinalTotal(),
        orderDate: new Date().toISOString(),
        status: payment === 'online' ? 'confirmed' : 'pending',
        apiResponse: result.data || result
      };

      const existingOrders = JSON.parse(localStorage.getItem('grabora_orders') || '[]');
      existingOrders.push(localOrder);
      localStorage.setItem('grabora_orders', JSON.stringify(existingOrders));

      setIsProcessingPayment(false);
      showToast(`Order ${orderId} created successfully! 🎉`, 'success');
      
      router.push(`/order-confirmation?orderId=${orderId}`);
      
      setTimeout(() => {
        clearCart();
        setIsProcessingOrder(false);
      }, 500);

    } catch (error) {
      setIsProcessingPayment(false);
      setIsProcessingOrder(false);
      
      // Comprehensive error handling
      let errorMessage = 'Failed to process order. Please try again.';
      let errorType: 'error' | 'warning' = 'error';
      
      if (error instanceof Error) {
        // Network errors
        if (error.message.includes('fetch') || 
            error.message.includes('network') || 
            error.name === 'TypeError' ||
            error.message.includes('Failed to fetch')) {
          errorMessage = 'Network connection failed. Please check your internet and try again.';
          errorType = 'warning';
        }
        // Server errors (5xx)
        else if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
          errorMessage = 'Server temporarily unavailable. Please try again in a few moments.';
          errorType = 'warning';
        }
        // Client errors (4xx)
        else if (error.message.includes('400')) {
          errorMessage = 'Invalid order data. Please check your details and try again.';
        }
        else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          errorMessage = 'Session expired. Please log in again and retry.';
          // Could trigger logout here
          // logout();
        }
        else if (error.message.includes('403')) {
          errorMessage = 'Access denied. Please contact support.';
        }
        else if (error.message.includes('404')) {
          errorMessage = 'Order service not found. Please contact support.';
        }
        // Timeout errors
        else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
          errorType = 'warning';
        }
        // Use the actual error message if it's more specific
        else if (error.message && !error.message.includes('Failed to process order')) {
          errorMessage = error.message;
        }
      }
      
      showToast(errorMessage, errorType);
      
      // Additional user guidance for network issues
      if (errorType === 'warning' && (errorMessage.includes('Network') || errorMessage.includes('connection'))) {
        setTimeout(() => {
          showToast('Tip: Check your internet connection and try again', 'warning');
        }, 3000);
      }
    }
  };

  if (cartCount === 0 && !isProcessingOrder) {
    return (
      <div className="min-h-screen bg-gray-50 md:bg-gradient-to-br md:from-orange-50 md:via-red-50 md:to-pink-50 py-8 md:py-16 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-orange-400/20 to-red-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-br from-pink-300/20 to-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl p-12 border border-white/50">
              {/* Warning Icon */}
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-red-500/30 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute inset-4 bg-gradient-to-br from-orange-100 to-red-100 rounded-full flex items-center justify-center shadow-xl">
                  <svg className="w-16 h-16 text-orange-500 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              <h2 className="text-4xl font-black bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                Cannot Proceed to Checkout
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                Your cart is empty. Please add some items before proceeding to checkout.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span>Go to Home</span>
                </Link>
                <Link
                  href="/products"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-[#184979] text-[#184979] rounded-xl font-bold hover:bg-[#184979] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Browse Products</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 md:bg-gradient-to-br md:from-gray-50 md:via-blue-50/30 md:to-orange-50/20 pb-28 md:pb-6 relative overflow-hidden">
      {/* Animated Background Elements - Hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#f26322]/10 to-[#ff7a45]/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#184979]/10 to-[#1e5a8f]/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Mobile Sticky Header */}
      <div className="sticky top-0 z-40 md:relative md:z-auto">
        <div className="bg-gradient-to-r from-[#184979] via-[#1e5a8f] to-[#184979] py-3 md:py-5 px-4 shadow-lg">
          <div className="container mx-auto md:px-4">
            <div className="flex items-center justify-between md:block">
              <div>
                {/* Breadcrumb */}
                <div className="hidden md:flex items-center gap-2 text-xs text-white/70 mb-2">
                  <Link href="/" className="hover:text-[#f26322] transition-colors">Home</Link>
                  <span>/</span>
                  <Link href="/cart" className="hover:text-[#f26322] transition-colors">Cart</Link>
                  <span>/</span>
                  <span className="text-white font-bold">Checkout</span>
                </div>
                <h1 className="text-lg md:text-3xl font-black text-white flex items-center gap-2">
                  <span className="md:hidden text-xl">🔒</span>
                  <span className="hidden md:inline text-2xl">🔒</span>
                  Secure Checkout
                </h1>
                <p className="text-white/70 text-[10px] md:text-sm mt-0.5">Complete your order securely</p>
              </div>
              {/* Mobile Order Total Badge */}
              <div className="md:hidden bg-white/20 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/30">
                <div className="text-[10px] text-white/70">Total</div>
                <div className="text-base font-black text-white">₹{(getCartTotal() + getDeliveryCharges() - calculateDiscount()).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 md:px-4 pt-4 md:pt-6 relative z-10">

          {/* Step Indicator - More compact on mobile */}
          <div className="flex items-center justify-center gap-1 md:gap-3 mb-4 md:mb-6 animate-fade-in bg-white/80 md:bg-white/90 backdrop-blur-sm rounded-xl p-2 md:p-4 shadow-sm md:shadow-md">
            <div className="flex items-center">
              <div className={`relative flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full ${completedSteps.includes(1) ? 'bg-gradient-to-br from-[#f26322] to-[#ff7a45]' : currentStep === 1 ? 'bg-gradient-to-br from-[#f26322] to-[#ff7a45]' : 'bg-gray-200'} text-white font-bold transition-all duration-500 shadow-md ${currentStep === 1 ? 'ring-2 md:ring-3 ring-[#f26322]/30' : ''}`}>
                {completedSteps.includes(1) ? (
                  <svg className="w-4 h-4 md:w-5 md:h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="relative z-10 text-xs md:text-sm">1</span>
                )}
              </div>
              <span className={`ml-1 text-[10px] md:text-sm font-bold ${currentStep >= 1 ? 'text-[#f26322]' : 'text-[#184979]/40'} transition-colors hidden sm:inline`}>Contact</span>
            </div>

            <div className={`h-0.5 w-6 md:w-16 rounded-full ${currentStep > 1 ? 'bg-gradient-to-r from-[#f26322] to-[#184979]' : 'bg-[#184979]/20'} transition-all duration-500`}></div>

            <div className="flex items-center">
              <div className={`relative flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full ${completedSteps.includes(2) ? 'bg-gradient-to-br from-[#184979] to-[#1e5a8f]' : currentStep === 2 ? 'bg-gradient-to-br from-[#184979] to-[#1e5a8f]' : 'bg-gray-200'} text-white font-bold transition-all duration-500 shadow-md ${currentStep === 2 ? 'ring-2 md:ring-3 ring-[#184979]/30' : ''}`}>
                {completedSteps.includes(2) ? (
                  <svg className="w-4 h-4 md:w-5 md:h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="relative z-10 text-xs md:text-sm">2</span>
                )}
              </div>
              <span className={`ml-1 text-[10px] md:text-sm font-bold ${currentStep >= 2 ? 'text-[#184979]' : 'text-[#184979]/40'} transition-colors hidden sm:inline`}>Address</span>
            </div>

            <div className={`h-0.5 w-6 md:w-20 rounded-full ${currentStep > 2 ? 'bg-gradient-to-r from-[#184979] to-green-500' : 'bg-gray-300'} transition-all duration-500`}></div>

            <div className="flex items-center">
              <div className={`relative flex items-center justify-center w-8 h-8 md:w-11 md:h-11 rounded-full ${completedSteps.includes(3) ? 'bg-gradient-to-br from-green-500 to-green-600' : currentStep === 3 ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gray-200'} text-white font-bold transition-all duration-500 shadow-md ${currentStep === 3 ? 'ring-2 md:ring-3 ring-green-500/30' : ''}`}>
                {completedSteps.includes(3) ? (
                  <svg className="w-4 h-4 md:w-5 md:h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="relative z-10 text-xs md:text-sm">3</span>
                )}
              </div>
              <span className={`ml-1 text-[10px] md:text-sm font-bold ${currentStep >= 3 ? 'text-green-600' : 'text-[#184979]/40'} transition-colors hidden sm:inline`}>Payment</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 md:gap-6 lg:items-start">
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Step 1: Contact Information */}
            <div className={`bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 overflow-hidden transition-all duration-500 hover:shadow-xl ${currentStep === 1 ? 'p-4 md:p-5 animate-slide-in-left' : 'p-3 md:p-4'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-10 h-10 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-lg flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-lg blur-sm opacity-40"></div>
                    <svg className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base md:text-lg font-black bg-gradient-to-r from-[#f26322] to-[#ff7a45] bg-clip-text text-transparent">Contact Information</h2>
                    {completedSteps.includes(1) && currentStep !== 1 && (
                      <p className="text-xs text-[#184979]/70">{userInfo.fullName} • {userInfo.email}</p>
                    )}
                  </div>
                </div>
                {completedSteps.includes(1) && currentStep !== 1 && (
                  <button
                    onClick={() => handleEditStep(1)}
                    className="text-[#f26322] hover:text-[#e05512] font-semibold text-sm"
                  >
                    Edit
                  </button>
                )}
              </div>

              {currentStep === 1 && (
                <div className="space-y-4">
                  {/* Full Name Field */}
                  <div className="relative group">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#184979] mb-2">
                      <div className="w-5 h-5 bg-gradient-to-br from-orange-100 to-orange-50 rounded-md flex items-center justify-center">
                        <svg className="w-3 h-3 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userInfo.fullName}
                        onChange={(e) => setUserInfo({ ...userInfo, fullName: e.target.value })}
                        className={`w-full px-4 py-3 text-sm border-2 ${errors.fullName ? 'border-red-500 bg-red-50/50' : 'border-gray-300 group-hover:border-orange-200'} rounded-xl focus:border-[#f26322] focus:ring-2 focus:ring-[#f26322]/20 focus:outline-none transition-all bg-white text-gray-900 font-medium placeholder-gray-400`}
                        placeholder="Enter your full name"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {userInfo.fullName && !errors.fullName && (
                          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>
                    {errors.fullName && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Email Field */}
                    <div className="relative group">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#184979] mb-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-blue-100 to-blue-50 rounded-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-[#184979]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        Email Address *
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={userInfo.email}
                          onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                          className={`w-full px-4 py-3 text-sm border-2 ${errors.email ? 'border-red-500 bg-red-50/50' : 'border-gray-300 group-hover:border-blue-200'} rounded-xl focus:border-[#184979] focus:ring-2 focus:ring-[#184979]/20 focus:outline-none transition-all bg-white text-gray-900 font-medium placeholder-gray-400`}
                          placeholder="your@email.com"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {userInfo.email && !errors.email && userInfo.email.includes('@') && (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      {errors.email && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Phone Field */}
                    <div className="relative group">
                      <label className="flex items-center gap-2 text-xs font-bold text-[#184979] mb-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-green-100 to-green-50 rounded-md flex items-center justify-center">
                          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        Phone Number *
                      </label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500 text-sm font-semibold">
                          <span className="text-xs">🇮🇳</span>
                          <span>+91</span>
                        </div>
                        <input
                          type="tel"
                          value={userInfo.phone}
                          onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                          className={`w-full pl-16 pr-12 py-3 text-sm border-2 ${errors.phone ? 'border-red-500 bg-red-50/50' : 'border-gray-300 group-hover:border-green-200'} rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none transition-all bg-white text-gray-900 font-medium placeholder-gray-400`}
                          placeholder="10 digit number"
                          maxLength={10}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {userInfo.phone && !errors.phone && userInfo.phone.length === 10 && (
                            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 animate-fade-in">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {errors.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Security Notice */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-blue-700 leading-relaxed">
                      Your information is secure and will only be used for order updates and delivery.
                    </p>
                  </div>

                  <button
                    onClick={handleContinueToAddress}
                    className="group relative w-full bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-700"></div>
                    <span className="relative z-10">Continue to Shipping Address</span>
                    <svg className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Shipping Address */}
            {currentStep >= 2 && (
              <div className={`bg-white/90 backdrop-blur-xl rounded-xl shadow-lg border border-white/50 overflow-hidden transition-all duration-500 hover:shadow-xl ${currentStep === 2 ? 'p-4 md:p-5 animate-slide-in-left' : 'p-3 md:p-4'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-10 h-10 bg-gradient-to-br from-[#184979] to-[#1e5a8f] rounded-lg flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
                      <div className="absolute inset-0 bg-gradient-to-br from-[#184979] to-[#1e5a8f] rounded-lg blur-sm opacity-40"></div>
                      <svg className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base md:text-lg font-black bg-gradient-to-r from-[#184979] to-[#1e5a8f] bg-clip-text text-transparent">Shipping Address</h2>
                      {completedSteps.includes(2) && currentStep !== 2 && (
                        <p className="text-xs text-[#184979]/70">{shippingAddress.city}, {shippingAddress.state} - {shippingAddress.pincode}</p>
                      )}
                    </div>
                  </div>
                  {completedSteps.includes(2) && currentStep !== 2 && (
                    <button
                      onClick={() => handleEditStep(2)}
                      className="text-[#f26322] hover:text-[#e05512] font-semibold text-sm"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {currentStep === 2 && (
                  <div className="space-y-4">
                    {/* Saved Addresses List */}
                    {savedAddresses.length > 0 && !isAddingNewAddress && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">Select Saved Address</label>
                        <div className="space-y-2">
                          {savedAddresses.map((addr) => (
                            <div
                              key={addr.id}
                              className={`relative p-4 border-2 rounded-xl cursor-pointer transition-all ${
                                selectedAddressId === addr.id
                                  ? 'border-[#184979] bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleSelectAddress(addr)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-800">{addr.label || 'Home'}</span>
                                    {addr.isDefault && (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Default</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600">{addr.address}</p>
                                  <p className="text-sm text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                                  <p className="text-sm text-gray-600">{addr.country}</p>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAddress(addr.id || '');
                                  }}
                                  className="text-red-500 hover:text-red-700 p-1"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add New Address Button */}
                    {!isAddingNewAddress && (
                      <button
                        onClick={() => {
                          setIsAddingNewAddress(true);
                          setShippingAddress({
                            address: '',
                            city: '',
                            state: '',
                            pincode: '',
                            country: 'India',
                          });
                          setSelectedAddressId(null);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#184979] hover:text-[#184979] transition-all font-semibold"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add New Address</span>
                      </button>
                    )}

                    {/* Add/Edit Address Form */}
                    {isAddingNewAddress && (
                      <>
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <h3 className="font-bold text-gray-800">Add New Address</h3>
                          <button
                            onClick={handleUseCurrentLocation}
                            disabled={isDetectingLocation}
                            className="flex items-center gap-2 text-sm text-[#184979] hover:text-[#f26322] font-semibold disabled:opacity-50"
                          >
                            {isDetectingLocation ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Detecting...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Use Current Location</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Address Label</label>
                          <input
                            type="text"
                            value={shippingAddress.label || ''}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, label: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:outline-none transition-colors bg-white text-gray-900 font-medium placeholder-gray-400"
                            placeholder="e.g., Home, Office, etc."
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Address *</label>
                          <textarea
                            value={shippingAddress.address}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, address: e.target.value })}
                            className={`w-full px-4 py-3 border-2 ${errors.address ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:border-[#184979] focus:outline-none transition-colors resize-none bg-white text-gray-900 font-medium placeholder-gray-400`}
                            placeholder="Enter your complete address"
                            rows={3}
                          />
                          {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">City *</label>
                            <input
                              type="text"
                              value={shippingAddress.city}
                              onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                              className={`w-full px-4 py-3 border-2 ${errors.city ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:border-[#184979] focus:outline-none transition-colors bg-white text-gray-900 font-medium placeholder-gray-400`}
                              placeholder="City"
                            />
                            {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">State *</label>
                            <input
                              type="text"
                              value={shippingAddress.state}
                              onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                              className={`w-full px-4 py-3 border-2 ${errors.state ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:border-[#184979] focus:outline-none transition-colors bg-white text-gray-900 font-medium placeholder-gray-400`}
                              placeholder="State"
                            />
                            {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode *</label>
                            <input
                              type="text"
                              value={shippingAddress.pincode}
                              onChange={(e) => setShippingAddress({ ...shippingAddress, pincode: e.target.value })}
                              className={`w-full px-4 py-3 border-2 ${errors.pincode ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:border-[#184979] focus:outline-none transition-colors bg-white text-gray-900 font-medium placeholder-gray-400`}
                              placeholder="6 digit pincode"
                              maxLength={6}
                            />
                            {errors.pincode && <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Country *</label>
                            <input
                              type="text"
                              value={shippingAddress.country}
                              onChange={(e) => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:outline-none transition-colors bg-white text-gray-900 font-medium placeholder-gray-400"
                              placeholder="Country"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setIsAddingNewAddress(false);
                              setErrors({});
                              if (savedAddresses.length > 0) {
                                const firstAddr = savedAddresses[0];
                                setSelectedAddressId(firstAddr.id || null);
                                setShippingAddress(firstAddr);
                              }
                            }}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-semibold transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveAddress}
                            className="flex-1 bg-gradient-to-r from-[#184979] to-[#1e5a8f] hover:from-[#0d2d4a] hover:to-[#184979] text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                          >
                            Save Address
                          </button>
                        </div>
                      </>
                    )}

                    {/* Continue Button - Only show if address is selected */}
                    {!isAddingNewAddress && selectedAddressId && (
                      <button
                        onClick={handleContinueToPayment}
                        className="w-full bg-gradient-to-r from-[#184979] to-[#1e5a8f] hover:from-[#0d2d4a] hover:to-[#184979] text-white py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      >
                        <span>Continue to Payment</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Payment Method */}
            {currentStep >= 3 && (
              <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-lg p-4 md:p-5 border border-white/50 transition-all duration-500 hover:shadow-xl animate-slide-in-left">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="relative w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md transform hover:scale-105 transition-transform">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-600 rounded-lg blur-sm opacity-40"></div>
                    <svg className="w-5 h-5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <h2 className="text-base md:text-lg font-black bg-gradient-to-r from-green-500 to-green-600 bg-clip-text text-transparent">Payment Method</h2>
                </div>

                <div className="space-y-3">
                  {/* Online Payment Option */}
                  <div className={`border-2 ${paymentMethod === 'online' ? 'border-[#184979] bg-gradient-to-br from-blue-50 to-purple-50' : 'border-gray-200 bg-white'} rounded-xl transition-all`}>
                    <label className="flex items-center p-4 cursor-pointer">
                      <input
                        type="radio"
                        name="payment"
                        value="online"
                        checked={paymentMethod === 'online'}
                        onChange={(e) => setPaymentMethod(e.target.value as 'online')}
                        className="w-5 h-5 text-[#184979]"
                      />
                      <div className="ml-4 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">Online Payment</span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Secure</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Pay securely via Razorpay</p>
                      </div>
                    </label>

                    {/* Payment Method Options (shown when online is selected) */}
                    {paymentMethod === 'online' && (
                      <div className="px-4 pb-4 space-y-2 border-t border-gray-200 pt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Select Payment Method:</p>
                        
                        {/* Credit/Debit Card */}
                        <label className={`flex items-center gap-3 p-3 border-2 ${selectedPaymentType === 'card' ? 'border-[#184979] bg-blue-50' : 'border-gray-200 bg-white'} rounded-lg cursor-pointer transition-all hover:shadow-md group`}>
                          <input
                            type="radio"
                            name="paymentType"
                            value="card"
                            checked={selectedPaymentType === 'card'}
                            onChange={(e) => setSelectedPaymentType(e.target.value as 'card')}
                            className="w-4 h-4 text-[#184979]"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-sm">Credit / Debit Card</p>
                              <p className="text-xs text-gray-500">Visa, Mastercard, RuPay</p>
                            </div>
                          </div>
                          {selectedPaymentType === 'card' && (
                            <svg className="w-5 h-5 text-[#184979]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </label>

                        {/* Card Details Form */}
                        {selectedPaymentType === 'card' && (
                          <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-purple-200 space-y-4 animate-slide-in-up">
                            {/* Supported Cards */}
                            <div className="flex items-center justify-center gap-4 py-3">
                              <div className="text-blue-600 font-black text-xl italic bg-blue-100 px-3 py-1.5 rounded-lg shadow-sm">VISA</div>
                              <div className="flex gap-0 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                                <div className="w-7 h-7 bg-red-500 rounded-full"></div>
                                <div className="w-7 h-7 bg-yellow-500 rounded-full -ml-3"></div>
                              </div>
                              <div className="text-green-600 font-black text-lg bg-green-100 px-3 py-1.5 rounded-lg shadow-sm">RuPay</div>
                              <div className="text-blue-500 font-black text-lg bg-blue-100 px-3 py-1.5 rounded-lg shadow-sm">AMEX</div>
                            </div>

                            {/* Security Message */}
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl border border-purple-300 shadow-sm">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-bold text-purple-900 text-sm mb-1">🔒 Secure Card Payment</p>
                                <p className="text-xs text-gray-700">Card details will be entered securely on Razorpay&apos;s payment page. Your card information is never stored on our servers.</p>
                              </div>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>PCI DSS Compliant</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>256-bit Encryption</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>3D Secure</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Instant Processing</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* UPI */}
                        <label className={`flex items-center gap-3 p-3 border-2 ${selectedPaymentType === 'upi' ? 'border-[#184979] bg-blue-50' : 'border-gray-200 bg-white'} rounded-lg cursor-pointer transition-all hover:shadow-md group`}>
                          <input
                            type="radio"
                            name="paymentType"
                            value="upi"
                            checked={selectedPaymentType === 'upi'}
                            onChange={(e) => setSelectedPaymentType(e.target.value as 'upi')}
                            className="w-4 h-4 text-[#184979]"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-sm">UPI</p>
                              <p className="text-xs text-gray-500">Google Pay, PhonePe, Paytm</p>
                            </div>
                          </div>
                          {selectedPaymentType === 'upi' && (
                            <svg className="w-5 h-5 text-[#184979]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </label>

                        {/* UPI Payment Options */}
                        {selectedPaymentType === 'upi' && (
                          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-xl p-5 border-2 border-green-300 space-y-4 animate-slide-in-up shadow-lg">
                            {/* Supported UPI Apps */}
                            <div className="flex items-center justify-center gap-3 py-3">
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">GPay</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">PhPe</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">Paytm</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">BHIM</span>
                                </div>
                              </div>
                            </div>

                            {/* Security Message */}
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl border border-green-300 shadow-sm">
                              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-bold text-green-900 text-sm mb-1">🔒 Secure UPI Payment</p>
                                <p className="text-xs text-gray-700">You&apos;ll choose your UPI app on Razorpay&apos;s secure payment page. Approve the payment directly in your UPI app.</p>
                              </div>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Instant Transfer</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Bank-grade Security</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>No Extra Charges</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>All UPI Apps</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Net Banking */}
                        <label className={`flex items-center gap-3 p-3 border-2 ${selectedPaymentType === 'netbanking' ? 'border-[#184979] bg-blue-50' : 'border-gray-200 bg-white'} rounded-lg cursor-pointer transition-all hover:shadow-md group`}>
                          <input
                            type="radio"
                            name="paymentType"
                            value="netbanking"
                            checked={selectedPaymentType === 'netbanking'}
                            onChange={(e) => setSelectedPaymentType(e.target.value as 'netbanking')}
                            className="w-4 h-4 text-[#184979]"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-sm">Net Banking</p>
                              <p className="text-xs text-gray-500">All major banks supported</p>
                            </div>
                          </div>
                          {selectedPaymentType === 'netbanking' && (
                            <svg className="w-5 h-5 text-[#184979]" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </label>

                        {/* Net Banking Selection */}
                        {selectedPaymentType === 'netbanking' && (
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200 space-y-4 animate-slide-in-up">
                            {/* Popular Banks */}
                            <div className="flex items-center justify-center gap-3 py-3 flex-wrap">
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">SBI</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-800 to-blue-900 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">HDFC</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">ICICI</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-xs">Axis</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 p-2 bg-white rounded-lg shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-[8px]">More</span>
                                </div>
                              </div>
                            </div>

                            {/* Security Message */}
                            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border border-blue-300 shadow-sm">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                </svg>
                              </div>
                              <div>
                                <p className="font-bold text-blue-900 text-sm mb-1">🔒 Secure Net Banking</p>
                                <p className="text-xs text-gray-700">Select your bank on Razorpay&apos;s secure page. You&apos;ll be redirected to your bank&apos;s login page to complete payment.</p>
                              </div>
                            </div>

                            {/* Features */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>50+ Banks Supported</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Bank-level Security</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>No Extra Charges</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-700 bg-white/70 p-2 rounded-lg">
                                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Instant Confirmation</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                          <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <p className="text-xs text-green-700 font-semibold">100% Secure payment via Razorpay</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cash on Delivery */}
                  <label className={`flex items-center p-4 border-2 ${deliveryEstimate?.codAvailable === false ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${paymentMethod === 'cod' ? 'border-[#184979] bg-gradient-to-br from-orange-50 to-yellow-50' : 'border-gray-200 bg-white'} rounded-xl transition-all hover:shadow-md group`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cod')}
                      disabled={deliveryEstimate?.codAvailable === false}
                      className="w-5 h-5 text-[#184979]"
                    />
                    <div className="ml-4 flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 ${deliveryEstimate?.codAvailable === false ? 'bg-gray-400' : 'bg-gradient-to-br from-orange-500 to-orange-600'} rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform`}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <span className="font-bold text-gray-800">Cash on Delivery</span>
                        {deliveryEstimate?.codAvailable === false ? (
                          <p className="text-sm text-red-500 mt-1">Not available for this pincode</p>
                        ) : (
                          <p className="text-sm text-gray-600 mt-1">Pay when you receive the product</p>
                        )}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div 
              ref={orderSummaryRef}
              className={`bg-white/90 backdrop-blur-xl rounded-xl shadow-lg p-4 md:p-5 border border-white/50 transition-all duration-500 hover:shadow-xl ${isScrolled ? 'lg:sticky lg:top-6' : ''}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="relative w-8 h-8 bg-gradient-to-br from-[#184979] to-[#f26322] rounded-lg flex items-center justify-center shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#184979] to-[#f26322] rounded-lg blur-sm opacity-40"></div>
                  <svg className="w-4 h-4 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                </div>
                <h2 className="text-lg md:text-xl font-black bg-gradient-to-r from-[#184979] to-[#f26322] bg-clip-text text-transparent">Order Summary</h2>
              </div>

              {/* Order Items */}
              <div className="space-y-2.5 mb-4 max-h-72 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#184979]/20 scrollbar-track-gray-100">
                {cartItems.map((item, index) => {
                  // Debug: Log price values for each item
                  const hasDiscount = item.unitPrice && item.price && item.price > item.unitPrice;
                  console.log(`Item ${index}: ${item.name}`, { price: item.price, unitPrice: item.unitPrice, hasDiscount });
                  
                  return (
                  <div key={`checkout-item-${index}`} className="group relative bg-gradient-to-br from-gray-50 to-white p-2.5 rounded-lg border border-gray-100 hover:border-[#184979]/30 transition-all duration-300 hover:shadow-md">
                    <div className="flex gap-2.5">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        {/* Discount Badge on Image - always show if there's a discount */}
                        {hasDiscount && (
                          <div className="absolute -top-1 -left-1 z-30 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-[7px] font-bold px-1 py-0.5 rounded shadow-sm">
                            {Math.round(((item.price - (item.unitPrice || 0)) / item.price) * 100)}% OFF
                          </div>
                        )}
                        <div className="w-full h-full rounded-lg overflow-hidden bg-gray-100 ring-2 ring-gray-100 group-hover:ring-[#184979]/20 transition-all">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-bold text-xs text-[#184979] line-clamp-2 group-hover:text-[#f26322] transition-colors leading-tight">{item.name}</h4>
                          <button
                            onClick={() => handleRemoveItem(item._id)}
                            className="flex-shrink-0 p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all duration-300 group/btn"
                            title="Remove item"
                          >
                            <svg className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                        
                        {/* Price Display with MRP and Discount */}
                        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                          <span className="text-sm font-black bg-gradient-to-r from-[#184979] to-[#1e5a8f] bg-clip-text text-transparent">
                            ₹{(item.unitPrice || item.price).toLocaleString()}
                          </span>
                          {item.unitPrice && item.price > item.unitPrice && (
                            <span className="text-[10px] text-gray-400 line-through">₹{item.price.toLocaleString()}</span>
                          )}
                          {item.unitPrice && item.price > item.unitPrice && (
                            <span className="text-[9px] text-green-600 font-semibold">
                              Save ₹{(item.price - item.unitPrice).toLocaleString()}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1.5 bg-white rounded-md border-2 border-gray-200 group-hover:border-[#184979]/30 transition-all">
                            <button
                              onClick={() => handleUpdateItemQuantity(item._id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="px-2 py-0.5 text-[#184979] hover:text-[#f26322] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-orange-50 rounded-l-sm transition-all duration-300 font-bold text-sm"
                            >
                              −
                            </button>
                            <span className="text-xs font-bold text-[#184979] min-w-[1.5rem] text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleUpdateItemQuantity(item._id, item.quantity + 1)}
                              className="px-2 py-0.5 text-[#184979] hover:text-[#f26322] hover:bg-orange-50 rounded-r-sm transition-all duration-300 font-bold text-sm"
                            >
                              +
                            </button>
                          </div>

                          {/* Total Price for item */}
                          <div className="text-right">
                            <span className="font-black text-sm bg-gradient-to-r from-[#184979] to-[#f26322] bg-clip-text text-transparent">
                              ₹{((item.unitPrice || item.price) * item.quantity).toLocaleString()}
                            </span>
                            {item.quantity > 1 && (
                              <div className="text-[9px] text-gray-400">
                                {item.quantity} × ₹{(item.unitPrice || item.price).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-3 border-t-2 border-dashed border-gray-200 mb-4">
                <div className="flex justify-between text-[#184979]/70">
                  <span className="font-semibold text-xs">Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                  <span className="font-bold text-[#184979] text-sm">₹{(typeof cartTotalOverride === 'number' && !isNaN(cartTotalOverride) && appliedCoupon ? cartTotalOverride + (appliedCoupon.discount || 0) : getCartTotal()).toLocaleString()}</span>
                </div>

                {/* Product-level discount (unitPrice vs price) */}
                {getProductDiscount() > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="font-semibold text-xs">Product Discount</span>
                    <span className="font-bold text-sm">-₹{getProductDiscount().toLocaleString()}</span>
                  </div>
                )}

                {/* Coupon Section */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 border-2 border-orange-200">
                  {!appliedCoupon ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span className="text-xs font-bold text-[#184979]">Have a Coupon Code?</span>
                        </div>
                        <button
                          onClick={() => setShowCouponList(!showCouponList)}
                          className="text-[10px] text-[#f26322] font-bold hover:underline"
                        >
                          {showCouponList ? 'Hide' : 'View All'}
                        </button>
                      </div>
                      
                      {showCouponList && (
                        <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                          {/* Available Coupons List from API */}
                          {availableCoupons.length > 0 ? (
                            availableCoupons.map((coupon: any) => (
                              <div key={coupon.code} className="bg-white rounded-lg p-2.5 border border-orange-200 hover:border-[#f26322] transition-all group">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-black text-[#f26322] bg-orange-100 px-2 py-0.5 rounded">{coupon.code}</span>
                                      <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">
                                        {coupon.discountType === 'percent' 
                                          ? `${coupon.discountValue}% OFF` 
                                          : `₹${coupon.discountValue} OFF`}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-600">{coupon.description}</p>
                                    {coupon.minCartValue > 0 && (
                                      <p className="text-[9px] text-gray-500 mt-0.5">Min. order: ₹{coupon.minCartValue}</p>
                                    )}
                                    {coupon.discountType === 'percent' && coupon.maxDiscountValue && (
                                      <p className="text-[9px] text-gray-500 mt-0.5">Max discount: ₹{coupon.maxDiscountValue}</p>
                                    )}
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); applyCouponDirect(coupon.code); }} 
                                    disabled={couponLoading}
                                    className="text-[#f26322] font-bold text-[10px] px-2 py-1 border border-[#f26322] rounded hover:bg-[#f26322] hover:text-white transition-all disabled:opacity-50"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-4 text-gray-500 text-xs">
                              No coupons available at the moment
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError('');
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          placeholder="Enter code"
                          className="flex-1 px-3 py-2 text-xs border-2 border-orange-300 rounded-lg focus:border-[#f26322] focus:outline-none font-semibold uppercase"
                          disabled={couponLoading}
                        />
                        <button
                          onClick={handleApplyCoupon}
                          disabled={couponLoading || !couponCode.trim()}
                          className="px-4 py-2 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white rounded-lg font-bold text-xs hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {couponLoading ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-xs text-red-600 mt-2 font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {couponError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg p-3 border-2 border-green-300">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-black text-green-700">{appliedCoupon.code}</p>
                            <p className="text-[10px] text-gray-600">{appliedCoupon.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-red-600 hover:text-red-700 p-1"
                          title="Remove coupon"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-green-200">
                        <span className="text-xs text-gray-600 font-semibold">Discount Applied</span>
                        <span className="text-sm font-black text-green-600">-₹{(appliedCoupon && typeof appliedCoupon.discount === 'number' && !isNaN(appliedCoupon.discount) ? appliedCoupon.discount : 0).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-green-600">
                    <span className="font-semibold text-xs">Coupon Discount</span>
                    <span className="font-bold text-sm">-₹{(appliedCoupon && typeof appliedCoupon.discount === 'number' && !isNaN(appliedCoupon.discount) ? appliedCoupon.discount : 0).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#184979]/70 text-xs">Delivery Charges</span>
                  <div className="flex items-center gap-2">
                    {isCalculatingShipping ? (
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 border border-[#f26322] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-gray-500">Calculating...</span>
                      </div>
                    ) : deliveryEstimate?.isFreeShipping ? (
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          {deliveryEstimate.shippingCharges > 0 && (
                            <span className="text-xs text-gray-400 line-through">₹{deliveryEstimate.shippingCharges}</span>
                          )}
                          <span className="font-bold text-green-600">FREE</span>
                        </div>
                        {deliveryEstimate.codCharges > 0 && paymentMethod === 'cod' && (
                          <div className="text-xs text-orange-600 mt-0.5">+ ₹{deliveryEstimate.codCharges} COD fee</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="font-bold text-gray-900">₹{getDeliveryCharges()}</span>
                        {deliveryEstimate?.codCharges > 0 && paymentMethod === 'cod' && (
                          <div className="text-xs text-gray-500">
                            (₹{deliveryEstimate.shippingCharges} + ₹{deliveryEstimate.codCharges} COD)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Detailed Shipping Information */}
                {deliveryEstimate && !isCalculatingShipping && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Delivery Partner:</span>
                        <span className="font-semibold text-gray-800">{deliveryEstimate.deliveryPartner}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Expected Delivery:</span>
                        <span className="font-semibold text-green-700">{deliveryEstimate.estimatedDelivery?.formatted}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Delivery Days:</span>
                        <span className="font-semibold text-gray-800">{deliveryEstimate.deliveryDays} days</span>
                      </div>
                      {deliveryEstimate.isFreeShipping && (
                        <div className="flex items-center justify-center mt-2 p-2 bg-green-100 rounded-md">
                          <svg className="w-4 h-4 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-green-700 font-semibold">Free Shipping Applied!</span>
                        </div>
                      )}
                      {!deliveryEstimate.isFreeShipping && getAmountForFreeShipping() > 0 && (
                        <div className="mt-2 p-2 bg-orange-50 rounded-md border border-orange-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-orange-700">Add ₹{getAmountForFreeShipping()} for free shipping</span>
                            <span className="text-xs text-gray-500">{Math.round(((deliveryEstimate.freeShippingThreshold - getAmountForFreeShipping()) / deliveryEstimate.freeShippingThreshold) * 100)}%</span>
                          </div>
                          <div className="w-full bg-orange-200 rounded-full h-1.5">
                            <div 
                              className="bg-orange-500 h-1.5 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.round(((deliveryEstimate.freeShippingThreshold - getAmountForFreeShipping()) / deliveryEstimate.freeShippingThreshold) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                      {/* COD Charges - Coming Soon
                      {deliveryEstimate.codCharges > 0 && paymentMethod === 'cod' && (
                        <div className="flex items-center justify-between border-t pt-2 mt-2">
                          <span className="text-gray-600">COD Charges:</span>
                          <span className="font-semibold text-orange-600">₹{deliveryEstimate.codCharges}</span>
                        </div>
                      )}
                      */}
                      {/* COD Availability Status - Coming Soon
                      <div className="flex items-center justify-between border-t pt-2 mt-2">
                        <span className="text-gray-600">Cash on Delivery:</span>
                        {deliveryEstimate.codAvailable ? (
                          <span className="flex items-center gap-1 font-semibold text-green-600">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Available
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 font-semibold text-red-500">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Not Available
                          </span>
                        )}
                      </div>
                      */}
                    </div>
                  </div>
                )}
                
                <div className="bg-gradient-to-br from-blue-50 via-purple-50/30 to-orange-50 rounded-lg p-3 border-2 border-[#184979]/20 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>
                  <div className="flex justify-between items-center relative z-10">
                    <div>
                      <span className="text-[10px] text-[#184979]/70 font-bold block mb-0.5">Total Amount</span>
                      <span className="text-[9px] text-[#184979]/50">Incl. of all taxes</span>
                    </div>
                    <span className="text-2xl font-black bg-gradient-to-r from-[#184979] via-purple-600 to-[#f26322] bg-clip-text text-transparent animate-gradient">
                      ₹{getFinalTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
                
                {/* Savings Badge */}
                <div className="bg-green-50 border-2 border-green-200 rounded-md p-2 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-[10px] font-bold text-green-700">
                    {(() => {
                      const deliverySavings = getDeliverySavings();
                      const couponDiscount = appliedCoupon && typeof appliedCoupon.discount === 'number' && !isNaN(appliedCoupon.discount) ? appliedCoupon.discount : 0;
                      const totalSavings = deliverySavings + couponDiscount;
                      
                      if (totalSavings > 0) {
                        if (deliverySavings > 0 && couponDiscount > 0) {
                          return `You saved ₹${totalSavings.toLocaleString()} (Delivery + Coupon)!`;
                        } else if (deliverySavings > 0) {
                          return `You saved ₹${deliverySavings} on delivery!`;
                        } else {
                          return `You saved ₹${couponDiscount} with coupon!`;
                        }
                      } else {
                        const amountNeeded = 499 - getCartTotal();
                        return amountNeeded > 0 ? `Add ₹${amountNeeded.toLocaleString()} more for free delivery!` : 'Great savings!';
                      }
                    })()}
                  </span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={(e) => {
                  if (!isDeliveryAvailable) {
                    showToast(deliveryErrorMessage || 'Delivery not available for this pincode. Please update your address.', 'error');
                    return;
                  }
                  const validationErrors = validateAllCheckoutDetails();
                  if (validationErrors.length > 0) {
                    alert('Please complete all required details:\n• ' + validationErrors.join('\n• '));
                    return;
                  }
                  handlePlaceOrder(e as React.FormEvent);
                }}
                disabled={!isReadyForPayment() || isProcessingPayment || !isDeliveryAvailable}
                className={`group relative w-full overflow-hidden ${isReadyForPayment() && !isProcessingPayment && isDeliveryAvailable ? 'bg-gradient-to-r from-[#f26322] via-[#ff6b35] to-[#ff7a45] hover:from-[#e05512] hover:via-[#f26322] hover:to-[#ff7a45] cursor-pointer shadow-md hover:shadow-xl' : 'bg-gray-300 cursor-not-allowed shadow-sm'} text-white py-3 rounded-lg font-black text-sm transition-all duration-500 hover:scale-[1.02] flex items-center justify-center gap-2 border-2 border-white/20`}
              >
                {isReadyForPayment() && !isProcessingPayment && isDeliveryAvailable && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/0 via-yellow-400/20 to-yellow-400/0 animate-shimmer"></div>
                  </>
                )}
                {isProcessingPayment ? (
                  <>
                    <svg className="animate-spin w-5 h-5 relative z-10" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="relative z-10">Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 relative z-10 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="relative z-10">
                      {!isDeliveryAvailable ? 'Delivery Not Available' : !isReadyForPayment() ? 'Complete All Required Details' : paymentMethod === 'online' ? 'Proceed to Payment' : 'Place Order Securely'}
                    </span>
                  </>
                )}
              </button>

              {/* Security Badge */}
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#184979]/70">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 rounded-full blur-sm opacity-20 animate-pulse"></div>
                  <svg className="w-4 h-4 text-green-500 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>{paymentMethod === 'online' ? 'Razorpay Secure Checkout' : '256-bit SSL Secure Checkout'}</span>
              </div>
              <div ref={contentEndRef}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Modal */}
      {showLoginModal && !isLoggedIn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
            <h2 className="text-3xl font-black text-[#184979] mb-4">Login Required</h2>
            <p className="text-gray-600 mb-6">Please enter your details to continue with checkout</p>
            
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={userInfo.fullName}
                  onChange={(e) => setUserInfo({ ...userInfo, fullName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:outline-none bg-white text-gray-900 placeholder:text-gray-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:outline-none bg-white text-gray-900 placeholder:text-gray-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={userInfo.phone}
                  onChange={(e) => setUserInfo({ ...userInfo, phone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#184979] focus:outline-none bg-white text-gray-900 placeholder:text-gray-500"
                  required
                  maxLength={10}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all"
              >
                Continue to Checkout
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 shadow-2xl z-50 safe-area-bottom">
        <div className="px-4 py-3">
          {/* Step Progress */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full ${currentStep >= 1 ? 'bg-[#f26322]' : 'bg-gray-300'} flex items-center justify-center`}>
                {completedSteps.includes(1) ? (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-[10px] text-white font-bold">1</span>
                )}
              </div>
              <div className={`w-8 h-0.5 ${currentStep > 1 ? 'bg-[#184979]' : 'bg-gray-300'}`}></div>
              <div className={`w-6 h-6 rounded-full ${currentStep >= 2 ? 'bg-[#184979]' : 'bg-gray-300'} flex items-center justify-center`}>
                {completedSteps.includes(2) ? (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-[10px] text-white font-bold">2</span>
                )}
              </div>
              <div className={`w-8 h-0.5 ${currentStep > 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <div className={`w-6 h-6 rounded-full ${currentStep >= 3 ? 'bg-green-500' : 'bg-gray-300'} flex items-center justify-center`}>
                {completedSteps.includes(3) ? (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span className="text-[10px] text-white font-bold">3</span>
                )}
              </div>
            </div>
            
            {/* Total Amount */}
            <div className="text-right">
              <div className="text-[10px] text-gray-500">Total Amount</div>
              <div className="text-lg font-black text-[#184979]">₹{(getCartTotal() + getDeliveryCharges() - calculateDiscount()).toLocaleString()}</div>
            </div>
          </div>
          
          {/* Current Step Info */}
          <div className="text-center text-[10px] text-gray-500 mb-2">
            Step {currentStep} of 3: {currentStep === 1 ? 'Contact Info' : currentStep === 2 ? 'Delivery Address' : 'Payment Method'}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed top-4 right-4 left-4 md:top-8 md:right-8 md:left-auto z-[99999] animate-slide-in-right">
          <div className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl shadow-2xl backdrop-blur-xl border-2 ${
            toast.type === 'success' ? 'bg-green-50/95 border-green-500 text-green-800' :
            toast.type === 'error' ? 'bg-red-50/95 border-red-500 text-red-800' :
            'bg-orange-50/95 border-orange-500 text-orange-800'
          }`}>
            {toast.type === 'success' && (
              <svg className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'warning' && (
              <svg className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
            <p className="font-semibold text-xs md:text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
              className="p-1 hover:bg-white/30 rounded-lg transition-colors"
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
