/**
 * @deprecated This component is deprecated. Use UnifiedSidebar instead.
 * UnifiedSidebar provides a single sidebar that adapts based on route context
 * and shows agent navigation when on project pages.
 * This file will be removed in a future update.
 */
'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import CIcon from '@coreui/icons-react';
import { cilUser, cilSettings, cilChevronLeft, cilChevronRight } from '@coreui/icons';

interface AgentStatus {
  id: string;
  name: string;
  icon: string;
  path: string;
  status: 'complete' | 'partial' | 'blocked' | 'not-started';
  confidence?: 'high' | 'medium' | 'low';
  summary?: string;
}

const agents: AgentStatus[] = [
  {
    id: 'coo',
    name: 'Landscaper',
    icon: '🏗️',
    path: '',
    status: 'complete',
    summary: 'Project overview'
  },
  {
    id: 'market',
    name: 'Market Analyst',
    icon: '📊',
    path: '/market',
    status: 'complete',
    confidence: 'high',
    summary: 'Absorption, pricing, comps'
  },
  {
    id: 'budget',
    name: 'Budget Analyst',
    icon: '💰',
    path: '/budget',
    status: 'partial',
    confidence: 'medium',
    summary: 'Costs, phasing, contingencies'
  },
  {
    id: 'underwriting',
    name: 'Underwriter',
    icon: '📈',
    path: '/underwriting',
    status: 'blocked',
    summary: 'Feasibility, returns, sensitivity'
  },
  {
    id: 'documents',
    name: 'Documents',
    icon: '📁',
    path: '/documents',
    status: 'partial',
    summary: 'Document management'
  },
];

interface AgentSidebarProps {
  projectId: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AgentSidebar({ projectId, isCollapsed = false, onToggleCollapse }: AgentSidebarProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  const getStatusColor = (status: AgentStatus['status']) => {
    switch (status) {
      case 'complete': return 'bg-green-500';
      case 'partial': return 'bg-yellow-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  // Collapsed view - icons only
  if (isCollapsed) {
    return (
      <aside
        className="h-full flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderRight: '1px solid var(--nav-border)',
          width: '60px',
        }}
      >
        {/* Collapsed Logo - Plant Icon */}
        <div
          className="flex items-center justify-center py-3"
          style={{ borderBottom: '1px solid var(--nav-border)' }}
        >
          <Link href="/" className="text-2xl">
            🌿
          </Link>
        </div>

        {/* Expand Button */}
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center py-2 transition-colors"
          style={{ color: 'var(--nav-text)' }}
        >
          <CIcon icon={cilChevronRight} size="sm" />
        </button>

        {/* Dashboard Link (collapsed) */}
        <Link
          href="/dashboard"
          className="flex items-center justify-center py-2 mx-2 rounded-lg mb-1 transition-colors"
          style={{
            color: 'var(--nav-text)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Dashboard"
        >
          <span className="text-lg">📋</span>
        </Link>

        <div className="my-1 mx-2" style={{ borderTop: '1px solid var(--nav-border)' }} />

        {/* Agent Icons */}
        <nav className="flex-1 overflow-y-auto py-2">
          {agents.map((agent) => {
            const fullPath = `${basePath}${agent.path}`;
            const isActive = pathname === fullPath;

            return (
              <Link
                key={agent.id}
                href={fullPath}
                className="flex items-center justify-center py-2 mx-2 rounded-lg mb-1 transition-colors relative"
                style={{
                  backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                title={agent.name}
              >
                <span className="text-lg">{agent.icon}</span>
                <span
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}
                />
              </Link>
            );
          })}
        </nav>

        {/* Bottom Icons */}
        <div
          className="py-2 flex flex-col items-center gap-2"
          style={{ borderTop: '1px solid var(--nav-border)' }}
        >
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--nav-text)' }}
            title="User"
          >
            <CIcon icon={cilUser} size="lg" />
          </button>
          <button
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--nav-text)' }}
            title="Settings"
          >
            <CIcon icon={cilSettings} size="lg" />
          </button>
        </div>
      </aside>
    );
  }

  // Expanded view - full sidebar
  return (
    <aside
      className="h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--nav-bg)',
        borderRight: '1px solid var(--nav-border)',
      }}
    >
      {/* Logo */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--nav-border)' }}
      >
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-invert.png"
            alt="Landscape"
            width={140}
            height={32}
            priority
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
          />
        </Link>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--nav-text)' }}
          aria-label="Collapse sidebar"
        >
          <CIcon icon={cilChevronLeft} size="sm" />
        </button>
      </div>

      {/* Dashboard Link (expanded) */}
      <div className="px-2 pt-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--nav-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <span className="text-lg">📋</span>
          <span className="font-medium">Dashboard</span>
        </Link>
      </div>

      {/* Agent List */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div
          className="text-xs uppercase tracking-wider px-3 py-2"
          style={{ color: 'var(--nav-text)', opacity: 0.7 }}
        >
          Agents
        </div>

        {agents.map((agent) => {
          const fullPath = `${basePath}${agent.path}`;
          const isActive = pathname === fullPath;

          return (
            <Link
              key={agent.id}
              href={fullPath}
              className="flex items-start gap-3 px-3 py-2 rounded-lg mb-1 transition-colors"
              style={{
                backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                color: isActive ? 'var(--brand-primary)' : 'var(--nav-text)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span className="text-lg">{agent.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{agent.name}</span>
                  <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`} />
                </div>
                <div
                  className="text-xs truncate"
                  style={{ color: 'var(--nav-text)', opacity: 0.6 }}
                >
                  {agent.summary}
                </div>
              </div>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3" style={{ borderTop: '1px solid var(--nav-border)' }} />

        {/* Traditional View */}
        <Link
          href={`${basePath}/detail`}
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
          style={{ color: 'var(--nav-text)', opacity: 0.7 }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.opacity = '0.7';
          }}
        >
          <span>⚙️</span>
          <span className="text-sm">Traditional View</span>
        </Link>
      </nav>

      {/* Bottom: User & Settings */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--nav-border)' }}
      >
        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--nav-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <CIcon icon={cilUser} size="lg" />
          <span className="text-sm">User</span>
        </button>
        <button
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--nav-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          aria-label="Settings"
        >
          <CIcon icon={cilSettings} size="lg" />
        </button>
      </div>
    </aside>
  );
}
