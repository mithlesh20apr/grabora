'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useLoader } from '@/components/ui/Loader';

interface OrderItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

interface Order {
  orderId: string;
  items: OrderItem[];
  userInfo: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    label?: string;
  };
  paymentMethod: 'cod' | 'online';
  total: number;
  totalAmount: number;
  shippingCharges: number;
  paymentStatus: string;
  orderDate: string;
  status: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  currentStatus?: 'placed' | 'confirmed' | 'packed' | 'shipped' | 'out_for_delivery' | 'delivered';
}

interface TrackingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
}

function OrderConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showLoader } = useLoader();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [trackingSteps, setTrackingSteps] = useState<TrackingStep[]>([]);
  const [showTrackingDetails, setShowTrackingDetails] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);
  const [shippingDetails, setShippingDetails] = useState<any>(null);

  // Handle track shipment with loader
  const handleTrackShipment = () => {
    showLoader('Loading tracking details...');
    router.push(`/track-order?tracking=${order?.trackingNumber}&orderId=${order?.orderId}`);
  };

  useEffect(() => {
    if (orderId) {
      // Fetch order from API
      fetchOrderFromAPI(orderId);
    } else {
      router.push('/');
    }
  }, [orderId, router]);

  const fetchOrderFromAPI = async (orderIdParam: string) => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      
      const response = await fetch(`${apiBaseUrl}/orders/${orderIdParam}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const orderData = result.data;
        
        // Transform API data to match the Order interface
        const transformedOrder: Order = {
          orderId: orderData.orderId,
          items: orderData.items.map((item: any) => ({
            _id: item.productId,
            name: item.title,
            price: item.unitPrice,
            quantity: item.qty,
            imageUrl: item.image || item.thumbnail || '/api/placeholder/150/150'
          })),
          userInfo: {
            fullName: orderData.address.name,
            email: '',
            phone: orderData.address.phone,
          },
          shippingAddress: {
            address: orderData.address.line1,
            city: orderData.address.city,
            state: orderData.address.state,
            pincode: orderData.address.pincode,
            country: orderData.address.country,
            label: orderData.address.label,
          },
          paymentMethod: orderData.meta?.paymentMethod || 'cod',
          total: orderData.totalAmount,
          totalAmount: orderData.totalAmount,
          shippingCharges: orderData.shippingCharges || 0,
          paymentStatus: orderData.paymentStatus || 'pending',
          orderDate: orderData.createdAt || new Date().toISOString(),
          status: orderData.status,
          trackingNumber: orderData.fulfillment?.trackingId || `TRK${orderIdParam.slice(-8).toUpperCase()}`,
          currentStatus: orderData.status === 'confirmed' ? 'confirmed' : 'placed',
        };
        
        // Try to get shipment tracking if available
        const shipmentId = sessionStorage.getItem(`shipment_${orderIdParam}`);
        if (shipmentId) {
          try {
            const trackingResponse = await fetch(`${apiBaseUrl}/delivery/track/${shipmentId}`);
            if (trackingResponse.ok) {
              const trackingResult = await trackingResponse.json();
              if (trackingResult.data) {
                // Add tracking details as a custom property
                (transformedOrder as any).trackingDetails = trackingResult.data;
                transformedOrder.trackingNumber = trackingResult.data.awbNumber || transformedOrder.trackingNumber;
              }
            }
          } catch (trackingError) {
          }
        }
        
        setOrder(transformedOrder);
        
        // Fetch delivery information for the shipping address
        if (transformedOrder.shippingAddress?.pincode) {
          try {
            // Check delivery availability
            const deliveryCheckResponse = await fetch(`${apiBaseUrl}/delivery/check/${transformedOrder.shippingAddress.pincode}`);
            if (deliveryCheckResponse.ok) {
              const deliveryCheckResult = await deliveryCheckResponse.json();
              if (deliveryCheckResult.success) {
                setDeliveryInfo(deliveryCheckResult.data);
              }
            }
            
            // Calculate shipping details using actual order data
            const cartTotal = transformedOrder.totalAmount - (transformedOrder.shippingCharges || 0);
            const shippingCalcResponse = await fetch(`${apiBaseUrl}/delivery/calculate-shipping`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                pincode: transformedOrder.shippingAddress.pincode,
                cartTotal: cartTotal,
                weight: transformedOrder.items.reduce((total: number, item: any) => total + (item.qty * 0.5), 0),
                cod: transformedOrder.paymentStatus === 'pending' // Assuming COD if payment is pending
              }),
            });
            
            if (shippingCalcResponse.ok) {
              const shippingResult = await shippingCalcResponse.json();
              if (shippingResult.success) {
                setShippingDetails(shippingResult.data);
                // Use API delivery date if available
                if (shippingResult.data.estimatedDelivery?.formatted) {
                  setExpectedDeliveryDate(shippingResult.data.estimatedDelivery.formatted);
                  transformedOrder.estimatedDelivery = shippingResult.data.estimatedDelivery.formatted;
                }
              }
            }
          } catch (deliveryError) {
          }
        }
        
        // Fallback to calculated delivery date if API data not available
        if (!transformedOrder.estimatedDelivery) {
          // Use delivery days from shipping details API or default to 6 days
          const deliveryDays = shippingDetails?.deliveryDays || deliveryInfo?.estimatedDeliveryDays || 6;
          const deliveryDate = new Date();
          deliveryDate.setDate(deliveryDate.getDate() + deliveryDays);
          const formattedDate = deliveryDate.toLocaleDateString('en-IN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          setExpectedDeliveryDate(formattedDate);
          transformedOrder.estimatedDelivery = formattedDate;
        }

        // Initialize tracking steps dynamically based on order status
        const now = new Date().toISOString();
        const orderStatus = (transformedOrder as any).trackingDetails?.status || orderData.status || 'confirmed';
        
        // Map order status to step progression
        const statusMap: { [key: string]: number } = {
          'placed': 0,
          'confirmed': 1,
          'packed': 2,
          'shipped': 3,
          'out_for_delivery': 4,
          'delivered': 5
        };
        
        const currentStepIndex = statusMap[orderStatus.toLowerCase()] ?? 1;
        
        const steps: TrackingStep[] = [
          {
            id: 'placed',
            title: 'Order Placed',
            description: 'Your order has been received and confirmed',
            icon: 'check',
            status: currentStepIndex >= 0 ? 'completed' : 'pending',
            timestamp: transformedOrder.orderDate,
          },
          {
            id: 'confirmed',
            title: 'Order Confirmed',
            description: orderData.meta?.paymentMethod === 'cod' ? 'Order confirmed and being prepared' : 'Payment processed and order is being prepared',
            icon: 'document',
            status: currentStepIndex > 1 ? 'completed' : currentStepIndex === 1 ? 'current' : 'pending',
            timestamp: currentStepIndex >= 1 ? now : undefined,
          },
          {
            id: 'packed',
            title: 'Packed',
            description: 'Your items are being packed for shipment',
            icon: 'box',
            status: currentStepIndex > 2 ? 'completed' : currentStepIndex === 2 ? 'current' : 'pending',
            timestamp: currentStepIndex >= 2 ? (transformedOrder as any).trackingDetails?.packedAt || now : undefined,
          },
          {
            id: 'shipped',
            title: 'Shipped',
            description: 'Package handed over to courier partner',
            icon: 'truck',
            status: currentStepIndex > 3 ? 'completed' : currentStepIndex === 3 ? 'current' : 'pending',
            timestamp: currentStepIndex >= 3 ? (transformedOrder as any).trackingDetails?.shippedAt || now : undefined,
          },
          {
            id: 'out_for_delivery',
            title: 'Out for Delivery',
            description: 'Your package is out for delivery',
            icon: 'location',
            status: currentStepIndex > 4 ? 'completed' : currentStepIndex === 4 ? 'current' : 'pending',
            timestamp: currentStepIndex >= 4 ? (transformedOrder as any).trackingDetails?.outForDeliveryAt || now : undefined,
          },
          {
            id: 'delivered',
            title: 'Delivered',
            description: 'Package delivered successfully',
            icon: 'gift',
            status: currentStepIndex >= 5 ? 'completed' : 'pending',
            timestamp: currentStepIndex >= 5 ? (transformedOrder as any).trackingDetails?.deliveredAt || now : undefined,
          },
        ];
        setTrackingSteps(steps);
      } else {
        throw new Error('Order not found in API response');
      }
    } catch (error) {
      
      // Fallback to localStorage if API fails
      const orders = JSON.parse(localStorage.getItem('grabora_orders') || '[]');
      const foundOrder = orders.find((o: Order) => o.orderId === orderIdParam);
      
      if (foundOrder) {
        // Enhance order with tracking information
        const enhancedOrder = {
          ...foundOrder,
          trackingNumber: `TRK${orderIdParam.slice(-8).toUpperCase()}`,
          currentStatus: 'confirmed' as const,
        };
        setOrder(enhancedOrder);
        
        // Calculate expected delivery date (5-7 days from now)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 6);
        const formattedDate = deliveryDate.toLocaleDateString('en-IN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        setExpectedDeliveryDate(formattedDate);
        enhancedOrder.estimatedDelivery = formattedDate;

        // Initialize tracking steps for fallback
        const now = new Date().toISOString();
        const steps: TrackingStep[] = [
          {
            id: 'placed',
            title: 'Order Placed',
            description: 'Your order has been received and confirmed',
            icon: 'check',
            status: 'completed',
            timestamp: foundOrder.orderDate,
          },
          {
            id: 'confirmed',
            title: 'Order Confirmed',
            description: 'Payment processed and order is being prepared',
            icon: 'document',
            status: 'current',
            timestamp: now,
          },
          {
            id: 'packed',
            title: 'Packed',
            description: 'Your items are being packed for shipment',
            icon: 'box',
            status: 'pending',
          },
          {
            id: 'shipped',
            title: 'Shipped',
            description: 'Package handed over to courier partner',
            icon: 'truck',
            status: 'pending',
          },
          {
            id: 'out_for_delivery',
            title: 'Out for Delivery',
            description: 'Your package is out for delivery',
            icon: 'location',
            status: 'pending',
          },
          {
            id: 'delivered',
            title: 'Delivered',
            description: 'Package delivered successfully',
            icon: 'gift',
            status: 'pending',
          },
        ];
        setTrackingSteps(steps);
      } else {
        router.push('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!order) return;
    
    // Create invoice HTML for PDF
    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice - ${order.orderId}</title>
        <style>
          @media print {
            @page { margin: 20mm; }
            body { margin: 0; }
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: #fff;
            color: #333;
          }
          .invoice-header {
            background: linear-gradient(135deg, #184979 0%, #1e5a8f 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
          }
          .invoice-header h1 {
            font-size: 36px;
            margin-bottom: 10px;
            font-weight: 900;
            letter-spacing: 2px;
          }
          .invoice-header p {
            font-size: 14px;
            opacity: 0.9;
          }
          .invoice-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .info-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f26322;
          }
          .info-box h3 {
            color: #184979;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
            font-weight: 700;
          }
          .info-box p {
            color: #666;
            font-size: 13px;
            line-height: 1.6;
            margin: 4px 0;
          }
          .order-details {
            background: linear-gradient(135deg, #f26322 0%, #ff7a45 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .order-details .order-id {
            font-size: 18px;
            font-weight: 700;
          }
          .order-details .order-date {
            font-size: 14px;
            opacity: 0.95;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          thead {
            background: linear-gradient(135deg, #184979 0%, #1e5a8f 100%);
            color: white;
          }
          th {
            padding: 15px;
            text-align: left;
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          td {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
            font-size: 14px;
          }
          tbody tr:last-child td {
            border-bottom: none;
          }
          tbody tr:hover {
            background-color: #f8f9fa;
          }
          .item-name {
            font-weight: 600;
            color: #184979;
          }
          .text-right {
            text-align: right;
          }
          .text-center {
            text-align: center;
          }
          .summary {
            max-width: 400px;
            margin-left: auto;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 14px;
          }
          .summary-row.total {
            border-top: 2px solid #184979;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 18px;
            font-weight: 700;
            color: #184979;
          }
          .summary-row .label {
            color: #666;
          }
          .summary-row .value {
            font-weight: 600;
            color: #333;
          }
          .summary-row.total .value {
            background: linear-gradient(135deg, #184979 0%, #f26322 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .payment-info {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            text-align: center;
            font-weight: 600;
          }
          .footer {
            text-align: center;
            padding: 30px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-top: 40px;
          }
          .footer h3 {
            color: #184979;
            font-size: 20px;
            margin-bottom: 10px;
          }
          .footer p {
            color: #666;
            font-size: 13px;
            margin: 5px 0;
          }
          .badge {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            margin-left: 8px;
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <h1>GRABORA</h1>
          <p>Tax Invoice / Bill of Supply / Cash Memo</p>
        </div>

        <div class="order-details">
          <div>
            <span class="order-id">Order ID: ${order.orderId}</span>
          </div>
          <div>
            <span class="order-date">Date: ${new Date(order.orderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div class="invoice-info">
          <div class="info-box">
            <h3>📋 Customer Details</h3>
            <p><strong>${order.userInfo.fullName}</strong></p>
            <p>${order.userInfo.email}</p>
            <p>${order.userInfo.phone}</p>
          </div>
          <div class="info-box">
            <h3>📍 Shipping Address</h3>
            ${order.shippingAddress.label ? `<p><strong>${order.shippingAddress.label}</strong></p>` : ''}
            <p>${order.shippingAddress.address}</p>
            <p>${order.shippingAddress.city}, ${order.shippingAddress.state}</p>
            <p>${order.shippingAddress.pincode}, ${order.shippingAddress.country}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 50px;">#</th>
              <th>Product Details</th>
              <th class="text-center" style="width: 100px;">Quantity</th>
              <th class="text-right" style="width: 120px;">Unit Price</th>
              <th class="text-right" style="width: 120px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="item-name">${item.name}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">₹${item.price.toLocaleString('en-IN')}</td>
                <td class="text-right">₹${(item.quantity * item.price).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-row">
            <span class="label">Subtotal:</span>
            <span class="value">₹${order.total.toLocaleString('en-IN')}</span>
          </div>
          <div class="summary-row">
            <span class="label">Delivery Charges:</span>
            <span class="value" style="color: #10b981;">FREE <span class="badge">SAVED ₹99</span></span>
          </div>
          <div class="summary-row total">
            <span class="label">TOTAL AMOUNT:</span>
            <span class="value">₹${order.total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div class="payment-info">
          💳 Payment Method: ${order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Online Payment (Paid)'}
        </div>

        <div class="footer">
          <h3>Thank You for Shopping with Grabora! 🎉</h3>
          <p>For any queries, contact us at support@grabora.com or call 1800-123-4567</p>
          <p>Visit us at www.grabora.com</p>
          <p style="margin-top: 15px; font-size: 11px; color: #999;">This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </body>
      </html>
    `;

    // Create a new window and print to PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.print();
        // Note: The window will close after user completes or cancels the print dialog
      }, 250);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 md:bg-gradient-to-br md:from-gray-50 md:via-blue-50/30 md:to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#f26322] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#184979] font-semibold">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 md:bg-gradient-to-br md:from-gray-50 md:via-blue-50/30 md:to-orange-50/20 pb-20 md:pb-6 relative overflow-hidden">
      {/* Animated Background Elements - Hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-[#184979]/20 to-[#1e5a8f]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tr from-[#f26322]/20 to-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Success Header */}
      <div className="bg-gradient-to-br from-green-500 via-green-600 to-emerald-600 md:bg-gradient-to-r md:from-[#184979] md:via-[#1e5a8f] md:to-[#184979] py-6 md:py-10 px-4 relative">
        {/* Confetti Effect - Mobile */}
        <div className="absolute inset-0 overflow-hidden md:hidden">
          <div className="absolute top-4 left-[10%] text-2xl animate-bounce" style={{ animationDelay: '0s' }}>🎉</div>
          <div className="absolute top-8 right-[15%] text-xl animate-bounce" style={{ animationDelay: '0.3s' }}>⭐</div>
          <div className="absolute top-6 left-[40%] text-lg animate-bounce" style={{ animationDelay: '0.5s' }}>✨</div>
          <div className="absolute top-10 right-[35%] text-xl animate-bounce" style={{ animationDelay: '0.2s' }}>🎊</div>
        </div>
        
        <div className="container mx-auto relative z-10 max-w-6xl">
          {/* Success Animation Header */}
          <div className="text-center animate-fade-in-down">
            <div className="relative inline-block mb-4 md:mb-6">
              <div className="absolute inset-0 bg-white rounded-full blur-2xl md:blur-3xl opacity-40 animate-pulse"></div>
              <div className="relative w-20 h-20 md:w-28 md:h-28 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl ring-4 ring-white/30">
                <svg className="w-10 h-10 md:w-14 md:h-14 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl md:text-4xl font-black text-white mb-2 md:mb-3">
              Order Placed Successfully! 🎉
            </h1>
            <p className="text-white/90 text-sm md:text-lg mb-3 md:mb-4">Thank you! Your order is confirmed.</p>
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 md:px-6 py-2 md:py-3 rounded-full shadow-lg border border-white/30">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-xs md:text-sm font-semibold text-white">Being prepared for shipping</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 md:px-4 relative z-10 max-w-6xl -mt-4 md:mt-0 pt-0 md:pt-8">

        {/* Order ID and Actions Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl p-4 md:p-8 mb-4 md:mb-8 border border-white/50 animate-slide-in-up">
          <div className="flex flex-col gap-4 md:gap-6">
            {/* Order ID Section */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-[10px] md:text-sm text-gray-500 mb-1 md:mb-2 font-semibold uppercase tracking-wider">Order ID</p>
                <div className="flex items-center gap-2 md:gap-3">
                  <p className="text-lg md:text-4xl font-black bg-gradient-to-r from-[#184979] via-purple-600 to-[#f26322] bg-clip-text text-transparent">
                    {order.orderId}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(order.orderId);
                      alert('Order ID copied!');
                    }}
                    className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors bg-gray-50"
                    title="Copy Order ID"
                  >
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-[10px] md:text-sm text-gray-500 mt-1">
                  {new Date(order.orderDate).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
              
              {/* Order Total - Mobile visible */}
              <div className="md:hidden bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl px-3 py-2 border border-green-200">
                <div className="text-[10px] text-green-600 font-semibold">Total Paid</div>
                <div className="text-lg font-black text-green-700">₹{(order.totalAmount || order.total).toLocaleString()}</div>
              </div>
            </div>
            
            {/* Action Buttons - Horizontal scroll on mobile */}
            <div className="flex gap-2 md:gap-3 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1 md:mx-0 md:px-0">
              <button
                onClick={handleDownloadInvoice}
                className="group flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-[#184979] to-[#1e5a8f] text-white rounded-xl font-bold text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="hidden md:inline">Download</span> Invoice
              </button>
              <button
                onClick={handleTrackShipment}
                className="group flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl font-bold text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Track Order
              </button>
              <Link
                href="/"
                className="group flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-3.5 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white rounded-xl font-bold text-xs md:text-sm whitespace-nowrap flex-shrink-0"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">{/* Delivery Information */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl p-4 md:p-6 border-2 border-green-200 animate-slide-in-left">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500 rounded-lg md:rounded-xl blur-md opacity-50 hidden md:block"></div>
                  <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-black text-green-700">Delivery Info</h2>
                  <p className="text-xs md:text-sm text-green-600 hidden md:block">Track your order status</p>
                </div>
              </div>
              <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-md md:shadow-lg border border-green-100">
                <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
                  <div className="relative hidden md:block">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-sm opacity-30 animate-pulse"></div>
                    <div className="relative w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] md:text-sm text-gray-500 font-semibold uppercase tracking-wide mb-1 md:mb-2">Expected Delivery</p>
                    <p className="font-black text-green-700 text-base md:text-2xl mb-1 md:mb-2">{expectedDeliveryDate}</p>
                    <div className="flex items-center gap-1.5 md:gap-2 bg-green-50 rounded-lg px-2 md:px-3 py-1.5 md:py-2 border border-green-200">
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[10px] md:text-xs font-bold text-green-700">
                        {shippingDetails?.deliveryDays 
                          ? `${shippingDetails.deliveryDays} business days` 
                          : deliveryInfo?.estimatedDeliveryDays 
                            ? `${deliveryInfo.estimatedDeliveryDays} business days`
                            : '5-7 business days'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Comprehensive Delivery Information */}
                {(deliveryInfo || shippingDetails) && (
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl md:rounded-2xl p-3 md:p-6 border border-green-200 md:border-2 mb-3 md:mb-5">
                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-black text-[#184979] text-sm md:text-lg">Shipping Details</h3>
                        <p className="text-[10px] md:text-xs text-gray-600 hidden md:block">Complete shipping details</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 md:gap-4">
                      {deliveryInfo && (
                        <>
                          <div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-1 md:mb-2">
                              <span className="text-[10px] md:text-xs text-gray-600 font-semibold">Service Area</span>
                              <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold ${
                                deliveryInfo.isServiceable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {deliveryInfo.isServiceable ? '✓' : '✗'}
                              </span>
                            </div>
                            <p className="font-bold text-gray-800 text-xs md:text-base">{deliveryInfo.city}</p>
                            <p className="text-[10px] md:text-xs text-gray-500">{deliveryInfo.pincode}</p>
                          </div>
                          
                          <div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-1 md:mb-2">
                              <span className="text-[10px] md:text-xs text-gray-600 font-semibold">COD</span>
                              <span className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-full text-[9px] md:text-xs font-bold ${
                                deliveryInfo.codAvailable ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {deliveryInfo.codAvailable ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <p className="text-[10px] md:text-sm text-gray-700">
                              {deliveryInfo.codAvailable ? 'Available' : 'Prepaid only'}
                            </p>
                          </div>
                        </>
                      )}
                      
                      {shippingDetails && (
                        <>
                          <div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-1 md:mb-2">
                              <span className="text-[10px] md:text-xs text-gray-600 font-semibold">Shipping</span>
                              {shippingDetails.isFreeShipping ? (
                                <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-green-100 text-green-700 rounded-full text-[9px] md:text-xs font-bold">FREE</span>
                              ) : (
                                <span className="font-bold text-gray-800 text-xs md:text-sm">₹{shippingDetails.totalShipping}</span>
                              )}
                            </div>
                            {shippingDetails.codCharges > 0 && order.paymentStatus === 'pending' && (
                              <p className="text-[10px] md:text-xs text-orange-600">+₹{shippingDetails.codCharges} COD</p>
                            )}
                          </div>
                          
                          <div className="bg-white rounded-lg md:rounded-xl p-2.5 md:p-4 border border-gray-200">
                            <div className="flex items-center justify-between mb-1 md:mb-2">
                              <span className="text-[10px] md:text-xs text-gray-600 font-semibold">Partner</span>
                            </div>
                            <p className="font-bold text-gray-800 text-xs md:text-base">{shippingDetails.deliveryPartner}</p>
                            <p className="text-[10px] md:text-xs text-gray-500">{shippingDetails.deliveryDays} days</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Professional Order Tracking Timeline */}
                <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl md:rounded-2xl p-3 md:p-6 border border-blue-200 md:border-2 mb-3 md:mb-5">
                  <div className="flex items-center justify-between mb-4 md:mb-6">
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-black text-[#184979] text-sm md:text-lg">Order Tracking</h3>
                        <p className="text-[10px] md:text-xs text-gray-600 hidden md:block">Real-time status updates</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTrackingDetails(!showTrackingDetails)}
                      className="text-[10px] md:text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                    >
                      {showTrackingDetails ? 'Hide' : 'View'}
                      <svg className={`w-3 h-3 md:w-4 md:h-4 transition-transform ${showTrackingDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="space-y-0">
                    {trackingSteps.map((step, index) => {
                      const isLast = index === trackingSteps.length - 1;
                      const isCompleted = step.status === 'completed';
                      const isCurrent = step.status === 'current';
                      const isPending = step.status === 'pending';

                      return (
                        <div key={step.id} className="flex items-start gap-2 md:gap-4 relative">
                          {/* Timeline Line */}
                          {!isLast && (
                            <div className={`absolute left-[15px] md:left-[19px] top-8 md:top-10 w-0.5 h-full ${isCompleted || isCurrent ? 'bg-gradient-to-b from-green-500 to-blue-500' : 'bg-gray-300'}`}></div>
                          )}
                          
                          {/* Step Icon */}
                          <div className="relative z-10 flex-shrink-0">
                            {isCompleted && (
                              <div className="relative">
                                <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-50 animate-pulse hidden md:block"></div>
                                <div className="relative w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg ring-2 md:ring-4 ring-green-100">
                                  <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}
                            
                            {isCurrent && (
                              <div className="relative">
                                <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-50 animate-pulse hidden md:block"></div>
                                <div className="relative w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg ring-2 md:ring-4 ring-blue-100 animate-pulse">
                                  <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full"></div>
                                </div>
                              </div>
                            )}
                            
                            {isPending && (
                              <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 rounded-full flex items-center justify-center border-2 md:border-4 border-white shadow">
                                <div className="w-2 h-2 md:w-3 md:h-3 bg-gray-400 rounded-full"></div>
                              </div>
                            )}
                          </div>
                          
                          {/* Step Content */}
                          <div className={`flex-1 pb-4 md:pb-8 ${isCurrent ? 'animate-fade-in' : ''}`}>
                            <div className={`bg-white rounded-lg md:rounded-xl p-2.5 md:p-4 shadow-md border ${isCompleted ? 'border-green-200' : isCurrent ? 'border-blue-300 shadow-lg' : 'border-gray-200'} transition-all`}>
                              <div className="flex items-start justify-between gap-2 md:gap-3 mb-1 md:mb-2">
                                <div className="flex-1">
                                  <h4 className={`font-bold text-xs md:text-base mb-0.5 md:mb-1 ${isCompleted ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-500'}`}>
                                    {step.title}
                                    {isCurrent && (
                                      <span className="ml-1 md:ml-2 inline-flex items-center px-1.5 md:px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] md:text-xs font-bold rounded-full animate-pulse">
                                        ACTIVE
                                      </span>
                                    )}
                                  </h4>
                                  <p className={`text-[10px] md:text-sm ${isCompleted || isCurrent ? 'text-gray-700' : 'text-gray-500'} hidden md:block`}>
                                    {step.description}
                                  </p>
                                </div>
                                {step.timestamp && (
                                  <div className="text-right">
                                    <p className="text-[9px] md:text-xs text-gray-500 font-semibold">
                                      {new Date(step.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                    </p>
                                  </div>
                                )}
                              </div>
                              
                              {showTrackingDetails && (isCompleted || isCurrent) && (
                                <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-200">
                                  <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs text-gray-600">
                                    <svg className="w-3 h-3 md:w-4 md:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {isCompleted && <span>Completed</span>}
                                    {isCurrent && <span>Est. 12-24 hours</span>}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Professional Track Order Section */}
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl md:rounded-2xl p-[2px] shadow-xl md:shadow-2xl">
                  <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5">
                    <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-black text-[#184979] text-xs md:text-sm">Tracking #</h4>
                        <div className="flex items-center gap-1 md:gap-2">
                          <p className="font-mono font-bold text-sm md:text-lg text-blue-600 truncate max-w-[150px] md:max-w-none">{order.trackingNumber}</p>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(order.trackingNumber || '');
                              alert('Tracking number copied!');
                            }}
                            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
                          >
                            <svg className="w-3 h-3 md:w-4 md:h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg md:rounded-xl p-2 md:p-3 border border-green-200">
                        <p className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Carrier</p>
                        <p className="font-bold text-green-700 text-xs md:text-base">{shippingDetails?.deliveryPartner || 'Standard'}</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg md:rounded-xl p-2 md:p-3 border border-blue-200">
                        <p className="text-[10px] md:text-xs text-gray-600 mb-0.5 md:mb-1">Delivery</p>
                        <p className="font-bold text-blue-700 text-xs md:text-base">{shippingDetails?.deliveryDays || '5-7'} days</p>
                      </div>
                    </div>

                    <button
                      onClick={handleTrackShipment}
                      className="w-full group flex items-center justify-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-lg md:rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all text-sm md:text-base"
                    >
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Track Shipment</span>
                      <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>

                    <div className="mt-2 md:mt-4 flex items-center justify-center gap-1 md:gap-2 text-[10px] md:text-xs text-gray-500">
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>SMS & Email updates</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl p-3 md:p-6 border border-white/50 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#f26322] rounded-lg md:rounded-xl blur-md opacity-50 hidden md:block"></div>
                  <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-black text-[#184979]">Order Items</h2>
                  <p className="text-[10px] md:text-sm text-gray-600">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                {order.items.map((item, idx) => (
                  <div key={`order-item-${idx}-${item._id}`} className="group relative bg-gradient-to-br from-gray-50 to-white rounded-xl md:rounded-2xl p-2.5 md:p-4 border border-gray-100 hover:border-[#f26322] transition-all hover:shadow-lg">
                    <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-[#184979] to-[#f26322] rounded-md md:rounded-lg flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-[10px] md:text-sm">{idx + 1}</span>
                    </div>
                    <div className="flex gap-2.5 md:gap-4 ml-5 md:ml-6">
                      <div className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0 rounded-lg md:rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group-hover:border-[#f26322] transition-all shadow-md">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="(max-width: 768px) 64px, 96px"
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[#184979] text-xs md:text-base mb-1 md:mb-2 line-clamp-2 group-hover:text-[#f26322] transition-colors">{item.name}</h3>
                        <div className="flex items-center justify-between flex-wrap gap-1 md:gap-3">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="flex items-center gap-1 md:gap-2 bg-blue-50 px-2 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg border border-blue-200">
                              <span className="text-[10px] md:text-xs text-gray-600 font-semibold">Qty:</span>
                              <span className="font-black text-[#184979] text-xs md:text-sm">{item.quantity}</span>
                            </div>
                            <div className="text-[10px] md:text-sm text-gray-500 hidden md:block">
                              ₹{item.price.toLocaleString()} each
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-sm md:text-xl bg-gradient-to-r from-[#f26322] to-[#ff7a45] bg-clip-text text-transparent">
                              ₹{(item.quantity * item.price).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl p-3 md:p-6 border border-blue-200 md:border-2 animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#184979] rounded-lg md:rounded-xl blur-md opacity-50 hidden md:block"></div>
                  <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#184979] to-[#1e5a8f] rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-black text-[#184979]">Shipping Address</h2>
                  <p className="text-[10px] md:text-sm text-gray-600 hidden md:block">Where we'll deliver your order</p>
                </div>
              </div>
              <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-5 shadow-md md:shadow-lg border border-blue-100">
                <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-4">
                  {order.shippingAddress.label && (
                    <span className="inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-4 py-1 md:py-1.5 bg-gradient-to-r from-[#184979] to-[#1e5a8f] text-white text-[10px] md:text-xs font-bold rounded-full shadow-md">
                      <svg className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {order.shippingAddress.label}
                    </span>
                  )}
                </div>
                <p className="font-black text-[#184979] text-sm md:text-lg mb-2 md:mb-3">{order.userInfo.fullName}</p>
                <div className="space-y-0.5 md:space-y-1.5 text-gray-700 text-xs md:text-base mb-2 md:mb-4">
                  <p className="flex items-start gap-1 md:gap-2">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0 mt-0.5 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>{order.shippingAddress.address}</span>
                  </p>
                  <p className="md:ml-7">
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                </div>
                <div className="pt-2 md:pt-4 border-t border-blue-100 space-y-1 md:space-y-2">
                  <p className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-600">
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-semibold">{order.userInfo.phone}</span>
                  </p>
                  <p className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-600">
                    <svg className="w-3 h-3 md:w-4 md:h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-semibold">{order.userInfo.email}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-4 md:space-y-6">
            {/* Order Summary */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl p-4 md:p-7 border border-white/50 lg:sticky lg:top-6 animate-slide-in-right">
              <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500 rounded-lg md:rounded-xl blur-md opacity-50 hidden md:block"></div>
                  <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg md:text-2xl font-black text-[#184979]">Order Summary</h2>
                  <p className="text-[10px] md:text-xs text-gray-600 hidden md:block">Price breakdown</p>
                </div>
              </div>

              <div className="space-y-2 md:space-y-4 mb-3 md:mb-5">
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl md:rounded-2xl p-3 md:p-4 border border-gray-100">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-gray-600 text-xs md:text-sm">Items</span>
                      <div className="flex items-center gap-1.5 md:gap-2 mt-0.5 md:mt-1">
                        <span className="inline-flex items-center justify-center w-5 h-5 md:w-6 md:h-6 bg-[#184979] text-white text-[10px] md:text-xs font-bold rounded-full">
                          {order.items.reduce((acc, item) => acc + item.quantity, 0)}
                        </span>
                        <span className="text-[10px] md:text-xs text-gray-500">products</span>
                      </div>
                    </div>
                    <span className="font-black text-base md:text-xl text-[#184979]">₹{order.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl md:rounded-2xl p-3 md:p-4 border border-green-200">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700 font-semibold text-xs md:text-sm">Delivery</span>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      <span className="line-through text-gray-400 text-[10px] md:text-sm font-medium">₹99</span>
                      <span className="bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-full font-black shadow-md">
                        FREE
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] md:text-xs text-green-700 mt-1 md:mt-2 font-semibold">🎉 Saved ₹99!</p>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-gray-200 pt-3 md:pt-5 mb-4 md:mb-6">
                <div className="bg-gradient-to-br from-orange-50 to-pink-50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-orange-200">
                  <div className="flex justify-between items-center mb-1 md:mb-2">
                    <span className="text-gray-700 font-bold text-xs md:text-sm">Total</span>
                    <div className="text-right">
                      <p className="text-xl md:text-3xl font-black bg-gradient-to-r from-[#f26322] via-[#ff7a45] to-[#ff8c5f] bg-clip-text text-transparent">
                        ₹{order.total.toLocaleString()}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-500">Incl. taxes</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-purple-200 shadow-md md:shadow-lg mb-3 md:mb-4">
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                    {order.paymentMethod === 'online' ? (
                      <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="font-black text-[#184979] text-xs md:text-sm">Payment</span>
                    <div className="flex items-center gap-1 md:gap-1.5 mt-0.5 md:mt-1">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-green-700 text-[10px] md:text-xs font-bold">
                        {order.paymentMethod === 'cod' ? 'COD' : 'Paid'}
                      </p>
                    </div>
                  </div>
                </div>
                {order.paymentMethod === 'cod' && (
                  <p className="text-[10px] md:text-xs text-gray-600 bg-white/70 rounded-lg p-1.5 md:p-2 border border-gray-200">
                    💵 Pay on delivery
                  </p>
                )}
                {order.paymentMethod === 'online' && (
                  <p className="text-[10px] md:text-xs text-gray-600 bg-white/70 rounded-lg p-1.5 md:p-2 border border-gray-200">
                    ✅ Payment done
                  </p>
                )}
              </div>

              {/* Order Status */}
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-xl md:rounded-2xl p-3 md:p-5 border border-orange-200 shadow-md md:shadow-lg">
                <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                  <div className="relative w-8 h-8 md:w-10 md:h-10">
                    <div className="absolute inset-0 bg-orange-500 rounded-full blur-md opacity-40 animate-pulse hidden md:block"></div>
                    <div className="relative w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <span className="font-black text-orange-800 text-xs md:text-sm">Status</span>
                    <div className="flex items-center gap-1 md:gap-1.5 mt-0.5 md:mt-1">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-orange-500 rounded-full animate-pulse"></div>
                      <p className="text-orange-700 text-[10px] md:text-xs font-bold">Confirmed</p>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] md:text-xs text-gray-600 bg-white/70 rounded-lg p-1.5 md:p-2 border border-orange-200">
                  📦 Being prepared
                </p>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl md:rounded-3xl shadow-lg md:shadow-xl p-3 md:p-6 border border-purple-200 md:border-2 animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500 rounded-lg md:rounded-xl blur-md opacity-50 hidden md:block"></div>
                  <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg md:text-2xl font-black text-[#184979]">Need Help?</h3>
                  <p className="text-[10px] md:text-xs text-gray-600 hidden md:block">We're here to assist you</p>
                </div>
              </div>
              <div className="space-y-2 md:space-y-3">
                <a 
                  href="mailto:support@grabora.com" 
                  className="group flex items-center gap-2 md:gap-3 bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-2.5 md:p-4 border border-gray-100 hover:border-purple-300 transition-all hover:shadow-lg"
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] md:text-xs text-gray-600 font-semibold">Email</p>
                    <p className="font-bold text-[#184979] text-xs md:text-base truncate">support@grabora.com</p>
                  </div>
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                <a 
                  href="tel:1800-123-4567" 
                  className="group flex items-center gap-2 md:gap-3 bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-2.5 md:p-4 border border-gray-100 hover:border-green-300 transition-all hover:shadow-lg"
                >
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md">
                    <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] md:text-xs text-gray-600 font-semibold">Call (Toll-Free)</p>
                    <p className="font-bold text-[#184979] text-xs md:text-base">1800-123-4567</p>
                  </div>
                  <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl md:rounded-2xl p-2.5 md:p-4 border border-gray-100">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                      <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] md:text-xs text-gray-600 font-semibold mb-0.5 md:mb-1">Support Hours</p>
                      <p className="text-xs md:text-sm font-bold text-[#184979]">Mon-Sat: 9AM-6PM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 p-3 md:hidden z-50 shadow-2xl">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white rounded-xl font-bold shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#f26322] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#184979] font-semibold">Loading...</p>
        </div>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}
