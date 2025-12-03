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
  code: string;
  name: string;
  description?: string | null;
  parent_id?: number | null;
  parent_name?: string | null;
  sort_order: number;
  is_active: boolean;
};

type Props = {
  values: PicklistValue[];
  hasParent: boolean;
  parentOptions: PicklistValue[];
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

  const parentNameById = new Map<number, string>();
  parentOptions.forEach((p) => parentNameById.set(p.picklist_id, p.name));

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
                {item.parent_id
                  ? (
                    <CBadge color="info" shape="rounded-pill">
                      {item.parent_name || parentNameById.get(item.parent_id) || 'Parent'}
                    </CBadge>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
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
