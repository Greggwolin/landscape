'use client';

import React from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';

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
      <CCardHeader>Capitalization</CCardHeader>
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
