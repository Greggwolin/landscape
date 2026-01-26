'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import { cilFolder, cilChevronLeft } from '@coreui/icons';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface CollapsibleContentProps {
  children: React.ReactNode;
  projectId: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  showHeader?: boolean; // If false, just renders children without the project selector header
}

export function CollapsibleContent({
  children,
  projectId,
  isCollapsed,
  onToggleCollapse,
  showHeader = true,
}: CollapsibleContentProps) {
  const { projects, activeProject, selectProject } = useProjectContext();
  const router = useRouter();

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}`);
  };

  if (isCollapsed) {
    return (
      <div
        className="h-full flex flex-col items-center py-3 cursor-pointer hover:bg-hover-overlay transition-colors"
        onClick={onToggleCollapse}
        style={{
          backgroundColor: 'var(--surface-card)',
          borderRadius: 'var(--cui-card-border-radius)',
          width: '48px',
          minWidth: '48px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        <CIcon icon={cilFolder} size="lg" className="text-muted" />
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col shadow-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--surface-card)',
        borderRadius: 'var(--cui-card-border-radius)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        width: '750px',
        minWidth: '750px',
        flexShrink: 0,
      }}
    >
      {/* Header with Project Selector - sticky (optional) */}
      {showHeader && (
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border sticky top-0 z-10"
          style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
        >
          <div className="flex items-center gap-3">
            <CIcon icon={cilFolder} size="sm" className="text-muted" />
            <label className="text-sm font-semibold text-foreground whitespace-nowrap">
              Active Project:
            </label>
            <select
              value={project?.project_id ?? projectId}
              onChange={(e) => handleProjectChange(Number(e.target.value))}
              className="px-2 py-1 rounded border border-border bg-background text-foreground text-sm cursor-pointer"
              style={{ maxWidth: '200px' }}
              disabled={!project}
            >
              {projects.length > 0 ? (
                projects.map((proj) => (
                  <option key={proj.project_id} value={proj.project_id}>
                    {proj.project_name} - {proj.project_type_code || 'LAND'}
                  </option>
                ))
              ) : (
                <option value={projectId}>Loading...</option>
              )}
            </select>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-hover-overlay text-muted hover:text-foreground transition-colors"
            aria-label="Collapse content panel"
          >
            <CIcon icon={cilChevronLeft} size="sm" />
          </button>
        </div>
      )}

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-3">
        {children}
      </div>
    </div>
  );
}
