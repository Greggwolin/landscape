'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContainerNode } from '@/types/containers';
import type {
  ContainerCostMetadata,
  CostApproachDepreciationRecord,
  SalesComparable,
} from '@/types/valuation';
import {
  getLandComparables,
  getProjectDepreciation,
  getContainerCostMetadata,
} from '@/lib/api/valuation';
import { LandValueSection } from './LandValueSection';
import { ImprovementsSection } from './ImprovementsSection';
import { DepreciationSection } from './DepreciationSection';
import { CostApproachSummary } from './CostApproachSummary';

interface CostApproachTabProps {
  projectId: number;
}

export function CostApproachTab({ projectId }: CostApproachTabProps) {
  const [landComparables, setLandComparables] = useState<SalesComparable[]>([]);
  const [containers, setContainers] = useState<ContainerNode[]>([]);
  const [metadataByContainer, setMetadataByContainer] = useState<Record<number, ContainerCostMetadata | null>>({});
  const [depreciation, setDepreciation] = useState<CostApproachDepreciationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContainers = useCallback(async (): Promise<ContainerNode[]> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/containers?level=2`);
      if (!response.ok) {
        console.warn(`Container fetch returned ${response.status} – rendering with empty list`);
        return [];
      }
      const data = await response.json();
      return (data?.containers ?? []) as ContainerNode[];
    } catch (err) {
      console.warn('Container fetch failed – rendering with empty list', err);
      return [];
    }
  }, [projectId]);

  const loadMetadata = useCallback(async (items: ContainerNode[]) => {
    const pairs = await Promise.all(
      items.map(async (container) => {
        try {
          const payload = await getContainerCostMetadata(container.division_id);
          return [container.division_id, payload] as const;
        } catch (err) {
          console.error('Failed to load metadata for container', container.division_id, err);
          return [container.division_id, null] as const;
        }
      })
    );
    return Object.fromEntries(pairs);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [land, depreciationPayload, containerTree] = await Promise.all([
        getLandComparables(projectId),
        getProjectDepreciation(projectId).catch(() => null),
        fetchContainers(),
      ]);

      setLandComparables(land);
      setDepreciation(depreciationPayload);
      setContainers(containerTree ?? []);

      const metadataMap = await loadMetadata(containerTree ?? []);
      setMetadataByContainer(metadataMap);
    } catch (err) {
      console.error('Cost approach load error', err);
      setError(err instanceof Error ? err.message : 'Failed to load cost approach data');
    } finally {
      setLoading(false);
    }
  }, [projectId, fetchContainers, loadMetadata]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const indicatedLandValue = useMemo(() => {
    if (landComparables.length === 0) return 0;
    const totalSf = landComparables.reduce((sum, comp) => sum + (comp.land_area_sf ?? 0), 0);
    const avgPrice = landComparables.reduce((sum, comp) => sum + (comp.price_per_sf ?? 0), 0) / landComparables.length;
    return Math.round(avgPrice * totalSf);
  }, [landComparables]);

  const improvementBaseCost = useMemo(() => {
    return Object.values(metadataByContainer).reduce((sum, meta) => sum + (meta?.base_cost_per_sf ?? 0), 0);
  }, [metadataByContainer]);

  return (
    <div className="d-flex flex-column" style={{ gap: '1.5rem' }}>
      {error && (
        <div className="alert alert-danger mb-0">
          {error}
        </div>
      )}

      <LandValueSection
        comparables={landComparables}
        loading={loading}
        onRefresh={loadData}
        projectId={projectId}
      />

      <ImprovementsSection
        containers={containers}
        metadata={metadataByContainer}
        loading={loading}
      />

      <DepreciationSection
        projectId={projectId}
        record={depreciation}
        onSaved={async () => {
          await loadData();
        }}
      />

      <CostApproachSummary
        landValue={indicatedLandValue}
        improvementsValue={improvementBaseCost}
        depreciationValue={depreciation?.total_depreciation ?? 0}
      />
    </div>
  );
}
