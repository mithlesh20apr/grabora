// src/lib/sellerUiHelpers.ts

// Badge mapping for seller badges
export const SELLER_BADGE_LABELS: Record<string, { icon: string; label: string }> = {
  TOP_RATED: { icon: '⭐', label: 'Top Rated' },
  FAST_DELIVERY: { icon: '🚀', label: 'Fast Delivery' },
  BOOSTED: { icon: '🔥', label: 'Sponsored' },
};

// Format distance in km (1 decimal place)
export function formatDistance(distanceKm?: number | null): string {
  if (typeof distanceKm !== 'number' || isNaN(distanceKm)) return '';
  return `${distanceKm.toFixed(1)} km`;
}

// Format delivery fee
export function formatDeliveryFee(fee?: number | null): string {
  if (typeof fee !== 'number' || isNaN(fee) || fee <= 0) return 'Free Delivery';
  return `Delivery ₹${fee}`;
}
