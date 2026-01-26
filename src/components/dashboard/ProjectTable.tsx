'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompletenessBar } from './CompletenessBar';
import { CompletenessModal, CompletenessCategory } from './CompletenessModal';

export interface ProjectWithCompleteness {
  project_id: number;
  project_name: string;
  project_type_code: string | null;
  jurisdiction_city: string | null;
  jurisdiction_state: string | null;
  acres_gross: number | null;
  description?: string | null;
  overall_percentage: number;
  categories: CompletenessCategory[];
}

interface ProjectTableProps {
  projects: ProjectWithCompleteness[];
  isLoading?: boolean;
}

/**
 * Type badge colors per the design spec.
 */
const TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  LAND: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Land' },
  MPC: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'MPC' },
  MF: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Multifam' },
  MULTIFAMILY: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Multifam' },
  RET: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Retail' },
  RETAIL: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Retail' },
  COMMERCIAL: { bg: 'bg-pink-100', text: 'text-pink-700', label: 'Commercial' },
  OFF: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Office' },
  OFFICE: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'Office' },
  IND: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Industrial' },
  INDUSTRIAL: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Industrial' },
  MXU: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Mixed Use' },
  MIXED_USE: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Mixed Use' },
  HTL: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Hotel' },
};

const DEFAULT_TYPE = { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Other' };

function TypeBadge({ typeCode }: { typeCode: string | null }) {
  const config = typeCode ? TYPE_COLORS[typeCode.toUpperCase()] || DEFAULT_TYPE : DEFAULT_TYPE;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.text}`}
    >
      {config.label}
    </span>
  );
}

export function ProjectTable({ projects, isLoading }: ProjectTableProps) {
  const router = useRouter();
  const [selectedProject, setSelectedProject] = useState<ProjectWithCompleteness | null>(null);

  const handleRowClick = (projectId: number) => {
    router.push(`/projects/${projectId}/workspace`);
  };

  if (isLoading) {
    return (
      <div className="border border-border bg-surface-card">
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
          <p className="mt-2 text-sm text-muted">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="border border-border bg-surface-card">
        <div className="p-8 text-center">
          <p className="text-muted">No projects found.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="border border-border bg-surface-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto px-0 pb-2">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="px-3 py-1 text-left text-sm font-semibold text-muted">
                  Project
                </th>
                <th className="px-3 py-1 text-left text-sm font-semibold text-muted">
                  Type
                </th>
                <th className="px-3 py-1 text-left text-sm font-semibold text-muted">
                  Location
                </th>
                <th className="px-3 py-1 text-right text-sm font-semibold text-muted">
                  Size (ac)
                </th>
                <th className="px-3 py-1 text-left text-sm font-semibold text-muted w-40">
                  Completeness
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => (
                <tr
                  key={project.project_id}
                  onClick={() => handleRowClick(project.project_id)}
                  className="hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <td className="px-3 py-2">
                    <div>
                      <div className="font-medium text-foreground">
                        {project.project_name}
                      </div>
                      {project.description && (
                        <div className="text-xs text-muted truncate max-w-[200px]">
                          {project.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <TypeBadge typeCode={project.project_type_code} />
                  </td>
                  <td className="px-3 py-2 text-sm text-muted">
                    {[project.jurisdiction_city, project.jurisdiction_state]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-sm text-muted text-right tabular-nums">
                    {project.acres_gross != null
                      ? project.acres_gross.toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 1,
                        })
                      : '—'}
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <CompletenessBar
                      percentage={project.overall_percentage}
                      onClick={() => setSelectedProject(project)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Completeness Modal */}
      {selectedProject && (
        <CompletenessModal
          isOpen={!!selectedProject}
          onClose={() => setSelectedProject(null)}
          projectName={selectedProject.project_name}
          overallPercentage={selectedProject.overall_percentage}
          categories={selectedProject.categories}
        />
      )}
    </>
  );
}

export default ProjectTable;
