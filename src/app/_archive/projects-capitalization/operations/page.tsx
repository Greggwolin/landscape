'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CButton, CCard, CCardHeader, CCardBody, CRow, CCol } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus } from '@coreui/icons';
import { useQuery } from '@tanstack/react-query';
import MetricCard from '@/components/capitalization/MetricCard';
import DeveloperFeesTable, { type DeveloperFee } from '@/components/capitalization/DeveloperFeesTable';
import { ExportButton } from '@/components/admin';

export default function DeveloperOperationsPage() {
  const params = useParams();
  const projectId = parseInt(params.projectId as string);

  const { data: fees = [] } = useQuery<DeveloperFee[]>({
    queryKey: ['developer-fees', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/developer/fees`);
      if (!response.ok) throw new Error('Failed to fetch fees');
      const data = await response.json();
      return data.fees || [];
    },
  });

  const calculateTotalFees = (): number => {
    return fees.reduce((sum, f) => sum + f.calculatedAmount, 0);
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
    <div className="space-y-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Developer Operations</h5>
        <ExportButton tabName="Capitalization" projectId={projectId.toString()} />
      </div>

      <CRow className="g-3 mb-4">
        <CCol xs={12} md={4}>
          <MetricCard
            label="Total Developer Fees"
            value={formatCurrency(calculateTotalFees())}
            status="success"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <MetricCard
            label="Management Overhead"
            value={formatCurrency(0)}
            status="warning"
            subtitle="Placeholder - will be implemented"
          />
        </CCol>
        <CCol xs={12} md={4}>
          <MetricCard
            label="Operating Costs"
            value={formatCurrency(0)}
            status="info"
            subtitle="Placeholder - will be implemented"
          />
        </CCol>
      </CRow>

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Developer Fees</h5>
          <CButton
            color="primary"
            size="sm"
            aria-label="Add developer fee"
          >
            <CIcon icon={cilPlus} className="me-1" />
            Add Fee
          </CButton>
        </CCardHeader>
        <CCardBody>
          <p className="text-muted small mb-3">
            Developer fees include acquisition fees, development fees, asset management fees, and disposition fees.
          </p>
          <DeveloperFeesTable
            fees={fees}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </CCardBody>
      </CCard>

      <CCard className="mb-4">
        <CCardHeader className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Management Overhead</h5>
          <CButton
            color="primary"
            size="sm"
            aria-label="Add overhead item"
          >
            <CIcon icon={cilPlus} className="me-1" />
            Add Item
          </CButton>
        </CCardHeader>
        <CCardBody>
          <p className="text-muted small mb-3">
            Management overhead includes office expenses, staff salaries, administrative costs, and other operating expenses not directly attributable to construction.
          </p>
          <div className="text-center py-4" style={{ color: 'var(--cui-secondary-color)' }}>
            No management overhead items defined.
          </div>
        </CCardBody>
      </CCard>
    </div>
  );
}
