'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, Order } from '@/contexts/SellerContext';
import toast from 'react-hot-toast';

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isApproved, getOrder, updateOrderStatus, shipOrder } = useSeller();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Ship modal state
  const [showShipModal, setShowShipModal] = useState(false);
  const [shipDetails, setShipDetails] = useState({
    trackingNumber: '',
    shippingProvider: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (isAuthenticated && isApproved && resolvedParams.id) {
        setIsLoading(true);
        const orderData = await getOrder(resolvedParams.id);
        if (orderData) {
          setOrder(orderData);
        } else {
          toast.error('Order not found');
          router.push('/seller/orders');
        }
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [isAuthenticated, isApproved, resolvedParams.id, getOrder, router]);

  const handleStatusUpdate = async (newStatus: 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled') => {
    if (!order) return;
    
    setActionLoading(true);
    const result = await updateOrderStatus(order._id, { status: newStatus });
    
    if (result.success) {
      toast.success(`Order ${newStatus}`);
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
    } else {
      toast.error(result.message);
    }
    setActionLoading(false);
  };

  const handleShipOrder = async () => {
    if (!order || !shipDetails.trackingNumber || !shipDetails.shippingProvider) {
      toast.error('Please fill tracking details');
      return;
    }
    
    setActionLoading(true);
    const result = await shipOrder(order._id, {
      trackingNumber: shipDetails.trackingNumber,
      shippingProvider: shipDetails.shippingProvider,
    });
    
    if (result.success) {
      toast.success('Order shipped');
      setShowShipModal(false);
      setOrder(prev => prev ? { 
        ...prev, 
        status: 'shipped',
        fulfillment: {
          ...prev.fulfillment,
          trackingId: shipDetails.trackingNumber,
          carrier: shipDetails.shippingProvider,
        }
      } : null);
    } else {
      toast.error(result.message);
    }
    setActionLoading(false);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f26322] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isApproved || !order) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: Order['status']) => {
    const statusConfig: Record<Order['status'], { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Confirmed' },
      packed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Packed' },
      shipped: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Shipped' },
      delivered: { bg: 'bg-green-100', text: 'text-green-700', label: 'Delivered' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
      returned: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Returned' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getAvailableActions = () => {
    const actions: { status: 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled'; label: string; color: string }[] = [];
    
    switch (order.status) {
      case 'pending':
        actions.push({ status: 'confirmed', label: 'Confirm Order', color: 'bg-blue-500 hover:bg-blue-600' });
        actions.push({ status: 'cancelled', label: 'Cancel', color: 'bg-red-500 hover:bg-red-600' });
        break;
      case 'confirmed':
        actions.push({ status: 'packed', label: 'Mark as Packed', color: 'bg-purple-500 hover:bg-purple-600' });
        actions.push({ status: 'cancelled', label: 'Cancel', color: 'bg-red-500 hover:bg-red-600' });
        break;
      case 'packed':
        // Ship action opens modal
        break;
      case 'shipped':
        actions.push({ status: 'delivered', label: 'Mark Delivered', color: 'bg-green-500 hover:bg-green-600' });
        break;
    }
    
    return actions;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/seller/orders" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Orders</span>
              </Link>
            </div>
            <Link href="/">
              <Image src="/logo/logo.svg" alt="Grabora" width={120} height={35} className="h-8 w-auto" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.orderId || order._id.slice(-8).toUpperCase()}</h1>
            <p className="text-gray-500 mt-1">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(order.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <Image 
                          src={item.image} 
                          alt={item.title || 'Product'} 
                          width={64} 
                          height={64} 
                          className="object-cover w-full h-full" 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">
                          {(item.title || 'P').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 truncate">{item.title || 'Product'}</h4>
                      <p className="text-sm text-gray-500">SKU: {item.sku || '-'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-600">Qty: {item.qty}</span>
                        <span className="text-sm text-gray-600">@ {formatCurrency(item.unitPrice)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipping Address</h3>
              {order.address ? (
                <div className="text-gray-600">
                  <p className="font-medium text-gray-800">{order.address.name}</p>
                  <p>{order.address.line1}</p>
                  {order.address.line2 && <p>{order.address.line2}</p>}
                  <p>
                    {order.address.city}, {order.address.state} {order.address.pincode}
                  </p>
                  {order.address.phone && (
                    <p className="mt-2">
                      <span className="text-gray-500">Phone:</span> {order.address.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No shipping address provided</p>
              )}
            </div>

            {/* Tracking Info */}
            {(order.status === 'shipped' || order.status === 'delivered') && order.fulfillment && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Tracking Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Carrier</span>
                    <span className="font-medium text-gray-800">{order.fulfillment.carrier || order.shippingProvider || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Tracking Number</span>
                    <span className="font-mono text-gray-800">{order.fulfillment.trackingId || order.trackingNumber || '-'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal || order.totalAmount)}</span>
                </div>
                {order.shippingCharges !== undefined && (
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>{order.shippingCharges === 0 ? 'Free' : formatCurrency(order.shippingCharges)}</span>
                  </div>
                )}
                {order.discount !== undefined && order.discount > 0 && (
                  <div className="flex items-center justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">Total</span>
                    <span className="text-xl font-bold text-gray-800">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                    order.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    order.paymentStatus === 'refunded' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'returned' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
                <div className="space-y-3">
                  {order.status === 'packed' && (
                    <button
                      onClick={() => setShowShipModal(true)}
                      disabled={actionLoading}
                      className="w-full px-4 py-2.5 bg-[#f26322] text-white rounded-xl hover:bg-[#e05512] font-medium disabled:opacity-50"
                    >
                      Ship Order
                    </button>
                  )}
                  
                  {getAvailableActions().map((action) => (
                    <button
                      key={action.status}
                      onClick={() => handleStatusUpdate(action.status)}
                      disabled={actionLoading}
                      className={`w-full px-4 py-2.5 text-white rounded-xl font-medium disabled:opacity-50 ${action.color}`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Timeline</h3>
              <div className="space-y-4">
                {order.statusHistory && order.statusHistory.length > 0 ? (
                  order.statusHistory.map((history, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${
                        index === 0 ? 'bg-[#f26322]' : 'bg-gray-300'
                      }`} />
                      <div>
                        <p className="font-medium text-gray-800 capitalize">{history.status}</p>
                        <p className="text-sm text-gray-500">{formatDate(history.timestamp)}</p>
                        {history.notes && <p className="text-sm text-gray-600 mt-1">{history.notes}</p>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-3 h-3 rounded-full mt-1.5 bg-[#f26322]" />
                    <div>
                      <p className="font-medium text-gray-800 capitalize">{order.status}</p>
                      <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Ship Modal */}
      {showShipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ship Order</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tracking Number *</label>
                <input
                  type="text"
                  value={shipDetails.trackingNumber}
                  onChange={(e) => setShipDetails(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="e.g., AWB123456789"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Provider *</label>
                <select
                  value={shipDetails.shippingProvider}
                  onChange={(e) => setShipDetails(prev => ({ ...prev, shippingProvider: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none bg-white"
                >
                  <option value="">Select provider</option>
                  <option value="Blue Dart">Blue Dart</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="DTDC">DTDC</option>
                  <option value="Ekart">Ekart</option>
                  <option value="FedEx">FedEx</option>
                  <option value="India Post">India Post</option>
                  <option value="XpressBees">XpressBees</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowShipModal(false)}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleShipOrder}
                disabled={actionLoading || !shipDetails.trackingNumber || !shipDetails.shippingProvider}
                className="flex-1 px-4 py-2.5 bg-[#f26322] text-white rounded-xl hover:bg-[#e05512] font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Shipping...' : 'Ship Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
