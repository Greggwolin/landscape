'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpIcon } from '@/components/icons/HelpIcon';

interface Thread {
  id: string;
  name: string;
  isActive?: boolean;
  onClick?: () => void;
}

interface ScheduledAgent {
  id: string;
  emoji: string;
  name: string;
  status: 'active' | 'paused';
}

interface RecentProject {
  id: string;
  name: string;
  onClick?: () => void;
}

export interface WrapperSidebarProps {
  // Layout integration
  activePage: string;
  onNavigate: (page: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  sidebarWidth: number;
  onResizeStart: (e: React.PointerEvent) => void;

  // Project context
  projectId?: number;
  projectName?: string;
  propertyType?: string;
  analysisType?: string;

  // Data
  threads?: Thread[];
  scheduledAgents?: ScheduledAgent[];
  recentProjects?: RecentProject[];

  // Actions
  onNewChat?: () => void;
  onProjectSelect?: () => void;
  onThemeToggle?: () => void;
  currentTheme?: 'light' | 'dark';

  // User
  userName?: string;
  userPlan?: string;
  userInitials?: string;

  // Help flyout
  isHelpThinking?: boolean;
}

// Simple inline SVG icon component
const NavIcon: React.FC<{ d: string | string[] }> = ({ d }) => (
  <span className="sb-nav-icon">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {(Array.isArray(d) ? d : [d]).map((path, i) => (
        <path key={i} d={path} />
      ))}
    </svg>
  </span>
);

const NAV_ITEMS: Array<{ id: string; label: string; paths: string[]; badge?: string }> = [
  { id: 'projects', label: 'Projects', paths: ['M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 007.93 3H4a2 2 0 00-2 2v13c0 1.1.9 2 2 2z'] },
  { id: 'documents', label: 'Documents', paths: ['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2 14 8 20 8'] },
  { id: 'map', label: 'Map', paths: ['M1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6Z', 'M8 2V18', 'M16 6V22'] },
  { id: 'tools', label: 'Tools', paths: ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.22.532.68.918 1.241 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'], badge: '12' },
  { id: 'reports', label: 'Reports', paths: ['M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2', 'M8 2h8v4H8z'], badge: '15' },
  { id: 'landscaper', label: 'Landscaper AI', paths: ['M11 20A7 7 0 019.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10z', 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'] },
  { id: 'admin', label: 'Admin', paths: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'] },
  { id: 'help', label: 'Help', paths: [] },
];

// Propeller-beanie icon for Help nav item (reuses shared HelpIcon)
// Static by default; spin state is driven by help chat's thinking status.
const PropellerBeanieIcon: React.FC<{ isThinking?: boolean }> = ({ isThinking = false }) => (
  <span className="sb-nav-icon sb-nav-icon-help">
    <HelpIcon isThinking={isThinking} style={{ width: 22, height: 22 }} />
  </span>
);

// Mountain logo PNG (inverted white version for dark sidebar)
const LOGO_SVG = '/logo-invert.png';

export const WrapperSidebar: React.FC<WrapperSidebarProps> = ({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  sidebarWidth,
  onResizeStart,
  projectId,
  projectName,
  propertyType,
  analysisType,
  threads = [],
  scheduledAgents = [],
  recentProjects = [],
  onNewChat,
  onProjectSelect,
  onThemeToggle,
  currentTheme = 'dark',
  userName = 'Gregg Wolin',
  userPlan = 'Crescent Bay Holdings',
  userInitials = 'GW',
  isHelpThinking = false,
}) => {
  const effectiveProjectName = projectName || 'Select project';
  const effectivePropertyType = propertyType || '';
  const effectiveAnalysisType = analysisType || 'Active';

  const router = useRouter();
  const handleNewChat = () => {
    if (onNewChat) onNewChat();
    else router.push('/w/chat');
  };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerProjects, setPickerProjects] = useState<Array<{ project_id: number; project_name: string; project_type_code?: string | null }>>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerFilter, setPickerFilter] = useState('');
  const pickerRef = useRef<HTMLDivElement | null>(null);

  const handleProjectSelect = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPickerOpen((v) => !v);
  };

  useEffect(() => {
    if (!pickerOpen || pickerProjects.length > 0) return;
    setPickerLoading(true);
    fetch('/api/projects')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.results || data?.projects || [];
        setPickerProjects(rows);
        setPickerLoading(false);
      })
      .catch(() => setPickerLoading(false));
  }, [pickerOpen, pickerProjects.length]);

