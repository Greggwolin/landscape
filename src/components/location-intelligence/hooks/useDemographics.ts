/**
 * useDemographics Hook
 *
 * Fetches ring demographics from the Location Intelligence API
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DemographicsResponse } from '../types';
import { LOCATION_INTELLIGENCE_API_BASE } from '../constants';

interface UseDemographicsOptions {
  lat: number;
  lon: number;
  projectId?: string;
  enabled?: boolean;
}

interface UseDemographicsResult {
  demographics: DemographicsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Get JWT token from localStorage (same pattern as AuthContext)
  // Only access localStorage on client side
  if (typeof window !== 'undefined') {
    try {
      const tokensStr = localStorage.getItem('auth_tokens');
      if (tokensStr) {
        const tokens = JSON.parse(tokensStr);
        if (typeof tokens?.access === 'string' && tokens.access.trim()) {
          headers['Authorization'] = `Bearer ${tokens.access}`;
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return headers;
}

export function useDemographics({
  lat,
  lon,
  projectId,
  enabled = true,
}: UseDemographicsOptions): UseDemographicsResult {
  const [demographics, setDemographics] = useState<DemographicsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDemographics = useCallback(async () => {
    if (!enabled || !lat || !lon) return;

    setIsLoading(true);
    setError(null);

    try {
      // Get Django API URL from environment
      const djangoUrl = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
      const headers = getAuthHeaders();
      const hasAuthHeader = Boolean(headers.Authorization);
      const publicHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

      const fetchWithAuthFallback = async (url: string, init: RequestInit = {}) => {
        const response = await fetch(url, {
          ...init,
          headers: headers,
          credentials: 'include',
        });

        // Location intelligence demographics endpoints are public; if JWT is stale/invalid,
        // retry once without Authorization to avoid blocking the flyout.
        if ((response.status === 401 || response.status === 403) && hasAuthHeader) {
          return fetch(url, {
            ...init,
            headers: publicHeaders,
            credentials: 'include',
          });
        }

        return response;
      };

      // First try to get cached demographics if projectId is provided
      if (projectId) {
        const cachedResponse = await fetchWithAuthFallback(
          `${djangoUrl}${LOCATION_INTELLIGENCE_API_BASE}/demographics/project/${projectId}/`,
          { method: 'GET' }
        );

        if (cachedResponse.ok) {
          const cachedData = await cachedResponse.json();
          setDemographics({ ...cachedData, cached: true });
          setIsLoading(false);
          return;
        }
        // If not cached (404), fall through to calculate fresh
      }

      // Calculate fresh demographics
      const response = await fetchWithAuthFallback(
        `${djangoUrl}${LOCATION_INTELLIGENCE_API_BASE}/demographics/?lat=${lat}&lon=${lon}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `Failed to fetch demographics: ${response.status}`);
      }

      const data = await response.json();
      setDemographics(data);

      // Cache for project if projectId provided
      if (projectId) {
        fetchWithAuthFallback(`${djangoUrl}${LOCATION_INTELLIGENCE_API_BASE}/demographics/project/${projectId}/cache/`, {
          method: 'POST',
          body: JSON.stringify({ lat, lon }),
        }).catch((err) => {
          console.warn('Failed to cache demographics:', err);
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch demographics';
      setError(message);
      console.error('Demographics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [lat, lon, projectId, enabled]);

  useEffect(() => {
    fetchDemographics();
  }, [fetchDemographics]);

  return {
    demographics,
    isLoading,
    error,
    refetch: fetchDemographics,
  };
}

export default useDemographics;
