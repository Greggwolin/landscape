'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const DJANGO_API_BASE = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

// ============================================================================
// Types
// ============================================================================

export interface UserProfile {
  bio: string | null;
  avatar_url: string | null;
  timezone: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  company: string | null;
  phone: string | null;
  role: string;
  is_verified: boolean;
  is_active: boolean;
  is_staff?: boolean;
  created_at: string;
  profile: UserProfile | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  phone?: string;
}

export interface LoginData {
  username: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  refreshToken: () => Promise<boolean>;
  requestPasswordReset: (email: string) => Promise<{ message: string; token?: string }>;
  confirmPasswordReset: (token: string, password: string, password_confirm: string) => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Helper: Make authenticated API request
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const accessToken = tokens?.access || localStorage.getItem('auth_tokens')
      ? JSON.parse(localStorage.getItem('auth_tokens') || '{}').access
      : null;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  }, [tokens]);

  // Fetch current user profile
  const fetchCurrentUser = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch(`${DJANGO_API_BASE}/api/auth/profile/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return true;
      } else if (response.status === 401) {
        // Token expired, try refresh
        return false;
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
    return false;
  }, []);

  // Refresh access token
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const storedTokens = localStorage.getItem('auth_tokens');
    if (!storedTokens) return false;

    const { refresh } = JSON.parse(storedTokens);
    if (!refresh) return false;

    try {
      const response = await fetch(`${DJANGO_API_BASE}/api/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      if (response.ok) {
        const data = await response.json();
        const newTokens = { access: data.access, refresh };
        setTokens(newTokens);
        localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
        await fetchCurrentUser(data.access);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }, [fetchCurrentUser]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedTokens = localStorage.getItem('auth_tokens');
      if (storedTokens) {
        try {
          const parsedTokens = JSON.parse(storedTokens);
          setTokens(parsedTokens);

          const success = await fetchCurrentUser(parsedTokens.access);
          if (!success) {
            // Try refresh token
            const refreshed = await refreshToken();
            if (!refreshed) {
              // Clear invalid tokens and cookie
              localStorage.removeItem('auth_tokens');
              document.cookie = 'auth_token_exists=; path=/; max-age=0; SameSite=Lax';
              setTokens(null);
              setUser(null);
            } else {
              // Refresh succeeded, ensure cookie is set
              document.cookie = 'auth_token_exists=true; path=/; max-age=604800; SameSite=Lax';
            }
          } else {
            // Auth restored successfully, ensure cookie is set
            document.cookie = 'auth_token_exists=true; path=/; max-age=604800; SameSite=Lax';
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          localStorage.removeItem('auth_tokens');
          document.cookie = 'auth_token_exists=; path=/; max-age=0; SameSite=Lax';
        }
      } else {
        // No stored tokens, ensure cookie is cleared
        document.cookie = 'auth_token_exists=; path=/; max-age=0; SameSite=Lax';
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [fetchCurrentUser, refreshToken]);

  // Login
  const login = async (data: LoginData) => {
    const response = await fetch(`${DJANGO_API_BASE}/api/auth/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.non_field_errors?.[0] || error.detail || 'Login failed');
    }

    const result = await response.json();
    setUser(result.user);
    setTokens(result.tokens);
    localStorage.setItem('auth_tokens', JSON.stringify(result.tokens));
    // Set cookie for middleware auth check
    document.cookie = 'auth_token_exists=true; path=/; max-age=604800; SameSite=Lax';
    return result;
  };

  // Register
  const register = async (data: RegisterData) => {
    const response = await fetch(`${DJANGO_API_BASE}/api/auth/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      // Handle field-specific errors
      const errorMessages = Object.entries(error)
        .map(([_key, value]) => {
          if (Array.isArray(value)) return value.join(', ');
          return String(value);
        })
        .join('. ');
      throw new Error(errorMessages || 'Registration failed');
    }

    const result = await response.json();
    setUser(result.user);
    setTokens(result.tokens);
    localStorage.setItem('auth_tokens', JSON.stringify(result.tokens));
    // Set cookie for middleware auth check
    document.cookie = 'auth_token_exists=true; path=/; max-age=604800; SameSite=Lax';
    router.push('/dashboard');
  };

  // Logout
  const logout = useCallback(() => {
    // Optionally call logout endpoint to blacklist token
    if (tokens?.refresh) {
      authFetch(`${DJANGO_API_BASE}/api/auth/logout/`, {
        method: 'POST',
        body: JSON.stringify({ refresh_token: tokens.refresh }),
      }).catch(console.error);
    }

    setUser(null);
    setTokens(null);
    localStorage.removeItem('auth_tokens');
    // Clear auth cookie for middleware - use multiple methods to ensure it's cleared
    document.cookie = 'auth_token_exists=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'auth_token_exists=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    // Force navigation to login
    window.location.href = '/login';
  }, [tokens, authFetch]);

  // Update profile
  const updateProfile = async (data: Partial<User>) => {
    if (!tokens) throw new Error('Not authenticated');

    const response = await authFetch(`${DJANGO_API_BASE}/api/auth/profile/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update profile');
    }

    const updatedUser = await response.json();
    setUser(updatedUser);
  };

  // Request password reset
  const requestPasswordReset = async (email: string) => {
    const response = await fetch(`${DJANGO_API_BASE}/api/auth/password-reset/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to request password reset');
    }

    return response.json();
  };

  // Confirm password reset
  const confirmPasswordReset = async (token: string, password: string, password_confirm: string) => {
    const response = await fetch(`${DJANGO_API_BASE}/api/auth/password-reset-confirm/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password, password_confirm }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || error.detail || 'Failed to reset password');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        refreshToken,
        requestPasswordReset,
        confirmPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
