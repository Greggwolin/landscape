'use client';

import React from 'react';
import { CRow, CCol, CCard, CCardHeader, CCardBody } from '@coreui/react';
import FloorPlanMatrix from './FloorPlanMatrix';
import PhysicalDescription from './PhysicalDescription';
import RentRoll from './RentRoll';
import ProjectTabMap from '@/components/map/ProjectTabMap';

interface PropertyPageProps {
  projectId: number;
}

/**
 * PropertyPage - Main container for Studio Property page
 *
 * Layout:
 * - Top row: Physical Description (left ~40%) | Map + Floor Plan Matrix (right ~60%)
 * - Bottom row: Rent Roll (full width)
 *
 * Note: Rental comparables are NOT included here - they're on the Income Approach tab
 */
export default function PropertyPage({ projectId }: PropertyPageProps) {
  return (
    <div className="property-page">
      <CRow className="g-3">
        {/* Top row: Physical Description (left ~40%) | Map + Floor Plan Matrix (right ~60%) */}
        <CCol xs={12} lg={5}>
          <PhysicalDescription projectId={projectId} />
        </CCol>
        <CCol xs={12} lg={7}>
          {/* Map - 3D Oblique View */}
          <CCard className="studio-card mb-3">
            <CCardHeader className="studio-card-header">
              <span className="fw-semibold">Map - 3D Oblique View</span>
            </CCardHeader>
            <CCardBody className="studio-card-body" style={{ padding: '0.5rem' }}>
              <ProjectTabMap
                projectId={String(projectId)}
                styleUrl={process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'aerial'}
                tabId="property-page"
              />
            </CCardBody>
          </CCard>
          {/* Floor Plan Matrix */}
          <FloorPlanMatrix projectId={projectId} />
        </CCol>

        {/* Bottom row: Detailed Rent Roll (full width) */}
        <CCol xs={12}>
          <RentRoll projectId={projectId} />
        </CCol>
      </CRow>
    </div>
  );
}
