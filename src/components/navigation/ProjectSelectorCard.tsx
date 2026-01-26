/**
 * ProjectSelectorCard Component
 *
 * Standalone card for project selection with header matching Landscaper panel.
 * Sits above the Landscaper panel in the left column.
 *
 * @version 1.2
 * @created 2026-01-23
 * @updated 2026-01-23 - Simplified to just header and dropdown
 */

'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface ProjectSelectorCardProps {
  projectId: number;
}

export function ProjectSelectorCard({ projectId }: ProjectSelectorCardProps) {
  const { projects, activeProject, selectProject } = useProjectContext();
  const router = useRouter();

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  if (!project) {
    return null;
  }

  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}`);
  };

  return (
    <CCard
      className="project-selector-card shadow-lg"
      style={{ marginBottom: '0.5rem' }}
    >
      <CCardHeader
        className="flex items-center gap-2"
        style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
      >
        <span className="font-semibold" style={{ color: 'var(--cui-body-color)', fontSize: '0.9rem' }}>
          Active Project
        </span>
      </CCardHeader>

      <CCardBody style={{ padding: '0.75rem 1rem' }}>
        <select
          value={project.project_id}
          onChange={(e) => handleProjectChange(Number(e.target.value))}
          className="w-full px-3 py-2 fw-medium rounded"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderColor: 'var(--cui-border-color)',
            color: 'var(--cui-body-color)',
            border: '1px solid var(--cui-border-color)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            height: '36px',
          }}
        >
          {projects.map((proj) => (
            <option key={proj.project_id} value={proj.project_id}>
              {proj.project_id} - {proj.project_name}
            </option>
          ))}
        </select>
      </CCardBody>
    </CCard>
  );
}
