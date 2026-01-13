import { useEffect, useState } from 'react';

export interface SellerOnboardingStep {
  completed: boolean;
  cta: string;
}

export interface SellerOnboardingStatus {
  allCompleted: boolean;
  steps: {
    addProduct?: SellerOnboardingStep;
    kyc?: SellerOnboardingStep;
    pickupAddress?: SellerOnboardingStep;
    payments?: SellerOnboardingStep;
    [key: string]: SellerOnboardingStep | undefined;
  };
}

interface UseSellerOnboardingStatusResult {
  status: SellerOnboardingStatus | null;
  loading: boolean;
  error: boolean;
}

export function useSellerOnboardingStatus(): UseSellerOnboardingStatusResult {
  const [status, setStatus] = useState<SellerOnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchStatus() {
      setLoading(true);
      setError(false);
      try {
        const token = typeof window !== 'undefined' ? sessionStorage.getItem('sellerToken') : null;
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        const res = await fetch(`${apiUrl}/seller/onboarding-status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        if (!json.success || !json.data) throw new Error('Invalid');
        if (isMounted) setStatus(json.data);
      } catch {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchStatus();
    return () => { isMounted = false; };
  }, []);

  return { status, loading, error };
}