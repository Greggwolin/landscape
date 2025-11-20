'use client';

import React from 'react';
import { CButton, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilTrash } from '@coreui/icons';

export interface DrawEvent {
  id: number;
  facilityId: number;
  drawDate: string;
  drawAmount: number;
  description?: string;
}

interface DrawScheduleTableProps {
  drawEvents: DrawEvent[];
  onEdit: (event: DrawEvent) => void;
  onDelete: (id: number) => void;
}

/**
 * DrawScheduleTable Component
 *
 * Displays manually entered draw schedule events.
 * Per user clarification: Option A - Manual entry for Phase 5.
 * Auto-generation will be in Debt Enhancement phase after Phase 7.
 */
export default function DrawScheduleTable({
  drawEvents,
  onEdit,
  onDelete,
}: DrawScheduleTableProps) {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (drawEvents.length === 0) {
    return (
      <div className="text-center py-5" style={{ color: 'var(--cui-secondary-color)' }}>
        No draw events scheduled. Click &ldquo;Add Draw Event&rdquo; to begin.
      </div>
    );
  }

  // Sort by date
  const sortedEvents = [...drawEvents].sort(
    (a, b) => new Date(a.drawDate).getTime() - new Date(b.drawDate).getTime()
  );

  return (
    <div className="table-responsive">
      <CTable hover>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Draw Date</CTableHeaderCell>
            <CTableHeaderCell>Draw Amount</CTableHeaderCell>
            <CTableHeaderCell>Description</CTableHeaderCell>
            <CTableHeaderCell>Actions</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {sortedEvents.map((event) => (
            <CTableRow key={event.id}>
              <CTableDataCell>{formatDate(event.drawDate)}</CTableDataCell>
              <CTableDataCell className="fw-medium">
                {formatCurrency(event.drawAmount)}
              </CTableDataCell>
              <CTableDataCell>{event.description || '—'}</CTableDataCell>
              <CTableDataCell>
                <div className="d-flex gap-2">
                  <CButton
                    color="ghost-primary"
                    size="sm"
                    onClick={() => onEdit(event)}
                    aria-label="Edit draw event"
                  >
                    <CIcon icon={cilPencil} />
                  </CButton>
                  <CButton
                    color="ghost-danger"
                    size="sm"
                    onClick={() => onDelete(event.id)}
                    aria-label="Delete draw event"
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
