'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useLoader } from '@/components/ui/Loader';

interface Order {
  orderId: string;
  items: any[];
  userInfo: any;
  shippingAddress: any;
  paymentMethod: string;
  total: number;
  orderDate: string;
  status: string;
}

interface TrackingEvent {
  id: string;
  status: string;
  label: string;
  description: string;
  location: string;
  timestamp: string | null;
  icon: string;
  completed: boolean;
  current: boolean;
}

interface CourierDetails {
  name: string;
  phone: string;
  vehicle: string;
  image: string;
}

interface ShipmentInfo {
  shipmentId: string | null;
  shiprocketOrderId: string | null;
  awbCode: string | null;
  trackingId: string | null;
  carrier: string | null;
  status: string;
  weight: number | null;
}

interface DeliveryAddress {
  name: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
}

interface TrackingData {
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
  shipment: ShipmentInfo;
  deliveryAddress: DeliveryAddress;
  timeline: Array<{
    status: string;
    label: string;
    completed: boolean;
    current: boolean;
    date: string | null;
  }>;
}

function TrackOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hideLoader } = useLoader();
  const trackingNumber = searchParams.get('tracking');
  const orderId = searchParams.get('orderId');
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [currentStatus, setCurrentStatus] = useState<string>('confirmed');
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>('');
  const [courierDetails, setCourierDetails] = useState<CourierDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'details' | 'support'>('timeline');
  const [showMap, setShowMap] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [shipmentInfo, setShipmentInfo] = useState<ShipmentInfo | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null);

  // Hide loader on page mount
  useEffect(() => {
    hideLoader();
  }, [hideLoader]);

  useEffect(() => {
    if (orderId) {
      fetchTrackingData();
    } else {
      router.push('/');
    }
  }, [orderId, router]);

  const fetchTrackingData = async () => {
    try {
      setLoading(true);
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const token = sessionStorage.getItem('token');
      
      const response = await fetch(`${apiBaseUrl}/delivery/track-order/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tracking data');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const data = result.data;
        setTrackingData(data);
        setShipmentInfo(data.shipment);
        setDeliveryAddress(data.deliveryAddress);
        
        // Set current status
        setCurrentStatus(data.orderStatus);
        
        // Calculate estimated delivery
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 6);
        setEstimatedDelivery(deliveryDate.toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }));

        // Transform timeline to tracking events
        const iconMap: { [key: string]: string } = {
          'pending': 'clock',
          'confirmed': 'check',
          'packed': 'box',
          'shipped': 'truck',
          'out_for_delivery': 'location',
          'delivered': 'gift'
        };

        const descriptionMap: { [key: string]: string } = {
          'pending': 'Your order has been received and is being processed',
          'confirmed': 'Seller has confirmed your order and is preparing items',
          'packed': 'Your order has been packed and ready for dispatch',
          'shipped': 'Package handed over to courier partner',
          'out_for_delivery': 'Your package is out for delivery',
          'delivered': 'Package delivered successfully'
        };

        const events: TrackingEvent[] = data.timeline.map((item: any, index: number) => ({
          id: (index + 1).toString(),
          status: item.status,
          label: item.label,
          description: descriptionMap[item.status] || item.label,
          location: item.location || (data.deliveryAddress ? `${data.deliveryAddress.city}, ${data.deliveryAddress.state}` : 'Processing'),
          timestamp: item.date,
          icon: iconMap[item.status] || 'check',
          completed: item.completed,
          current: item.current
        }));

        setTrackingEvents(events);

        // Set courier details if shipment info available
        if (data.shipment.carrier) {
          setCourierDetails({
            name: data.shipment.carrier,
            phone: data.deliveryAddress.phone,
            vehicle: data.shipment.trackingId || 'N/A',
            image: '/images/courier-avatar.png',
          });
        }

        // Fallback: Try to get order from localStorage for additional details
        const orders = JSON.parse(localStorage.getItem('grabora_orders') || '[]');
        const foundOrder = orders.find((o: Order) => o.orderId === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
        }
      } else {
        // Fallback to localStorage if API fails
        const orders = JSON.parse(localStorage.getItem('grabora_orders') || '[]');
        const foundOrder = orders.find((o: Order) => o.orderId === orderId);
        if (foundOrder) {
          setOrder(foundOrder);
          setCurrentStatus(foundOrder.status || 'confirmed');
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      
      // Fallback to localStorage
      const orders = JSON.parse(localStorage.getItem('grabora_orders') || '[]');
      const foundOrder = orders.find((o: Order) => o.orderId === orderId);
      if (foundOrder) {
        setOrder(foundOrder);
        setCurrentStatus(foundOrder.status || 'confirmed');
      } else {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusPercentage = () => {
    const statuses = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    const currentIndex = statuses.indexOf(currentStatus);
    return ((currentIndex + 1) / statuses.length) * 100;
  };

  const handleRefreshTracking = () => {
    fetchTrackingData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-[#184979] font-semibold text-lg">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-blue-50 to-gray-50 py-4 md:py-8 relative overflow-hidden">
      {/* Animated Background - Hidden on Mobile for Performance */}
      <div className="hidden md:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-[#f26322]/20 to-[#184979]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-[#184979]/20 to-[#f26322]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container mx-auto px-3 md:px-4 relative z-10 max-w-7xl">
        {/* Header - Mobile Optimized */}
        <div className="mb-4 md:mb-8">
          <Link 
            href="/orders" 
            className="inline-flex items-center gap-1.5 md:gap-2 text-[#184979] hover:text-[#f26322] font-semibold mb-3 md:mb-4 transition-colors text-sm md:text-base"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>
          
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-[#184979] via-[#f26322] to-[#ff7a45] bg-clip-text text-transparent mb-1 md:mb-2">
                Live Shipment Tracking
              </h1>
              <p className="text-gray-600 text-sm md:text-base">Real-time updates for your order</p>
            </div>
            <button
              onClick={handleRefreshTracking}
              className="flex items-center justify-center gap-2 px-4 py-2.5 md:px-5 md:py-3 bg-white border-2 border-[#f26322] text-[#f26322] rounded-xl font-bold hover:bg-orange-50 transition-all hover:scale-105 shadow-lg text-sm md:text-base w-full md:w-auto"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Status
            </button>
          </div>
        </div>

        {/* Tracking Overview Card - Mobile Optimized */}
        <div className="bg-gradient-to-r from-[#184979] via-[#f26322] to-[#ff7a45] rounded-2xl md:rounded-3xl p-[2px] shadow-xl md:shadow-2xl mb-4 md:mb-8">
          <div className="bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 lg:p-8">
            {/* Tracking Header - Stack on Mobile */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4 mb-4 md:mb-6">
              <div>
                <p className="text-xs md:text-sm text-gray-500 font-semibold uppercase tracking-wide mb-1">Tracking Number</p>
                <div className="flex items-center gap-2 md:gap-3">
                  <p className="text-xl md:text-2xl lg:text-3xl font-black font-mono bg-gradient-to-r from-[#184979] to-[#f26322] bg-clip-text text-transparent break-all">
                    {trackingNumber}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(trackingNumber || '');
                      alert('Tracking number copied!');
                    }}
                    className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Order ID: {orderId}</p>
              </div>
              <div className="flex items-center gap-2 bg-green-50 px-4 py-2 md:px-6 md:py-3 rounded-xl border-2 border-green-300 self-start md:self-auto">
                <div className="w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-bold text-green-700 text-sm md:text-base">On Track for Delivery</span>
              </div>
            </div>

            {/* Progress Bar - Mobile Optimized */}
            <div className="mb-4 md:mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs md:text-sm font-bold text-gray-700">Shipment Progress</p>
                <p className="text-xs md:text-sm font-bold text-[#f26322]">{Math.round(getStatusPercentage())}% Complete</p>
              </div>
              <div className="relative h-2.5 md:h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-[#f26322] to-[#184979] rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${getStatusPercentage()}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>

            {/* Delivery Info Grid - Mobile Scroll/Stack */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-4 mb-4 md:mb-6">
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-3 md:p-4 border border-orange-200 md:border-2">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-[#f26322] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-gray-600 font-semibold">Expected Delivery</p>
                    <p className="font-black text-[#f26322] text-xs md:text-sm truncate">{estimatedDelivery.split(',')[0]}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 md:p-4 border border-green-200 md:border-2">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-gray-600 font-semibold">Courier Partner</p>
                    <p className="font-black text-green-700 text-xs md:text-sm truncate">{shipmentInfo?.carrier || 'Processing'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 md:p-4 border border-blue-200 md:border-2">
                <div className="flex items-center gap-2.5 md:gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-[#184979] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs text-gray-600 font-semibold">Current Location</p>
                    <p className="font-black text-[#184979] text-xs md:text-sm truncate">{deliveryAddress ? `${deliveryAddress.city}, ${deliveryAddress.state}` : 'Processing'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Courier Details - Mobile Optimized */}
            {courierDetails && (
              <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-3 md:p-5 border border-orange-200 md:border-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative flex-shrink-0">
                      <div className="absolute inset-0 bg-orange-500 rounded-full blur-md opacity-30 animate-pulse"></div>
                      <div className="relative w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-black text-lg md:text-2xl">
                        {courierDetails.name.split(' ').map(n => n[0]).join('')}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs md:text-sm text-gray-600 font-semibold mb-0.5 md:mb-1">Your Delivery Partner</p>
                      <p className="font-black text-[#184979] text-base md:text-lg mb-1 truncate">{courierDetails.name}</p>
                      <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                        <div className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span className="text-gray-700 font-semibold">{courierDetails.phone}</span>
                        </div>
                        <div className="flex items-center gap-1 hidden xs:flex">
                          <svg className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                          </svg>
                          <span className="text-gray-700 font-semibold truncate">{courierDetails.vehicle}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:shadow-lg transition-all hover:scale-105 w-full sm:w-auto text-sm md:text-base">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs - Mobile Scroll Optimized */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-lg md:shadow-xl mb-4 md:mb-8 overflow-hidden">
          <div className="flex border-b border-gray-200 md:border-b-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 min-w-[110px] px-3 md:px-6 py-3 md:py-4 font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'timeline' ? 'bg-gradient-to-r from-[#184979] to-[#f26322] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center gap-1.5 md:gap-2">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden xs:inline">Tracking</span> Timeline
              </div>
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 min-w-[110px] px-3 md:px-6 py-3 md:py-4 font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'details' ? 'bg-gradient-to-r from-[#184979] to-[#f26322] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center gap-1.5 md:gap-2">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <span className="hidden xs:inline">Package</span> Details
              </div>
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`flex-1 min-w-[100px] px-3 md:px-6 py-3 md:py-4 font-bold text-xs md:text-sm transition-all whitespace-nowrap ${activeTab === 'support' ? 'bg-gradient-to-r from-[#184979] to-[#f26322] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center gap-1.5 md:gap-2">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="hidden xs:inline">Help &</span> Support
              </div>
            </button>
          </div>

          <div className="p-4 md:p-6 lg:p-8">
            {/* Timeline Tab - Mobile Optimized */}
            {activeTab === 'timeline' && (
              <div className="space-y-0">
                <h2 className="text-lg md:text-2xl font-black text-[#184979] mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                  <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Shipment Journey
                </h2>
                {trackingEvents.map((event, index) => (
                  <div key={event.id} className="flex items-start gap-3 md:gap-5 relative pb-6 md:pb-8 last:pb-0">
                    {/* Timeline Line */}
                    {index < trackingEvents.length - 1 && (
                      <div className="absolute left-[18px] md:left-[23px] top-10 md:top-12 w-0.5 h-full bg-gradient-to-b from-green-500 to-blue-500"></div>
                    )}
                    
                    {/* Event Icon - Smaller on Mobile */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className={`absolute inset-0 rounded-full blur-lg opacity-40 ${
                        event.completed ? 'bg-green-500 animate-pulse' : event.current ? 'bg-blue-500 animate-pulse' : 'bg-gray-400'
                      }`}></div>
                      <div className={`relative w-9 h-9 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg md:shadow-xl ring-2 md:ring-4 ${
                        event.completed 
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 ring-green-100' 
                          : event.current 
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 ring-blue-100'
                          : 'bg-gradient-to-br from-gray-400 to-slate-500 ring-gray-100'
                      }`}>
                        <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          {event.completed ? (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          ) : event.current ? (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          ) : (
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                          )}
                        </svg>
                      </div>
                    </div>
                    
                    {/* Event Content - Compact on Mobile */}
                    <div className="flex-1 min-w-0">
                      <div className={`rounded-xl md:rounded-2xl p-3 md:p-5 border shadow-md md:shadow-lg ${
                        event.completed 
                          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                          : event.current 
                          ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                          : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2 md:mb-3">
                          <div className="min-w-0">
                            <h3 className={`font-black text-sm md:text-lg mb-0.5 md:mb-1 ${
                              event.completed ? 'text-green-700' : event.current ? 'text-blue-700' : 'text-gray-500'
                            }`}>{event.status}</h3>
                            <p className="text-gray-700 font-medium text-xs md:text-base line-clamp-2">{event.description}</p>
                          </div>
                          <span className={`flex-shrink-0 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs font-bold rounded-full self-start ${
                            event.completed 
                              ? 'bg-green-200 text-green-800' 
                              : event.current 
                              ? 'bg-blue-200 text-blue-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {event.completed ? 'COMPLETED' : event.current ? 'IN PROGRESS' : 'PENDING'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm">
                          <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-semibold truncate max-w-[120px] md:max-w-none">{event.location}</span>
                          </div>
                          <div className="flex items-center gap-1 md:gap-2 text-gray-600">
                            <svg className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-semibold">
                              {event.timestamp ? (
                                <>
                                  <span className="hidden sm:inline">{new Date(event.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })} at </span>
                                  <span className="sm:hidden">{new Date(event.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, </span>
                                  {new Date(event.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </>
                              ) : (
                                'Pending'
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Package Details Tab */}
            {activeTab === 'details' && (
              <div>
                <h2 className="text-2xl font-black text-[#184979] mb-6 flex items-center gap-3">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  Package Information
                </h2>
                
                {!order || !order.items ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">Order details not available. Please check back later.</p>
                  </div>
                ) : (
                <>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  {/* Package Details */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border-2 border-blue-200">
                    <h3 className="font-black text-[#184979] mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Package Details
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-semibold">Weight:</span>
                        <span className="text-[#184979] font-bold">{shipmentInfo?.weight ? `${shipmentInfo.weight} kg` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-semibold">Tracking ID:</span>
                        <span className="text-[#184979] font-bold">{shipmentInfo?.trackingId || shipmentInfo?.awbCode || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-semibold">Total Items:</span>
                        <span className="text-[#184979] font-bold">{order.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 font-semibold">Payment:</span>
                        <span className="text-[#184979] font-bold">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Prepaid'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                    <h3 className="font-black text-[#184979] mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Delivery Address
                    </h3>
                    <div className="space-y-2 text-gray-700">
                      <p className="font-bold text-[#184979]">{deliveryAddress?.name || order.userInfo?.fullName || 'N/A'}</p>
                      {order.shippingAddress ? (
                        <>
                          <p>{order.shippingAddress.address}</p>
                          <p>{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                          <p>{order.shippingAddress.pincode}, {order.shippingAddress.country}</p>
                        </>
                      ) : deliveryAddress ? (
                        <>
                          <p>{deliveryAddress.city}, {deliveryAddress.state}</p>
                          <p>{deliveryAddress.pincode}</p>
                        </>
                      ) : (
                        <p>Address not available</p>
                      )}
                      <p className="pt-2 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="font-semibold">{deliveryAddress?.phone || order.userInfo?.phone || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
                  <h3 className="font-black text-[#184979] mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Items in Package ({order.items.length})
                  </h3>
                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-4 items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-white border border-gray-200">
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-[#184979] mb-1">{item.name}</h4>
                          <p className="text-sm text-gray-600">Qty: {item.quantity} × ₹{item.price.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-lg text-[#f26322]">₹{(item.quantity * item.price).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                </>
                )}
              </div>
            )}

            {/* Support Tab */}
            {activeTab === 'support' && (
              <div>
                <h2 className="text-lg md:text-2xl font-black text-[#184979] mb-4 md:mb-6 flex items-center gap-2 md:gap-3">
                  <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Need Help with Your Order?
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-blue-200 md:border-2">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-[#184979] rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <h3 className="font-black text-[#184979] text-base md:text-xl mb-1 md:mb-2">Call Support</h3>
                    <p className="text-gray-600 text-sm md:text-base mb-3 md:mb-4">Speak with our customer service team</p>
                    <a href="tel:18001234567" className="flex md:inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-[#184979] text-white rounded-lg font-bold text-sm md:text-base hover:bg-[#1e5a8f] transition-colors">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      1800-123-4567
                    </a>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-green-200 md:border-2">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-black text-[#184979] text-base md:text-xl mb-1 md:mb-2">Email Support</h3>
                    <p className="text-gray-600 text-sm md:text-base mb-3 md:mb-4">Get help via email within 24 hours</p>
                    <a href="mailto:support@grabora.com" className="flex md:inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-green-600 text-white rounded-lg font-bold text-sm md:text-base hover:bg-green-700 transition-colors">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      support@grabora.com
                    </a>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-orange-200 md:border-2">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-[#f26322] rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="font-black text-[#184979] text-base md:text-xl mb-1 md:mb-2">Live Chat</h3>
                    <p className="text-gray-600 text-sm md:text-base mb-3 md:mb-4">Chat with us for instant support</p>
                    <button className="flex md:inline-flex w-full md:w-auto items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-[#f26322] text-white rounded-lg font-bold text-sm md:text-base hover:bg-[#e05512] transition-colors">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Start Chat
                    </button>
                  </div>

                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl md:rounded-2xl p-4 md:p-6 border border-gray-300 md:border-2">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-700 rounded-lg md:rounded-xl flex items-center justify-center mb-3 md:mb-4">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-black text-[#184979] text-base md:text-xl mb-1 md:mb-2">FAQs</h3>
                    <p className="text-gray-600 text-sm md:text-base mb-3 md:mb-4">Find answers to common questions</p>
                    <Link href="/faq" className="flex md:inline-flex items-center justify-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-gray-700 text-white rounded-lg font-bold text-sm md:text-base hover:bg-gray-800 transition-colors">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      View FAQs
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Mobile Optimized */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pb-4 md:pb-0">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white rounded-xl font-bold shadow-lg md:shadow-xl hover:shadow-2xl transition-all hover:scale-105 text-sm md:text-base"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Continue Shopping
          </Link>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-white border-2 border-[#184979] text-[#184979] rounded-xl font-bold hover:bg-[#184979] hover:text-white transition-all hover:scale-105 shadow-md md:shadow-lg text-sm md:text-base"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Details
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 3s infinite;
        }
      `}</style>
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-[#184979] font-semibold text-lg">Loading...</p>
        </div>
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  );
}
