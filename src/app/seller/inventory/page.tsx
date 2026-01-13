'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, InventoryItem, InventoryFilters, InventoryAlertsResponse, BulkStockUpdate } from '@/contexts/SellerContext';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/Loader';

export default function SellerInventoryPage() {
  const router = useRouter();
  const { 
    isAuthenticated, 
    isLoading: authLoading, 
    isApproved, 
    getInventory, 
    getInventoryAlerts, 
    bulkUpdateStock 
  } = useSeller();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlertsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Stock update modal
  const [editModal, setEditModal] = useState<{ item: InventoryItem; open: boolean } | null>(null);
  const [editStock, setEditStock] = useState({ stock: 0, lowStockThreshold: 10 });
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk update state
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUpdates, setBulkUpdates] = useState<Record<string, { stock: number; lowStockThreshold?: number }>>({});

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    
    const filters: InventoryFilters = {
      page: currentPage,
      limit: 20,
    };

    if (statusFilter === 'low_stock') {
      filters.lowStock = true;
    } else if (statusFilter === 'out_of_stock') {
      filters.outOfStock = true;
    }

    if (searchQuery) {
      filters.search = searchQuery;
    }

    const result = await getInventory(filters);

    if (result && result.inventory) {
      setInventory(result.inventory);
      setTotalPages(result.pagination?.totalPages || 1);
      setTotalItems(result.pagination?.total || 0);
    } else {
      setInventory([]);
      setTotalPages(1);
      setTotalItems(0);
    }
    
    setIsLoading(false);
  }, [currentPage, statusFilter, searchQuery, getInventory]);

  const fetchAlerts = useCallback(async () => {
    const result = await getInventoryAlerts();
    if (result) {
      setAlerts(result);
    }
  }, [getInventoryAlerts]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated && isApproved) {
      fetchInventory();
      fetchAlerts();
    }
  }, [isAuthenticated, isApproved, fetchInventory, fetchAlerts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated && isApproved) {
        setCurrentPage(1);
        fetchInventory();
      }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleUpdateStock = async () => {
    if (!editModal) return;
    
    setActionLoading(true);
    
    const updates: BulkStockUpdate[] = [{
      productId: editModal.item._id,
      stock: editStock.stock,
      lowStockThreshold: editStock.lowStockThreshold,
    }];

    const result = await bulkUpdateStock(updates);
    
    if (result.success) {
      toast.success('Stock updated successfully');
      setEditModal(null);
      fetchInventory();
      fetchAlerts();
    } else {
      toast.error(result.message);
    }
    
    setActionLoading(false);
  };

  const handleBulkUpdate = async () => {
    const updates: BulkStockUpdate[] = Object.entries(bulkUpdates).map(([productId, data]) => ({
      productId,
      stock: data.stock,
      lowStockThreshold: data.lowStockThreshold,
    }));

    if (updates.length === 0) {
      toast.error('No changes to save');
      return;
    }

    setActionLoading(true);
    
    const result = await bulkUpdateStock(updates);
    
    if (result.success) {
      toast.success(`Updated ${updates.length} items`);
      setBulkMode(false);
      setBulkUpdates({});
      fetchInventory();
      fetchAlerts();
    } else {
      toast.error(result.message);
    }
    
    setActionLoading(false);
  };

  const openEditModal = (item: InventoryItem) => {
    if (!item) return;
    setEditStock({ stock: item.stock || 0, lowStockThreshold: item.lowStockThreshold || 0 });
    setEditModal({ item, open: true });
  };

  if (authLoading || (isLoading && inventory.length === 0)) {
    return <PageLoader message="Loading inventory..." />;
  }

  if (!isAuthenticated || !isApproved) {
    return null;
  }

  const getStockStatus = (item: InventoryItem) => {
    if (item.stock === 0) return 'out_of_stock';
    if (item.stock <= item.lowStockThreshold) return 'low_stock';
    return 'in_stock';
  };

  const getStockStatusBadge = (item: InventoryItem) => {
    const status = item.stockStatus || getStockStatus(item);
    switch (status) {
      case 'in_stock':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">In Stock</span>;
      case 'low_stock':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Low Stock</span>;
      case 'out_of_stock':
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Out of Stock</span>;
      default:
        return null;
    }
  };

  const getCategoryName = (categoryId: InventoryItem['categoryId']) => {
    if (typeof categoryId === 'object' && categoryId?.name) {
      return categoryId.name;
    }
    return 'Uncategorized';
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
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-500 mt-1">Track and manage your product stock levels</p>
          </div>
          <div className="flex items-center gap-3">
            {bulkMode ? (
              <>
                <button
                  onClick={() => {
                    setBulkMode(false);
                    setBulkUpdates({});
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkUpdate}
                  disabled={actionLoading || Object.keys(bulkUpdates).length === 0}
                  className="px-4 py-2 bg-[#f26322] text-white rounded-xl hover:bg-[#e05512] font-medium disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : `Save Changes (${Object.keys(bulkUpdates).length})`}
                </button>
              </>
            ) : (
              <button
                onClick={() => setBulkMode(true)}
                className="px-4 py-2 text-[#f26322] border border-[#f26322] rounded-xl hover:bg-orange-50 font-medium"
              >
                Bulk Edit
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-800">{totalItems}</p>
            <p className="text-sm text-gray-500">Total Products</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {inventory.filter(i => getStockStatus(i) === 'in_stock').length}
            </p>
            <p className="text-sm text-gray-500">In Stock</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:border-yellow-300 transition-colors"
            onClick={() => setStatusFilter('low_stock')}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{alerts?.lowStock?.count || 0}</p>
            <p className="text-sm text-gray-500">Low Stock</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 cursor-pointer hover:border-red-300 transition-colors"
            onClick={() => setStatusFilter('out_of_stock')}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{alerts?.outOfStock?.count || 0}</p>
            <p className="text-sm text-gray-500">Out of Stock</p>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts && (alerts.lowStock.count > 0 || alerts.outOfStock.count > 0) && !statusFilter && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-yellow-800">Stock Alerts</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  {alerts.outOfStock.count > 0 && `${alerts.outOfStock.count} products are out of stock. `}
                  {alerts.lowStock.count > 0 && `${alerts.lowStock.count} products have low stock.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by product name or SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2">
              {['', 'low_stock', 'out_of_stock'].map((status) => (
                <button
                  key={status || 'all'}
                  onClick={() => {
                    setStatusFilter(status);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-[#f26322] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status === '' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
            {isLoading && (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-[#f26322] self-center"></div>
            )}
          </div>
        </div>

        {/* Inventory Table */}
        {inventory.length === 0 && !isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No inventory items</h3>
            <p className="text-gray-500 mb-6">
              {statusFilter || searchQuery ? 'Try adjusting your filters' : 'Add products to start managing your inventory'}
            </p>
            <Link
              href="/seller/products/add"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#f26322] to-[#f5833c] text-white font-medium rounded-xl hover:shadow-lg hover:shadow-orange-200 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Product
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">SKU</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase">Low Stock Alert</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {item.images && item.images[0] ? (
                                <Image src={item.images[0]} alt={item.title} width={40} height={40} className="object-cover w-full h-full" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                                  {item.title.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-gray-800 block truncate max-w-[200px]">{item.title}</span>
                              <span className="text-sm text-gray-500">{getCategoryName(item.categoryId)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{item.sku}</td>
                        <td className="px-6 py-4 text-center">
                          {bulkMode ? (
                            <input
                              type="number"
                              min="0"
                              value={bulkUpdates[item._id]?.stock ?? item.stock}
                              onChange={(e) => setBulkUpdates(prev => ({
                                ...prev,
                                [item._id]: {
                                  ...prev[item._id],
                                  stock: parseInt(e.target.value) || 0,
                                  lowStockThreshold: prev[item._id]?.lowStockThreshold ?? item.lowStockThreshold,
                                }
                              }))}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-center text-sm"
                            />
                          ) : (
                            <span className={`font-medium ${item.stock === 0 ? 'text-red-600' : item.stock <= item.lowStockThreshold ? 'text-yellow-600' : 'text-gray-800'}`}>
                              {item.stock}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center text-gray-600">{item.lowStockThreshold}</td>
                        <td className="px-6 py-4">{getStockStatusBadge(item)}</td>
                        <td className="px-6 py-4 text-right">
                          {!bulkMode && (
                            <button 
                              onClick={() => openEditModal(item)}
                              className="px-4 py-2 text-sm font-medium text-[#f26322] hover:bg-orange-50 rounded-lg transition-colors"
                            >
                              Update Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 px-4">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * 20 + 1} to {Math.min(currentPage * 20, totalItems)} of {totalItems} items
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Stock Modal */}
      {editModal?.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Update Stock</h3>
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-xl">
              <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                {editModal.item.images?.[0] ? (
                  <Image src={editModal.item.images[0]} alt={editModal.item.title} width={48} height={48} className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {editModal.item.title.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-800">{editModal.item.title}</p>
                <p className="text-sm text-gray-500">SKU: {editModal.item.sku}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={editStock.stock}
                  onChange={(e) => setEditStock(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Alert Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={editStock.lowStockThreshold}
                  onChange={(e) => setEditStock(prev => ({ ...prev, lowStockThreshold: parseInt(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f26322] outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Alert when stock goes below this level</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStock}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 bg-[#f26322] text-white rounded-xl hover:bg-[#e05512] font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
