/**
 * StudioProjectBar Component
 *
 * Full-width bar above the Studio split layout containing:
 * - Project selector dropdown (left)
 * - Collapse toggle for Landscaper panel (left, after selector)
 * - Future: vitals, completeness chips (right side)
 *
 * @version 1.0
 * @created 2026-01-28
 */

'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CCard } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronDoubleLeft, cilChevronDoubleRight } from '@coreui/icons';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface StudioProjectBarProps {
  projectId: number;
  isLandscaperCollapsed: boolean;
  onToggleLandscaper: () => void;
}

export function StudioProjectBar({
  projectId,
  isLandscaperCollapsed,
  onToggleLandscaper,
}: StudioProjectBarProps) {
  const { projects, activeProject, selectProject } = useProjectContext();
  const router = useRouter();

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}`);
  };

  // Match the Landscaper CCard exactly for consistent border/shadow styling
  return (
    <CCard
      className="studio-project-bar shadow-lg"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        flexShrink: 0,
        backgroundColor: 'var(--surface-card-header)',
      }}
    >
      {/* Collapse/Expand toggle for Landscaper - leftmost */}
      <button
        onClick={onToggleLandscaper}
        className="studio-collapse-toggle"
        title={isLandscaperCollapsed ? 'Expand Landscaper' : 'Collapse Landscaper'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          padding: 0,
          border: '1px solid var(--cui-border-color)',
          borderRadius: '6px',
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <CIcon
          icon={isLandscaperCollapsed ? cilChevronDoubleRight : cilChevronDoubleLeft}
          size="lg"
        />
      </button>

      {/* Active Project label */}
      <span
        className="font-semibold"
        style={{
          color: 'var(--cui-body-color)',
          fontSize: '0.875rem',
          whiteSpace: 'nowrap',
        }}
      >
        Active Project
      </span>

      {/* Project selector dropdown */}
      <select
        value={project?.project_id || ''}
        onChange={(e) => handleProjectChange(Number(e.target.value))}
        className="px-3 py-1.5 fw-medium rounded"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          borderColor: 'var(--cui-border-color)',
          color: 'var(--cui-body-color)',
          border: '1px solid var(--cui-border-color)',
          cursor: 'pointer',
          fontSize: '0.8125rem',
          height: '32px',
          minWidth: '180px',
          flex: '0 1 auto',
        }}
      >
        {projects.map((proj) => (
          <option key={proj.project_id} value={proj.project_id}>
            {proj.project_id} - {proj.project_name}
          </option>
        ))}
      </select>

      {/* Right section: Future vitals, completeness chips, etc. */}
      <div style={{ flex: 1 }} />
    </CCard>
  );
}
