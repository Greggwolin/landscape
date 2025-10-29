'use client';

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CContainer } from '@coreui/react';
import { ChevronDown, HelpCircle, Settings, UserCircle2 } from 'lucide-react';

import ProjectHeader from '@/app/projects/[projectId]/components/ProjectHeader';
import ProjectTab from '@/app/projects/[projectId]/components/tabs/ProjectTab';
import PlanningTab from '@/app/projects/[projectId]/components/tabs/PlanningTab';
import BudgetTab from '@/app/projects/[projectId]/components/tabs/BudgetTab';
import SalesTab from '@/app/projects/[projectId]/components/tabs/SalesTab';
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
  const { projects, isLoading, selectProject } = useProjectContext();
  const [activeTab, setActiveTab] = useState<string>('project');
  const [complexityMode, setComplexityMode] = useState<ComplexityTier>('standard');
  const [isLegacyOpen, setLegacyOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const legacyRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  useOutsideClick(legacyRef, () => setLegacyOpen(false));
  useOutsideClick(settingsRef, () => setSettingsOpen(false));

  useEffect(() => {
    if (projects.length > 0) {
      selectProject(DEFAULT_PROJECT_ID);
    }
  }, [projects, selectProject]);

  const project = useMemo(
    () => projects.find((p) => p.project_id === DEFAULT_PROJECT_ID),
    [projects]
  );

  const projectId = project?.project_id ?? DEFAULT_PROJECT_ID;

  const tabs = useMemo(() => getTabsForPropertyType(project?.property_type_code), [project]);

  const legacyLinks: LegacyLink[] = useMemo(
    () => [
      { label: 'Project', href: `/projects/${projectId}` },
      { label: 'Operating Expenses', href: `/projects/${projectId}/opex-accounts` },
      { label: 'Rent Roll', href: '/rent-roll' },
      { label: 'Financial Reports', href: '/reports' },
      { label: 'Document Library', href: '/dms' },
      { label: 'DMS Admin', href: '/admin/dms/templates' },
      { label: 'Assumptions & Factors', href: `/projects/${projectId}/assumptions` },
      { label: 'Market Assumptions (Old)', href: `/properties/${projectId}/analysis` },
      { label: 'Market Intel (Old)', href: '/market' },
      { label: 'Project Overview (Old)', href: `/projects/${projectId}/overview` },
      { label: 'Theme Demo', href: '/test-coreui' },
      { label: 'Prototypes', href: '/prototypes' },
      { label: 'Documentation', href: '/documentation' }
    ],
    [projectId]
  );

  const settingsActions: SettingsAction[] = useMemo(
    () => [
      { label: 'Global Preferences' },
      { label: 'Document Management' },
      { label: 'Landscaper Configuration' }
    ],
    []
  );

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== 'operations') {
      setComplexityMode('standard');
    }
  };

  const renderLegacyDropdown = () => (
    <div className="relative" ref={legacyRef}>
      <button
        type="button"
        onClick={() => setLegacyOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
        style={{
          color: 'var(--cui-sidebar-nav-link-color)',
          backgroundColor: 'transparent'
        }}
      >
        Legacy
        <ChevronDown className="h-4 w-4" />
      </button>
      {isLegacyOpen ? (
        <div
          className="absolute right-0 mt-2 w-64 rounded-md border shadow-lg z-20"
          style={{
            backgroundColor: 'var(--cui-body-bg)',
            borderColor: 'var(--cui-border-color)'
          }}
        >
          <div className="py-2">
            {legacyLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href ?? '#'}
                target={link.isExternal ? '_blank' : undefined}
                rel={link.isExternal ? 'noreferrer' : undefined}
                className="block px-4 py-2 text-sm transition-colors"
                style={{ color: 'var(--cui-body-color)' }}
                onClick={() => setLegacyOpen(false)}
              >
                {link.label}
              </Link>
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
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
        style={{
          color: 'var(--cui-sidebar-nav-link-color)',
          backgroundColor: 'transparent'
        }}
        aria-haspopup="true"
        aria-expanded={isSettingsOpen}
      >
        <Settings className="h-5 w-5" />
        <ChevronDown className="h-3 w-3" />
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
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ backgroundColor: 'var(--cui-tertiary-bg)', color: 'var(--cui-body-color)' }}
    >
      <header
        className="sticky top-0 z-20 border-b"
        style={{
          backgroundColor: 'var(--cui-sidebar-bg)',
          borderColor: 'var(--cui-sidebar-border-color)'
        }}
      >
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo-invert.png"
                alt="Landscape"
                width={140}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/dashboard"
                className="relative px-3 py-2 text-sm font-medium transition-colors"
                style={{ color: 'var(--cui-sidebar-nav-link-color)' }}
              >
                Dashboard
              </Link>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)}
                    className="relative px-3 py-2 text-sm font-medium transition-colors"
                    style={{
                      color: isActive
                        ? 'var(--cui-primary)'
                        : 'var(--cui-sidebar-nav-link-color)'
                    }}
                  >
                    {tab.label}
                    {isActive ? (
                      <span
                        className="absolute left-0 right-0 -bottom-2 mx-auto h-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--cui-primary)' }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {renderLegacyDropdown()}
            <button
              type="button"
              className="rounded-full border p-2 transition-colors"
              style={{
                borderColor: 'var(--cui-sidebar-border-color)',
                color: 'var(--cui-sidebar-nav-link-color)'
              }}
            >
              <UserCircle2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="rounded-full border p-2 transition-colors"
              style={{
                borderColor: 'var(--cui-sidebar-border-color)',
                color: 'var(--cui-sidebar-nav-link-color)'
              }}
            >
              <HelpCircle className="h-5 w-5" />
            </button>
            {renderSettingsDropdown()}
          </div>
        </div>
      </header>

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
            <ProjectHeader
              projectId={projectId}
              project={project}
              complexityMode={activeTab === 'operations' ? complexityMode : undefined}
              onComplexityModeChange={
                activeTab === 'operations' ? setComplexityMode : undefined
              }
            />
            <div className="flex-1 overflow-y-auto">
              <CContainer fluid className="p-4">
                {activeTab === 'project' && <ProjectTab project={project} />}
                {activeTab === 'planning' && <PlanningTab project={project} />}
                {activeTab === 'budget' && <BudgetTab project={project} />}
                {activeTab === 'sales' && <SalesTab project={project} />}
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
