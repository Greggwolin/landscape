'use client';

import React, { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CContainer } from '@coreui/react';
import { ChevronDown, HelpCircle, Settings, UserCircle2 } from 'lucide-react';

import ProjectTab from '@/app/projects/[projectId]/components/tabs/ProjectTab';
import PlanningTab from '@/app/projects/[projectId]/components/tabs/PlanningTab';
import BudgetTab from '@/app/projects/[projectId]/components/tabs/BudgetTab';
import SalesTab from '@/app/projects/[projectId]/components/tabs/SalesTab';
import FeasibilityTab from '@/app/projects/[projectId]/components/tabs/FeasibilityTab';
import PropertyTab from '@/app/projects/[projectId]/components/tabs/PropertyTab';
import OperationsTab from '@/app/projects/[projectId]/components/tabs/OperationsTab';
import ValuationTab from '@/app/projects/[projectId]/components/tabs/ValuationTab';
import SourcesTab from '@/app/projects/[projectId]/components/tabs/SourcesTab';
import UsesTab from '@/app/projects/[projectId]/components/tabs/UsesTab';
import GISTab from '@/app/projects/[projectId]/components/tabs/GISTab';
import CapitalizationTab from '@/app/projects/[projectId]/components/tabs/CapitalizationTab';
import ReportsTab from '@/app/projects/[projectId]/components/tabs/ReportsTab';
import DocumentsTab from '@/app/projects/[projectId]/components/tabs/DocumentsTab';
import { ComplexityTier } from '@/contexts/ComplexityModeContext';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { useTheme } from '@/app/components/CoreUIThemeProvider';

const DEFAULT_PROJECT_ID = 17;

type LegacyLink = {
  label: string;
  href?: string;
  isExternal?: boolean;
};

type SettingsAction = {
  label: string;
  onClick?: () => void;
};

const getTabsForPropertyType = (propertyType?: string) => {
  const normalized = propertyType?.toUpperCase() || '';
  const isLandDev =
    normalized === 'MPC' ||
    normalized === 'LAND DEVELOPMENT' ||
    propertyType?.includes('Land Development');

  if (isLandDev) {
    return [
      { id: 'project', label: 'Project' },
      { id: 'planning', label: 'Planning' },
      { id: 'budget', label: 'Budget' },
      { id: 'sales', label: 'Sales & Absorption' },
      { id: 'feasibility', label: 'Feasibility' },
      { id: 'capitalization', label: 'Capitalization' },
      { id: 'reports', label: 'Reports' },
      { id: 'documents', label: 'Documents' }
    ];
  }

  return [
    { id: 'project', label: 'Project' },
    { id: 'property', label: 'Property' },
    { id: 'operations', label: 'Operations' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'capitalization', label: 'Capitalization' },
    { id: 'reports', label: 'Reports' },
    { id: 'documents', label: 'Documents' }
  ];
};

const useOutsideClick = (ref: RefObject<HTMLElement>, handler: () => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
};

