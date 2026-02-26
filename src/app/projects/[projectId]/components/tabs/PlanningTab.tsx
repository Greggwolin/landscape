'use client';

import React from 'react';
import PlanningContent from '@/app/components/Planning/PlanningContent';
import { CCard, CCardBody } from '@coreui/react';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

interface PlanningTabProps {
  project: Project;
}

export default function PlanningTab({ project }: PlanningTabProps) {
  const isLandDevelopment = project.project_type_code === 'LAND';

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
            <CCardBody>
              <div className="text-6xl mb-6">📋</div>
              <h2 className="text-2xl font-semibold mb-3">
                {projectTypeLabels[project.project_type_code || ''] || 'Commercial'} Planning Tab Not Available
              </h2>
              <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
                This project is a <strong>{projectTypeLabels[project.project_type_code || ''] || project.project_type_code}</strong> asset type.
              </p>
              <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
                The Planning tab is specifically designed for <strong>Land Development</strong> projects.
                It includes parcel management, phasing, land use planning, and unit allocation tools.
              </p>
              <div
                className="p-4 rounded text-left"
                style={{
                  backgroundColor: 'var(--cui-info-bg)',
                  borderLeft: '4px solid var(--cui-info)'
                }}
              >
                <p className="text-sm mb-2" style={{ color: 'var(--cui-info)' }}>
                  <strong>For {projectTypeLabels[project.project_type_code || '']?.toLowerCase() || 'this asset type'} properties, use:</strong>
                </p>
                <ul
                  className="text-sm ml-4"
                  style={{
                    color: 'var(--cui-body-color)',
                    listStyleType: 'disc'
                  }}
                >
                  <li>Project tab for site and property details</li>
                  <li>GIS tab for mapping and spatial analysis</li>
                  <li>Budget tab for development cost planning</li>
                </ul>
              </div>
            </CCardBody>
          </CCard>
        </div>
      </div>
    );
  }

  return (
    <PlanningContent projectId={project.project_id} projectIdStr={project.project_id.toString()} />
  );
}
