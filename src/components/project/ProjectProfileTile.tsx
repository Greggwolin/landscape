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

interface ProjectProfileTileProps {
  projectId: number;
}

const fetcher = (url: string) => fetchJson<ProjectProfile>(url);

export const ProjectProfileTile: React.FC<ProjectProfileTileProps> = ({ projectId }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
      <CCard className="project-profile-tile">
        <CCardHeader style={{ backgroundColor: 'rgb(241, 242, 246)' }}>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0 h5 fw-semibold">Project Profile</h2>
            <CButton
              color="primary"
              size="sm"
              onClick={handleEditClick}
            >
              EDIT
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody className="profile-fields">
          <ProfileField
            label="Analysis Type"
            value={profile.analysis_type}
          />
          <ProfileField
            label="Property Subtype"
            value={profile.property_subtype}
          />
          <ProfileField
            label="Project Status"
            value={profile.project_status}
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
          />
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

      <style jsx>{`
        :global(.project-profile-tile) {
          height: 100%;
        }

        :global(.profile-fields) {
          padding: 1.5rem;
        }

        :global(.profile-field) {
          margin-bottom: 1rem;
        }

        :global(.profile-field:last-child) {
          margin-bottom: 0;
        }

        :global(.profile-field-label) {
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        :global(.profile-field-value) {
          color: #4a4a4a;
          font-size: 0.875rem;
        }
      `}</style>
    </>
  );
};

export default ProjectProfileTile;
