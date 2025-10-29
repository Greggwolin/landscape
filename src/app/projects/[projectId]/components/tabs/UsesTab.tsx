'use client';

import React from 'react';
import { OperatingExpensesTab } from '@/app/prototypes/multifam/rent-roll-inputs/components/OperatingExpensesTab';

interface Project {
  project_id: number;
  project_name: string;
  property_type_code?: string;
}

interface UsesTabProps {
  project: Project;
}

export default function UsesTab({ project }: UsesTabProps) {
  const isMultifamily = project.property_type_code?.toUpperCase() === 'MULTIFAMILY';

  // For multifamily projects, show Operating Expenses content
  if (isMultifamily) {
    return (
      <div style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}>
        <OperatingExpensesTab mode="standard" projectId={project.project_id} hideTitle={true} />
      </div>
    );
  }

  // For non-multifamily projects, show generic uses content (development costs, soft costs, etc.)
  return (
    <div className="p-4">
      <div className="bg-white dark:bg-gray-800 rounded border p-6">
        <h3 className="text-lg font-semibold mb-2">Uses of Funds - Coming Soon</h3>
        <p className="text-sm" style={{ color: 'var(--cui-secondary-color)' }}>
          This tab will display how funds are allocated across development costs, soft costs, and contingencies for {project.project_name}.
        </p>
      </div>
    </div>
  );
}
