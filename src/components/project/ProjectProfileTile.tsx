'use client';

/**
 * ProjectProfileTile Component
 *
 * Displays project profile metadata in a left-side summary panel
 * Shows all core project information with an EDIT button
 */

import React, { useState, useCallback } from 'react';
import { CCard, CCardHeader, CCardBody } from '@coreui/react';
import useSWR from 'swr';
import ProfileField from './ProfileField';
import ProjectProfileEditModal from './ProjectProfileEditModal';
import { fetchJson } from '@/lib/fetchJson';
import type { ProjectProfile } from '@/types/project-profile';
import { formatGrossAcres, formatUnits, formatMSADisplay, getUnitCount, getUnitsLabel } from '@/types/project-profile';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { useFieldRefreshListener } from '@/hooks/useFieldRefresh';
import ProjectPhotosModal from './ProjectPhotosModal';
import { useQuery } from '@tanstack/react-query';
import { PERSPECTIVE_LABELS, PURPOSE_LABELS } from '@/types/project-taxonomy';

// Acquisition price summary types
interface AcquisitionPriceSummary {
  project_id: number;
  asking_price: number | null;
  has_closing_date: boolean;
  closing_date: string | null;
  total_acquisition_cost: number | null;
  land_cost: number;
  total_fees: number;
  total_deposits: number;
  total_credits: number;
  effective_acquisition_price: number | null;
  price_source: 'calculated' | 'asking' | null;
}

interface ProjectProfileTileProps {
  projectId: number;
}

const fetcher = (url: string) => fetchJson<ProjectProfile>(url);

