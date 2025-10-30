'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { getTabsForPropertyType } from '@/lib/utils/projectTabs';

/**
 * ProjectContextBar - Tier 2 Project Navigation
 *
 * Renders project-specific navigation bar with:
 * - Project selector dropdown (left)
 * - Project tabs (right)
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
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'project';

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  const tabs = useMemo(() => {
    return getTabsForPropertyType(project?.property_type_code);
  }, [project]);

  if (!project) {
    return null;
  }

  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}`);
  };

  const handleTabChange = (tabId: string) => {
    router.push(`/projects/${projectId}?tab=${tabId}`);
  };

  return (
    <div
      className="flex items-center gap-8 px-6 h-14 border-b"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)',
      }}
    >
      {/* Project Selector - Left */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          Active Project:
        </span>
        <select
          value={project.project_id}
          onChange={(e) => handleProjectChange(Number(e.target.value))}
          className="px-3 py-2 text-sm font-medium rounded-md transition-colors"
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
              {proj.project_name} - {proj.property_type_code || 'Unknown'}
            </option>
          ))}
        </select>
      </div>

      {/* Project Tabs - Right */}
      <div className="flex flex-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className="px-5 py-4 text-sm font-medium transition-colors relative"
              style={{
                color: isActive
                  ? 'var(--cui-primary)'
                  : 'var(--cui-secondary-color)',
                borderBottom: isActive
                  ? '2px solid var(--cui-primary)'
                  : '2px solid transparent',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor =
                    'rgba(74, 158, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
