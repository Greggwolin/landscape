/**
 * Data fetcher hooks for map data using SWR
 */

import useSWR from 'swr';
import { ProjectMapData, CompsMapData } from './geo';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return res.json();
};

export const useProjectMapData = (projectId: string) => {
  return useSWR<ProjectMapData>(
    projectId ? `/api/projects/${projectId}/map` : null,
    fetcher
  );
};

export const useCompsMapData = (projectId: string) => {
  return useSWR<CompsMapData>(
    projectId ? `/api/projects/${projectId}/valuation/comps/map` : null,
    fetcher
  );
};
