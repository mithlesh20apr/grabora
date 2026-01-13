'use client';
import { useState } from 'react';

interface FilterState {
  categories: string[];
  brands: string[];
  priceRange: { min: number; max: number };
  rating: number;
  tags: string[];
  inStock: boolean;
}

interface ProductFilterProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export default function ProductFilter({ filters, onFilterChange }: ProductFilterProps) {
  const [priceMin, setPriceMin] = useState(filters.priceRange.min);
  const [priceMax, setPriceMax] = useState(filters.priceRange.max);
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    brands: true,
    price: true,
    rating: true,
    tags: false,
    availability: true,
  });

  // Mock data - replace with API
  const availableCategories = [
    { id: '1', name: 'Electronics', count: 156 },
    { id: '2', name: 'Fashion', count: 243 },
    { id: '3', name: 'Home & Kitchen', count: 189 },
    { id: '4', name: 'Sports & Fitness', count: 97 },
    { id: '5', name: 'Books', count: 432 },
    { id: '6', name: 'Toys & Games', count: 128 },
  ];

  const availableBrands = [
    { name: 'ALSU', count: 45 },
    { name: 'SoundMax', count: 32 },
    { name: 'StyleHub', count: 67 },
    { name: 'TechPro', count: 89 },
    { name: 'FashionX', count: 54 },
    { name: 'HomeEssentials', count: 41 },
  ];

  const availableTags = [
    'WOMEN BAGS', 'MARRONS', 'ELECTRONICS', 'AUDIO', 
    'MEN FASHION', 'SHIRTS', 'TRENDING', 'NEW ARRIVAL'
  ];

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter(c => c !== categoryId)
      : [...filters.categories, categoryId];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const handleBrandToggle = (brand: string) => {
    const newBrands = filters.brands.includes(brand)
      ? filters.brands.filter(b => b !== brand)
      : [...filters.brands, brand];
    onFilterChange({ ...filters, brands: newBrands });
  };

  const handleTagToggle = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    onFilterChange({ ...filters, tags: newTags });
  };

  const handlePriceApply = () => {
    onFilterChange({ ...filters, priceRange: { min: priceMin, max: priceMax } });
  };

  const handleRatingChange = (rating: number) => {
    onFilterChange({ ...filters, rating: filters.rating === rating ? 0 : rating });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm sticky top-4">
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-bold text-[#184979] flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
        </h3>
      </div>

      <div className="max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin">
        {/* Categories */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('categories')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-800">Categories</span>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSections.categories ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.categories && (
            <div className="px-4 pb-4 space-y-2">
              {availableCategories.map(category => (
                <label key={category.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category.id)}
                    onChange={() => handleCategoryToggle(category.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#184979] focus:ring-[#184979]"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-[#184979] flex-1">{category.name}</span>
                  <span className="text-xs text-gray-400">({category.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Brands */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('brands')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-800">Brands</span>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSections.brands ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.brands && (
            <div className="px-4 pb-4 space-y-2">
              {availableBrands.map(brand => (
                <label key={brand.name} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.brands.includes(brand.name)}
                    onChange={() => handleBrandToggle(brand.name)}
                    className="w-4 h-4 rounded border-gray-300 text-[#184979] focus:ring-[#184979]"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-[#184979] flex-1">{brand.name}</span>
                  <span className="text-xs text-gray-400">({brand.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Price Range */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('price')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-800">Price Range</span>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.price && (
            <div className="px-4 pb-4 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceMin}
                  onChange={(e) => setPriceMin(Number(e.target.value))}
                  placeholder="Min"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#184979] text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  value={priceMax}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  placeholder="Max"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#184979] text-sm"
                />
              </div>
              <button
                onClick={handlePriceApply}
                className="w-full bg-[#184979] text-white py-2 rounded-lg hover:bg-[#0d2d4a] transition-colors text-sm font-medium"
              >
                Apply
              </button>
              {/* Quick Price Filters */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {[
                  { label: 'Under ₹500', min: 0, max: 500 },
                  { label: '₹500 - ₹1000', min: 500, max: 1000 },
                  { label: '₹1000 - ₹2500', min: 1000, max: 2500 },
                  { label: '₹2500 - ₹5000', min: 2500, max: 5000 },
                  { label: 'Above ₹5000', min: 5000, max: 100000 },
                ].map((range) => (
                  <button
                    key={range.label}
                    onClick={() => {
                      setPriceMin(range.min);
                      setPriceMax(range.max);
                      onFilterChange({ ...filters, priceRange: { min: range.min, max: range.max } });
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('rating')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-800">Customer Rating</span>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSections.rating ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.rating && (
            <div className="px-4 pb-4 space-y-2">
              {[4, 3, 2, 1].map(rating => (
                <button
                  key={rating}
                  onClick={() => handleRatingChange(rating)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    filters.rating === rating ? 'bg-[#184979]/10 border border-[#184979]' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-700">& above</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => toggleSection('tags')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-800">Tags</span>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSections.tags ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.tags && (
            <div className="px-4 pb-4 flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-[#184979] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Availability */}
        <div>
          <button
            onClick={() => toggleSection('availability')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-gray-800">Availability</span>
            <svg
              className={`w-5 h-5 transition-transform ${expandedSections.availability ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedSections.availability && (
            <div className="px-4 pb-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => onFilterChange({ ...filters, inStock: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-[#184979] focus:ring-[#184979]"
                />
                <span className="text-sm text-gray-700 group-hover:text-[#184979]">In Stock Only</span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
