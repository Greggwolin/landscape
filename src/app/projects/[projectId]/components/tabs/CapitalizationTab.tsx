'use client';

import React from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { ExportButton } from '@/components/admin';

interface Project {
  project_id: number;
  project_name: string;
}

interface CapitalizationTabProps {
  project: Project;
}

export default function CapitalizationTab({ project }: CapitalizationTabProps) {
  return (
    <CCard>
      <CCardHeader className="d-flex justify-content-between align-items-center">
        <span>Capitalization</span>
        <ExportButton tabName="Capitalization" projectId={project.project_id.toString()} />
      </CCardHeader>
      <CCardBody>
        <div className="text-center py-8">
          <h5>Capitalization Tab - Coming Soon</h5>
          <p className="text-sm mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
            This tab will display capital stack, waterfall structures, and investment returns for {project.project_name}.
          </p>
        </div>
      </CCardBody>
    </CCard>
  );
}
