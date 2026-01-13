import { useEffect, useState } from 'react';

export interface SellerActivationStatus {
  isActive: boolean;
  reason: 'PRODUCT_MISSING' | 'KYC_PENDING' | 'PICKUP_ADDRESS_MISSING' | 'PAYMENT_NOT_ENABLED' | 'ACTIVE' | string;
  nextStep: string;
}

interface UseSellerActivationStatusResult {
  status: SellerActivationStatus | null;
  loading: boolean;
  error: boolean;
}

export function useSellerActivationStatus(): UseSellerActivationStatusResult {
  const [status, setStatus] = useState<SellerActivationStatus | null>(null);
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
        const res = await fetch(`${apiUrl}/seller/activation-status`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        if (!json || typeof json.isActive !== 'boolean') throw new Error('Invalid');
        if (isMounted) setStatus(json);
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
