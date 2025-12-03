'use client';

import React, { useState, useRef } from 'react';
import { useProjectContext } from '@/app/components/ProjectProvider';
import { CCard, CCardBody, CButton } from '@coreui/react';
import RlvSummaryCard from './RlvSummaryCard';
import NapkinSfdPricing from './NapkinSfdPricing';
import NapkinAttachedPricing from './NapkinAttachedPricing';
import MdrPanel from './MdrPanel';
import CommercialPanel from './CommercialPanel';
import InfrastructurePanel from './InfrastructurePanel';
import LandscaperPanel from './LandscaperPanel';
import PromoteModal from './PromoteModal';

interface NapkinAnalysisPageProps {
  projectId: number;
}

export default function NapkinAnalysisPage({ projectId }: NapkinAnalysisPageProps) {
  const { activeProject } = useProjectContext();
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [hasParcelData, setHasParcelData] = useState(false); // Mock state for data ingestion

  // Cache the last valid project to prevent unmounting during revalidation
  const lastValidProject = useRef(activeProject);
  if (activeProject) {
    lastValidProject.current = activeProject;
  }

  // Use cached project if current is null (during revalidation)
  const displayProject = activeProject ?? lastValidProject.current;

  // Mock data trigger from Landscaper panel
  const handleDataIngested = () => {
    setHasParcelData(true);
  };

  // Only show loading on initial load (never had a valid project)
  if (!displayProject) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Format location string
  const locationParts = [
    displayProject.jurisdiction_city,
    displayProject.jurisdiction_state
  ].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(', ') : 'Location TBD';

  // Format acreage
  const acreage = displayProject.acres_gross
    ? `${displayProject.acres_gross.toLocaleString()} AC`
    : 'Acreage TBD';

  return (
    <div style={{ padding: '1rem' }}>
      {/* Header Bar */}
      <CCard className="mb-4" style={{ backgroundColor: 'var(--cui-body-bg)' }}>
        <CCardBody className="py-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h4 className="mb-1 fw-bold" style={{ color: 'var(--cui-body-color)' }}>
                NAPKIN ANALYSIS
              </h4>
              <div className="d-flex align-items-center gap-2" style={{ color: 'var(--cui-secondary-color)' }}>
                <span className="fw-semibold">{displayProject.project_name}</span>
                <span>•</span>
                <span
                  className="badge"
                  style={{
                    backgroundColor: 'var(--cui-info)',
                    color: '#fff',
                    fontSize: '0.75rem'
                  }}
                >
                  LAND
                </span>
                <span>•</span>
                <span>{acreage}</span>
                <span>•</span>
                <span>{location}</span>
              </div>
            </div>
            <CButton
              color="secondary"
              variant="outline"
              onClick={() => setShowPromoteModal(true)}
              style={{ whiteSpace: 'nowrap' }}
            >
              Promote to Developer →
            </CButton>
          </div>
        </CCardBody>
      </CCard>

      {/* Two Column Layout */}
      <div className="row g-4">
        {/* Left Column - 50% - Analysis Panels */}
        <div className="col-12 col-lg-6">
          <div className="d-flex flex-column gap-4">
            {/* SFD Product Pricing */}
            <NapkinSfdPricing projectId={projectId} />

            {/* Attached Product Pricing */}
            <NapkinAttachedPricing projectId={projectId} />

            {/* MDR / Attached (legacy mock panel - can be removed) */}
            {/* <MdrPanel hasData={hasParcelData} /> */}

            {/* Commercial */}
            <CommercialPanel hasData={hasParcelData} />

            {/* Infrastructure & Timeline */}
            <InfrastructurePanel hasData={hasParcelData} />

            {/* RLV Summary - at bottom */}
            <RlvSummaryCard hasData={hasParcelData} />
          </div>
        </div>

        {/* Right Column - 50% - Landscaper Panel */}
        <div className="col-12 col-lg-6">
          <div
            className="position-lg-sticky"
            style={{ top: 'calc(58px + 150px + 2rem)' }} // Below top nav + context bar
          >
            <LandscaperPanel onDataIngested={handleDataIngested} />
          </div>
        </div>
      </div>

      {/* Promote Modal */}
      <PromoteModal
        visible={showPromoteModal}
        onClose={() => setShowPromoteModal(false)}
        projectId={projectId}
      />
    </div>
  );
}
