'use client';

/**
 * The chat-first project shell — /w/... — THE working surface.
 *
 *   LEFT  : <WrapperSidebar>        — global nav, search, threads, recents
 *   CENTER: <CenterChatPanel>       — Landscaper chat (the primary navigation)
 *   RIGHT  : <ArtifactWorkspacePanel> / routed project content
 *
 * ── SHELL STATUS (verified 2026-08-18, LSCMD-BC-SHELLSTATUS-0818-BC2) ──────
 * ACTIVE. Settled as the working project surface 2026-07-19 (PR #181) and the
 * default landing after login. Sixteen changes since that date, against one for
 * /studio and none for /design. New product surfaces belong here.
 * Renders its own component tree — WrapperSidebar, CenterChatPanel,
 * ArtifactWorkspacePanel — independent of the classic tree. Unlike /studio and
 * /design, this shell does NOT import ProjectContentRouter (verified by grep,
 * corrects an assumption this note originally carried); that router is
 * load-bearing for the other three shells, not this one.
 * Four shells is deliberate, not drift — see the shell table in CLAUDE.md.
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WrapperSidebar } from '@/components/wrapper/WrapperSidebar';
import { CenterChatPanel } from '@/components/wrapper/CenterChatPanel';
import { UserDashboard } from '@/components/wrapper/UserDashboard';
import { ArtifactWorkspacePanel } from '@/components/wrapper/ArtifactWorkspacePanel';
import { LocationBriefArtifact } from '@/components/wrapper/LocationBriefArtifact';
import { MapArtifactRenderer } from '@/components/wrapper/MapArtifactRenderer';
import { ExcelAuditArtifact } from '@/components/wrapper/ExcelAuditArtifact';
import { WrapperUIProvider, useWrapperUI } from '@/contexts/WrapperUIContext';
import { LandscaperCollisionProvider } from '@/contexts/LandscaperCollisionContext';
import { HelpLandscaperProvider, useHelpLandscaper } from '@/contexts/HelpLandscaperContext';
import { FileDropProvider } from '@/contexts/FileDropContext';
import HelpLandscaperPanel from '@/components/help/HelpLandscaperPanel';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useLandscapeCommand, emitLandscapeCommand } from '@/lib/landscape-command-bus';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { useFolderNavigation } from '@/hooks/useFolderNavigation';
import { redirectToLoginExpired } from '@/lib/authHeaders';
import {
  NEW_THREAD,
  buildProjectUrl,
  isThreadUuid,
  parsePanelState,
  rememberPanel,
  rememberProjectThread,
  rememberedPanel,
  rememberedProjectThread,
  type PanelView,
} from '@/lib/wrapper/navMemory';
import '@/styles/wrapper.css';

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 450;
const COLLAPSE_THRESHOLD = 120;
const COLLAPSED_WIDTH = 48;

const DEFAULT_RIGHT_PANEL_WIDTH = 420;
const MIN_RIGHT_PANEL_WIDTH = 320;
// Bumped from 900 → 1600 to accommodate Claude.ai-style artifact takeover
// (RP-CFRPT-2605 Phase 3 follow-up). The takeover effect targets ~55% of
// viewport, which can exceed 900 on wide displays; the user's manual drag
// must be allowed to keep up with the takeover width without snap-back.
const MAX_RIGHT_PANEL_WIDTH = 1600;

interface ProjectData {
  project_name: string;
  project_type_code?: string;
  property_subtype?: string;
  analysis_type?: string;
  jurisdiction_city?: string;
  jurisdiction_state?: string;
}

function WrapperLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toggleHelp, isLoading: isHelpLoading } = useHelpLandscaper();
  const { theme, toggleTheme } = useTheme();
  const {
    rightPanelNarrow,
    openSearch,
    activeLocationBrief,
    activeMapArtifact,
    activeExcelAudit,
    activeArtifactId,
    projectRightPanelView,
    setProjectRightPanelView,
    setActiveLocationBrief,
    setActiveMapArtifact,
    setActiveExcelAudit,
    setActiveArtifactId,
    artifactsOpen,
    toggleArtifacts,
    closeChat,
    setSidebarWidthPx,
  } = useWrapperUI();
  const { logout, user } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Right-side artifacts panel (appears on /w/chat when a brief/map is active)
  const [rightPanelWidth, setRightPanelWidth] = useState(DEFAULT_RIGHT_PANEL_WIDTH);
  const isRightResizing = useRef(false);
  const rightStartX = useRef(0);
  const rightStartWidth = useRef(0);

  // Pre-takeover width snapshot. When an artifact opens (activeArtifactId
  // becomes truthy), the right panel expands to a "takeover" width — the
  // Claude.ai-style behavior Gregg asked for: chat and artifact each take
  // half of the remaining viewport (after the left sidebar). When the
  // artifact closes (X click → activeArtifactId nulled), the panel
  // restores to whatever width the user had it at before.
  const preTakeoverWidth = useRef<number | null>(null);
  // Snap-back is a tri-state. We can't just key on `activeArtifactId !==
  // null` because the user can manually drag the panel during takeover —
  // we need to know whether the CURRENT width came from a takeover (so
  // we restore on close) or a user drag (so we leave it alone).
  const inTakeoverMode = useRef(false);

  // Compute the 50/50 takeover width. (viewport − sidebar width) / 2,
  // clamped to MIN/MAX_RIGHT_PANEL_WIDTH. Exposed as a function so it can
  // be re-run when the user manually expands the sidebar during takeover
  // (handleResizeStart calls this to compress the artifact panel).
  const computeTakeoverWidth = useCallback((sidebarPx: number) => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1600;
    const available = Math.max(vw - sidebarPx, MIN_RIGHT_PANEL_WIDTH * 2);
    const half = Math.round(available / 2);
    return Math.min(Math.max(half, MIN_RIGHT_PANEL_WIDTH), MAX_RIGHT_PANEL_WIDTH);
  }, []);

  // Publish the sidebar's on-screen width so the right panel can size itself
  // against the real row rather than assuming the sidebar is collapsed.
  useEffect(() => {
    setSidebarWidthPx(collapsed ? COLLAPSED_WIDTH : sidebarWidth);
  }, [collapsed, sidebarWidth, setSidebarWidthPx]);

  useEffect(() => {
    // RULE 11 (D-2026-09-22-NAV-R11, Gregg "12b"): THE SIDEBAR ONLY MOVES WHEN
    // THE USER MOVES IT. Opening or closing an artifact, opening a chat,
    // switching projects or opening the map never collapses or expands it.
    // When the panel needs room the chat gives way (D-2026-09-18-YIELD).
    //
    // This effect used to collapse the sidebar on artifact open and restore it
    // on close — the 2026-05-19 "whole-panel takeover" (commit 5a152b0f, #14).
    // Rule 11 supersedes its sidebar half. What remains is the width half for
    // the chat routes' own artifact aside: widen on open, restore on close.
    const isProjectRootRoute = /^\/w\/projects\/\d+\/?$/.test(pathname);
    const inMapView = projectRightPanelView === 'map' && isProjectRootRoute;
    const hasActiveArtifact = activeArtifactId != null || inMapView;

    if (hasActiveArtifact && !inTakeoverMode.current) {
      preTakeoverWidth.current = rightPanelWidth;
      inTakeoverMode.current = true;
      // Opening an artifact implies the user wants to see it.
      if (!artifactsOpen) toggleArtifacts();
      setRightPanelWidth(computeTakeoverWidth(collapsed ? COLLAPSED_WIDTH : sidebarWidth));
    } else if (!hasActiveArtifact && inTakeoverMode.current) {
      setRightPanelWidth(preTakeoverWidth.current ?? DEFAULT_RIGHT_PANEL_WIDTH);
      preTakeoverWidth.current = null;
      inTakeoverMode.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeArtifactId, projectRightPanelView, pathname]);

  // Bump on "New chat" to force-remount LandscaperChatThreaded so stale
  // thread state (hook refs, message list) is fully discarded.
  const [chatSessionKey, setChatSessionKey] = useState(0);

  // On /w/chat routes, chat IS the content — hide the right <main> panel
  const isChatRoute = /^\/w\/chat(\/|$)/.test(pathname);
  // On /w/dashboard, the center column renders UserDashboard instead of
  // CenterChatPanel. Same column-collapse rules as chat routes apply:
  // wrapper-main is hidden and the artifacts rail stays collapsed on mount.
  // Phase 1 of LF-USERDASH-0514.
  const isDashboardRoute = /^\/w\/dashboard(\/|$)/.test(pathname);

  // Derive active nav page from URL
  const activePage = (() => {
    if (pathname.includes('/dashboard')) return 'dashboard';
    if (pathname.includes('/platform-knowledge')) return 'platform-knowledge';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/landscaper-ai')) return 'landscaper';
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/tools')) return 'tools';
    if (pathname.includes('/help')) return 'help';
    if (pathname.includes('/chat')) return 'chat';
    if (pathname.includes('/projects')) return 'projects';
    return 'dashboard';
  })();

  // (Removed 2026-09-22, Rule 11: entering the map used to collapse the sidebar
  // and close the chat. The map is now a view of the panel — Rule 9 — and the
  // sidebar only moves when the user moves it.)

  // Extract current projectId from URL
  const projectIdMatch = pathname.match(/\/projects\/(\d+)/);
  const projectId = projectIdMatch ? parseInt(projectIdMatch[1]) : undefined;

  // Extract threadId from one of two URL forms:
  //   - /w/chat/[threadId]                       (unassigned chat)
  //   - /w/projects/[projectId]?thread=[threadId] (project-scoped resume)
  // The query-param form is what the sidebar uses when clicking a project
  // thread, so the chat panel resumes that exact thread inside the project
  // context instead of being routed to the unassigned /w/chat layout.
  const chatThreadIdMatch = pathname.match(/\/chat\/([0-9a-fA-F-]{36})$/);
  const queryThreadId = searchParams?.get('thread') ?? null;
  const initialThreadId = chatThreadIdMatch
    ? chatThreadIdMatch[1]
    : queryThreadId && /^[0-9a-fA-F-]{36}$/.test(queryThreadId)
      ? queryThreadId
      : undefined;

  // Persist last projectId so project-scoped nav items resume from any page
  const [lastProjectId, setLastProjectId] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (projectId) setLastProjectId(projectId);
  }, [projectId]);

  // ─── Navigation rules (chat MP, 2026-09-22) ──────────────────────────────
  // The address is the source of truth for the project surface: which chat,
  // and what the right panel shows. See src/lib/wrapper/navMemory.ts.
  const isProjectRootRoute = /^\/w\/projects\/\d+\/?$/.test(pathname);
  const searchKey = searchParams?.toString() ?? '';
  const urlThread = searchParams?.get('thread') ?? null;
  const urlPanel = useMemo(() => parsePanelState(searchParams), [searchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Address of a project screen, keeping the chat and everything else in the
  // current address. Documents and Map are panel tabs, not screens (Rule 9):
  // one full version of each, reached the same way from the sidebar tree, the
  // panel's own tabs and Landscaper.
  const screenHref = (folder: string, tab?: string): string => {
    const params = new URLSearchParams(searchKey);
    if (folder === 'documents' || folder === 'map') {
      params.set('view', folder);
      if (folder === 'documents' && tab) params.set('doctab', tab);
    } else {
      params.set('view', 'screen');
      params.set('folder', folder);
      if (tab) params.set('tab', tab);
      else params.delete('tab');
    }
    return `/w/projects/${projectId}?${params.toString()}`;
  };

  // RULE 3 (Gregg "3b"): inside a project, New chat is a blank chat IN THIS
  // PROJECT and whatever the panel shows stays; it becomes the new chat's
  // memory. On Home and the other non-project pages it is a chat with no
  // project, as before.
  const handleNewChat = useCallback(() => {
    setChatSessionKey((k) => k + 1);
    if (projectId && pathname.startsWith(`/w/projects/${projectId}`)) {
      router.push(buildProjectUrl(projectId, { thread: NEW_THREAD, panel: urlPanel }));
    } else {
      router.push('/w/chat');
    }
  }, [router, projectId, pathname, urlPanel]);

  // RULE 1 (Gregg "1c"): returning to a project opens its last active chat,
  // with the panel exactly as that chat left it (Rule 2). An address that
  // names no chat is the "entering a project" case — the sidebar's recent
  // projects, Show All, a Landscaper "open X", a bare link. Replace, not push,
  // so the bare address never becomes a Back step of its own. A project never
  // visited in this browser opens its starting view.
  useEffect(() => {
    if (!isProjectRootRoute || !projectId) return;
    if (urlThread) return;
    const last = rememberedProjectThread(projectId);
    if (!last) return;
    // An address that already asks for something specific in the panel (a
    // Landscaper tool opening the map, a link to a screen or an artifact)
    // keeps it; only the chat is filled in. A plain view=artifacts is the
    // default a start view writes for itself, not a request, so it does not
    // override the chat's memory.
    const explicit =
      (urlPanel.view && urlPanel.view !== 'artifacts') || urlPanel.artifact != null;
    router.replace(
      buildProjectUrl(projectId, {
        thread: last,
        panel: explicit ? urlPanel : rememberedPanel(last) ?? undefined,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProjectRootRoute, projectId, urlThread, router]);

  // Remember, per chat, what the panel shows (Rule 2) and, per project, which
  // chat was last active (Rule 1). Written whenever the address changes.
  useEffect(() => {
    if (!isProjectRootRoute || !projectId || !isThreadUuid(urlThread)) return;
    rememberProjectThread(projectId, urlThread);
    if (urlPanel.view) rememberPanel(urlThread, urlPanel);
  }, [isProjectRootRoute, projectId, urlThread, urlPanel]);

  // LF-USERDASH-0514 Phase 3: subscribe to the 'navigate' command emitted
  // by the chat panel when Landscaper calls navigate_to_project or
  // navigate_to_dashboard. The /w/ layout is the highest-up React subtree
  // that has the router in scope, so the subscriber lives here rather
  // than in LandscapeCommandSubscriber (which is mounted only inside
  // project layouts and would miss navigation requests from /w/chat or
  // /w/dashboard).
  const handleNavigateCommand = useCallback(
    (payload: { target_url: string }) => {
      if (!payload?.target_url || typeof payload.target_url !== 'string') return;
      router.push(payload.target_url);
    },
    [router],
  );
  useLandscapeCommand('navigate', handleNavigateCommand);

  // navigate_to_screen — Landscaper opening a project screen.
  //
  // WHAT THIS USED TO DO, AND WHY IT WAS WRONG. The chat surface had no screen
  // tree, so this handler translated the four screens that happened to have a
  // registered form into a modal and logged a warning for everything else.
  // Landscaper would say "opening the parcels screen now", the tool would fire
  // correctly, and nothing would happen — the failure was written to a console
  // nobody reads. Four screens worked out of twenty-six.
  //
  // Now the panel hosts the real screen tree (PanelScreenView), so every screen
  // opens: put folder and tab in the URL, which is where the tree reads them
  // from, and switch the panel to the screen view. Settled 2026-09-18,
  // D-2026-09-18-TARGET.
  //
  // 2026-09-22: the address now also carries the chat and the panel view, so
  // opening a screen keeps the chat it was opened from (it used to drop
  // ?thread) and records view=screen. Documents and Map are panel TABS, not
  // screens (Rule 9) — a request for either opens that tab.
  const handleNavigateScreen = useCallback(
    (payload: { folder?: string; tab?: string }) => {
      const folder = payload?.folder;
      if (!folder || !projectId) return;
      router.push(screenHref(folder, payload?.tab));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, projectId, searchKey, pathname],
  );
  useLandscapeCommand('navigate_screen', handleNavigateScreen);

  // LF-USERDASH-0514: clear active-artifact state when the project context
  // changes. activeLocationBrief / activeMapArtifact / activeExcelAudit /
  // activeArtifactId live in WrapperUIContext as GLOBAL state, so without
  // this an artifact opened in one project (or the home dashboard) stays
  // visible in another project's artifacts panel until manually closed.
  // We track previous projectId in a ref and clear all four whenever the
  // value changes (project → other project, project → null, null → project).
  const prevProjectIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const prev = prevProjectIdRef.current;
    if (prev !== projectId) {
      prevProjectIdRef.current = projectId;
      // Skip the very first run on mount — there's no leak to clear and
      // clearing here would wipe state freshly set by a different effect
      // racing for the same tick.
      if (prev !== undefined || projectId !== undefined) {
        setActiveLocationBrief(null);
        setActiveMapArtifact(null);
        setActiveExcelAudit(null);
        setActiveArtifactId(null);
      }
    }
  }, [projectId, setActiveLocationBrief, setActiveMapArtifact, setActiveExcelAudit, setActiveArtifactId]);

  // ── Address → panel ────────────────────────────────────────────────────
  // When the address changes (a click, Back, a pasted link, a refresh), the
  // panel follows it. An address that says nothing about the panel leaves it
  // alone — EXCEPT across a project change, where nothing carries over from
  // the project left behind (Rule 1): the view resets to Artifacts.
  const syncedProjectRef = useRef<number | undefined>(undefined);
  const threadChangedAtRef = useRef<number>(0);
  const lastUrlThreadRef = useRef<string | null>(null);
  useEffect(() => {
    if (urlThread !== lastUrlThreadRef.current) {
      lastUrlThreadRef.current = urlThread;
      threadChangedAtRef.current = Date.now();
    }
    if (!isProjectRootRoute) return;
    const projectChanged = syncedProjectRef.current !== projectId;
    syncedProjectRef.current = projectId;
    if (urlPanel.view) {
      if (urlPanel.view !== projectRightPanelView) setProjectRightPanelView(urlPanel.view);
      const art = urlPanel.artifact ?? null;
      if (art !== activeArtifactId) setActiveArtifactId(art);
    } else if (projectChanged) {
      setProjectRightPanelView('artifacts');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchKey, pathname]);

  // ── Panel → address ────────────────────────────────────────────────────
  // When the panel changes for any other reason (a view button, opening or
  // closing an artifact, Landscaper producing one), write it into the address
  // as a NEW history entry — that is what makes Back step back through panel
  // states (Rule 8, "8e"). Two exceptions use replace instead of push, so they
  // do not leave empty Back steps behind: an address that had no panel state
  // yet (it is being filled in, not changed), and a restore that lands in the
  // first moments after the chat itself changed (part of the same step).
  const prevPanelCtxRef = useRef<{ view: PanelView; artifact: number | null } | null>(null);
  useEffect(() => {
    if (!isProjectRootRoute || !projectId) {
      prevPanelCtxRef.current = null;
      return;
    }
    const ctx = { view: projectRightPanelView as PanelView, artifact: activeArtifactId };
    const prev = prevPanelCtxRef.current;
    prevPanelCtxRef.current = ctx;
    // Entering a project that has a last chat: Rule 1's redirect (above) is
    // about to fill in the chat AND its panel. Writing this panel into the
    // address now would race it and win.
    if (!urlThread && rememberedProjectThread(projectId)) return;
    const urlMatches =
      urlPanel.view === ctx.view && (urlPanel.artifact ?? null) === ctx.artifact;
    if (urlMatches) return;
    const changedHere = !prev || prev.view !== ctx.view || prev.artifact !== ctx.artifact;
    // The address moved and the panel has not caught up yet — the sync above
    // is about to align it. Do not write the stale panel back.
    if (!changedHere && urlPanel.view) return;
    const params = new URLSearchParams(searchKey);
    params.set('view', ctx.view);
    if (ctx.artifact != null) params.set('artifact', String(ctx.artifact));
    else params.delete('artifact');
    const href = `${pathname}?${params.toString()}`;
    const partOfSameStep = Date.now() - threadChangedAtRef.current < 2500;
    if (urlPanel.view && !partOfSameStep) router.push(href);
    else router.replace(href);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRightPanelView, activeArtifactId, isProjectRootRoute, projectId, searchKey]);

  // Fetch project data when inside a project
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const lastFetchedId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!projectId) return;
    if (lastFetchedId.current === projectId) return;
    lastFetchedId.current = projectId;
    // Drop the previous project's name at once: until the fetch returns, the
    // header must not go on showing the project just left (Rule 1).
    setProjectData(null);

    fetch(`/api/projects/${projectId}`, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setProjectData({
            project_name: data.project_name ?? '',
            project_type_code: data.project_type_code ?? undefined,
            property_subtype: data.property_subtype ?? undefined,
            analysis_type: data.analysis_type ?? undefined,
            jurisdiction_city: data.jurisdiction_city ?? undefined,
            jurisdiction_state: data.jurisdiction_state ?? undefined,
          });
        }
      })
      .catch(() => {});
  }, [projectId]);

  const handleNavigate = useCallback(
    (page: string) => {
      // Help is a flyout overlay — never navigate, just toggle the panel
      if (page === 'help') {
        toggleHelp();
        return;
      }

      // Project-scoped pages render inside /w/projects/[id]/<page>.
      // 'documents' was removed from this list — per-project documents now
      // live as a toggle inside the right panel of the project workspace,
      // not as a dedicated page. The 'platform-knowledge' link is the
      // cross-project knowledge library and routes to its own top-level
      // destination.
      const projectScoped = ['reports', 'map'];
      // Use current projectId if present; otherwise fall back to last-visited
      const pid = projectId ?? lastProjectId;

      if (page === 'projects') {
        router.push('/w/projects');
      } else if (page === 'map') {
        // THE NAV MAP IS NOT A PROJECT'S MAP (Gregg, 2026-08-17).
        //
        // It used to fall through to the project-scoped branch below, which
        // resolves `projectId ?? lastProjectId` — so once you had opened a
        // project, this icon dragged you back to that project's map from
        // anywhere, including the dashboard where it is the only place the
        // icon appears. Opening the nav map on the dashboard landed you in
        // Red Valley.
        //
        // It is meant to be a clean map: any location, parcel selection for
        // projects that do not exist yet. That surface does not exist yet —
        // MapTab is project-bound throughout (every fetch and every write is
        // scoped to one) — so until it is built this goes to the project
        // picker, which at least states that a project is being chosen rather
        // than silently assuming one.
        //
        // RULE 9 (2026-09-22, Gregg "9a"): "the map icon in the left nav bar is
        // for user maps OUTSIDE of projects." It never opens a project's map —
        // not even the current one; that map is the panel's Map tab. The
        // surface itself is still unbuilt, so this goes to a page that says so.
        router.push('/w/map');
      } else if (projectScoped.includes(page)) {
        // FB-308: a project-scoped page (Reports, Map) needs a project. With one
        // active, go straight there; with none, send the user to the project
        // picker carrying the intent so it prompts "pick a project for <page>"
        // instead of silently dumping them on the bare project list.
        if (pid) router.push(`/w/projects/${pid}/${page}`);
        else router.push(`/w/projects?goto=${page}`);
      } else if (page === 'admin-feedback') {
        // Feedback queue lives outside the /w/ shell on the admin route layer.
        // Direct push (loses chat context); revisit if we wrap the admin pages in /w/ later.
        router.push('/admin/feedback');
      } else {
        const routeMap: Record<string, string> = {
          landscaper: 'landscaper-ai',
          admin: 'admin',
          tools: 'tools',
          'platform-knowledge': 'platform-knowledge',
        };
        // FB-302: Platform Knowledge is a full-width navigator — start with
        // the center chat panel closed so the knowledge tree gets the room.
        // The user can re-open chat via the header toggle.
        if (page === 'platform-knowledge') closeChat();
        router.push(`/w/${routeMap[page] || page}`);
      }
    },
    [router, projectId, lastProjectId, toggleHelp, closeChat]
  );

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      const nextSidebar = v ? DEFAULT_SIDEBAR_WIDTH : COLLAPSED_WIDTH;
      if (v) setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
      // During takeover, recompute the artifact panel width so chat and
      // artifact stay 50/50 of the remaining viewport.
      if (inTakeoverMode.current) {
        setRightPanelWidth(computeTakeoverWidth(nextSidebar));
      }
      return next;
    });
  }, [computeTakeoverWidth]);

  const handleResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startX.current = e.clientX;
      startWidth.current = sidebarWidth;

      const handleMove = (ev: PointerEvent) => {
        if (!isResizing.current) return;
        const delta = ev.clientX - startX.current;
        const newWidth = startWidth.current + delta;

        let nextSidebar: number;
        if (newWidth < COLLAPSE_THRESHOLD) {
          setCollapsed(true);
          setSidebarWidth(COLLAPSED_WIDTH);
          nextSidebar = COLLAPSED_WIDTH;
        } else {
          setCollapsed(false);
          nextSidebar = Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH);
          setSidebarWidth(nextSidebar);
        }

        // During takeover, expanding the left sidebar compresses the
        // artifact panel so chat keeps roughly its half and the artifact
        // gives up the room. (viewport − sidebar) / 2 keeps the 50/50
        // split honest as the sidebar grows.
        if (inTakeoverMode.current) {
          setRightPanelWidth(computeTakeoverWidth(nextSidebar));
        }
      };

      const handleUp = () => {
        isResizing.current = false;
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [sidebarWidth, computeTakeoverWidth]
  );

  const handleRightResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      isRightResizing.current = true;
      rightStartX.current = e.clientX;
      rightStartWidth.current = rightPanelWidth;

      const handleMove = (ev: PointerEvent) => {
        if (!isRightResizing.current) return;
        // Dragging left increases the width of a right-docked panel
        const delta = rightStartX.current - ev.clientX;
        const newWidth = rightStartWidth.current + delta;
        setRightPanelWidth(
          Math.min(Math.max(newWidth, MIN_RIGHT_PANEL_WIDTH), MAX_RIGHT_PANEL_WIDTH)
        );
      };

      const handleUp = () => {
        isRightResizing.current = false;
        document.removeEventListener('pointermove', handleMove);
        document.removeEventListener('pointerup', handleUp);
      };

      document.addEventListener('pointermove', handleMove);
      document.addEventListener('pointerup', handleUp);
    },
    [rightPanelWidth]
  );

  // ─── Sidebar threads (Claude/ChatGPT-style cross-project list) ───
  // Fetches every thread visible to this user — project-scoped + unassigned —
  // sorted by recency. The sidebar component caps display to 7 with a
  // "See more" toggle. Refetches when the active thread changes (covers
  // create/delete/rename triggered from the center panel).
  interface SidebarThreadRaw {
    threadId: string;
    title: string | null;
    firstUserMessage: string | null;
    projectId: number | null;
    projectName: string | null;
    pageContext: string | null;
    updatedAt: string;
    isActive: boolean;
  }
  const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
  const getAuthHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('auth_tokens');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
      }
    } catch { /* ignore */ }
    return {};
  };

  // Active thread id derived from /w/chat/[threadId] — used to highlight
  // the matching row in the sidebar.
  const activeSidebarThreadId = initialThreadId ?? null;

  const [sidebarThreads, setSidebarThreads] = useState<SidebarThreadRaw[]>([]);
  const [archivedSidebarThreads, setArchivedSidebarThreads] = useState<SidebarThreadRaw[]>([]);
  // Bumping this re-runs the fetch (e.g., after a new thread is created).
  // Wired up below via a window event so child components don't need a
  // direct callback path through the WrapperUIContext yet.
  const [sidebarThreadsRefreshKey, setSidebarThreadsRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // Live (non-archived) threads — what the user is actively working on.
    fetch(`${DJANGO_API_URL}/api/landscaper/threads/?all_user_threads=true`, {
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.threads || !Array.isArray(data.threads)) return;
        setSidebarThreads(data.threads as SidebarThreadRaw[]);
      })
      .catch(() => {});

    // Archived threads — Universal Archive Pattern Phase 1a.
    // Fetched in parallel; renders in a separate collapsible section below
    // the live threads list.
    fetch(`${DJANGO_API_URL}/api/landscaper/threads/?all_user_threads=true&archived=true`, {
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.threads || !Array.isArray(data.threads)) return;
        setArchivedSidebarThreads(data.threads as SidebarThreadRaw[]);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [sidebarThreadsRefreshKey, DJANGO_API_URL]);

  // Refresh trigger — listens for a window event the chat panel can dispatch
  // after thread create/delete. Keeps the sidebar list in sync without
  // threading a callback through every layer.
  useEffect(() => {
    const handler = () => setSidebarThreadsRefreshKey((k) => k + 1);
    window.addEventListener('landscaper:threads-changed', handler);
    return () => window.removeEventListener('landscaper:threads-changed', handler);
  }, []);

  // Also refresh when the URL-pinned thread changes (covers /w/chat → /w/chat/[id]
  // after first message creates a thread, and thread-switch via the URL).
  useEffect(() => {
    setSidebarThreadsRefreshKey((k) => k + 1);
  }, [activeSidebarThreadId]);

  // Build the props the sidebar consumes. Label fallback chain:
  //   1. title (auto-generated after first AI response, or user-edited)
  //   2. firstUserMessage truncated to 40 chars
  //   3. "New conversation"
  // Project name is appended as a hint when the thread is project-scoped.
  const buildThreadItem = (t: SidebarThreadRaw, isArchived: boolean) => {
    let label: string;
    if (t.title && t.title.trim()) {
      label = t.title.trim();
    } else if (t.firstUserMessage && t.firstUserMessage.trim()) {
      const msg = t.firstUserMessage.trim();
      label = msg.length > 40 ? msg.slice(0, 40).trimEnd() + '…' : msg;
    } else {
      label = 'New conversation';
    }
    return {
      id: t.threadId,
      name: label,
      projectName: t.projectName ?? undefined,
      isActive: t.threadId === activeSidebarThreadId,
      isArchived,
      onClick: () => {
        // Project-scoped threads route into their project context so the
        // chat panel keeps the project's tools, artifacts, and side panels.
        // Unassigned threads still route to /w/chat/[threadId].
        // Rule 2: the chat comes back with the panel it last had visible.
        if (t.projectId) {
          router.push(
            buildProjectUrl(t.projectId, {
              thread: t.threadId,
              panel: rememberedPanel(t.threadId) ?? undefined,
            }),
          );
        } else {
          router.push(`/w/chat/${t.threadId}`);
        }
      },
    };
  };
  // RULE 7 (Gregg "7c"): inside a project the Threads list leads with this
  // project's chats, then a divider, then other projects' recent chats — each
  // group keeps its own recency order. On Home (no project), all recent chats.
  const orderedSidebarThreads = projectId
    ? [
        ...sidebarThreads.filter((t) => t.projectId === projectId),
        ...sidebarThreads.filter((t) => t.projectId !== projectId),
      ]
    : sidebarThreads;
  const firstOtherIndex = projectId
    ? orderedSidebarThreads.findIndex((t) => t.projectId !== projectId)
    : -1;
  const sidebarThreadItems = orderedSidebarThreads.map((t, i) => ({
    ...buildThreadItem(t, false),
    dividerBefore: i > 0 && i === firstOtherIndex,
  }));
  const archivedSidebarThreadItems = archivedSidebarThreads.map((t) => buildThreadItem(t, true));

  // ─── Archive lifecycle handlers (Universal Archive Pattern Phase 1a) ──
  // All three call the backend then bump the refresh key to re-fetch both
  // lists. Optimistic UI updates aren't worth the complexity here — the
  // sidebar lists are small and a re-fetch is fast.
  const handleArchiveThread = useCallback(async (threadId: string) => {
    try {
      await fetch(`${DJANGO_API_URL}/api/landscaper/threads/${threadId}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setSidebarThreadsRefreshKey((k) => k + 1);
      // If the user just archived the thread they're viewing, kick them off it.
      if (activeSidebarThreadId === threadId) {
        router.push('/w/chat');
      }
    } catch (err) {
      console.error('[WrapperLayout] Failed to archive thread:', err);
    }
  }, [DJANGO_API_URL, activeSidebarThreadId, router]);

  const handleRestoreThread = useCallback(async (threadId: string) => {
    try {
      await fetch(`${DJANGO_API_URL}/api/landscaper/threads/${threadId}/restore/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      setSidebarThreadsRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('[WrapperLayout] Failed to restore thread:', err);
    }
  }, [DJANGO_API_URL]);

  const handleDeleteThreadPermanently = useCallback(async (threadId: string) => {
    try {
      await fetch(`${DJANGO_API_URL}/api/landscaper/threads/${threadId}/?force=true`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setSidebarThreadsRefreshKey((k) => k + 1);
    } catch (err) {
      console.error('[WrapperLayout] Failed to permanently delete thread:', err);
    }
  }, [DJANGO_API_URL]);


  // ── The project's screen tree, for the sidebar (D-2026-09-18-TARGET) ──
  // The studio has shown the folder tree down the left since June; the chat
  // surface has always had the tree available — WrapperSidebar takes it as
  // `projectNav` — and simply never passed one. This passes it.
  //
  // The project record comes from ProjectProvider (mounted in the root layout,
  // so it is in scope here) rather than WrapperProjectProvider, which is mounted
  // in the project route BELOW this shell and cannot be read from up here.
  const { projects: allProjects, activeProject } = useProjectContext();
  const navProject = projectId
    ? allProjects.find((p) => p.project_id === projectId) ||
      (activeProject?.project_id === projectId ? activeProject : null)
    : null;
  const { folderConfig: navFolderConfig } = useFolderNavigation({
    propertyType:
      navProject?.project_type_code ||
      navProject?.project_type ||
      navProject?.property_subtype ||
      undefined,
    analysisType: navProject?.analysis_type ?? undefined,
    analysisPerspective: navProject?.analysis_perspective,
    analysisPurpose: navProject?.analysis_purpose,
    valueAddEnabled: navProject?.value_add_enabled ?? false,
    tileConfig: navProject?.tile_config,
  });
  const navFolder = searchParams.get('folder') || '';
  const navTab = searchParams.get('tab') || '';
  const openScreen = useCallback(
    (folder: string, tab?: string) => {
      if (!projectId) return;
      router.push(screenHref(folder, tab));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projectId, router, searchKey, pathname],
  );

  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    fetch('/api/projects', { headers: getAuthHeaders() })
      .then((r) => {
        if (r.status === 401) {
          redirectToLoginExpired();
          return [];
        }
        return r.ok ? r.json() : [];
      })
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.results || data?.projects || [];
        const lastOpened = (pid: any) => {
          try { return Number(localStorage.getItem(`project_${pid}_last_accessed`)) || 0; }
          catch { return 0; }
        };
        const sorted = rows
          .slice()
          .sort((a: any, b: any) => {
            const la = lastOpened(a.project_id), lb = lastOpened(b.project_id);
            if (la !== lb) return lb - la;                 // most recently OPENED first
            return (b.updated_at || '').localeCompare(a.updated_at || ''); // fallback: last changed
          })
          .filter((p: any) => p.project_id !== projectId)
          .slice(0, 5);
        setRecentProjects(
          sorted.map((p: any) => ({
            id: String(p.project_id),
            name: p.project_name || `Project ${p.project_id}`,
          }))
        );
      })
      .catch(() => {});
  }, [projectId]);

  return (
    <div className="wrapper-layout">
      <WrapperSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        sidebarWidth={sidebarWidth}
        onResizeStart={handleResizeStart}
        onNewChat={handleNewChat}
        // On /w/dashboard the center column already lists recent conversations
        // (UserDashboard → RecentChatsList). Showing the same list in the sidebar
        // is redundant noise on a launcher-only surface. Suppress both live and
        // archived sidebar thread sections on this route; reappears everywhere
        // else. LF-USERDASH-0514 Phase 1 follow-up.
        threads={isDashboardRoute ? [] : sidebarThreadItems}
        archivedThreads={isDashboardRoute ? [] : archivedSidebarThreadItems}
        onArchiveThread={handleArchiveThread}
        onRestoreThread={handleRestoreThread}
        onDeleteThreadPermanently={handleDeleteThreadPermanently}
        projectNav={
          projectId && navProject
            ? {
                projectName: navProject.project_name,
                folders: navFolderConfig.folders,
                // Highlight what the panel is actually showing: the screen when
                // it is on Screens, Documents or Map when it is on those tabs,
                // nothing when it is on Artifacts.
                activeFolder:
                  urlPanel.view === 'documents' || urlPanel.view === 'map'
                    ? urlPanel.view
                    : urlPanel.view === 'screen' || !urlPanel.view
                      ? navFolder
                      : '',
                activeTab: urlPanel.view === 'screen' || !urlPanel.view ? navTab : '',
                onSelectFolder: (folderId: string) => openScreen(folderId),
                onSelectTab: (folderId: string, tabId: string) => openScreen(folderId, tabId),
              }
            : undefined
        }
        recentProjects={recentProjects.map((p) => ({
          ...p,
          onClick: () => router.push(`/w/projects/${p.id}`),
        }))}
        isHelpThinking={isHelpLoading}
        isAdmin={user?.is_staff === true}
        onSearchClick={openSearch}
        currentTheme={theme === 'light' ? 'light' : 'dark'}
        onThemeToggle={toggleTheme}
        onLogout={logout}
        userName={user ? `${user.first_name} ${user.last_name}`.trim() || user.username : undefined}
        userInitials={user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase() : undefined}
      />
      {isDashboardRoute ? (
        <UserDashboard />
      ) : (
        <CenterChatPanel
          projectId={
            // On /w/chat routes, chat is always unassigned — never leak lastProjectId.
            // On /w/chat/[threadId], initialThreadId carries its own scope.
            // On /w/projects (the project LIST page, no specific project selected),
            // chat is also unassigned — this panel is for general chats not tied to
            // a specific project. Don't bleed lastProjectId here either (chat DA
            // 2026-05-01 — Gregg flagged that /w/projects was inheriting the last
            // visited project's chat context).
            // Everywhere else (specific project pages, sub-routes), prefer current
            // URL projectId, then last-visited as a navigation-continuity fallback.
            isChatRoute || pathname === '/w/projects'
              ? undefined
              : (projectId ?? lastProjectId)
          }
          initialThreadId={initialThreadId}
          sessionKey={chatSessionKey}
          // Rule 3: the chat header's + does what the sidebar's New chat does.
          onNewChat={handleNewChat}
          projectName={isChatRoute || pathname === '/w/projects' ? undefined : projectData?.project_name}
          projectLocation={isChatRoute || pathname === '/w/projects' ? undefined : [projectData?.jurisdiction_city, projectData?.jurisdiction_state].filter(Boolean).join(', ') || undefined}
          projectTypeCode={isChatRoute || pathname === '/w/projects' ? undefined : projectData?.project_type_code}
          // LF-USERDASH-0514 Phase 2: when a chat isn't tied to a real
          // project (unassigned / home chats), the center-panel header
          // reads the user's name instead of falling back to "Landscaper."
          // Mirrors the dashboard greeting — same identity in every chat
          // surface the user owns.
          userName={user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : undefined}
        />
      )}
      {!isChatRoute && (
        // wrapper-main is hidden on /w/chat routes (chat surface takes the
        // full width). It renders on every other surface including the
        // dashboard, where the page mounts the home-project artifacts panel
        // here — mirroring the project landing page's layout. LF-USERDASH-0514.
        <main className={`wrapper-main${rightPanelNarrow ? ' wrapper-main-narrow' : ''}`}>{children}</main>
      )}
      {/* Artifacts on chat routes: full panel when open, ☰ strip when collapsed.
          Close from inside an artifact toggles the panel rather than nuking
          state, so the same artifact can be reopened via the strip.
          LF-USERDASH-0514 Phase 3: also mount the rail when activeArtifactId
          is set (unified Phase 4 artifacts) — inline chat-card "Open" clicks
          set this, and without it the panel never appears on /w/chat. */}
      {isChatRoute && (activeLocationBrief || activeMapArtifact || activeExcelAudit || activeArtifactId != null) && (
        artifactsOpen ? (
          <>
            <div
              className="wrapper-drag-handle"
              onPointerDown={handleRightResizeStart}
              style={{
                cursor: 'col-resize',
                width: 4,
                flexShrink: 0,
                background: 'transparent',
              }}
            />
            <aside
              className="artifacts-panel"
              style={{ width: rightPanelWidth, flexShrink: 0 }}
            >
              {/* Active artifact renders directly in the rail — its own
                  header (title + close button) sits flush at the top of
                  the rail, matching the pre-floating-card behavior. The
                  card-stack treatment applies only to the per-section
                  workspace view (ArtifactWorkspacePanel), not to a
                  full-rail single artifact.
                  activeArtifactId takes precedence over the legacy
                  active* slots so chat-card "Open" clicks consistently
                  route to the unified workspace panel. */}
              {activeArtifactId != null ? (
                <ArtifactWorkspacePanel projectId={null} includeUnassigned takeoverMode />
              ) : activeLocationBrief ? (
                <LocationBriefArtifact
                  config={activeLocationBrief}
                  onClose={toggleArtifacts}
                />
              ) : activeMapArtifact ? (
                <MapArtifactRenderer
                  config={activeMapArtifact}
                  onClose={toggleArtifacts}
                />
              ) : activeExcelAudit ? (
                <ExcelAuditArtifact
                  config={activeExcelAudit}
                  onClose={toggleArtifacts}
                />
              ) : null}
            </aside>
          </>
        ) : (
          <div className="artifacts-collapsed">
            <button
              className="artifacts-expand-btn"
              onClick={toggleArtifacts}
              title="Open artifacts panel"
            >
              ☰
            </button>
          </div>
        )
      )}
      <HelpLandscaperPanel />
    </div>
  );
}

export default function WrapperLayout({ children }: { children: React.ReactNode }) {
  return (
    <WrapperUIProvider>
      <LandscaperCollisionProvider>
        <HelpLandscaperProvider>
          {/*
            FileDropProvider must wrap WrapperLayoutInner because CenterChatPanel
            (mounted inside Inner) calls useFileDrop. ProjectContextShell at the
            project-route layer also wraps with FileDropProvider — that creates
            a nested provider on /w/projects/[id]/* routes. Duplication is
            harmless (inner wins for project-page consumers) but worth cleaning
            up by removing the wrap from ProjectContextShell once we're sure
            nothing in legacy /projects/* depends on it being there.
          */}
          <FileDropProvider>
            <WrapperLayoutInner>{children}</WrapperLayoutInner>
          </FileDropProvider>
        </HelpLandscaperProvider>
      </LandscaperCollisionProvider>
    </WrapperUIProvider>
  );
}
