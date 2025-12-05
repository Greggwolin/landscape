'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import SalesContent from '@/components/sales/SalesContent';
import { ExportButton } from '@/components/admin';

/**
 * Sales & Marketing Page
 *
 * Migrated from: /projects/[projectId]/project/sales/page.tsx
 * Integrates existing SalesContent component with Sale Transaction Details
 */
export default function SalesMarketingPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  return (
    <div className="app-content">
      {/* Page Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Sales & Marketing</h5>
        <ExportButton tabName="Sales & Marketing" projectId={projectId.toString()} />
      </div>
      <SalesContent projectId={projectId} />
    </div>
  );
}
