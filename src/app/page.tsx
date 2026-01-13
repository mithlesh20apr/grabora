import HomeContent from "@/components/home/HomeContent";

// Fetch initial home data from API (server-side)
async function getHomeData() {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
    const response = await fetch(`${apiBaseUrl}/home`, {
      next: { revalidate: 120 } // Cache and revalidate every 2 minutes for better performance
    });

    if (!response.ok) {
      throw new Error('Failed to fetch home data');
    }

    const result = await response.json();

    return result.data;
  } catch (error) {
    // Return empty data structure on error
    return {
      banners: [],
      featuredCategories: [],
      flashSale: [],
      trendingProducts: [],
      newArrivals: [],
      bestSellers: []
    };
  }
}

export default async function Home() {
  const homeData = await getHomeData();

  return <HomeContent initialData={homeData} />;
}
