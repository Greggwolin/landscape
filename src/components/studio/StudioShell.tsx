'use client';

/**
 * StudioShell — the three-zone project workspace.
 *
 *   LEFT  : <StudioSidebar> — the real unified-UI WrapperSidebar (global nav +
 *           search + threads + recents) with the project folder/sub-tab tree
 *   CENTER: <CenterChatPanel> — Landscaper chat (the driver)  [reused from /w/]
 *   RIGHT : <RightContentPanel> hosting <ProjectContentRouter> output  [reused]
 *
 * Width-sharing: the center and right panels are both `flex: 1; min-width: 0`
 * (wrapper.css), so they split whatever the fixed-width rail leaves. Closing
 * chat makes CenterChatPanel render null → content takes the full width;
 * collapsing content (local `contentOpen`) shows a thin strip → chat takes the
 * full width. The rail itself collapses to an icon strip (local `railCollapsed`).
 *
 * Project sourcing mirrors the classic /projects/[id] page exactly (cache via
 * useProjectContext + direct fallback fetch), so the rail tree and the routed
 * content match the legacy surface for every project type.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProjectContext, type ProjectSummary } from '@/app/components/ProjectProvider';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { getAuthHeaders } from '@/lib/authHeaders';
import { CenterChatPanel } from '@/components/wrapper/CenterChatPanel';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { ArtifactWorkspacePanel } from '@/components/wrapper/ArtifactWorkspacePanel';
import { LocationBriefArtifact } from '@/components/wrapper/LocationBriefArtifact';
import { MapArtifactRenderer } from '@/components/wrapper/MapArtifactRenderer';
import { ExcelAuditArtifact } from '@/components/wrapper/ExcelAuditArtifact';
import { formatFolderLabel } from '@/lib/utils/folderTabConfig';
import ProjectContentRouter from '@/app/projects/[projectId]/ProjectContentRouter';
import { StudioSidebar } from './StudioSidebar';

function StudioShellInner() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const { projects, activeProject, isLoading } = useProjectContext();
  const {
    chatOpen,
    activeArtifactId,
    setActiveArtifactId,
    activeLocationBrief,
    setActiveLocationBrief,
    activeMapArtifact,
    setActiveMapArtifact,
    activeExcelAudit,
    setActiveExcelAudit,
  } = useWrapperUI();

  // Local zone state (kept out of WrapperUIContext so /w/ semantics are untouched).
  // Rail collapse is owned by WrapperSidebar (inside StudioSidebar); only the
  // right content panel's collapse is tracked here.
  const [contentOpen, setContentOpen] = useState(true);

  // ── Project sourcing (mirrors classic page.tsx) ──────────────────────
  const [fallbackProject, setFallbackProject] = useState<ProjectSummary | null>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const fallbackAttempted = useRef(false);

  const projectFromCache =
    projects.find((p) => p.project_id === projectId) ||
    (activeProject?.project_id === projectId ? activeProject : null);

  useEffect(() => {
    setFallbackProject(null);
    setFallbackLoading(false);
    setFallbackFailed(false);
    fallbackAttempted.current = false;
  }, [projectId]);

  useEffect(() => {
    if (projectFromCache || isLoading || fallbackAttempted.current) return;
    fallbackAttempted.current = true;
    setFallbackLoading(true);
    fetch(`/api/projects/${projectId}`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: ProjectSummary) => {
        setFallbackProject(data);
        setFallbackLoading(false);
      })
      .catch(() => {
        setFallbackFailed(true);
        setFallbackLoading(false);
      });
  }, [projectFromCache, isLoading, projectId]);

  const currentProject = projectFromCache ?? fallbackProject;

  const effectivePropertyType =
    currentProject?.project_type_code ||
    currentProject?.project_type ||
    currentProject?.property_subtype;

  const { currentFolder, currentTab, setFolderTab, folderConfig } = useFolderNavigation({
    propertyType: effectivePropertyType ?? undefined,
    analysisType: currentProject?.analysis_type ?? undefined,
    analysisPerspective: currentProject?.analysis_perspective,
    analysisPurpose: currentProject?.analysis_purpose,
    valueAddEnabled: currentProject?.value_add_enabled ?? false,
    tileConfig: currentProject?.tile_config,
  });

  // ── Loading / not-found (same gates as classic) ─────────────────────
  if (isLoading || fallbackLoading) {
    return (
      <div className="studio-shell">
        <div className="folder-content-placeholder" style={{ margin: 'auto' }}>
          <p>Loading project…</p>
        </div>
      </div>
    );
  }
  if (!currentProject && fallbackFailed) {
    return (
      <div className="studio-shell">
        <div className="folder-content-placeholder" style={{ margin: 'auto' }}>
          <div className="folder-content-placeholder-icon">&#10067;</div>
          <h2>Project Not Found</h2>
          <p>Project ID {projectId} does not exist.</p>
        </div>
      </div>
    );
  }
  if (!currentProject) {
    return (
      <div className="studio-shell">
        <div className="folder-content-placeholder" style={{ margin: 'auto' }}>
          <p>Loading project…</p>
        </div>
      </div>
    );
  }

  // Title for the right panel header: folder label (+ active sub-tab label).
  const activeFolder = folderConfig.folders.find((f) => f.id === currentFolder);
  const activeSub = activeFolder?.subTabs.find((s) => s.id === currentTab);
  const contentTitle = activeFolder
    ? activeSub
      ? `${formatFolderLabel(activeFolder.label)} · ${activeSub.label}`
      : formatFolderLabel(activeFolder.label)
    : 'Project';

  // ProjectSummary's nullable fields vs ProjectContentRouter's optional fields
  // are structurally compatible at runtime (same pre-existing cast as classic).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routerProject = currentProject as any;

  // The one right panel holds two content kinds: a Landscaper artifact when one
  // is active (set by CenterChatPanel tool results), otherwise the structured
  // router surface. Closing an artifact returns to the structured surface.
  const hasArtifact =
    activeArtifactId != null ||
    !!activeLocationBrief ||
    !!activeMapArtifact ||
    !!activeExcelAudit;

  return (
    <div className="studio-shell">
      {/* LEFT — the REAL unified-UI sidebar (global nav, search, threads,
          recents, footer) with the project folder/sub-tab tree added via the
          `projectNav` prop. Owns its own collapse + resize. */}
      <StudioSidebar
        projectId={projectId}
        projectName={currentProject.project_name}
        folders={folderConfig.folders}
        currentFolder={currentFolder}
        currentTab={currentTab}
        onSelectFolder={(folderId) => setFolderTab(folderId)}
        onSelectTab={(folderId, tabId) => setFolderTab(folderId, tabId)}
      />

      {/* CENTER — Landscaper chat (renders null when chatOpen is false) */}
      <CenterChatPanel
        projectId={projectId}
        projectName={currentProject.project_name}
        projectTypeCode={effectivePropertyType ?? undefined}
      />

      {/* RIGHT — one panel, two content kinds: active artifact OR routed surface */}
      {contentOpen ? (
        hasArtifact ? (
          <div className="wrapper-right-panel">
            {activeArtifactId != null ? (
              <ArtifactWorkspacePanel projectId={projectId} takeoverMode />
            ) : activeLocationBrief ? (
              <LocationBriefArtifact
                config={activeLocationBrief}
                onClose={() => setActiveLocationBrief(null)}
              />
            ) : activeMapArtifact ? (
              <MapArtifactRenderer
                config={activeMapArtifact}
                onClose={() => setActiveMapArtifact(null)}
              />
            ) : activeExcelAudit ? (
              <ExcelAuditArtifact
                config={activeExcelAudit}
                onClose={() => setActiveExcelAudit(null)}
              />
            ) : null}
          </div>
        ) : (
          <RightContentPanel
            title={contentTitle}
            subtitle={currentProject.project_name}
            actions={
              <button
                type="button"
                className="w-btn w-btn-icon"
                title={chatOpen ? 'Collapse content (chat full width)' : 'Collapse content'}
                aria-label="Collapse content panel"
                onClick={() => setContentOpen(false)}
              >
                ⇥
              </button>
            }
          >
            <ProjectContentRouter
              project={routerProject}
              currentFolder={currentFolder}
              currentTab={currentTab}
              setFolderTab={setFolderTab}
            />
          </RightContentPanel>
        )
      ) : (
        <div className="studio-content-collapsed">
          <button
            type="button"
            className="studio-content-expand"
            title="Show content panel"
            aria-label="Show content panel"
            onClick={() => setContentOpen(true)}
          >
            ⇤
          </button>
        </div>
      )}
    </div>
  );
}

export function StudioShell() {
  return <StudioShellInner />;
}

export default StudioShell;
