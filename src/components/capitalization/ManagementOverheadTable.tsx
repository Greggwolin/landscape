'use client';

import React from 'react';
import { CButton, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CBadge } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';
import { ManagementOverhead } from '@/hooks/useDeveloperOperations';

interface ManagementOverheadTableProps {
  items: ManagementOverhead[];
  onEdit: (item: ManagementOverhead) => void;
  onDelete: (id: number) => void;
  isLoading?: boolean;
}

export default function ManagementOverheadTable({
  items,
  onEdit,
  onDelete,
  isLoading,
}: ManagementOverheadTableProps) {
  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getFrequencyBadge = (frequency: string): string => {
    const badges: Record<string, string> = {
      one_time: 'secondary',
      monthly: 'primary',
      quarterly: 'info',
      annually: 'warning',
    };
    return badges[frequency] || 'secondary';
  };

  if (isLoading) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--cui-secondary-color)' }}>
        Loading overhead items...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-4" style={{ color: 'var(--cui-secondary-color)' }}>
        No overhead items defined. Click &quot;Add Item&quot; to create one.
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <CTable hover>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Item Name</CTableHeaderCell>
            <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Frequency</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Period</CTableHeaderCell>
            <CTableHeaderCell className="text-end">Total</CTableHeaderCell>
            <CTableHeaderCell>Notes</CTableHeaderCell>
            <CTableHeaderCell className="text-center">Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {items.map((item) => (
            <CTableRow key={item.id}>
              <CTableDataCell className="fw-medium">{item.item_name}</CTableDataCell>
              <CTableDataCell className="text-end">
                {formatCurrency(item.amount)}
              </CTableDataCell>
              <CTableDataCell className="text-center">
                <CBadge color={getFrequencyBadge(item.frequency)}>
                  {item.frequency_display}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell className="text-center text-muted small">
                {item.frequency !== 'one_time' ? (
                  <>
                    {item.start_period} - {item.start_period + item.duration_periods - 1}
                    <br />
                    <span className="text-muted">({item.duration_periods} periods)</span>
                  </>
                ) : (
                  '—'
                )}
              </CTableDataCell>
              <CTableDataCell className="text-end fw-semibold">
                {formatCurrency(item.total_amount)}
              </CTableDataCell>
              <CTableDataCell className="text-muted small" style={{ maxWidth: '200px' }}>
                {item.notes ? (
                  <span title={item.notes}>
                    {item.notes.length > 50 ? `${item.notes.substring(0, 50)}...` : item.notes}
                  </span>
                ) : (
                  '—'
                )}
              </CTableDataCell>
              <CTableDataCell>
                <div className="d-flex gap-2 justify-content-center">
                  <CButton
                    color="ghost-primary"
                    size="sm"
                    onClick={() => onEdit(item)}
                    aria-label="Edit item"
                  >
                    <CIcon icon={cilPencil} />
                  </CButton>
                  <CButton
                    color="ghost-danger"
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this overhead item?')) {
                        onDelete(item.id);
                      }
                    }}
                    aria-label="Delete item"
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
