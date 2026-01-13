'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, Order, OrderFilters } from '@/contexts/SellerContext';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/Loader';

export default function SellerOrdersPage() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    isApproved, 
    getOrders, 
    updateOrderStatus, 
    shipOrder 
  } = useSeller();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shipModal, setShipModal] = useState<{ orderId: string; open: boolean } | null>(null);
  const [shipData, setShipData] = useState({ trackingNumber: '', shippingProvider: '' });

  // Status counts for tabs
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    confirmed: 0,
    packed: 0,
    shipped: 0,
    delivered: 0,
  });

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    
    const filters: OrderFilters = {
      page: currentPage,
      limit: 10,
    };

    if (statusFilter && statusFilter !== '') {
      filters.status = statusFilter as Order['status'];
    }

    if (searchQuery) {
      filters.search = searchQuery;
    }

    switch (sortBy) {
      case 'newest':
        filters.sortBy = 'createdAt';
        filters.sortOrder = 'desc';
        break;
      case 'oldest':
        filters.sortBy = 'createdAt';
        filters.sortOrder = 'asc';
        break;
      case 'amount_high':
        filters.sortBy = 'totalAmount';
        filters.sortOrder = 'desc';
        break;
      case 'amount_low':
        filters.sortBy = 'totalAmount';
        filters.sortOrder = 'asc';
        break;
    }

    const result = await getOrders(filters);

    if (result && result.orders) {
      setOrders(result.orders);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotalOrders(result.pagination?.total || 0);

      // Update status counts (you might want to get these from a separate API)
      const counts = {
        all: result.pagination?.total || 0,
        pending: result.orders.filter(o => o.status === 'pending').length,
        confirmed: result.orders.filter(o => o.status === 'confirmed').length,
        packed: result.orders.filter(o => o.status === 'packed').length,
        shipped: result.orders.filter(o => o.status === 'shipped').length,
        delivered: result.orders.filter(o => o.status === 'delivered').length,
      };
      setStatusCounts(counts);
    } else {
      setOrders([]);
      setTotalPages(1);
      setTotalOrders(0);
    }
    
    setIsLoading(false);
  }, [currentPage, statusFilter, searchQuery, sortBy, getOrders]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && isApproved) {
      fetchOrders();
    }
  }, [isAuthenticated, isApproved, fetchOrders]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && isApproved) {
        setCurrentPage(1);
        fetchOrders();
      }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleStatusUpdate = async (orderId: string, newStatus: 'confirmed' | 'packed' | 'shipped' | 'cancelled') => {
    setActionLoading(orderId);
    
    const result = await updateOrderStatus(orderId, { status: newStatus });
    
    if (result.success) {
      toast.success(`Order ${newStatus}`);
      fetchOrders();
    } else {
      toast.error(result.message);
    }
    
    setActionLoading(null);
  };

  const handleShipOrder = async () => {
    if (!shipModal || !shipData.trackingNumber || !shipData.shippingProvider) {
      toast.error('Please fill all shipping details');
      return;
    }

    setActionLoading(shipModal.orderId);
    
    const result = await shipOrder(shipModal.orderId, shipData);
    
    if (result.success) {
      toast.success('Order marked as shipped');
      setShipModal(null);
      setShipData({ trackingNumber: '', shippingProvider: '' });
      fetchOrders();
    } else {
      toast.error(result.message);
    }
    
    setActionLoading(null);
  };

  if (authLoading || (isLoading && orders.length === 0)) {
    return <PageLoader message="Loading orders..." />;
  }

  if (!isAuthenticated || !isApproved) {
    return null;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      packed: 'bg-purple-100 text-purple-700',
      shipped: 'bg-indigo-100 text-indigo-700',
      delivered: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      returned: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getNextAction = (status: string): { label: string; status: 'confirmed' | 'packed' | 'shipped'; color: string } | null => {
    switch (status) {
      case 'pending':
        return { label: 'Accept Order', status: 'confirmed', color: 'bg-[#f26322] hover:bg-[#e05512]' };
      case 'confirmed':
        return { label: 'Mark Packed', status: 'packed', color: 'bg-purple-600 hover:bg-purple-700' };
      case 'packed':
        return { label: 'Ship Order', status: 'shipped', color: 'bg-indigo-600 hover:bg-indigo-700' };
      default:
        return null;
    }
  };

  const statusTabs = [
    { id: '', label: 'All Orders', count: statusCounts.all },
    { id: 'pending', label: 'Pending', count: statusCounts.pending },
    { id: 'confirmed', label: 'Confirmed', count: statusCounts.confirmed },
    { id: 'packed', label: 'Packed', count: statusCounts.packed },
    { id: 'shipped', label: 'Shipped', count: statusCounts.shipped },
    { id: 'delivered', label: 'Delivered', count: statusCounts.delivered },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/seller/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Dashboard</span>
              </Link>
            </div>
            <Link href="/">
              <Image src="/logo/logo.svg" alt="Grabora" width={120} height={35} className="h-8 w-auto" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-500 mt-1">
              {totalOrders > 0 ? `${totalOrders} total orders` : 'Manage and track your orders'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading && (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-[#f26322]"></div>
            )}
          </div>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex overflow-x-auto">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap border-b-2 transition-colors ${
                  statusFilter === tab.id
                    ? 'text-[#f26322] border-[#f26322]'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    statusFilter === tab.id ? 'bg-[#f26322] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by Order ID, Customer name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] focus:border-transparent outline-none"
              />
            </div>
            <select 
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount_high">Amount: High to Low</option>
              <option value="amount_low">Amount: Low to High</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 && !isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {statusFilter || searchQuery 
                ? 'Try adjusting your filters' 
                : 'Orders will appear here once customers start buying your products'}
            </p>
            <Link
              href="/seller/products"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f26322] to-[#f5833c] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-200 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Manage Products
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">#{order.orderId}</span>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </span>
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            order.paymentStatus === 'paid' 
                              ? 'bg-green-100 text-green-700' 
                              : order.paymentStatus === 'failed'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link 
                        href={`/seller/orders/${order._id}`}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                      >
                        View Details
                      </Link>
                      {getNextAction(order.status) && (
                        order.status === 'packed' ? (
                          <button 
                            onClick={() => setShipModal({ orderId: order._id, open: true })}
                            disabled={actionLoading === order._id}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${getNextAction(order.status)!.color} disabled:opacity-50`}
                          >
                            {actionLoading === order._id ? 'Processing...' : getNextAction(order.status)!.label}
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleStatusUpdate(order._id, getNextAction(order.status)!.status)}
                            disabled={actionLoading === order._id}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${getNextAction(order.status)!.color} disabled:opacity-50`}
                          >
                            {actionLoading === order._id ? 'Processing...' : getNextAction(order.status)!.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4">
                      <div className="flex -space-x-2">
                        {order.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="w-10 h-10 bg-gray-100 rounded-lg border-2 border-white overflow-hidden">
                            {item.image ? (
                              <Image src={item.image} alt={item.title} width={40} height={40} className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                {item.title.charAt(0)}
                              </div>
                            )}
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="w-10 h-10 bg-gray-200 rounded-lg border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                            +{order.items.length - 3}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                        <p className="text-sm text-gray-500">{order.userId?.name || 'Customer'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Delivery</p>
                        <p className="font-medium text-gray-800">{order.address?.city}, {order.address?.state}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Amount</p>
                        <p className="font-bold text-gray-800">₹{order.totalAmount?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tracking Info */}
                  {order.fulfillment?.trackingId && (
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-gray-500">Tracking:</span>
                      <span className="font-medium text-gray-800">{order.fulfillment.trackingId}</span>
                      <span className="text-gray-400">|</span>
                      <span className="text-gray-500">{order.fulfillment.carrier}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-4">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalOrders)} of {totalOrders} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-[#f26322] text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Ship Order Modal */}
      {shipModal?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Ship Order</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Provider *</label>
                <select
                  value={shipData.shippingProvider}
                  onChange={(e) => setShipData(prev => ({ ...prev, shippingProvider: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none bg-white"
                >
                  <option value="">Select provider</option>
                  <option value="delhivery">Delhivery</option>
                  <option value="bluedart">BlueDart</option>
                  <option value="dtdc">DTDC</option>
                  <option value="ecom_express">Ecom Express</option>
                  <option value="india_post">India Post</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tracking Number *</label>
                <input
                  type="text"
                  value={shipData.trackingNumber}
                  onChange={(e) => setShipData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="Enter tracking number"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  setShipModal(null);
                  setShipData({ trackingNumber: '', shippingProvider: '' });
                }}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleShipOrder}
                disabled={actionLoading !== null}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Confirm Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
