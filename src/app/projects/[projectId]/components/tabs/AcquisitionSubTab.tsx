'use client';

/**
 * AcquisitionSubTab Component
 *
 * Simple wrapper for the AcquisitionLedgerGrid within the Property tab.
 * Shows all fields inline (no mode selector).
 *
 * @version 2.0
 * @created 2026-02-01
 * @updated 2026-02-01 - Simplified to only show ledger grid with all fields
 */

import React from 'react';
import AcquisitionLedgerGrid from '@/components/acquisition/AcquisitionLedgerGrid';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
  analysis_type?: string;
}

interface AcquisitionSubTabProps {
  project: Project;
}

export default function AcquisitionSubTab({ project }: AcquisitionSubTabProps) {
  return (
    <div className="space-y-4">
      <AcquisitionLedgerGrid projectId={project.project_id} showAllFields />
    </div>
  );
}
