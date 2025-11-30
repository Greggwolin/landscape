'use client';

import React, { useState } from 'react';
import { CFormSelect, CButton, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus } from '@coreui/icons';
import useSWR from 'swr';
import { PicklistEditor, type PicklistValue } from './PicklistEditor';
import { PicklistItemModal } from './PicklistItemModal';

type PicklistTypeConfig = {
  value: string;
  label: string;
  hasParent: boolean;
  parentType?: string;
};

const PICKLIST_TYPES: PicklistTypeConfig[] = [
  { value: 'PHASE_STATUS', label: 'Phase Status', hasParent: false },
  { value: 'OWNERSHIP_TYPE', label: 'Ownership Type', hasParent: false },
  { value: 'PROPERTY_TYPE', label: 'Property Type', hasParent: false },
  { value: 'PROPERTY_SUBTYPE', label: 'Property Subtype', hasParent: true, parentType: 'PROPERTY_TYPE' },
  { value: 'PROPERTY_CLASS', label: 'Property Class', hasParent: false },
  { value: 'LEASE_STATUS', label: 'Lease Status', hasParent: false },
  { value: 'LEASE_TYPE', label: 'Lease Type', hasParent: false },
  { value: 'INFLATION_TYPE', label: 'Inflation Type', hasParent: false },
  { value: 'ANALYSIS_TYPE', label: 'Analysis Type', hasParent: false }
];

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SystemPicklistsAccordion() {
  const [selectedType, setSelectedType] = useState<string>('PHASE_STATUS');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PicklistValue | null>(null);

  const typeConfig = PICKLIST_TYPES.find((t) => t.value === selectedType);
  const apiType = selectedType.toLowerCase().replace(/_/g, '-');

  const { data, isLoading, mutate } = useSWR(
    `/api/admin/picklists/${apiType}`,
    fetcher
  );

  const { data: parentData } = useSWR(
    typeConfig?.hasParent && typeConfig.parentType
      ? `/api/admin/picklists/${typeConfig.parentType.toLowerCase().replace(/_/g, '-')}`
      : null,
    fetcher
  );

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setEditingItem(null);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setShowAddModal(true);
  };

  const handleEdit = (item: PicklistValue) => {
    setEditingItem(item);
    setShowAddModal(true);
  };

  const handleSave = async (formData: any) => {
    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem
      ? `/api/admin/picklists/${apiType}/${editingItem.picklist_id}`
      : `/api/admin/picklists/${apiType}`;

    const payload = editingItem ? { ...formData, code: editingItem.code } : formData;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    await mutate();
    setShowAddModal(false);
    setEditingItem(null);
  };

  const handleToggleActive = async (item: PicklistValue) => {
    await fetch(`/api/admin/picklists/${apiType}/${item.picklist_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active })
    });
    await mutate();
  };

  return (
    <div className="p-0">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="d-flex align-items-center gap-2">
          <label className="text-muted small me-2">Picklist Type:</label>
          <CFormSelect
            value={selectedType}
            onChange={handleTypeChange}
            style={{ width: '240px' }}
            size="sm"
          >
            {PICKLIST_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </CFormSelect>
        </div>
        <CButton color="primary" size="sm" onClick={handleAdd}>
          <CIcon icon={cilPlus} className="me-1" />
          Add {typeConfig?.label.replace(/s$/, '')}
        </CButton>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <CSpinner size="sm" />
        </div>
      ) : (
        <PicklistEditor
          values={data?.values || []}
          hasParent={typeConfig?.hasParent || false}
          parentOptions={parentData?.values || []}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />
      )}

      <PicklistItemModal
        show={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingItem(null); }}
        onSave={handleSave}
        editingItem={editingItem}
        picklistType={selectedType}
        typeLabel={typeConfig?.label || ''}
        hasParent={typeConfig?.hasParent || false}
        parentOptions={parentData?.values || []}
      />
    </div>
  );
}
