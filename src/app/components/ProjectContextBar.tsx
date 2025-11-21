'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { LifecycleTileNav } from '@/components/projects/LifecycleTileNav';

/**
 * ProjectContextBar - Tier 2 Project Navigation
 *
 * Renders project-specific navigation bar with:
 * - Project selector dropdown (left)
 * - Lifecycle stage tiles (right)
 *
 * Only renders when a project is loaded.
 * Height: 56px
 * Background: var(--cui-body-bg) (light)
 *
 * @param projectId - The current project ID
 */
interface ProjectContextBarProps {
  projectId: number;
}

export default function ProjectContextBar({ projectId }: ProjectContextBarProps) {
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

  // TODO: Read tierLevel from user settings/subscription
  // For now, default to 'analyst' tier
  const tierLevel: 'analyst' | 'pro' = 'analyst';

  return (
    <div
      className="sticky d-flex align-items-center gap-4 px-4 border-bottom"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)',
        top: '58px',
        zIndex: 40,
        height: '56px'
      }}
    >
      {/* Project Selector - Left */}
      <div className="d-flex align-items-center gap-2">
        <span
          className="text-xs fw-medium"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          Active Project:
        </span>
        <select
          value={project.project_id}
          onChange={(e) => handleProjectChange(Number(e.target.value))}
          className="px-3 py-2 text-sm fw-medium rounded"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderColor: 'var(--cui-border-color)',
            color: 'var(--cui-body-color)',
            border: '1px solid var(--cui-border-color)',
            cursor: 'pointer',
            minWidth: '320px',
          }}
        >
          {projects.map((proj) => (
            <option key={proj.project_id} value={proj.project_id}>
              {proj.project_name} - {proj.project_type_code || 'Unknown'}
            </option>
          ))}
        </select>
      </div>

      {/* Lifecycle Tiles - Right */}
      <div className="flex-grow-1">
        <LifecycleTileNav
          projectId={projectId.toString()}
          tierLevel={tierLevel}
        />
      </div>
    </div>
  );
}
