'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LoaderContextType {
  showLoader: (message?: string) => void;
  hideLoader: () => void;
  isLoading: boolean;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

export function LoaderProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showLoader = (msg: string = 'Please wait...') => {
    setMessage(msg);
    setIsLoading(true);
  };

  const hideLoader = () => {
    setIsLoading(false);
    setMessage('');
  };

  return (
    <LoaderContext.Provider value={{ showLoader, hideLoader, isLoading }}>
      {children}
      {/* Global Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-10 shadow-2xl flex flex-col items-center gap-6 min-w-[280px] animate-in zoom-in-95 fade-in duration-300 relative overflow-hidden">
            {/* Background gradient animation */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#f26322]/5 to-[#184979]/5 animate-pulse"></div>
            
            {/* Spinner with multiple rings */}
            <div className="relative z-10">
              {/* Outer rotating ring */}
              <div className="w-24 h-24 border-4 border-gray-100 rounded-full"></div>
              <div className="w-24 h-24 border-4 border-[#f26322] border-t-transparent border-r-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              
              {/* Middle ring - opposite direction */}
              <div className="w-20 h-20 border-3 border-[#184979] border-b-transparent border-l-transparent rounded-full animate-spin-reverse absolute top-2 left-2" style={{ animationDuration: '1.5s' }}></div>
              
              {/* Center icon with pulse */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <svg className="w-7 h-7 text-white animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Message */}
            <p className="text-gray-800 font-bold text-lg text-center relative z-10">{message}</p>
            
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden relative z-10">
              <div className="h-full bg-gradient-to-r from-[#f26322] via-[#ff7a45] to-[#f26322] rounded-full animate-progress"></div>
            </div>
          </div>
          
          <style jsx>{`
            @keyframes spin-reverse {
              from { transform: rotate(360deg); }
              to { transform: rotate(0deg); }
            }
            .animate-spin-reverse {
              animation: spin-reverse 1s linear infinite;
            }
            @keyframes progress {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
            .animate-progress {
              animation: progress 1.5s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  const context = useContext(LoaderContext);
  if (context === undefined) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
}

// Standalone loader component for inline use
export function InlineLoader({ size = 'md', message }: { size?: 'sm' | 'md' | 'lg'; message?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex items-center justify-center gap-3">
      <div className={`${sizeClasses[size]} border-gray-200 border-t-[#f26322] rounded-full animate-spin`}></div>
      {message && <span className="text-gray-600 text-sm font-medium">{message}</span>}
    </div>
  );
}

// Button loader component
export function ButtonLoader({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin h-5 w-5 text-current ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

// Full page loader for page transitions
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // SSR: render a simple static loader
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f26322] mx-auto mb-4" style={{ borderColor: '#f26322 #e5e7eb' }} />
          <p className="text-gray-700 font-semibold text-lg">{message}</p>
        </div>
      </div>
    );
  }

  // Client: render the animated loader
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#184979] via-[#0f3a5f] to-[#0d2d4a]">
      <div className="flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
        {/* Logo animation with multiple rings */}
        <div className="relative">
          {/* Ping effect */}
          <div className="w-28 h-28 bg-[#f26322]/20 rounded-full animate-ping absolute"></div>
          
          {/* Rotating outer ring */}
          <div className="w-28 h-28 border-4 border-white/10 rounded-full"></div>
          <div className="w-28 h-28 border-4 border-[#f26322] border-t-transparent border-r-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          
          {/* Counter rotating inner ring */}
          <div className="w-20 h-20 border-3 border-white/30 border-b-transparent border-l-transparent rounded-full animate-spin-reverse absolute top-4 left-4" style={{ animationDuration: '2s' }}></div>
          
          {/* Center icon */}
          <div className="w-28 h-28 absolute top-0 left-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#f26322] to-[#ff7a45] rounded-full flex items-center justify-center animate-pulse shadow-2xl shadow-[#f26322]/50">
              <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Message */}
        <p className="text-white font-bold text-xl animate-pulse">{message}</p>
        
        {/* Loading bar with glow effect */}
        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden relative shadow-inner">
          <div className="h-full bg-gradient-to-r from-[#f26322] via-[#ff7a45] to-[#f26322] rounded-full animate-loading-bar shadow-lg shadow-[#f26322]/50"></div>
        </div>
        
        {/* Animated dots */}
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
      
      <style>{`
        @keyframes spin-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-reverse {
          animation: spin-reverse 1s linear infinite;
        }
        @keyframes loading-bar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 100%; margin-left: 0%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Consistent spinner component - Use this everywhere for loading states
export function Spinner({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}: { 
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; 
  color?: 'primary' | 'secondary' | 'white' | 'current';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4',
  };

  const colorClasses = {
    primary: 'border-[#184979] border-t-transparent',
    secondary: 'border-[#f26322] border-t-transparent',
    white: 'border-white border-t-transparent',
    current: 'border-current border-t-transparent',
  };

  return (
    <div className={`${sizeClasses[size]} ${colorClasses[color]} rounded-full animate-spin ${className}`}></div>
  );
}

// Centered loading state for sections
export function SectionLoader({ 
  message, 
  size = 'lg' 
}: { 
  message?: string; 
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]}`}>
      <Spinner size={size === 'sm' ? 'md' : 'lg'} color="primary" />
      {message && <p className="text-gray-600 mt-3 md:mt-4 text-sm md:text-base">{message}</p>}
    </div>
  );
}