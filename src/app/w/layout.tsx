'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { WrapperSidebar } from '@/components/wrapper/WrapperSidebar';
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

export default function WrapperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  // Determine active page from pathname
  // Order matters — check specific sub-pages before /projects
  const activePage = (() => {
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/reports')) return 'reports';
    if (pathname.includes('/map')) return 'map';
    if (pathname.includes('/landscaper-ai')) return 'landscaper';
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/tools')) return 'tools';
    if (pathname.includes('/help')) return 'help';
    if (pathname.includes('/projects')) return 'projects';
    return 'projects';
  })();

  // Extract projectId from URL if present
  const projectIdMatch = pathname.match(/\/projects\/(\d+)/);
  const projectId = projectIdMatch ? parseInt(projectIdMatch[1]) : undefined;

  // Fetch real project data when projectId is present
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const lastFetchedId = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!projectId) {
      setProjectData(null);
      lastFetchedId.current = undefined;
      return;
    }
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
      const projectScoped = ['documents', 'reports', 'map'];

      if (page === 'projects') {
        router.push(projectId ? `/w/projects/${projectId}` : '/w/projects');
      } else if (projectScoped.includes(page)) {
        if (projectId) {
          router.push(`/w/projects/${projectId}/${page}`);
        } else {
          router.push('/w/projects');
        }
      } else {
        const routeMap: Record<string, string> = {
          landscaper: 'landscaper-ai',
          admin: 'admin',
          tools: 'tools',
          help: 'help',
        };
        router.push(`/w/${routeMap[page] || page}`);
      }
    },
    [router, projectId]
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
      />
      <main className="wrapper-main">{children}</main>
    </div>
  );
}
