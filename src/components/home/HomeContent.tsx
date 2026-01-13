'use client';

import { useEffect, useState } from 'react';
import { usePincode } from '@/contexts/PincodeContext';
import {
  HomeData,
  NearbySeller,
  HighDemandProduct,
  fetchHomeData,
  fetchPincodeData,
} from '@/services/home';
import HeroBanner from './HeroBanner';
import FeaturedCategories from './FeaturedCategories';
import FlashSale from './FlashSale';
import ProductSection from './ProductSection';
import NearbySellersSection from './NearbySellersSection';
import HighDemandSection from './HighDemandSection';
import PincodeIndicator from '../ui/PincodeIndicator';

interface HomeContentProps {
  initialData: HomeData;
}

export default function HomeContent({ initialData }: HomeContentProps) {
  const { pincode, isLoading: isPincodeLoading } = usePincode();
  const [homeData, setHomeData] = useState<HomeData>(initialData);
  const [nearbySellers, setNearbySellers] = useState<NearbySeller[]>([]);
  const [highDemandProducts, setHighDemandProducts] = useState<HighDemandProduct[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Fetch data when pincode changes
  useEffect(() => {
    if (isPincodeLoading) return;

    async function loadData() {
      setIsLoadingData(true);
      try {
        if (pincode) {
          // Fetch all data with pincode
          const data = await fetchPincodeData(pincode);
          setHomeData(data.homeData);
          setNearbySellers(data.nearbySellers);
          setHighDemandProducts(data.highDemandProducts);
        } else {
          // Fetch only home data without pincode
          const data = await fetchHomeData();
          setHomeData(data);
          setNearbySellers([]);
          setHighDemandProducts([]);
        }
      } catch (error) {
        console.error('Error loading home data:', error);
      } finally {
        setIsLoadingData(false);
      }
    }

    loadData();
  }, [pincode, isPincodeLoading]);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 font-sans">
        {/* 1. Location bar (Pincode + Change) */}
        {pincode && <PincodeIndicator />}

        {/* Loading overlay */}
        {isLoadingData && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#184979] border-t-transparent"></div>
              <span className="text-gray-700 font-semibold">Updating content...</span>
            </div>
          </div>
        )}

        {/* 2. Hero Banner (Flash / Offers) */}
        <HeroBanner banners={homeData.banners} />

        {/* 3. Sellers Near You ⭐ (MOST IMPORTANT) */}
        {pincode && nearbySellers.length > 0 && (
          <NearbySellersSection sellers={nearbySellers} />
        )}

        {/* 4. High Demand Near You 🔥 */}
        {pincode && highDemandProducts.length > 0 && (
          <HighDemandSection products={highDemandProducts} />
        )}

        {/* 5. Categories (Scrollable) */}
        <FeaturedCategories categories={homeData.featuredCategories} />

        {/* 6. Flash Sale */}
        <FlashSale products={homeData.flashSale} />

        {/* 7. Trending Products */}
        <ProductSection
          title="Trending Products"
          subtitle="Most popular items right now"
          products={homeData.trendingProducts}
          icon={
            <svg className="w-10 h-10 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
          bgColor="bg-white"
        />

        {/* 8. New Arrivals */}
        <ProductSection
          title="New Arrivals"
          subtitle="Fresh products just for you"
          products={homeData.newArrivals}
          icon={
            <svg className="w-10 h-10 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          }
          bgColor="bg-gray-50"
        />

        {/* 9. Best Sellers */}
        <ProductSection
          title="Best Sellers"
          subtitle="Customer favorites & top-rated products"
          products={homeData.bestSellers?.[0]?.products || []}
          icon={
            <svg className="w-10 h-10 text-[#f26322]" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          }
          bgColor="bg-white"
        />

        {/* Newsletter Section */}
        <section className="py-8 md:py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#184979] via-[#1e5a8f] to-[#0d2d4a]">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#f26322]/30 via-transparent to-[#184979]/40"></div>
          </div>

          <div className="absolute inset-0 hidden md:block">
            <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-gradient-radial from-[#f26322]/40 via-[#ff7a45]/20 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
            <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-radial from-white/30 via-white/10 to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '5s' }}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-[#ff7a45]/20 via-transparent to-transparent rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }}></div>
          </div>

          <div className="absolute inset-0 opacity-10 hidden md:block">
            <svg className="absolute top-20 left-[8%] w-24 h-24 text-[#f26322] animate-pulse" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '0.5s', animationDuration: '2s' }}>
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <svg className="absolute top-32 right-[12%] w-20 h-20 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '1.5s', animationDuration: '2.5s' }}>
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <svg className="absolute bottom-28 left-[15%] w-28 h-28 text-[#f26322] animate-pulse" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '2.5s', animationDuration: '2.2s' }}>
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <svg className="absolute bottom-20 right-[18%] w-22 h-22 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20" style={{ animationDelay: '3s', animationDuration: '2.8s' }}>
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>

          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(255, 255, 255, 0.1) 40px, rgba(255, 255, 255, 0.1) 80px)',
          }}></div>

          <div className="absolute inset-0 overflow-hidden hidden md:block">
            <div className="absolute top-16 left-[10%] text-yellow-300 text-3xl animate-pulse opacity-70" style={{ animationDelay: '0s', animationDuration: '2s' }}>✨</div>
            <div className="absolute top-24 right-[15%] text-yellow-300 text-4xl animate-pulse opacity-80" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}>⭐</div>
            <div className="absolute bottom-32 left-[20%] text-yellow-300 text-3xl animate-pulse opacity-70" style={{ animationDelay: '1s', animationDuration: '2.2s' }}>✨</div>
            <div className="absolute bottom-24 right-[22%] text-yellow-300 text-4xl animate-pulse opacity-80" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }}>💌</div>
          </div>

          <div className="absolute inset-0 overflow-hidden hidden md:block">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 rounded-full ${i % 3 === 0 ? 'bg-[#f26322]' : i % 3 === 1 ? 'bg-yellow-300' : 'bg-white'} opacity-60 animate-bounce`}
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 3}s`,
                }}
              ></div>
            ))}
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-4 md:mb-10">
                <div className="inline-block mb-2 md:mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full filter blur-xl opacity-50 hidden md:block"></div>
                    <div className="relative bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-xl px-4 py-1.5 md:px-8 md:py-3 rounded-full border border-white/30 md:border-2 shadow-lg md:shadow-2xl">
                      <span className="text-white font-bold text-xs md:text-sm uppercase tracking-wider flex items-center gap-1 md:gap-2">
                        <span className="text-base md:text-xl">📧</span>
                        Stay Updated
                        <span className="text-base md:text-xl">📧</span>
                      </span>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl md:text-5xl font-black text-white mb-2 md:mb-4 leading-tight drop-shadow-2xl">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-yellow-100 to-white">
                    Subscribe to Newsletter
                  </span>
                </h2>

                <div className="hidden md:flex items-center justify-center gap-3 mb-4">
                  <span className="h-1.5 w-20 bg-gradient-to-r from-transparent via-white to-white rounded-full"></span>
                  <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                  <span className="h-1.5 w-32 bg-gradient-to-r from-white via-[#f26322] to-[#ff7a45] rounded-full"></span>
                  <span className="h-2 w-2 bg-[#f26322] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></span>
                  <span className="h-1.5 w-20 bg-gradient-to-r from-[#ff7a45] to-transparent rounded-full"></span>
                </div>

                <p className="text-white/95 text-xs md:text-xl mb-4 md:mb-8 font-semibold drop-shadow-lg">
                  Get exclusive deals & updates in your inbox
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-4 max-w-2xl mx-auto mb-4 md:mb-10">
                <div className="relative flex-1 group">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full filter blur-xl opacity-0 group-focus-within:opacity-30 transition-opacity"></div>

                  <div className="relative">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      className="w-full px-4 py-3 pl-10 md:px-6 md:py-5 md:pl-14 rounded-full focus:outline-none focus:ring-2 md:focus:ring-4 focus:ring-[#f26322] text-sm md:text-lg shadow-lg md:shadow-2xl border border-white/20 md:border-2 bg-white/95 backdrop-blur-sm transition-all"
                    />
                    <svg className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 md:w-6 md:h-6 text-[#f26322]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <button className="group relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#f26322] to-[#ff7a45] rounded-full filter blur-xl opacity-50 group-hover:opacity-70 transition-opacity animate-pulse"></div>

                  <div className="relative bg-gradient-to-r from-[#f26322] to-[#ff7a45] hover:from-[#e05512] hover:to-[#f26322] text-white px-6 py-3 md:px-10 md:py-5 rounded-full font-bold shadow-lg md:shadow-2xl transform group-hover:scale-110 transition-all duration-300 border border-white/20 md:border-2">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 rounded-full"></div>

                    <span className="relative flex items-center gap-1 md:gap-2 font-black text-sm md:text-base">
                      Subscribe
                      <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>

                    <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white rounded-br-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </div>
                </button>
              </div>

              <div className="hidden sm:grid sm:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
                {[
                  { icon: '🎁', title: 'Exclusive Deals', desc: 'Special offers only for subscribers' },
                  { icon: '⚡', title: 'Early Access', desc: 'Be first to know about sales' },
                  { icon: '🔒', title: 'No Spam', desc: 'Unsubscribe anytime, hassle-free' }
                ].map((benefit, index) => (
                  <div key={index} className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-xl md:rounded-2xl filter blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-6 border border-white/20 md:border-2 hover:border-[#f26322] transition-all transform hover:scale-105 duration-300 shadow-lg md:shadow-xl">
                      <div className="text-center">
                        <div className="text-2xl md:text-4xl mb-1 md:mb-3 transform group-hover:scale-110 transition-transform">{benefit.icon}</div>
                        <h4 className="text-white font-bold text-sm md:text-lg mb-1 md:mb-2">{benefit.title}</h4>
                        <p className="text-white/80 text-xs md:text-sm">{benefit.desc}</p>
                      </div>

                      <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-[#f26322]/30 to-transparent rounded-bl-2xl opacity-0 group-hover:opacity-100 transition-opacity hidden md:block"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
