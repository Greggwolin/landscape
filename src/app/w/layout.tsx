'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WrapperSidebar } from '@/components/wrapper/WrapperSidebar';
import { CenterChatPanel } from '@/components/wrapper/CenterChatPanel';
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
import '@/styles/wrapper.css';

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 450;
const COLLAPSE_THRESHOLD = 120;
const COLLAPSED_WIDTH = 48;

const DEFAULT_RIGHT_PANEL_WIDTH = 420;
const MIN_RIGHT_PANEL_WIDTH = 320;
const MAX_RIGHT_PANEL_WIDTH = 900;

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
    artifactsOpen,
    toggleArtifacts,
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

  // Bump on "New chat" to force-remount LandscaperChatThreaded so stale
  // thread state (hook refs, message list) is fully discarded.
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const handleNewChat = useCallback(() => {
    setChatSessionKey((k) => k + 1);
    router.push('/w/chat');
  }, [router]);

  // On /w/chat routes, chat IS the content — hide the right <main> panel
  const isChatRoute = /^\/w\/chat(\/|$)/.test(pathname);

  // Derive active nav page from URL
  const activePage = (() => {
    if (pathname.includes('/platform-knowledge')) return 'platform-knowledge';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/landscaper-ai')) return 'landscaper';
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/tools')) return 'tools';
    if (pathname.includes('/help')) return 'help';
    if (pathname.includes('/chat')) return 'chat';
    if (pathname.includes('/projects')) return 'projects';
    return 'projects';
  })();

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

  // Fetch project data when inside a project
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const lastFetchedId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!projectId) return;
    if (lastFetchedId.current === projectId) return;
    lastFetchedId.current = projectId;

    fetch(`/api/projects/${projectId}`)
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
      } else if (projectScoped.includes(page)) {
        if (pid) router.push(`/w/projects/${pid}/${page}`);
        else router.push('/w/projects');
      } else {
        const routeMap: Record<string, string> = {
          landscaper: 'landscaper-ai',
          admin: 'admin',
          tools: 'tools',
          'platform-knowledge': 'platform-knowledge',
        };
        router.push(`/w/${routeMap[page] || page}`);
      }
    },
    [router, projectId, lastProjectId, toggleHelp]
  );

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((v) => {
      if (v) setSidebarWidth(DEFAULT_SIDEBAR_WIDTH);
      return !v;
    });
  }, []);

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

        if (newWidth < COLLAPSE_THRESHOLD) {
          setCollapsed(true);
          setSidebarWidth(COLLAPSED_WIDTH);
        } else {
          setCollapsed(false);
          setSidebarWidth(Math.min(Math.max(newWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH));
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
    [sidebarWidth]
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
        if (t.projectId) {
          router.push(`/w/projects/${t.projectId}?thread=${t.threadId}`);
        } else {
          router.push(`/w/chat/${t.threadId}`);
        }
      },
    };
  };
  const sidebarThreadItems = sidebarThreads.map((t) => buildThreadItem(t, false));
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

  const mockScheduled = [
    { id: 's1', emoji: '📊', name: 'FRED market data pull', status: 'active' as const },
    { id: 's2', emoji: '🏗️', name: 'Bellflower permit monitor', status: 'active' as const },
    { id: 's3', emoji: '🏠', name: 'Redfin comp tracker', status: 'paused' as const },
  ];

  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.results || data?.projects || [];
        const sorted = rows
          .slice()
          .sort((a: any, b: any) => (b.updated_at || '').localeCompare(a.updated_at || ''))
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
        threads={sidebarThreadItems}
        archivedThreads={archivedSidebarThreadItems}
        onArchiveThread={handleArchiveThread}
        onRestoreThread={handleRestoreThread}
        onDeleteThreadPermanently={handleDeleteThreadPermanently}
        scheduledAgents={mockScheduled}
        recentProjects={recentProjects.map((p) => ({
          ...p,
          onClick: () => router.push(`/w/projects/${p.id}`),
        }))}
        isHelpThinking={isHelpLoading}
        onSearchClick={openSearch}
        currentTheme={theme === 'light' ? 'light' : 'dark'}
        onThemeToggle={toggleTheme}
        onLogout={logout}
        userName={user ? `${user.first_name} ${user.last_name}`.trim() || user.username : undefined}
        userInitials={user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase() : undefined}
      />
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
        projectName={isChatRoute || pathname === '/w/projects' ? undefined : projectData?.project_name}
        projectLocation={isChatRoute || pathname === '/w/projects' ? undefined : [projectData?.jurisdiction_city, projectData?.jurisdiction_state].filter(Boolean).join(', ') || undefined}
        projectTypeCode={isChatRoute || pathname === '/w/projects' ? undefined : projectData?.project_type_code}
      />
      {!isChatRoute && (
        <main className={`wrapper-main${rightPanelNarrow ? ' wrapper-main-narrow' : ''}`}>{children}</main>
      )}
      {/* Artifacts on chat routes: full panel when open, ☰ strip when collapsed.
          Close from inside an artifact toggles the panel rather than nuking
          state, so the same artifact can be reopened via the strip. */}
      {isChatRoute && (activeLocationBrief || activeMapArtifact || activeExcelAudit) && (
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
              {/* Priority: location brief > map > excel audit */}
              {activeLocationBrief ? (
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
