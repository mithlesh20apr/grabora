'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSeller, CreateProductData, ProductCategory, CategoryTemplate, ProductVariant } from '@/contexts/SellerContext';
import { PageLoader } from '@/components/ui/Loader';
import toast from 'react-hot-toast';
import CreatableSelect, { CreatableMultiSelect, ColorSelect } from '@/components/ui/CreatableSelect';
import QuickAddProduct from '@/components/seller/QuickAddProduct';
import { useSellerActivationStatus } from '@/hooks/useSellerActivationStatus';

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
  status: 'active' | 'draft';
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
  attributes: Record<string, string>;
  isActive: boolean;
}

export default function AddProductPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, isApproved, createProduct, getCategories, getCategoryTemplate } = useSeller();
  const { status: activationStatus } = useSellerActivationStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mode selection: 'select' | 'quick' | 'advanced'
  const [addMode, setAddMode] = useState<'select' | 'quick' | 'advanced'>('select');

  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeStep, setActiveStep] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  
  // Category template state
  // No category selected by default
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [categoryTemplate, setCategoryTemplate] = useState<CategoryTemplate | null>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [dynamicAttributes, setDynamicAttributes] = useState<Record<string, string>>({});
  const [specifications, setSpecifications] = useState<Record<string, Record<string, string>>>({});
  
  // Progressive disclosure - expanded specification groups
  const [expandedSpecGroups, setExpandedSpecGroups] = useState<Set<string>>(new Set());
  
  // Section completion tracking for visual feedback
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  
  // Variants state
  const [variants, setVariants] = useState<VariantForm[]>([]);
  const variantImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
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

  // Category search state
  const [categorySearch, setCategorySearch] = useState('');
  const [allCategories, setAllCategories] = useState<ProductCategory[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch all categories on mount
  useEffect(() => {
    if (!(isAuthenticated && isApproved)) return;
    const fetchCategories = async () => {
      const categoriesData = await getCategories();
      setAllCategories(categoriesData);
      setCategories(categoriesData);
      // Do NOT select any category by default
      setSelectedCategory(null);
      setCategoryTemplate(null);
      setForm(prev => ({ ...prev, categoryId: '' }));
    };
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isApproved, getCategories]);

  // Auto-save draft to localStorage (only for advanced mode)
  useEffect(() => {
    if (addMode !== 'advanced') return;

    const draftData = {
      form,
      dynamicAttributes,
      specifications,
      imagePreviewUrls,
      categoryId: selectedCategory?._id,
      lastSaved: new Date().toISOString(),
    };

    // Debounce auto-save to avoid too many writes
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('productDraft', JSON.stringify(draftData));
        console.log('✅ Draft auto-saved');
      } catch (error) {
        console.error('Failed to save draft:', error);
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [form, dynamicAttributes, specifications, selectedCategory, imagePreviewUrls, addMode]);

  // Load draft on mount
  useEffect(() => {
    if (addMode !== 'advanced') return;

    try {
      const savedDraft = localStorage.getItem('productDraft');
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        const lastSaved = new Date(draft.lastSaved);
        const hoursSinceLastSave = (Date.now() - lastSaved.getTime()) / (1000 * 60 * 60);

        // Only load draft if it's less than 24 hours old
        if (hoursSinceLastSave < 24) {
          // Ask user if they want to restore
          const shouldRestore = confirm(
            `Found an auto-saved draft from ${lastSaved.toLocaleString()}. Would you like to restore it?`
          );

          if (shouldRestore) {
            setForm(draft.form || form);
            setDynamicAttributes(draft.dynamicAttributes || {});
            setSpecifications(draft.specifications || {});
            setImagePreviewUrls(draft.imagePreviewUrls || []);
            toast.success('Draft restored successfully!');
          }
        } else {
          // Clean up old draft
          localStorage.removeItem('productDraft');
        }
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [addMode]); // Only run once when entering advanced mode

  // Filter categories based on search (client-side filtering for immediate response)
  useEffect(() => {
    if (!categorySearch.trim()) {
      setCategories(allCategories);
    } else {
      const searchLower = categorySearch.toLowerCase().trim();
      const filtered = allCategories.filter(cat => 
        cat.name.toLowerCase().includes(searchLower) ||
        cat.slug?.toLowerCase().includes(searchLower)
      );
      setCategories(filtered);
    }
  }, [categorySearch, allCategories]);

  // Fetch category template when category is selected
  const handleCategorySelect = useCallback(async (category: ProductCategory) => {
    setSelectedCategory(category);
    setForm(prev => ({ ...prev, categoryId: category._id }));

    // Reset dynamic fields
    setDynamicAttributes({});
    setSpecifications({});
    setCategoryTemplate(null);
    setExpandedSpecGroups(new Set());

    // Always try to fetch the template for this category
    setTemplateLoading(true);
    try {
      const template = await getCategoryTemplate(category._id);
      console.log('📋 Category Template Loaded:', template);
      console.log('🔢 Attributes Count:', template?.attributes?.length);
      console.log('📝 Attributes:', template?.attributes);
      console.log('🔄 Variant Attributes:', template?.variantAttributes);

      if (template) {
        setCategoryTemplate(template);
        // Initialize specifications with empty values for each group
        const initialSpecs: Record<string, Record<string, string>> = {};
        (template.specificationGroups ?? []).forEach(group => {
          initialSpecs[group.name] = {};
          (group.specs ?? []).forEach(spec => {
            initialSpecs[group.name][spec.key] = '';
          });
        });
        setSpecifications(initialSpecs);

        // Auto-expand first specification group for progressive disclosure
        const specGroups = template.specificationGroups ?? [];
        if (specGroups.length > 0) {
          setExpandedSpecGroups(new Set([specGroups[0].name]));
        }
      } else {
        console.warn('⚠️ No template returned for category:', category._id);
      }
    } catch (error) {
      console.error('❌ Error loading category template:', error);
      toast.error('Failed to load category template');
    } finally {
      setTemplateLoading(false);
    }
  }, [getCategoryTemplate]);

  const handleInputChange = (field: keyof ProductForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
        toast.error(`${file.name} is too large. Max 5MB allowed.`);
        return false;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`${file.name} is not a valid image format.`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreviewUrls(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
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
  
  const generateVariantSKU = (variantId: string) => {
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
    
    if (variant.images.length + files.length > 4) {
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

  const removeVariantImage = (variantId: string, imageIndex: number) => {
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
    const stepMap: Record<number, string> = { 1: 'category' };
    let currentId = 2;
    stepMap[currentId++] = 'basic';
    
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

    if (stepName === 'category') {
      if (!form.categoryId) {
        toast.error('Please select a category');
        return false;
      }
    }

    if (stepName === 'basic') {
      if (!form.title.trim()) newErrors.title = 'Product title is required';
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

  // Calculate total steps dynamically
  const getTotalSteps = (): number => {
    let count = 4; // category, basic, pricing, images, review = 5 base, minus 1 for review being last
    if (categoryTemplate?.attributes?.length) count++;
    if (categoryTemplate?.specificationGroups?.length) count++;
    if (categoryTemplate?.variantAttributes?.length) count++;
    return count + 1; // +1 for review
  };

  const nextStep = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, getTotalSteps()));
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    // Validate basic and pricing steps
    const basicStep = 2;
    let pricingStep = 3;
    if (categoryTemplate?.attributes?.length) pricingStep++;
    if (categoryTemplate?.specificationGroups?.length) pricingStep++;
    
    if (!validateStep(basicStep) || !validateStep(pricingStep)) {
      toast.error('Please fill all required fields');
      return;
    }

    if (images.length === 0) {
      toast.error('Please add at least one product image');
      return;
    }

    setIsLoading(true);
    try {
      // For now, we'll use the preview URLs as placeholders
      // In production, you would upload images first to get real URLs
      // using a separate image upload endpoint
      const uploadedImageUrls = imagePreviewUrls;

      // Build specifications array from the grouped specifications state
      const formattedSpecs = Object.entries(specifications)
        .filter(([, fields]) => Object.values(fields).some(v => v.trim() !== ''))
        .map(([groupName, fields]) => ({
          group: groupName,
          specs: Object.entries(fields)
            .filter(([, value]) => value.trim() !== '')
            .map(([key, value]) => {
              // Find the label from the template
              const group = categoryTemplate?.specificationGroups?.find(g => g.name === groupName);
              const field = group?.specs.find(f => f.key === key);
              return {
                key,
                label: field?.label || key,
                value
              };
            })
        }));

      // Filter out empty attributes
      const filteredAttributes: Record<string, string> = {};
      Object.entries(dynamicAttributes).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
          filteredAttributes[key] = value;
        }
      });

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
          images: v.imagePreviewUrls.length > 0 ? v.imagePreviewUrls : undefined,
          attributes: Object.keys(v.attributes).length > 0 ? v.attributes : undefined,
          isActive: v.isActive,
        }));

      const productData: CreateProductData = {
        title: form.title,
        sku: form.sku,
        categoryId: form.categoryId,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
        images: uploadedImageUrls,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        brand: form.brand || undefined,
        salePrice: form.salePrice ? parseFloat(form.salePrice) : undefined,
        mrp: form.mrp ? parseFloat(form.mrp) : undefined,
        costPrice: form.costPrice ? parseFloat(form.costPrice) : undefined,
        lowStockThreshold: form.lowStockThreshold ? parseInt(form.lowStockThreshold) : 10,
        tags: form.tags.length > 0 ? form.tags : undefined,
        highlights: form.highlights.length > 0 ? form.highlights : undefined,
        attributes: Object.keys(filteredAttributes).length > 0 ? filteredAttributes : undefined,
        specifications: formattedSpecs.length > 0 ? formattedSpecs : undefined,
        variants: formattedVariants.length > 0 ? formattedVariants : undefined,
        weight: form.weight ? parseFloat(form.weight) : undefined,
        dimensions: form.length && form.width && form.height ? {
          length: parseFloat(form.length),
          width: parseFloat(form.width),
          height: parseFloat(form.height),
        } : undefined,
      };

      const result = await createProduct(productData);
      
      if (result.success) {
        toast.success('Product created successfully!');
        router.push('/seller/products');
      } else {
        toast.error(result.message || 'Failed to create product');
      }
    } catch {
      toast.error('Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return <PageLoader message="Loading..." />;
  }

  if (!isAuthenticated || !isApproved) {
    return null;
  }

  // Step icons as SVG components
  const stepIcons: Record<string, React.ReactNode> = {
    category: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
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

  // Dynamic steps based on category template
  const getSteps = () => {
    const baseSteps = [
      { id: 1, name: 'Category', key: 'category' },
      { id: 2, name: 'Basic Info', key: 'basic' },
    ];
    
    // Add dynamic steps if category has template
    if (categoryTemplate) {
      if (categoryTemplate.attributes && categoryTemplate.attributes.length > 0) {
        baseSteps.push({ id: 3, name: 'Attributes', key: 'attributes' });
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

  // Mode Selection Screen
  if (addMode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-5xl w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/seller/products" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Products
            </Link>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">Add New Product</h1>
            <p className="text-gray-600">Choose how you want to add your product</p>
          </div>

          {/* Mode Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Quick Add */}
            <button
              onClick={() => setAddMode('quick')}
              className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-[#f26322] p-8 text-left transition-all hover:shadow-xl"
            >
              <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-[#f26322] to-[#ff7a45] text-white text-xs font-bold rounded-full">
                RECOMMENDED
              </div>

              <div className="w-16 h-16 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Quick Add</h3>
              <p className="text-gray-600 mb-4">Perfect for getting started fast</p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>One simple page</strong> - Just 6 essential fields</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Goes live instantly</strong> - No waiting</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Auto-generate SKU</strong> - Less typing</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Edit anytime</strong> - Add details later</span>
                </li>
              </ul>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">⏱️ Takes ~2 minutes</span>
                <span className="text-[#f26322] font-semibold group-hover:translate-x-1 transition-transform">
                  Start Quick Add →
                </span>
              </div>
            </button>

            {/* Advanced Add */}
            <button
              onClick={() => setAddMode('advanced')}
              className="group relative bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-500 p-8 text-left transition-all hover:shadow-xl"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-2">Advanced Add</h3>
              <p className="text-gray-600 mb-4">Complete control over every detail</p>

              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>8-step workflow</strong> - Comprehensive</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Product variants</strong> - Colors, sizes, etc.</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Detailed specifications</strong> - All attributes</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>SEO optimization</strong> - Better ranking</span>
                </li>
              </ul>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">⏱️ Takes ~10-15 minutes</span>
                <span className="text-blue-600 font-semibold group-hover:translate-x-1 transition-transform">
                  Start Advanced Add →
                </span>
              </div>
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-6">
            💡 Tip: Start with Quick Add and edit details later in Advanced mode
          </p>
        </div>
      </div>
    );
  }

  // Quick Add Mode
  if (addMode === 'quick') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 flex items-center justify-center p-4">
        <QuickAddProduct
          onCancel={() => setAddMode('select')}
          categories={categories}
        />
      </div>
    );
  }

  // Advanced Add Mode (existing flow)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setAddMode('select')}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Add New Product (Advanced)</h1>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">Step {activeStep} of {totalSteps}</p>
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Auto-saving
                  </span>
                </div>
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
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              const isCompleted = step.id < activeStep;
              const isClickable = step.id < activeStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center relative z-10">
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
        {/* Activation Info Banner */}
        {activationStatus && !activationStatus.isActive && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800">
                Your products will go live once onboarding is completed.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100">
          <div className="p-6 md:p-10 overflow-visible">
          {/* Step 1: Category Selection */}
          {getStepName(activeStep) === 'category' && (
            <div className="space-y-8">
              <div className="text-center max-w-lg mx-auto">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-4 shadow-lg shadow-blue-500/30">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">What are you selling?</h2>
                <p className="text-gray-500">Select a category that best describes your product. This helps buyers find your product easily.</p>
              </div>

              {/* Category Search */}
              <div className="max-w-xl mx-auto">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-20 transition-opacity"></div>
                  <div className="relative">
                    <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search categories..."
                      className="w-full pl-14 pr-12 py-4 bg-white border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-lg transition-all"
                      value={categorySearch}
                      onChange={e => setCategorySearch(e.target.value)}
                      id="category-search"
                    />
                    {categorySearch && (
                      <button
                        onClick={() => setCategorySearch('')}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {/* Search results count */}
                {categorySearch && (
                  <p className="text-sm text-gray-500 mt-3 text-center">
                    Found <span className="font-semibold text-gray-700">{categories.length}</span> {categories.length === 1 ? 'category' : 'categories'}
                  </p>
                )}
              </div>

              {/* Category Grid - Improved */}
              {categories.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {categories.map((category) => {
                    const isSelected = selectedCategory?._id === category._id;
                    return (
                      <button
                        key={category._id}
                        onClick={() => handleCategorySelect(category)}
                        className={`
                          group relative p-5 rounded-2xl border-2 transition-all duration-300 
                          ${isSelected
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg shadow-blue-500/20 scale-[1.02]'
                            : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md hover:-translate-y-1'
                          }
                        `}
                      >
                        {/* Category Icon/Image */}
                        <div className={`
                          relative w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center transition-all duration-300
                          ${isSelected 
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg' 
                            : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 group-hover:from-blue-100 group-hover:to-indigo-100 group-hover:text-blue-600'
                          }
                        `}>
                          {category.image ? (
                            <Image src={category.image} alt={category.name} width={36} height={36} className="rounded-xl" />
                          ) : (
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Category Name */}
                        <p className={`
                          text-sm font-semibold text-center leading-tight transition-colors
                          ${isSelected ? 'text-blue-700' : 'text-gray-700 group-hover:text-blue-600'}
                        `}>
                          {category.name}
                        </p>

                        {/* Template Badge */}
                        {category.hasTemplate && (
                          <div className="absolute top-3 right-3">
                            <span className="flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                          </div>
                        )}

                        {/* Selected Checkmark */}
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg ring-4 ring-white">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mx-auto mb-5">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-semibold text-lg">No categories found</p>
                  <p className="text-gray-400 mt-1">
                    {categorySearch ? `No results for "${categorySearch}"` : 'Loading categories...'}
                  </p>
                  {categorySearch && (
                    <button
                      onClick={() => setCategorySearch('')}
                      className="mt-4 px-5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-sm font-semibold transition-colors"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}

              {/* Template Loading Indicator */}
              {templateLoading && (
                <div className="flex items-center justify-center gap-3 py-6">
                  <div className="relative">
                    <div className="w-10 h-10 border-4 border-blue-200 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-10 h-10 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <span className="text-gray-600 font-medium">Loading category template...</span>
                </div>
              )}

              {/* Selected Category Info */}
              {selectedCategory && !templateLoading && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 shadow-lg shadow-blue-500/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white text-lg">{selectedCategory.name}</p>
                      <p className="text-blue-100 text-sm">
                        {categoryTemplate 
                          ? `${categoryTemplate.attributes?.length || 0} attributes • ${categoryTemplate.specificationGroups?.length || 0} specification groups`
                          : 'Standard product form'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setCategoryTemplate(null);
                        setForm(prev => ({ ...prev, categoryId: '' }));
                      }}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Basic Info */}
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
                  <p className="text-gray-500 mt-1">Tell us about your product</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Product Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter product title"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.title ? 'border-red-400 bg-red-50 shake-animation' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                  {errors.title && (
                    <div className="mt-2 flex items-center gap-2 text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{errors.title}</span>
                    </div>
                  )}
                </div>

                {/* Show selected category as readonly */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <div className="flex items-center gap-2 px-4 py-3.5 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <span className="text-gray-800 font-medium">{selectedCategory?.name || 'Not selected'}</span>
                    <button 
                      onClick={() => setActiveStep(1)} 
                      className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      Change
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">SKU <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    placeholder="Enter SKU"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.sku ? 'border-red-400 bg-red-50 shake-animation' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                  {errors.sku && (
                    <div className="mt-2 flex items-center gap-2 text-red-500 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{errors.sku}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                  <input
                    type="text"
                    value={form.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    placeholder="Enter brand name"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 hover:border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Short Description <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={form.shortDescription}
                    onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                    placeholder="Brief description (shown in product cards)"
                    maxLength={150}
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.shortDescription ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-400">{form.shortDescription.length}/150 characters</span>
                    {errors.shortDescription && (
                      <div className="flex items-center gap-1.5 text-red-500">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium">{errors.shortDescription}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Detailed product description..."
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 rounded-lg text-sm border border-gray-200 group hover:border-red-200 hover:bg-red-50 transition-all">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-gray-400 hover:text-red-500 ml-1 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Type a tag and press Enter..."
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300"
                      />
                    </div>
                    <button onClick={addTag} className="px-5 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-xl hover:from-gray-200 hover:to-gray-300 transition-all font-medium border border-gray-200">
                      Add
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">{form.tags.length}/10 tags added • Press Enter to add</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Highlights</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.highlights.map(highlight => (
                      <span key={highlight} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg text-sm border border-blue-200 group hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition-all">
                        <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {highlight}
                        <button onClick={() => removeHighlight(highlight)} className="text-blue-400 hover:text-red-500 ml-1 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      <input
                        type="text"
                        value={highlightInput}
                        onChange={(e) => setHighlightInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                        placeholder="Add a key feature..."
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300"
                      />
                    </div>
                    <button onClick={addHighlight} className="px-5 py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all font-medium border border-blue-200">
                      Add
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">{form.highlights.length}/10 highlights added</p>
                </div>
              </div>
            </div>
          )}

          {/* Attributes Step - Dynamic fields from category template */}
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
                  <p className="text-gray-500 mt-1">Fill in the specific details for <span className="font-semibold text-gray-700">{selectedCategory?.name}</span></p>
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
                        <div className="relative">
                          <input
                            type={attr.type}
                            value={dynamicAttributes[attr.key] || ''}
                            onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                            placeholder={`Enter ${(attr.label || attr.name || attr.key).toLowerCase()}`}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all hover:border-gray-300 bg-white"
                          />
                          {dynamicAttributes[attr.key] && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Textarea */}
                    {attr.type === 'textarea' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {attr.label || attr.name || attr.key}
                          {attr.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <textarea
                          value={dynamicAttributes[attr.key] || ''}
                          onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.value }))}
                          placeholder={`Enter ${(attr.label || attr.name || attr.key).toLowerCase()}`}
                          rows={3}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition-all hover:border-gray-300"
                        />
                        <div className="mt-1 text-xs text-gray-400 text-right">
                          {dynamicAttributes[attr.key]?.length || 0} characters
                        </div>
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

                    {/* Radio Buttons - Enhanced */}
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
                              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                dynamicAttributes[attr.key] === option
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-gray-300'
                              }`}>
                                {dynamicAttributes[attr.key] === option && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                )}
                              </span>
                              <span className="text-sm font-medium">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Checkbox (for boolean) - Enhanced */}
                    {(attr.type === 'checkbox' || attr.type === 'boolean') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          {attr.label || attr.name || attr.key}
                          {attr.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <label className="relative inline-flex items-center gap-3 cursor-pointer group/toggle">
                          <div className="relative">
                            <input
                              type="checkbox"
                              checked={dynamicAttributes[attr.key] === 'true'}
                              onChange={(e) => setDynamicAttributes(prev => ({ ...prev, [attr.key]: e.target.checked ? 'true' : 'false' }))}
                              className="sr-only peer"
                            />
                            <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-indigo-600 shadow-inner"></div>
                          </div>
                          <span className={`text-sm font-medium transition-colors ${
                            dynamicAttributes[attr.key] === 'true' ? 'text-blue-700' : 'text-gray-500'
                          }`}>
                            {dynamicAttributes[attr.key] === 'true' ? 'Yes' : 'No'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Helper tip */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Why are these important?</p>
                    <p className="text-sm text-blue-600 mt-1">These attributes help customers find your product and make informed decisions. Complete information leads to better visibility and sales.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Specifications Step - Grouped fields from category template */}
          {getStepName(activeStep) === 'specifications' && categoryTemplate?.specificationGroups && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Product Specifications</h2>
                  <p className="text-gray-500 mt-1">Add detailed specifications for <span className="font-semibold text-gray-700">{selectedCategory?.name}</span></p>
                </div>
              </div>

              {/* Overall Progress */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Overall Completion</span>
                  <span className="text-sm font-bold text-violet-600">
                    {(() => {
                      const totalFields = categoryTemplate.specificationGroups.reduce((sum, g) => sum + g.specs.length, 0);
                      const filledFields = categoryTemplate.specificationGroups.reduce((sum, g) => {
                        return sum + g.specs.filter(f => specifications[g.name]?.[f.key]?.trim()).length;
                      }, 0);
                      return `${filledFields}/${totalFields} fields`;
                    })()}
                  </span>
                </div>
                <div className="flex gap-1">
                  {categoryTemplate.specificationGroups.map((group) => {
                    const completion = getSpecGroupCompletion(group.name);
                    return (
                      <div
                        key={group.name}
                        className="flex-1 h-2.5 rounded-full overflow-hidden bg-white/80 shadow-inner"
                        title={`${group.name}: ${completion.percentage}%`}
                      >
                        <div 
                          className={`h-full transition-all duration-500 rounded-full ${
                            completion.percentage === 100 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : 
                            completion.percentage > 0 ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-gray-300'
                          }`}
                          style={{ width: `${completion.percentage}%` }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Collapsible specification groups */}
              <div className="space-y-3">
                {categoryTemplate.specificationGroups.map((group, groupIndex) => {
                  const isExpanded = expandedSpecGroups.has(group.name);
                  const completion = getSpecGroupCompletion(group.name);
                  
                  return (
                    <div key={group.name} className="border border-gray-200 rounded-xl overflow-hidden transition-all duration-200">
                      {/* Group Header - Clickable */}
                      <button
                        type="button"
                        onClick={() => toggleSpecGroup(group.name)}
                        className={`w-full px-5 py-4 flex items-center justify-between transition-colors ${
                          isExpanded ? 'bg-blue-50 border-b border-blue-100' : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                            completion.percentage === 100 
                              ? 'bg-green-100 text-green-700' 
                              : isExpanded 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-200 text-gray-600'
                          }`}>
                            {completion.percentage === 100 ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              groupIndex + 1
                            )}
                          </div>
                          <div className="text-left">
                            <h3 className="font-medium text-gray-800">{group.name}</h3>
                            <p className="text-xs text-gray-500">{completion.filled}/{completion.total} filled</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Mini progress bar */}
                          <div className="hidden sm:block w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                completion.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${completion.percentage}%` }}
                            />
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
                      
                      {/* Group Fields - Collapsible */}
                      {isExpanded && (
                        <div className="p-5 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {group.specs.map((field) => (
                              <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  {field.label || field.key}
                                  {field.unit && <span className="text-gray-400 ml-1">({field.unit})</span>}
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </label>
                                
                                {/* Text/Number Input */}
                                {(field.type === 'text' || field.type === 'number') && (
                                  <input
                                    type={field.type}
                                    value={specifications[group.name]?.[field.key] || ''}
                                    onChange={(e) => setSpecifications(prev => ({
                                      ...prev,
                                      [group.name]: {
                                        ...prev[group.name],
                                        [field.key]: e.target.value
                                      }
                                    }))}
                                    placeholder={`Enter ${(field.label || field.key).toLowerCase()}`}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none text-sm"
                                  />
                                )}

                                {/* Textarea */}
                                {field.type === 'textarea' && (
                                  <textarea
                                    value={specifications[group.name]?.[field.key] || ''}
                                    onChange={(e) => setSpecifications(prev => ({
                                      ...prev,
                                      [group.name]: {
                                        ...prev[group.name],
                                        [field.key]: e.target.value
                                      }
                                    }))}
                                    placeholder={`Enter ${(field.label || field.key).toLowerCase()}`}
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none text-sm"
                                  />
                                )}

                                {/* Select Dropdown */}
                                {field.type === 'select' && field.options && (
                                  <select
                                    value={specifications[group.name]?.[field.key] || ''}
                                    onChange={(e) => setSpecifications(prev => ({
                                      ...prev,
                                      [group.name]: {
                                        ...prev[group.name],
                                        [field.key]: e.target.value
                                      }
                                    }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white text-sm"
                                  >
                                    <option value="">Select {(field.label || field.key).toLowerCase()}</option>
                                    {field.options.map((option) => (
                                      <option key={option} value={option}>{option}</option>
                                    ))}
                                  </select>
                                )}

                                {/* Multiselect */}
                                {field.type === 'multiselect' && field.options && (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-2">
                                      {field.options.map((option) => {
                                        const currentValues = specifications[group.name]?.[field.key]?.split(',').filter(Boolean) || [];
                                        const isSelected = currentValues.includes(option);
                                        return (
                                          <button
                                            key={option}
                                            type="button"
                                            onClick={() => {
                                              const newValues = isSelected
                                                ? currentValues.filter(v => v !== option)
                                                : [...currentValues, option];
                                              setSpecifications(prev => ({
                                                ...prev,
                                                [group.name]: {
                                                  ...prev[group.name],
                                                  [field.key]: newValues.join(',')
                                                }
                                              }));
                                            }}
                                            className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                                              isSelected
                                                ? 'bg-blue-100 border-blue-300 text-blue-700'
                                                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                                            }`}
                                          >
                                            {option}
                                          </button>
                                        );
                                      })}
                                    </div>
                                    {specifications[group.name]?.[field.key] && (
                                      <p className="text-xs text-gray-500">
                                        Selected: {specifications[group.name]?.[field.key].split(',').filter(Boolean).join(', ')}
                                      </p>
                                    )}
                                  </div>
                                )}

                                {/* Boolean/Checkbox */}
                                {field.type === 'boolean' && (
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={specifications[group.name]?.[field.key] === 'true' || specifications[group.name]?.[field.key] === 'Yes'}
                                      onChange={(e) => setSpecifications(prev => ({
                                        ...prev,
                                        [group.name]: {
                                          ...prev[group.name],
                                          [field.key]: e.target.checked ? 'Yes' : 'No'
                                        }
                                      }))}
                                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-600"
                                    />
                                    <span className="text-gray-700 text-sm">Yes</span>
                                  </label>
                                )}
                              </div>
                            ))}
                          </div>
                          
                          {/* Quick action to expand next group */}
                          {(() => {
                            const specGroups = categoryTemplate?.specificationGroups ?? [];
                            return (
                              specGroups.length > 0 &&
                              groupIndex < specGroups.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextGroup = specGroups[groupIndex + 1];
                                    setExpandedSpecGroups(prev => {
                                      const newSet = new Set(prev);
                                      newSet.delete(group.name);
                                      newSet.add(nextGroup.name);
                                      return newSet;
                                    });
                                  }}
                                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                >
                                  Continue to {specGroups[groupIndex + 1].name}
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              )
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Expand/Collapse All */}
              <div className="flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setExpandedSpecGroups(new Set((categoryTemplate?.specificationGroups ?? []).map(g => g.name)))}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedSpecGroups(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                  Collapse All
                </button>
              </div>

              {/* Progress indicator */}
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-green-800 font-medium">Almost there!</p>
                    <p className="text-sm text-green-600">Just a few more steps to list your product.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Stock Step */}
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
                  <p className="text-gray-500 mt-1">Set your pricing and stock levels</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="0.00"
                      className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.price ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                    />
                  </div>
                  {errors.price && (
                    <div className="mt-2 flex items-center gap-1.5 text-red-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{errors.price}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <input
                      type="number"
                      value={form.salePrice}
                      onChange={(e) => handleInputChange('salePrice', e.target.value)}
                      placeholder="0.00"
                      className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.salePrice ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                    />
                  </div>
                  {errors.salePrice && (
                    <div className="mt-2 flex items-center gap-1.5 text-red-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{errors.salePrice}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">MRP (₹) <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <input
                      type="number"
                      value={form.mrp}
                      onChange={(e) => handleInputChange('mrp', e.target.value)}
                      placeholder="0.00"
                      className={`w-full pl-10 pr-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.mrp ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                    />
                  </div>
                  {errors.mrp && (
                    <div className="mt-2 flex items-center gap-1.5 text-red-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{errors.mrp}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <input
                      type="number"
                      value={form.costPrice}
                      onChange={(e) => handleInputChange('costPrice', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 hover:border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => handleInputChange('stock', e.target.value)}
                    placeholder="0"
                    className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errors.stock ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  />
                  {errors.stock && (
                    <div className="mt-2 flex items-center gap-1.5 text-red-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">{errors.stock}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Low Stock Threshold</label>
                  <input
                    type="number"
                    value={form.lowStockThreshold}
                    onChange={(e) => handleInputChange('lowStockThreshold', e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-3.5 border-2 border-gray-200 hover:border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-400">Alert when stock goes below this level</p>
                </div>
              </div>

              {/* Discount Preview */}
              {form.price && form.mrp && parseFloat(form.price) < parseFloat(form.mrp) && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-green-800">
                        {Math.round(((parseFloat(form.mrp) - parseFloat(form.price)) / parseFloat(form.mrp)) * 100)}% Discount
                      </p>
                      <p className="text-sm text-green-600">
                        Customer saves ₹{(parseFloat(form.mrp) - parseFloat(form.price)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Variants Step */}
          {getStepName(activeStep) === 'variants' && categoryTemplate?.variantAttributes && (
            <div className="space-y-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/30">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Product Variants</h2>
                    <p className="text-gray-500 mt-1">Add different variations like size, color, etc.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-green-500/30 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Variant
                </button>
              </div>

              {/* Variant Attributes Info */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Variant Attributes for {selectedCategory?.name}</p>
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
                <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Variants Added</h3>
                  <p className="text-gray-500 mb-4">Click &quot;Add Variant&quot; to create product variations</p>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add First Variant
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {variants.map((variant, index) => (
                    <div key={variant.id} className="border-2 border-gray-200 rounded-2xl overflow-hidden hover:border-purple-300 hover:shadow-lg transition-all duration-300 bg-white">
                      {/* Variant Header */}
                      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-purple-50 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">Variant {index + 1}</h3>
                            {variant.title && <p className="text-xs text-gray-500">{variant.title}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                            variant.isActive 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {variant.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeVariant(variant.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Variant Form */}
                      <div className="p-5 space-y-5">
                        {/* Variant Attributes */}
                        {categoryTemplate.variantAttributes.length > 0 && (
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                            <p className="text-xs font-medium text-purple-700 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                              </svg>
                              Variant Attributes
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {categoryTemplate.variantAttributes.map((attrKey) => {
                                const attrDef = categoryTemplate.attributes?.find(a => a.key === attrKey);
                                if (!attrDef) return null;
                                
                                return (
                                  <div key={attrKey} className="bg-white rounded-lg p-3">
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
                                        variant="purple"
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
                                          placeholder={`Enter ${(attrDef.label || attrDef.name || attrKey).toLowerCase()}`}
                                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm hover:border-purple-300 transition-colors"
                                        />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* SKU and Title Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              SKU <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                              <div className="relative flex-1">
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                </div>
                                <input
                                  type="text"
                                  value={variant.sku}
                                  onChange={(e) => updateVariant(variant.id, 'sku', e.target.value)}
                                  placeholder="SKU-BRAND-XXXX"
                                  className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none text-sm hover:border-gray-300 transition-colors"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => updateVariant(variant.id, 'sku', generateVariantSKU(variant.id))}
                                className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Auto
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Title <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={variant.title}
                              onChange={(e) => updateVariant(variant.id, 'title', e.target.value)}
                              placeholder="e.g., Black - Medium"
                              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none text-sm hover:border-gray-300 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Pricing Row - Enhanced */}
                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Pricing & Stock
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                Price <span className="text-red-500">*</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                <input
                                  type="number"
                                  value={variant.price}
                                  onChange={(e) => updateVariant(variant.id, 'price', e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none text-sm bg-white hover:border-gray-300 transition-colors"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Sale Price</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                <input
                                  type="number"
                                  value={variant.salePrice}
                                  onChange={(e) => updateVariant(variant.id, 'salePrice', e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none text-sm bg-white hover:border-gray-300 transition-colors"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">MRP</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                <input
                                  type="number"
                                  value={variant.mrp}
                                  onChange={(e) => updateVariant(variant.id, 'mrp', e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none text-sm bg-white hover:border-gray-300 transition-colors"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Stock</label>
                              <input
                                type="number"
                                value={variant.stock}
                                onChange={(e) => updateVariant(variant.id, 'stock', e.target.value)}
                                placeholder="0"
                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none text-sm bg-white hover:border-gray-300 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Extra</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">+₹</span>
                                <input
                                  type="number"
                                  value={variant.additionalPrice}
                                  onChange={(e) => updateVariant(variant.id, 'additionalPrice', e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none text-sm bg-white hover:border-gray-300 transition-colors"
                                />
                              </div>
                            </div>
                            <div className="flex flex-col justify-end">
                              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={variant.isActive}
                                  onChange={(e) => updateVariant(variant.id, 'isActive', e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-600 shadow-inner"></div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Variant Images - Enhanced */}
                        <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-100">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Variant Images
                            <span className="text-pink-400 font-normal">({variant.imagePreviewUrls.length}/4)</span>
                          </label>
                          <div className="flex flex-wrap gap-3">
                            {variant.imagePreviewUrls.map((url, imgIndex) => (
                              <div key={imgIndex} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md group">
                                <Image src={url} alt={`Variant ${index + 1} Image ${imgIndex + 1}`} fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    type="button"
                                    onClick={() => removeVariantImage(variant.id, imgIndex)}
                                    className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transform scale-0 group-hover:scale-100 transition-transform"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                {imgIndex === 0 && (
                                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded">
                                    Main
                                  </span>
                                )}
                              </div>
                            ))}

                            {variant.images.length < 4 && (
                              <button
                                type="button"
                                onClick={() => variantImageInputRefs.current[variant.id]?.click()}
                                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 flex flex-col items-center justify-center text-gray-400 hover:text-purple-500 transition-all"
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

              {/* Helper tip */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-800 font-medium">Tip: Creating Variants</p>
                    <p className="text-sm text-blue-600 mt-1">Each variant should have a unique SKU and specific attribute values (e.g., Color: Black, Size: M). Variants allow customers to select different options for the same product.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Images Step */}
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
                  <p className="text-gray-500 mt-1">Add up to 5 high-quality images <span className="text-red-500">*</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {imagePreviewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-gray-200 group shadow-md hover:shadow-lg transition-shadow">
                    <Image src={url} alt={`Preview ${index + 1}`} fill className="object-cover" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-2 left-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-lg">
                        Primary
                      </span>
                    )}
                  </div>
                ))}

                {images.length < 5 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 hover:border-pink-500 hover:bg-pink-50 flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-pink-600 transition-all"
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Add Image</span>
                    <span className="text-xs text-gray-400">{5 - images.length} remaining</span>
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-blue-800">Image Guidelines</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-1.5 ml-11">
                  <li>• Use high-quality images (min 500x500 pixels)</li>
                  <li>• White or light background preferred</li>
                  <li>• Show product from multiple angles</li>
                  <li>• Max file size: 5MB per image</li>
                </ul>
              </div>
            </div>
          )}

          {/* Review Step */}
          {getStepName(activeStep) === 'review' && (
            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Review Product</h2>
                  <p className="text-gray-500 mt-1">Review your product before publishing</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Product Preview Card */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
                  <div className="aspect-square relative rounded-xl overflow-hidden bg-white mb-4 shadow-md">
                    {imagePreviewUrls[0] ? (
                      <Image src={imagePreviewUrls[0]} alt="Preview" fill className="object-contain" />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800 mb-1 text-lg">{form.title || 'Product Title'}</h3>
                  <p className="text-sm text-gray-500 mb-3">{form.shortDescription}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-gray-900">₹{form.salePrice || form.price || '0'}</span>
                    {form.mrp && parseFloat(form.mrp) > parseFloat(form.salePrice || form.price) && (
                      <>
                        <span className="text-sm text-gray-400 line-through">₹{form.mrp}</span>
                        <span className="text-sm bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                          {Math.round(((parseFloat(form.mrp) - parseFloat(form.salePrice || form.price)) / parseFloat(form.mrp)) * 100)}% off
                        </span>
                      </>
                    )}
                  </div>
                  {/* Image count */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {imagePreviewUrls.slice(0, 3).map((url, i) => (
                        <div key={i} className="w-8 h-8 rounded-lg border-2 border-white overflow-hidden">
                          <Image src={url} alt="" width={32} height={32} className="object-cover" />
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-500">{imagePreviewUrls.length} image{imagePreviewUrls.length !== 1 ? 's' : ''} uploaded</p>
                  </div>
                </div>

                {/* Product Details */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200">
                    <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Basic Details
                    </h4>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between items-center py-1">
                        <dt className="text-gray-500">Category</dt>
                        <dd className="font-semibold text-gray-800 bg-gray-200 px-2 py-0.5 rounded-lg">
                          {categories.find(c => c._id === form.categoryId)?.name || selectedCategory?.name || '-'}
                        </dd>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <dt className="text-gray-500">Brand</dt>
                        <dd className="font-medium text-gray-800">{form.brand || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">SKU</dt>
                        <dd className="font-medium text-gray-800">{form.sku || '-'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Stock</dt>
                        <dd className="font-medium text-gray-800">{form.stock || '0'} units</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-800 mb-3">Pricing</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">MRP</dt>
                        <dd className="font-medium text-gray-800">₹{form.mrp || '0'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Selling Price</dt>
                        <dd className="font-medium text-green-600">₹{form.price || '0'}</dd>
                      </div>
                      {form.costPrice && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Cost Price</dt>
                          <dd className="font-medium text-gray-800">₹{form.costPrice}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                </div>

                {/* Attributes & Specifications Summary */}
                <div className="space-y-4">
                  {/* Dynamic Attributes */}
                  {categoryTemplate?.attributes && Object.keys(dynamicAttributes).filter(k => dynamicAttributes[k]?.trim()).length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h4 className="font-medium text-purple-800 mb-3 flex items-center gap-2">
                        <span>🏷️</span> Attributes
                      </h4>
                      <dl className="space-y-2 text-sm">
                        {categoryTemplate.attributes
                          .filter(attr => dynamicAttributes[attr.key]?.trim())
                          .slice(0, 5)
                          .map(attr => (
                            <div key={attr.key} className="flex justify-between">
                              <dt className="text-purple-600">{attr.label}</dt>
                              <dd className="font-medium text-purple-800">
                                {dynamicAttributes[attr.key]}
                                {categoryTemplate.variantAttributes?.includes(attr.key) && (
                                  <span className="ml-1 text-xs text-purple-500">(variant)</span>
                                )}
                              </dd>
                            </div>
                          ))}
                        {Object.keys(dynamicAttributes).filter(k => dynamicAttributes[k]?.trim()).length > 5 && (
                          <p className="text-xs text-purple-500 mt-2">
                            +{Object.keys(dynamicAttributes).filter(k => dynamicAttributes[k]?.trim()).length - 5} more attributes
                          </p>
                        )}
                      </dl>
                    </div>
                  )}

                  {/* Specifications Summary */}
                  {categoryTemplate?.specificationGroups && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                        <span>📋</span> Specifications
                      </h4>
                      <div className="space-y-2">
                        {categoryTemplate.specificationGroups.map(group => {
                          const completion = getSpecGroupCompletion(group.name);
                          if (completion.filled === 0) return null;
                          return (
                            <div key={group.name} className="flex items-center justify-between text-sm">
                              <span className="text-blue-600">{group.name}</span>
                              <span className="text-blue-800 font-medium">{completion.filled}/{completion.total}</span>
                            </div>
                          );
                        })}
                      </div>
                      {(() => {
                        const totalFilled = categoryTemplate.specificationGroups.reduce((sum, g) => {
                          return sum + g.specs.filter(f => specifications[g.name]?.[f.key]?.trim()).length;
                        }, 0);
                        const total = categoryTemplate.specificationGroups.reduce((sum, g) => sum + g.specs.length, 0);
                        return (
                          <div className="mt-3 pt-3 border-t border-blue-100">
                            <p className="text-xs text-blue-600">
                              Total: {totalFilled}/{total} specifications filled
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Tags */}
                  {form.tags.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-medium text-gray-800 mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {form.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variants Summary */}
                  {variants.length > 0 && (
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <h4 className="font-medium text-indigo-800 mb-3 flex items-center gap-2">
                        <span>📦</span> Variants ({variants.length})
                      </h4>
                      <div className="space-y-2">
                        {variants.slice(0, 3).map((variant, index) => (
                          <div key={variant.id} className="flex items-center justify-between text-sm bg-white/60 rounded-lg px-3 py-2">
                            <div>
                              <span className="font-medium text-indigo-900">{variant.title || `Variant ${index + 1}`}</span>
                              <span className="text-indigo-600 text-xs ml-2">({variant.sku || 'No SKU'})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-indigo-700 font-medium">₹{variant.price || '0'}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${variant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                {variant.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        ))}
                        {variants.length > 3 && (
                          <p className="text-xs text-indigo-600 mt-2">
                            +{variants.length - 3} more variant{variants.length - 3 > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Selection */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-800 mb-3">Publishing Options</h4>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={form.status === 'active'}
                      onChange={() => handleInputChange('status', 'active')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Publish immediately</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={form.status === 'draft'}
                      onChange={() => handleInputChange('status', 'draft')}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Save as draft</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-10 pt-8 border-t border-gray-100">
            <button
              onClick={prevStep}
              disabled={activeStep === 1}
              className={`group flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeStep === 1
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {getStepName(activeStep) !== 'review' ? (
              <button
                onClick={nextStep}
                className="group flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] transition-all"
              >
                Continue
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="group flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Product...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {form.status === 'active' ? 'Publish Product' : 'Save as Draft'}
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
