export default function SellerHighlights() {
  const highlights = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      title: 'Fast Local Delivery',
      description: 'Quick delivery to your doorstep',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      title: 'COD Available',
      description: 'Pay when you receive',
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      title: 'Trusted Seller',
      description: 'Verified local business',
    },
  ];

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-y border-blue-100">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {highlights.map((highlight, index) => (
            <div
              key={index}
              className="flex items-center gap-4 bg-white rounded-xl p-4 shadow-sm border border-blue-100"
            >
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#184979] to-[#1e5a8f] rounded-lg flex items-center justify-center text-white">
                {highlight.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                  {highlight.title}
                </h3>
                <p className="text-gray-600 text-xs md:text-sm">{highlight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
