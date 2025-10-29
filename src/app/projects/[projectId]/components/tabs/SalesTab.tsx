'use client';

import React from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';

interface Project {
  project_id: number;
  project_name: string;
}

interface SalesTabProps {
  project: Project;
}

export default function SalesTab({ project }: SalesTabProps) {
  return (
    <CCard>
      <CCardHeader>Sales & Absorption</CCardHeader>
      <CCardBody>
        <div className="text-center py-8">
          <h5>Sales & Absorption Tab - Coming Soon</h5>
          <p className="text-sm mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
            This tab will display lot sales, absorption rates, and revenue projections for {project.project_name}.
          </p>
        </div>
      </CCardBody>
    </CCard>
  );
}
