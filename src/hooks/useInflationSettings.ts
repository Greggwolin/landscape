import useSWR from 'swr';

export type InflationSelection = {
  set_id: number;
  set_name: string;
  current_rate: number | null;
  is_global: boolean;
};

export type ProjectInflationSettings = {
  cost_inflation: {
    set_id: number | null;
    set_name: string | null;
    current_rate: number | null;
  };
  price_inflation: {
    set_id: number | null;
    set_name: string | null;
    current_rate: number | null;
  };
  available_sets: InflationSelection[];
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to load inflation settings');
  }
  return res.json();
};

export function useProjectInflationSettings(projectId?: number) {
  const shouldFetch = Boolean(projectId);
  const { data, error, isLoading, mutate } = useSWR<ProjectInflationSettings>(
    shouldFetch ? `/api/projects/${projectId}/inflation-settings` : null,
    fetcher,
    { refreshInterval: 0 }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}
