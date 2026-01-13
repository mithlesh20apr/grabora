// API utility functions with automatic token injection

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Fetch wrapper that automatically adds authentication token
 */
export async function apiFetch(endpoint: string, options: RequestOptions = {}) {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Add authentication token if required
  if (requiresAuth) {
    const token = sessionStorage.getItem('token');
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
  });

  return response;
}

/**
 * API call with JSON response parsing
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ success: boolean; data: T; message?: string }> {
  try {
    const response = await apiFetch(endpoint, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'API request failed');
    }

    return result;
  } catch (error: any) {
    throw error;
  }
}

/**
 * GET request
 */
export function apiGet<T = any>(endpoint: string, requiresAuth = true) {
  return apiCall<T>(endpoint, {
    method: 'GET',
    requiresAuth,
  });
}

/**
 * POST request
 */
export function apiPost<T = any>(endpoint: string, data?: any, requiresAuth = true) {
  return apiCall<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    requiresAuth,
  });
}

/**
 * PUT request
 */
export function apiPut<T = any>(endpoint: string, data?: any, requiresAuth = true) {
  return apiCall<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    requiresAuth,
  });
}

/**
 * DELETE request
 */
export function apiDelete<T = any>(endpoint: string, requiresAuth = true) {
  return apiCall<T>(endpoint, {
    method: 'DELETE',
    requiresAuth,
  });
}
