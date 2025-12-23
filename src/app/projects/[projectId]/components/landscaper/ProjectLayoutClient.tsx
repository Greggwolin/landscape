'use client';

import React, { useState, useEffect } from 'react';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';

interface ProjectLayoutClientProps {
  projectId: string;
  children: React.ReactNode;
}

export function ProjectLayoutClient({ projectId, children }: ProjectLayoutClientProps) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Persist collapse states to localStorage
  useEffect(() => {
    const savedSidebar = localStorage.getItem('landscape-sidebar-collapsed');
    if (savedSidebar) setSidebarCollapsed(savedSidebar === 'true');
  }, []);

  const toggleSidebar = () => {
    const newValue = !isSidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('landscape-sidebar-collapsed', String(newValue));
  };

  const sidebarWidth = isSidebarCollapsed ? '60px' : '240px';

  return (
    <div
      className="h-screen w-screen overflow-hidden grid"
      style={{
        gridTemplateColumns: `${sidebarWidth} 1fr`,
      }}
    >
      {/* Col 1: Unified Sidebar (dark theme, collapsible, shows agents on project pages) */}
      <UnifiedSidebar
        projectId={projectId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Col 2: Main Content Area (Content | Chat | Studio managed by children) */}
      <main
        className="overflow-hidden h-full"
        style={{ backgroundColor: 'var(--surface-page-bg)' }}
      >
        {children}
      </main>
    </div>
  );
}
