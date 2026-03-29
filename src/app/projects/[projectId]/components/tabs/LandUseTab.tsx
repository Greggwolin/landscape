'use client';

import React, { useCallback, useMemo, useState } from 'react';
import LandUsePicker from '@/components/land-use/LandUsePicker';
import { CCard, CCardBody } from '@coreui/react';
import { useLandscaperRefresh } from '@/hooks/useLandscaperRefresh';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

interface LandUseTabProps {
  project: Project;
}

export default function LandUseTab({ project }: LandUseTabProps) {
  const isLandDevelopment = project.project_type_code === 'LAND';

  const [refreshKey, setRefreshKey] = useState(0);
  const watchedTables = useMemo(() => ['land_use', 'project_land_use'], []);
  const handleRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  useLandscaperRefresh(project.project_id, watchedTables, handleRefresh);

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
              <div className="text-6xl mb-6">🏘️</div>
              <h2 className="text-2xl font-semibold mb-3">
                {projectTypeLabels[project.project_type_code || ''] || 'Commercial'} Land Use Tab Not Available
              </h2>
              <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
                This project is a <strong>{projectTypeLabels[project.project_type_code || ''] || project.project_type_code}</strong> asset type.
              </p>
              <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
                The Land Use tab is specifically designed for <strong>Land Development</strong> projects.
                It lets you select which land use families, types, and lot products apply to this project.
              </p>
            </CCardBody>
          </CCard>
        </div>
      </div>
    );
  }

  return <LandUsePicker key={refreshKey} projectId={project.project_id} />;
}
