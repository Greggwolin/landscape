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
  parent_code: string;
  sort_order: string;
  subtype_name: string;
  subtype_code: string;
};

type ParentOption = {
  picklist_id?: number;
  code: string;
  name: string;
  is_active?: boolean;
};

type Props = {
  show: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  editingItem: Record<string, unknown> | null;
  picklistType: string;
  typeLabel: string;
  hasParent: boolean;
  parentOptions: ParentOption[];
  defaultParentCode?: string;
};

export function PicklistItemModal({
  show,
  onClose,
  onSave,
  editingItem,
  picklistType,
  typeLabel,
  hasParent,
  parentOptions,
  defaultParentCode
}: Props) {
  const isPropertySubtype = picklistType === 'PROPERTY_SUBTYPE';

  const [formData, setFormData] = useState<PicklistForm>({
    code: '',
    name: '',
    description: '',
    parent_id: '',
    parent_code: '',
    sort_order: '',
    subtype_name: '',
    subtype_code: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setFormData({
        code: String(editingItem.code || ''),
        name: String(editingItem.name || ''),
        description: String(editingItem.description || ''),
        parent_id: editingItem.parent_id ? String(editingItem.parent_id) : '',
        parent_code: String(editingItem.parent_code || ''),
        sort_order:
          editingItem.sort_order !== undefined && editingItem.sort_order !== null
            ? String(editingItem.sort_order)
            : '',
        subtype_name: String(editingItem.name || ''),
        subtype_code: String(editingItem.code || '')
      });
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        parent_id: '',
        parent_code: defaultParentCode || '',
        sort_order: '',
        subtype_name: '',
        subtype_code: ''
      });
    }
  }, [editingItem, show, defaultParentCode]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (isPropertySubtype) {
        // For property subtypes, use different field names
        await onSave({
          subtype_code: formData.subtype_code || formData.code,
          subtype_name: formData.subtype_name || formData.name,
          property_type_code: formData.parent_code,
          sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : null
        });
      } else {
        await onSave({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          parent_id: formData.parent_id ? parseInt(formData.parent_id, 10) : null,
          sort_order: formData.sort_order ? parseInt(formData.sort_order, 10) : null
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const singularLabel = typeLabel.replace(/s$/, '');

  // Get filtered parent options
  const filteredParentOptions = parentOptions.filter((p) => {
    // For options with is_active property, filter inactive ones
    if ('is_active' in p && !p.is_active) return false;
    return true;
  });

  return (
    <CModal visible={show} onClose={onClose} backdrop="static">
      <CModalHeader>
        <CModalTitle>
          {editingItem ? 'Edit' : 'Add'} {singularLabel}
        </CModalTitle>
      </CModalHeader>
      <CForm onSubmit={handleSubmit}>
        <CModalBody>
          {hasParent && (
            <div className="mb-3">
              <CFormLabel>{isPropertySubtype ? 'Property Type' : 'Parent Type'}</CFormLabel>
              <CFormSelect
                value={isPropertySubtype ? formData.parent_code : formData.parent_id}
                onChange={(e) => {
                  if (isPropertySubtype) {
                    setFormData((prev) => ({ ...prev, parent_code: e.target.value }));
                  } else {
                    setFormData((prev) => ({ ...prev, parent_id: e.target.value }));
                  }
                }}
                required={isPropertySubtype}
              >
                <option value="">— Select {isPropertySubtype ? 'Property Type' : 'Parent'} —</option>
                {filteredParentOptions.map((p) => (
                  <option key={p.code} value={isPropertySubtype ? p.code : String(p.picklist_id)}>
                    {p.name}
                  </option>
                ))}
              </CFormSelect>
              <div className="form-text">
                {isPropertySubtype
                  ? 'The property type this subtype belongs to.'
                  : 'Links this subtype to a parent type for cascading dropdowns.'}
              </div>
            </div>
          )}

          <div className="mb-3">
            <CFormLabel>Code</CFormLabel>
            <CFormInput
              value={isPropertySubtype ? formData.subtype_code : formData.code}
              onChange={(e) => {
                const val = e.target.value.toUpperCase();
                if (isPropertySubtype) {
                  setFormData((prev) => ({ ...prev, subtype_code: val }));
                } else {
                  setFormData((prev) => ({ ...prev, code: val }));
                }
              }}
              placeholder="e.g., GARDEN"
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
              value={isPropertySubtype ? formData.subtype_name : formData.name}
              onChange={(e) => {
                if (isPropertySubtype) {
                  setFormData((prev) => ({ ...prev, subtype_name: e.target.value }));
                } else {
                  setFormData((prev) => ({ ...prev, name: e.target.value }));
                }
              }}
              placeholder={isPropertySubtype ? 'e.g., Garden-Style Apartment' : 'e.g., Planning'}
              required
              maxLength={100}
            />
          </div>

          {!isPropertySubtype && (
            <div className="mb-3">
              <CFormLabel>Description (Optional)</CFormLabel>
              <CFormTextarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of when to use this value"
                rows={2}
              />
            </div>
          )}

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
