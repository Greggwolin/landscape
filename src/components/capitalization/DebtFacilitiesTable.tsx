'use client';

import React from 'react';
import { CButton, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CBadge } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';

export interface DebtFacility {
  id: number;
  facilityName: string;
  lender: string;
  facilityType: 'construction' | 'acquisition' | 'mezzanine' | 'bridge';
  commitmentAmount: number;
  outstandingBalance: number;
  interestRate: number;
  maturityDate: string;
  status: 'active' | 'pending' | 'closed';
}

interface DebtFacilitiesTableProps {
  facilities: DebtFacility[];
  onSelect?: (id: number) => void;
  selectedId?: number | null;
  onEdit: (facility: DebtFacility) => void;
  onDelete: (id: number) => void;
}

/**
 * DebtFacilitiesTable Component
 *
 * Displays debt facilities with edit/delete actions.
 * Per user clarification: Manual entry for Phase 5.
 */
export default function DebtFacilitiesTable({
  facilities,
  onSelect,
  selectedId,
  onEdit,
  onDelete,
}: DebtFacilitiesTableProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getFacilityTypeBadge = (type: string): string => {
    const badges: Record<string, string> = {
      construction: 'primary',
      acquisition: 'info',
      mezzanine: 'warning',
      bridge: 'secondary',
    };
    return badges[type] || 'secondary';
  };

  const getStatusBadge = (status: string): string => {
    const badges: Record<string, string> = {
      active: 'success',
      pending: 'warning',
      closed: 'secondary',
    };
    return badges[status] || 'secondary';
  };

  if (facilities.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
        No debt facilities defined. Click &ldquo;Add Facility&rdquo; to begin.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <CTable hover>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Facility Name</CTableHeaderCell>
            <CTableHeaderCell>Lender</CTableHeaderCell>
            <CTableHeaderCell>Type</CTableHeaderCell>
            <CTableHeaderCell>Commitment</CTableHeaderCell>
            <CTableHeaderCell>Outstanding</CTableHeaderCell>
            <CTableHeaderCell>Rate</CTableHeaderCell>
            <CTableHeaderCell>Maturity</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {facilities.map((facility) => (
            <CTableRow
              key={facility.id}
              className={selectedId === facility.id ? 'table-active' : ''}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
              onClick={() => onSelect && onSelect(facility.id)}
            >
              <CTableDataCell className="fw-medium">
                {facility.facilityName}
              </CTableDataCell>
              <CTableDataCell>{facility.lender}</CTableDataCell>
              <CTableDataCell>
                <CBadge color={getFacilityTypeBadge(facility.facilityType)}>
                  {facility.facilityType}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>{formatCurrency(facility.commitmentAmount)}</CTableDataCell>
              <CTableDataCell>{formatCurrency(facility.outstandingBalance)}</CTableDataCell>
              <CTableDataCell>{formatPercent(facility.interestRate)}</CTableDataCell>
              <CTableDataCell>{formatDate(facility.maturityDate)}</CTableDataCell>
              <CTableDataCell>
                <CBadge color={getStatusBadge(facility.status)}>
                  {facility.status}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>
                <div className="d-flex gap-2">
                  <CButton
                    color="ghost-primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(facility);
                    }}
                    aria-label="Edit facility"
                  >
                    <CIcon icon={cilPencil} />
                  </CButton>
                  <CButton
                    color="ghost-danger"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(facility.id);
                    }}
                    aria-label="Delete facility"
                  >
                    <CIcon icon={cilTrash} />
                  </CButton>
                </div>
              </CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    </div>
  );
}
