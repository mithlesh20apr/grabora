'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, Wallet, WalletTransaction, Settlement, TransactionFilters, EarningsSummary } from '@/contexts/SellerContext';
import toast from 'react-hot-toast';
import { useSellerActivationStatus } from '@/hooks/useSellerActivationStatus';

export default function SellerPaymentsPage() {
  const router = useRouter();
  const {
    seller,
    isAuthenticated,
    isLoading: authLoading,
    isApproved,
    getWallet,
    getTransactions,
    getSettlements,
    getEarningsSummary,
    requestWithdrawal
  } = useSeller();
  const { status: activationStatus } = useSellerActivationStatus();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'settlements'>('overview');
  const [transactionFilters, setTransactionFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 20,
  });
  const [totalPages, setTotalPages] = useState(1);
  
  // Withdrawal modal
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const fetchWallet = useCallback(async () => {
    const result = await getWallet();
    if (result) {
      setWallet(result);
    }
  }, [getWallet]);

  const fetchTransactions = useCallback(async () => {
    const result = await getTransactions(transactionFilters);
    if (result) {
      setTransactions(result.transactions || []);
      setTotalPages(result.pagination?.totalPages || 1);
    }
  }, [getTransactions, transactionFilters]);

  const fetchSettlements = useCallback(async () => {
    const result = await getSettlements({ page: 1, limit: 20 });
    if (result) {
      setSettlements(result.settlements);
    }
  }, [getSettlements]);

  const fetchEarningsSummary = useCallback(async () => {
    const result = await getEarningsSummary('month');
    if (result) {
      setEarningsSummary(result);
    }
  }, [getEarningsSummary]);

  useEffect(() => {
    // Check if token exists in sessionStorage
    const hasToken = typeof window !== 'undefined' ? !!sessionStorage.getItem('sellerToken') : false;

    // Debug logging
    console.log('🔍 Payments Auth Check:', {
      authLoading,
      isAuthenticated,
      hasToken,
      seller: seller?.email
    });

    // Only redirect if: auth is NOT loading, user is NOT authenticated, AND no token in storage
    if (!authLoading && !isAuthenticated && !hasToken) {
      console.warn('⚠️ Redirecting to login from payments page');
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, seller, router]);

  useEffect(() => {
    if (isAuthenticated && isApproved) {
      const fetchAll = async () => {
        setIsLoading(true);
        await Promise.all([
          fetchWallet(),
          fetchTransactions(),
          fetchSettlements(),
          fetchEarningsSummary()
        ]);
        setIsLoading(false);
      };
      fetchAll();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isApproved]);

  useEffect(() => {
    if (isAuthenticated && isApproved && activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [isAuthenticated, isApproved, activeTab, transactionFilters, fetchTransactions]);

  const handleWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (wallet && amount > wallet.availableBalance) {
      toast.error('Insufficient balance');
      return;
    }
    if (amount < (wallet?.minimumWithdrawal || 100)) {
      toast.error(`Minimum withdrawal amount is ₹${wallet?.minimumWithdrawal || 100}`);
      return;
    }
    if (!seller?.bankDetails?.accountNumber) {
      toast.error('Please add bank details first');
      return;
    }

    setWithdrawLoading(true);
    // Using seller ID as bank account reference since we have bank details in seller profile
    const result = await requestWithdrawal(amount, seller._id);
    
    if (result.success) {
      toast.success(result.message || 'Withdrawal request submitted');
      setWithdrawModal(false);
      setWithdrawAmount('');
      fetchWallet();
    } else {
      toast.error(result.message);
    }
    
    setWithdrawLoading(false);
  };

  // Don't render PageLoader to avoid hydration mismatch
  // The useEffect will handle redirects
  if (authLoading || isLoading) {
    return null;
  }

  if (!isAuthenticated || !isApproved) {
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
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'credit': return 'Credit';
      case 'debit': return 'Debit';
      case 'withdrawal': return 'Withdrawal';
      case 'refund': return 'Refund';
      case 'commission': return 'Commission';
      case 'adjustment': return 'Adjustment';
      case 'bonus': return 'Bonus';
      case 'penalty': return 'Penalty';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Completed</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      case 'failed':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Failed</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getSettlementStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Paid</span>;
      case 'processing':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Processing</span>;
      case 'pending':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments & Earnings</h1>
            <p className="text-gray-500 mt-1">Track your earnings and payment history</p>
          </div>
          <button
            onClick={() => setWithdrawModal(true)}
            disabled={!wallet || wallet.availableBalance < (wallet?.minimumWithdrawal || 100)}
            className="px-4 py-2 bg-[#f26322] text-white rounded-xl hover:bg-[#e05512] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Request Withdrawal
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Available</span>
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(wallet?.availableBalance || 0)}</p>
            <p className="text-white/80 text-sm">Wallet Balance</p>
          </div>

          <div className="bg-gradient-to-br from-[#f26322] to-[#f5833c] rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Processing</span>
            </div>
            <p className="text-3xl font-bold mb-1">{formatCurrency(wallet?.pendingSettlement || 0)}</p>
            <p className="text-white/80 text-sm">Pending Settlement</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-800 mb-1">{formatCurrency(earningsSummary?.periodStats?.earnings || 0)}</p>
            <p className="text-gray-500 text-sm">This Month Earnings</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className="text-xl font-bold text-gray-800 mb-1">{earningsSummary?.periodStats?.deliveredOrders || 0}</p>
            <p className="text-gray-500 text-sm">Delivered Orders</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6">
          <div className="flex border-b border-gray-100">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'transactions', label: 'Transactions', icon: '💳' },
              { id: 'settlements', label: 'Settlements', icon: '🏦' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-[#f26322] border-[#f26322]'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Earnings Summary */}
                {earningsSummary && earningsSummary.wallet && earningsSummary.periodStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Period Earnings</p>
                      <p className="text-xl font-bold text-gray-800">{formatCurrency(earningsSummary.periodStats.earnings)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Total Wallet Earnings</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(earningsSummary.wallet.totalEarnings)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Current Balance</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(earningsSummary.wallet.currentBalance)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 mb-1">Total Withdrawn</p>
                      <p className="text-xl font-bold text-gray-600">{formatCurrency(earningsSummary.wallet.totalWithdrawn)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No earnings data yet</h3>
                    <p className="text-gray-500">Start selling to see your earnings analytics</p>
                  </div>
                )}

                {/* Recent Transactions */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-800">Recent Transactions</h3>
                    <button 
                      onClick={() => setActiveTab('transactions')}
                      className="text-sm text-[#f26322] hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  {transactions.slice(0, 5).length > 0 ? (
                    <div className="space-y-3">
                      {transactions.slice(0, 5).map((txn) => (
                        <div key={txn._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              txn.type === 'credit' || txn.type === 'bonus' ? 'bg-green-100' :
                              txn.type === 'debit' || txn.type === 'commission' || txn.type === 'penalty' ? 'bg-red-100' :
                              txn.type === 'withdrawal' ? 'bg-blue-100' :
                              'bg-gray-100'
                            }`}>
                              {txn.type === 'credit' || txn.type === 'bonus' ? (
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              ) : txn.type === 'debit' || txn.type === 'commission' || txn.type === 'penalty' ? (
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{getTransactionTypeLabel(txn.type)}</p>
                              <p className="text-sm text-gray-500">{formatDate(txn.createdAt)}</p>
                            </div>
                          </div>
                          <p className={`font-semibold ${txn.type === 'debit' || txn.type === 'commission' || txn.type === 'withdrawal' || txn.type === 'penalty' ? 'text-red-600' : 'text-green-600'}`}>
                            {txn.type === 'debit' || txn.type === 'commission' || txn.type === 'withdrawal' || txn.type === 'penalty' ? '-' : '+'}{formatCurrency(txn.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No recent transactions
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div>
                {/* Filters */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <select
                      value={transactionFilters.type || ''}
                      onChange={(e) => setTransactionFilters(prev => ({ 
                        ...prev, 
                        type: e.target.value as TransactionFilters['type'] || undefined,
                        page: 1 
                      }))}
                      className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none bg-white"
                    >
                      <option value="">All Types</option>
                      <option value="credit">Credit</option>
                      <option value="debit">Debit</option>
                      <option value="withdrawal">Withdrawals</option>
                      <option value="commission">Commission</option>
                      <option value="refund">Refunds</option>
                      <option value="bonus">Bonus</option>
                    </select>
                    <select
                      value={transactionFilters.status || ''}
                      onChange={(e) => setTransactionFilters(prev => ({ 
                        ...prev, 
                        status: e.target.value as TransactionFilters['status'] || undefined,
                        page: 1 
                      }))}
                      className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none bg-white"
                    >
                      <option value="">All Status</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No transactions yet</h3>
                    <p className="text-gray-500">Transactions will appear here once you start receiving orders</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Reference</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {transactions.map((txn) => (
                            <tr key={txn._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-800">{getTransactionTypeLabel(txn.type)}</td>
                              <td className="px-4 py-3 text-gray-600 font-mono text-sm">
                                {txn.transactionId || txn.orderId || '-'}
                              </td>
                              <td className="px-4 py-3 text-gray-600">{formatDate(txn.createdAt)}</td>
                              <td className={`px-4 py-3 text-right font-medium ${
                                txn.type === 'debit' || txn.type === 'commission' || txn.type === 'withdrawal' || txn.type === 'penalty' ? 'text-red-600' : 'text-green-600'
                              }`}>
                                {txn.type === 'debit' || txn.type === 'commission' || txn.type === 'withdrawal' || txn.type === 'penalty' ? '-' : '+'}{formatCurrency(txn.amount)}
                              </td>
                              <td className="px-4 py-3">{getTransactionStatusBadge(txn.status)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-6">
                        <button
                          onClick={() => setTransactionFilters(prev => ({ ...prev, page: (prev.page || 1) - 1 }))}
                          disabled={(transactionFilters.page || 1) === 1}
                          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-500">
                          Page {transactionFilters.page || 1} of {totalPages}
                        </span>
                        <button
                          onClick={() => setTransactionFilters(prev => ({ ...prev, page: (prev.page || 1) + 1 }))}
                          disabled={(transactionFilters.page || 1) === totalPages}
                          className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'settlements' && (
              <div>
                {settlements.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">No settlements yet</h3>
                    <p className="text-gray-500 mb-4">Settlements are processed based on your selling activity</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Minimum payout amount: ₹100
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Settlement ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Period</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Orders</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Paid On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {settlements.map((settlement) => (
                          <tr key={settlement._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-800 font-mono text-sm">
                              #{settlement._id.slice(-8).toUpperCase()}
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-sm">
                              {formatDate(settlement.periodStart)} - {formatDate(settlement.periodEnd)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-green-600">
                              {formatCurrency(settlement.netAmount)}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">{settlement.orderCount}</td>
                            <td className="px-4 py-3">{getSettlementStatusBadge(settlement.status)}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {settlement.paidAt ? formatDate(settlement.paidAt) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bank Details Card */}
        <div className={`bg-white rounded-2xl shadow-sm border p-6 ${
          activationStatus && !activationStatus.isActive && activationStatus.reason === 'PAYMENT_NOT_ENABLED'
            ? 'border-amber-300 ring-4 ring-amber-100'
            : 'border-gray-100'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Bank Account Details</h3>
            <Link href="/seller/profile?tab=bank" className="text-sm text-[#f26322] hover:underline">
              Update
            </Link>
          </div>

          {/* Helper text when payment not enabled */}
          {activationStatus && !activationStatus.isActive && activationStatus.reason === 'PAYMENT_NOT_ENABLED' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-800">
                  Add bank details to start receiving payouts.
                </p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">{seller?.bankDetails?.bankName || 'No bank account linked'}</p>
                <p className="text-sm text-gray-500">
                  {seller?.bankDetails?.accountNumber
                    ? `****${seller.bankDetails.accountNumber.slice(-4)}`
                    : 'Add your bank details to receive payouts'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Withdrawal Modal */}
      {withdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Withdrawal</h3>
            
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Available Balance</span>
                <span className="text-xl font-bold text-green-600">{formatCurrency(wallet?.availableBalance || 0)}</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Withdrawal Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  min={wallet?.minimumWithdrawal || 100}
                  max={wallet?.availableBalance || 0}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">Minimum withdrawal: ₹100</p>
            </div>

            {seller?.bankDetails?.bankName ? (
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-800 font-medium mb-1">Bank Account</p>
                <p className="text-sm text-blue-600">
                  {seller.bankDetails.bankName} - ****{seller.bankDetails.accountNumber?.slice(-4)}
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  Please add your bank details in profile settings to receive withdrawals.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setWithdrawModal(false);
                  setWithdrawAmount('');
                }}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawal}
                disabled={withdrawLoading || !seller?.bankDetails?.bankName}
                className="flex-1 px-4 py-2.5 bg-[#f26322] text-white rounded-xl hover:bg-[#e05512] font-medium disabled:opacity-50"
              >
                {withdrawLoading ? 'Processing...' : 'Request Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
