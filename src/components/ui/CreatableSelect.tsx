'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface CreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'purple' | 'gradient';
  icon?: React.ReactNode;
  allowCreate?: boolean;
  createLabel?: string;
  onCreateOption?: (value: string) => void;
  className?: string;
}

export default function CreatableSelect({
  value,
  onChange,
  options: initialOptions,
  placeholder = 'Select or type...',
  label,
  required = false,
  disabled = false,
  variant = 'default',
  icon,
  allowCreate = true,
  createLabel = 'Create',
  onCreateOption,
  className = '',
}: CreatableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<string[]>(initialOptions);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update options when initialOptions change
  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Check if current search term can create a new option
  const canCreate = allowCreate && 
    searchTerm.trim() !== '' && 
    !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase());

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const totalItems = filteredOptions.length + (canCreate ? 1 : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (canCreate && highlightedIndex === filteredOptions.length) {
          handleCreateOption();
        } else if (filteredOptions[highlightedIndex]) {
          selectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  }, [isOpen, filteredOptions, highlightedIndex, canCreate]);

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  const handleCreateOption = () => {
    const newOption = searchTerm.trim();
    if (newOption) {
      setOptions(prev => [...prev, newOption]);
      onChange(newOption);
      onCreateOption?.(newOption);
      setIsOpen(false);
      setSearchTerm('');
      setHighlightedIndex(0);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Get styling based on variant
  const getContainerStyles = () => {
    const base = 'relative w-full';
    return `${base} ${className}`;
  };

  const getInputStyles = () => {
    const base = 'w-full px-4 py-3 pr-10 border rounded-xl transition-all duration-200 outline-none text-sm';
    
    switch (variant) {
      case 'purple':
        return `${base} border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white`;
      case 'gradient':
        return `${base} border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gradient-to-r from-white to-indigo-50`;
      default:
        return `${base} border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white hover:border-gray-300`;
    }
  };

  const getDropdownStyles = () => {
    return 'absolute z-[9999] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-200';
  };

  return (
    <div className={getContainerStyles()} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative group">
        {/* Input Container */}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
              {icon}
            </div>
          )}
          
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm : value}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setHighlightedIndex(0);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value || placeholder}
            disabled={disabled}
            className={`${getInputStyles()} ${icon ? 'pl-10' : ''} ${value && !isOpen ? 'text-gray-900 font-medium' : 'text-gray-500'}`}
          />

          {/* Right side icons */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && !disabled && (
              <button
                type="button"
                onClick={clearSelection}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => !disabled && setIsOpen(!isOpen)}
              className={`p-1.5 rounded-lg transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
            >
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className={getDropdownStyles()}>
            {/* Search info bar */}
            {searchTerm && (
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <span className="font-medium">{filteredOptions.length}</span> results for &quot;{searchTerm}&quot;
              </div>
            )}

            {/* Options list */}
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 && !canCreate ? (
                <div className="px-4 py-6 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No options found</p>
                  <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                </div>
              ) : (
                <>
                  {filteredOptions.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => selectOption(option)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                        highlightedIndex === index 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50'
                      } ${value === option ? 'bg-blue-50' : ''}`}
                    >
                      {/* Check icon for selected */}
                      {value === option ? (
                        <span className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : (
                        <span className="w-5 h-5 border-2 border-gray-200 rounded-full flex-shrink-0" />
                      )}
                      
                      <span className={`text-sm ${value === option ? 'font-semibold' : 'font-medium'}`}>
                        {option}
                      </span>

                      {/* Matching text highlight */}
                      {searchTerm && (
                        <span className="ml-auto text-xs text-gray-400">Match</span>
                      )}
                    </button>
                  ))}

                  {/* Create new option */}
                  {canCreate && (
                    <button
                      type="button"
                      onClick={handleCreateOption}
                      onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 border-t border-gray-100 transition-colors ${
                        highlightedIndex === filteredOptions.length 
                          ? 'bg-green-50 text-green-700' 
                          : 'hover:bg-green-50 text-green-600'
                      }`}
                    >
                      <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium">
                        {createLabel} &quot;<span className="font-semibold">{searchTerm}</span>&quot;
                      </span>
                      <span className="ml-auto px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        New
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Keyboard hints */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">Esc</kbd>
                Close
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Multi-select version
interface CreatableMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  variant?: 'default' | 'purple' | 'gradient';
  allowCreate?: boolean;
  maxSelections?: number;
  className?: string;
}

export function CreatableMultiSelect({
  values,
  onChange,
  options: initialOptions,
  placeholder = 'Select multiple...',
  label,
  required = false,
  disabled = false,
  variant = 'default',
  allowCreate = true,
  maxSelections,
  className = '',
}: CreatableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<string[]>(initialOptions);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !values.includes(option)
  );

  const canCreate = allowCreate && 
    searchTerm.trim() !== '' && 
    !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase());

  const canAddMore = !maxSelections || values.length < maxSelections;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (values.includes(option)) {
      onChange(values.filter(v => v !== option));
    } else if (canAddMore) {
      onChange([...values, option]);
    }
  };

  const handleCreateOption = () => {
    const newOption = searchTerm.trim();
    if (newOption && canAddMore) {
      setOptions(prev => [...prev, newOption]);
      onChange([...values, newOption]);
      setSearchTerm('');
    }
  };

  const removeValue = (valueToRemove: string) => {
    onChange(values.filter(v => v !== valueToRemove));
  };

  const getInputStyles = () => {
    const base = 'w-full px-4 py-3 border rounded-xl transition-all duration-200 outline-none text-sm';
    
    switch (variant) {
      case 'purple':
        return `${base} border-purple-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white`;
      case 'gradient':
        return `${base} border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white`;
      default:
        return `${base} border-gray-200 focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white hover:border-gray-300`;
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected values */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {values.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-700 text-sm rounded-lg font-medium"
            >
              {val}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeValue(val)}
                  className="ml-1 p-0.5 hover:bg-blue-100 rounded transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={values.length === 0 ? placeholder : 'Add more...'}
          disabled={disabled || !canAddMore}
          className={getInputStyles()}
        />
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && canAddMore && (
        <div className="absolute z-[9999] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 && !canCreate ? (
              <div className="px-4 py-4 text-center text-sm text-gray-500">
                No more options available
              </div>
            ) : (
              <>
                {filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleOption(option)}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="w-5 h-5 border-2 border-gray-200 rounded flex-shrink-0" />
                    <span className="text-sm font-medium">{option}</span>
                  </button>
                ))}

                {canCreate && (
                  <button
                    type="button"
                    onClick={handleCreateOption}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 border-t border-gray-100 hover:bg-green-50 text-green-600 transition-colors"
                  >
                    <span className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium">
                      Create &quot;<span className="font-semibold">{searchTerm}</span>&quot;
                    </span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {maxSelections && (
        <p className="mt-1 text-xs text-gray-400">
          {values.length} / {maxSelections} selected
        </p>
      )}
    </div>
  );
}

// Color Select with preview
interface ColorSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label?: string;
  required?: boolean;
  disabled?: boolean;
  allowCreate?: boolean;
  className?: string;
}

// Color name to hex mapping
const colorMap: Record<string, string> = {
  'red': '#EF4444',
  'blue': '#3B82F6',
  'green': '#22C55E',
  'yellow': '#EAB308',
  'orange': '#F97316',
  'purple': '#A855F7',
  'pink': '#EC4899',
  'black': '#1F2937',
  'white': '#F9FAFB',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'brown': '#92400E',
  'navy': '#1E3A8A',
  'teal': '#14B8A6',
  'maroon': '#7F1D1D',
  'beige': '#D4C4A8',
  'gold': '#D4AF37',
  'silver': '#C0C0C0',
  'cream': '#FFFDD0',
  'olive': '#808000',
  'coral': '#FF7F50',
  'turquoise': '#40E0D0',
  'lavender': '#E6E6FA',
  'mint': '#98FF98',
  'peach': '#FFCBA4',
  'rose': '#FF007F',
  'sky blue': '#87CEEB',
  'forest green': '#228B22',
  'burgundy': '#800020',
  'charcoal': '#36454F',
  'indigo': '#4B0082',
  'magenta': '#FF00FF',
  'cyan': '#00FFFF',
  'lime': '#32CD32',
  'aqua': '#00FFFF',
  'slate': '#708090',
  'tan': '#D2B48C',
};

const getColorHex = (colorName: string): string => {
  const normalized = colorName.toLowerCase().trim();
  return colorMap[normalized] || '#6B7280'; // Default to gray if not found
};

export function ColorSelect({
  value,
  onChange,
  options: initialOptions,
  label,
  required = false,
  disabled = false,
  allowCreate = true,
  className = '',
}: ColorSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [options, setOptions] = useState<string[]>(initialOptions);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const canCreate = allowCreate && 
    searchTerm.trim() !== '' && 
    !options.some(opt => opt.toLowerCase() === searchTerm.toLowerCase());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectOption = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateOption = () => {
    const newOption = searchTerm.trim();
    if (newOption) {
      setOptions(prev => [...prev, newOption]);
      onChange(newOption);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected value display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-gray-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all flex items-center gap-3 text-left"
      >
        {value ? (
          <>
            <span
              className="w-6 h-6 rounded-lg shadow-inner border border-gray-200"
              style={{ backgroundColor: getColorHex(value) }}
            />
            <span className="text-sm font-medium text-gray-900 capitalize">{value}</span>
          </>
        ) : (
          <>
            <span className="w-6 h-6 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300" />
            <span className="text-sm text-gray-400">Select color...</span>
          </>
        )}
        <svg 
          className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-[9999] w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search colors..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
          </div>

          {/* Color grid */}
          <div className="p-3 max-h-60 overflow-y-auto">
            <div className="grid grid-cols-4 gap-2">
              {filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectOption(option)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                    value === option 
                      ? 'bg-blue-50 ring-2 ring-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-lg shadow-md border border-gray-200"
                    style={{ backgroundColor: getColorHex(option) }}
                  />
                  <span className="text-xs font-medium text-gray-700 capitalize truncate w-full text-center">
                    {option}
                  </span>
                </button>
              ))}
            </div>

            {filteredOptions.length === 0 && !canCreate && (
              <div className="text-center py-4 text-sm text-gray-500">
                No colors found
              </div>
            )}

            {/* Create new color */}
            {canCreate && (
              <button
                type="button"
                onClick={handleCreateOption}
                className="w-full mt-3 px-4 py-3 flex items-center gap-3 border-t border-gray-100 hover:bg-green-50 text-green-600 transition-colors rounded-lg"
              >
                <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </span>
                <span className="text-sm font-medium">
                  Add &quot;<span className="font-semibold capitalize">{searchTerm}</span>&quot;
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