  useEffect(() => {
    if (!pickerOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pickerOpen]);

  const filteredPickerProjects = pickerFilter
    ? pickerProjects.filter((p) =>
        (p.project_name || '').toLowerCase().includes(pickerFilter.toLowerCase())
      )
    : pickerProjects;

  return (
    <>
      <div
        className={`wrapper-sidebar${collapsed ? ' collapsed' : ''}`}
        style={{ width: collapsed ? 48 : sidebarWidth }}
      >
        {/* Header */}
        <div className="sb-header">
          <div className="sb-logo" onClick={() => onNavigate('projects')} style={{ cursor: 'pointer' }}>
            <img src={LOGO_SVG} alt="Landscape" className="sb-logo-img" />
          </div>
          <div className="sb-collapse" onClick={onToggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            ☰
          </div>
        </div>

        {/* Project Selector - always visible */}
        <div ref={pickerRef} style={{ position: 'relative' }}>
        <div className="sb-project-select" onClick={handleProjectSelect} style={{ cursor: 'pointer' }}>
          <div className="sb-ps-top">
            <span className="sb-ps-name">{projectId ? effectiveProjectName : 'Select project'}</span>
            <span className="sb-ps-chevron">▾</span>
          </div>
          {projectId && effectivePropertyType && (
            <div className="sb-ps-type">
              {effectivePropertyType} · {effectiveAnalysisType}
            </div>
          )}
          {projectId && (
            <div className="sb-ps-badges">
              {effectivePropertyType && (
                <span className="sb-ps-badge" style={{ background: '#F37021', color: '#fff' }}>
                  {effectivePropertyType}
                </span>
              )}
              <span
                className="sb-ps-badge"
                style={{
                  background: 'var(--w-success-dim)',
                  color: 'var(--w-success-text)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {effectiveAnalysisType}
              </span>
            </div>
          )}
        </div>

        {pickerOpen && (
          <div
            className="sb-project-picker"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              zIndex: 1000,
              background: 'var(--w-bg-panel, #1a1e27)',
              border: '1px solid var(--w-border, rgba(255,255,255,0.1))',
              borderRadius: 6,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              maxHeight: 360,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <input
              type="text"
              autoFocus
              placeholder="Search projects…"
              value={pickerFilter}
              onChange={(e) => setPickerFilter(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: '8px 10px',
                background: 'var(--w-bg-input, rgba(255,255,255,0.05))',
                border: 'none',
                borderBottom: '1px solid var(--w-border, rgba(255,255,255,0.1))',
                color: 'var(--w-text-primary, #fff)',
                fontSize: 13,
                outline: 'none',
              }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {pickerLoading && (
                <div style={{ padding: 12, fontSize: 12, color: 'var(--w-text-secondary, #94a3b8)' }}>Loading…</div>
              )}
              {!pickerLoading && filteredPickerProjects.length === 0 && (
                <div style={{ padding: 12, fontSize: 12, color: 'var(--w-text-secondary, #94a3b8)' }}>No projects.</div>
              )}
              {filteredPickerProjects.map((p) => (
                <div
                  key={p.project_id}
                  onClick={() => {
                    setPickerOpen(false);
                    setPickerFilter('');
                    router.push(`/w/projects/${p.project_id}`);
                  }}
                  style={{
                    padding: '8px 10px',
                    fontSize: 13,
                    color: 'var(--w-text-primary, #fff)',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--w-border, rgba(255,255,255,0.06))',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.project_name}
                  </span>
                  {p.project_type_code && (
                    <span style={{ fontSize: 10, opacity: 0.6, flexShrink: 0 }}>{p.project_type_code}</span>
                  )}
                </div>
              ))}
            </div>
            <div
              onClick={() => {
                setPickerOpen(false);
                router.push('/w/projects');
              }}
              style={{
                padding: '8px 10px',
                fontSize: 12,
                color: 'var(--w-accent-text, #60a5fa)',
                cursor: 'pointer',
                borderTop: '1px solid var(--w-border, rgba(255,255,255,0.1))',
                textAlign: 'center',
              }}
            >
              View all projects →
            </div>
          </div>
        )}
        </div>

        {/* New Chat */}
        <div className="sb-new-chat" onClick={handleNewChat}>
          <span className="sb-new-icon">＋</span>
          <span className="sb-nav-label">New chat</span>
        </div>

        {/* Search */}
        <div className="sb-search">
          <span>🔍</span>
          <span className="sb-nav-label"> Search chats &amp; documents…</span>
        </div>

        <div className="sb-divider" />

        {/* Navigation */}
        <div className="sb-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <div
                key={item.id}
                className={`sb-nav-item${isActive ? ' active' : ''}`}
                data-label={item.label}
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                {item.id === 'help' ? <PropellerBeanieIcon isThinking={isHelpThinking} /> : <NavIcon d={item.paths} />}
                <span className="sb-nav-label">{item.label}</span>
                {item.badge && <span className="sb-nav-badge">{item.badge}</span>}
              </div>
            );
          })}
        </div>

        <div className="sb-divider" />

        {/* Scrollable sections */}
        <div className="sb-scroll">
          {threads.length > 0 && (
            <div className="sb-section">
              <div className="sb-section-label">Threads</div>
              {threads.map((t) => (
                <div
                  key={t.id}
                  className={`sb-thread${t.isActive ? ' active' : ''}`}
                  onClick={t.onClick}
                >
                  <span className={`sb-thread-dot ${t.isActive ? 'active' : 'idle'}`} />
                  {t.name}
                </div>
              ))}
            </div>
          )}

          {scheduledAgents.length > 0 && (
            <div className="sb-section">
              <div className="sb-section-label">Scheduled</div>
              {scheduledAgents.map((a) => (
                <div key={a.id} className="sb-agent">
                  <span>{a.emoji}</span> {a.name}
                  <span className={`sb-agent-status ${a.status}`}>
                    {a.status === 'active' ? 'Active' : 'Paused'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {recentProjects.length > 0 && (
            <div className="sb-section">
              <div className="sb-section-label">Recent Projects</div>
              {recentProjects.map((p) => (
                <div key={p.id} className="sb-thread" onClick={p.onClick}>
                  <span className="sb-thread-dot idle" />
                  {p.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sb-footer">
          <div className="sb-avatar">{userInitials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sb-user-name">{userName}</div>
            <div className="sb-user-plan">{userPlan}</div>
          </div>
          <div className="sb-footer-actions">
            <div
              className="sb-footer-btn"
              onClick={onThemeToggle}
              title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
            >
              {currentTheme === 'light' ? '🌙' : '☀️'}
            </div>
          </div>
        </div>
      </div>

      {/* Drag handle (sibling of sidebar so it sits at the boundary) */}
      <div
        className="wrapper-drag-handle"
        onPointerDown={onResizeStart}
        style={{
          cursor: 'col-resize',
          width: 4,
          flexShrink: 0,
          background: 'transparent',
        }}
      />
    </>
  );
};

export default WrapperSidebar;
