
'use client';
import OnboardingCard from '@/components/seller/OnboardingCard';

import { useState, useEffect } from 'react';
import { useSellerOnboardingStatus } from '@/hooks/useSellerOnboardingStatus';
import { useSellerActivationStatus } from '@/hooks/useSellerActivationStatus';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSeller } from '@/contexts/SellerContext';
import { PageLoader } from '@/components/ui/Loader';

interface DashboardMetrics {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  thisMonthRevenue: number;
  averageRating: number;
  totalReviews: number;
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  returnRate: number;
  onTimeDeliveryRate: number;
}

interface Badge {
  type: string;
  name: string;
  awardedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export default function SellerDashboardPage() {
  const router = useRouter();
  const { seller, isAuthenticated, isLoading: authLoading, isApproved, logout, getDashboard } = useSeller();
  // Onboarding status hook at top level (fixes Rules of Hooks)
  const { status: onboardingStatus, loading: onboardingLoading, error: onboardingError } = useSellerOnboardingStatus();
  // Activation status for top banner
  const { status: activationStatus, loading: activationLoading, error: activationError } = useSellerActivationStatus();

  // Sidebar state for mobile/desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    let isMounted = true;
    
    const loadDashboard = async () => {
      if (isAuthenticated && isApproved) {
        const data = await getDashboard();
        if (isMounted && data) {
          setMetrics(data.seller?.metrics as DashboardMetrics);
          setBadges(data.seller?.activeBadges || data.seller?.badges || []);
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadDashboard();
    }
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isApproved]);


  if (authLoading || isLoading || activationLoading) {
    return <PageLoader message="Loading dashboard..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  // Pending Approval Screen
  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 max-w-md w-full text-center shadow-xl">
          <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Under Review</h1>
          <p className="text-gray-500 mb-6">
            Your seller account is being reviewed by our team. This usually takes 24-48 hours.
          </p>
          <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Current Status</p>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-amber-100 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              {seller?.status || 'Pending Approval'}
            </span>
          </div>
          <div className="space-y-3">
            <Link
              href="/seller/kyc"
              className="w-full flex items-center justify-center gap-2 bg-[#184979] hover:bg-[#0d2d4a] text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-[#184979]/25"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Complete KYC Documents
            </Link>
            <Link
              href="/seller/profile"
              className="w-full flex items-center justify-center gap-2 border-2 border-gray-200 text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-gray-50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Update Profile
            </Link>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 text-gray-500 font-medium py-3 hover:text-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Activation Banner
  const showActivationBanner = activationStatus && activationStatus.isActive === false;

  // Debug logs
  console.log('🔍 Dashboard Debug:', {
    activationLoading,
    activationError,
    activationStatus,
    showActivationBanner,
    onboardingLoading,
    onboardingError,
    onboardingStatus,
  });

  // Sidebar links and icon renderer (moved outside of return)
  const sidebarLinks = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: 'home', active: true },
    { href: '/seller/orders', label: 'Orders', icon: 'orders', badge: metrics?.pendingOrders },
    { href: '/seller/products', label: 'Products', icon: 'products' },
    { href: '/seller/inventory', label: 'Inventory', icon: 'inventory' },
    { href: '/seller/payments', label: 'Payments', icon: 'payments' },
    { href: '/seller/profile', label: 'Profile', icon: 'profile' },
    { href: '/seller/kyc', label: 'KYC', icon: 'kyc' },
  ];

