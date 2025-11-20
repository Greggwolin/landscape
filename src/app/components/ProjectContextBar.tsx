'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { getTabsForPropertyType, getTabDefaultRoute } from '@/lib/utils/projectTabs';
import { usePreference } from '@/hooks/useUserPreferences';
import ModeChip, { type ModeType } from '@/components/ui/ModeChip';

/**
 * ProjectContextBar - Tier 2 Project Navigation
 *
 * Renders project-specific navigation bar with:
 * - Project selector dropdown (left)
 * - Project tabs (right)
 *
 * Only renders when a project is loaded.
 * Height: 56px
 * Background: var(--cui-body-bg) (light)
 *
 * @param projectId - The current project ID
 */
interface ProjectContextBarProps {
  projectId: number;
}

export default function ProjectContextBar({ projectId }: ProjectContextBarProps) {
  const { projects, activeProject, selectProject } = useProjectContext();
  const router = useRouter();
  const pathname = usePathname();

  // Determine active tab from pathname
  const activeTab = useMemo(() => {
    if (pathname.includes('/feasibility') || pathname.includes('/valuation')) {
      return pathname.includes('/valuation') ? 'valuation' : 'feasibility';
    }
    if (pathname.includes('/capitalization')) return 'capitalization';
    if (pathname.includes('/landscaper')) return 'landscaper';
    if (pathname.includes('/documents')) return 'documents';
    return 'project'; // Default to project tab
  }, [pathname]);

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  const tabs = useMemo(() => {
    return getTabsForPropertyType(project?.project_type_code);
  }, [project]);

  // Mode preferences for each tab (database-backed)
  // Project mode serves as the project-level default
  const [projectMode] = usePreference<ModeType>({
    key: 'project.mode',
    defaultValue: 'napkin',
    scopeType: 'project',
    scopeId: projectId,
  });

  const [planningMode] = usePreference<ModeType>({
    key: 'planning.mode',
    defaultValue: projectMode,
    scopeType: 'project',
    scopeId: projectId,
  });

  const [salesMode] = usePreference<ModeType>({
    key: 'sales.mode',
    defaultValue: projectMode,
    scopeType: 'project',
    scopeId: projectId,
  });

  const [propertyMode] = usePreference<ModeType>({
    key: 'property.mode',
    defaultValue: projectMode,
    scopeType: 'project',
    scopeId: projectId,
  });

  const [operationsMode] = usePreference<ModeType>({
    key: 'operations.mode',
    defaultValue: projectMode,
    scopeType: 'project',
    scopeId: projectId,
  });

  const [valuationMode] = usePreference<ModeType>({
    key: 'valuation.mode',
    defaultValue: projectMode,
    scopeType: 'project',
    scopeId: projectId,
  });

  // Budget mode with database persistence (migrated from localStorage)
  const [budgetMode] = usePreference<ModeType>({
    key: 'budget.mode',
    defaultValue: projectMode,
    scopeType: 'project',
    scopeId: projectId,
    localStorageMigrationKey: `budget_mode_${projectId}`, // Auto-migrate from old localStorage key
  });

  // Helper to get mode for a specific tab
  const getModeForTab = (tabId: string): ModeType => {
    switch (tabId) {
      case 'project':
        return projectMode;
      case 'planning':
        return planningMode;
      case 'budget':
        return budgetMode;
      case 'sales':
        return salesMode;
      case 'property':
        return propertyMode;
      case 'operations':
        return operationsMode;
      case 'valuation':
        return valuationMode;
      default:
        return 'napkin';
    }
  };

  if (!project) {
    return null;
  }

  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}`);
  };

  const handleTabChange = (tabId: string) => {
    // Phase 1: Navigate to default route for each main tab
    const defaultRoute = getTabDefaultRoute(projectId, tabId);
    router.push(defaultRoute);
  };

  return (
    <div
      className="sticky flex items-center gap-8 px-6 h-14 border-b"
      style={{
        backgroundColor: 'var(--cui-body-bg)',
        borderColor: 'var(--cui-border-color)',
        top: '58px',
        zIndex: 40,
      }}
    >
      {/* Project Selector - Left */}
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--cui-secondary-color)' }}
        >
          Active Project:
        </span>
        <select
          value={project.project_id}
          onChange={(e) => handleProjectChange(Number(e.target.value))}
          className="px-3 py-2 text-sm font-medium rounded-md transition-colors"
          style={{
            backgroundColor: 'var(--cui-tertiary-bg)',
            borderColor: 'var(--cui-border-color)',
            color: 'var(--cui-body-color)',
            border: '1px solid var(--cui-border-color)',
            cursor: 'pointer',
            minWidth: '320px',
          }}
        >
          {projects.map((proj) => (
            <option key={proj.project_id} value={proj.project_id}>
              {proj.project_name} - {proj.project_type_code || 'Unknown'}
            </option>
          ))}
        </select>
      </div>

      {/* Project Tabs - Right */}
      <div className="flex flex-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const tabMode = getModeForTab(tab.id);

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className="px-3 py-4 text-sm font-medium transition-colors relative flex items-center"
              style={{
                color: isActive
                  ? 'var(--cui-primary)'
                  : 'var(--cui-secondary-color)',
                borderBottom: isActive
                  ? '2px solid var(--cui-primary)'
                  : '2px solid transparent',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor =
                    'rgba(74, 158, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span>{tab.label}</span>
              {tab.hasMode && <ModeChip mode={tabMode} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
