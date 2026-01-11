'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import ProjectSubNav from '@/components/project/ProjectSubNav';
import SalesContent from '@/components/sales/SalesContent';
import { ExportButton } from '@/components/admin';

/**
 * Project Sales & Absorption Page
 *
 * Phase 3: Moved under PROJECT tab as a subtab
 * Integrates existing SalesContent component with new Sale Transaction Details accordion
 */
export default function ProjectSalesPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <>
      <ProjectSubNav projectId={projectId} />
      <div className="app-content">
        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">Sales & Absorption</h5>
          <ExportButton tabName="Sales & Absorption" projectId={projectId.toString()} />
        </div>
        <SalesContent projectId={projectId} />
      </div>
    </>
  );
}
