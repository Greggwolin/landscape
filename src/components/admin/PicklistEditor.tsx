'use client';

import React from 'react';
import {
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CButton,
  CBadge
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPencil, cilCheckCircle, cilXCircle } from '@coreui/icons';

export type PicklistValue = {
  picklist_id: number;
  picklist_type?: string;
  code: string;
  name: string;
  description?: string | null;
  parent_id?: number | null;
  parent_code?: string | null;
  parent_name?: string | null;
  sort_order: number;
  is_active: boolean;
};

type ParentOption = {
  picklist_id?: number;
  code: string;
  name: string;
};

type Props = {
  values: PicklistValue[];
  hasParent: boolean;
  parentOptions: ParentOption[];
  onEdit: (item: PicklistValue) => void;
  onToggleActive: (item: PicklistValue) => void;
};

export function PicklistEditor({ values, hasParent, parentOptions, onEdit, onToggleActive }: Props) {
  if (!values || values.length === 0) {
    return (
      <div className="text-center text-muted py-4">
        No values defined for this picklist type.
      </div>
    );
  }

  // Build lookup maps for both ID-based and code-based parent references
  const parentNameById = new Map<number, string>();
  const parentNameByCode = new Map<string, string>();
  parentOptions.forEach((p) => {
    if (p.picklist_id) parentNameById.set(p.picklist_id, p.name);
    if (p.code) parentNameByCode.set(p.code, p.name);
  });

  // Helper to get parent display value
  const getParentDisplay = (item: PicklistValue): string | null => {
    // First check for direct parent_name
    if (item.parent_name) return item.parent_name;
    // Then check parent_code (for property subtypes)
    if (item.parent_code) return parentNameByCode.get(item.parent_code) || item.parent_code;
    // Finally check parent_id (for traditional picklists)
    if (item.parent_id) return parentNameById.get(item.parent_id) || null;
    return null;
  };

  // Color mapping for property type codes
  const getParentBadgeColor = (item: PicklistValue): string => {
    const code = item.parent_code || '';
    switch (code) {
      case 'MF': return 'primary';      // Blue - Multifamily
      case 'OFF': return 'info';        // Cyan - Office
      case 'RET': return 'success';     // Green - Retail
      case 'IND': return 'warning';     // Yellow - Industrial
      case 'HTL': return 'danger';      // Red - Hotel
      case 'LAND': return 'dark';       // Dark - Land
      case 'MXU': return 'secondary';   // Gray - Mixed-Use
      default: return 'info';
    }
  };

  return (
    <CTable hover responsive size="sm" className="mb-0">
      <CTableHead>
        <CTableRow>
          <CTableHeaderCell style={{ width: '110px' }}>Code</CTableHeaderCell>
          <CTableHeaderCell>Name</CTableHeaderCell>
          {hasParent && <CTableHeaderCell style={{ width: '180px' }}>Parent</CTableHeaderCell>}
          <CTableHeaderCell style={{ width: '70px' }} className="text-center">Sort</CTableHeaderCell>
          <CTableHeaderCell style={{ width: '80px' }} className="text-center">Active</CTableHeaderCell>
          <CTableHeaderCell style={{ width: '90px' }} className="text-end">Actions</CTableHeaderCell>
        </CTableRow>
      </CTableHead>
      <CTableBody>
        {values.map((item) => (
          <CTableRow key={item.picklist_id} className={!item.is_active ? 'text-muted' : ''}>
            <CTableDataCell>
              <code className="small">{item.code}</code>
            </CTableDataCell>
            <CTableDataCell>
              {item.name}
              {item.description ? (
                <div className="text-muted small">{item.description}</div>
              ) : null}
            </CTableDataCell>
            {hasParent && (
              <CTableDataCell>
                {(() => {
                  const parentDisplay = getParentDisplay(item);
                  return parentDisplay ? (
                    <CBadge color={getParentBadgeColor(item)} shape="rounded-pill">
                      {parentDisplay}
                    </CBadge>
                  ) : (
                    <span className="text-muted">—</span>
                  );
                })()}
              </CTableDataCell>
            )}
            <CTableDataCell className="text-center">{item.sort_order}</CTableDataCell>
            <CTableDataCell className="text-center">
              <CButton
                color={item.is_active ? 'success' : 'secondary'}
                variant="ghost"
                size="sm"
                onClick={() => onToggleActive(item)}
                aria-label={item.is_active ? 'Deactivate' : 'Activate'}
              >
                <CIcon icon={item.is_active ? cilCheckCircle : cilXCircle} />
              </CButton>
            </CTableDataCell>
            <CTableDataCell className="text-end">
              <CButton
                color="primary"
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                aria-label="Edit"
              >
                <CIcon icon={cilPencil} />
              </CButton>
            </CTableDataCell>
          </CTableRow>
        ))}
      </CTableBody>
    </CTable>
  );
}
