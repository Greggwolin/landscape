/**
 * useMeasures Hook
 * Fetches unit of measure options from the measures API
 */

import { useQuery } from '@tanstack/react-query';

interface Measure {
  code: string;
  label: string;
  name: string;
  type: string | null;
  is_system: boolean;
}

interface MeasureOption {
  value: string;
  label: string;
}

/**
 * Fetch all measures from the API
 */
async function fetchMeasures(systemOnly = true): Promise<Measure[]> {
  const params = new URLSearchParams();
  if (systemOnly) {
    params.append('systemOnly', 'true');
  }

  const response = await fetch(`/api/measures?${params.toString()}`);

  if (!response.ok) {
    throw new Error('Failed to fetch measures');
  }

  return response.json();
}

/**
 * Hook to fetch and format measures for dropdowns
 */
export function useMeasures(systemOnly = true) {
  return useQuery<Measure[], Error>({
    queryKey: ['measures', systemOnly],
    queryFn: () => fetchMeasures(systemOnly),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (measures rarely change)
  });
}

/**
 * Hook to get measures formatted as dropdown options
 */
export function useMeasureOptions(systemOnly = true) {
  const { data: measures, ...rest } = useMeasures(systemOnly);

  const options: MeasureOption[] = measures?.map(m => ({
    value: m.code,
    label: `${m.code} - ${m.name}`,
  })) || [];

  return {
    options,
    measures,
    ...rest,
  };
}
