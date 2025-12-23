'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { useProjectContext } from '@/app/components/ProjectProvider';
import ProjectProfileEditModal from '@/components/project/ProjectProfileEditModal';
import ProjectTabMap from '@/components/map/ProjectTabMap';
import { fetchJson } from '@/lib/fetchJson';
import type { ProjectProfile } from '@/types/project-profile';
import { formatGrossAcres, formatTargetUnits, formatMSADisplay } from '@/types/project-profile';
import { Card } from './Card';

interface ProjectDetailsContentProps {
  projectId: number;
}

const fetcher = (url: string) => fetchJson<ProjectProfile>(url);

/**
 * Project details content (profile fields + map) without card wrapper.
 * Used inside CollapsibleContent on the Landscaper page.
 */
export function ProjectDetailsContent({ projectId }: ProjectDetailsContentProps) {
  const { refreshProjects } = useProjectContext();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: profile, mutate } = useSWR<ProjectProfile>(
    `/api/projects/${projectId}/profile`,
    fetcher,
    { revalidateOnFocus: false }
  );

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
      {/* Profile Details Card */}
      <Card
        title="Project Details"
        className="mb-3"
        headerAction={
          <button
            onClick={handleEditClick}
            className="text-xs font-semibold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors"
            style={{ letterSpacing: '0.08em' }}
          >
            Edit
          </button>
        }
      >
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
      </Card>

      {/* Map Card */}
      <Card title="Map - 3D Oblique View" className="mb-3">
        <ProjectTabMap
          projectId={String(projectId)}
          styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
          tabId="landscaper"
        />
      </Card>

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
