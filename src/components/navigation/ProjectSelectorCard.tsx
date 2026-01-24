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
    <div
      className="project-selector-card"
      style={{
        backgroundColor: 'var(--cui-card-bg)',
        borderRadius: '12px',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        marginBottom: '0.5rem',
        overflow: 'hidden',
      }}
    >
      {/* Header - matches Landscaper header */}
      <div
        className="flex items-center gap-2 border-b"
        style={{
          padding: '0.5rem 1rem',
          borderColor: 'var(--cui-border-color)',
          backgroundColor: 'var(--surface-card-header, var(--cui-tertiary-bg))',
        }}
      >
        <span className="font-semibold" style={{ color: 'var(--cui-body-color)', fontSize: '0.9rem' }}>
          Active Project
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: '0.75rem 1rem' }}>
        {/* Project selector dropdown */}
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
      </div>
    </div>
  );
}
