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
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CCard } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilChevronDoubleLeft, cilChevronDoubleRight, cilLifeRing } from '@coreui/icons';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { getProjectSwitchUrl } from '@/lib/utils/folderTabConfig';

interface StudioProjectBarProps {
  projectId: number;
  isLandscaperCollapsed: boolean;
  onToggleLandscaper: () => void;
  onAlphaAssistantClick?: () => void;
}

export function StudioProjectBar({
  projectId,
  isLandscaperCollapsed,
  onToggleLandscaper,
  onAlphaAssistantClick,
}: StudioProjectBarProps) {
  const { projects, activeProject, selectProject } = useProjectContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

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

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Alpha Assistant button - right side */}
      {onAlphaAssistantClick && (
        <button
          onClick={onAlphaAssistantClick}
          className="alpha-assistant-trigger"
          title="Alpha Assistant - Help, Chat & Feedback"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.375rem 0.75rem',
            border: '1px solid var(--cui-border-color)',
            borderRadius: '6px',
            backgroundColor: 'var(--cui-body-bg)',
            color: 'var(--cui-body-color)',
            cursor: 'pointer',
            fontSize: '0.8125rem',
            fontWeight: 500,
          }}
        >
          <CIcon icon={cilLifeRing} size="sm" />
          <span>Alpha Tester</span>
        </button>
      )}
    </CCard>
  );
}
