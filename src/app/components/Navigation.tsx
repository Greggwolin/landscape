// app/components/Navigation.tsx
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { useProjectContext } from './ProjectProvider'
import NewProjectButton from './NewProjectButton'

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
}

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const { activeProject } = useProjectContext()
  const projectId = activeProject?.project_id
  const { config: projectConfig } = useProjectConfig(projectId ?? undefined)
  const router = useRouter();
  const pathname = usePathname();

  const level2Label = projectConfig?.level2_label ?? 'Phase'

  const navSections: NavSection[] = useMemo(() => [
    {
      title: 'Home',
      items: [
        { id: 'home', label: 'Home' },
        { id: 'dev-status', label: 'Development Status' },
        { id: 'documentation', label: 'Documentation' },
        { id: 'prototype-lab', label: 'Prototype Lab', href: '/prototypes' }
      ]
    },
    {
      title: 'Planning',
      items: [
        { id: 'planning-inline', label: 'Planning' },
        { id: 'planning-overview', label: 'Overview' }
      ],
      isCollapsible: true
    },
    {
      title: 'Assumptions',
      items: [
        { id: 'assumptions', label: 'Deal Assumptions', href: projectId ? `/projects/${projectId}/assumptions` : '/projects/11/assumptions' },
        { id: 'market', label: 'Global' },
        { id: 'market-page', label: 'Market', href: '/market' },
        { id: 'growth-rates', label: 'Market Rates & Prices' },
        { id: 'rent-roll', label: 'Rent Roll', href: '/rent-roll' },
        { id: 'inventory', label: 'Inventory', href: '/inventory' }
      ],
      isCollapsible: true
    },
    {
      title: 'Budgets',
      items: [
        { id: 'project-costs', label: 'Project Costs' },
        { id: 'budget-grid-light', label: 'Budget Grid (Light)' },
        { id: 'budget-grid-dark', label: 'Budget Grid (Dark)' }
      ],
      isCollapsible: true
    },
    {
      title: 'Documents (DMS)',
      items: [
        { id: 'dms', label: 'Document Management', href: '/dms' },
        { id: 'admin-dms-attributes', label: 'DMS Attributes', href: '/admin/dms/attributes' },
        { id: 'admin-dms-templates', label: 'DMS Templates', href: '/admin/dms/templates' }
      ],
      isCollapsible: false
    },
    {
      title: 'Settings',
      items: [
        { id: 'settings', label: 'Settings' },
        { id: 'zoning-glossary', label: 'Zoning Glossary' },
        { id: 'planning', label: `${level2Label} Planner (Legacy)` }
      ]
    },
    {
      title: 'Admin',
      items: [
        { id: 'project-setup', label: 'New Project Setup', href: '/projects/setup' }
      ],
      isCollapsible: true
    },
    {
      title: 'Demos',
      items: [
        { id: 'breadcrumb-demo', label: 'Dynamic Breadcrumbs', href: '/breadcrumb-demo' }
      ],
      isCollapsible: true
    }
  ], [level2Label, projectId])

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  return (
    <nav className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-gray-300 text-sm font-medium">Project Navigation</h2>
        </div>
        <NewProjectButton />
      </div>

      <div className="flex-1 py-2 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="mb-1">
            {section.isCollapsible ? (
              <button
                onClick={() => toggleSection(section.title)}
                className="w-full text-left px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide hover:text-gray-300 flex items-center justify-between transition-colors"
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
              <div className="px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
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
                  const baseClasses = `w-full text-left px-6 py-2 text-sm flex items-center gap-3 hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-700 text-white border-r-2 border-blue-500' : 'text-gray-300'}`;

                  if (item.href) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        target={item.target}
                        className={baseClasses}
                      >
                        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
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
                    >
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-current opacity-70" aria-hidden="true" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="text-xs text-gray-500 space-y-1">
          <div>Project ID: 7</div>
          <div>Last saved: Just now</div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
