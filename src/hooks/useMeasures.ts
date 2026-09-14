/**
 * useMeasures Hook
 * Fetches unit of measure options from the measures API
 */

import { useQuery } from '@tanstack/react-query';
import { formatUOMOption } from '@/lib/utils/uomFormat';

import { getAuthHeaders } from '@/lib/authHeaders';
interface Measure {
  code: string;
  label: string;
  name: string;
  type: string | null;
  is_system: boolean;
  sort_order?: number | null;
}

interface MeasureOption {
  value: string;
  label: string;
  name: string;
}

/**
 * Fetch all measures from the API
 */
async function fetchMeasures(systemOnly = true, context?: string): Promise<Measure[]> {
  // Budget and pricing contexts go through /api/fin/uoms, which since
  // 2026-09-14 reads landscape.tbl_measures — the administered list Gregg
  // settled is THE unit list, and now the one the budget's foreign key
  // points at. The route keeps its uom_code / name / uom_type shape, so the
  // mapping below is unchanged; the "dollars" strip is now a no-op, since
  // the administered names are 'Front Foot' and 'Unit' rather than 'Dollars
  // per Front Foot'. Left in place for any legacy name still in flight.
  if (context) {
    const res = await fetch('/api/fin/uoms', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch measures');
    const data = await res.json();
    return (data || []).map((row: any) => {
      const rawName = row.name || '';
      const cleanName = rawName.replace(/dollars?/i, '').trim() || rawName;
      return {
        code: row.uom_code,
        label: `${row.uom_code} - ${cleanName}`,
        name: cleanName,
        type: row.uom_type ?? null,
        is_system: row.is_active ?? true,
        sort_order: row.sort_order ?? null,
      };
    });
  }

  const params = new URLSearchParams();
  if (systemOnly) params.append('systemOnly', 'true');
  const response = await fetch(`/api/measures?${params.toString()}`, { headers: getAuthHeaders() });
  if (!response.ok) throw new Error('Failed to fetch measures');
  return response.json();
}

/**
 * Hook to fetch and format measures for dropdowns
 */
export function useMeasures(systemOnly = true, context?: string) {
  return useQuery<Measure[], Error>({
    queryKey: ['measures', systemOnly, context],
    queryFn: () => fetchMeasures(systemOnly, context),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (measures rarely change)
  });
}

/**
 * Hook to get measures formatted as dropdown options
 */
export function useMeasureOptions(systemOnly = true, context?: string) {
  const { data: measures, ...rest } = useMeasures(systemOnly, context);

  const options: MeasureOption[] = measures?.map(m => ({
    value: m.code,
    label: `${m.code} - ${m.name}`,
    name: m.name,
  })) || [];

  return {
    options,
    measures,
    ...rest,
  };
}
