/**
 * Custom Hook: useBenchmarks
 * Manages benchmarks data fetching and mutations
 */

import { useState, useEffect, useCallback } from 'react';
import type {
  Benchmark,
  BenchmarkFilters,
  AISuggestion,
  AISuggestionFilters,
  GrowthRateSet,
  ReviewSuggestionRequest,
  CreateGrowthRateSet,
  UpdateGrowthRateSet
} from '@/types/benchmarks';

// =============================================================================
// BENCHMARKS HOOK
// =============================================================================

export function useBenchmarks(filters?: BenchmarkFilters) {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBenchmarks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.market_geography) params.set('market_geography', filters.market_geography);
      if (filters?.property_type) params.set('property_type', filters.property_type);
      if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));
      if (filters?.include_stale) params.set('include_stale', 'true');

      const response = await fetch(`/api/benchmarks?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch benchmarks');
      }

      const data = await response.json();
      setBenchmarks(data.benchmarks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading benchmarks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadBenchmarks();
  }, [loadBenchmarks]);

  return {
    benchmarks,
    isLoading,
    error,
    reload: loadBenchmarks
  };
}

// =============================================================================
// AI SUGGESTIONS HOOK
// =============================================================================

export function useAISuggestions(filters?: AISuggestionFilters) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.status) params.set('status', filters.status);

      const response = await fetch(`/api/benchmarks/ai-suggestions?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch AI suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading AI suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const reviewSuggestion = useCallback(async (
    suggestionId: number,
    review: ReviewSuggestionRequest
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/benchmarks/ai-suggestions/${suggestionId}/review`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(review)
        }
      );

      if (!response.ok) {
        throw new Error('Failed to review suggestion');
      }

      const result = await response.json();

      // Reload suggestions after review
      await loadSuggestions();

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error reviewing suggestion:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
    reload: loadSuggestions,
    reviewSuggestion
  };
}

// =============================================================================
// GROWTH RATES HOOK
// =============================================================================

export function useGrowthRates() {
  const [sets, setSets] = useState<GrowthRateSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/benchmarks/growth-rates');

      if (!response.ok) {
        throw new Error('Failed to fetch growth rate sets');
      }

      const data = await response.json();
      setSets(data.sets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading growth rate sets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  const createSet = useCallback(async (data: CreateGrowthRateSet) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/benchmarks/growth-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create growth rate set');
      }

      const result = await response.json();

      // Reload sets after creation
      await loadSets();

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating growth rate set:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSets]);

  const updateSet = useCallback(async (setId: number, data: UpdateGrowthRateSet) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/benchmarks/growth-rates/${setId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update growth rate set');
      }

      const result = await response.json();

      // Reload sets after update
      await loadSets();

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating growth rate set:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSets]);

  const deleteSet = useCallback(async (setId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/benchmarks/growth-rates/${setId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete growth rate set');
      }

      const result = await response.json();

      // Reload sets after deletion
      await loadSets();

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting growth rate set:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [loadSets]);

  return {
    sets,
    isLoading,
    error,
    reload: loadSets,
    createSet,
    updateSet,
    deleteSet
  };
}

// =============================================================================
// INFLATION ANALYSIS HOOK
// =============================================================================

export function useInflationAnalysis(
  category?: string,
  marketGeography?: string,
  lookbackMonths: number = 12
) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAnalysis = useCallback(async () => {
    if (!category) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('category', category);
      if (marketGeography) params.set('market_geography', marketGeography);
      params.set('lookback_months', String(lookbackMonths));

      const response = await fetch(`/api/benchmarks/inflation-analysis?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch inflation analysis');
      }

      const data = await response.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading inflation analysis:', err);
    } finally {
      setIsLoading(false);
    }
  }, [category, marketGeography, lookbackMonths]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  return {
    analysis,
    isLoading,
    error,
    reload: loadAnalysis
  };
}
