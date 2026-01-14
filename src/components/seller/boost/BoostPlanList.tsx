import React from 'react';
import { useRouter } from 'next/navigation';

interface BoostPlan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  features: string[];
}

interface BoostPlanListProps {
  plans: BoostPlan[];
}

const BoostPlanList: React.FC<BoostPlanListProps> = ({ plans }) => {
  const router = useRouter();
  return (
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
  );
};

export default BoostPlanList;
