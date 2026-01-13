'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, Product, ProductFilters, ProductCategory } from '@/contexts/SellerContext';
import { PageLoader } from '@/components/ui/Loader';
import { useSellerActivationStatus } from '@/hooks/useSellerActivationStatus';

export default function SellerProductsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isApproved, getProducts, deleteProduct, updateProductStock, getCategories } = useSeller();
  const { status: activationStatus } = useSellerActivationStatus();
    // Category filter state
    const [categories, setCategories] = useState<ProductCategory[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    // Fetch categories on mount
    useEffect(() => {
      async function fetchCategories() {
        const cats = await getCategories();
        setCategories(cats);
      }
      if (isAuthenticated && isApproved) {
        fetchCategories();
      }
    }, [isAuthenticated, isApproved, getCategories]);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingStock, setEditingStock] = useState<{ id: string; stock: number } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    
    const filters: ProductFilters = {
      page: currentPage,
      limit: 10,
    };


    if (statusFilter && statusFilter !== '') {
      filters.status = statusFilter as 'draft' | 'active' | 'archived' | 'out_of_stock';
    }

    if (categoryFilter && categoryFilter !== '') {
      filters.category = categoryFilter;
    }

    if (searchQuery) {
      filters.search = searchQuery;
    }

    // Map sortBy to API params
    switch (sortBy) {
      case 'newest':
        filters.sortBy = 'createdAt';
        filters.sortOrder = 'desc';
        break;
      case 'oldest':
        filters.sortBy = 'createdAt';
        filters.sortOrder = 'asc';
        break;
      case 'price_high':
        filters.sortBy = 'price';
        filters.sortOrder = 'desc';
        break;
      case 'price_low':
        filters.sortBy = 'price';
        filters.sortOrder = 'asc';
        break;
      case 'stock':
        filters.sortBy = 'stock';
        filters.sortOrder = 'asc';
        break;
    }

    const result = await getProducts(filters);
    if (result && Array.isArray(result.products) && result.pagination) {
      setProducts(result.products);
      setTotalPages(result.pagination.totalPages ?? 1);
      setTotalProducts(result.pagination.total ?? 0);
    } else {
      setProducts([]);
      setTotalPages(1);
      setTotalProducts(0);
    }
    setIsLoading(false);
  }, [currentPage, statusFilter, searchQuery, sortBy, getProducts]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);


  useEffect(() => {
    if (isAuthenticated && isApproved) {
      fetchProducts();
    }
  }, [isAuthenticated, isApproved, fetchProducts, categoryFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && isApproved) {
        setCurrentPage(1);
        fetchProducts();
      }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    setDeletingId(id);
    const result = await deleteProduct(id);
    
    if (result.success) {
      setProducts(products.filter(p => p._id !== id));
    } else {
      alert(result.message);
    }
    setDeletingId(null);
  };

  const handleStockUpdate = async () => {
    if (!editingStock) return;
    
    const result = await updateProductStock(editingStock.id, editingStock.stock);
    
    if (result.success && result.data) {
      setProducts(products.map(p => 
        p._id === editingStock.id 
          ? { ...p, stock: editingStock.stock, status: editingStock.stock === 0 ? 'out_of_stock' : p.status }
          : p
      ));
    } else {
      alert(result.message);
    }
    setEditingStock(null);
  };

  if (authLoading || (isLoading && products.length === 0)) {
    return <PageLoader message="Loading products..." />;
  }

  if (!isAuthenticated || !isApproved) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">Active</span>;
      case 'draft':
        return <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">Draft</span>;
      case 'archived':
        return <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Archived</span>;
      case 'out_of_stock':
        return <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Out of Stock</span>;
      default:
        return null;
    }
  };

  const getCategoryName = (categoryId: Product['categoryId']) => {
    if (typeof categoryId === 'object' && categoryId?.name) {
      return categoryId.name;
    }
    return 'Uncategorized';
  };

  const sidebarLinks = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: 'home' },
    { href: '/seller/orders', label: 'Orders', icon: 'orders' },
    { href: '/seller/products', label: 'Products', icon: 'products', active: true },
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
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1e293b] border-r border-white/10 transform transition-transform duration-300 lg:transform-none ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo/logo.svg" alt="Grabora" width={120} height={35} style={{ height: 'auto' }} />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
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
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/10">
          <div className="flex items-center justify-between px-4 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">Products</h1>
                <p className="text-sm text-gray-400">
                  {totalProducts > 0 ? `${totalProducts} products in your catalog` : 'Manage your product catalog'}
                </p>
              </div>
            </div>
            <Link
              href="/seller/products/add"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#f26322] to-[#f5833c] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Add Product</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-8">
          {/* Activation Info Banner */}
          {activationStatus && !activationStatus.isActive && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-300">
                  Your products will go live once onboarding is completed.
                </p>
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="bg-[#1e293b] rounded-2xl border border-white/10 p-4 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search products by name, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-[#f26322] focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={categoryFilter}
                  onChange={e => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#f26322] focus:border-transparent outline-none"
                >
                  <option value="" className="bg-[#1e293b]">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id} className="bg-[#1e293b]">{cat.name}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#f26322] focus:border-transparent outline-none"
                >
                  <option value="" className="bg-[#1e293b]">All Status</option>
                  <option value="active" className="bg-[#1e293b]">Active</option>
                  <option value="draft" className="bg-[#1e293b]">Draft</option>
                  <option value="archived" className="bg-[#1e293b]">Archived</option>
                  <option value="out_of_stock" className="bg-[#1e293b]">Out of Stock</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-[#f26322] focus:border-transparent outline-none"
                >
                  <option value="newest" className="bg-[#1e293b]">Newest First</option>
                  <option value="oldest" className="bg-[#1e293b]">Oldest First</option>
                  <option value="price_high" className="bg-[#1e293b]">Price: High to Low</option>
                  <option value="price_low" className="bg-[#1e293b]">Price: Low to High</option>
                  <option value="stock" className="bg-[#1e293b]">Stock: Low to High</option>
                </select>

                {isLoading && (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-[#f26322]"></div>
                )}
              </div>
            </div>
          </div>

          {/* Products Table */}
          {products.length === 0 && !isLoading ? (
            <div className="bg-[#1e293b] rounded-2xl border border-white/10 p-12 text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || statusFilter ? 'Try adjusting your filters' : 'Start selling by adding your first product'}
              </p>
              <Link
                href="/seller/products/add"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f26322] to-[#f5833c] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-500/25 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Your First Product
              </Link>
            </div>
          ) : (
            <>
              <div className="bg-[#1e293b] rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Stock</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {products.map((product) => (
                        <tr key={product._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-white/10 rounded-lg overflow-hidden flex-shrink-0">
                                {product.images && product.images[0] ? (
                                  <Image 
                                    src={product.images[0]} 
                                    alt={product.title} 
                                    width={48} 
                                    height={48} 
                                    className="object-cover w-full h-full" 
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-500">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-white truncate max-w-[200px]">{product.title}</p>
                                <p className="text-sm text-gray-400">{getCategoryName(product.categoryId)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-300 font-mono">{product.sku}</td>
                          <td className="px-6 py-4">
                            <p className="font-medium text-white">₹{product.salePrice || product.price}</p>
                            {product.mrp && product.mrp > (product.salePrice || product.price) && (
                              <p className="text-sm text-gray-500 line-through">₹{product.mrp}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {editingStock?.id === product._id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={editingStock.stock}
                                  onChange={(e) => setEditingStock({ ...editingStock, stock: parseInt(e.target.value) || 0 })}
                                  className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-sm text-white"
                                />
                                <button
                                  onClick={handleStockUpdate}
                                  className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => setEditingStock(null)}
                                  className="p-1 text-gray-400 hover:bg-white/10 rounded"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setEditingStock({ id: product._id, stock: product.stock })}
                                className={`text-sm ${product.stock <= product.lowStockThreshold ? 'text-red-400 font-medium' : 'text-gray-300'} hover:underline`}
                              >
                                {product.stock} units
                                {product.stock <= product.lowStockThreshold && (
                                  <span className="ml-1 text-xs">(Low)</span>
                                )}
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4">{getStatusBadge(product.status)}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/seller/products/edit/${product._id}`}
                                className="p-2 text-gray-400 hover:text-[#f26322] hover:bg-orange-500/10 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                              <button 
                                onClick={() => handleDelete(product._id)}
                                disabled={deletingId === product._id}
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingId === product._id ? (
                                  <div className="w-5 h-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                  <p className="text-sm text-gray-400">
                    Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, totalProducts)} of {totalProducts} products
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                : 'text-gray-400 hover:bg-white/10'
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
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
