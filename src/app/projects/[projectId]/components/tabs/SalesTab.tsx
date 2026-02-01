'use client';

import React from 'react';
import SalesContent from '@/components/sales/SalesContent';

interface Project {
  project_id: number;
  project_name: string;
  project_type_code?: string;
}

interface SalesTabProps {
  project: Project;
}

export default function SalesTab({ project }: SalesTabProps) {
  const isLandDevelopment = project.project_type_code === 'LAND';

  // Show message for non-land development projects
  if (!isLandDevelopment) {
    const projectTypeLabels: Record<string, string> = {
      'MF': 'Multifamily',
      'OFF': 'Office',
      'RET': 'Retail',
      'IND': 'Industrial',
      'MXD': 'Mixed-Use',
      'HOT': 'Hospitality'
    };

    return (
      <div className="flex items-center justify-center py-12">
        <div className="max-w-2xl mx-auto text-center p-8">
          <div className="bg-white dark:bg-gray-800 rounded border p-12">
            <div className="text-6xl mb-6">💰</div>
            <h2 className="text-2xl font-semibold mb-3">
              {projectTypeLabels[project.project_type_code || ''] || 'Commercial'} Sales Tab Not Available
            </h2>
            <p className="mb-2" style={{ color: 'var(--cui-body-color)' }}>
              This project is a <strong>{projectTypeLabels[project.project_type_code || ''] || project.project_type_code}</strong> asset type.
            </p>
            <p className="mb-6" style={{ color: 'var(--cui-secondary-color)' }}>
              The Sales tab is specifically designed for <strong>Land Development</strong> projects.
              It tracks lot sales, pricing strategies, absorption schedules, and revenue projections for subdivisions.
            </p>
            <div
              className="p-4 rounded text-left"
              style={{
                backgroundColor: 'var(--cui-info-bg)',
                borderLeft: '4px solid var(--cui-info)'
              }}
            >
              <p className="text-sm mb-2" style={{ color: 'var(--cui-info)' }}>
                <strong>For {projectTypeLabels[project.project_type_code || '']?.toLowerCase() || 'this asset type'} properties, use:</strong>
              </p>
              <ul
                className="text-sm ml-4"
                style={{
                  color: 'var(--cui-body-color)',
                  listStyleType: 'disc'
                }}
              >
                <li>Property tab for lease management and rent roll</li>
                <li>Financial Analysis for cash flow and investment returns</li>
                <li>Valuation tab for property appraisal</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-tab-content">
      <SalesContent projectId={project.project_id} />
    </div>
  );
}
