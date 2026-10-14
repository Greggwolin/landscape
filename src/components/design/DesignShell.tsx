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
 *
 * ── SHELL STATUS UPDATE 2026-10-14 (supersedes the 08-18 note below) ──────
 * ACTIVE as the project shell of DESIGN VIEW. Gregg asked for every page of the
 * Slice 1 reference to be live and connected. Design view is the third value of
 * the ui_mode cookie (Chat / Classic / Design switch in the sidebar): opening
 * /design/<id> turns it on, middleware then sends every project base route here,
 * and the /w/ layout paints platform pages in the design skin. Reference files:
 * OneDrive 1Active/_Landscape/_cowork/design-reference/.
 *
 * ── SHELL STATUS (verified 2026-08-18, LSCMD-BC-SHELLSTATUS-0818-BC2) — SUPERSEDED ──
 * REFERENCE — a visual restyle of StudioShell, kept for comparison. Built
 * 2026-07-17 (PR #170/#171); untouched since. Reachable by direct URL only;
 * nothing in the nav links here. Owns five files and no logic of its own —
 * every substantive component it renders is imported.
 * Kept deliberately at Gregg's direction (2026-08-18) as a visual reference for
 * the July design language. Do not build product here, and do not delete it —
 * three prior passes have proposed retiring it and been overruled.
 * The design-session record behind it (reference design, artifact kit, handoff
 * and invariants) is parked on branch archive/design-shell-0718.
 * Four shells is deliberate — see the shell table in CLAUDE.md.
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
import { DesignRail } from './DesignRail';
import { DesignTopBar } from './DesignTopBar';
import { buildDesignNav, locateDesignNav, type DesignNavItem, type DesignNavSection } from './designNav';
import { DesignMarketEconomy } from './compositions/DesignMarketEconomy';
import { DesignHousingMarket } from './compositions/DesignHousingMarket';
import { DesignParcels } from './compositions/DesignParcels';
import { DesignCosts } from './compositions/DesignCosts';
import { DesignCapitalization } from './compositions/DesignCapitalization';

/**
 * Stage B per-screen compositions (reference frames). A folder id present here
 * renders the design composition instead of the routed legacy screen; every
 * other screen falls through to ProjectContentRouter unchanged. Add one screen
 * at a time — this map IS the per-screen flag.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DESIGN_COMPOSITIONS: Record<string, React.ComponentType<{ project: any }>> = {
  home: DesignProjectHome,
  // Keyed "folder:tab" — the reference's Market section (C3 / C4).
  'property:location': DesignMarketEconomy,
  'property:market': DesignHousingMarket,
  // C2 — parcel attribution on the land plan.
  'property:parcels': DesignParcels,
  // C5 — development budget + acquisition ledger.
  'budget:budget': DesignCosts,
  // C7 — debt and equity on one page.
  'capital:debt': DesignCapitalization,
  'capital:equity': DesignCapitalization,
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
    toggleChat,
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
  // Design view nav (Slice 1): the two-letter rail by default; "»" swaps in
  // the full expanded nav (C2), which hands back to the rail on collapse.
  const [railExpanded, setRailExpanded] = useState(false);
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
    // The reference always carries Capitalization; the design view shows it even
    // when the project's analysis settings hide it elsewhere (2026-10-14).
    tileConfig: currentProject?.tile_config
      ? { ...currentProject.tile_config, tile_capitalization: true }
      : currentProject?.tile_config,
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

  const designSections = useMemo(
    () => buildDesignNav(folderConfig.folders, effectivePropertyType ?? null),
    [folderConfig.folders, effectivePropertyType],
  );
  const designLoc = useMemo(
    () => locateDesignNav(designSections, currentFolder, currentTab),
    [designSections, currentFolder, currentTab],
  );
  // The expanded nav (WrapperSidebar) takes folder-shaped input: one "folder"
  // per design section, its items as sub-tabs.
  const designFolders = useMemo(
    () =>
      designSections.map((sec) => ({
        id: sec.id,
        label: sec.label,
        color: '',
        subTabs: sec.items.length > 1 ? sec.items.map((i) => ({ id: i.id, label: i.label })) : [],
      })),
    [designSections],
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
  const Composition =
    DESIGN_COMPOSITIONS[`${currentFolder}:${currentTab ?? ''}`] ??
    (currentFolder === 'property' && currentTab === 'market' && !isLandType(effectivePropertyType)
      ? undefined
      : DESIGN_COMPOSITIONS[currentFolder]);
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

  const goItem = (item: DesignNavItem) => setFolderTab(item.folder, item.tab);
  const goSection = (sec: DesignNavSection) => {
    if (sec.id === designLoc.section?.id) return;
    goItem(sec.items[0]);
  };
  const location = [routerProject.jurisdiction_city ?? routerProject.city, routerProject.jurisdiction_state ?? routerProject.state]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="design-shell ds-v2">
      <DesignTopBar
        projectName={currentProject.project_name}
        typeCode={effectivePropertyType ?? null}
        location={location || null}
        section={designLoc.section}
        activeItem={designLoc.item}
        onSelectItem={goItem}
        chatOpen={chatOpen}
        onToggleChat={toggleChat}
        onShowArtifacts={() => setRightView('artifacts')}
        onExpandScreen={() => setExpanded(true)}
      />
      <div className="ds-body">
        {railExpanded ? (
          <DesignSidebar
            projectId={projectId}
            projectName={currentProject.project_name}
            folders={designFolders}
            currentFolder={designLoc.section?.id ?? ''}
            currentTab={designLoc.item?.id ?? ''}
            onSelectFolder={(sectionId) => {
              const sec = designSections.find((x) => x.id === sectionId);
              if (sec) goItem(sec.items[0]);
            }}
            onSelectTab={(sectionId, itemId) => {
              const it = designSections.find((x) => x.id === sectionId)?.items.find((x) => x.id === itemId);
              if (it) goItem(it);
            }}
            onNewChat={handleNewChat}
            onCollapse={() => setRailExpanded(false)}
          />
        ) : (
          <DesignRail
            sections={designSections}
            activeSectionId={designLoc.section?.id}
            onSelectSection={goSection}
            onExpand={() => setRailExpanded(true)}
          />
        )}

        {/* Landscaper column (renders null when chat is hidden) */}
        <CenterChatPanel
          projectId={projectId}
          projectName={currentProject.project_name}
          projectTypeCode={effectivePropertyType ?? undefined}
          initialThreadId={initialThreadId}
          sessionKey={chatSessionKey}
          onBeforeUserSend={handleBeforeUserSend}
          onNewChat={handleNewChat}
          availableScreens={availableScreens}
          designHeader={{
            context: [designLoc.section?.label, currentProject.project_name].filter(Boolean).join(' · '),
          }}
        />

        {!expanded && (
          rightView === 'artifacts' || hasArtifact ? (
            <div className="wrapper-right-panel ds-content">
              <div className="ds-content-bar">
                <button type="button" className="ds-ghost" onClick={backToScreen}>← Screen</button>
                <span>Artifacts</span>
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
            <main className="wrapper-right-panel ds-content" aria-label={contentTitle}>
              {screenRouter}
            </main>
          )
        )}
      </div>

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

      {navToast && (
        <div key={navToast.n} role="status" aria-live="polite" className="ds-toast">
          {navToast.text}
        </div>
      )}
    </div>
  );
}

function isLandType(code?: string | null): boolean {
  return (code || '').toUpperCase() === 'LAND';
}

export function DesignShell() {
  return <DesignShellInner />;
}

export default DesignShell;