  const renderIcon = (icon: string) => {
    const icons: Record<string, React.ReactNode> = {
      home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
      orders: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
      products: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
      inventory: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />,
      payments: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
      profile: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
      kyc: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
    };
    return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icons[icon]}</svg>;
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed top-4 left-4 z-[60] lg:hidden p-2 bg-[#1e293b] rounded-lg shadow-lg border border-white/10"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-[55] lg:z-auto w-64 bg-[#1e293b] border-r border-white/10 transform transition-transform duration-300 lg:transform-none ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo */}
          <div className="flex-shrink-0 p-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3">
              <img src="/logo/logo.svg" alt="Grabora" width={120} height={35} />
            </Link>
          </div>
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {sidebarLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  link.active
                    ? 'bg-[#f26322] text-white shadow-lg shadow-[#f26322]/25'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {renderIcon(link.icon)}
                  <span className="font-medium">{link.label}</span>
                </div>
                {link.badge && link.badge > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-white/20 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          
          </nav>
          {/* User Info */}
            <div className="px-6 py-5 border-t border-gray-100 dark:border-white/10 flex items-center gap-3 bg-gray-50 dark:bg-[#1e293b]">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f26322] to-[#e05512] flex items-center justify-center text-white font-bold">
                            {seller?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{seller?.name}</p>
                            <p className="text-xs text-gray-400 truncate">{seller?.storeName}</p>
                          </div>
                          <button
                            onClick={logout}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Logout"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                          </button>
                        </div>
        </div>
      </aside>
       <main className="flex-1 flex flex-col min-w-0 px-2 sm:px-4 md:px-8 py-6 gap-6">

                      {/* Top Bar */}
                      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 ml-0 lg:ml-0">
                        <div>
                          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
                          <p className="text-sm text-gray-400">Welcome back, {seller?.name}!</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {badges.slice(0, 2).map((badge, index) => (
                            <div key={index} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 rounded-full border border-amber-500/30">
                              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-xs font-medium text-amber-400">{badge.name}</span>
                            </div>
                          ))}
                        </div>
                      </header>

                      {/* Activation Banner */}
                      {showActivationBanner && activationStatus && (
                        <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 rounded-2xl border border-amber-500/30 p-6 mb-6">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-white mb-1">Your store is not live yet</h3>
                                <p className="text-sm text-gray-400">Complete onboarding to start receiving orders</p>
                              </div>
                            </div>
                            <Link
                              href={activationStatus.nextStep}
                              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 whitespace-nowrap"
                            >
                              Complete Setup
                            </Link>
                          </div>
                        </div>
                      )}

                          {!onboardingLoading && !onboardingError && onboardingStatus && !onboardingStatus.allCompleted && (
                            <OnboardingCard
                              router={router}
                              onboardingStatus={{
                                ...onboardingStatus,
                                steps: Object.fromEntries(
                                  Object.entries(onboardingStatus.steps).filter(([_, v]) => v !== undefined) as [string, import('@/components/seller/OnboardingCard').SellerOnboardingStep][]
                                )
                              }}
                              refetchOnboardingStatus={() => window.location.reload()}
                            />
                          )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Total Orders */}
                          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl p-5 border border-blue-500/20">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                              </div>
                              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">+12%</span>
                            </div>
                            <p className="text-2xl lg:text-3xl font-bold text-white">{metrics?.totalOrders || 0}</p>
                            <p className="text-sm text-gray-400 mt-1">Total Orders</p>
                          </div>

                          {/* Total Revenue */}
                          <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-2xl p-5 border border-emerald-500/20">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">+18%</span>
                            </div>
                            <p className="text-2xl lg:text-3xl font-bold text-white">₹{(metrics?.totalRevenue || 0).toLocaleString()}</p>
                            <p className="text-sm text-gray-400 mt-1">Total Revenue</p>
                          </div>

                          {/* Average Rating */}
                          <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-2xl p-5 border border-amber-500/20">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              </div>
                            </div>
                            <p className="text-2xl lg:text-3xl font-bold text-white">{metrics?.averageRating?.toFixed(1) || '0.0'}</p>
                            <p className="text-sm text-gray-400 mt-1">Average Rating</p>
                          </div>

                          {/* Total Products */}
                          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-2xl p-5 border border-purple-500/20">
                            <div className="flex items-center justify-between mb-4">
                              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                              </div>
                            </div>
                            <p className="text-2xl lg:text-3xl font-bold text-white">{metrics?.totalProducts || 0}</p>
                            <p className="text-sm text-gray-400 mt-1">Total Products</p>
                          </div>
                        </div>

                      {/* Main Content Grid */}
                        <div className="grid lg:grid-cols-3 gap-6">
                          {/* Orders Overview */}
                          <div className="lg:col-span-2 bg-white/5 rounded-2xl border border-white/10 p-6">
                            <div className="flex items-center justify-between mb-6">
                              <h2 className="text-lg font-semibold text-white">Orders Overview</h2>
                              <Link href="/seller/orders" className="text-sm text-[#f26322] hover:text-[#ff7a45] font-medium transition-colors">
                                View All →
                              </Link>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20 text-center">
                                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <p className="text-2xl font-bold text-white">{metrics?.pendingOrders || 0}</p>
                                <p className="text-xs text-gray-400 mt-1">Pending</p>
                              </div>

                              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 text-center">
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <p className="text-2xl font-bold text-white">{metrics?.completedOrders || 0}</p>
                                <p className="text-xs text-gray-400 mt-1">Completed</p>
                              </div>

                              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                                <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </div>
                                <p className="text-2xl font-bold text-white">{metrics?.cancelledOrders || 0}</p>
                                <p className="text-xs text-gray-400 mt-1">Cancelled</p>
                              </div>
                            </div>

                            {/* Performance Bars */}
                            <div className="mt-6 space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-gray-400">On-Time Delivery</span>
                                  <span className="text-sm font-semibold text-white">{metrics?.onTimeDeliveryRate || 0}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                                    style={{ width: `${metrics?.onTimeDeliveryRate || 0}%` }}
                                  ></div>
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-gray-400">Return Rate</span>
                                  <span className="text-sm font-semibold text-white">{metrics?.returnRate || 0}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${metrics?.returnRate || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
                            <div className="space-y-3">
                              <Link
                                href="/seller/products/add"
                                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                              >
                                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">Add Product</p>
                                  <p className="text-xs text-gray-400">List a new product</p>
                                </div>
                              </Link>

                              <Link
                                href="/seller/orders"
                                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                              >
                                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">View Orders</p>
                                  <p className="text-xs text-gray-400">Manage your orders</p>
                                </div>
                              </Link>

                              <Link
                                href="/seller/inventory"
                                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                              >
                                <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">Inventory</p>
                                  <p className="text-xs text-gray-400">Manage stock levels</p>
                                </div>
                              </Link>

                              <Link
                                href="/seller/payments"
                                className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all group"
                              >
                                <div className="w-10 h-10 bg-[#f26322]/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <svg className="w-5 h-5 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">Payments</p>
                                  <p className="text-xs text-gray-400">View earnings</p>
                                </div>
                              </Link>
                            </div>
                          </div>
                        </div>

                      {/* This Month Revenue */}
                        <div className="bg-gradient-to-r from-[#f26322]/20 to-[#f26322]/5 rounded-2xl border border-[#f26322]/20 p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              <div>
                                <p className="text-sm text-gray-400 mb-1">This Month&apos;s Revenue</p>
                                <p className="text-3xl lg:text-4xl font-bold text-white">₹{(metrics?.thisMonthRevenue || 0).toLocaleString()}</p>
                              </div>
                              <div className="flex gap-3">
                                <Link
                                  href="/seller/payments"
                                  className="px-6 py-3 bg-[#f26322] hover:bg-[#e05512] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#f26322]/25"
                                >
                                  View Details
                                </Link>
                                <button className="px-6 py-3 border-2 border-white/10 text-white font-semibold rounded-xl hover:bg-white/5 transition-all">
                                  Download Report
                                </button>
                              </div>
                            </div>
                        </div>
                    </main>
    </div>
  );

}
