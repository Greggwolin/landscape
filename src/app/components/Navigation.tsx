// app/components/Navigation.tsx
'use client';

import React, { useCallback, useMemo, useState } from 'react';
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
  onClick?: () => void | Promise<void>;
  disabled?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
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

  const navigateToAnalysis = useCallback(async () => {
    if (analysisLoading) return;
    if (!projectId) {
      alert('Select a project to open financial analysis.');
      return;
    }

    setAnalysisLoading(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/property`, {
        cache: 'no-store'
      });
      const data = await response.json();

      if (response.ok && data?.property_id) {
        router.push(`/properties/${data.property_id}/analysis`);
      } else {
        const message =
          data?.error ||
          'This project is not linked to a property record. Please complete property setup first.';
        alert(message);
      }
    } catch (error) {
      console.error('Failed to open financial analysis interface:', error);
      alert('Failed to open analysis. Please try again.');
    } finally {
      setAnalysisLoading(false);
    }
  }, [analysisLoading, projectId, router]);

  // Legacy section - placed at bottom, separate from main navigation
  const legacySection: NavSection = useMemo(() => ({
    title: 'Legacy',
    items: [
      { id: 'assumptions', label: 'Assumptions & Factors', href: projectId ? `/projects/${projectId}/assumptions` : '/projects/17/assumptions', icon: 'cilSettings' },
      {
        id: 'financial-analysis',
        label: analysisLoading ? 'Opening Analysis...' : 'Financial Analysis',
        icon: 'cilChartPie',
        onClick: navigateToAnalysis,
        disabled: analysisLoading || !projectId
      },
      { id: 'market-intel-legacy', label: 'Market Intel (Old)', href: '/market', icon: 'cilGraph' },
      { id: 'project-overview-legacy', label: 'Project Overview (Old)', href: projectId ? `/projects/${projectId}/overview` : '/projects/11/overview', icon: 'cilFile' },
      { id: 'test-coreui', label: 'Theme Demo', href: '/test-coreui', icon: 'cilPaint' },
      { id: 'prototypes', label: 'Prototypes', href: '/prototypes', icon: 'cilBeaker' },
      { id: 'documentation', label: 'Documentation', href: '/documentation', icon: 'cilNotes' }
    ],
    isCollapsible: true
  }), [analysisLoading, navigateToAnalysis, projectId])

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Helper function to render a navigation section
  const renderSection = (section: NavSection, addTopBorder = false) => (
    <div key={section.title} className={`mb-1 ${addTopBorder ? 'border-t pt-2' : ''}`} style={addTopBorder ? { borderColor: 'var(--nav-border)' } : undefined}>
      {section.isCollapsible ? (
        <button
          onClick={() => toggleSection(section.title)}
          className="w-full text-left px-4 py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-between transition-colors"
          style={{ color: 'var(--nav-text)' }}
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
          style={{ color: 'var(--nav-text)' }}
        >
          {section.title}
        </div>
      )}

      {(!section.isCollapsible || !collapsedSections[section.title]) && (
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const isActive = item.href ? pathname === item.href : activeView === item.id;
            const isDisabled = Boolean(item.disabled);
            const baseClasses = `w-full text-left px-6 py-2.5 text-base flex items-center gap-3 transition-colors no-underline`;
            const activeStyle = isActive ? {
              backgroundColor: 'var(--nav-active-bg)',
              color: 'var(--nav-brand)',
              borderRight: '2px solid var(--cui-primary)'
            } : {
              color: 'var(--nav-text)'
            };
            const hoverStyle = !isActive && !isDisabled ? { cursor: 'pointer' } : {};
            const disabledStyle = isDisabled ? { opacity: 0.6, cursor: 'not-allowed' } : {};

            if (item.href) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  target={item.target}
                  className={baseClasses}
                  style={{ ...activeStyle, ...hoverStyle, ...disabledStyle }}
                  onMouseEnter={(e) => {
                    if (!isActive && !isDisabled) {
                      e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive && !isDisabled) {
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
              if (isDisabled) return;
              if (item.onClick) {
                void item.onClick();
                return;
              }
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
                disabled={isDisabled}
                className={baseClasses}
                style={{ ...activeStyle, ...hoverStyle, ...disabledStyle }}
                onMouseEnter={(e) => {
                  if (!isActive && !isDisabled) {
                    e.currentTarget.style.backgroundColor = 'var(--nav-hover-bg)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isDisabled) {
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
        backgroundColor: 'var(--nav-bg)',
        borderColor: 'var(--nav-border)'
      }}
    >
      {/* Logo at very top */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--nav-border)' }}>
        <Link href="/dashboard" className="flex items-center justify-center">
          <Image
            src="/logo-invert.png"
            alt="Landscape Logo"
            width={150}
            height={32}
            className="object-contain"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </Link>
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

      <div className="p-4 border-t" style={{ borderColor: 'var(--nav-border)' }}>
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
