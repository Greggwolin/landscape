'use client';

import React, { useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { getProjectSwitchUrl } from '@/lib/utils/folderTabConfig';

/**
 * ProjectContextBar - Project Selector Bar
 *
 * Renders project-specific context bar with:
 * - Project selector dropdown
 * - Project type badge
 *
 * The colored tile navigation has been REPLACED by FolderTabs
 * which render below this bar in the content area.
 *
 * @version 2.0
 * @updated 2026-01-23 - Removed tile nav (replaced by folder tabs)
 */
interface ProjectContextBarProps {
  projectId: number;
}

export default function ProjectContextBar({ projectId }: ProjectContextBarProps) {
  const { projects, activeProject, selectProject } = useProjectContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  if (!project) {
    return null;
  }

  const handleProjectChange = (newProjectId: number) => {
    const targetProject = projects.find((p) => p.project_id === newProjectId);
    const targetUrl = getProjectSwitchUrl(
      newProjectId,
      pathname,
      targetProject?.project_type_code,
      searchParams
    );
    selectProject(newProjectId);
    router.push(targetUrl);
  };

  return (
    <div
      className="project-context-bar"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderBottom: '1px solid var(--cui-border-color)',
        padding: '0.5rem var(--app-padding, 1rem)',
      }}
    >
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <span
            className="fw-semibold"
            style={{
              color: 'var(--cui-body-color)',
              fontSize: '0.9rem',
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
              backgroundColor: 'var(--cui-tertiary-bg)',
              borderColor: 'var(--cui-border-color)',
              color: 'var(--cui-body-color)',
              border: '1px solid var(--cui-border-color)',
              cursor: 'pointer',
              minWidth: '320px',
              fontSize: '0.9rem',
            }}
          >
            {projects.map((proj) => (
              <option key={proj.project_id} value={proj.project_id}>
                {proj.project_name} - {proj.project_type_code || 'Unknown'}
              </option>
            ))}
          </select>
          {/* Project type badge */}
          <span
            className="px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--cui-primary-bg)',
              color: 'var(--cui-primary)',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {project.project_type_code === 'LAND' ? 'Land Development' : 'Income Property'}
          </span>
        </div>
      </div>
    </div>
  );
}
