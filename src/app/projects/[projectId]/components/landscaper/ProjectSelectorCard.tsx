'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import CIcon from '@coreui/icons-react';
import { cilChevronLeft } from '@coreui/icons';
import { useProjectContext } from '@/app/components/ProjectProvider';
import ProjectProfileEditModal from '@/components/project/ProjectProfileEditModal';
import ProjectTabMap from '@/components/map/ProjectTabMap';
import { fetchJson } from '@/lib/fetchJson';
import type { ProjectProfile } from '@/types/project-profile';
import { formatGrossAcres, formatTargetUnits, formatMSADisplay } from '@/types/project-profile';

interface ProjectSelectorCardProps {
  projectId: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const fetcher = (url: string) => fetchJson<ProjectProfile>(url);

export function ProjectSelectorCard({ projectId, onToggleCollapse }: ProjectSelectorCardProps) {
  const { projects, activeProject, selectProject, refreshProjects } = useProjectContext();
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: profile, mutate } = useSWR<ProjectProfile>(
    `/api/projects/${projectId}/profile`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const project = useMemo(() => {
    return projects.find((p) => p.project_id === projectId) || activeProject;
  }, [projects, projectId, activeProject]);

  const handleProjectChange = (newProjectId: number) => {
    selectProject(newProjectId);
    router.push(`/projects/${newProjectId}`);
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveSuccess = () => {
    mutate();
    refreshProjects();
    setIsEditModalOpen(false);
  };

  // Profile field display helper
  const displayValue = (value: string | number | null | undefined, defaultText = '—') => {
    if (value === null || value === undefined || value === '') return defaultText;
    return String(value);
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Active Project Card */}
        <div
          className="rounded-lg shadow-sm overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-card)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Header with Project Selector, Edit Button, and Collapse Toggle - sticky */}
          <div
            className="flex items-center justify-between gap-2 px-3 py-2 sticky top-0 z-10"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
          >
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold text-foreground whitespace-nowrap">
                Active Project:
              </label>
              <select
                value={project?.project_id ?? projectId}
                onChange={(e) => handleProjectChange(Number(e.target.value))}
                className="px-2 py-1 rounded border border-border bg-background text-foreground text-sm cursor-pointer"
                style={{ maxWidth: '200px' }}
                disabled={!project}
              >
                {projects.length > 0 ? (
                  projects.map((proj) => (
                    <option key={proj.project_id} value={proj.project_id}>
                      {proj.project_name} - {proj.project_type_code || 'LAND'}
                    </option>
                  ))
                ) : (
                  <option value={projectId}>Loading...</option>
                )}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleEditClick}
                className="text-xs font-semibold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors"
                style={{ letterSpacing: '0.08em' }}
              >
                Edit
              </button>
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="p-1 rounded hover:bg-hover-overlay text-muted hover:text-foreground transition-colors"
                  aria-label="Collapse content panel"
                >
                  <CIcon icon={cilChevronLeft} size="sm" />
                </button>
              )}
            </div>
          </div>

          {/* Profile Fields - 2 columns, 6 items each */}
          <div className="p-3">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
              {/* Column 1 */}
              <div className="flex flex-col gap-2">
                <ProfileFieldRow label="Analysis Type" value={displayValue(profile?.analysis_type)} />
                <ProfileFieldRow label="Project Type" value={displayValue(profile?.property_subtype)} />
                <ProfileFieldRow label="Target Units" value={profile?.target_units ? formatTargetUnits(profile.target_units) : '—'} />
                <ProfileFieldRow label="Gross Acres" value={profile?.gross_acres ? formatGrossAcres(profile.gross_acres) : '—'} />
                <ProfileFieldRow label="Address" value={displayValue(profile?.address)} />
                <ProfileFieldRow label="City" value={displayValue(profile?.city)} />
              </div>
              {/* Column 2 */}
              <div className="flex flex-col gap-2">
                <ProfileFieldRow label="County" value={displayValue(profile?.county)} />
                <ProfileFieldRow label="State" value={displayValue(profile?.state)} />
                <ProfileFieldRow label="Zip Code" value={displayValue(profile?.zip_code)} />
                <ProfileFieldRow label="Market" value={formatMSADisplay(profile?.msa_name, profile?.state_abbreviation) || '—'} />
                <ProfileFieldRow label="APN" value={displayValue(profile?.apn)} />
                <ProfileFieldRow label="Ownership Type" value={displayValue(profile?.ownership_type)} />
              </div>
            </div>
          </div>
        </div>

        {/* Map Card - separate card */}
        <div
          className="rounded-lg shadow-sm overflow-hidden"
          style={{
            backgroundColor: 'var(--surface-card)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div
            className="px-3 py-2 sticky top-0 z-10"
            style={{ backgroundColor: 'var(--cui-tertiary-bg)' }}
          >
            <span className="text-sm font-medium text-foreground">Map - 3D Oblique View</span>
          </div>
          <div className="p-3">
            <ProjectTabMap
              projectId={String(projectId)}
              styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
              tabId="landscaper"
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && profile && (
        <ProjectProfileEditModal
          projectId={projectId}
          profile={profile}
          isOpen={isEditModalOpen}
          onClose={handleModalClose}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </>
  );
}

// Inline component for profile field rows
function ProfileFieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="font-medium text-muted whitespace-nowrap" style={{ minWidth: '110px' }}>
        {label}:
      </span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  );
}
