'use client';

/**
 * DesignSidebar — the REAL unified-UI sidebar for the /design shell.
 *
 * A logic-verbatim clone of StudioSidebar (src/components/studio/StudioSidebar.tsx):
 * renders `WrapperSidebar` with the same wiring the /w/ layout uses (global nav,
 * search, threads, archived, recents, scheduled, user/footer, collapse + resize)
 * PLUS the project folder/sub-tab tree via the additive `projectNav` prop.
 * The only behavioral difference: recent-project rows route to /design/[id]
 * so project switches stay in the design context. Visual deltas live in
 * design.css, not here.
 *
 * Global nav routes back into the /w/ surfaces (Projects/Home → dashboard +
 * project picker). /w/ and /studio behavior is untouched.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WrapperSidebar } from '@/components/wrapper/WrapperSidebar';
import { useWrapperUI } from '@/contexts/WrapperUIContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { useHelpLandscaper } from '@/contexts/HelpLandscaperContext';
import { redirectToLoginExpired } from '@/lib/authHeaders';
import type { FolderTab } from '@/lib/utils/folderTabConfig';
import { useArtifactList } from '@/hooks/useArtifact';
import { useQueryClient } from '@tanstack/react-query';

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 450;
const COLLAPSE_THRESHOLD = 120;
const COLLAPSED_WIDTH = 48;
const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem('auth_tokens');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.access) return { Authorization: `Bearer ${parsed.access}` };
    }
  } catch {
    /* ignore */
  }
  return {};
}

interface SidebarThreadRaw {
  threadId: string;
  title: string | null;
  firstUserMessage: string | null;
  projectId: number | null;
  projectName: string | null;
  updatedAt: string;
}

interface DesignSidebarProps {
  projectId: number;
  projectName: string;
  folders: FolderTab[];
  currentFolder: string;
  currentTab: string;
  onSelectFolder: (folderId: string) => void;
  onSelectTab: (folderId: string, tabId: string) => void;
  /**
   * Start a fresh BLANK chat in place in the design shell (JB43). Replaces the
   * old `router.push('/w/chat')` that ejected the user out of the shell.
   */
  onNewChat: () => void;
}

