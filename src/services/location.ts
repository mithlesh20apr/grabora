// Location service for IP-based pincode detection

export interface GeoLocation {
  ip: string;
  city: string;
  region: string;
  postal: string;
  country: string;
}

/**
 * Detects user's pincode using IP-based geolocation
 * Uses ipapi.co as the primary service
 */
export async function detectPincodeFromIP(): Promise<string | null> {
  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('IP geolocation API returned error:', response.status);
      return null;
    }

    const data: GeoLocation = await response.json();

    // Validate postal code - must be 6 digits for Indian pincodes
    if (data.postal && /^\d{6}$/.test(data.postal)) {
      return data.postal;
    }

    console.warn('Invalid or missing pincode from IP geolocation:', data.postal);
    return null;
  } catch (error) {
    console.error('Failed to detect pincode from IP:', error);
    return null;
  }
}

/**
 * Gets pincode from localStorage
 */
export function getPincodeFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('userPincode');
}

/**
 * Saves pincode to localStorage
 */
export function savePincodeToStorage(pincode: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('userPincode', pincode);
}

/**
 * Removes pincode from localStorage
 */
export function removePincodeFromStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('userPincode');
}

/**
 * Validates if a pincode is in correct format (6 digits)
 */
export function isValidPincode(pincode: string | null): boolean {
  if (!pincode) return false;
  return /^\d{6}$/.test(pincode);
}

/**
 * Gets or detects pincode with the following priority:
 * 1. Check localStorage
 * 2. Try IP-based detection
 * 3. Return null (will trigger modal)
 */
export async function getOrDetectPincode(): Promise<string | null> {
  // First check localStorage
  const storedPincode = getPincodeFromStorage();
  if (isValidPincode(storedPincode)) {
    return storedPincode;
  }

  // Try IP-based detection
  const detectedPincode = await detectPincodeFromIP();
  if (detectedPincode) {
    savePincodeToStorage(detectedPincode);
    return detectedPincode;
  }

  return null;
}
