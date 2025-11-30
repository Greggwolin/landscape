import useSWR from 'swr';

type PicklistOption = {
  value: string;
  label: string;
  parent_id?: number | null;
};

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => res.json())
    .then((data) => data.options || []);

/**
 * Hook to fetch dropdown options from system picklists
 * @param type picklist slug (e.g., 'phase-status', 'property-types')
 * @param parentCode optional parent code for cascading dropdowns
 */
export function usePicklistOptions(type: string, parentCode?: string): {
  options: PicklistOption[];
  isLoading: boolean;
  error: unknown;
} {
  const url = parentCode
    ? `/api/lookups/${type}?parent=${encodeURIComponent(parentCode)}`
    : `/api/lookups/${type}`;

  const { data, isLoading, error } = useSWR(url, fetcher);

  return {
    options: data || [],
    isLoading,
    error
  };
}

export const usePhaseStatusOptions = () => usePicklistOptions('phase-status');
export const useOwnershipTypeOptions = () => usePicklistOptions('ownership-types');
export const usePropertyTypeOptions = () => usePicklistOptions('property-types');
export const usePropertySubtypeOptions = (parentCode?: string) => usePicklistOptions('property-subtypes', parentCode);
export const usePropertyClassOptions = () => usePicklistOptions('property-classes');
export const useLeaseStatusOptions = () => usePicklistOptions('lease-statuses');
export const useLeaseTypeOptions = () => usePicklistOptions('lease-types');
export const useInflationTypeOptions = () => usePicklistOptions('inflation-types');
export const useAnalysisTypeOptions = () => usePicklistOptions('analysis-types');
