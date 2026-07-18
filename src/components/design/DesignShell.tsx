'use client';

/**
 * DesignShell — the three-zone project workspace, restyled (Stage A).
 *
 * A visual clone of StudioShell: the hook/logic body is verbatim from
 * src/components/studio/StudioShell.tsx — project sourcing (useProjectContext +
 * fallback fetch), useFolderNavigation, buildScreenManifest → availableScreens,
 * the navigate_screen / navigate command subscriptions, handleBeforeUserSend
 * (deterministic screen-router, JB37/JB43), handleNewChat remount, the
 * artifact-clear-on-nav effects, pop-out overlay, and nav toast. Only the JSX
 * class names change (design-* root + strips), plus the sidebar import. The
 * visual deltas live entirely in design.css (loaded last by the layout).
 *
 *   LEFT  : <DesignSidebar> — the real unified-UI WrapperSidebar (global nav +
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useProjectContext, type ProjectSummary } from '@/app/components/ProjectProvider';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { useLandscapeCommand } from '@/lib/landscape-command-bus';
import { getAuthHeaders } from '@/lib/authHeaders';
import { CenterChatPanel } from '@/components/wrapper/CenterChatPanel';
import { RightContentPanel } from '@/components/wrapper/RightContentPanel';
import { ArtifactWorkspacePanel } from '@/components/wrapper/ArtifactWorkspacePanel';
import { LocationBriefArtifact } from '@/components/wrapper/LocationBriefArtifact';
import { MapArtifactRenderer } from '@/components/wrapper/MapArtifactRenderer';
import { ExcelAuditArtifact } from '@/components/wrapper/ExcelAuditArtifact';
import { formatFolderLabel } from '@/lib/utils/folderTabConfig';
import { resolveScreenIntent } from '@/lib/studio/screenIntent';
import { buildScreenManifest } from '@/lib/studio/screenManifest';
import ProjectContentRouter from '@/app/projects/[projectId]/ProjectContentRouter';
import { DesignSidebar } from './DesignSidebar';
import { DesignProjectHome } from './DesignProjectHome';

/**
 * Stage B per-screen compositions (reference frames). A folder id present here
 * renders the design composition instead of the routed legacy screen; every
 * other screen falls through to ProjectContentRouter unchanged. Add one screen
 * at a time — this map IS the per-screen flag.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DESIGN_COMPOSITIONS: Record<string, React.ComponentType<{ project: any }>> = {
  home: DesignProjectHome,
};

function DesignShellInner() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const router = useRouter();
  const searchParams = useSearchParams();
  // Thread deep-link: /design/[id]?thread=<uuid> opens that specific conversation
  // (mirrors how /w/ wires initialThreadId). Many entry points carry ?thread.
  const _threadParam = searchParams.get('thread');
  const initialThreadId =
    _threadParam && /^[0-9a-fA-F-]{36}$/.test(_threadParam) ? _threadParam : undefined;
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
  // Rail collapse is owned by WrapperSidebar (inside DesignSidebar); only the
  // right content panel's collapse is tracked here.
  const [contentOpen, setContentOpen] = useState(true);
  // Right panel view: the routed screen, or the artifacts workspace. The
  // artifacts trigger lives in the right-panel header (not the left rail).
  const [rightView, setRightView] = useState<'screen' | 'artifacts'>('screen');
  // Pop-out (right-panel reflow, Phase 1): promote the routed screen to a
  // full-window overlay — the SAME render, just more room — for screens that
  // assume a wide viewport (grids, side-by-side panels). Toggled from the
  // right-panel header; Esc or the header collapse button returns. Independent
  // of chat/artifacts state.
  const [expanded, setExpanded] = useState(false);

  // Ephemeral screen-router confirmation (JB43). A nav hit shows a transient
  // toast — NOT a chat message — so a pure-nav request never masquerades as a
  // saved conversation in a phantom thread. Keyed by an incrementing nonce so
  // repeating the same nav re-triggers the toast + its auto-dismiss timer.
  const [navToast, setNavToast] = useState<{ text: string; n: number } | null>(null);
  const navToastN = useRef(0);
  const showNavToast = useCallback((text: string) => {
    navToastN.current += 1;
    setNavToast({ text, n: navToastN.current });
  }, []);
  useEffect(() => {
    if (!navToast) return;
    const t = setTimeout(() => setNavToast(null), 2200);
    return () => clearTimeout(t);
  }, [navToast]);

  // Esc closes the pop-out overlay (Phase 1). Kept above the early-return gates
  // so the hook order is stable.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  // New-chat force-remount key (JB43). Bumping this remounts the chat subtree so
  // the active thread resets to null (JB33 blank — first send creates the
  // thread). Used by both the header "+" and the sidebar "New chat".
  const [chatSessionKey, setChatSessionKey] = useState(0);

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

  // The one right panel holds two content kinds: a Landscaper artifact when one
  // is active (set by CenterChatPanel tool results), otherwise the structured
  // router surface.
  // Live screen manifest sent to the model each turn (JB50 slice 1) — the real,
  // project-type-aware screen list derived from the same folderConfig the rail uses.
  const availableScreens = useMemo(
    () => buildScreenManifest(folderConfig.folders),
    [folderConfig.folders],
  );

  const hasArtifact =
    activeArtifactId != null ||
    !!activeLocationBrief ||
    !!activeMapArtifact ||
    !!activeExcelAudit;

  // Clear the active artifact pointers and return the right panel to the routed
  // screen. The artifact is NOT deleted — it stays in the Artifacts list/history;
  // this just stops it covering the screen. Mirrors the folder-click path's
  // clear (DesignSidebar.clearActiveArtifacts) so EVERY navigation behaves the
  // same (JB45).
  const clearActiveArtifacts = useCallback(() => {
    setActiveArtifactId(null);
    setActiveLocationBrief(null);
    setActiveMapArtifact(null);
    setActiveExcelAudit(null);
    setRightView('screen');
  }, [setActiveArtifactId, setActiveLocationBrief, setActiveMapArtifact, setActiveExcelAudit]);

  // Navigating to a screen (folder click, router, or navigate_screen command —
  // all change currentFolder/currentTab) replaces any open artifact with that
  // screen. A chat-created artifact (no folder change) still opens the artifacts
  // view automatically. These hooks MUST run before any early return
  // (rules-of-hooks) — keep them above the loading/not-found gates.
  useEffect(() => { clearActiveArtifacts(); }, [currentFolder, currentTab, clearActiveArtifacts]);
  useEffect(() => { if (hasArtifact) setRightView('artifacts'); }, [hasArtifact]);

  // Chat drives the screens: navigate_to_screen emits a navigate_screen command;
  // switch the folder/sub-tab in place. Stays above the early-return gates.
  useLandscapeCommand(
    'navigate_screen',
    useCallback(
      (p: { folder: string; tab?: string }) => {
        setFolderTab(p.folder, p.tab);
        clearActiveArtifacts(); // JB45: bring the screen to the front
      },
      [setFolderTab, clearActiveArtifacts],
    ),
  );

  // Deterministic screen-router (JB37): intercept clean "show me / open / take
  // me to [screen]" messages in code BEFORE the model is invoked, so the LLM
  // can't reinterpret a pure nav request (it has variously narrated, opened the
  // report catalog, or computed instead). On a hit it navigates, clears any open
  // artifact so the screen comes to the front (JB45), shows an ephemeral toast,
  // and returns true to short-circuit the send (JB43 — no chat message injected).
  // Returns false for anything not a clean nav phrase, so data questions and
  // qualified phrases ("what's the budget", "...breakdown by phase") reach the model.
  const handleBeforeUserSend = useCallback(
    (text: string): boolean => {
      const target = resolveScreenIntent(text, folderConfig.folders);
      if (!target) return false;
      setFolderTab(target.folder, target.tab);
      clearActiveArtifacts(); // JB45: navigating replaces the open artifact
      showNavToast(`Opening ${target.label}.`);
      return true;
    },
    [folderConfig.folders, setFolderTab, clearActiveArtifacts, showNavToast],
  );

  // New chat IN PLACE (JB43): start a fresh blank design chat. Drop any ?thread
  // deep-link so a refresh stays blank, then remount the chat subtree so the
  // active thread resets to null (JB33 — first send creates + persists it). No
  // /w/chat redirect, no eager thread create, no 404. Shared by the header "+"
  // (CenterChatPanel) and the sidebar "New chat" (DesignSidebar).
  const handleNewChat = useCallback(() => {
    if (searchParams.get('thread')) {
      router.replace(`/design/${projectId}`);
    }
    setChatSessionKey((k) => k + 1);
  }, [searchParams, router, projectId]);

  // Project / dashboard navigation from chat: navigate_to_project &
  // navigate_to_dashboard emit a 'navigate' command with a target_url. The /w/
  // shell handles this; the design shell must too (target_url is /studio/[id]
  // post-JB14, or /w/projects/[id] which the funnel redirects into /studio).
  // Hook stays above the early-return gates.
  useLandscapeCommand(
    'navigate',
    useCallback((p: { target_url?: string }) => {
      if (p && typeof p.target_url === 'string' && p.target_url) {
        // Landscaper's navigate tool emits /studio/[id] (post-JB14) or
        // /w/projects/[id] (which funnels into /studio). Rewrite project
        // destinations onto /design so chat navigation stays in this shell.
        const url = p.target_url
          .replace(/^\/studio\//, '/design/')
          .replace(/^\/w\/projects\/(\d+)/, '/design/$1');
        router.push(url);
      }
    }, [router]),
  );

  // ── Loading / not-found (same gates as classic) ─────────────────────
  if (isLoading || fallbackLoading) {
    return (
      <div className="design-shell">
        <div className="folder-content-placeholder" style={{ margin: 'auto' }}>
          <p>Loading project…</p>
        </div>
      </div>
    );
  }
  if (!currentProject && fallbackFailed) {
    return (
      <div className="design-shell">
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
      <div className="design-shell">
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

  const backToScreen = clearActiveArtifacts;

  // The routed screen, defined once and rendered in EITHER the right panel
  // (normal) OR the full-window pop-out overlay (expanded) — never both, so the
  // screen mounts a single time. Toggling `expanded` remounts it in the other
  // host (an intentional, cheap refetch; Phase 3 summary cards rely on the
  // collapse-time refresh to round-trip edited inputs).
  // Stage B: a composed design screen when one exists for this folder;
  // otherwise the same routed legacy screen studio renders.
  const Composition = DESIGN_COMPOSITIONS[currentFolder];
  const screenRouter = Composition ? (
    <Composition project={routerProject} />
  ) : (
    <ProjectContentRouter
      project={routerProject}
      currentFolder={currentFolder}
      currentTab={currentTab}
      setFolderTab={setFolderTab}
    />
  );

  return (
    <div className="design-shell">
      {/* LEFT — the REAL unified-UI sidebar (global nav, search, threads,
          recents, footer) with the project folder/sub-tab tree added via the
          `projectNav` prop. Owns its own collapse + resize. */}
      <DesignSidebar
        projectId={projectId}
        projectName={currentProject.project_name}
        folders={folderConfig.folders}
        currentFolder={currentFolder}
        currentTab={currentTab}
        onSelectFolder={(folderId) => setFolderTab(folderId)}
        onSelectTab={(folderId, tabId) => setFolderTab(folderId, tabId)}
        onNewChat={handleNewChat}
      />

      {/* CENTER — Landscaper chat (renders null when chatOpen is false) */}
      <CenterChatPanel
        projectId={projectId}
        projectName={currentProject.project_name}
        projectTypeCode={effectivePropertyType ?? undefined}
        initialThreadId={initialThreadId}
        sessionKey={chatSessionKey}
        onBeforeUserSend={handleBeforeUserSend}
        onNewChat={handleNewChat}
        availableScreens={availableScreens}
      />

      {/* RIGHT — one panel: the routed screen, OR the artifacts workspace
          (reached from the header button or auto-opened by a chat artifact).
          Suppressed while the screen is popped out (`expanded`) so the screen
          mounts only once — in the overlay below. */}
      {!expanded && (contentOpen ? (
        rightView === 'artifacts' || hasArtifact ? (
          <div className="wrapper-right-panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderBottom: '1px solid var(--w-border, #1f2329)',
              }}
            >
              <button
                type="button"
                className="w-btn w-btn-ghost w-btn-sm"
                onClick={backToScreen}
                title="Back to the current screen"
              >
                ← Screen
              </button>
              <span style={{ fontWeight: 600, fontSize: 13 }}>Artifacts</span>
            </div>
            {activeArtifactId != null ? (
              <ArtifactWorkspacePanel projectId={projectId} takeoverMode />
            ) : activeLocationBrief ? (
              <LocationBriefArtifact config={activeLocationBrief} onClose={backToScreen} />
            ) : activeMapArtifact ? (
              <MapArtifactRenderer config={activeMapArtifact} onClose={backToScreen} />
            ) : activeExcelAudit ? (
              <ExcelAuditArtifact config={activeExcelAudit} onClose={backToScreen} />
            ) : (
              <ArtifactWorkspacePanel projectId={projectId} />
            )}
          </div>
        ) : (
          <RightContentPanel
            title={contentTitle}
            subtitle={currentProject.project_name}
            actions={
              <>
                <button
                  type="button"
                  className="w-btn w-btn-icon"
                  title="Artifacts"
                  aria-label="Show artifacts"
                  onClick={() => setRightView('artifacts')}
                >
                  ◳
                </button>
                <button
                  type="button"
                  className="w-btn w-btn-icon"
                  title="Expand to full width"
                  aria-label="Expand screen to full width"
                  onClick={() => setExpanded(true)}
                >
                  ⤢
                </button>
                <button
                  type="button"
                  className="w-btn w-btn-icon"
                  title={chatOpen ? 'Collapse content (chat full width)' : 'Collapse content'}
                  aria-label="Collapse content panel"
                  onClick={() => setContentOpen(false)}
                >
                  ⇥
                </button>
              </>
            }
          >
            {screenRouter}
          </RightContentPanel>
        )
      ) : (
        <div className="design-content-collapsed">
          <button
            type="button"
            className="design-content-expand"
            title="Show content panel"
            aria-label="Show content panel"
            onClick={() => setContentOpen(true)}
          >
            ⇤
          </button>
        </div>
      ))}

      {/* Pop-out overlay (right-panel reflow, Phase 1): the SAME routed screen
          at full window width. Same header (title + subtitle), with a collapse
          control; Esc also closes. The underlying right panel is suppressed
          while this is open, so the screen mounts once. */}
      {expanded && (
        <div className="design-screen-overlay">
          <RightContentPanel
            title={contentTitle}
            subtitle={currentProject.project_name}
            actions={
              <button
                type="button"
                className="w-btn w-btn-icon"
                title="Exit full width"
                aria-label="Exit full width"
                onClick={() => setExpanded(false)}
              >
                ⤡
              </button>
            }
          >
            {screenRouter}
          </RightContentPanel>
        </div>
      )}

      {/* Ephemeral screen-router confirmation (JB43) — a transient toast, NOT a
          chat message. Fades after ~2.2s; never persisted, never a thread. */}
      {navToast && (
        <div
          key={navToast.n}
          role="status"
          aria-live="polite"
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 80,
            maxWidth: 'min(90%, 420px)',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--cui-body-color, #e6e6e6)',
            background: 'var(--cui-tertiary-bg, #2a2f3a)',
            border: '1px solid var(--cui-border-color, #3a3f4b)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
            pointerEvents: 'none',
          }}
        >
          {navToast.text}
        </div>
      )}
    </div>
  );
}

export function DesignShell() {
  return <DesignShellInner />;
}

export default DesignShell;