export default function TopNavProjectPrototype() {
  const { projects, isLoading, selectProject, activeProject, activeProjectId } = useProjectContext();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('project');
  const [complexityMode, setComplexityMode] = useState<ComplexityTier>('standard');
  const [isSandboxOpen, setSandboxOpen] = useState(false);
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isLandscaperOpen, setLandscaperOpen] = useState(false);

  const sandboxRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useOutsideClick(sandboxRef, () => setSandboxOpen(false));
  useOutsideClick(userMenuRef, () => setUserMenuOpen(false));
  useOutsideClick(settingsRef, () => setSettingsOpen(false));

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      selectProject(DEFAULT_PROJECT_ID);
    }
  }, [projects, activeProjectId, selectProject]);

  const project = useMemo(() => {
    if (activeProject) {
      return activeProject;
    }
    if (activeProjectId) {
      return projects.find((p) => p.project_id === activeProjectId) ?? null;
    }
    return projects.find((p) => p.project_id === DEFAULT_PROJECT_ID) ?? null;
  }, [activeProject, activeProjectId, projects]);

  const projectId = project?.project_id ?? activeProjectId ?? DEFAULT_PROJECT_ID;

  const tabs = useMemo(() => getTabsForPropertyType(project?.project_type_code), [project]);

  const sandboxPages: string[] = useMemo(
    () => [
      'Development Status',
      'Documentation Center',
      'Prototypes',
      '---',
      'Project',
      'Operating Expenses',
      'Rent Roll',
      'Financial Reports',
      'Document Library',
      'DMS Admin',
      'Assumptions & Factors',
      'Market Assumptions (Old)',
      'Market Intel (Old)',
      'Project Overview (Old)',
      'Theme Demo',
      'Budget Grid',
      'Budget Grid v2',
      'GIS Test',
      'Parcel Test',
      'Database Schema Viewer'
    ],
    []
  );

  const userMenuItems: SettingsAction[] = useMemo(
    () => [
      { label: 'Profile', onClick: () => console.log('Profile clicked') },
      { label: 'Account Settings', onClick: () => console.log('Account Settings clicked') }
    ],
    []
  );

  const settingsActions: SettingsAction[] = useMemo(
    () => [
      { label: 'Global Preferences', onClick: () => console.log('Global Preferences - placeholder') },
      { label: 'Landscaper Configuration', onClick: () => console.log('Landscaper Config - placeholder') }
    ],
    []
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== 'operations') {
      setComplexityMode('standard');
    }
  };

  const renderThemeToggle = () => (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border px-3 py-2 text-sm font-medium transition-colors"
      style={{
        borderColor: 'var(--cui-sidebar-border-color)',
        color: 'var(--cui-sidebar-nav-link-color)',
        backgroundColor: 'transparent'
      }}
    >
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );

  const renderSandboxDropdown = () => (
    <div className="relative" ref={sandboxRef}>
      <button
        type="button"
        onClick={() => setSandboxOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
        style={{
          color: 'var(--cui-sidebar-nav-link-color)',
          backgroundColor: 'transparent'
        }}
      >
        Sandbox
        <ChevronDown className="h-4 w-4" />
      </button>
      {isSandboxOpen ? (
        <div
          className="absolute right-0 mt-2 w-72 rounded-md border shadow-lg z-20 max-h-96 overflow-y-auto"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="py-2">
            {sandboxPages.map((page, index) => (
              page === '---' ? (
                <div
                  key={`sep-${index}`}
                  className="my-2 border-t"
                  style={{ borderColor: 'var(--cui-border-color)' }}
                />
              ) : (
                <div
                  key={page}
                  className="px-4 py-2 text-sm"
                  style={{ color: 'var(--cui-secondary-color)', cursor: 'default' }}
                >
                  {page}
                </div>
              )
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderUserMenu = () => (
    <div className="relative" ref={userMenuRef}>
      <button
        type="button"
        onClick={() => setUserMenuOpen((prev) => !prev)}
        className="rounded-full border p-2 transition-colors"
        style={{
          borderColor: 'var(--cui-sidebar-border-color)',
          color: 'var(--cui-sidebar-nav-link-color)'
        }}
        aria-haspopup="true"
        aria-expanded={isUserMenuOpen}
      >
        <UserCircle2 className="h-5 w-5" />
      </button>
      {isUserMenuOpen ? (
        <div
          className="absolute right-0 mt-2 w-56 rounded-md border shadow-lg z-20"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="py-2">
            {userMenuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setUserMenuOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm transition-colors hover:bg-opacity-10"
                style={{ color: 'var(--cui-body-color)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cui-sidebar-nav-link-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderSettingsDropdown = () => (
    <div className="relative" ref={settingsRef}>
      <button
        type="button"
        onClick={() => setSettingsOpen((prev) => !prev)}
        className="rounded-full border p-2 transition-colors"
        style={{
          borderColor: 'var(--cui-sidebar-border-color)',
          color: 'var(--cui-sidebar-nav-link-color)'
        }}
        aria-haspopup="true"
        aria-expanded={isSettingsOpen}
      >
        <Settings className="h-5 w-5" />
      </button>
      {isSettingsOpen ? (
        <div
          className="absolute right-0 mt-2 w-60 rounded-md border shadow-lg z-20"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="py-2">
            {settingsActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => {
                  action.onClick?.();
                  setSettingsOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-sm transition-colors"
                style={{ color: 'var(--cui-body-color)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cui-sidebar-nav-link-hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderLandscaperModal = () => {
    if (!isLandscaperOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
          onClick={() => setLandscaperOpen(false)}
        />

        {/* Modal Content */}
        <div
          role="dialog"
          aria-modal="true"
          className="relative flex max-h-[85vh] w-[92vw] max-w-7xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          {/* Header */}
          <header
            className="border-b px-6 py-5 flex items-center justify-between"
            style={{ borderColor: 'var(--cui-border-color)' }}
          >
            <h2 className="text-2xl font-bold" style={{ color: 'var(--cui-body-color)' }}>
              Landscaper AI
            </h2>
            <button
              onClick={() => setLandscaperOpen(false)}
              className="rounded-full p-2 transition-colors"
              style={{ color: 'var(--cui-body-color)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cui-sidebar-nav-link-hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span className="text-2xl">×</span>
            </button>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-hidden p-6">
            <div
              className="h-full rounded-lg border p-4"
              style={{
                backgroundColor: 'var(--cui-tertiary-bg)',
                borderColor: 'var(--cui-border-color)',
                color: 'var(--cui-body-color)'
              }}
            >
              <p className="text-center text-sm opacity-70">
                General Landscaper AI chat interface - not associated with a specific tab or function.
              </p>
              <p className="text-center text-xs opacity-50 mt-2">
                (Chat component will be integrated here)
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-body-color)' }}
    >
      <header className="sticky top-0 z-20" style={{ backgroundColor: 'var(--cui-sidebar-bg)' }}>
        {/* TIER 1: Global Navigation */}
        <div
          className="flex items-center justify-between px-6 border-b"
          style={{ borderColor: 'var(--cui-sidebar-border-color)', height: '58px' }}
        >
          {/* Logo - Left */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-invert.png"
              alt="Landscape"
              width={140}
              height={32}
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
            />
          </Link>

          {/* Navigation Items - Right */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--cui-sidebar-nav-link-color)' }}
            >
              Dashboard
            </Link>
            <Link
              href="/dms"
              className="px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--cui-sidebar-nav-link-color)' }}
            >
              Documents
            </Link>
            <button
              type="button"
              onClick={() => setLandscaperOpen(true)}
              className="px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--cui-sidebar-nav-link-color)' }}
            >
              Landscaper AI
            </button>
            {renderSandboxDropdown()}
            {renderUserMenu()}
            {renderSettingsDropdown()}
            {renderThemeToggle()}
          </div>
        </div>

        {/* TIER 2: Project Context - only show when project loaded */}
        {project && (
          <div
            className="flex items-center gap-8 px-6 h-14 border-b"
            style={{
              backgroundColor: 'var(--cui-body-bg)',
              borderColor: 'var(--cui-border-color)'
            }}
          >
            {/* Project Selector - Left Side */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--cui-secondary-color)' }}>
                Active Project:
              </span>
              <select
                value={project.project_id}
                onChange={(e) => {
                  const newProjectId = Number(e.target.value);
                  if (!Number.isNaN(newProjectId)) {
                    selectProject(newProjectId);
                  }
                }}
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors"
                style={{
                  backgroundColor: 'var(--cui-tertiary-bg)',
                  borderColor: 'var(--cui-border-color)',
                  color: 'var(--cui-body-color)',
                  border: '1px solid var(--cui-border-color)',
                  cursor: 'pointer',
                  minWidth: '320px'
                }}
              >
                {projects.map((proj) => (
                  <option key={proj.project_id} value={proj.project_id}>
                    {proj.project_name} - {proj.project_type_code || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>

            {/* Project Tabs - Right Side */}
            <div className="flex flex-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className="px-5 py-4 text-sm font-medium transition-colors relative"
                    style={{
                      color: isActive ? 'var(--cui-primary)' : 'var(--cui-secondary-color)',
                      borderBottom: isActive ? '2px solid var(--cui-primary)' : '2px solid transparent',
                      backgroundColor: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(74, 158, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Landscaper AI Modal */}
      {renderLandscaperModal()}

      <main className="flex flex-1 flex-col overflow-hidden">
        {isLoading && !project ? (
          <div className="flex flex-1 items-center justify-center text-sm text-neutral-400">
            Loading project data…
          </div>
        ) : !project ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
              <p className="text-sm text-neutral-400">
                Unable to load project #{DEFAULT_PROJECT_ID}.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto">
              <CContainer fluid className="p-4">
                {activeTab === 'project' && (
                  <ProjectTab project={project} showProjectSelectorInLocationHeader />
                )}
                {activeTab === 'planning' && <PlanningTab project={project} />}
                {activeTab === 'budget' && <BudgetTab project={project} />}
                {activeTab === 'sales' && <SalesTab project={project} />}
                {activeTab === 'feasibility' && <FeasibilityTab project={project} />}
                {activeTab === 'property' && <PropertyTab project={project} />}
                {activeTab === 'operations' && (
                  <OperationsTab
                    project={project}
                    mode={complexityMode}
                    onModeChange={setComplexityMode}
                  />
                )}
                {activeTab === 'valuation' && <ValuationTab project={project} />}
                {activeTab === 'capitalization' && <CapitalizationTab project={project} />}
                {activeTab === 'reports' && <ReportsTab project={project} />}
                {activeTab === 'documents' && <DocumentsTab project={project} />}

                {activeTab === 'sources' && <SourcesTab project={project} />}
                {activeTab === 'uses' && <UsesTab project={project} />}
                {activeTab === 'gis' && <GISTab project={project} />}
              </CContainer>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
