/**
 * ActiveProjectBar Component
 *
 * Full-width sticky bar below the top nav containing:
 * - Project selector dropdown (left)
 * - Property type pill (color-coded)
 * - Analysis type badge (CoreUI color)
 * - Version badge (right side)
 *
 * Chevron collapse/expand for Landscaper is NOT here — it lives in the Landscaper panel header.
 *
 * @version 2.0
 * @created 2026-01-28
 * @updated 2026-02-08 - Renamed from StudioProjectBar, added pills, removed chevron
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CBadge } from '@coreui/react';
import { useSWRConfig } from 'swr';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { getProjectSwitchUrl } from '@/lib/utils/folderTabConfig';
import { VersionBadge } from '@/components/changelog';
import {
  getPropertyTypeTokenRef,
  getPropertyTypeLabel,
} from '@/config/propertyTypeTokens';
import {
  PERSPECTIVE_LABELS,
  PURPOSE_LABELS,
  deriveDimensionsFromAnalysisType,
  type AnalysisPerspective,
  type AnalysisPurpose,
} from '@/types/project-taxonomy';

interface ActiveProjectBarProps {
  projectId: number;
}

export function ActiveProjectBar({
  projectId,
}: ActiveProjectBarProps) {
  const { projects, activeProject, selectProject, refreshProjects } = useProjectContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [overridePerspective, setOverridePerspective] = useState<AnalysisPerspective | null>(null);
  const [overridePurpose, setOverridePurpose] = useState<AnalysisPurpose | null>(null);

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  const fallbackDimensions = useMemo(() => {
    if (!project) return null;
    return deriveDimensionsFromAnalysisType(project.analysis_type ?? undefined);
  }, [project]);

  const resolvedPerspective = project
    ? ((project.analysis_perspective?.toUpperCase() as AnalysisPerspective | undefined)
      ?? fallbackDimensions?.analysis_perspective)
    : undefined;
  const resolvedPurpose = project
    ? ((project.analysis_purpose?.toUpperCase() as AnalysisPurpose | undefined)
      ?? fallbackDimensions?.analysis_purpose)
    : undefined;

  const displayPerspective = overridePerspective ?? resolvedPerspective;
  const displayPurpose = overridePurpose ?? resolvedPurpose;

  useEffect(() => {
    setOverridePerspective(null);
    setOverridePurpose(null);
  }, [projectId, project?.analysis_perspective, project?.analysis_purpose, project?.analysis_type]);

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

  // Resolve property type pill — try each field until one produces a valid token
  const ptCandidates = [project?.property_subtype, project?.project_type, project?.project_type_code];
  const ptMatch = ptCandidates.find((v) => v && getPropertyTypeTokenRef(v));
  const ptTokenRef = getPropertyTypeTokenRef(ptMatch);
  // For the label, prefer the most specific field that has a value
  const ptLabelSource = ptCandidates.find((v) => !!v) || ptMatch;
  const ptLabel = getPropertyTypeLabel(ptLabelSource);

  const perspectiveLabel = displayPerspective ? PERSPECTIVE_LABELS[displayPerspective] : null;
  const purposeLabel = displayPurpose ? PURPOSE_LABELS[displayPurpose] : null;

  const updateAnalysisDimensions = async (
    nextPerspective: AnalysisPerspective,
    nextPurpose: AnalysisPurpose,
    previousPerspective?: AnalysisPerspective,
    previousPurpose?: AnalysisPurpose
  ) => {
    if (!project) return;

    setIsUpdating(true);
    try {
      const payload: Record<string, unknown> = {
        analysis_perspective: nextPerspective,
        analysis_purpose: nextPurpose,
      };

      if (nextPerspective !== 'INVESTMENT') {
        payload.value_add_enabled = false;
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to update project analysis settings');
      }

      await Promise.all([
        mutate(`/api/projects/${projectId}/profile`),
        mutate(`/api/projects/${projectId}`),
      ]);
      refreshProjects();
    } catch (error) {
      setOverridePerspective(previousPerspective ?? null);
      setOverridePurpose(previousPurpose ?? null);
      console.error('Failed to update analysis settings:', error);
      alert(`Failed to update analysis settings: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTogglePerspective = () => {
    if (!displayPerspective || !displayPurpose || isUpdating) return;
    const previousPerspective = displayPerspective;
    const previousPurpose = displayPurpose;
    const nextPerspective = displayPerspective === 'INVESTMENT' ? 'DEVELOPMENT' : 'INVESTMENT';
    setOverridePerspective(nextPerspective);
    void updateAnalysisDimensions(nextPerspective, displayPurpose, previousPerspective, previousPurpose);
  };

  const handleTogglePurpose = () => {
    if (!displayPerspective || !displayPurpose || isUpdating) return;
    const previousPerspective = displayPerspective;
    const previousPurpose = displayPurpose;
    const nextPurpose = displayPurpose === 'VALUATION' ? 'UNDERWRITING' : 'VALUATION';
    setOverridePurpose(nextPurpose);
    void updateAnalysisDimensions(displayPerspective, nextPurpose, previousPerspective, previousPurpose);
  };

  return (
    <div
      className="active-project-bar"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        flexShrink: 0,
        position: 'sticky',
        top: '58px', // Height of TopNavigationBar
        zIndex: 40,  // Below top nav (50), above content
        backgroundColor: 'var(--surface-card-header)',
        borderBottom: '1px solid var(--cui-border-color)',
        /* Break out of parent app-shell/app-page padding to span full width */
        marginLeft: 'calc(-1 * var(--app-padding, 0.75rem))',
        marginRight: 'calc(-1 * var(--app-padding, 0.75rem))',
        marginTop: 'calc(-1 * var(--app-padding, 0.75rem))',
        marginBottom: '0.5rem',
        width: 'calc(100% + 2 * var(--app-padding, 0.75rem))',
      }}
    >
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

      {/* Property Type Pill */}
      {ptTokenRef && (
        <span
          style={{
            backgroundColor: ptTokenRef.bgVar,
            color: ptTokenRef.textVar,
            padding: '2px 10px',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            lineHeight: '1.5',
          }}
        >
          {ptLabel}
        </span>
      )}

      {/* Perspective badge */}
      {perspectiveLabel && (
        <button
          type="button"
          onClick={handleTogglePerspective}
          disabled={isUpdating}
          title="Toggle perspective"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
          }}
        >
          <CBadge
            color="info"
            style={{
              fontSize: '0.75rem',
              borderRadius: '4px',
              opacity: isUpdating ? 0.7 : 1,
            }}
          >
            {perspectiveLabel}
          </CBadge>
        </button>
      )}

      {/* Purpose badge */}
      {purposeLabel && (
        <button
          type="button"
          onClick={handleTogglePurpose}
          disabled={isUpdating}
          title="Toggle purpose"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            display: 'inline-flex',
            alignItems: 'center',
            cursor: isUpdating ? 'not-allowed' : 'pointer',
          }}
        >
          <CBadge
            color="primary"
            style={{
              fontSize: '0.75rem',
              borderRadius: '4px',
              opacity: isUpdating ? 0.7 : 1,
            }}
          >
            {purposeLabel}
          </CBadge>
        </button>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Version badge - right side */}
      <VersionBadge />
    </div>
  );
}
