'use client';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo/Icon */}
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-[#184979]/10 rounded-full animate-ping absolute inset-0"></div>
          <div className="w-16 h-16 bg-gradient-to-br from-[#184979] to-[#0d2d4a] rounded-full flex items-center justify-center relative mx-auto">
            <svg className="w-8 h-8 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
            </svg>
          </div>
        </div>
        
        {/* Loading Bar */}
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden mx-auto mb-4">
          <div 
            className="h-full bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full"
            style={{
              animation: 'loadingBar 1s ease-in-out infinite',
            }}
          ></div>
        </div>
        
        {/* Loading Text */}
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
      
      <style jsx>{`
        @keyframes loadingBar {
          0% { width: 0%; transform: translateX(0%); }
          50% { width: 70%; transform: translateX(0%); }
          100% { width: 0%; transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}
