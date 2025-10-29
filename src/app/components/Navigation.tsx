// app/components/Navigation.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useProjectContext } from './ProjectProvider'
import { ThemeToggle } from './ThemeToggle'
import CIcon from '@coreui/icons-react';
import {
  cilChartPie,
  cilMoney,
  cilCash,
  cilHome,
  cilGraph,
  cilFolder,
  cilPaint,
  cilBeaker,
  cilFile,
  cilNotes,
  cilSpeedometer,
  cilSettings,
  cilDescription
} from '@coreui/icons';

// Icon map for dynamic icon lookup
const ICON_MAP: Record<string, any> = {
  cilChartPie,
  cilMoney,
  cilCash,
  cilHome,
  cilGraph,
  cilFolder,
  cilPaint,
  cilBeaker,
  cilFile,
  cilNotes,
  cilSpeedometer,
  cilSettings,
  cilDescription
};

interface NavigationProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
  isCollapsible?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  href?: string;
  target?: string;
  icon?: string;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const { activeProject } = useProjectContext()
  const projectId = activeProject?.project_id
  const router = useRouter();
  const pathname = usePathname();

  // Reserved for future use - project config level2 label
  // const level2Label = _projectConfig?.level2_label ?? 'Phase';

  const navSections: NavSection[] = useMemo(() => [
    {
      title: 'Home',
      items: [
        { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'cilSpeedometer' }
      ],
      isCollapsible: false
    },
    {
      title: 'Project',
      items: [
        { id: 'project-overview', label: 'Project', href: projectId ? `/projects/${projectId}` : '/projects/7', icon: 'cilChartPie' }
      ],
      isCollapsible: false
    },
    {
      title: 'Financial',
      items: [
        { id: 'opex', label: 'Operating Expenses', href: projectId ? `/projects/${projectId}/opex-accounts` : '/projects/11/opex-accounts', icon: 'cilCash' }
      ],
      isCollapsible: false
    },
    {
      title: 'Property Data',
      items: [
        { id: 'rent-roll', label: 'Rent Roll', href: '/rent-roll', icon: 'cilHome' }
      ],
      isCollapsible: false
    },
    {
      title: 'Reports',
      items: [
        { id: 'reports', label: 'Financial Reports', href: '/reports', icon: 'cilDescription' }
      ],
      isCollapsible: false
    },
    {
      title: 'Documents',
      items: [
        { id: 'dms', label: 'Document Library', href: '/dms', icon: 'cilFolder' },
        { id: 'dms-admin', label: 'DMS Admin', href: '/admin/dms/templates', icon: 'cilSettings' }
      ],
      isCollapsible: false
    }
  ], [projectId])

  // Legacy section - placed at bottom, separate from main navigation
  const legacySection: NavSection = useMemo(() => ({
    title: 'Legacy',
    items: [
      { id: 'assumptions', label: 'Assumptions & Factors', href: projectId ? `/projects/${projectId}/assumptions` : '/projects/17/assumptions', icon: 'cilSettings' },
      { id: 'market-assumptions', label: 'Market Assumptions (Old)', href: projectId ? `/properties/${projectId}/analysis` : '/properties/17/analysis', icon: 'cilChartPie' },
      { id: 'market-intel-legacy', label: 'Market Intel (Old)', href: '/market', icon: 'cilGraph' },
      { id: 'project-overview-legacy', label: 'Project Overview (Old)', href: projectId ? `/projects/${projectId}/overview` : '/projects/11/overview', icon: 'cilFile' },
      { id: 'test-coreui', label: 'Theme Demo', href: '/test-coreui', icon: 'cilPaint' },
      { id: 'prototypes', label: 'Prototypes', href: '/prototypes', icon: 'cilBeaker' },
      { id: 'documentation', label: 'Documentation', href: '/documentation', icon: 'cilNotes' }
    ],
    isCollapsible: true
  }), [projectId])

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Helper function to render a navigation section
  const renderSection = (section: NavSection, addTopBorder = false) => (
    <div key={section.title} className={`mb-1 ${addTopBorder ? 'border-t pt-2' : ''}`} style={addTopBorder ? { borderColor: 'var(--cui-sidebar-border-color)' } : undefined}>
      {section.isCollapsible ? (
        <button
          onClick={() => toggleSection(section.title)}
          className="w-full text-left px-4 py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-between transition-colors"
          style={{ color: 'var(--cui-sidebar-nav-link-color)' }}
        >
          <span>{section.title}</span>
          <svg
            className={`w-4 h-4 transition-transform ${collapsedSections[section.title] ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ) : (
        <div
          className="px-4 py-2 text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--cui-sidebar-nav-link-color)' }}
        >
          {section.title}
        </div>
      )}

      {(!section.isCollapsible || !collapsedSections[section.title]) && (
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const isActive = item.href ? pathname === item.href : activeView === item.id;
            const baseClasses = `w-full text-left px-6 py-2.5 text-base flex items-center gap-3 transition-colors no-underline`;
            const activeStyle = isActive ? {
              backgroundColor: 'var(--cui-sidebar-nav-link-active-bg)',
              color: 'var(--cui-sidebar-nav-link-active-color)',
              borderRight: '2px solid var(--cui-primary)'
            } : {
              color: 'var(--cui-sidebar-nav-link-color)'
            };
            const hoverStyle = !isActive ? { cursor: 'pointer' } : {};

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.target}
                  className={baseClasses}
                  style={{ ...activeStyle, ...hoverStyle }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'var(--cui-sidebar-nav-link-hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {item.icon ? (
                    <CIcon icon={ICON_MAP[item.icon]} size="sm" className="opacity-70" />
                  ) : (
                    <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                  )}
                  <span>{item.label}</span>
                </Link>
              );
            }

            const handleClick = () => {
              if (pathname !== '/') {
                router.push('/');
                setTimeout(() => setActiveView(item.id), 100);
              } else {
                setActiveView(item.id);
              }
            };

            return (
              <button
                key={item.id}
                onClick={handleClick}
                className={baseClasses}
                style={{ ...activeStyle, ...hoverStyle }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--cui-sidebar-nav-link-hover-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.icon ? (
                  <CIcon icon={ICON_MAP[item.icon]} size="sm" className="opacity-70" />
                ) : (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <nav
      className="w-64 border-r flex flex-col h-screen"
      style={{
        backgroundColor: 'var(--cui-sidebar-bg)',
        borderColor: 'var(--cui-sidebar-border-color)'
      }}
    >
      {/* Logo at very top */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--cui-sidebar-border-color)' }}>
        <div className="flex items-center justify-center">
          <Image
            src="/logo-invert.png"
            alt="Landscape Logo"
            width={150}
            height={32}
            className="h-8 object-contain"
            style={{ width: 'auto' }}
          />
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 py-2 overflow-y-auto">
        {/* Main navigation sections */}
        {navSections.map(section => renderSection(section))}

        {/* Spacer to push legacy section to bottom */}
        <div className="flex-grow min-h-4"></div>

        {/* Legacy section at bottom with separator */}
        {renderSection(legacySection, true)}
      </div>

      <div className="p-4 border-t" style={{ borderColor: 'var(--cui-sidebar-border-color)' }}>
        <ThemeToggle className="mb-3" />
        <div className="text-xs space-y-1" style={{ color: 'var(--cui-tertiary-color)' }}>
          <div>Project ID: {activeProject?.project_id || 'None'}</div>
          <div>Last saved: Just now</div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
