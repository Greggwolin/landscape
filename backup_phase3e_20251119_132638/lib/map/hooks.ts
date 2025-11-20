/**
 * Data fetcher hooks for map data using SWR
 */

import useSWR from 'swr';
import { ProjectMapData, CompsMapData } from './geo';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
