'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, Settlement } from '@/contexts/SellerContext';
import toast from 'react-hot-toast';

export default function SettlementDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isApproved, getSettlement } = useSeller();
  
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchSettlement = async () => {
      if (isAuthenticated && isApproved && resolvedParams.id) {
        setIsLoading(true);
        const settlementData = await getSettlement(resolvedParams.id);
        if (settlementData) {
          setSettlement(settlementData);
        } else {
          toast.error('Settlement not found');
          router.push('/seller/payments');
        }
        setIsLoading(false);
      }
    };

    fetchSettlement();
  }, [isAuthenticated, isApproved, resolvedParams.id, getSettlement, router]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f26322] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settlement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isApproved || !settlement) {
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

  const getStatusBadge = (status: Settlement['status']) => {
    const statusConfig: Record<Settlement['status'], { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
      failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/seller/payments" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Payments</span>
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
            <h1 className="text-2xl font-bold text-gray-900">
              Settlement #{settlement.settlementId || settlement._id.slice(-8).toUpperCase()}
            </h1>
            <p className="text-gray-500 mt-1">Created on {formatDate(settlement.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(settlement.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settlement Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Amount Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Settlement Amount</h3>
              <div className="text-center py-6">
                <p className="text-4xl font-bold text-gray-900">{formatCurrency(settlement.netAmount)}</p>
                <p className="text-gray-500 mt-2">Net Settlement Amount</p>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Gross Amount</p>
                  <p className="font-semibold text-gray-800">{formatCurrency(settlement.grossAmount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Commission</p>
                  <p className="font-semibold text-red-600">-{formatCurrency(settlement.commission)}</p>
                </div>
                {settlement.tds !== undefined && settlement.tds > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-gray-500">TDS</p>
                    <p className="font-semibold text-red-600">-{formatCurrency(settlement.tds)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Period Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Settlement Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">From</p>
                  <p className="font-semibold text-gray-800">{formatDate(settlement.periodStart)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-500">To</p>
                  <p className="font-semibold text-gray-800">{formatDate(settlement.periodEnd)}</p>
                </div>
              </div>
            </div>

            {/* Orders in Settlement */}
            {settlement.orderItems && settlement.orderItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Orders in Settlement ({settlement.orderCount})
                </h3>
                <div className="space-y-3">
                  {settlement.orderItems.map((order, index) => (
                    <Link
                      key={index}
                      href={`/seller/orders/${order.orderId}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <span className="font-mono text-gray-700">
                          #{order.orderNumber || order.orderId.slice(-8).toUpperCase()}
                        </span>
                        <p className="text-sm text-gray-500">
                          Order: {formatCurrency(order.orderAmount)} | Net: {formatCurrency(order.netAmount)}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Settlement Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Settlement Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Settlement ID</span>
                  <span className="font-mono text-gray-800 text-sm">
                    {settlement.settlementId || settlement._id.slice(-12).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  {getStatusBadge(settlement.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Created</span>
                  <span className="text-gray-800">{formatDate(settlement.createdAt)}</span>
                </div>
                {settlement.paidAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Paid At</span>
                    <span className="text-gray-800">{formatDate(settlement.paidAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Bank Transfer Details</h3>
              <div className="space-y-3">
                {settlement.transactionId && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Transaction ID</span>
                    <span className="font-mono text-gray-800">{settlement.transactionId}</span>
                  </div>
                )}
                {settlement.bankDetails && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Bank</span>
                      <span className="text-gray-800">{settlement.bankDetails.bankName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Account</span>
                      <span className="font-mono text-gray-800">
                        ****{settlement.bankDetails.accountNumber.slice(-4)}
                      </span>
                    </div>
                  </>
                )}
                {!settlement.transactionId && settlement.status === 'pending' && (
                  <p className="text-gray-500 text-sm">
                    Bank transfer details will be available once the settlement is processed.
                  </p>
                )}
                {!settlement.transactionId && settlement.status === 'processing' && (
                  <p className="text-blue-600 text-sm">
                    Settlement is being processed. Transaction ID will be updated shortly.
                  </p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Timeline</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-1.5 bg-gray-300" />
                  <div>
                    <p className="font-medium text-gray-800">Settlement Created</p>
                    <p className="text-sm text-gray-500">{formatDate(settlement.createdAt)}</p>
                  </div>
                </div>
                {settlement.status !== 'pending' && (
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      settlement.status === 'completed' ? 'bg-green-500' :
                      settlement.status === 'failed' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-800 capitalize">{settlement.status}</p>
                      <p className="text-sm text-gray-500">
                        {settlement.paidAt ? formatDate(settlement.paidAt) : 'In progress'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
