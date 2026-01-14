"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSeller } from '@/contexts/SellerContext';

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
}

const BoostPlansPage = () => {
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
 const { apiCall } = useSeller();
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await apiCall('/boost/plans', {
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('sellerToken')}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch boost plans');
        const data = await res.json();
        // Map API response to local BoostPlan type
      const mappedPlans = (data.data?.plans || []).map((plan: any) => ({
        id: plan.key,
        name: plan.label,
        price: plan.price,
        durationDays: plan.durationInDays,
        features: [plan.description, plan.recommended ? "Recommended for more orders" : ""].filter(Boolean),
      }));
      setPlans(mappedPlans);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center py-10 px-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-4">Boost Plans 🚀</h1>
        <p className="text-gray-300 mb-8">Choose a plan to boost your store ranking, visibility, and sales. All plans include priority listing and exclusive features.</p>
        {loading ? (
          <div className="text-white">Loading plans...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : (
          <div className="grid gap-6">
            {plans.map(plan => (
              <div key={plan.id} className="bg-gradient-to-r from-[#f26322]/20 to-[#f26322]/5 border border-[#f26322]/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                  <p className="text-lg text-[#f26322] font-semibold mb-2">₹{plan.price.toLocaleString()} / {plan.durationDays} days</p>
                  <ul className="text-sm text-gray-200 list-disc pl-5 mb-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx}>{feature}</li>
                    ))}
                  </ul>
                </div>
                <button
                  className="px-6 py-3 bg-[#f26322] hover:bg-[#e05512] text-white font-semibold rounded-xl transition-all shadow-lg shadow-[#f26322]/25"
                  onClick={() => router.push(`/seller/boost/pay?planId=${plan.id}`)}
                >
                  Boost Now
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link href="/seller/dashboard" className="text-[#f26322] hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
};

export default BoostPlansPage;