export const ProjectProfileTile: React.FC<ProjectProfileTileProps> = ({ projectId }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const { refreshProjects } = useProjectContext();

  // Check if project has any linked photos (for pill label)
  const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000';
  const { data: mediaData } = useQuery<{ links: Array<{ link_id: number }> }>({
    queryKey: ['entity-media', 'project', projectId],
    queryFn: async () => {
      const res = await fetch(
        `${DJANGO_API_URL}/api/dms/media/links/?entity_type=project&entity_id=${projectId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch project media');
      return res.json();
    },
    enabled: !!projectId,
  });
  const photoCount = mediaData?.links?.length ?? 0;

  const { data: profile, error, isLoading, mutate } = useSWR<ProjectProfile>(
    `/api/projects/${projectId}/profile`,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch acquisition price summary
  const { data: priceSummary, mutate: mutatePriceSummary } = useSWR<AcquisitionPriceSummary>(
    `${DJANGO_API_URL}/api/projects/${projectId}/acquisition/price-summary/`,
    (url: string) => fetch(url).then(res => res.ok ? res.json() : null),
    { revalidateOnFocus: false }
  );

  // Listen for Landscaper field updates and auto-refresh
  const handleFieldUpdate = useCallback(() => {
    mutate(); // Refresh profile data when Landscaper updates fields
    refreshProjects(); // Also refresh global project list
  }, [mutate, refreshProjects]);

  useFieldRefreshListener(projectId, handleFieldUpdate);

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleModalClose = () => {
    setIsEditModalOpen(false);
  };

  const handleSaveSuccess = () => {
    mutate(); // Refresh the profile data
    mutatePriceSummary(); // Refresh the acquisition price summary
    refreshProjects(); // Refresh the global projects list (for Dashboard, map, etc.)
    setIsEditModalOpen(false);
  };

  // Format currency
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Render acquisition price section
  const renderAcquisitionPriceSection = () => {
    if (!priceSummary) return null;

    const { has_closing_date, total_acquisition_cost, asking_price } = priceSummary;

    // If we have a calculated total (closing date exists), show read-only
    if (has_closing_date && total_acquisition_cost !== null) {
      return (
        <div
          className="d-flex gap-3 py-2 border-bottom"
          style={{ borderColor: 'var(--cui-border-color)', fontSize: '0.9375rem' }}
        >
          <span className="fw-semibold" style={{ minWidth: '140px', color: 'var(--cui-body-color)' }}>
            Acquisition Cost
          </span>
          <span style={{ color: 'var(--cui-secondary-color)' }}>
            {formatCurrency(total_acquisition_cost)}
            <small className="text-muted ms-2" style={{ fontSize: '0.75rem' }}>(from ledger)</small>
          </span>
        </div>
      );
    }

    // Otherwise, show asking price (editable via modal)
    return (
      <div
        className="d-flex gap-3 py-2 border-bottom"
        style={{ borderColor: 'var(--cui-border-color)', fontSize: '0.9375rem' }}
      >
        <span className="fw-semibold" style={{ minWidth: '140px', color: 'var(--cui-body-color)' }}>
          Asking Price
        </span>
        <span style={{ color: 'var(--cui-secondary-color)' }}>
          {asking_price ? formatCurrency(asking_price) : <span className="text-muted fst-italic">Not specified</span>}
        </span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <CCard className="project-profile-tile">
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Project Profile</span>
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
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <div className="d-flex justify-content-between align-items-center">
            <span className="fw-semibold">Project Profile</span>
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
      <CCard
        className="mb-3 h-100"
        style={{
          backgroundColor: 'var(--cui-body-bg)',
          color: 'var(--cui-body-color)',
          borderColor: 'var(--cui-border-color)',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          height: '100%'
        }}
      >
        <CCardHeader className="d-flex align-items-center justify-content-between">
          <span className="fw-semibold">Project Profile</span>
          <button
            type="button"
            style={{
              fontSize: '0.7rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              lineHeight: 1,
              fontWeight: 600,
              backgroundColor: 'var(--cui-primary)',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer'
            }}
            onClick={handleEditClick}
          >
            Edit
          </button>
        </CCardHeader>
        <CCardBody className="px-4 py-3" style={{ backgroundColor: "var(--cui-body-bg)", color: "var(--cui-secondary-color)" }}>
          <div className="d-flex flex-column">
            <ProfileField
              label="Analysis Perspective"
              value={
                profile.analysis_perspective
                  ? PERSPECTIVE_LABELS[profile.analysis_perspective]
                  : undefined
              }
            />
            <ProfileField
              label="Analysis Purpose"
              value={
                profile.analysis_purpose
                  ? PURPOSE_LABELS[profile.analysis_purpose]
                  : undefined
              }
            />
            {profile.value_add_enabled && (
              <ProfileField
                label="Value-Add"
                value="Enabled"
              />
            )}
            <ProfileField
              label="Project Type"
              value={profile.property_subtype}
            />
            {/* Acquisition Price Section */}
            {renderAcquisitionPriceSection()}
            <ProfileField
              label={getUnitsLabel(profile)}
              value={getUnitCount(profile) ? formatUnits(getUnitCount(profile)) : undefined}
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
              label="State"
              value={profile.state}
            />
            <ProfileField
              label="Zip Code"
              value={profile.zip_code}
            />
            <ProfileField
              label="Market"
              value={formatMSADisplay(profile.msa_name, profile.state_abbreviation, profile.market)}
            />
            <ProfileField
              label="APN"
              value={profile.apn}
            />
            <ProfileField
              label="Ownership Type"
              value={profile.ownership_type}
            />
            {/* Property Photos row */}
            <div
              className="d-flex gap-3 py-2"
              style={{ borderColor: 'var(--cui-border-color)', fontSize: '0.9375rem' }}
            >
              <span className="fw-semibold" style={{ minWidth: '140px', color: 'var(--cui-body-color)' }}>
                Property Photos
              </span>
              <span className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="studio-badge-info"
                  onClick={() => setShowPhotosModal(true)}
                >
                  {photoCount > 0 ? 'Photos' : 'Add Photo'}
                </button>
                {photoCount > 0 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--cui-secondary-color)' }}>{photoCount}</span>
                )}
              </span>
            </div>
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

      {showPhotosModal && (
        <ProjectPhotosModal
          isOpen={showPhotosModal}
          onClose={() => setShowPhotosModal(false)}
          projectId={projectId}
        />
      )}
    </>
  );
};

export default ProjectProfileTile;
