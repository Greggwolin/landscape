/**
 * ActiveProjectBar Component
 *
 * Full-width sticky bar below the top nav containing:
 * - Left block: Project selector dropdown + analysis pills (stacked)
 * - Center: Compact monochrome nav tiles (folder navigation)
 * - Right: Version badge
 *
 * Nav tiles replace the old Row 1 colored folder tabs.
 * Sub-tabs (Row 2) remain in the FolderTabs component inside the content card.
 *
 * @version 3.0
 * @created 2026-01-28
 * @updated 2026-02-22 - Integrated nav tiles, removed "Active Project" label, two-row left block
 */

'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CBadge } from '@coreui/react';
import { useSWRConfig } from 'swr';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { getProjectSwitchUrl, isTwoLineLabel } from '@/lib/utils/folderTabConfig';
import type { FolderTab } from '@/lib/utils/folderTabConfig';
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

/* ── Nav tile button (memoized) ── */
interface NavTileProps {
  folder: FolderTab;
  isActive: boolean;
  onClick: () => void;
}

const NavTile = memo(function NavTile({ folder, isActive, onClick }: NavTileProps) {
  const label = folder.label;
  const twoLine = isTwoLineLabel(label);

  return (
    <button
      type="button"
      className={`bar-nav-tile ${twoLine ? 'bar-nav-tile-lines' : ''} ${isActive ? 'active' : ''}`}
      data-folder={folder.id}
      onClick={onClick}
      aria-selected={isActive}
      role="tab"
    >
      {twoLine ? (
        <>
          <span className="bar-nav-tile-primary">{label.primary}</span>
          <span className="bar-nav-tile-secondary">{label.secondary}</span>
        </>
      ) : (
        <span>{label as string}</span>
      )}
    </button>
  );
});

/* ── Main component ── */
interface ActiveProjectBarProps {
  projectId: number;
  /** Folder configurations from useFolderNavigation */
  folders: FolderTab[];
  /** Currently active folder ID */
  currentFolder: string;
  /** Callback when user clicks a nav tile */
  onFolderNavigate: (folder: string, tab: string) => void;
}

export function ActiveProjectBar({
  projectId,
  folders,
  currentFolder,
  onFolderNavigate,
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

  const handleFolderClick = (folder: FolderTab) => {
    const defaultTab = folder.subTabs[0]?.id || 'overview';
    onFolderNavigate(folder.id, defaultTab);
  };

  // Resolve property type pill — prefer project_type (e.g. "Multifamily") over subtype
  const ptCandidates = [project?.project_type, project?.project_type_code, project?.property_subtype];
  const ptMatch = ptCandidates.find((v) => v && getPropertyTypeTokenRef(v));
  const ptTokenRef = getPropertyTypeTokenRef(ptMatch);
  const ptLabelSource = ptCandidates.find((v) => !!v) || ptMatch;
  const ptLabel = getPropertyTypeLabel(ptLabelSource);

  const perspectiveLabel = displayPerspective ? PERSPECTIVE_LABELS[displayPerspective] : null;
  const purposeLabel = displayPurpose ? PURPOSE_LABELS[displayPurpose] : null;

  // Adaptive pill font size — shrink when the longest label would overflow
  const pillLabels = [ptLabel, perspectiveLabel, purposeLabel].filter(Boolean) as string[];
  const maxLen = Math.max(...pillLabels.map((l) => l.length), 0);
  const pillFontSize = maxLen > 13 ? '0.68rem' : maxLen > 10 ? '0.72rem' : '0.78rem';

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
      data-coreui-theme="dark"
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        flexShrink: 0,
        position: 'sticky',
        top: '58px',
        zIndex: 40,
        backgroundColor: '#1f2a37',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        marginLeft: 'calc(-1 * var(--app-padding, 0.75rem))',
        marginRight: 'calc(-1 * var(--app-padding, 0.75rem))',
        marginTop: 'calc(-1 * var(--app-padding, 0.75rem))',
        marginBottom: '0.5rem',
        width: 'calc(100% + 2 * var(--app-padding, 0.75rem))',
      }}
    >
      {/* Left block: Selector + Pills — fixed width, independent of panel state */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0, width: 296, overflow: 'hidden' }}>
        {/* Project selector dropdown */}
        <select
          value={project?.project_id || ''}
          onChange={(e) => handleProjectChange(Number(e.target.value))}
          className="fw-medium rounded"
          style={{
            backgroundColor: '#111827',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            height: '36px',
            width: '100%',
            padding: '0 0.6rem',
          }}
        >
          {projects.map((proj) => (
            <option key={proj.project_id} value={proj.project_id}>
              {proj.project_id} - {proj.project_name}
            </option>
          ))}
        </select>

        {/* Pills row — spread evenly under selector, constrained to parent width */}
        <div style={{ display: 'flex', gap: '0.35rem', width: '100%', minWidth: 0, overflow: 'hidden' }}>
          {/* Property Type Pill */}
          {ptTokenRef && (
            <span
              style={{
                flex: '1 1 0',
                minWidth: 0,
                textAlign: 'center',
                backgroundColor: ptTokenRef.bgVar,
                color: ptTokenRef.textVar,
                padding: '0.2rem 0.4rem',
                borderRadius: '4px',
                fontSize: pillFontSize,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: '1.4',
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
                flex: '1 1 0',
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
              }}
            >
              <CBadge
                color="info"
                style={{
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  fontSize: pillFontSize,
                  borderRadius: '4px',
                  opacity: isUpdating ? 0.7 : 1,
                  lineHeight: '1.4',
                  padding: '0.2rem 0.4rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
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
                flex: '1 1 0',
                minWidth: 0,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: isUpdating ? 'not-allowed' : 'pointer',
              }}
            >
              <CBadge
                color="primary"
                style={{
                  display: 'block',
                  width: '100%',
                  minWidth: 0,
                  fontSize: pillFontSize,
                  borderRadius: '4px',
                  opacity: isUpdating ? 0.7 : 1,
                  lineHeight: '1.4',
                  padding: '0.2rem 0.4rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {purposeLabel}
              </CBadge>
            </button>
          )}
        </div>
      </div>

      {/* Nav Tiles — compact monochrome folder navigation */}
      <div className="bar-nav-tiles" role="tablist" aria-label="Main navigation">
        {folders.map((folder) => (
          <NavTile
            key={folder.id}
            folder={folder}
            isActive={folder.id === currentFolder}
            onClick={() => handleFolderClick(folder)}
          />
        ))}
      </div>

      {/* Version badge - right side */}
      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
        <VersionBadge />
      </div>
    </div>
  );
}
