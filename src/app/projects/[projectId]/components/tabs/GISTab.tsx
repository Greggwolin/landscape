'use client';

import React from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';

interface Project {
  project_id: number;
  project_name: string;
}

interface GISTabProps {
  project: Project;
}

export default function GISTab({ project }: GISTabProps) {
  return (
    <CCard>
      <CCardHeader>GIS & Mapping</CCardHeader>
      <CCardBody>
        <div className="text-center py-8">
          <h5>GIS Tab - Coming Soon</h5>
          <p className="text-sm mt-2" style={{ color: 'var(--cui-secondary-color)' }}>
            This tab will display interactive maps, parcel boundaries, and spatial analysis tools for {project.project_name}.
          </p>
        </div>
      </CCardBody>
    </CCard>
  );
}
