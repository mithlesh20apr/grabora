'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  username: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: string;
  avatar?: {
    url: string;
  };
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  getCurrentUser: () => Promise<void>;
  completeProfile: (profileData: Partial<User>) => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user data from sessionStorage on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    const storedRefreshToken = sessionStorage.getItem('refreshToken');
    const storedUser = sessionStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        setAccessToken(storedToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        sessionStorage.clear();
      }
    }
    setIsLoading(false);
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!accessToken) return;

    const checkAndRefreshToken = async () => {
      try {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        // Decode JWT and check expiry
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const timeUntilExpiry = payload.exp - currentTime;

        // Refresh token if it expires in less than 5 minutes (300 seconds)
        if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
          await refreshTokenFunction();
        } else if (timeUntilExpiry <= 0) {
          // Token already expired
          await logout();
        }
      } catch (error) {
      }
    };

    // Check immediately
    checkAndRefreshToken();

    // Check every 2 minutes
    const interval = setInterval(checkAndRefreshToken, 120000);

    return () => clearInterval(interval);
  }, [accessToken]);

  const login = (accessToken: string, refreshToken: string, user: User) => {
    // Store tokens and user data
    sessionStorage.setItem('token', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken);
    sessionStorage.setItem('user', JSON.stringify(user));

    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setUser(user);
  };

  const logout = async () => {
    try {
      // Call logout API if user is authenticated
      if (accessToken) {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
        await fetch(`${apiBaseUrl}/user-auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
    } finally {
      // Clear all session data regardless of API call success
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');
      
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);

      // Redirect to home page
      router.push('/');
    }
  };

  const updateUser = (updatedUser: User) => {
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const getCurrentUser = async () => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return;

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const response = await fetch(`${apiBaseUrl}/user-auth/current-user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch current user');
      }

      const result = await response.json();
      
      // API returns result.user, not result.data
      if (result.user) {
        const userData = result.user;
        sessionStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (error) {
      // Don't clear session on error - user might be offline
    }
  };

  const completeProfile = async (profileData: Partial<User>) => {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const response = await fetch(`${apiBaseUrl}/user-auth/complete-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to update profile');
      }

      const result = await response.json();
      if (result.success && result.data) {
        const updatedUser = result.data;
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
    } catch (error) {
      throw error;
    }
  };

  const refreshTokenFunction = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = sessionStorage.getItem('refreshToken');
      if (!storedRefreshToken) {
        return false;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v2';
      const response = await fetch(`${apiBaseUrl}/user-auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      if (!response.ok) {
        await logout();
        return false;
      }

      const result = await response.json();
      if (result.success && result.data) {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = result.data;
        
        // Update tokens
        sessionStorage.setItem('token', newAccessToken);
        if (newRefreshToken) {
          sessionStorage.setItem('refreshToken', newRefreshToken);
          setRefreshToken(newRefreshToken);
        }
        setAccessToken(newAccessToken);
        
        return true;
      }
      
      return false;
    } catch (error) {
      await logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        login,
        logout,
        updateUser,
        getCurrentUser,
        completeProfile,
        refreshToken: refreshTokenFunction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
