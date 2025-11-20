'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CButton, CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus } from '@coreui/icons';
import { useQuery } from '@tanstack/react-query';
import ProjectContextBar from '@/app/components/ProjectContextBar';
import CapitalizationSubNav from '@/components/capitalization/CapitalizationSubNav';
import MetricCard from '@/components/capitalization/MetricCard';
import EquityPartnersTable, { type EquityPartner } from '@/components/capitalization/EquityPartnersTable';
import WaterfallStructureTable, { type WaterfallTier } from '@/components/capitalization/WaterfallStructureTable';

export default function EquityPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  const { data: partners = [] } = useQuery<EquityPartner[]>({
    queryKey: ['equity-partners', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/equity/partners`);
      if (!response.ok) throw new Error('Failed to fetch partners');
      const data = await response.json();
      return data.partners || [];
    },
  });

  const { data: waterfall = [] } = useQuery<WaterfallTier[]>({
    queryKey: ['waterfall', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/equity/waterfall`);
      if (!response.ok) throw new Error('Failed to fetch waterfall');
      const data = await response.json();
      return data.tiers || [];
    },
  });

  const calculateTotalEquity = (): number => {
    return partners.reduce((sum, p) => sum + p.capitalCommitted, 0);
  };

  const calculateTotalDeployed = (): number => {
    return partners.reduce((sum, p) => sum + p.capitalDeployed, 0);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <>
      <ProjectContextBar projectId={projectId} />
      <CapitalizationSubNav projectId={projectId} />

      <div
        className="p-4 space-y-4 min-h-screen"
        style={{ backgroundColor: 'var(--cui-body-bg)' }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>Equity Structure</h2>
          <CButton
            color="primary"
            aria-label="Add equity partner"
          >
            <CIcon icon={cilPlus} className="me-1" />
            Add Partner
          </CButton>
        </div>

        <CRow className="g-3 mb-4">
          <CCol xs={12} md={4}>
            <MetricCard
              label="Total Equity Committed"
              value={formatCurrency(calculateTotalEquity())}
              status="success"
            />
          </CCol>
          <CCol xs={12} md={4}>
            <MetricCard
              label="Equity Deployed"
              value={formatCurrency(calculateTotalDeployed())}
              status="info"
            />
          </CCol>
          <CCol xs={12} md={4}>
            <MetricCard
              label="Remaining to Deploy"
              value={formatCurrency(calculateTotalEquity() - calculateTotalDeployed())}
              status="primary"
            />
          </CCol>
        </CRow>

        <CCard className="mb-4">
          <CCardHeader>
            <h5 className="mb-0">Equity Partners</h5>
          </CCardHeader>
          <CCardBody>
            <EquityPartnersTable
              partners={partners}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </CCardBody>
        </CCard>

        <CCard>
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Waterfall Structure</h5>
            <CButton
              color="outline-secondary"
              size="sm"
              aria-label="Configure waterfall"
            >
              ⚙️ Configure
            </CButton>
          </CCardHeader>
          <CCardBody>
            <p className="text-muted small mb-3">
              Display structure only. Distribution calculations will be added in future phase.
            </p>
            <WaterfallStructureTable tiers={waterfall} />
          </CCardBody>
        </CCard>
      </div>
    </>
  );
}
