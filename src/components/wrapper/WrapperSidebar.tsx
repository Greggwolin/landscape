'use client';

import React, { useState } from 'react';
import { Menu, Plus, Search, FolderOpen, FileText, Map, Wrench, BarChart3, Sparkles, Settings, Moon, Sun, ChevronDown } from 'lucide-react';

interface Thread {
  id: string;
  name: string;
  timestamp: string;
  isActive: boolean;
}

interface ScheduledAgent {
  id: string;
  name: string;
  status: 'running' | 'scheduled' | 'idle';
  nextRun?: string;
}

interface RecentProject {
  id: string;
  name: string;
  type: string;
}

interface WrapperSidebarProps {
  projectName?: string;
  projectType?: string;
  userEmail?: string;
  userPlan?: string;
  onThemeToggle?: () => void;
  currentTheme?: 'light' | 'dark';
  onNewChat?: () => void;
  threads?: Thread[];
  scheduledAgents?: ScheduledAgent[];
  recentProjects?: RecentProject[];
}

const MOUNTAIN_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHN0eWxlPgouc3Qwey5maWxsOiN3aGl0ZTt9Cjwvc3R5bGU+CjxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xMiAwQzEyIDAgMCA4IDAgMjRoMjRjMC0xNi04LTI0LTEyLTI0eiIvPgo8L3N2Zz4=';

export const WrapperSidebar: React.FC<WrapperSidebarProps> = ({
  projectName = 'Brownstone Apartments',
  projectType = 'Multifamily',
  userEmail = 'user@example.com',
  userPlan = 'Pro',
  onThemeToggle,
  currentTheme = 'dark',
  onNewChat,
  threads = [
    { id: 'thread1', name: 'Budget Analysis', timestamp: '2m ago', isActive: false },
    { id: 'thread2', name: 'Market Research', timestamp: '15m ago', isActive: true },
    { id: 'thread3', name: 'Finance Review', timestamp: '1h ago', isActive: false },
  ],
  scheduledAgents = [
    { id: 'agent1', name: 'Market Analysis', status: 'running', nextRun: '5 min' },
    { id: 'agent2', name: 'Report Generator', status: 'scheduled', nextRun: 'tomorrow' },
  ],
  recentProjects = [
    { id: 'proj1', name: 'Peoria Meadows', type: 'Land Dev' },
    { id: 'proj2', name: 'Downtown Tower', type: 'Office' },
  ],
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('projects');
  const [expandedSection, setExpandedSection] = useState<'threads' | 'agents' | 'projects' | null>('threads');

  const navItems = [
    { id: 'projects', label: 'Projects', icon: FolderOpen },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'map', label: 'Map', icon: Map },
    { id: 'tools', label: 'Tools', icon: Wrench },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'landscaper', label: 'Landscaper AI', icon: Sparkles },
    { id: 'admin', label: 'Admin', icon: Settings },
  ];

  const toggleCollapsed = () => setCollapsed(!collapsed);

  const handleNavClick = (navId: string) => {
    setActiveNav(navId);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#10b981'; // green
      case 'scheduled':
        return '#f59e0b'; // amber
      case 'idle':
        return '#6b7280'; // gray
      default:
        return '#6b7280';
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return '🟢';
      case 'scheduled':
        return '🟡';
      case 'idle':
        return '⚪';
      default:
        return '⚪';
    }
  };

  return (
    <div className={`sb-container ${collapsed ? 'collapsed' : ''}`} style={{ '--theme': currentTheme } as any}>
      {/* Header */}
      <div className="sb-header">
        <div className="sb-logo-wrapper">
          {!collapsed && (
            <img src={MOUNTAIN_LOGO} alt="Landscape" className="sb-logo" />
          )}
        </div>
        <button
          className="sb-collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '▶' : '☰'}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Project Selector */}
          <div className="sb-project-select">
            <div className="sb-project-info">
              <div className="sb-project-name">{projectName}</div>
              <div className="sb-project-badges">
                <span className="sb-badge sb-badge-type">{projectType}</span>
                <span className="sb-badge sb-badge-status">Active</span>
              </div>
            </div>
            <ChevronDown size={16} />
          </div>

          {/* New Chat Button */}
          <button
            className="sb-new-chat-btn"
            onClick={onNewChat}
            title="Start new chat"
          >
            <Plus size={18} />
            <span>New Chat</span>
          </button>

          {/* Search Bar */}
          <div className="sb-search-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="sb-search-input"
            />
          </div>

          {/* Navigation Items */}
          <nav className="sb-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  className={`sb-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  title={item.label}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Scrollable Sections */}
          <div className="sb-sections">
            {/* Threads Section */}
            <div className="sb-section">
              <button
                className="sb-section-header"
                onClick={() => setExpandedSection(expandedSection === 'threads' ? null : 'threads')}
              >
                <span>Threads</span>
                <ChevronDown
                  size={14}
                  className={`sb-section-chevron ${expandedSection === 'threads' ? 'expanded' : ''}`}
                />
              </button>
              {expandedSection === 'threads' && (
                <div className="sb-section-content">
                  {threads.map((thread) => (
                    <div key={thread.id} className={`sb-thread-item ${thread.isActive ? 'active' : ''}`}>
                      <div className="sb-thread-dot" style={{
                        backgroundColor: thread.isActive ? '#10b981' : '#6b7280'
                      }} />
                      <div className="sb-thread-info">
                        <div className="sb-thread-name">{thread.name}</div>
                        <div className="sb-thread-time">{thread.timestamp}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Scheduled Agents Section */}
            <div className="sb-section">
              <button
                className="sb-section-header"
                onClick={() => setExpandedSection(expandedSection === 'agents' ? null : 'agents')}
              >
                <span>Scheduled Agents</span>
                <ChevronDown
                  size={14}
                  className={`sb-section-chevron ${expandedSection === 'agents' ? 'expanded' : ''}`}
                />
              </button>
              {expandedSection === 'agents' && (
                <div className="sb-section-content">
                  {scheduledAgents.map((agent) => (
                    <div key={agent.id} className="sb-agent-item">
                      <div className="sb-agent-dot" style={{
                        backgroundColor: statusColor(agent.status)
                      }}>
                        {statusLabel(agent.status)}
                      </div>
                      <div className="sb-agent-info">
                        <div className="sb-agent-name">{agent.name}</div>
                        <div className="sb-agent-status">{agent.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Projects Section */}
            <div className="sb-section">
              <button
                className="sb-section-header"
                onClick={() => setExpandedSection(expandedSection === 'projects' ? null : 'projects')}
              >
                <span>Recent Projects</span>
                <ChevronDown
                  size={14}
                  className={`sb-section-chevron ${expandedSection === 'projects' ? 'expanded' : ''}`}
                />
              </button>
              {expandedSection === 'projects' && (
                <div className="sb-section-content">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="sb-project-item">
                      <div className="sb-project-item-name">{project.name}</div>
                      <div className="sb-project-item-type">{project.type}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sb-footer">
            <div className="sb-user-info">
              <div className="sb-avatar">👤</div>
              <div className="sb-user-details">
                <div className="sb-user-name">User</div>
                <div className="sb-user-plan">{userPlan}</div>
              </div>
            </div>
            <button
              className="sb-theme-toggle"
              onClick={onThemeToggle}
              title={`Switch to ${currentTheme === 'light' ? 'dark' : 'light'} mode`}
            >
              {currentTheme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
