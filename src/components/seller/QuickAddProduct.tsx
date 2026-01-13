'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSeller, CreateProductData, ProductCategory } from '@/contexts/SellerContext';
import toast from 'react-hot-toast';
import Image from 'next/image';

interface QuickAddProductProps {
  onCancel: () => void;
  categories: ProductCategory[];
}

export default function QuickAddProduct({ onCancel, categories }: QuickAddProductProps) {
  const router = useRouter();
  const { createProduct } = useSeller();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    categoryId: '',
    price: '',
    stock: '',
    sku: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate SKU based on title
  const generateSKU = useCallback((title: string) => {
    const cleaned = title.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const timestamp = Date.now().toString().slice(-6);
    return `${cleaned.slice(0, 6)}${timestamp}`;
  }, []);

  const handleTitleChange = (value: string) => {
    setFormData(prev => ({ ...prev, title: value }));

    // Auto-generate SKU if it's empty or was auto-generated before
    if (!formData.sku || formData.sku.endsWith(formData.title.slice(-6))) {
      const newSKU = generateSKU(value);
      setFormData(prev => ({ ...prev, sku: newSKU }));
    }

    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB`);
        return false;
      }
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviewUrls(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      if (errors.images) {
        setErrors(prev => ({ ...prev, images: '' }));
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Valid price is required';
    if (!formData.stock || parseInt(formData.stock) < 0) newErrors.stock = 'Valid stock is required';
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (images.length === 0) newErrors.images = 'At least 1 image is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix all errors');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      const uploadedImageUrls: string[] = [];
      for (const image of images) {
        const formData = new FormData();
        formData.append('file', image);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2'}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('sellerToken')}`,
          },
          body: formData,
        });

        const result = await response.json();
        if (result.success && result.data?.url) {
          uploadedImageUrls.push(result.data.url);
        }
      }

      // Create product
      const productData: CreateProductData = {
        title: formData.title.trim(),
        sku: formData.sku.trim(),
        categoryId: formData.categoryId,
        price: parseFloat(formData.price),
        mrp: parseFloat(formData.price), // Same as price for quick add
        stock: parseInt(formData.stock),
        lowStockThreshold: 10,
        images: uploadedImageUrls,
        status: 'active', // Goes live immediately
        tags: [],
        highlights: [],
      };

      const result = await createProduct(productData);

      if (result.success) {
        toast.success('Product added successfully! 🎉');
        router.push('/seller/products');
      } else {
        toast.error(result.message || 'Failed to add product');
      }
    } catch (error) {
      toast.error('Failed to add product. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategory = categories.find(c => c._id === formData.categoryId);
  const customerPrice = parseFloat(formData.price) || 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Add Product</h2>
            <p className="text-sm text-gray-500 mt-1">Fill essential details to list your product instantly</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Product Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Product Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="e.g., Samsung Galaxy S23 Ultra 256GB"
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#f26322]/20 focus:border-[#f26322] outline-none transition-all ${
              errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
            maxLength={200}
          />
          {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          <p className="mt-1 text-xs text-gray-500">{formData.title.length}/200 characters</p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, categoryId: e.target.value }));
              if (errors.categoryId) setErrors(prev => ({ ...prev, categoryId: '' }));
            }}
            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#f26322]/20 focus:border-[#f26322] outline-none transition-all ${
              errors.categoryId ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          >
            <option value="">Select a category</option>
            {categories.map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
          {errors.categoryId && <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>}
          {selectedCategory && (
            <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Selected: {selectedCategory.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Price (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, price: e.target.value }));
                  if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                }}
                placeholder="999"
                className={`w-full pl-8 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#f26322]/20 focus:border-[#f26322] outline-none transition-all ${
                  errors.price ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
                min="0"
                step="0.01"
              />
            </div>
            {errors.price && <p className="mt-1 text-sm text-red-500">{errors.price}</p>}
            {customerPrice > 0 && (
              <p className="mt-1 text-xs text-blue-600 font-medium">
                Customer sees: ₹{customerPrice.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Stock Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.stock}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, stock: e.target.value }));
                if (errors.stock) setErrors(prev => ({ ...prev, stock: '' }));
              }}
              placeholder="100"
              className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#f26322]/20 focus:border-[#f26322] outline-none transition-all ${
                errors.stock ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              min="0"
            />
            {errors.stock && <p className="mt-1 text-sm text-red-500">{errors.stock}</p>}
          </div>
        </div>

        {/* SKU */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            SKU <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.sku}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }));
                if (errors.sku) setErrors(prev => ({ ...prev, sku: '' }));
              }}
              placeholder="PROD123456"
              className={`flex-1 px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[#f26322]/20 focus:border-[#f26322] outline-none transition-all font-mono ${
                errors.sku ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, sku: generateSKU(formData.title || 'PROD') }))}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all"
            >
              Auto-generate
            </button>
          </div>
          {errors.sku && <p className="mt-1 text-sm text-red-500">{errors.sku}</p>}
          <p className="mt-1 text-xs text-gray-500">Unique identifier for this product</p>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Product Images <span className="text-red-500">*</span> (At least 1)
          </label>

          <div className="space-y-3">
            {imagePreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                    <Image
                      src={url}
                      alt={`Product ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 px-2 py-0.5 bg-[#f26322] text-white text-xs font-semibold rounded">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl p-6 transition-all ${
                errors.images ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-[#f26322] hover:bg-orange-50'
              }`}
            >
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <p className="text-sm font-medium text-gray-700">Click to upload images</p>
                <p className="text-xs text-gray-500 mt-1">Max 5 images, 5MB each</p>
                <p className="text-xs text-gray-500">Mobile camera supported</p>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            {errors.images && <p className="text-sm text-red-500">{errors.images}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Adding Product...
              </span>
            ) : (
              'Add Product & Go Live'
            )}
          </button>
        </div>

        <p className="text-xs text-center text-gray-500">
          Product will be <span className="font-semibold text-emerald-600">LIVE immediately</span>. You can edit details anytime.
        </p>
      </form>
    </div>
  );
}
