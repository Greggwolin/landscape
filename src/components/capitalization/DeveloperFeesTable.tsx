'use client';

import React from 'react';
import { CButton, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CBadge } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';

export interface DeveloperFee {
  id: number;
  feeType: 'acquisition' | 'development' | 'asset_management' | 'disposition';
  feeDescription: string;
  basisType: 'percent_of_cost' | 'percent_of_value' | 'flat_fee';
  basisValue: number;
  calculatedAmount: number;
  paymentTiming: string;
  status: 'pending' | 'accrued' | 'paid';
}

interface DeveloperFeesTableProps {
  fees: DeveloperFee[];
  onEdit: (fee: DeveloperFee) => void;
  onDelete: (id: number) => void;
}

export default function DeveloperFeesTable({
  fees,
  onEdit,
  onDelete,
}: DeveloperFeesTableProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatBasis = (basisType: string, basisValue: number): string => {
    if (basisType === 'flat_fee') {
      return formatCurrency(basisValue);
    }
    const label = basisType.replace('percent_of_', '');
    return `${basisValue}% of ${label}`;
  };

  const getFeeTypeBadge = (type: string): string => {
    const badges: Record<string, string> = {
      acquisition: 'info',
      development: 'primary',
      asset_management: 'success',
      disposition: 'warning'
    };
    return badges[type] || 'secondary';
  };

  const getStatusBadge = (status: string): string => {
    const badges: Record<string, string> = {
      pending: 'warning',
      accrued: 'info',
      paid: 'success'
    };
    return badges[status] || 'secondary';
  };

  const formatFeeType = (type: string): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (fees.length === 0) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--cui-secondary-color)' }}>
        No developer fees defined.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <CTable hover>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Fee Type</CTableHeaderCell>
            <CTableHeaderCell>Description</CTableHeaderCell>
            <CTableHeaderCell>Basis</CTableHeaderCell>
            <CTableHeaderCell>Amount</CTableHeaderCell>
            <CTableHeaderCell>Payment Timing</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
            <CTableHeaderCell>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {fees.map((fee) => (
            <CTableRow key={fee.id}>
              <CTableDataCell>
                <CBadge color={getFeeTypeBadge(fee.feeType)}>
                  {formatFeeType(fee.feeType)}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>{fee.feeDescription}</CTableDataCell>
              <CTableDataCell>
                {formatBasis(fee.basisType, fee.basisValue)}
              </CTableDataCell>
              <CTableDataCell className="fw-medium">
                {formatCurrency(fee.calculatedAmount)}
              </CTableDataCell>
              <CTableDataCell>{fee.paymentTiming}</CTableDataCell>
              <CTableDataCell>
                <CBadge color={getStatusBadge(fee.status)}>
                  {fee.status}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>
                <div className="d-flex gap-2">
                  <CButton
                    color="ghost-primary"
                    size="sm"
                    onClick={() => onEdit(fee)}
                    aria-label="Edit fee"
                  >
                    <CIcon icon={cilPencil} />
                  </CButton>
                  <CButton
                    color="ghost-danger"
                    size="sm"
                    onClick={() => onDelete(fee.id)}
                    aria-label="Delete fee"
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
