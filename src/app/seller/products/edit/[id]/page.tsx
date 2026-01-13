'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, Product, CreateProductData, ProductDimensions, ProductCategory, ProductVariant, CategoryTemplate } from '@/contexts/SellerContext';
import toast from 'react-hot-toast';
import CreatableSelect, { CreatableMultiSelect, ColorSelect } from '@/components/ui/CreatableSelect';

interface ProductForm {
  title: string;
  description: string;
  shortDescription: string;
  sku: string;
  categoryId: string;
  brand: string;
  price: string;
  salePrice: string;
  mrp: string;
  costPrice: string;
  stock: string;
  lowStockThreshold: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  tags: string[];
  highlights: string[];
  status: 'active' | 'draft' | 'inactive';
}

interface VariantForm {
  id: string;
  sku: string;
  title: string;
  price: string;
  salePrice: string;
  mrp: string;
  additionalPrice: string;
  stock: string;
  images: File[];
  imagePreviewUrls: string[];
  existingImages: string[];
  attributes: Record<string, string>;
  isActive: boolean;
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isApproved, getProduct, updateProduct, getCategories, getCategoryTemplate } = useSeller();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryTemplate, setCategoryTemplate] = useState<CategoryTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  
  // Dynamic attributes state (from category template)
  const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, string>>({});
  const [specifications, setSpecifications] = useState<Record<string, Record<string, string>>>({});
  
  // Progressive disclosure - expanded specification groups
  const [expandedSpecGroups, setExpandedSpecGroups] = useState<Set<string>>(new Set());
  
  // Variants state
  const [variants, setVariants] = useState<VariantForm[]>([]);
  
  const [form, setForm] = useState<ProductForm>({
    title: '',
    description: '',
    shortDescription: '',
    sku: '',
    categoryId: '',
    brand: '',
    price: '',
    salePrice: '',
    mrp: '',
    costPrice: '',
    stock: '',
    lowStockThreshold: '10',
    weight: '',
    length: '',
    width: '',
    height: '',
    tags: [],
    highlights: [],
    status: 'active',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProductForm, string>>>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/seller/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated && isApproved && resolvedParams.id) {
        setIsLoading(true);
        
        // Fetch categories and product in parallel
        const [categoriesData, productData] = await Promise.all([
          getCategories(),
          getProduct(resolvedParams.id)
        ]);
        
        setCategories(categoriesData);
        
        if (productData) {
          setProduct(productData);
          setExistingImages(productData.images || []);
          
          // Fetch category template if available
          const categoryId = typeof productData.categoryId === 'object' ? productData.categoryId._id : productData.categoryId;
          if (categoryId) {
            try {
              const template = await getCategoryTemplate(categoryId);
              if (template) {
                setCategoryTemplate(template);
              }
            } catch {
              // Category template not available, continue without it
            }
          }
          
          // Load existing variants
          if (productData.variants && productData.variants.length > 0) {
            const loadedVariants: VariantForm[] = productData.variants.map((v: ProductVariant, index: number) => ({
              id: `variant_${index}_${Date.now()}`,
              sku: v.sku || '',
              title: v.title || '',
              price: v.price?.toString() || '',
              salePrice: v.salePrice?.toString() || '',
              mrp: v.mrp?.toString() || '',
              additionalPrice: v.additionalPrice?.toString() || '0',
              stock: v.stock?.toString() || '0',
              images: [],
              imagePreviewUrls: [],
              existingImages: v.images || [],
              attributes: v.attributes || {},
              isActive: v.isActive ?? true,
            }));
            setVariants(loadedVariants);
          }
          
          // Map API status to form status
          const formStatus: 'active' | 'draft' | 'inactive' = 
            productData.status === 'archived' || productData.status === 'out_of_stock' 
              ? 'inactive' 
              : productData.status === 'draft' 
                ? 'draft' 
                : 'active';
          setForm({
            title: productData.title || '',
            description: productData.description || '',
            shortDescription: productData.shortDescription || '',
            sku: productData.sku || '',
            categoryId: categoryId || '',
            brand: productData.brand || '',
            price: productData.price?.toString() || '',
            salePrice: productData.salePrice?.toString() || '',
            mrp: productData.mrp?.toString() || '',
            costPrice: productData.costPrice?.toString() || '',
            stock: productData.stock?.toString() || '0',
            lowStockThreshold: productData.lowStockThreshold?.toString() || '10',
            weight: productData.weight?.toString() || '',
            length: productData.dimensions?.length?.toString() || '',
            width: productData.dimensions?.width?.toString() || '',
            height: productData.dimensions?.height?.toString() || '',
            tags: productData.tags || [],
            highlights: productData.highlights || [],
            status: formStatus,
          });
        } else {
          toast.error('Product not found');
          router.push('/seller/products');
        }
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isAuthenticated, isApproved, resolvedParams.id, getProduct, getCategories, getCategoryTemplate, router]);

  const handleInputChange = (field: keyof ProductForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + newImages.length + files.length;
    
    if (totalImages > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB allowed.`);
        return false;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name} is not a valid image format.`);
        return false;
      }
      return true;
    });

    setNewImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setNewImagePreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    setNewImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag) && form.tags.length < 10) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const addHighlight = () => {
    const highlight = highlightInput.trim();
    if (highlight && !form.highlights.includes(highlight) && form.highlights.length < 10) {
      setForm(prev => ({ ...prev, highlights: [...prev.highlights, highlight] }));
      setHighlightInput('');
    }
  };

  const removeHighlight = (highlight: string) => {
    setForm(prev => ({ ...prev, highlights: prev.highlights.filter(h => h !== highlight) }));
  };

  // Variant management functions
  const generateVariantId = () => `variant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const generateVariantSKU = () => {
    const brand = form.brand?.toUpperCase().substring(0, 4) || 'PROD';
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `SKU-${brand}-${random}`;
  };

  const addVariant = () => {
    const newVariant: VariantForm = {
      id: generateVariantId(),
      sku: '',
      title: '',
      price: '',
      salePrice: '',
      mrp: '',
      additionalPrice: '0',
      stock: '0',
      images: [],
      imagePreviewUrls: [],
      existingImages: [],
      attributes: {},
      isActive: true,
    };
    setVariants(prev => [...prev, newVariant]);
  };

  const removeVariant = (variantId: string) => {
    setVariants(prev => prev.filter(v => v.id !== variantId));
  };

  const updateVariant = (variantId: string, field: keyof VariantForm, value: unknown) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId ? { ...v, [field]: value } : v
    ));
  };

  const updateVariantAttribute = (variantId: string, attrKey: string, value: string) => {
    setVariants(prev => prev.map(v => 
      v.id === variantId 
        ? { ...v, attributes: { ...v.attributes, [attrKey]: value } }
        : v
    ));
  };

  const handleVariantImageSelect = (variantId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const variant = variants.find(v => v.id === variantId);
    if (!variant) return;
    
    const totalImages = variant.existingImages.length + variant.images.length + files.length;
    if (totalImages > 4) {
      toast.error('Maximum 4 images per variant');
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Max 5MB allowed.`);
        return false;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name} is not a valid image format.`);
        return false;
      }
      return true;
    });

    setVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      return { ...v, images: [...v.images, ...validFiles] };
    }));

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setVariants(prev => prev.map(v => {
          if (v.id !== variantId) return v;
          return { ...v, imagePreviewUrls: [...v.imagePreviewUrls, reader.result as string] };
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeVariantExistingImage = (variantId: string, imageIndex: number) => {
    setVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      return {
        ...v,
        existingImages: v.existingImages.filter((_, i) => i !== imageIndex),
      };
    }));
  };

  const removeVariantNewImage = (variantId: string, imageIndex: number) => {
    setVariants(prev => prev.map(v => {
      if (v.id !== variantId) return v;
      return {
        ...v,
        images: v.images.filter((_, i) => i !== imageIndex),
        imagePreviewUrls: v.imagePreviewUrls.filter((_, i) => i !== imageIndex),
      };
    }));
  };

  // Toggle specification group expansion
  const toggleSpecGroup = (groupName: string) => {
    setExpandedSpecGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Calculate completion percentage for a spec group
  const getSpecGroupCompletion = (groupName: string): { filled: number; total: number; percentage: number } => {
    const group = categoryTemplate?.specificationGroups?.find(g => g.name === groupName);
    if (!group) return { filled: 0, total: 0, percentage: 0 };
    
    const total = group.specs.length;
    const filled = group.specs.filter(f => specifications[groupName]?.[f.key]?.trim()).length;
    return { filled, total, percentage: total > 0 ? Math.round((filled / total) * 100) : 0 };
  };

  // Check if all required attributes are filled
  const getAttributesCompletion = (): { filled: number; required: number; percentage: number } => {
    if (!categoryTemplate?.attributes) return { filled: 0, required: 0, percentage: 100 };
    
    const requiredAttrs = categoryTemplate.attributes.filter(a => a.required);
    const filled = requiredAttrs.filter(a => dynamicAttributes[a.key]?.trim()).length;
    return { filled, required: requiredAttrs.length, percentage: requiredAttrs.length > 0 ? Math.round((filled / requiredAttrs.length) * 100) : 100 };
  };

  // Get current step name to validate properly
  const getStepName = (stepId: number): string => {
    const stepMap: Record<number, string> = { 1: 'basic' };
    let currentId = 2;
    
    if (categoryTemplate?.attributes?.length) {
      stepMap[currentId++] = 'attributes';
    }
    if (categoryTemplate?.specificationGroups?.length) {
      stepMap[currentId++] = 'specifications';
    }
    stepMap[currentId++] = 'pricing';
    if (categoryTemplate?.variantAttributes?.length) {
      stepMap[currentId++] = 'variants';
    }
    stepMap[currentId++] = 'images';
    stepMap[currentId] = 'review';
    
    return stepMap[stepId] || 'unknown';
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof ProductForm, string>> = {};
    const stepName = getStepName(step);

    if (stepName === 'basic') {
      if (!form.title.trim()) newErrors.title = 'Product title is required';
      if (!form.categoryId) newErrors.categoryId = 'Category is required';
      if (!form.sku.trim()) newErrors.sku = 'SKU is required';
      if (!form.shortDescription.trim()) newErrors.shortDescription = 'Short description is required';
    }

    if (stepName === 'pricing') {
      if (!form.price || parseFloat(form.price) <= 0) newErrors.price = 'Valid price is required';
      if (!form.mrp || parseFloat(form.mrp) <= 0) newErrors.mrp = 'Valid MRP is required';
      if (form.salePrice && parseFloat(form.salePrice) > parseFloat(form.price)) newErrors.salePrice = 'Sale price cannot exceed price';
      if (!form.stock || parseInt(form.stock) < 0) newErrors.stock = 'Valid stock quantity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Dynamic steps based on category template
  const getSteps = () => {
    const baseSteps = [
      { id: 1, name: 'Basic Info', key: 'basic' },
    ];
    
    // Add dynamic steps if category has template
    if (categoryTemplate) {
      if (categoryTemplate.attributes && categoryTemplate.attributes.length > 0) {
        baseSteps.push({ id: baseSteps.length + 1, name: 'Attributes', key: 'attributes' });
      }
      if (categoryTemplate.specificationGroups && categoryTemplate.specificationGroups.length > 0) {
        baseSteps.push({ id: baseSteps.length + 1, name: 'Specifications', key: 'specifications' });
      }
    }
    
    baseSteps.push({ id: baseSteps.length + 1, name: 'Pricing & Stock', key: 'pricing' });
    // Add variants step if category has variant attributes
    if (categoryTemplate?.variantAttributes && categoryTemplate.variantAttributes.length > 0) {
      baseSteps.push({ id: baseSteps.length + 1, name: 'Variants', key: 'variants' });
    }
    baseSteps.push({ id: baseSteps.length + 1, name: 'Images', key: 'images' });
    baseSteps.push({ id: baseSteps.length + 1, name: 'Review', key: 'review' });
    
    return baseSteps;
  };

  const steps = getSteps();
  const totalSteps = steps.length;

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate basic info
    const basicValid = validateStep(steps.find(s => s.key === 'basic')?.id || 1);
    const pricingValid = validateStep(steps.find(s => s.key === 'pricing')?.id || 2);
    
    if (!basicValid || !pricingValid) {
      toast.error('Please fill all required fields');
      return;
    }

    const totalImages = existingImages.length + newImagePreviewUrls.length;
    if (totalImages === 0) {
      toast.error('Please add at least one product image');
      return;
    }

    setIsSaving(true);
    try {
      // Combine existing and new image URLs
      const allImages = [...existingImages, ...newImagePreviewUrls];

      // Map form status back to product status
      const productStatus: 'active' | 'draft' | 'archived' = 
        form.status === 'inactive' ? 'archived' : form.status;

      // Format variants for API
      const formattedVariants: ProductVariant[] = variants
        .filter(v => v.sku && v.title && v.price)
        .map(v => ({
          sku: v.sku,
          title: v.title,
          price: parseFloat(v.price),
          salePrice: v.salePrice ? parseFloat(v.salePrice) : undefined,
          mrp: v.mrp ? parseFloat(v.mrp) : undefined,
          additionalPrice: v.additionalPrice ? parseFloat(v.additionalPrice) : undefined,
          stock: parseInt(v.stock) || 0,
          images: [...v.existingImages, ...v.imagePreviewUrls].length > 0 ? [...v.existingImages, ...v.imagePreviewUrls] : undefined,
          attributes: Object.keys(v.attributes).length > 0 ? v.attributes : undefined,
          isActive: v.isActive,
        }));

      const productData: Partial<CreateProductData> = {
        title: form.title,
        sku: form.sku,
        categoryId: form.categoryId,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        images: allImages,
        status: productStatus,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        brand: form.brand || undefined,
        salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
        mrp: form.mrp ? parseFloat(form.mrp) : undefined,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold) : undefined,
        tags: form.tags.length > 0 ? form.tags : undefined,
        highlights: form.highlights.length > 0 ? form.highlights : undefined,
        variants: formattedVariants.length > 0 ? formattedVariants : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        dimensions: (form.length && form.width && form.height) ? {
          length: parseFloat(form.length),
          width: parseFloat(form.width),
          height: parseFloat(form.height),
        } : undefined,
      };

      const result = await updateProduct(resolvedParams.id, productData);

      if (result.success) {
        toast.success('Product updated successfully');
        router.push('/seller/products');
      } else {
        toast.error(result.message || 'Failed to update product');
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('An error occurred while updating the product');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isApproved) {
    return null;
  }

  // Step icons as SVG components
  const stepIcons: Record<string, React.ReactNode> = {
    basic: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    attributes: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    specifications: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    pricing: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    variants: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    images: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    review: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/seller/products" className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Edit Product</h1>
                <p className="text-xs text-gray-500">Step {activeStep} of {totalSteps}</p>
              </div>
            </div>
            <Link href="/">
              <Image src="/logo/logo.svg" alt="Grabora" width={120} height={35} className="h-8 w-auto" />
            </Link>
          </div>
        </div>
      </header>

      {/* Progress Steps - Improved Design */}
      <div className="bg-white/60 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Progress Bar */}
          <div className="relative mb-6">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 rounded-full -translate-y-1/2"></div>
            <div 
              className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full -translate-y-1/2 transition-all duration-500"
              style={{ width: `${((activeStep - 1) / (totalSteps - 1)) * 100}%` }}
            ></div>
          </div>
          
          {/* Step Indicators */}
          <div className="flex items-center justify-between relative">
            {steps.map((step) => {
              const isActive = activeStep === step.id;
              const isCompleted = step.id < activeStep;
              const isClickable = step.id < activeStep;
              // Use both id and key for uniqueness in case of dynamic steps
              return (
                <div key={step.id + '-' + step.key} className="flex flex-col items-center relative z-10">
                  <button
                    onClick={() => isClickable && setActiveStep(step.id)}
                    disabled={!isClickable}
                    className={`
                      relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-300 
                      ${isActive 
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-110' 
                        : isCompleted 
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-green-500/20 cursor-pointer hover:scale-105' 
                          : 'bg-white text-gray-400 border-2 border-gray-200'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      stepIcons[step.key]
                    )}
                  </button>
                  <span className={`
                    mt-2 text-xs font-semibold whitespace-nowrap transition-colors
                    ${isActive ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-gray-400'}
                  `}>
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 p-6 md:p-10 overflow-visible">
          {/* Step: Basic Info */}
          {getStepName(activeStep) === 'basic' && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Basic Information</h2>
                  <p className="text-gray-500 mt-1">Essential details about your product</p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter product title"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300 ${
                      errors.title ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => handleInputChange('sku', e.target.value)}
                      placeholder="e.g., SKU-001"
                      className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300 ${
                        errors.sku ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => handleInputChange('categoryId', e.target.value)}
                      className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300 bg-white ${
                        errors.categoryId ? 'border-red-500' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.categoryId && <p className="text-red-500 text-sm mt-1">{errors.categoryId}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Enter brand name"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Short Description *</label>
                  <textarea
                    value={form.shortDescription}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    placeholder="Brief product description (max 160 characters)"
                    maxLength={160}
                    rows={2}
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300 ${
                      errors.shortDescription ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  <p className="text-xs text-gray-400 mt-1">{form.shortDescription.length}/160 characters</p>
                  {errors.shortDescription && <p className="text-red-500 text-sm mt-1">{errors.shortDescription}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed product description"
                    rows={5}
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step: Attributes - Dynamic fields from category template */}
          {getStepName(activeStep) === 'attributes' && categoryTemplate?.attributes && (
            <div className="space-y-8 overflow-visible">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Product Attributes</h2>
                  <p className="text-gray-500 mt-1">Fill in the specific details for this category</p>
                </div>
              </div>

              {/* Completion Progress */}
              {(() => {
                const completion = getAttributesCompletion();
                return completion.required > 0 ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Required fields: {completion.filled}/{completion.required}</span>
                      <span className="text-sm font-bold text-blue-600">{completion.percentage}%</span>
                    </div>
                    <div className="h-2.5 bg-white/80 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 rounded-full"
                        style={{ width: `${completion.percentage}%` }}
                      />
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Variant Attributes Section - Highlighted */}
              {categoryTemplate.variantAttributes && categoryTemplate.variantAttributes.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 via-violet-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 shadow-sm overflow-visible">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Variant Attributes</h3>
                      <p className="text-xs text-purple-600">These create different product variants (e.g. Color, Size)</p>
                    </div>
                    <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      Creates Variants
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 overflow-visible">
                    {categoryTemplate.attributes
                      .filter(attr => categoryTemplate.variantAttributes?.includes(attr.key))
                      .map((attr) => (
                        <div key={attr.key} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-purple-100 overflow-visible relative">
                          {/* Color Type - Special Color Picker */}
                          {attr.type === 'color' && attr.options && (
                            <ColorSelect
                              value={dynamicAttributes[attr.key] || ''}
                              onChange={(value) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: value }))}
                              options={attr.options}
                              label={attr.label || attr.name || attr.key}
                              required={attr.required}
                              allowCreate={true}
                            />
                          )}

                          {/* Select Dropdown - Creatable */}
                          {attr.type === 'select' && attr.options && (
                            <CreatableSelect
                              value={dynamicAttributes[attr.key] || ''}
                              onChange={(value) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: value }))}
                              options={attr.options}
                              label={attr.label || attr.name || attr.key}
                              required={attr.required}
                              placeholder={`Select or type ${(attr.label || attr.name || attr.key).toLowerCase()}`}
                              variant="purple"
                              allowCreate={true}
                              createLabel="Add"
                            />
                          )}

                          {/* Text/Number Input */}
                          {(attr.type === 'text' || attr.type === 'number') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                {attr.label || attr.name || attr.key}
                                {attr.required && <span className="text-red-500 ml-1">*</span>}
                              </label>
                              <input
                                type={attr.type}
                                value={dynamicAttributes[attr.key] || ''}
                                onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                                placeholder={`Enter ${(attr.label || attr.name || attr.key).toLowerCase()}`}
                                className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all hover:border-purple-300"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Regular Attributes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-visible">
                {categoryTemplate.attributes
                  .filter(attr => !categoryTemplate.variantAttributes?.includes(attr.key))
                  .map((attr) => (
                  <div key={attr.key} className={`${attr.type === 'textarea' ? 'md:col-span-2' : ''} group overflow-visible relative`}>
                    {/* Text Input */}
                    {(attr.type === 'text' || attr.type === 'number') && (
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {attr.label || attr.name || attr.key}
                          {attr.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <input
                          type={attr.type}
                          value={dynamicAttributes[attr.key] || ''}
                          onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                          placeholder={`Enter ${(attr.label || attr.name || attr.key).toLowerCase()}`}
                          className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300 bg-white"
                        />
                      </div>
                    )}

                    {/* Textarea */}
                    {attr.type === 'textarea' && (
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {attr.label || attr.name || attr.key}
                          {attr.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <textarea
                          value={dynamicAttributes[attr.key] || ''}
                          onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                          placeholder={`Enter ${(attr.label || attr.name || attr.key).toLowerCase()}`}
                          rows={4}
                          className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300 resize-none"
                        />
                      </div>
                    )}

                    {/* Color Type - Special Color Picker */}
                    {attr.type === 'color' && attr.options && (
                      <ColorSelect
                        value={dynamicAttributes[attr.key] || ''}
                        onChange={(value) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: value }))}
                        options={attr.options}
                        label={attr.label || attr.name || attr.key}
                        required={attr.required}
                        allowCreate={true}
                      />
                    )}

                    {/* Select Dropdown - Creatable */}
                    {attr.type === 'select' && attr.options && (
                      <CreatableSelect
                        value={dynamicAttributes[attr.key] || ''}
                        onChange={(value) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: value }))}
                        options={attr.options}
                        label={attr.label || attr.name || attr.key}
                        required={attr.required}
                        placeholder={`Select or type ${(attr.label || attr.name || attr.key).toLowerCase()}`}
                        allowCreate={true}
                        createLabel="Add"
                      />
                    )}

                    {/* Multiselect - Creatable */}
                    {attr.type === 'multiselect' && attr.options && (
                      <CreatableMultiSelect
                        values={dynamicAttributes[attr.key]?.split(',').filter(Boolean) || []}
                        onChange={(values) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: values.join(',') }))}
                        options={attr.options}
                        label={attr.label || attr.name || attr.key}
                        required={attr.required}
                        placeholder={`Select or add ${(attr.label || attr.name || attr.key).toLowerCase()}`}
                        allowCreate={true}
                      />
                    )}

                    {/* Radio Buttons */}
                    {attr.type === 'radio' && attr.options && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          {attr.label || attr.name || attr.key}
                          {attr.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {attr.options.map((option) => (
                            <label
                              key={option}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all ${
                                dynamicAttributes[attr.key] === option
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 bg-white'
                              }`}
                            >
                              <input
                                type="radio"
                                name={attr.key}
                                value={option}
                                checked={dynamicAttributes[attr.key] === option}
                                onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                                className="sr-only"
                              />
                              <span className="text-sm font-medium">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Checkbox (for boolean) */}
                    {(attr.type === 'checkbox' || attr.type === 'boolean') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          {attr.label || attr.name || attr.key}
                          {attr.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <label className="relative inline-flex items-center gap-3 cursor-pointer">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={dynamicAttributes[attr.key] === 'true'}
                              onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.checked ? 'true' : 'false' }))}
                              className="sr-only peer"
                            />
                            <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600 shadow-inner"></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700">
                            {dynamicAttributes[attr.key] === 'true' ? 'Yes' : 'No'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Specifications */}
          {getStepName(activeStep) === 'specifications' && categoryTemplate?.specificationGroups && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Product Specifications</h2>
                  <p className="text-gray-500 mt-1">Detailed technical specifications help customers make informed decisions</p>
                </div>
              </div>

              {/* Overall Progress */}
              {(() => {
                const totalFilled = categoryTemplate.specificationGroups.reduce((sum, g) => {
                  return sum + g.specs.filter(f => specifications[g.name]?.[f.key]?.trim()).length;
                }, 0);
                const total = categoryTemplate.specificationGroups.reduce((sum, g) => sum + g.specs.length, 0);
                const percentage = total > 0 ? Math.round((totalFilled / total) * 100) : 0;
                
                return (
                  <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Overall: {totalFilled}/{total} specifications filled
                      </span>
                      <span className="text-sm font-bold text-cyan-600">{percentage}%</span>
                    </div>
                    <div
                      className="flex-1 h-2.5 rounded-full overflow-hidden bg-white/80 shadow-inner"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Specification Groups - Collapsible */}
              <div className="space-y-4">
                {categoryTemplate.specificationGroups.map((group) => {
                  const completion = getSpecGroupCompletion(group.name);
                  const isExpanded = expandedSpecGroups.has(group.name);
                  
                  return (
                    <div key={group.name} className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-200">
                      {/* Group Header */}
                      <button
                        type="button"
                        onClick={() => toggleSpecGroup(group.name)}
                        className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-gray-900">{group.name}</span>
                          <span className="text-sm text-gray-500">({group.specs.length} specs)</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Completion indicator */}
                          <div className="hidden sm:flex items-center gap-2">
                            <div className="hidden sm:block w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-cyan-500 transition-all"
                                style={{ width: `${completion.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-600">{completion.filled}/{completion.total}</span>
                          </div>
                          <svg
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {/* Group Content */}
                      {isExpanded && (
                        <div className="p-5 border-t border-gray-100 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {group.specs.map((spec) => (
                              <div key={spec.key}>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                  {spec.label || spec.key}
                                  {spec.unit && <span className="text-gray-400 ml-1">({spec.unit})</span>}
                                </label>
                                <input
                                  type="text"
                                  value={specifications[group.name]?.[spec.key] || ''}
                                  onChange={(e) => setSpecifications(prev => ({
                                    ...prev,
                                    [group.name]: { ...prev[group.name], [spec.key]: e.target.value }
                                  }))}
                                  placeholder={`Enter ${spec.label || spec.key}`}
                                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-sm"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Pricing */}
          {getStepName(activeStep) === 'pricing' && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Pricing & Inventory</h2>
                  <p className="text-gray-500 mt-1">Set competitive pricing and manage your stock levels</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selling Price (₹) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 ${
                      errors.price ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">MRP (₹) *</label>
                  <input
                    type="number"
                    value={form.mrp}
                    onChange={(e) => handleInputChange('mrp', e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 ${
                      errors.mrp ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.mrp && <p className="text-red-500 text-sm mt-1">{errors.mrp}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
                  <input
                    type="number"
                    value={form.salePrice}
                    onChange={(e) => handleInputChange('salePrice', e.target.value)}
                    placeholder="Optional discounted price"
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 ${
                      errors.salePrice ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.salePrice && <p className="text-red-500 text-sm mt-1">{errors.salePrice}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price (₹)</label>
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={(e) => handleInputChange('costPrice', e.target.value)}
                    placeholder="Your cost (for reference)"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Stock Quantity *</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => handleInputChange('stock', e.target.value)}
                    placeholder="0"
                    min="0"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 ${
                      errors.stock ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.stock && <p className="text-red-500 text-sm mt-1">{errors.stock}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Alert</label>
                  <input
                    type="number"
                    value={form.lowStockThreshold}
                    onChange={(e) => handleInputChange('lowStockThreshold', e.target.value)}
                    placeholder="10"
                    min="0"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300"
                  />
                  <p className="text-xs text-gray-400 mt-1">Alert when stock goes below this</p>
                </div>
              </div>

              {/* Dimensions Section */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Dimensions & Weight (Optional)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Weight (kg)</label>
                    <input
                      type="number"
                      value={form.weight}
                      onChange={(e) => handleInputChange('weight', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Width (cm)</label>
                    <input
                      type="number"
                      value={form.width}
                      onChange={(e) => handleInputChange('width', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">Height (cm)</label>
                    <input
                      type="number"
                      value={form.height}
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Variants */}
          {getStepName(activeStep) === 'variants' && categoryTemplate?.variantAttributes && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Product Variants</h2>
                      <p className="text-gray-500 mt-1">Manage different variations of your product</p>
                    </div>
                    <button
                      type="button"
                      onClick={addVariant}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-sm font-semibold rounded-xl shadow-md shadow-purple-500/30 hover:shadow-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Variant
                    </button>
                  </div>
                </div>
              </div>

              {/* Variant Attributes Info */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Variant Attributes</p>
                    <p className="text-sm text-purple-600 mt-1">
                      This category supports variants by: <span className="font-semibold">{categoryTemplate.variantAttributes.map(attr => {
                        const attrDef = categoryTemplate.attributes?.find(a => a.key === attr);
                        return attrDef?.label || attrDef?.name || attr;
                      }).join(', ')}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Variants List */}
              {variants.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-purple-200 rounded-2xl bg-purple-50/30">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Variants</h4>
                  <p className="text-gray-500 mb-4">Add product variants for different options</p>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-semibold shadow-md shadow-purple-500/30 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add First Variant
                  </button>
                </div>
              ) : (
                <div className="space-y-4 overflow-visible">
                  {variants.map((variant, index) => (
                    <div key={variant.id} className="border border-gray-200 rounded-xl overflow-visible">
                      {/* Variant Header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h4 className="font-medium text-gray-900">Variant {index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeVariant(variant.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Variant Form */}
                      <div className="p-4 space-y-4 overflow-visible">
                        {/* Variant Attributes */}
                        {categoryTemplate.variantAttributes.length > 0 && (
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100 overflow-visible">
                            <p className="text-xs font-medium text-orange-700 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Variant Attributes
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-visible">
                              {categoryTemplate.variantAttributes.map((attrKey) => {
                                const attrDef = categoryTemplate.attributes?.find(a => a.key === attrKey);
                                if (!attrDef) return null;
                                
                                return (
                                  <div key={attrKey} className="bg-white rounded-lg p-3 overflow-visible relative">
                                    {/* Color Type - Special Color Picker */}
                                    {attrDef.type === 'color' && attrDef.options ? (
                                      <ColorSelect
                                        value={variant.attributes[attrKey] || ''}
                                        onChange={(value) => updateVariantAttribute(variant.id, attrKey, value)}
                                        options={attrDef.options}
                                        label={attrDef.label || attrDef.name || attrKey}
                                        required={attrDef.required}
                                        allowCreate={true}
                                      />
                                    ) : attrDef.type === 'select' && attrDef.options ? (
                                      <CreatableSelect
                                        value={variant.attributes[attrKey] || ''}
                                        onChange={(value) => updateVariantAttribute(variant.id, attrKey, value)}
                                        options={attrDef.options}
                                        label={attrDef.label || attrDef.name || attrKey}
                                        required={attrDef.required}
                                        placeholder={`Select ${(attrDef.label || attrDef.name || attrKey).toLowerCase()}`}
                                        allowCreate={true}
                                        createLabel="Add"
                                      />
                                    ) : (
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                          {attrDef.label || attrDef.name || attrKey}
                                          {attrDef.required && <span className="text-red-500 ml-1">*</span>}
                                        </label>
                                        <input
                                          type={attrDef.type === 'number' ? 'number' : 'text'}
                                          value={variant.attributes[attrKey] || ''}
                                          onChange={(e) => updateVariantAttribute(variant.id, attrKey, e.target.value)}
                                          className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm hover:border-gray-300 transition-all"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* SKU and Title */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={variant.sku}
                                onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                placeholder="SKU-XXXX"
                                className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm hover:border-gray-300 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => updateVariant(variant.id, 'sku', generateVariantSKU())}
                                className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-medium rounded-lg transition-all shadow-md whitespace-nowrap"
                              >
                                Generate
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                            <input
                              type="text"
                              value={variant.title}
                              onChange={(e) => updateVariant(variant.id, 'title', e.target.value)}
                              placeholder="Variant title"
                              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all"
                            />
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                            <input
                              type="number"
                              value={variant.price}
                              onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price</label>
                            <input
                              type="number"
                              value={variant.salePrice}
                              onChange={(e) => updateVariant(variant.id, 'salePrice', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">MRP</label>
                            <input
                              type="number"
                              value={variant.mrp}
                              onChange={(e) => updateVariant(variant.id, 'mrp', e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                            <input
                              type="number"
                              value={variant.stock}
                              onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Add. Price</label>
                            <input
                              type="number"
                              value={variant.additionalPrice}
                              onChange={(e) => updateVariant(variant.id, 'additionalPrice', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-sm transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <label className="relative inline-flex items-center cursor-pointer mt-1">
                              <input
                                type="checkbox"
                                checked={variant.isActive}
                                onChange={(e) => updateVariant(variant.id, 'isActive', e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-10 h-5 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-500/20 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-500"></div>
                              <span className="ms-2 text-xs text-gray-600">{variant.isActive ? 'Active' : 'Off'}</span>
                            </label>
                          </div>
                        </div>

                        {/* Variant Images */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Images (up to 4)</label>
                          <div className="flex flex-wrap gap-2">
                            {/* Existing Images */}
                            {variant.existingImages.map((url, imgIndex) => (
                              <div key={`existing-${imgIndex}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                                <Image src={url} alt={`Variant ${index + 1} Image ${imgIndex + 1}`} fill className="object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeVariantExistingImage(variant.id, imgIndex)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            
                            {/* New Images */}
                            {variant.imagePreviewUrls.map((url, imgIndex) => (
                              <div key={`new-${imgIndex}`} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-green-400 group">
                                <Image src={url} alt={`Variant ${index + 1} New Image ${imgIndex + 1}`} fill className="object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeVariantNewImage(variant.id, imgIndex)}
                                  className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs"
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}

                            {(variant.existingImages.length + variant.images.length) < 4 && (
                              <button
                                type="button"
                                onClick={() => variantImageInputRefs.current[variant.id]?.click()}
                                className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 flex items-center justify-center text-gray-400 hover:text-purple-500 transition-all"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            )}

                            <input
                              ref={(el) => { variantImageInputRefs.current[variant.id] = el; }}
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              multiple
                              onChange={(e) => handleVariantImageSelect(variant.id, e)}
                              className="hidden"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step: Images */}
          {getStepName(activeStep) === 'images' && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-pink-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Product Images</h2>
                  <p className="text-gray-500 mt-1">Upload up to 5 product images. First image will be the main image.</p>
                </div>
              </div>

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Current Images</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {existingImages.map((url, index) => (
                      <div key={`existing-${index}`} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-200 group shadow-md hover:shadow-lg transition-shadow">
                        <Image src={url} alt={`Product ${index + 1}`} fill className="object-cover" />
                        <button
                          onClick={() => removeExistingImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {index === 0 && existingImages.length > 0 && (
                          <span className="absolute bottom-2 left-2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold rounded-full shadow-lg">Main</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Images */}
              {newImagePreviewUrls.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">New Images</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {newImagePreviewUrls.map((url, index) => (
                      <div key={`new-${index}`} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-green-400 group shadow-md hover:shadow-lg transition-shadow">
                        <Image src={url} alt={`New ${index + 1}`} fill className="object-cover" />
                        <button
                          onClick={() => removeNewImage(index)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <span className="absolute bottom-2 left-2 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-semibold rounded-full shadow-lg">New</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              {existingImages.length + newImages.length < 5 && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-3 border-dashed border-gray-300 rounded-2xl p-12 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50/50 transition-all group"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <svg className="w-10 h-10 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-semibold text-lg">Click to upload images</p>
                  <p className="text-sm text-gray-400 mt-2">PNG, JPG, WebP up to 5MB each</p>
                  <p className="text-xs text-gray-400 mt-1">You can upload {5 - existingImages.length - newImages.length} more image(s)</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Step: Additional */}
          {getStepName(activeStep) === 'additional' && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Additional Information</h2>
                  <p className="text-gray-500 mt-1">Add tags and highlights to improve discoverability</p>
                </div>
              </div>
              
              {/* Tags */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Tags</label>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tags"
                    className="flex-1 px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none bg-white transition-all"
                  />
                  <button
                    onClick={addTag}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 font-medium shadow-lg shadow-amber-500/30 transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.tags.map(tag => (
                    <span key={tag} className="px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-full text-sm font-medium flex items-center gap-2 border border-amber-200">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Highlights */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                <label className="block text-sm font-semibold text-gray-700 mb-3">Key Highlights</label>
                <div className="flex gap-3 mb-3">
                  <input
                    type="text"
                    value={highlightInput}
                    onChange={(e) => setHighlightInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                    placeholder="Add product highlight"
                    className="flex-1 px-4 py-3 border-2 border-green-200 rounded-xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 outline-none bg-white transition-all"
                  />
                  <button
                    onClick={addHighlight}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 font-medium shadow-lg shadow-green-500/30 transition-all"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {form.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-green-200 shadow-sm">
                      <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm text-gray-700 font-medium">{highlight}</span>
                      <button onClick={() => removeHighlight(highlight)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl p-6 mt-6 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Product Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Title</span>
                    <p className="text-gray-900 font-medium mt-1 truncate">{form.title || '-'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">SKU</span>
                    <p className="text-gray-900 font-medium mt-1">{form.sku || '-'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Price</span>
                    <p className="text-gray-900 font-bold mt-1">₹{form.price || '0'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Stock</span>
                    <p className="text-gray-900 font-medium mt-1">{form.stock || '0'} units</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Images</span>
                    <p className="text-gray-900 font-medium mt-1">{existingImages.length + newImagePreviewUrls.length} image(s)</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-100">
                    <span className="text-gray-500 text-xs uppercase tracking-wide">Status</span>
                    <p className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        form.status === 'active' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' :
                        form.status === 'draft' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 border border-yellow-200' :
                        'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {form.status.charAt(0).toUpperCase() + form.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-10 pt-8 border-t-2 border-gray-100">
            <button
              onClick={prevStep}
              disabled={activeStep === 1}
              className="px-8 py-3.5 text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 font-semibold disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <div className="flex items-center gap-4">
              <Link
                href="/seller/products"
                className="px-8 py-3.5 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-all"
              >
                Cancel
              </Link>
              {activeStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2"
                >
                  Next Step
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg shadow-green-500/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Product
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}