export function DesignSidebar({
  projectId,
  projectName,
  folders,
  currentFolder,
  currentTab,
  onSelectFolder,
  onSelectTab,
  onNewChat,
}: DesignSidebarProps) {
  const router = useRouter();
  const {
    openSearch,
    activeArtifactId,
    setActiveArtifactId,
    setActiveLocationBrief,
    setActiveMapArtifact,
    setActiveExcelAudit,
  } = useWrapperUI();
  const { theme, toggleTheme } = useTheme();
  const { toggleHelp, isLoading: isHelpLoading } = useHelpLandscaper();
  const { logout, user } = useAuth();

  // ── Collapse + resize (mirrors /w/ layout) ──────────────────────────
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

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
      const move = (ev: PointerEvent) => {
        if (!isResizing.current) return;
        const w = startWidth.current + (ev.clientX - startX.current);
        if (w < COLLAPSE_THRESHOLD) {
          setCollapsed(true);
          setSidebarWidth(COLLAPSED_WIDTH);
        } else {
          setCollapsed(false);
          setSidebarWidth(Math.min(Math.max(w, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH));
        }
      };
      const up = () => {
        isResizing.current = false;
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
      };
      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
    },
    [sidebarWidth],
  );

  // ── Threads (live + archived) ────────────────────────────────────────
  const [threads, setThreads] = useState<SidebarThreadRaw[]>([]);
  const [archived, setArchived] = useState<SidebarThreadRaw[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`${DJANGO_API_URL}/api/landscaper/threads/?all_user_threads=true`, {
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && Array.isArray(d?.threads)) setThreads(d.threads as SidebarThreadRaw[]);
      })
      .catch(() => {});
    fetch(`${DJANGO_API_URL}/api/landscaper/threads/?all_user_threads=true&archived=true`, {
      headers: getAuthHeaders(),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && Array.isArray(d?.threads)) setArchived(d.threads as SidebarThreadRaw[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const h = () => setRefreshKey((k) => k + 1);
    window.addEventListener('landscaper:threads-changed', h);
    return () => window.removeEventListener('landscaper:threads-changed', h);
  }, []);

  const buildThreadItem = (t: SidebarThreadRaw, isArchived: boolean) => {
    let label: string;
    if (t.title && t.title.trim()) label = t.title.trim();
    else if (t.firstUserMessage && t.firstUserMessage.trim()) {
      const m = t.firstUserMessage.trim();
      label = m.length > 40 ? m.slice(0, 40).trimEnd() + '…' : m;
    } else label = 'New conversation';
    return {
      id: t.threadId,
      name: label,
      projectName: t.projectName ?? undefined,
      isArchived,
      onClick: () => {
        // Project threads stay in the design shell (the /w/ route would funnel
        // into /studio); unassigned threads keep the /w/ chat surface.
        if (t.projectId) router.push(`/design/${t.projectId}?thread=${t.threadId}`);
        else router.push(`/w/chat/${t.threadId}`);
      },
    };
  };

  const onArchiveThread = useCallback(async (id: string) => {
    try {
      await fetch(`${DJANGO_API_URL}/api/landscaper/threads/${id}/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setRefreshKey((k) => k + 1);
    } catch {
      /* ignore */
    }
  }, []);
  const onRestoreThread = useCallback(async (id: string) => {
    try {
      await fetch(`${DJANGO_API_URL}/api/landscaper/threads/${id}/restore/`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      setRefreshKey((k) => k + 1);
    } catch {
      /* ignore */
    }
  }, []);
  const onDeleteThreadPermanently = useCallback(async (id: string) => {
    try {
      await fetch(`${DJANGO_API_URL}/api/landscaper/threads/${id}/?force=true`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setRefreshKey((k) => k + 1);
    } catch {
      /* ignore */
    }
  }, []);

  // ── Recent projects ──────────────────────────────────────────────────
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
        const sorted = rows
          .slice()
          .sort((a: any, b: any) => (b.updated_at || '').localeCompare(a.updated_at || ''))
          .filter((p: any) => p.project_id !== projectId)
          .slice(0, 5);
        setRecentProjects(
          sorted.map((p: any) => ({
            id: String(p.project_id),
            name: p.project_name || `Project ${p.project_id}`,
          })),
        );
      })
      .catch(() => {});
  }, [projectId]);

  const mockScheduled = [
    { id: 's1', emoji: '📊', name: 'FRED market data pull', status: 'active' as const },
    { id: 's2', emoji: '🏗️', name: 'Bellflower permit monitor', status: 'active' as const },
    { id: 's3', emoji: '🏠', name: 'Redfin comp tracker', status: 'paused' as const },
  ];

  const handleNavigate = useCallback(
    (page: string) => {
      if (page === 'help') {
        toggleHelp();
        return;
      }
      const projectScoped = ['reports', 'map'];
      if (page === 'projects') router.push('/w/projects');
      // Reports and Map are folder screens in this shell — open them in place
      // instead of the /w/ project routes (which funnel into /studio).
      else if (projectScoped.includes(page)) router.push(`/design/${projectId}?folder=${page}`);
      else if (page === 'admin-feedback') router.push('/admin/feedback');
      else {
        const map: Record<string, string> = {
          landscaper: 'landscaper-ai',
          admin: 'admin',
          tools: 'tools',
          'platform-knowledge': 'platform-knowledge',
          dashboard: 'dashboard',
        };
        router.push(`/w/${map[page] || page}`);
      }
    },
    [router, projectId, toggleHelp],
  );

  // ── Chat-generated artifacts (design "Artifacts" section) ────────────
  const queryClient = useQueryClient();
  const { data: artifactList } = useArtifactList({ project_id: projectId });
  const artifacts = (artifactList?.results ?? [])
    .filter((a) => !a.is_archived)
    .map((a) => ({ id: a.artifact_id, title: a.pinned_label || a.title }));

  // When chat creates/opens an artifact, refetch the list so it appears here.
  useEffect(() => {
    if (activeArtifactId != null) {
      queryClient.invalidateQueries({ queryKey: ['artifacts', 'list'] });
    }
  }, [activeArtifactId, queryClient]);

  const clearActiveArtifacts = useCallback(() => {
    setActiveArtifactId(null);
    setActiveLocationBrief(null);
    setActiveMapArtifact(null);
    setActiveExcelAudit(null);
  }, [setActiveArtifactId, setActiveLocationBrief, setActiveMapArtifact, setActiveExcelAudit]);

  const handleSelectArtifact = useCallback(
    (id: number) => {
      // Selecting an artifact replaces the right-panel content with it.
      setActiveLocationBrief(null);
      setActiveMapArtifact(null);
      setActiveExcelAudit(null);
      setActiveArtifactId(id);
    },
    [setActiveArtifactId, setActiveLocationBrief, setActiveMapArtifact, setActiveExcelAudit],
  );

  // Auto-collapse the rail when a click actually changes content: a sub-tab
  // (always a leaf) or a folder with no sub-tabs. Expanding a parent folder to
  // reveal its sub-tabs does NOT collapse (guarded by the subTabs length check).
  const handleSelectFolder = useCallback(
    (folderId: string) => {
      clearActiveArtifacts(); // selecting a screen replaces any open artifact
      onSelectFolder(folderId);
      const f = folders.find((x) => x.id === folderId);
      if (f && f.subTabs.length === 0) setCollapsed(true);
    },
    [onSelectFolder, folders, clearActiveArtifacts],
  );
  const handleSelectTab = useCallback(
    (folderId: string, tabId: string) => {
      clearActiveArtifacts();
      onSelectTab(folderId, tabId);
      setCollapsed(true);
    },
    [onSelectTab, clearActiveArtifacts],
  );

  return (
    <WrapperSidebar
      activePage="projects"
      onNavigate={handleNavigate}
      collapsed={collapsed}
      onToggleCollapse={handleToggleCollapse}
      sidebarWidth={sidebarWidth}
      onResizeStart={handleResizeStart}
      threads={threads.map((t) => buildThreadItem(t, false))}
      archivedThreads={archived.map((t) => buildThreadItem(t, true))}
      onArchiveThread={onArchiveThread}
      onRestoreThread={onRestoreThread}
      onDeleteThreadPermanently={onDeleteThreadPermanently}
      scheduledAgents={mockScheduled}
      recentProjects={recentProjects.map((p) => ({
        ...p,
        onClick: () => router.push(`/design/${p.id}`),
      }))}
      isHelpThinking={isHelpLoading}
      isAdmin={user?.is_staff === true}
      onSearchClick={openSearch}
      onNewChat={onNewChat}
      currentTheme={theme === 'light' ? 'light' : 'dark'}
      onThemeToggle={toggleTheme}
      onLogout={logout}
      userName={user ? `${user.first_name} ${user.last_name}`.trim() || user.username : undefined}
      userInitials={
        user
          ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() ||
            user.username[0].toUpperCase()
          : undefined
      }
      projectNav={{
        projectName,
        folders,
        activeFolder: currentFolder,
        activeTab: currentTab,
        onSelectFolder: handleSelectFolder,
        onSelectTab: handleSelectTab,
      }}
      artifactNav={{
        artifacts,
        activeArtifactId,
        onSelectArtifact: handleSelectArtifact,
      }}
    />
  );
}

export default DesignSidebar;
