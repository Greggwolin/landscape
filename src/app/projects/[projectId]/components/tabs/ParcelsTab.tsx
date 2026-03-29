'use client';

import React, { useCallback, useMemo, useState } from 'react';
import PlanningContent from '@/app/components/Planning/PlanningContent';
import { CCard, CCardBody } from '@coreui/react';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

interface ParcelsTabProps {
  project: Project;
}

export default function ParcelsTab({ project }: ParcelsTabProps) {
  const isLandDevelopment = project.project_type_code === 'LAND';

  // Force child remount on Landscaper mutations via key increment
  const [refreshKey, setRefreshKey] = useState(0);
  const watchedTables = useMemo(() => ['areas', 'phases', 'parcels', 'milestones', 'land_use'], []);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  useLandscaperRefresh(project.project_id, watchedTables, handleRefresh);

  // Show message for non-land development projects
  if (!isLandDevelopment) {
    const projectTypeLabels: Record<string, string> = {
      'MF': 'Multifamily',
      'OFF': 'Office',
      'RET': 'Retail',
      'IND': 'Industrial',
      'MXD': 'Mixed-Use',
      'HOT': 'Hospitality'
    };

    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-2xl mx-auto text-center p-8">
          <CCard>
            <CCardBody style={{ padding: '8px' }}>
              <div className="text-6xl mb-6">🗺️</div>
              <h2 className="text-2xl font-semibold mb-3">
                {projectTypeLabels[project.project_type_code || ''] || 'Commercial'} Parcels Tab Not Available
              </h2>
              <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
                This project is a <strong>{projectTypeLabels[project.project_type_code || ''] || project.project_type_code}</strong> asset type.
              </p>
              <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
                The Parcels tab is specifically designed for <strong>Land Development</strong> projects.
                It includes parcel management, phasing, land use planning, and unit allocation tools.
              </p>
            </CCardBody>
          </CCard>
        </div>
      </div>
    );
  }

  return (
    <PlanningContent key={refreshKey} projectId={project.project_id} projectIdStr={project.project_id.toString()} />
  );
}
