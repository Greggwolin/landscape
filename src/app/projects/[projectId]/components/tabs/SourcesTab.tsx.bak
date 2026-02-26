'use client';

import React from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

interface SourcesTabProps {
  project: Project;
}

export default function SourcesTab({ project }: SourcesTabProps) {
  const isMultifamily = project.project_type_code === 'MF';

  // For multifamily projects, embed the rent roll prototype content in an iframe
  if (isMultifamily) {
    return (
      <div className="h-full" style={{ height: 'calc(100vh - 200px)' }}>
        <iframe
          src="/prototypes/multifam/rent-roll-inputs/content"
          className="w-full h-full border-0"
          style={{
            minHeight: '800px',
            backgroundColor: 'var(--cui-tertiary-bg)'
          }}
          title="Rent Roll & Unit Mix"
        />
      </div>
    );
  }

  // For non-multifamily projects, show generic sources content
  return (
    <CCard>
      <CCardHeader>Sources of Funds</CCardHeader>
      <CCardBody>
        <div className="text-center py-8">
          <h5>Sources Tab - Coming Soon</h5>
          <p className="text-sm mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
            This tab will display funding sources including equity, debt, and other capital sources for {project.project_name}.
          </p>
        </div>
      </CCardBody>
    </CCard>
  );
}
