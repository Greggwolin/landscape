// app/components/Navigation.tsx
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useProjectConfig } from '@/hooks/useProjectConfig'
import { useProjectContext } from './ProjectProvider'

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
  icon: string;
  href?: string;
  target?: string;
}

const Navigation: React.FC<NavigationProps> = ({ activeView, setActiveView }) => {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const { activeProject } = useProjectContext()
  const projectId = activeProject?.project_id
  const { config: projectConfig } = useProjectConfig(projectId ?? undefined)

  const level2Label = projectConfig?.level2_label ?? 'Phase'

  const navSections: NavSection[] = useMemo(() => [
    {
      title: 'Home',
      items: [
        { id: 'home', label: 'Home', icon: '🏠' },
        { id: 'dev-status', label: 'Development Status', icon: '📊' },
        { id: 'documentation', label: 'Documentation', icon: '📚' },
        { id: 'under-construction', label: 'Under Construction', icon: '🚧' },
        { id: 'prototype-lab', label: 'Prototype Lab', icon: '🧪', href: '/prototypes' }
      ]
    },
    {
      title: 'Planning',
      items: [
        { id: 'planning-inline', label: 'Planning', icon: '✏️' },
        { id: 'planning-overview', label: 'Overview', icon: '🗺️' },
        { id: 'documents', label: 'Documents', icon: '📄' }
      ],
      isCollapsible: true
    },
    {
      title: 'Assumptions',
      items: [
        { id: 'market', label: 'Global', icon: '🧮' },
        { id: 'growth-rates', label: 'Market Rates & Prices', icon: '📊' },
        { id: 'project-revenues', label: 'Project Revenues', icon: '📈' }
      ],
      isCollapsible: true
    },
    {
      title: 'Budgets',
      items: [
        { id: 'acquisition', label: 'Acquisition', icon: '🏡' },
        { id: 'project-costs', label: 'Project Costs', icon: '💰' },
        { id: 'budget-grid-light', label: 'Budget Grid (Light)', icon: '☀️' },
        { id: 'budget-grid-dark', label: 'Budget Grid (Dark)', icon: '🌙' },
        { id: 'disposition', label: 'Project Disposition', icon: '🎯' }
      ],
      isCollapsible: true
    },
    {
      title: 'Ownership',
      items: [
        { id: 'debt', label: 'Debt', icon: '🏦' },
        { id: 'equity', label: 'Equity', icon: '📊' },
        { id: 'muni-district', label: 'Muni / District', icon: '🏛️' }
      ],
      isCollapsible: true
    },
    {
      title: 'Documents (DMS)',
      items: [
        { id: 'dms', label: 'Document Management', icon: '📚', href: '/dms' }
      ],
      isCollapsible: false
    },
    {
      title: 'Settings',
      items: [
        { id: 'settings', label: 'Settings', icon: '⚙️' },
        { id: 'zoning-glossary', label: 'Zoning Glossary', icon: '🏷️' },
        { id: 'planning', label: `${level2Label} Planner (Legacy)`, icon: '🪄' }
      ]
    }
  ], [level2Label])

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  return (
    <nav className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-gray-300 text-sm font-medium">Project Navigation</h2>
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
                  const isActive = activeView === item.id;
                  const baseClasses = `w-full text-left px-6 py-2 text-sm flex items-center space-x-3 hover:bg-gray-700 transition-colors ${isActive ? 'bg-gray-700 text-white border-r-2 border-blue-500' : 'text-gray-300'}`;

                  if (item.href) {
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        target={item.target}
                        className={baseClasses}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveView(item.id)}
                      className={baseClasses}
                    >
                      <span className="text-base">{item.icon}</span>
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
