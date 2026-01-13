import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // For Docker/Node.js deployment with dynamic routes

  // Enable React strict mode for better debugging
  reactStrictMode: true,

  // Optimize bundle and improve performance
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['react', 'react-dom'],
  },

  images: {
    // Enable image optimization
    formats: ['image/avif', 'image/webp'],
    // Minimize image sizes
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days cache
    remotePatterns: [
      {
        protocol: "https",
        hostname: "node-crm.s3.ap-south-1.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
    ],
  },

  // Headers for caching static assets
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
