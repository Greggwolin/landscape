'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { LifecycleTileNav } from '@/components/projects/LifecycleTileNav';
import { InflationRateDisplay } from '@/components/projects/InflationRateDisplay';

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
  const stickyTop = 'calc(58px + var(--app-padding) + 6px)'; // top nav height + tighter spacing

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
      className="sticky"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)',
        border: '1px solid var(--cui-border-color)',
        borderRadius: '12px',
        top: stickyTop,
        zIndex: 40,
        marginTop: '0',
        marginBottom: 'calc(var(--app-padding) / 2)',
        overflow: 'hidden'
      }}
    >
      {/* Header with Active Project Label */}
      <div
        style={{
          backgroundColor: 'var(--surface-card-header)',
          padding: '0.5rem var(--app-padding)'
        }}
      >
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <span
              className="fw-semibold"
              style={{
                color: 'var(--cui-body-color)',
                fontSize: '1.1rem',
                whiteSpace: 'nowrap'
              }}
            >
              Active Project:
            </span>
            <select
              value={project.project_id}
              onChange={(e) => handleProjectChange(Number(e.target.value))}
              className="px-3 py-2 fw-medium rounded"
              style={{
                backgroundColor: 'var(--cui-body-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)',
                border: '1px solid var(--cui-border-color)',
                cursor: 'pointer',
                minWidth: '380px',
                fontSize: '1.05rem',
              }}
            >
              {projects.map((proj) => (
                <option key={proj.project_id} value={proj.project_id}>
                  {proj.project_name} - {proj.project_type_code || 'Unknown'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lifecycle Tiles + Inflation selectors */}
      <div style={{ padding: '0.5rem var(--app-padding)' }}>
        <div className="d-flex flex-wrap gap-3 justify-content-between align-items-start">
          <div className="flex-grow-1">
            <LifecycleTileNav
              projectId={projectId.toString()}
              propertyType={project.project_type_code}
            />
          </div>
          <InflationRateDisplay projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
