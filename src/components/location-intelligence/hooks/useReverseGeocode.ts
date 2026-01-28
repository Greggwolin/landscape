/**
 * useReverseGeocode Hook
 *
 * Performs reverse geocoding using Nominatim (OpenStreetMap)
 */

'use client';

import { useState, useCallback } from 'react';
import type { ReverseGeocodeResult } from '../types';
import { NOMINATIM_BASE_URL } from '../constants';

interface UseReverseGeocodeResult {
  result: ReverseGeocodeResult | null;
  isLoading: boolean;
  error: string | null;
  geocode: (lat: number, lon: number) => Promise<ReverseGeocodeResult | null>;
  clear: () => void;
}

export function useReverseGeocode(): UseReverseGeocodeResult {
  const [result, setResult] = useState<ReverseGeocodeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocode = useCallback(async (lat: number, lon: number): Promise<ReverseGeocodeResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Nominatim requires a valid User-Agent
      const response = await fetch(
        `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const address = data.address || {};
      const geocodeResult: ReverseGeocodeResult = {
        address: [
          address.house_number,
          address.road,
        ].filter(Boolean).join(' ') || data.name || '',
        city: address.city || address.town || address.village || address.hamlet || '',
        state: address.state || '',
        zip: address.postcode || '',
        county: address.county || '',
        display_name: data.display_name || '',
      };

      setResult(geocodeResult);
      return geocodeResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reverse geocoding failed';
      setError(message);
      console.error('Reverse geocode error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    isLoading,
    error,
    geocode,
    clear,
  };
}

export default useReverseGeocode;
