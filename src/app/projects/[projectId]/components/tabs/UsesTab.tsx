'use client';

import React from 'react';
// @ts-expect-error TODO(#43): OperatingExpensesTab prototype was archived into the tsconfig-excluded src/app/_archive/ tree (and depends on the removed Progressive Complexity "mode"). Restore-vs-remove the MF OpEx surface is a product decision.
import { OperatingExpensesTab } from '@/app/prototypes/multifam/rent-roll-inputs/components/OperatingExpensesTab';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

interface UsesTabProps {
  project: Project;
}

export default function UsesTab({ project }: UsesTabProps) {
  const isMultifamily = project.project_type_code === 'MF';

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
