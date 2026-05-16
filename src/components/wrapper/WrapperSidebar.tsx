'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilSearch, cilMenu, cilMoon, cilSun, cilAccountLogout } from '@coreui/icons';
import { HelpIcon } from '@/components/icons/HelpIcon';

interface Thread {
  id: string;
  name: string;
  isActive?: boolean;
  /** Universal Archive Pattern: TRUE when rendered in the Archived section. */
  isArchived?: boolean;
  onClick?: () => void;
  /** Optional project name shown beneath the title as a faint hint. */
  projectName?: string;
}

// Default visible-row caps for the sidebar's two scrollable lists.
// Claude pattern: show recent N, expand to all via "See more (N)".
const DEFAULT_THREAD_CAP = 5;
const DEFAULT_PROJECT_CAP = 5;

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

  // Data
  threads?: Thread[];
  /** Archived threads (Universal Archive Pattern Phase 1a). Rendered in a
   *  separate collapsible "Archived" section below the live threads list. */
  archivedThreads?: Thread[];
  scheduledAgents?: ScheduledAgent[];
  recentProjects?: RecentProject[];

  // Actions
  onNewChat?: () => void;
  onSearchClick?: () => void;
  onThemeToggle?: () => void;
  onLogout?: () => void;
  currentTheme?: 'light' | 'dark';

  /** Soft-archive a live thread. Hover-revealed icon on each live-thread row. */
  onArchiveThread?: (threadId: string) => void;
  /** Restore an archived thread. Hover-revealed icon on each archived-thread row. */
  onRestoreThread?: (threadId: string) => void;
  /** Permanently delete an archived thread. Hover-revealed icon on archived rows. */
  onDeleteThreadPermanently?: (threadId: string) => void;

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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      {(Array.isArray(d) ? d : [d]).map((path, i) => (
        <path key={i} d={path} />
      ))}
    </svg>
  </span>
);

const NAV_ITEMS: Array<{ id: string; label: string; paths: string[]; badge?: string }> = [
  // 'dashboard' (Home) routes to /w/dashboard — the chat-forward landing surface
  // for the user. LF-USERDASH-0514 Phase 1.
  { id: 'dashboard', label: 'Home', paths: ['M3 12 12 3l9 9', 'M5 10v10a1 1 0 001 1h3v-7h6v7h3a1 1 0 001-1V10'] },
  { id: 'projects', label: 'Projects', paths: ['M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 007.93 3H4a2 2 0 00-2 2v13c0 1.1.9 2 2 2z'] },
  // Platform Knowledge — uses the propeller-beanie icon (see PropellerBeanieIcon
  // below). Paths array unused for this entry; rendering branches on id below.
  { id: 'platform-knowledge', label: 'Platform Knowledge', paths: [] },
  { id: 'map', label: 'Map', paths: ['M1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6Z', 'M8 2V18', 'M16 6V22'] },
  { id: 'tools', label: 'Tools', paths: ['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.22.532.68.918 1.241 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z'], badge: '12' },
  { id: 'reports', label: 'Reports', paths: ['M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2', 'M8 2h8v4H8z'], badge: '15' },
  { id: 'landscaper', label: 'Landscaper AI', paths: ['M11 20A7 7 0 019.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10z', 'M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12'] },
  { id: 'admin', label: 'Admin', paths: ['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z'] },
  { id: 'admin-feedback', label: 'Feedback', paths: ['M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'] },
  // Help — CoreUI-style question-mark icon (cilQuestion equivalent inline SVG).
  // Previously used the propeller-beanie icon; that's now on platform-knowledge.
  { id: 'help', label: 'Help', paths: [
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
    'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3',
    'M12 17h.01',
  ] },
];

// Propeller-beanie icon for Help nav item (reuses shared HelpIcon)
// Static by default; spin state is driven by help chat's thinking status.
const PropellerBeanieIcon: React.FC<{ isThinking?: boolean }> = ({ isThinking = false }) => (
  <span className="sb-nav-icon sb-nav-icon-help">
    <HelpIcon isThinking={isThinking} style={{ width: 24, height: 24 }} />
  </span>
);

// Mountain logo PNG (inverted white version for dark sidebar)
const LOGO_SVG = '/logo-invert.png';

/* ── Thread row action icons (Universal Archive Pattern Phase 1a) ──────────
 * Inline SVG icons keep us off any extra icon-library dep. Each button stops
 * propagation so clicking the action doesn't also fire the row's onClick
 * (which would navigate to the thread). Visibility is hover-driven via the
 * `.sb-thread-actions` CSS class — see styles in wrapper.css.
 */
const ArchiveIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="5" rx="1" />
    <path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" />
    <path d="M10 12h4" />
  </svg>
);
const RestoreIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 109-9 9.74 9.74 0 00-7 3" />
    <path d="M3 4v5h5" />
  </svg>
);
const TrashIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
    <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

interface ThreadRowActionProps {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'danger';
  children: React.ReactNode;
}

const ThreadRowAction: React.FC<ThreadRowActionProps> = ({ label, onClick, variant = 'default', children }) => (
  <button
    type="button"
    className={`sb-thread-action${variant === 'danger' ? ' danger' : ''}`}
    title={label}
    aria-label={label}
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
  >
    {children}
  </button>
);

export const WrapperSidebar: React.FC<WrapperSidebarProps> = ({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  sidebarWidth,
  onResizeStart,
  threads = [],
  archivedThreads = [],
  scheduledAgents = [],
  recentProjects = [],
  onNewChat,
  onSearchClick,
  onThemeToggle,
  onLogout,
  currentTheme = 'dark',
  userName = 'Gregg Wolin',
  userPlan = 'Crescent Bay Holdings',
  userInitials = 'GW',
  isHelpThinking = false,
  onArchiveThread,
  onRestoreThread,
  onDeleteThreadPermanently,
}) => {
  const router = useRouter();
  const [threadsCollapsed, setThreadsCollapsed] = useState(false);
  const [archivedCollapsed, setArchivedCollapsed] = useState(true);
  const [scheduledCollapsed, setScheduledCollapsed] = useState(false);
  const [projectsCollapsed, setProjectsCollapsed] = useState(false);
  // Thread "See more" state — capped at DEFAULT_THREAD_CAP by default.
  // If the active thread sits past the cap, expand automatically so the
  // user always sees the row that matches the URL they're on.
  const activeThreadIndex = threads.findIndex((t) => t.isActive);
  const [threadsExpanded, setThreadsExpanded] = useState(
    activeThreadIndex >= DEFAULT_THREAD_CAP,
  );
  // Re-evaluate auto-expand when the active thread changes.
  React.useEffect(() => {
    if (activeThreadIndex >= DEFAULT_THREAD_CAP) setThreadsExpanded(true);
  }, [activeThreadIndex]);
  const visibleThreads = threadsExpanded ? threads : threads.slice(0, DEFAULT_THREAD_CAP);
  const hiddenThreadCount = Math.max(0, threads.length - DEFAULT_THREAD_CAP);

  // Recent Projects "See more" — same shape as threads but no auto-expand,
  // since there's no concept of an "active" project row in the recent list.
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const visibleProjects = projectsExpanded
    ? recentProjects
    : recentProjects.slice(0, DEFAULT_PROJECT_CAP);
  const hiddenProjectCount = Math.max(
    0,
    recentProjects.length - DEFAULT_PROJECT_CAP,
  );

  const handleNewChat = () => {
    if (onNewChat) onNewChat();
    else router.push('/w/chat');
  };

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
            <CIcon icon={cilMenu} size="sm" />
          </div>
        </div>

        {/* New Chat */}
        <button type="button" className="w-btn w-btn-ghost sb-new-chat-stub" onClick={handleNewChat}>
          <span className="sb-new-icon"><CIcon icon={cilPlus} size="sm" /></span>
          <span className="sb-nav-label">New chat</span>
        </button>

        {/* Search */}
        <div className="sb-search" onClick={onSearchClick} style={{ cursor: 'pointer' }}>
          <span className="sb-search-icon"><CIcon icon={cilSearch} size="sm" /></span>
          <span className="sb-nav-label"> Search chats…</span>
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
                {item.id === 'platform-knowledge'
                  ? <PropellerBeanieIcon isThinking={isHelpThinking} />
                  : <NavIcon d={item.paths} />}
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
              <div
                className="sb-section-label sb-section-label--toggle"
                onClick={() => setThreadsCollapsed((v) => !v)}
              >
                <span>Threads</span>
                <span className="sb-section-chev">{threadsCollapsed ? '▸' : '▾'}</span>
              </div>
              {!threadsCollapsed && visibleThreads.map((t) => (
                <div
                  key={t.id}
                  className={`sb-thread${t.isActive ? ' active' : ''}`}
                  onClick={t.onClick}
                  title={t.projectName ? `${t.name} — ${t.projectName}` : t.name}
                >
                  <span className={`sb-thread-dot ${t.isActive ? 'active' : 'idle'}`} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <span
                      style={{
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.name}
                    </span>
                    {t.projectName && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 13,
                          opacity: 0.6,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.projectName}
                      </span>
                    )}
                  </span>
                  {onArchiveThread && (
                    <span className="sb-thread-actions">
                      <ThreadRowAction
                        label="Archive"
                        onClick={() => onArchiveThread(t.id)}
                      >
                        <ArchiveIcon />
                      </ThreadRowAction>
                    </span>
                  )}
                </div>
              ))}
              {!threadsCollapsed && hiddenThreadCount > 0 && (
                <div
                  className="sb-thread sb-thread-more"
                  onClick={() => setThreadsExpanded((v) => !v)}
                  style={{
                    fontSize: 11,
                    opacity: 0.7,
                    cursor: 'pointer',
                    paddingLeft: 22,
                  }}
                >
                  {threadsExpanded
                    ? 'See less'
                    : `See more (${hiddenThreadCount})`}
                </div>
              )}
            </div>
          )}

          {/* Archived threads (Universal Archive Pattern Phase 1a).
              Default collapsed; the count is shown in the header. */}
          {archivedThreads.length > 0 && (
            <div className="sb-section">
              <div
                className="sb-section-label sb-section-label--toggle"
                onClick={() => setArchivedCollapsed((v) => !v)}
              >
                <span>Archived ({archivedThreads.length})</span>
                <span className="sb-section-chev">{archivedCollapsed ? '▸' : '▾'}</span>
              </div>
              {!archivedCollapsed && archivedThreads.map((t) => (
                <div
                  key={t.id}
                  className="sb-thread sb-thread-archived"
                  onClick={t.onClick}
                  title={t.projectName ? `${t.name} — ${t.projectName} (archived)` : `${t.name} (archived)`}
                  style={{ opacity: 0.65 }}
                >
                  <span className="sb-thread-dot idle" />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <span
                      style={{
                        display: 'block',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {t.name}
                    </span>
                    {t.projectName && (
                      <span
                        style={{
                          display: 'block',
                          fontSize: 13,
                          opacity: 0.6,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.projectName}
                      </span>
                    )}
                  </span>
                  <span className="sb-thread-actions">
                    {onRestoreThread && (
                      <ThreadRowAction
                        label="Restore"
                        onClick={() => onRestoreThread(t.id)}
                      >
                        <RestoreIcon />
                      </ThreadRowAction>
                    )}
                    {onDeleteThreadPermanently && (
                      <ThreadRowAction
                        label="Delete permanently"
                        variant="danger"
                        onClick={() => {
                          if (window.confirm(`Permanently delete "${t.name}"? This cannot be undone.`)) {
                            onDeleteThreadPermanently(t.id);
                          }
                        }}
                      >
                        <TrashIcon />
                      </ThreadRowAction>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}

          {scheduledAgents.length > 0 && (
            <div className="sb-section">
              <div
                className="sb-section-label sb-section-label--toggle"
                onClick={() => setScheduledCollapsed((v) => !v)}
              >
                <span>Scheduled</span>
                <span className="sb-section-chev">{scheduledCollapsed ? '▸' : '▾'}</span>
              </div>
              {!scheduledCollapsed && scheduledAgents.map((a) => (
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
              <div
                className="sb-section-label sb-section-label--toggle"
                onClick={() => setProjectsCollapsed((v) => !v)}
              >
                <span>Recent Projects</span>
                <span className="sb-section-chev">{projectsCollapsed ? '▸' : '▾'}</span>
              </div>
              {!projectsCollapsed && visibleProjects.map((p) => (
                <div key={p.id} className="sb-thread" onClick={p.onClick}>
                  <span className="sb-thread-dot idle" />
                  {p.name}
                </div>
              ))}
              {!projectsCollapsed && hiddenProjectCount > 0 && (
                <div
                  className="sb-thread sb-thread-more"
                  onClick={() => setProjectsExpanded((v) => !v)}
                  style={{
                    fontSize: 11,
                    opacity: 0.7,
                    cursor: 'pointer',
                    paddingLeft: 22,
                  }}
                >
                  {projectsExpanded
                    ? 'See less'
                    : `See more (${hiddenProjectCount})`}
                </div>
              )}
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
            <button
              type="button"
              className="w-btn w-btn-icon w-btn-sm"
              onClick={onThemeToggle}
              title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
            >
              <CIcon icon={currentTheme === 'light' ? cilMoon : cilSun} size="sm" />
            </button>
            {onLogout && (
              <button
                type="button"
                className="w-btn w-btn-icon w-btn-sm"
                onClick={onLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                <CIcon icon={cilAccountLogout} size="sm" />
              </button>
            )}
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
