'use client';

/**
 * ProjectProfileTile Component
 *
 * Displays project profile metadata in a left-side summary panel
 * Shows all core project information with an EDIT button
 */

import React, { useState, useEffect } from 'react';
import { CCard, CCardHeader, CCardBody, CButton } from '@coreui/react';
import useSWR from 'swr';
import ProfileField from './ProfileField';
import ProjectProfileEditModal from './ProjectProfileEditModal';
import { fetchJson } from '@/lib/fetchJson';
import type { ProjectProfile } from '@/types/project-profile';
import { formatGrossAcres, formatTargetUnits, formatMSADisplay } from '@/types/project-profile';
import { useProjectContext } from '@/app/components/ProjectProvider';

interface ProjectProfileTileProps {
  projectId: number;
}

const fetcher = (url: string) => fetchJson<ProjectProfile>(url);

export const ProjectProfileTile: React.FC<ProjectProfileTileProps> = ({ projectId }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { refreshProjects } = useProjectContext();

  const { data: profile, error, isLoading, mutate } = useSWR<ProjectProfile>(
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
    mutate(); // Refresh the profile data
    refreshProjects(); // Refresh the global projects list (for Dashboard, map, etc.)
    setIsEditModalOpen(false);
  };

  if (isLoading) {
    return (
      <CCard className="project-profile-tile">
        <CCardHeader style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0 h5">Project Profile</h2>
          </div>
        </CCardHeader>
        <CCardBody>
          <div className="text-center text-muted py-4">Loading...</div>
        </CCardBody>
      </CCard>
    );
  }

  if (error || !profile) {
    return (
      <CCard className="project-profile-tile">
        <CCardHeader style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0 h5">Project Profile</h2>
          </div>
        </CCardHeader>
        <CCardBody>
          <div className="text-center text-danger py-4">
            Failed to load project profile
          </div>
        </CCardBody>
      </CCard>
    );
  }

  return (
    <>
      <CCard className="mb-3 h-100" style={{ backgroundColor: 'var(--cui-body-bg)', color: 'var(--cui-body-color)', borderColor: 'var(--cui-border-color)' }}>
        <CCardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-3" style={{ backgroundColor: 'var(--cui-card-cap-bg)', color: 'var(--cui-body-color)', borderColor: 'var(--cui-border-color)' }}>
          <span className="fw-semibold" style={{ letterSpacing: '0.02em' }}>
            Project Profile
          </span>
          <div className="d-flex align-items-center gap-3 flex-wrap">
            <CButton
              type="button"
              color="link"
              className="text-uppercase fw-semibold text-decoration-none px-0"
              style={{ letterSpacing: '0.08em' }}
              onClick={handleEditClick}
            >
              Edit
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody className="px-4 py-3" style={{ backgroundColor: "var(--cui-body-bg)", color: "var(--cui-secondary-color)" }}>
          <div className="d-flex flex-column">
            <ProfileField
              label="Analysis Type"
              value={profile.analysis_type}
            />
            <ProfileField
              label="Property Subtype"
              value={profile.property_subtype}
            />
            <ProfileField
              label="Target Units"
              value={profile.target_units ? formatTargetUnits(profile.target_units) : undefined}
            />
            <ProfileField
              label="Gross Acres"
              value={profile.gross_acres ? formatGrossAcres(profile.gross_acres) : undefined}
            />
            <ProfileField
              label="Address"
              value={profile.address}
            />
            <ProfileField
              label="City"
              value={profile.city}
            />
            <ProfileField
              label="County"
              value={profile.county}
            />
            <ProfileField
              label="Market"
              value={formatMSADisplay(profile.msa_name, profile.state_abbreviation)}
            />
            <ProfileField
              label="APN"
              value={profile.apn}
            />
            <ProfileField
              label="Ownership Type"
              value={profile.ownership_type}
              isLast={true}
            />
          </div>
        </CCardBody>
      </CCard>

      {isEditModalOpen && (
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
};

export default ProjectProfileTile;
