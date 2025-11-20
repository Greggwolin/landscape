'use client';

import React from 'react';
import { CButton, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CBadge } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';

export interface EquityPartner {
  id: number;
  partnerName: string;
  partnerType: 'LP' | 'GP' | 'Sponsor';
  capitalCommitted: number;
  capitalDeployed: number;
  ownershipPercent: number;
  preferredReturn?: number;
}

interface EquityPartnersTableProps {
  partners: EquityPartner[];
  onEdit: (partner: EquityPartner) => void;
  onDelete: (id: number) => void;
}

export default function EquityPartnersTable({
  partners,
  onEdit,
  onDelete,
}: EquityPartnersTableProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(2)}%`;
  };

  const getPartnerTypeBadge = (type: string): string => {
    const badges: Record<string, string> = {
      'LP': 'info',
      'GP': 'primary',
      'Sponsor': 'success'
    };
    return badges[type] || 'secondary';
  };

  if (partners.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
        No equity partners defined. Click &ldquo;Add Partner&rdquo; to begin.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <CTable hover>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Partner Name</CTableHeaderCell>
            <CTableHeaderCell>Type</CTableHeaderCell>
            <CTableHeaderCell>Capital Committed</CTableHeaderCell>
            <CTableHeaderCell>Capital Deployed</CTableHeaderCell>
            <CTableHeaderCell>Ownership %</CTableHeaderCell>
            <CTableHeaderCell>Preferred Return</CTableHeaderCell>
            <CTableHeaderCell>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {partners.map((partner) => (
            <CTableRow key={partner.id}>
              <CTableDataCell className="fw-medium">
                {partner.partnerName}
              </CTableDataCell>
              <CTableDataCell>
                <CBadge color={getPartnerTypeBadge(partner.partnerType)}>
                  {partner.partnerType}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>{formatCurrency(partner.capitalCommitted)}</CTableDataCell>
              <CTableDataCell>{formatCurrency(partner.capitalDeployed)}</CTableDataCell>
              <CTableDataCell>{formatPercent(partner.ownershipPercent)}</CTableDataCell>
              <CTableDataCell>
                {partner.preferredReturn 
                  ? formatPercent(partner.preferredReturn * 100)
                  : '—'
                }
              </CTableDataCell>
              <CTableDataCell>
                <div className="d-flex gap-2">
                  <CButton
                    color="ghost-primary"
                    size="sm"
                    onClick={() => onEdit(partner)}
                    aria-label="Edit partner"
                  >
                    <CIcon icon={cilPencil} />
                  </CButton>
                  <CButton
                    color="ghost-danger"
                    size="sm"
                    onClick={() => onDelete(partner.id)}
                    aria-label="Remove partner"
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
