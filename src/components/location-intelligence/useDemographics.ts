/**
 * useDemographics Hook
 *
 * Fetches ring demographics from the Location Intelligence API
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { DemographicsResponse } from './types';
import { LOCATION_INTELLIGENCE_API_BASE } from './constants';

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

      // First try to get cached demographics if projectId is provided
      if (projectId) {
        const cachedResponse = await fetch(
          `${djangoUrl}${LOCATION_INTELLIGENCE_API_BASE}/demographics/project/${projectId}/`
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
      const response = await fetch(
        `${djangoUrl}${LOCATION_INTELLIGENCE_API_BASE}/demographics/?lat=${lat}&lon=${lon}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch demographics: ${response.status}`);
      }

      const data = await response.json();
      setDemographics(data);

      // Cache for project if projectId provided
      if (projectId) {
        fetch(`${djangoUrl}${LOCATION_INTELLIGENCE_API_BASE}/demographics/project/${projectId}/cache/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
