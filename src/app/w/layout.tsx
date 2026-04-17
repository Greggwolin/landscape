'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { WrapperSidebar } from '@/components/wrapper/WrapperSidebar';
import { CenterChatPanel } from '@/components/wrapper/CenterChatPanel';
import { WrapperUIProvider, useWrapperUI } from '@/contexts/WrapperUIContext';
import { LandscaperCollisionProvider } from '@/contexts/LandscaperCollisionContext';
import { HelpLandscaperProvider, useHelpLandscaper } from '@/contexts/HelpLandscaperContext';
import HelpLandscaperPanel from '@/components/help/HelpLandscaperPanel';
import { useTheme } from '@/app/components/CoreUIThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import '@/styles/wrapper.css';

const DEFAULT_SIDEBAR_WIDTH = 260;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 450;
const COLLAPSE_THRESHOLD = 120;
const COLLAPSED_WIDTH = 48;

interface ProjectData {
  project_name: string;
  project_type_code?: string;
  property_subtype?: string;
  analysis_type?: string;
}

function WrapperLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toggleHelp, isLoading: isHelpLoading } = useHelpLandscaper();
  const { theme, toggleTheme } = useTheme();
  const { rightPanelNarrow } = useWrapperUI();
  const { logout, user } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Derive active nav page from URL
  const activePage = (() => {
    if (pathname.includes('/documents')) return 'documents';
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

  // Extract threadId from /w/chat/[threadId] routes (Chat Canvas unassigned threads)
  const chatThreadIdMatch = pathname.match(/\/chat\/([0-9a-fA-F-]{36})$/);
  const initialThreadId = chatThreadIdMatch ? chatThreadIdMatch[1] : undefined;

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

      const projectScoped = ['documents', 'reports', 'map'];
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

  // Mock data for sidebar sections until real sources wired
  const mockThreads = [
    { id: 't1', name: 'OM ingestion — Brownstone', isActive: true },
    { id: 't2', name: 'Bridge rate sensitivity analysis' },
    { id: 't3', name: 'Model integrity audit' },
    { id: 't4', name: 'Comp survey — Bellflower' },
  ];
  const mockScheduled = [
    { id: 's1', emoji: '📊', name: 'FRED market data pull', status: 'active' as const },
    { id: 's2', emoji: '🏗️', name: 'Bellflower permit monitor', status: 'active' as const },
    { id: 's3', emoji: '🏠', name: 'Redfin comp tracker', status: 'paused' as const },
  ];
  const mockRecent = [
    { id: 'r1', name: 'Old River School — UW' },
    { id: 'r2', name: 'Red Valley Ranch' },
    { id: 'r3', name: 'Peoria Meadows' },
  ];

  return (
    <div className="wrapper-layout">
      <WrapperSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        sidebarWidth={sidebarWidth}
        onResizeStart={handleResizeStart}
        projectId={projectId}
        projectName={projectData?.project_name}
        propertyType={projectData?.project_type_code}
        analysisType={projectData?.analysis_type}
        threads={mockThreads}
        scheduledAgents={mockScheduled}
        recentProjects={mockRecent}
        isHelpThinking={isHelpLoading}
        currentTheme={theme === 'light' ? 'light' : 'dark'}
        onThemeToggle={toggleTheme}
        onLogout={logout}
        userName={user ? `${user.first_name} ${user.last_name}`.trim() || user.username : undefined}
        userInitials={user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.username[0].toUpperCase() : undefined}
      />
      <CenterChatPanel
        projectId={initialThreadId ? undefined : (projectId ?? lastProjectId)}
        initialThreadId={initialThreadId}
      />
      <main className={`wrapper-main${rightPanelNarrow ? ' wrapper-main-narrow' : ''}`}>{children}</main>
      <HelpLandscaperPanel />
    </div>
  );
}

export default function WrapperLayout({ children }: { children: React.ReactNode }) {
  return (
    <WrapperUIProvider>
      <LandscaperCollisionProvider>
        <HelpLandscaperProvider>
          <WrapperLayoutInner>{children}</WrapperLayoutInner>
        </HelpLandscaperProvider>
      </LandscaperCollisionProvider>
    </WrapperUIProvider>
  );
}
