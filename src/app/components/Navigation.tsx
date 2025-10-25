// app/components/Navigation.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { useProjectContext } from './ProjectProvider'
import NewProjectButton from './NewProjectButton'
import { ThemeToggle } from './ThemeToggle'

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
  const { activeProject, projects, selectProject } = useProjectContext()
  const projectId = activeProject?.project_id
  const { config: _projectConfig } = useProjectConfig(projectId ?? undefined)
  const router = useRouter();
  const pathname = usePathname();

  // Reserved for future use - project config level2 label
  // const level2Label = _projectConfig?.level2_label ?? 'Phase';

  const navSections: NavSection[] = useMemo(() => [
    {
      title: 'Project',
      items: [
        { id: 'project-overview', label: 'Overview', href: projectId ? `/projects/${projectId}/overview` : '/projects/11/overview', icon: '📊' }
      ],
      isCollapsible: false
    },
    {
      title: 'Financial',
      items: [
        { id: 'assumptions', label: 'Assumptions', href: projectId ? `/projects/${projectId}/assumptions` : '/projects/11/assumptions', icon: '💰' },
        { id: 'opex', label: 'Operating Expenses', href: projectId ? `/projects/${projectId}/opex` : '/projects/11/opex', icon: '💵' }
      ],
      isCollapsible: false
    },
    {
      title: 'Property Data',
      items: [
        { id: 'rent-roll', label: 'Rent Roll', href: '/rent-roll', icon: '🏠' },
        { id: 'market', label: 'Market Data', href: '/market', icon: '📈' }
      ],
      isCollapsible: false
    },
    {
      title: 'Documents',
      items: [
        { id: 'dms', label: 'Document Library', href: '/dms', icon: '📁' }
      ],
      isCollapsible: false
    },
    {
      title: 'Development',
      items: [
        { id: 'test-coreui', label: 'Theme Demo', href: '/test-coreui', icon: '🎨' },
        { id: 'prototypes', label: 'Prototypes', href: '/prototypes', icon: '🔬' }
      ],
      isCollapsible: true
    }
  ], [projectId])

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

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

      {/* Project selector below logo */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--cui-sidebar-border-color)' }}>
        <select
          value={activeProject?.project_id || ''}
          onChange={(e) => selectProject(Number(e.target.value))}
          className="w-full px-3 py-2 text-sm rounded focus:outline-none"
          style={{
            backgroundColor: 'var(--cui-sidebar-nav-link-hover-bg)',
            borderColor: 'var(--cui-sidebar-border-color)',
            color: 'var(--cui-sidebar-nav-link-color)',
            border: '1px solid var(--cui-sidebar-border-color)'
          }}
        >
          <option value="">Select a project</option>
          {projects.map((project) => (
            <option key={project.project_id} value={project.project_id}>
              {project.project_name}
            </option>
          ))}
        </select>
        <div className="mt-3">
          <NewProjectButton />
        </div>
      </div>

      <div className="flex-1 py-2 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-1">
            {section.isCollapsible ? (
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full text-left px-4 py-2 text-xs font-medium uppercase tracking-wide flex items-center justify-between transition-colors"
                style={{ color: 'var(--cui-tertiary-color)' }}
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
                style={{ color: 'var(--cui-tertiary-color)' }}
              >
                {section.title}
              </div>
            )}

            {(!section.isCollapsible || !collapsedSections[section.title]) && (
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  // Determine if this item is active based on href or activeView
                  const isActive = item.href
                    ? pathname === item.href
                    : activeView === item.id;
                  const baseClasses = `w-full text-left px-6 py-2 text-sm flex items-center gap-3 transition-colors`;
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
                          <span className="text-base" aria-hidden="true">{item.icon}</span>
                        ) : (
                          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                        )}
                        <span>{item.label}</span>
                      </Link>
                    );
                  }

                  // For items without href, navigate to root with state-based view
                  const handleClick = () => {
                    if (pathname !== '/') {
                      // Navigate to root first, then set the view
                      router.push('/');
                      // Use setTimeout to ensure navigation completes before setting view
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
                        <span className="text-base" aria-hidden="true">{item.icon}</span>
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
        ))}
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
