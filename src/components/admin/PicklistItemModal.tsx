'use client';

import React, { useEffect, useState } from 'react';
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CInputGroup,
  CInputGroupText
} from '@coreui/react';

type PicklistForm = {
  code: string;
  name: string;
  description: string;
  parent_id: string;
  sort_order: string;
};

type Props = {
  show: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  editingItem: any | null;
  picklistType: string;
  typeLabel: string;
  hasParent: boolean;
  parentOptions: any[];
};

export function PicklistItemModal({
  show,
  onClose,
  onSave,
  editingItem,
  picklistType,
  typeLabel,
  hasParent,
  parentOptions
}: Props) {
  const [formData, setFormData] = useState<PicklistForm>({
    code: '',
    name: '',
    description: '',
    parent_id: '',
    sort_order: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        code: editingItem.code || '',
        name: editingItem.name || '',
        description: editingItem.description || '',
        parent_id: editingItem.parent_id ? String(editingItem.parent_id) : '',
        sort_order: editingItem.sort_order !== undefined && editingItem.sort_order !== null
          ? String(editingItem.sort_order)
          : ''
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        parent_id: '',
        sort_order: ''
      });
    }
  }, [editingItem, show]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData,
        parent_id: formData.parent_id ? parseInt(formData.parent_id, 10) : null,
        sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : null
      });
    } finally {
      setSaving(false);
    }
  };

  const singularLabel = typeLabel.replace(/s$/, '');

  return (
    <CModal visible={show} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>{editingItem ? 'Edit' : 'Add'} {singularLabel}</CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          <div className="mb-3">
            <CFormLabel>Code</CFormLabel>
            <CFormInput
              value={formData.code}
              onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="e.g., PLANNING"
              required
              disabled={!!editingItem}
              maxLength={50}
            />
            <div className="form-text">
              Unique identifier (uppercase, no spaces). Cannot be changed after creation.
            </div>
          </div>

          <div className="mb-3">
            <CFormLabel>Display Name</CFormLabel>
            <CFormInput
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Planning"
              required
              maxLength={100}
            />
          </div>

          {hasParent && (
            <div className="mb-3">
              <CFormLabel>Parent Type</CFormLabel>
              <CFormSelect
                value={formData.parent_id}
                onChange={(e) => setFormData((prev) => ({ ...prev, parent_id: e.target.value }))}
              >
                <option value="">— Select Parent —</option>
                {parentOptions.filter((p: any) => p.is_active).map((p: any) => (
                  <option key={p.picklist_id} value={p.picklist_id}>
                    {p.name}
                  </option>
                ))}
              </CFormSelect>
              <div className="form-text">
                Links this subtype to a parent type for cascading dropdowns.
              </div>
            </div>
          )}

          <div className="mb-3">
            <CFormLabel>Description (Optional)</CFormLabel>
            <CFormTextarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of when to use this value"
              rows={2}
            />
          </div>

          <div className="mb-3">
            <CFormLabel>Sort Order</CFormLabel>
            <CInputGroup>
              <CFormInput
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData((prev) => ({ ...prev, sort_order: e.target.value }))}
                placeholder="Auto"
                min={1}
              />
              <CInputGroupText>leave blank for auto</CInputGroupText>
            </CInputGroup>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </CButton>
          <CButton color="primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingItem ? 'Update' : 'Add'}
          </CButton>
        </CModalFooter>
      </CForm>
    </CModal>
  );
}
